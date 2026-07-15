"use server";

import { redirect } from "next/navigation";
import { destroyValetSession, getValetSession } from "@/lib/valet-auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export async function logoutParkingAdmin() {
  await destroyValetSession();
  redirect("/parking-admin/login");
}

export type NotificationRow = {
  id: string;
  kind: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export async function getRecentNotifications(): Promise<NotificationRow[]> {
  const session = await getValetSession();
  if (!session) return [];

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("valet_notifications")
    .select("id, kind, message, read_at, created_at")
    .eq("parking_space_id", session.assignedSiteId)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function markAllNotificationsRead() {
  const session = await getValetSession();
  if (!session) return;

  const supabase = createServiceClient();
  await supabase
    .from("valet_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("parking_space_id", session.assignedSiteId)
    .is("read_at", null);
}
