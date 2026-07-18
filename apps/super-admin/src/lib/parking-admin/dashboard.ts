import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";

export type DashboardSummary = {
  siteName: string | null;
  valetParkingEnabled: boolean;
  kpis: {
    activeVehicles: number;
    arrived: number;
    completedToday: number;
    avgTurnaroundMinutes: number | null;
  };
};

export async function getDashboardSummary(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
): Promise<DashboardSummary> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: site }, { data: tickets }] = await Promise.all([
    supabase.from("parking_spaces").select("name, valet_parking_enabled").eq("id", siteId).single(),
    supabase
      .from("valet_tickets")
      .select("status, checked_in_at, completed_at")
      .eq("parking_space_id", siteId)
      .gte("checked_in_at", startOfToday.toISOString()),
  ]);

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
    kpis: {
      activeVehicles: activeCount,
      arrived: arrivedCount,
      completedToday: completedToday.length,
      avgTurnaroundMinutes,
    },
  };
}
