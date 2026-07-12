import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

const COOKIE_NAME = "valet_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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

export async function getValetSession(): Promise<ValetSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("valet_sessions")
    .select(
      "expires_at, valet_accounts(id, username, role, assigned_site_id, full_name, is_active)"
    )
    .eq("token_hash", hashToken(token))
    .single();

  if (!data?.valet_accounts) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  const account = data.valet_accounts as unknown as {
    id: string;
    username: string;
    role: "parking_admin" | "valet_operator";
    assigned_site_id: string;
    full_name: string | null;
    is_active: boolean;
  };
  if (!account.is_active) return null;

  return {
    accountId: account.id,
    username: account.username,
    role: account.role,
    assignedSiteId: account.assigned_site_id,
    fullName: account.full_name,
  };
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
