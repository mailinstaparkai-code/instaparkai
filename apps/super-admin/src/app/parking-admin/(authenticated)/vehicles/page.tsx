import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSiteId, getValetSession } from "@/lib/valet-auth/session";
import { CopyLinkButton } from "../queue/copy-link-button";
import { PhotosButton } from "../queue/photos-button";
import { TicketTimelineDialog } from "../queue/ticket-timeline-dialog";
import { formatIST } from "@/lib/format-date";
import { VehicleFilters } from "../../components/vehicle-filters";
import { vehicleImageSrc } from "@/lib/vehicle-image";

const STATUS_LABEL: Record<string, string> = {
  checked_in: "Checked in",
  parked: "Parked",
  requested: "Requested",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
  voided: "Voided",
};

const STATUS_COLOR: Record<string, string> = {
  checked_in: "bg-brand-blue/15 text-brand-blue",
  parked: "bg-status-info/15 text-status-info",
  requested: "bg-status-warning/15 text-status-warning",
  in_transit: "bg-brand-orange/15 text-brand-orange",
  arrived: "bg-status-success/15 text-status-success",
  completed: "bg-status-success/15 text-status-success",
  voided: "bg-status-danger/15 text-status-danger",
};

const ALL_STATUSES = [
  "checked_in",
  "parked",
  "requested",
  "in_transit",
  "arrived",
  "completed",
  "voided",
];
const PAGE_SIZE = 25;

