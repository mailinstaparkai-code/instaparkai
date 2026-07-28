import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";

export const ALL_STATUSES = [
  "checked_in",
  "parked",
  "requested",
  "in_transit",
  "arrived",
  "completed",
  "voided",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  checked_in: "Checked in",
  parked: "Parked",
  requested: "Requested",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
  voided: "Voided",
};

export const PAGE_SIZE = 25;

export type VehicleTicketRow = {
  id: string;
  ticket_token: string;
  vehicle_number: string;
  vehicle_type: string;
  mobile_number: string;
  status: string;
  checked_in_at: string;
  completed_at: string | null;
  fare_amount: number | null;
  payment_collected: boolean;
  check_in_photos: unknown[];
  handover_photos: unknown[];
  slots: { slot_number: string } | null;
  checked_in_operator: { username: string; full_name: string | null } | null;
  delivered_operator: { username: string; full_name: string | null } | null;
  qr_codes: { code: string } | null;
};

export type VehicleFilterOptions = {
  statusOptions: { value: string; label: string }[];
  vehicleTypeOptions: { value: string; label: string }[];
  operatorOptions: { value: string; label: string }[];
};

export type ListVehiclesResult = {
  tickets: VehicleTicketRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  completedCount: number;
  totalRevenue: number;
} & VehicleFilterOptions;

export async function listVehicles(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  filters: { status: string[]; vehicleType: string[]; operator: string[] },
  page: number
): Promise<ListVehiclesResult> {
  const statusFilter = filters.status.filter((s) => (ALL_STATUSES as readonly string[]).includes(s));
  const vehicleTypeFilter = filters.vehicleType;
  const operatorFilter = filters.operator;
  const safePage = Math.max(1, page);

  const [{ data: vehicleTypes }, { data: operatorAccounts }] = await Promise.all([
    supabase.from("vehicle_types").select("id, name").eq("parking_space_id", siteId).order("name"),
    supabase
      .from("valet_accounts")
      .select("id, username, full_name")
      .eq("assigned_site_id", siteId)
      .order("username"),
  ]);

  const TICKET_SELECT =
    "id, ticket_token, vehicle_number, vehicle_type, mobile_number, status, checked_in_at, completed_at, fare_amount, payment_collected, check_in_photos, handover_photos, " +
    "slots(slot_number), qr_codes(code), " +
    "checked_in_operator:valet_accounts!valet_tickets_checked_in_by_fkey(username, full_name), " +
    "delivered_operator:valet_accounts!valet_tickets_delivered_by_fkey(username, full_name)";

  let baseQuery = supabase
    .from("valet_tickets")
    .select(TICKET_SELECT, { count: "exact" })
    .eq("parking_space_id", siteId);

  if (statusFilter.length) baseQuery = baseQuery.in("status", statusFilter);
  if (vehicleTypeFilter.length) baseQuery = baseQuery.in("vehicle_type", vehicleTypeFilter);
  if (operatorFilter.length) {
    const list = operatorFilter.join(",");
    baseQuery = baseQuery.or(`checked_in_by.in.(${list}),delivered_by.in.(${list})`);
  }

  const from = (safePage - 1) * PAGE_SIZE;

  let statsQuery = supabase
    .from("valet_tickets")
    .select("fare_amount, payment_collected, checked_in_at, completed_at")
    .eq("parking_space_id", siteId)
    .eq("status", "completed")
    .order("checked_in_at", { ascending: false })
    .limit(500);
  if (vehicleTypeFilter.length) statsQuery = statsQuery.in("vehicle_type", vehicleTypeFilter);
  if (operatorFilter.length) {
    const list = operatorFilter.join(",");
    statsQuery = statsQuery.or(`checked_in_by.in.(${list}),delivered_by.in.(${list})`);
  }
  // The paginated row list and the revenue/stats aggregate are independent, so
  // they go out together rather than one after the other.
  const [{ data: tickets, count }, { data: completedForStats }] = await Promise.all([
    baseQuery
      .order("checked_in_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .returns<VehicleTicketRow[]>(),
    statsQuery.returns<{ fare_amount: number | null; payment_collected: boolean }[]>(),
  ]);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const completed = completedForStats ?? [];
  const totalRevenue = completed.reduce((sum, t) => sum + (t.fare_amount ?? 0), 0);

  return {
    tickets: tickets ?? [],
    page: safePage,
    totalPages,
    totalCount,
    completedCount: completed.length,
    totalRevenue,
    statusOptions: ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
    vehicleTypeOptions: (vehicleTypes ?? []).map((vt) => ({ value: vt.name, label: vt.name })),
    operatorOptions: (operatorAccounts ?? []).map((op) => ({
      value: op.id,
      label: op.full_name || op.username,
    })),
  };
}
