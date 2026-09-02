import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAndroidPush } from "./fcm";
import { sendWebPush } from "./web-push";

type PushTokenRow = {
  id: string;
  platform: string;
  token: string;
  endpoint: string | null;
  p256dh: string | null;
  auth_key: string | null;
};

async function sendToTokens(
  supabase: ReturnType<typeof createServiceClient>,
  tokens: PushTokenRow[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await Promise.all(
    tokens.map(async (row) => {
      const result =
        row.platform === "android"
          ? await sendAndroidPush(row.token, title, body, data)
          : await sendWebPush(
              { endpoint: row.endpoint!, keys: { p256dh: row.p256dh!, auth: row.auth_key! } },
              { title, body, data }
            );

      if (!result.ok && result.deadToken) {
        await supabase.from("valet_push_tokens").delete().eq("id", row.id);
      }
    })
  );
}

// Best-effort, never throws -- same guarantee as notify() in valet-notifications.ts,
// sits right alongside it at the vehicle_dispatched call site. Unlike notify() (which
// is site-wide), this targets the single operator who was just assigned the pickup.
export async function dispatchPush(
  supabase: ReturnType<typeof createServiceClient>,
  accountId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const { data: tokens } = await supabase
      .from("valet_push_tokens")
      .select("id, platform, token, endpoint, p256dh, auth_key")
      .eq("account_id", accountId);

    if (!tokens?.length) return;
    await sendToTokens(supabase, tokens, title, body, data);
  } catch {
    // best-effort -- never fail the caller's ticket-lifecycle transaction
  }
}

// Broadcasts to every registered Android install, not one operator's tokens -- a new
// app release is relevant to every operator/admin using the app, unlike a per-ticket
// dispatch. Scoped to platform = 'android' only: "a new APK is available" has no
// actionable meaning for a web-push (mweb/browser) subscriber.
export async function broadcastAndroidPush(
  supabase: ReturnType<typeof createServiceClient>,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const { data: tokens } = await supabase
      .from("valet_push_tokens")
      .select("id, platform, token, endpoint, p256dh, auth_key")
      .eq("platform", "android");

    if (!tokens?.length) return;
    await sendToTokens(supabase, tokens, title, body, data);
  } catch {
    // best-effort -- never fail the release-checklist caller
  }
}
