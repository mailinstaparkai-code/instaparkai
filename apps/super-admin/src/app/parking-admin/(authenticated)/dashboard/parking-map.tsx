"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import { TicketTimelineDialog } from "../queue/ticket-timeline-dialog";

type Slot = { id: string; slot_number: string; status: string };
type Zone = { id: string; name: string; slots: Slot[] };
type ParkedTicket = { id: string; slot_id: string | null; vehicle_number: string };

const STATUS_COLOR: Record<string, string> = {
  available: "border-status-success/40 bg-status-success/15 text-status-success",
  occupied: "border-brand-orange/40 bg-brand-orange/15 text-brand-orange",
  reserved: "border-status-info/40 bg-status-info/15 text-status-info",
  out_of_service: "border-border bg-muted text-muted-foreground",
};

// Icon-badge colors for filled (occupied/reserved) tiles -- a small colored tile behind the
// car icon, matching the app's existing icon-tile convention (e.g. StatDashlet), rather than
// a full-tile color wash + glow (which read as blur on this light canvas, not a "lit up" pill).
const STATUS_ICON_BG: Record<string, string> = {
  occupied: "bg-brand-orange/15 text-brand-orange",
  reserved: "bg-status-info/15 text-status-info",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  out_of_service: "Out of service",
};

export function ParkingMap({
  zones,
  parkedTickets,
}: {
  zones: Zone[];
  parkedTickets: ParkedTicket[];
}) {
  const [activeZone, setActiveZone] = useState<string>("all");

  const ticketBySlotId = new Map(
    parkedTickets.filter((t) => t.slot_id).map((t) => [t.slot_id as string, t])
  );

  const visibleZones = activeZone === "all" ? zones : zones.filter((z) => z.id === activeZone);
  const allSlots = zones.flatMap((z) => z.slots);
  const totalSlots = allSlots.length;

  if (!totalSlots) {
    return null;
  }

  const occupiedCount = allSlots.filter((s) => s.status === "occupied").length;
  const statusCounts = allSlots.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="metric-card flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Parking map</p>
            <span className="flex size-2 rounded-full bg-status-success animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground">
            {occupiedCount} of {totalSlots} in use · updated just now
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(STATUS_LABEL)
            .filter(([status]) => statusCounts[status])
            .map(([status, label]) => (
              <span
                key={status}
                className="flex items-center gap-1.5 rounded-full bg-card border border-border px-2.5 py-1 text-xs text-muted-foreground shadow-sm"
              >
                <span
                  className={`size-2 rounded-full border ${STATUS_COLOR[status].split(" ")[0]} ${STATUS_COLOR[status].split(" ")[1]}`}
                />
                {label} {statusCounts[status]}
              </span>
            ))}
          {zones.length > 1 && (
            <div className="flex items-center gap-1 rounded-full bg-muted p-1">
              <button
                type="button"
                onClick={() => setActiveZone("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeZone === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                All
              </button>
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setActiveZone(z.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeZone === z.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {z.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {visibleZones.map((zone) => (
          <div key={zone.id} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {zone.name} · {zone.slots.filter((s) => s.status === "occupied").length}/{zone.slots.length}
            </p>
            <div className="flex flex-wrap gap-2">
              {zone.slots.map((slot) => {
                const ticket = ticketBySlotId.get(slot.id);
                const colorClass = STATUS_COLOR[slot.status] ?? STATUS_COLOR.available;
                const filled = slot.status === "occupied" || slot.status === "reserved";
                const iconBg = STATUS_ICON_BG[slot.status];
                return (
                  <div
                    key={slot.id}
                    className={`flex min-w-16 flex-col items-center justify-center gap-1 rounded-lg border bg-card px-2 py-2 ${
                      filled ? colorClass.split(" ")[0] : `border-dashed ${colorClass.split(" ")[0]}`
                    }`}
                    title={STATUS_LABEL[slot.status] ?? slot.status}
                  >
                    {filled && iconBg && (
                      <span className={`flex size-6 items-center justify-center rounded-md ${iconBg}`}>
                        <Car className="size-3.5" />
                      </span>
                    )}
                    <span className="text-xs font-semibold">{slot.slot_number}</span>
                    {ticket ? (
                      <span className="text-[10px] leading-none">
                        <TicketTimelineDialog ticketId={ticket.id} vehicleNumber={ticket.vehicle_number} />
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[slot.status] ?? slot.status}</span>
                    )}
                  </div>
                );
              })}
              {!zone.slots.length && (
                <p className="text-xs text-muted-foreground">No slots in this zone.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
