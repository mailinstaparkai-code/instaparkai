import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../../components/field";
import { FormDialog } from "../../../components/form-dialog";
import { DeleteButton } from "../../../components/delete-button";
import { createVehiclePass, deleteVehiclePass } from "../actions";

export function VehiclePassesTab({
  vehiclePasses,
}: {
  vehiclePasses: { id: string; vehicle_number: string; label: string | null }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Whitelisted vehicles always check out at ₹0 with no payment step — used by
          Direct Checkout mode's checkout flow.
        </p>
        <FormDialog
          trigger={<Button size="sm">+ Vehicle Pass</Button>}
          title="New vehicle pass"
          action={createVehiclePass}
          submitLabel="Add"
        >
          <Field label="Vehicle number">
            <Input name="vehicle_number" required placeholder="KA01AB1234" className="uppercase" />
          </Field>
          <Field label="Label (optional)">
            <Input name="label" placeholder="Staff car" />
          </Field>
        </FormDialog>
      </div>

      <div className="flex flex-col gap-2">
        {vehiclePasses.map((vp) => (
          <div key={vp.id} className="glass-card flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium font-numeric">{vp.vehicle_number}</p>
              {vp.label && <p className="text-xs text-muted-foreground">{vp.label}</p>}
            </div>
            <DeleteButton title={vp.vehicle_number} action={deleteVehiclePass} hiddenFields={{ id: vp.id }} />
          </div>
        ))}
        {!vehiclePasses.length && (
          <p className="text-sm text-muted-foreground">No vehicle passes yet.</p>
        )}
      </div>
    </div>
  );
}
