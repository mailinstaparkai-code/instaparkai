import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

const COOKIE_NAME = "valet_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days, web cookie
const API_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days, native app bearer token
const API_SESSION_SLIDING_WINDOW_MS = 1000 * 60 * 60 * 24 * 7; // extend when within 7 days of expiry

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ValetSession = {
  accountId: string;
  username: string;
  role: "parking_admin" | "valet_operator";
  assignedSiteId: string;
  fullName: string | null;
};

export async function createValetSession(accountId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const supabase = createServiceClient();
  const { error } = await supabase.from("valet_sessions").insert({
    account_id: accountId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function createValetApiToken(accountId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + API_SESSION_TTL_MS);

  const supabase = createServiceClient();
  const { error } = await supabase.from("valet_sessions").insert({
    account_id: accountId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
    client: "android",
  });
  if (error) throw new Error(error.message);

  return { token, expiresAt };
}

export async function destroyValetApiToken(token: string) {
  const supabase = createServiceClient();
  await supabase.from("valet_sessions").delete().eq("token_hash", hashToken(token));
}

export async function getValetSessionFromToken(token: string): Promise<ValetSession | null> {
  const supabase = createServiceClient();
  const tokenHash = hashToken(token);
  const { data } = await supabase
    .from("valet_sessions")
    .select(
      "expires_at, client, valet_accounts(id, username, role, assigned_site_id, full_name, is_active)"
    )
    .eq("token_hash", tokenHash)
    .single();

  if (!data?.valet_accounts) return null;
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) return null;

  const account = data.valet_accounts as unknown as {
    id: string;
    username: string;
    role: "parking_admin" | "valet_operator";
    assigned_site_id: string;
    full_name: string | null;
    is_active: boolean;
  };
  if (!account.is_active) return null;

  // Sliding expiry for API (Android) tokens only -- the web cookie's 7-day TTL
  // stays fixed. Best-effort bookkeeping: never let it block returning the session.
  if (data.client === "android") {
    const update: Record<string, unknown> = { last_used_at: new Date().toISOString() };
    if (expiresAt.getTime() - Date.now() < API_SESSION_SLIDING_WINDOW_MS) {
      update.expires_at = new Date(Date.now() + API_SESSION_TTL_MS).toISOString();
    }
    try {
      await supabase.from("valet_sessions").update(update).eq("token_hash", tokenHash);
    } catch {
      // Non-critical -- the session is still valid this request either way.
    }
  }

  return {
    accountId: account.id,
    username: account.username,
    role: account.role,
    assignedSiteId: account.assigned_site_id,
    fullName: account.full_name,
  };
}

export async function getValetSession(): Promise<ValetSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getValetSessionFromToken(token);
}

export async function destroyValetSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const supabase = createServiceClient();
    await supabase.from("valet_sessions").delete().eq("token_hash", hashToken(token));
  }

  cookieStore.delete(COOKIE_NAME);
}
