import Image from "next/image";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { computeFare } from "@/lib/tariff";
import { getQueueData, type QueueTicket } from "@/lib/parking-admin/queue";
import { formatISTTime } from "@/lib/format-date";
import { vehicleImageSrc } from "@/lib/vehicle-image";
import { Car, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/field";
import { FormDialog } from "../../components/form-dialog";
import { PhotoInput } from "../../components/photo-input";
import { VehicleTypeSelector } from "../../components/vehicle-type-selector";
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
} from "./actions";
import { CopyLinkButton } from "./copy-link-button";
import { HandoverButton } from "./handover-button";
import { PhotosButton } from "./photos-button";
import { DispatchOperatorButton } from "./dispatch-operator-button";
import { MarkParkedButton } from "./mark-parked-button";
import { AutoAllocateToggle } from "./auto-allocate-toggle";
import { TicketTimelineDialog } from "./ticket-timeline-dialog";
import { TicketActionsMenu } from "./ticket-actions-menu";
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

// Shared between the desktop table's Action column and the narrow-viewport card
// fallback below -- one status-transition branch set, rendered twice at different
// breakpoints, rather than duplicating the five conditions in two places.
function TicketRowActions({
  ticket,
  suggestedFare,
  availableSlots,
  operatorOptions,
  canRequest,
  canDispatch,
  canMarkParked,
}: {
  ticket: Ticket;
  suggestedFare: number | null;
  availableSlots: { id: string; label: string }[];
  operatorOptions: { id: string; label: string }[];
  canRequest: boolean;
  canDispatch: boolean;
  canMarkParked: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {ticket.status === "checked_in" && canMarkParked && (
        <MarkParkedButton ticketId={ticket.id} slots={availableSlots} action={markAsParked} />
      )}
      {ticket.status === "parked" && canRequest && (
        <form action={requestVehicle}>
          <input type="hidden" name="id" value={ticket.id} />
          <Button type="submit" size="sm" variant="outline">
            Guest requested
          </Button>
        </form>
      )}
      {ticket.status === "requested" && canDispatch && (
        <DispatchOperatorButton
          ticketId={ticket.id}
          operators={operatorOptions}
          action={dispatchVehicle}
        />
      )}
      {ticket.status === "in_transit" && (
        <form action={markArrived}>
          <input type="hidden" name="id" value={ticket.id} />
          <Button type="submit" size="sm" variant="outline">
            Mark arrived
          </Button>
        </form>
      )}
      {ticket.status === "arrived" && (
        <HandoverButton ticketId={ticket.id} suggestedFare={suggestedFare} action={completeHandover} />
      )}
      <TicketActionsMenu
        ticketId={ticket.id}
        vehicleNumber={ticket.vehicle_number}
        mobileNumber={ticket.mobile_number}
        updateAction={updateTicketDetails}
        voidAction={voidTicket}
      />
    </div>
  );
}

type Ticket = QueueTicket;

