"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { registerPushToken } from "@/lib/push/register-token";

export async function registerPushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await getValetSession();
  if (!session) return;

  const supabase = createServiceClient();
  await registerPushToken(supabase, {
    accountId: session.accountId,
    platform: "web",
    token: subscription.endpoint,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    authKey: subscription.keys.auth,
  });
}
