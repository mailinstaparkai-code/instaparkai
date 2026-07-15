import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { CopyLinkButton } from "../../(authenticated)/queue/copy-link-button";
import { PhotosButton } from "../../(authenticated)/queue/photos-button";
import { TicketTimelineDialog } from "../../(authenticated)/queue/ticket-timeline-dialog";

const STATUS_LABEL: Record<string, string> = {
  parked: "Parked",
  requested: "Requested",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  parked: "bg-status-info/15 text-status-info",
  requested: "bg-status-warning/15 text-status-warning",
  in_transit: "bg-brand-orange/15 text-brand-orange",
  arrived: "bg-status-success/15 text-status-success",
  completed: "bg-muted text-muted-foreground",
};

const FILTERS = ["all", "parked", "requested", "in_transit", "arrived", "completed"] as const;

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
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function MobileVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const { status } = await searchParams;
  const activeFilter = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";

  const supabase = createServiceClient();

  let query = supabase
    .from("valet_tickets")
    .select(
      "id, ticket_token, vehicle_number, vehicle_type, mobile_number, status, checked_in_at, completed_at, fare_amount, payment_collected, check_in_photos, handover_photos, " +
        "slots(slot_number), " +
        "checked_in_operator:valet_accounts!valet_tickets_checked_in_by_fkey(username, full_name), " +
        "delivered_operator:valet_accounts!valet_tickets_delivered_by_fkey(username, full_name)"
    )
    .eq("parking_space_id", session.assignedSiteId)
    .order("checked_in_at", { ascending: false })
    .limit(100);

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data: tickets } = await query.returns<Ticket[]>();

  const completed = tickets?.filter((t) => t.status === "completed") ?? [];
  const totalRevenue = completed.reduce((sum, t) => sum + (t.fare_amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Vehicles</h1>
        <p className="text-sm text-muted-foreground">
          {tickets?.length ?? 0} record(s){activeFilter !== "all" && ` · ${STATUS_LABEL[activeFilter]}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{completed.length}</p>
          <p className="text-xs text-muted-foreground">Completed (last 100)</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">₹{totalRevenue}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/parking-admin/m/vehicles" : `/parking-admin/m/vehicles?status=${f}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              activeFilter === f
                ? "bg-brand-orange text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f === "all" ? "All" : STATUS_LABEL[f]}
          </Link>
        ))}
      </div>

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
                {new Date(t.checked_in_at).toLocaleString()}
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
    </div>
  );
}
