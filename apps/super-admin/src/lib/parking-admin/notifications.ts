import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";

export type NotificationRow = {
  id: string;
  kind: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export async function getRecentNotifications(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
): Promise<NotificationRow[]> {
  const { data } = await supabase
    .from("valet_notifications")
    .select("id, kind, message, read_at, created_at")
    .eq("parking_space_id", siteId)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function markAllNotificationsRead(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
): Promise<void> {
  await supabase
    .from("valet_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("parking_space_id", siteId)
    .is("read_at", null);
}
