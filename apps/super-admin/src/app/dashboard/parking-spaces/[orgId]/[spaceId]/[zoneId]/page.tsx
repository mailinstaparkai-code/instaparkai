import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSlot, deleteSlot, deleteZone } from "../../../actions";
import { Breadcrumb } from "../../../components/breadcrumb";
import { DeleteButton } from "../../../components/delete-button";
import { FormDialog } from "../../../components/form-dialog";
import { Field } from "../../../components/parking-space-fields";
import { SlotChip } from "../../../components/slot-chip";
import type { Slot } from "../../../types";

type ZoneDetail = {
  id: string;
  name: string;
  parking_space_id: string;
  parking_spaces: {
    name: string;
    organization_id: string;
    organizations: { name: string } | null;
  } | null;
  slots: Slot[];
};

export default async function ZoneDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; spaceId: string; zoneId: string }>;
}) {
  const { orgId, spaceId, zoneId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";

  const { data: zone } = await supabase
    .from("zones")
    .select(
      "id, name, parking_space_id, " +
        "parking_spaces(name, organization_id, organizations(name)), " +
        "slots(id, slot_number, category, is_ev, is_disabled_slot, status)"
    )
    .eq("id", zoneId)
    .single<ZoneDetail>();

  if (!zone || zone.parking_space_id !== spaceId || zone.parking_spaces?.organization_id !== orgId) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Organizations", href: "/dashboard/parking-spaces" },
          { label: zone.parking_spaces?.organizations?.name ?? "Organization", href: `/dashboard/parking-spaces/${orgId}` },
          { label: zone.parking_spaces?.name ?? "Parking Space", href: `/dashboard/parking-spaces/${orgId}/${spaceId}` },
          { label: zone.name },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{zone.name}</h1>
          <p className="text-sm text-muted-foreground">{zone.slots.length} slot(s)</p>
        </div>

        {isSuperAdmin && (
          <DeleteButton
            title={zone.name}
            action={deleteZone}
            hiddenFields={{ id: zone.id, organization_id: orgId, parking_space_id: spaceId }}
            consequences={
              zone.slots.length > 0 ? [`${zone.slots.length} slot(s) will be deleted.`] : []
            }
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Slots</h2>
        {isSuperAdmin && (
          <FormDialog
            trigger={<Button size="sm">+ New Slot</Button>}
            title="New slot"
            action={createSlot}
            submitLabel="Create"
          >
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
          </FormDialog>
        )}
      </div>

      <div className="glass-card flex flex-wrap gap-2 p-4">
        {zone.slots.map((slot) => (
          <SlotChip
            key={slot.id}
            slot={slot}
            action={deleteSlot}
            hiddenFields={{
              id: slot.id,
              organization_id: orgId,
              parking_space_id: spaceId,
              zone_id: zone.id,
            }}
          />
        ))}
        {!zone.slots.length && (
          <p className="text-sm text-muted-foreground">No slots yet.</p>
        )}
      </div>
    </div>
  );
}
