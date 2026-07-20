import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAndroidPush } from "./fcm";
import { sendWebPush } from "./web-push";

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
  } catch {
    // best-effort -- never fail the caller's ticket-lifecycle transaction
  }
}
