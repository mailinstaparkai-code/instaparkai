import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { computeFare, type TariffRule } from "@/lib/tariff";
import { getAvailableOperators } from "@/lib/operator-availability";
import { formatISTTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/field";
import { FormDialog } from "../../components/form-dialog";
import { PhotoInput } from "../../components/photo-input";
import {
  checkInVehicle,
  completeHandover,
  dispatchVehicle,
  markArrived,
  markAsParked,
  requestVehicle,
  updateAutoAllocate,
} from "../../(authenticated)/queue/actions";
import { CopyLinkButton } from "../../(authenticated)/queue/copy-link-button";
import { HandoverButton } from "../../(authenticated)/queue/handover-button";
import { PhotosButton } from "../../(authenticated)/queue/photos-button";
import { DispatchOperatorButton } from "../../(authenticated)/queue/dispatch-operator-button";
import { MarkParkedButton } from "../../(authenticated)/queue/mark-parked-button";
import { AutoAllocateToggle } from "../../(authenticated)/queue/auto-allocate-toggle";
import { TicketTimelineDialog } from "../../(authenticated)/queue/ticket-timeline-dialog";

const STATUS_LABEL: Record<string, string> = {
  checked_in: "Checked in",
  parked: "Parked",
  requested: "Requested",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  checked_in: "bg-status-disabled/15 text-status-disabled",
  parked: "bg-status-info/15 text-status-info",
  requested: "bg-status-warning/15 text-status-warning",
  in_transit: "bg-brand-orange/15 text-brand-orange",
  arrived: "bg-status-success/15 text-status-success",
  completed: "bg-muted text-muted-foreground",
};

type Ticket = {
  id: string;
  ticket_token: string;
  vehicle_number: string;
  vehicle_type: string;
  mobile_number: string;
  status: keyof typeof STATUS_LABEL;
  otp: string | null;
  checked_in_at: string;
  fare_amount: number | null;
  check_in_photos: unknown[];
  handover_photos: unknown[];
  slots: { slot_number: string } | null;
};

export default async function MobileQueuePage() {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const supabase = createServiceClient();

  const [
    { data: tickets },
    { data: zones },
    { data: tariffRules },
    { data: site },
    availableOperators,
    { data: vehicleTypes },
  ] = await Promise.all([
    supabase
      .from("valet_tickets")
      .select(
        "id, ticket_token, vehicle_number, vehicle_type, mobile_number, status, otp, checked_in_at, fare_amount, check_in_photos, handover_photos, slots(slot_number)"
      )
      .eq("parking_space_id", session.assignedSiteId)
      .neq("status", "completed")
      .order("checked_in_at", { ascending: true })
      .returns<Ticket[]>(),
    supabase
      .from("zones")
      .select("id, name, slots(id, slot_number, status)")
      .eq("parking_space_id", session.assignedSiteId),
    supabase
      .from("tariff_rules")
      .select("vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers")
      .eq("parking_space_id", session.assignedSiteId)
      .returns<TariffRule[]>(),
    supabase
      .from("parking_spaces")
      .select("auto_allocate_operator")
      .eq("id", session.assignedSiteId)
      .single(),
    getAvailableOperators(supabase, session.assignedSiteId),
    supabase
      .from("vehicle_types")
      .select("id, name")
      .eq("parking_space_id", session.assignedSiteId)
      .order("name"),
  ]);

  const operatorOptions = availableOperators.map((op) => ({
    id: op.id,
    label: op.full_name || op.username,
  }));

  const availableSlots =
    zones?.flatMap((z) =>
      (z.slots as { id: string; slot_number: string; status: string }[])
        .filter((s) => s.status === "available")
        .map((s) => ({ id: s.id, label: `${z.name} · ${s.slot_number}` }))
    ) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Live Queue</h1>
          <p className="text-sm text-muted-foreground">{tickets?.length ?? 0} active vehicle(s)</p>
        </div>
        <FormDialog
          trigger={<Button size="sm">+ Check-in</Button>}
          title="Check-in vehicle"
          action={checkInVehicle}
          submitLabel="Check in"
        >
          <Field label="Vehicle number">
            <Input name="vehicle_number" required placeholder="MH12AB1234" />
          </Field>
          <Field label="Vehicle type">
            <select
              name="vehicle_type"
              defaultValue={vehicleTypes?.[0]?.name ?? "car"}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {(vehicleTypes ?? []).map((vt) => (
                <option key={vt.id} value={vt.name}>
                  {vt.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mobile number">
            <Input name="mobile_number" required placeholder="9876543210" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <PhotoInput name="photo_front" label="Front" />
            <PhotoInput name="photo_back" label="Back" />
            <PhotoInput name="photo_left" label="Left" />
            <PhotoInput name="photo_right" label="Right" />
            <PhotoInput name="photo_odometer" label="Odometer" />
          </div>
        </FormDialog>
      </div>

      {session.role === "parking_admin" && (
        <AutoAllocateToggle
          defaultChecked={site?.auto_allocate_operator ?? false}
          action={updateAutoAllocate}
        />
      )}

      <div className="flex flex-col gap-3">
        {tickets?.map((t) => {
          const minutesParked = Math.round(
            (new Date().getTime() - new Date(t.checked_in_at).getTime()) / 60000
          );
          const suggestedFare = computeFare(tariffRules ?? [], t.vehicle_type, minutesParked);

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
                {formatISTTime(t.checked_in_at)}
              </p>

              <div className="flex items-center gap-4">
                <CopyLinkButton token={t.ticket_token} />
                <PhotosButton
                  ticketId={t.id}
                  count={t.check_in_photos.length + t.handover_photos.length}
                />
              </div>

              <div>
                {t.status === "checked_in" && (
                  <MarkParkedButton
                    ticketId={t.id}
                    slots={availableSlots}
                    action={markAsParked}
                  />
                )}
                {t.status === "parked" && (
                  <form action={requestVehicle}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" size="sm" variant="outline" className="w-full">
                      Guest requested
                    </Button>
                  </form>
                )}
                {t.status === "requested" && (
                  <DispatchOperatorButton
                    ticketId={t.id}
                    operators={operatorOptions}
                    action={dispatchVehicle}
                  />
                )}
                {t.status === "in_transit" && (
                  <form action={markArrived}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" size="sm" variant="outline" className="w-full">
                      Mark arrived
                    </Button>
                  </form>
                )}
                {t.status === "arrived" && (
                  <HandoverButton
                    ticketId={t.id}
                    otp={t.otp}
                    suggestedFare={suggestedFare}
                    action={completeHandover}
                  />
                )}
              </div>
            </div>
          );
        })}
        {!tickets?.length && (
          <p className="glass-card p-6 text-center text-sm text-muted-foreground">
            No active vehicles. Check one in to get started.
          </p>
        )}
      </div>
    </div>
  );
}
