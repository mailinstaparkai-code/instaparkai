import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type AvailableOperator = {
  id: string;
  username: string;
  full_name: string | null;
  lastAssignedAt: string | null;
};

// "Available" = active valet_operator for the site, not currently the dispatched_by of
// a ticket still in flight (in_transit or arrived -- i.e. out fetching/delivering a
// car). Sorted by lastAssignedAt ascending (nulls first), so index 0 is both a sensible
// default for a manual picker and the correct round-robin pick for auto-allocation.
export async function getAvailableOperators(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
): Promise<AvailableOperator[]> {
  const [{ data: operators }, { data: busyTickets }, { data: assignmentHistory }] = await Promise.all([
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
  ]);

  const busyIds = new Set((busyTickets ?? []).map((t) => t.dispatched_by as string));

  const lastAssignedById = new Map<string, string>();
  for (const row of assignmentHistory ?? []) {
    const id = row.dispatched_by as string;
    if (!lastAssignedById.has(id) && row.in_transit_at) {
      lastAssignedById.set(id, row.in_transit_at);
    }
  }

  const available = (operators ?? [])
    .filter((op) => !busyIds.has(op.id))
    .map((op) => ({
      ...op,
      lastAssignedAt: lastAssignedById.get(op.id) ?? null,
    }));

  available.sort((a, b) => {
    if (!a.lastAssignedAt && !b.lastAssignedAt) return 0;
    if (!a.lastAssignedAt) return -1;
    if (!b.lastAssignedAt) return 1;
    return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
  });

  return available;
}
