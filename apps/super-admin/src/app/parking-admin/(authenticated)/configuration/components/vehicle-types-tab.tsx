import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../../components/field";
import { FormDialog } from "../../../components/form-dialog";
import { DeleteButton } from "../../../components/delete-button";
import { createVehicleType, deleteVehicleType } from "../actions";

export function VehicleTypesTab({
  vehicleTypes,
}: {
  vehicleTypes: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          These appear in the check-in form&apos;s vehicle type dropdown.
        </p>
        <FormDialog
          trigger={<Button size="sm">+ Vehicle Type</Button>}
          title="New vehicle type"
          action={createVehicleType}
          submitLabel="Create"
        >
          <Field label="Name">
            <Input name="name" required placeholder="4-Wheeler" />
          </Field>
        </FormDialog>
      </div>

      <div className="flex flex-col gap-2">
        {vehicleTypes.map((vt) => (
          <div key={vt.id} className="glass-card flex items-center justify-between p-4">
            <p className="text-sm font-medium">{vt.name}</p>
            <DeleteButton title={vt.name} action={deleteVehicleType} hiddenFields={{ id: vt.id }} />
          </div>
        ))}
        {!vehicleTypes.length && (
          <p className="text-sm text-muted-foreground">No vehicle types yet.</p>
        )}
      </div>
    </div>
  );
}
