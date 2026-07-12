import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ParkingSpaceFields({
  space,
}: {
  space?: {
    name: string;
    type: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    timezone: string;
    valet_parking_enabled: boolean;
  };
}) {
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
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="valet_parking_enabled"
          defaultChecked={space?.valet_parking_enabled}
        />
        Valet parking enabled
      </label>
    </>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