function parseCsv(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function pageHref(
  page: number,
  status: string[],
  vehicleType: string[],
  operator: string[],
  q: string
): string {
  const params = new URLSearchParams();
  if (status.length) params.set("status", status.join(","));
  if (vehicleType.length) params.set("vehicle_type", vehicleType.join(","));
  if (operator.length) params.set("operator", operator.join(","));
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/parking-admin/vehicles?${qs}` : "/parking-admin/vehicles";
}

type Ticket = {
  id: string;
  ticket_token: string;
  vehicle_number: string;
  vehicle_type: string;
  mobile_number: string;
  status: keyof typeof STATUS_LABEL;
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

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function VehicleLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    vehicle_type?: string;
    operator?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const params = await searchParams;
  const statusFilter = parseCsv(params.status).filter((s) => ALL_STATUSES.includes(s));
  const vehicleTypeFilter = parseCsv(params.vehicle_type);
  const operatorFilter = parseCsv(params.operator);
  const q = (params.q ?? "").trim().replace(/[%,()]/g, "");
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = createServiceClient();

  const [{ data: vehicleTypes }, { data: operatorAccounts }] = await Promise.all([
    supabase
      .from("vehicle_types")
      .select("id, name")
      .eq("parking_space_id", getCurrentSiteId(session))
      .order("name"),
    supabase
      .from("valet_accounts")
      .select("id, username, full_name")
      .eq("assigned_site_id", getCurrentSiteId(session))
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
    .eq("parking_space_id", getCurrentSiteId(session));

  if (statusFilter.length) baseQuery = baseQuery.in("status", statusFilter);
  if (vehicleTypeFilter.length) baseQuery = baseQuery.in("vehicle_type", vehicleTypeFilter);
  if (operatorFilter.length) {
    const list = operatorFilter.join(",");
    baseQuery = baseQuery.or(`checked_in_by.in.(${list}),delivered_by.in.(${list})`);
  }
  if (q) {
    baseQuery = baseQuery.or(`vehicle_number.ilike.%${q}%,mobile_number.ilike.%${q}%`);
  }

  const from = (page - 1) * PAGE_SIZE;

  let statsQuery = supabase
    .from("valet_tickets")
    .select("fare_amount, payment_collected, checked_in_at, completed_at")
    .eq("parking_space_id", getCurrentSiteId(session))
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
      .returns<Ticket[]>(),
    statsQuery.returns<
      {
        fare_amount: number | null;
        payment_collected: boolean;
        checked_in_at: string;
        completed_at: string | null;
      }[]
    >(),
  ]);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const completed = completedForStats ?? [];
  const totalRevenue = completed.reduce((sum, t) => sum + (t.fare_amount ?? 0), 0);
  const paidCount = completed.filter((t) => t.payment_collected).length;
  const avgTurnaround = completed.length
    ? Math.round(
        completed.reduce(
          (sum, t) =>
            sum + (new Date(t.completed_at!).getTime() - new Date(t.checked_in_at).getTime()) / 60000,
          0
        ) / completed.length
      )
    : null;

  const statusOptions = ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const vehicleTypeOptions = (vehicleTypes ?? []).map((vt) => ({ value: vt.name, label: vt.name }));
  const operatorOptions = (operatorAccounts ?? []).map((op) => ({
    value: op.id,
    label: op.full_name || op.username,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Vehicles</h1>
        <p className="text-sm text-muted-foreground">{totalCount} record(s)</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{completed.length}</p>
          <p className="text-xs text-muted-foreground">Completed (last 500)</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">₹{totalRevenue}</p>
          <p className="text-xs text-muted-foreground">
            Revenue · {paidCount}/{completed.length} paid
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{avgTurnaround !== null ? `${avgTurnaround}m` : "—"}</p>
          <p className="text-xs text-muted-foreground">Avg turnaround</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{totalCount}</p>
          <p className="text-xs text-muted-foreground">Total matching filters</p>
        </div>
      </div>

      <VehicleFilters
        statusOptions={statusOptions}
        vehicleTypeOptions={vehicleTypeOptions}
        operatorOptions={operatorOptions}
        status={statusFilter}
        vehicleType={vehicleTypeFilter}
        operator={operatorFilter}
      />

      <div className="glass-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Vehicle</th>
              <th className="p-3 font-medium">Mobile</th>
              <th className="p-3 font-medium">Slot</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Checked in</th>
              <th className="p-3 font-medium">Turnaround</th>
              <th className="p-3 font-medium">Fare</th>
              <th className="p-3 font-medium">Operators</th>
              <th className="p-3 font-medium">Link</th>
              <th className="p-3 font-medium">QR code</th>
              <th className="p-3 font-medium">Photos</th>
            </tr>
          </thead>
          <tbody>
            {tickets?.map((t) => {
              const turnaroundMinutes = t.completed_at
                ? Math.round(
                    (new Date(t.completed_at).getTime() - new Date(t.checked_in_at).getTime()) / 60000
                  )
                : null;

              return (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src={vehicleImageSrc(t.vehicle_type)}
                        alt=""
                        width={32}
                        height={32}
                        className="shrink-0 rounded-md object-cover"
                      />
                      <div>
                        <TicketTimelineDialog ticketId={t.id} vehicleNumber={t.vehicle_number} qrCode={t.qr_codes?.code} />
                        <p className="text-xs capitalize text-muted-foreground">{t.vehicle_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{t.mobile_number}</td>
                  <td className="p-3">{t.slots?.slot_number ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {formatIST(t.checked_in_at)}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {turnaroundMinutes !== null ? formatDuration(turnaroundMinutes) : "—"}
                  </td>
                  <td className="p-3">
                    {t.fare_amount !== null ? (
                      <>
                        <span className="font-numeric">₹{t.fare_amount}</span>{" "}
                        <span
                          className={
                            t.payment_collected ? "text-status-success" : "text-status-warning"
                          }
                        >
                          {t.payment_collected ? "paid" : "pending"}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {t.checked_in_operator && (
                      <p>In: {t.checked_in_operator.full_name || t.checked_in_operator.username}</p>
                    )}
                    {t.delivered_operator && (
                      <p>Out: {t.delivered_operator.full_name || t.delivered_operator.username}</p>
                    )}
                    {!t.checked_in_operator && !t.delivered_operator && "—"}
                  </td>
                  <td className="p-3">
                    <CopyLinkButton token={t.ticket_token} />
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{t.qr_codes?.code ?? "—"}</td>
                  <td className="p-3">
                    <PhotosButton
                      ticketId={t.id}
                      count={t.check_in_photos.length + t.handover_photos.length}
                    />
                  </td>
                </tr>
              );
            })}
            {!tickets?.length && (
              <tr>
                <td colSpan={11} className="p-6 text-center text-sm text-muted-foreground">
                  No matching records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={pageHref(page - 1, statusFilter, vehicleTypeFilter, operatorFilter, q)}
              aria-disabled={page <= 1}
              className={`rounded-md border border-input px-3 py-1.5 text-xs font-medium ${
                page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"
              }`}
            >
              Prev
            </Link>
            <Link
              href={pageHref(page + 1, statusFilter, vehicleTypeFilter, operatorFilter, q)}
              aria-disabled={page >= totalPages}
              className={`rounded-md border border-input px-3 py-1.5 text-xs font-medium ${
                page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
