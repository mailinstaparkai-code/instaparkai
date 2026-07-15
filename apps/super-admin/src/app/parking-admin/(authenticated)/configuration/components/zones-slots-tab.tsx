import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../../components/field";
import { FormDialog } from "../../../components/form-dialog";
import { DeleteButton } from "../../../components/delete-button";
import { createZone, createSlot, deleteZone, deleteSlot } from "../actions";

type Slot = {
  id: string;
  slot_number: string;
  is_ev: boolean;
  is_disabled_slot: boolean;
  status: string;
};

type Zone = {
  id: string;
  name: string;
  slots: Slot[];
};

export function ZonesSlotsTab({ zones }: { zones: Zone[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <FormDialog
          trigger={<Button size="sm">+ Zone</Button>}
          title="New zone"
          action={createZone}
          submitLabel="Create"
        >
          <Field label="Zone name">
            <Input name="name" required placeholder="Basement Level 1" />
          </Field>
        </FormDialog>
      </div>

      {zones.map((zone) => (
        <div key={zone.id} className="glass-card flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{zone.name}</p>
            <div className="flex items-center gap-2">
              <FormDialog
                trigger={
                  <Button variant="outline" size="sm">
                    + Slot
                  </Button>
                }
                title={`New slot in ${zone.name}`}
                action={createSlot}
                submitLabel="Create"
              >
                <input type="hidden" name="zone_id" value={zone.id} />
                <Field label="Slot number">
                  <Input name="slot_number" required placeholder="A-101" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_ev" />
                  EV charging
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_disabled_slot" />
                  Accessible slot
                </label>
              </FormDialog>
              <DeleteButton
                title={zone.name}
                action={deleteZone}
                hiddenFields={{ id: zone.id }}
                consequences={["All slots in this zone will be deleted too."]}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {zone.slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs"
              >
                <span className="font-medium">{slot.slot_number}</span>
                {slot.is_ev && <span className="text-status-info">EV</span>}
                {slot.is_disabled_slot && <span className="text-status-info">Accessible</span>}
                <form action={deleteSlot}>
                  <input type="hidden" name="id" value={slot.id} />
                  <button type="submit" className="text-muted-foreground hover:text-status-danger">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {!zone.slots.length && (
              <p className="text-xs text-muted-foreground">No slots in this zone yet.</p>
            )}
          </div>
        </div>
      ))}

      {!zones.length && (
        <p className="text-sm text-muted-foreground">No zones yet. Create one to add slots.</p>
      )}
    </div>
  );
}
