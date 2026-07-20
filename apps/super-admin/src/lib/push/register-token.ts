import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type RegisterTokenInput = {
  accountId: string;
  platform: "android" | "web";
  token: string;
  endpoint?: string;
  p256dh?: string;
  authKey?: string;
};

export async function registerPushToken(
  supabase: ReturnType<typeof createServiceClient>,
  input: RegisterTokenInput
): Promise<void> {
  await supabase.from("valet_push_tokens").upsert(
    {
      account_id: input.accountId,
      platform: input.platform,
      token: input.token,
      endpoint: input.endpoint ?? null,
      p256dh: input.p256dh ?? null,
      auth_key: input.authKey ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );
}