export default async function LiveQueuePage({
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

  const counts = {
    checked_in: tickets.filter((t) => t.status === "checked_in").length,
    parked: tickets.filter((t) => t.status === "parked").length,
    requested: tickets.filter((t) => t.status === "requested").length,
    in_transit: tickets.filter((t) => t.status === "in_transit").length,
    arrived: tickets.filter((t) => t.status === "arrived").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Live Queue</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} active vehicle(s)</p>
        </div>
        <FormDialog
          trigger={<Button size="sm">+ Check-in Vehicle</Button>}
          title="Check-in Vehicle"
          subtitle="Enter vehicle details to check-in"
          icon={<Car className="size-5" />}
          action={checkInVehicle}
          submitLabel="Check in"
        >
          <Field label="Vehicle number">
            <div className="relative">
              <span className="absolute top-1/2 left-1.5 -translate-y-1/2 rounded-md bg-status-disabled/20 px-1.5 py-0.5 text-[10px] font-bold text-status-disabled">
                IND
              </span>
              <Input name="vehicle_number" required placeholder="KA01AB1234" className="pl-11" />
            </div>
          </Field>
          <Field label="Vehicle type">
            <VehicleTypeSelector
              name="vehicle_type"
              options={vehicleTypeFilterOptions}
              defaultValue={vehicleTypeFilterOptions[0]?.value ?? "car"}
            />
          </Field>
          <Field label="Mobile number">
            <div className="relative">
              <Phone className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="mobile_number" required placeholder="Enter mobile number" className="pl-8" />
            </div>
          </Field>
          <div>
            <p className="text-sm font-medium">Check-in photos (optional)</p>
            <p className="text-xs text-muted-foreground">Add clear photos of the vehicle</p>
            <div className="mt-2 grid grid-cols-4 gap-3">
              <PhotoInput name="photo_front" label="Front" />
              <PhotoInput name="photo_back" label="Back" />
              <PhotoInput name="photo_left" label="Left" />
              <PhotoInput name="photo_right" label="Right" />
            </div>
            <div className="mt-3 w-1/4">
              <PhotoInput name="photo_odometer" label="Odometer" />
            </div>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Checked in", value: counts.checked_in },
          { label: "Parked", value: counts.parked },
          { label: "Requested", value: counts.requested },
          { label: "In transit", value: counts.in_transit },
          { label: "Arrived", value: counts.arrived },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <p className="font-numeric text-2xl">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Table on md+ (768px); below that, a table crushes into unreadable wrapped
          columns, so narrow viewports get the card list instead (design.md §4: "no
          horizontal scroll anywhere... tables switch to a card-per-row layout"). */}
      <div className="glass-card hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Vehicle</th>
              <th className="p-3 font-medium">Mobile</th>
              <th className="p-3 font-medium">Slot</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Checked in</th>
              <th className="p-3 font-medium">Link</th>
              <th className="p-3 font-medium">Photos</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const minutesParked = Math.round(
                (new Date().getTime() - new Date(t.checked_in_at).getTime()) / 60000
              );
              const suggestedFare = computeFare(tariffRules, t.vehicle_type, minutesParked);

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
                        <TicketTimelineDialog ticketId={t.id} vehicleNumber={t.vehicle_number} />
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
                    {formatISTTime(t.checked_in_at)}
                  </td>
                  <td className="p-3">
                    <CopyLinkButton token={t.ticket_token} />
                  </td>
                  <td className="p-3">
                    <PhotosButton
                      ticketId={t.id}
                      count={t.check_in_photos.length + t.handover_photos.length}
                    />
                  </td>
                  <td className="p-3">
                    <TicketRowActions
                      ticket={t}
                      suggestedFare={suggestedFare}
                      availableSlots={availableSlots}
                      operatorOptions={operatorOptions}
                      canRequest={canRequest}
                      canDispatch={canDispatch}
                      canMarkParked={session.role === "parking_admin" || t.checked_in_by === myAccountId}
                    />
                  </td>
                </tr>
              );
            })}
            {!tickets.length && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                  No active vehicles. Check one in to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {tickets.map((t) => {
          const minutesParked = Math.round(
            (new Date().getTime() - new Date(t.checked_in_at).getTime()) / 60000
          );
          const suggestedFare = computeFare(tariffRules ?? [], t.vehicle_type, minutesParked);

          return (
            <div key={t.id} className="glass-card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Image
                    src={vehicleImageSrc(t.vehicle_type)}
                    alt=""
                    width={36}
                    height={36}
                    className="shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <TicketTimelineDialog ticketId={t.id} vehicleNumber={t.vehicle_number} />
                    <p className="text-xs capitalize text-muted-foreground">
                      {t.vehicle_type} · {t.mobile_number}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}
                >
                  {STATUS_LABEL[t.status]}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Slot: {t.slots?.slot_number ?? "—"} · Checked in {formatISTTime(t.checked_in_at)}
              </p>

              <div className="flex items-center gap-4">
                <CopyLinkButton token={t.ticket_token} />
                <PhotosButton
                  ticketId={t.id}
                  count={t.check_in_photos.length + t.handover_photos.length}
                />
              </div>

              <TicketRowActions
                ticket={t}
                suggestedFare={suggestedFare}
                availableSlots={availableSlots}
                operatorOptions={operatorOptions}
                canRequest={canRequest}
                canDispatch={canDispatch}
                canMarkParked={session.role === "parking_admin" || t.checked_in_by === myAccountId}
              />
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
