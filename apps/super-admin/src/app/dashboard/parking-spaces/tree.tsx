import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createParkingSpace, createSlot, createZone } from "./actions";
import type { Organization, ParkingSpace, Slot, Zone } from "./types";

const statusStyles: Record<Slot["status"], string> = {
  available: "bg-status-success/15 text-status-success",
  occupied: "bg-status-danger/15 text-status-danger",
  reserved: "bg-status-warning/15 text-status-warning",
  out_of_service: "bg-muted text-muted-foreground",
};

export function OrganizationNode({
  org,
  isSuperAdmin,
}: {
  org: Organization;
  isSuperAdmin: boolean;
}) {
  return (
    <details className="glass-card p-4" open>
      <summary className="cursor-pointer font-medium">{org.name}</summary>

      <div className="mt-3 flex flex-col gap-3 border-l border-border pl-4">
        {org.parking_spaces.map((space) => (
          <ParkingSpaceNode key={space.id} space={space} isSuperAdmin={isSuperAdmin} />
        ))}
        {!org.parking_spaces.length && (
          <p className="text-sm text-muted-foreground">No parking spaces yet.</p>
        )}

        {isSuperAdmin && (
          <details className="rounded-lg border border-dashed border-border p-3">
            <summary className="cursor-pointer text-sm text-brand-orange">
              + New parking space
            </summary>
            <form action={createParkingSpace} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="organization_id" value={org.id} />
              <Field label="Name">
                <Input name="name" required />
              </Field>
              <Field label="Type">
                <select
                  name="type"
                  required
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="corporate">Corporate</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              <Field label="Address">
                <Input name="address" />
              </Field>
              <Field label="Timezone">
                <Input name="timezone" defaultValue="UTC" />
              </Field>
              <Button type="submit" size="sm" className="self-start">
                Create
              </Button>
            </form>
          </details>
        )}
      </div>
    </details>
  );
}

function ParkingSpaceNode({
  space,
  isSuperAdmin,
}: {
  space: ParkingSpace;
  isSuperAdmin: boolean;
}) {
  return (
    <details className="rounded-2xl border border-border bg-card p-3">
      <summary className="cursor-pointer">
        <span className="font-medium">{space.name}</span>{" "}
        <span className="text-xs text-muted-foreground">
          {space.type} · {space.timezone}
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-3 border-l border-border pl-4">
        {space.zones.map((zone) => (
          <ZoneNode key={zone.id} zone={zone} isSuperAdmin={isSuperAdmin} />
        ))}
        {!space.zones.length && (
          <p className="text-sm text-muted-foreground">No zones yet.</p>
        )}

        {isSuperAdmin && (
          <details className="rounded-lg border border-dashed border-border p-3">
            <summary className="cursor-pointer text-sm text-brand-orange">+ New zone</summary>
            <form action={createZone} className="mt-3 flex items-end gap-2">
              <input type="hidden" name="parking_space_id" value={space.id} />
              <Field label="Name">
                <Input name="name" required placeholder="Level 2" />
              </Field>
              <Button type="submit" size="sm">
                Create
              </Button>
            </form>
          </details>
        )}
      </div>
    </details>
  );
}

function ZoneNode({ zone, isSuperAdmin }: { zone: Zone; isSuperAdmin: boolean }) {
  return (
    <details className="rounded-xl border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">{zone.name}</summary>

      <div className="mt-3 flex flex-col gap-3 border-l border-border pl-4">
        {zone.slots.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {zone.slots.map((slot) => (
              <li
                key={slot.id}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusStyles[slot.status]}`}
              >
                {slot.slot_number}
                {slot.is_ev && <span title="EV slot">⚡</span>}
                {slot.is_disabled_slot && <span title="Accessible slot">♿</span>}
              </li>
            ))}
          </ul>
        )}
        {!zone.slots.length && (
          <p className="text-sm text-muted-foreground">No slots yet.</p>
        )}

        {isSuperAdmin && (
          <details className="rounded-lg border border-dashed border-border p-3">
            <summary className="cursor-pointer text-sm text-brand-orange">+ New slot</summary>
            <form action={createSlot} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="zone_id" value={zone.id} />
              <Field label="Slot number">
                <Input name="slot_number" required placeholder="P-102" />
              </Field>
              <Field label="Category">
                <select
                  name="category"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="regular"
                >
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_ev" /> EV slot
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_disabled_slot" /> Accessible slot
              </label>
              <Button type="submit" size="sm" className="self-start">
                Create
              </Button>
            </form>
          </details>
        )}
      </div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
