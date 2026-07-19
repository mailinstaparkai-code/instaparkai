"use server";

import { redirect } from "next/navigation";
import { destroyValetSession, getValetSession } from "@/lib/valet-auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import * as notificationsLib from "@/lib/parking-admin/notifications";

export async function logoutParkingAdmin() {
  await destroyValetSession();
  redirect("/parking-admin/login");
}

export type { NotificationRow } from "@/lib/parking-admin/notifications";

export async function getRecentNotifications() {
  const session = await getValetSession();
  if (!session) return [];

  const supabase = createServiceClient();
  return notificationsLib.getRecentNotifications(supabase, session.assignedSiteId);
}

export async function markAllNotificationsRead() {
  const session = await getValetSession();
  if (!session) return;

  const supabase = createServiceClient();
  await notificationsLib.markAllNotificationsRead(supabase, session.assignedSiteId);
}
