import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type DailyStatusKind = "in" | "out" | "leave" | "break";

export type AvailableOperator = {
  id: string;
  username: string;
  full_name: string | null;
  lastAssignedAt: string | null;
  dailyStatus: DailyStatusKind | null;
};

// IST calendar date as YYYY-MM-DD -- "today" for operator_daily_status is always the
// site's local (IST) day, not the server/browser's own timezone.
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// "Available" = active valet_operator for the site, not currently the dispatched_by of
// a ticket still in flight (in_transit or arrived -- i.e. out fetching/delivering a
// car). Sorted by lastAssignedAt ascending (nulls first), so index 0 is both a sensible
// default for a manual picker and the correct round-robin pick for auto-allocation.
//
// respectDailyStatus (default true) additionally requires an explicit "in" row in
// operator_daily_status for today's IST date -- this is opt-in by design (no row =
// not available), so the auto-allocation call site uses the default. The manual
// dispatch picker passes false: a human admin can still deliberately assign someone
// marked out/leave/break (the UI surfaces their status as a badge instead of hiding
// them), so it isn't gated by this filter.
export async function getAvailableOperators(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  opts: { respectDailyStatus?: boolean } = {}
): Promise<AvailableOperator[]> {
  const respectDailyStatus = opts.respectDailyStatus ?? true;
  const today = todayIST();

  const [{ data: operators }, { data: busyTickets }, { data: assignmentHistory }, { data: dailyStatusRows }] =
    await Promise.all([
      supabase
        .from("valet_accounts")
        .select("id, username, full_name")
        .eq("assigned_site_id", siteId)
        .eq("role", "valet_operator")
        .eq("is_active", true),
      supabase
        .from("valet_tickets")
        .select("dispatched_by")
        .eq("parking_space_id", siteId)
        .in("status", ["in_transit", "arrived"])
        .not("dispatched_by", "is", null),
      supabase
        .from("valet_tickets")
        .select("dispatched_by, in_transit_at")
        .eq("parking_space_id", siteId)
        .not("dispatched_by", "is", null)
        .order("in_transit_at", { ascending: false }),
      supabase.from("operator_daily_status").select("operator_id, status").eq("status_date", today),
    ]);

  const busyIds = new Set((busyTickets ?? []).map((t) => t.dispatched_by as string));

  const lastAssignedById = new Map<string, string>();
  for (const row of assignmentHistory ?? []) {
    const id = row.dispatched_by as string;
    if (!lastAssignedById.has(id) && row.in_transit_at) {
      lastAssignedById.set(id, row.in_transit_at);
    }
  }

  const dailyStatusById = new Map<string, DailyStatusKind>();
  for (const row of dailyStatusRows ?? []) {
    dailyStatusById.set(row.operator_id, row.status as DailyStatusKind);
  }

  let available = (operators ?? [])
    .filter((op) => !busyIds.has(op.id))
    .map((op) => ({
      ...op,
      lastAssignedAt: lastAssignedById.get(op.id) ?? null,
      dailyStatus: dailyStatusById.get(op.id) ?? null,
    }));

  if (respectDailyStatus) {
    available = available.filter((op) => op.dailyStatus === "in");
  }

  available.sort((a, b) => {
    if (!a.lastAssignedAt && !b.lastAssignedAt) return 0;
    if (!a.lastAssignedAt) return -1;
    if (!b.lastAssignedAt) return 1;
    return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
  });

  return available;
}
