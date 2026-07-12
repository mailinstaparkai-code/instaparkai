import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createParkingSpace,
  createSlot,
  createTariffRule,
  createZone,
  setAccessWorkflow,
  updateParkingSpace,
} from "./actions";
import type { AccessMethod, Organization, ParkingSpace, Slot, Zone } from "./types";

const statusStyles: Record<Slot["status"], string> = {
  available: "bg-status-success/15 text-status-success",
  occupied: "bg-status-danger/15 text-status-danger",
  reserved: "bg-status-warning/15 text-status-warning",
  out_of_service: "bg-muted text-muted-foreground",
};

const methodLabels: Record<AccessMethod, string> = {
  anpr: "ANPR",
  rfid: "RFID",
  hid: "HID card",
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
              <ParkingSpaceFields />
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

function ParkingSpaceFields({ space }: { space?: ParkingSpace }) {
  return (
    <>
      <Field label="Name">
        <Input name="name" required defaultValue={space?.name} />
      </Field>
      <Field label="Type">
        <select
          name="type"
          required
          defaultValue={space?.type ?? "corporate"}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="corporate">Corporate</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </Field>
      <Field label="Address">
        <Input name="address" defaultValue={space?.address ?? undefined} />
      </Field>
      <div className="flex gap-2">
        <Field label="Latitude">
          <Input
            name="latitude"
            type="number"
            step="any"
            defaultValue={space?.latitude ?? undefined}
          />
        </Field>
        <Field label="Longitude">
          <Input
            name="longitude"
            type="number"
            step="any"
            defaultValue={space?.longitude ?? undefined}
          />
        </Field>
      </div>
      <Field label="Timezone">
        <Input name="timezone" defaultValue={space?.timezone ?? "UTC"} />
      </Field>
    </>
  );
}

function ParkingSpaceNode({
  space,
  isSuperAdmin,
}: {
  space: ParkingSpace;
  isSuperAdmin: boolean;
}) {
  const workflow = space.access_workflows;

  return (
    <details className="rounded-2xl border border-border bg-card p-3">
      <summary className="cursor-pointer">
        <span className="font-medium">{space.name}</span>{" "}
        <span className="text-xs text-muted-foreground">
          {space.type} · {space.timezone}
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-4 border-l border-border pl-4">
        {isSuperAdmin && (
          <details className="rounded-lg border border-dashed border-border p-3">
            <summary className="cursor-pointer text-sm text-brand-orange">
              Edit site profile
            </summary>
            <form action={updateParkingSpace} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={space.id} />
              <ParkingSpaceFields space={space} />
              <Button type="submit" size="sm" className="self-start">
                Save
              </Button>
            </form>
          </details>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground">Access workflow</p>
          {workflow ? (
            <ol className="mt-1 flex flex-wrap items-center gap-1 text-xs">
              {workflow.methods.map((method, i) => (
                <span key={method} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground">→</span>}
                  <span className="rounded-full bg-status-info/15 px-2 py-0.5 font-medium text-status-info">
                    {methodLabels[method]}
                  </span>
                </span>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Not configured.</p>
          )}

          {isSuperAdmin && (
            <details className="mt-2 rounded-lg border border-dashed border-border p-3">
              <summary className="cursor-pointer text-sm text-brand-orange">
                {workflow ? "Edit" : "+ Set"} access workflow
              </summary>
              <form action={setAccessWorkflow} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="parking_space_id" value={space.id} />
                <Field label="Primary method">
                  <select
                    name="primary_method"
                    required
                    defaultValue={workflow?.methods[0] ?? "anpr"}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="anpr">ANPR</option>
                    <option value="rfid">RFID</option>
                    <option value="hid">HID card</option>
                  </select>
                </Field>
                <Field label="Fallback method">
                  <select
                    name="fallback_method"
                    defaultValue={workflow?.methods[1] ?? ""}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">None</option>
                    <option value="anpr">ANPR</option>
                    <option value="rfid">RFID</option>
                    <option value="hid">HID card</option>
                  </select>
                </Field>
                <Button type="submit" size="sm">
                  Save
                </Button>
              </form>
            </details>
          )}
        </div>

        <TariffRules space={space} isSuperAdmin={isSuperAdmin} />

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

function TariffRules({ space, isSuperAdmin }: { space: ParkingSpace; isSuperAdmin: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Tariff rules</p>
      {space.tariff_rules.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          {space.tariff_rules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-2">
              <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-xs font-medium text-status-warning">
                {rule.vehicle_category}
              </span>
              <span className="text-muted-foreground">{rule.pricing_type}</span>
              <span className="font-numeric">₹{rule.rate}</span>
              {rule.pricing_type === "surge" && rule.surge_multiplier && (
                <span className="text-muted-foreground">× {rule.surge_multiplier}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No tariff rules yet.</p>
      )}

      {isSuperAdmin && (
        <details className="mt-2 rounded-lg border border-dashed border-border p-3">
          <summary className="cursor-pointer text-sm text-brand-orange">
            + New tariff rule
          </summary>
          <form action={createTariffRule} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="parking_space_id" value={space.id} />
            <Field label="Vehicle category">
              <Input name="vehicle_category" defaultValue="car" placeholder="car" />
            </Field>
            <Field label="Pricing type">
              <select
                name="pricing_type"
                defaultValue="hourly"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="flat">Flat</option>
                <option value="hourly">Hourly</option>
                <option value="surge">Surge</option>
              </select>
            </Field>
            <Field label="Rate (₹)">
              <Input name="rate" type="number" step="0.01" required />
            </Field>
            <Field label="Surge multiplier (surge only)">
              <Input name="surge_multiplier" type="number" step="0.01" />
            </Field>
            <Button type="submit" size="sm" className="self-start">
              Create
            </Button>
          </form>
        </details>
      )}
    </div>
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
