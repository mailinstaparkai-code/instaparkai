import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { ALL_STATUSES, listVehicles, STATUS_LABEL } from "@/lib/parking-admin/vehicles";
import { CopyLinkButton } from "../../(authenticated)/queue/copy-link-button";
import { PhotosButton } from "../../(authenticated)/queue/photos-button";
import { TicketTimelineDialog } from "../../(authenticated)/queue/ticket-timeline-dialog";
import { formatIST } from "@/lib/format-date";
import { VehicleFilters } from "../../components/vehicle-filters";

const STATUS_COLOR: Record<string, string> = {
  checked_in: "bg-brand-blue/15 text-brand-blue",
  parked: "bg-status-info/15 text-status-info",
  requested: "bg-status-warning/15 text-status-warning",
  in_transit: "bg-brand-orange/15 text-brand-orange",
  arrived: "bg-status-success/15 text-status-success",
  completed: "bg-muted text-muted-foreground",
  voided: "bg-status-danger/15 text-status-danger",
};

function parseCsv(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function pageHref(page: number, status: string[], vehicleType: string[], operator: string[]): string {
  const params = new URLSearchParams();
  if (status.length) params.set("status", status.join(","));
  if (vehicleType.length) params.set("vehicle_type", vehicleType.join(","));
  if (operator.length) params.set("operator", operator.join(","));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/parking-admin/m/vehicles?${qs}` : "/parking-admin/m/vehicles";
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function MobileVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; vehicle_type?: string; operator?: string; page?: string }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const params = await searchParams;
  const statusFilter = parseCsv(params.status).filter((s) =>
    (ALL_STATUSES as readonly string[]).includes(s)
  );
  const vehicleTypeFilter = parseCsv(params.vehicle_type);
  const operatorFilter = parseCsv(params.operator);
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = createServiceClient();

  const {
    tickets,
    totalCount,
    totalPages,
    completedCount,
    totalRevenue,
    statusOptions,
    vehicleTypeOptions,
    operatorOptions,
  } = await listVehicles(
    supabase,
    session.assignedSiteId,
    { status: statusFilter, vehicleType: vehicleTypeFilter, operator: operatorFilter },
    page
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Vehicles</h1>
        <p className="text-sm text-muted-foreground">{totalCount} record(s)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Completed (last 500)</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">₹{totalRevenue}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
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

      <div className="flex flex-col gap-3">
        {tickets?.map((t) => {
          const turnaroundMinutes = t.completed_at
            ? Math.round(
                (new Date(t.completed_at).getTime() - new Date(t.checked_in_at).getTime()) / 60000
              )
            : null;

          return (
            <div key={t.id} className="glass-card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <TicketTimelineDialog ticketId={t.id} vehicleNumber={t.vehicle_number} />
                  <p className="text-xs capitalize text-muted-foreground">
                    {t.vehicle_type} · {t.mobile_number}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}
                >
                  {STATUS_LABEL[t.status]}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Slot: {t.slots?.slot_number ?? "—"} · Checked in{" "}
                {formatIST(t.checked_in_at)}
                {turnaroundMinutes !== null && ` · ${formatDuration(turnaroundMinutes)}`}
              </p>

              {t.fare_amount !== null && (
                <p className="text-sm">
                  <span className="font-numeric">₹{t.fare_amount}</span>{" "}
                  <span
                    className={t.payment_collected ? "text-status-success" : "text-status-warning"}
                  >
                    {t.payment_collected ? "paid" : "pending"}
                  </span>
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                {t.checked_in_operator && (
                  <>In: {t.checked_in_operator.full_name || t.checked_in_operator.username}</>
                )}
                {t.checked_in_operator && t.delivered_operator && " · "}
                {t.delivered_operator && (
                  <>Out: {t.delivered_operator.full_name || t.delivered_operator.username}</>
                )}
                {!t.checked_in_operator && !t.delivered_operator && "—"}
              </p>

              <div className="flex items-center gap-4">
                <CopyLinkButton token={t.ticket_token} />
                <PhotosButton
                  ticketId={t.id}
                  count={t.check_in_photos.length + t.handover_photos.length}
                />
              </div>
            </div>
          );
        })}
        {!tickets?.length && (
          <p className="glass-card p-6 text-center text-sm text-muted-foreground">
            No records for this filter.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={pageHref(page - 1, statusFilter, vehicleTypeFilter, operatorFilter)}
              aria-disabled={page <= 1}
              className={`rounded-md border border-input px-3 py-1.5 text-xs font-medium ${
                page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"
              }`}
            >
              Prev
            </Link>
            <Link
              href={pageHref(page + 1, statusFilter, vehicleTypeFilter, operatorFilter)}
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
