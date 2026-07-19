import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { computeFare } from "@/lib/tariff";
import { getQueueData } from "@/lib/parking-admin/queue";
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
  updateTicketDetails,
  voidTicket,
} from "../../(authenticated)/queue/actions";
import { CopyLinkButton } from "../../(authenticated)/queue/copy-link-button";
import { HandoverButton } from "../../(authenticated)/queue/handover-button";
import { PhotosButton } from "../../(authenticated)/queue/photos-button";
import { DispatchOperatorButton } from "../../(authenticated)/queue/dispatch-operator-button";
import { MarkParkedButton } from "../../(authenticated)/queue/mark-parked-button";
import { AutoAllocateToggle } from "../../(authenticated)/queue/auto-allocate-toggle";
import { TicketTimelineDialog } from "../../(authenticated)/queue/ticket-timeline-dialog";
import { TicketActionsMenu } from "../../(authenticated)/queue/ticket-actions-menu";
import { QueueFilters } from "../../components/queue-filters";

const STATUS_LABEL: Record<string, string> = {
  checked_in: "Checked in",
  parked: "Parked",
  requested: "Requested",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  checked_in: "bg-brand-blue/15 text-brand-blue",
  parked: "bg-status-info/15 text-status-info",
  requested: "bg-status-warning/15 text-status-warning",
  in_transit: "bg-brand-orange/15 text-brand-orange",
  arrived: "bg-status-success/15 text-status-success",
  completed: "bg-muted text-muted-foreground",
};

function parseCsv(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export default async function MobileQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; vehicle_type?: string }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const params = await searchParams;
  const statusFilter = parseCsv(params.status);
  const vehicleTypeFilter = parseCsv(params.vehicle_type);

  const supabase = createServiceClient();
  const {
    tickets,
    availableSlots,
    operatorOptions,
    vehicleTypeOptions: vehicleTypeFilterOptions,
    statusOptions: statusFilterOptions,
    tariffRules,
    autoAllocateEnabled,
    canRequest,
    canDispatch,
    myAccountId,
  } = await getQueueData(supabase, session, { status: statusFilter, vehicleType: vehicleTypeFilter });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Live Queue</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} active vehicle(s)</p>
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
              defaultValue={vehicleTypeFilterOptions[0]?.value ?? "car"}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {vehicleTypeFilterOptions.map((vt) => (
                <option key={vt.value} value={vt.value}>
                  {vt.label}
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
          defaultChecked={autoAllocateEnabled}
          action={updateAutoAllocate}
        />
      )}

      <QueueFilters
        statusOptions={statusFilterOptions}
        vehicleTypeOptions={vehicleTypeFilterOptions}
        status={statusFilter}
        vehicleType={vehicleTypeFilter}
      />

      <div className="flex flex-col gap-3">
        {tickets.map((t) => {
          const minutesParked = Math.round(
            (new Date().getTime() - new Date(t.checked_in_at).getTime()) / 60000
          );
          const suggestedFare = computeFare(tariffRules, t.vehicle_type, minutesParked);

          return (
            <div key={t.id} className="glass-card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <TicketTimelineDialog ticketId={t.id} vehicleNumber={t.vehicle_number} />
                  <p className="text-xs capitalize text-muted-foreground">
                    {t.vehicle_type} · {t.mobile_number}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                  <TicketActionsMenu
                    ticketId={t.id}
                    vehicleNumber={t.vehicle_number}
                    mobileNumber={t.mobile_number}
                    updateAction={updateTicketDetails}
                    voidAction={voidTicket}
                  />
                </div>
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
                {t.status === "checked_in" &&
                  (session.role === "parking_admin" || t.checked_in_by === myAccountId) && (
                    <MarkParkedButton
                      ticketId={t.id}
                      slots={availableSlots}
                      action={markAsParked}
                    />
                  )}
                {t.status === "parked" && canRequest && (
                  <form action={requestVehicle}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" size="sm" variant="outline" className="w-full">
                      Guest requested
                    </Button>
                  </form>
                )}
                {t.status === "requested" && canDispatch && (
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
                    suggestedFare={suggestedFare}
                    action={completeHandover}
                  />
                )}
              </div>
            </div>
          );
        })}
        {!tickets.length && (
          <p className="glass-card p-6 text-center text-sm text-muted-foreground">
            No active vehicles. Check one in to get started.
          </p>
        )}
      </div>
    </div>
  );
}
