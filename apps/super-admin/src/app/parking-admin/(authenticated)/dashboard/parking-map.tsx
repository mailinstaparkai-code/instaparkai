"use client";

import { useState } from "react";
import { TicketTimelineDialog } from "../queue/ticket-timeline-dialog";

type Slot = { id: string; slot_number: string; status: string };
type Zone = { id: string; name: string; slots: Slot[] };
type ParkedTicket = { id: string; slot_id: string | null; vehicle_number: string };

const STATUS_COLOR: Record<string, string> = {
  available: "border-status-success/40 bg-status-success/15 text-status-success slot-glow",
  occupied: "border-brand-orange/40 bg-brand-orange/15 text-brand-orange slot-glow",
  reserved: "border-status-info/40 bg-status-info/15 text-status-info slot-glow",
  out_of_service: "border-border bg-muted text-muted-foreground",
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
  const totalSlots = zones.reduce((sum, z) => sum + z.slots.length, 0);

  if (!totalSlots) {
    return null;
  }

  return (
    <div className="metric-card flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Parking map</p>
          <p className="text-xs text-muted-foreground">Live slot-wise availability</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(STATUS_LABEL).map(([status, label]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className={`size-2.5 rounded-full border ${STATUS_COLOR[status].split(" ")[0]} ${STATUS_COLOR[status].split(" ")[1]}`}
                />
                {label}
              </span>
            ))}
          </div>
          {zones.length > 1 && (
            <select
              value={activeZone}
              onChange={(e) => setActiveZone(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {visibleZones.map((zone) => (
          <div key={zone.id} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{zone.name}</p>
            <div className="flex flex-wrap gap-2">
              {zone.slots.map((slot) => {
                const ticket = ticketBySlotId.get(slot.id);
                const colorClass = STATUS_COLOR[slot.status] ?? STATUS_COLOR.available;
                return (
                  <div
                    key={slot.id}
                    className={`flex min-w-16 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 ${colorClass}`}
                    title={STATUS_LABEL[slot.status] ?? slot.status}
                  >
                    <span className="text-xs font-medium">{slot.slot_number}</span>
                    {ticket ? (
                      <TicketTimelineDialog ticketId={ticket.id} vehicleNumber={ticket.vehicle_number} />
                    ) : (
                      <span className="text-[10px]">{STATUS_LABEL[slot.status] ?? slot.status}</span>
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
