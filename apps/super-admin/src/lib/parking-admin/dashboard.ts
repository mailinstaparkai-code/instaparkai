import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSiteId, type ValetSession } from "@/lib/valet-auth/session";
import { getMyDailyStatus, type MyDailyStatus } from "./operator-status";

export type DashboardSummary = {
  siteName: string | null;
  valetParkingEnabled: boolean;
  qrCodeModeEnabled: boolean;
  kpis: {
    activeVehicles: number;
    arrived: number;
    completedToday: number;
    avgTurnaroundMinutes: number | null;
  };
  capacity: {
    totalSlots: number;
    occupiedSlots: number;
  };
  myDailyStatus: MyDailyStatus;
};

export async function getDashboardSummary(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession
): Promise<DashboardSummary> {
  const siteId = getCurrentSiteId(session);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: site }, { data: tickets }, { data: zones }, myDailyStatus] = await Promise.all([
    supabase
      .from("parking_spaces")
      .select("name, valet_parking_enabled, guest_request_mode")
      .eq("id", siteId)
      .single(),
    supabase
      .from("valet_tickets")
      .select("status, checked_in_at, completed_at")
      .eq("parking_space_id", siteId)
      .gte("checked_in_at", startOfToday.toISOString()),
    // Same forward zones -> slots embed as getQueueData() in queue.ts, just for
    // capacity counting instead of an availability picker.
    supabase.from("zones").select("slots(status)").eq("parking_space_id", siteId),
    getMyDailyStatus(supabase, session),
  ]);
  const slots = (zones ?? []).flatMap((z) => z.slots as { status: string }[]);

  const activeCount =
    tickets?.filter((t) => t.status !== "completed" && t.status !== "voided").length ?? 0;
  const arrivedCount = tickets?.filter((t) => t.status === "arrived").length ?? 0;
  const completedToday = tickets?.filter((t) => t.status === "completed") ?? [];

  const avgTurnaroundMinutes = completedToday.length
    ? Math.round(
        completedToday.reduce(
          (sum, t) =>
            sum + (new Date(t.completed_at!).getTime() - new Date(t.checked_in_at).getTime()) / 60000,
          0
        ) / completedToday.length
      )
    : null;

  return {
    siteName: site?.name ?? null,
    valetParkingEnabled: site?.valet_parking_enabled ?? false,
    qrCodeModeEnabled: site?.guest_request_mode === "qr",
    kpis: {
      activeVehicles: activeCount,
      arrived: arrivedCount,
      completedToday: completedToday.length,
      avgTurnaroundMinutes,
    },
    capacity: {
      totalSlots: slots?.length ?? 0,
      occupiedSlots: slots?.filter((s) => s.status === "occupied").length ?? 0,
    },
    myDailyStatus,
  };
}
