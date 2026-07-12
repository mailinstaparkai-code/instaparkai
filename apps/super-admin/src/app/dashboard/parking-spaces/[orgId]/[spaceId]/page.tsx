import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createParkingAdmin,
  createTariffRule,
  createZone,
  deleteParkingSpace,
  deleteZone,
  setAccessWorkflow,
  updateParkingSpace,
} from "../../actions";
import { Breadcrumb } from "../../components/breadcrumb";
import { DeleteButton } from "../../components/delete-button";
import { EntityCard } from "../../components/entity-card";
import { FormDialog } from "../../components/form-dialog";
import { Field, ParkingSpaceFields } from "../../components/parking-space-fields";
import type { AccessMethod } from "../../types";

const methodLabels: Record<AccessMethod, string> = {
  anpr: "ANPR",
  rfid: "RFID",
  hid: "HID card",
};

type SpaceDetail = {
  id: string;
  name: string;
  type: "corporate" | "commercial" | "industrial" | "hybrid";
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  valet_parking_enabled: boolean;
  organization_id: string;
  organizations: { name: string } | null;
  access_workflows: { id: string; methods: AccessMethod[] } | null;
  tariff_rules: {
    id: string;
    vehicle_category: string;
    pricing_type: "flat" | "hourly" | "surge";
    rate: number;
    surge_multiplier: number | null;
  }[];
  zones: { id: string; name: string; slots: { count: number }[] }[];
};

export default async function ParkingSpaceDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; spaceId: string }>;
}) {
  const { orgId, spaceId } = await params;
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

  const { data: space } = await supabase
    .from("parking_spaces")
    .select(
      "id, name, type, address, latitude, longitude, timezone, valet_parking_enabled, organization_id, " +
        "organizations(name), " +
        "access_workflows(id, methods), " +
        "tariff_rules(id, vehicle_category, pricing_type, rate, surge_multiplier), " +
        "zones(id, name, slots(count))"
    )
    .eq("id", spaceId)
    .single<SpaceDetail>();

  if (!space || space.organization_id !== orgId) notFound();

  let parkingAdmins: { id: string; username: string; full_name: string | null }[] = [];
  if (isSuperAdmin) {
    const { data } = await createServiceClient()
      .from("valet_accounts")
      .select("id, username, full_name")
      .eq("role", "parking_admin")
      .eq("assigned_site_id", space.id);
    parkingAdmins = data ?? [];
  }

  const workflow = space.access_workflows;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Organizations", href: "/dashboard/parking-spaces" },
          { label: space.organizations?.name ?? "Organization", href: `/dashboard/parking-spaces/${orgId}` },
          { label: space.name },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{space.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {space.type} · {space.timezone}
            {space.valet_parking_enabled && (
              <span className="ml-2 rounded-full bg-status-success/15 px-2 py-0.5 text-xs font-medium text-status-success normal-case">
                Valet enabled
              </span>
            )}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <FormDialog
              trigger={<Button variant="outline" size="sm">Edit</Button>}
              title="Edit site profile"
              action={updateParkingSpace}
            >
              <input type="hidden" name="id" value={space.id} />
              <ParkingSpaceFields space={space} />
            </FormDialog>

            <DeleteButton
              title={space.name}
              action={deleteParkingSpace}
              hiddenFields={{ id: space.id, organization_id: orgId }}
              consequences={[
                ...(space.zones.length
                  ? [
                      `${space.zones.length} zone${space.zones.length === 1 ? "" : "s"} and ${space.zones.reduce((n, z) => n + (z.slots[0]?.count ?? 0), 0)} slot(s) will be deleted.`,
                    ]
                  : []),
                "Its tariff rules and access workflow will be deleted.",
                ...parkingAdmins.map((a) => `The Parking Admin login "${a.username}" will be deleted.`),
              ]}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Access workflow</p>
            {isSuperAdmin && (
              <FormDialog
                trigger={
                  <button className="text-xs text-brand-orange">
                    {workflow ? "Edit" : "Set up"}
                  </button>
                }
                title="Access workflow"
                action={setAccessWorkflow}
              >
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
              </FormDialog>
            )}
          </div>
          {workflow ? (
            <ol className="mt-2 flex flex-wrap items-center gap-1 text-sm">
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
            <p className="mt-2 text-sm text-muted-foreground">Not configured.</p>
          )}
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Tariff rules</p>
            {isSuperAdmin && (
              <FormDialog
                trigger={<button className="text-xs text-brand-orange">+ New</button>}
                title="New tariff rule"
                action={createTariffRule}
                submitLabel="Create"
              >
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
              </FormDialog>
            )}
          </div>
          {space.tariff_rules.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
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
            <p className="mt-2 text-sm text-muted-foreground">No tariff rules yet.</p>
          )}
        </div>

        {space.valet_parking_enabled && isSuperAdmin && (
          <div className="glass-card p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Parking admin</p>
              <FormDialog
                trigger={<button className="text-xs text-brand-orange">+ New</button>}
                title="New parking admin"
                action={createParkingAdmin}
                submitLabel="Create"
              >
                <input type="hidden" name="parking_space_id" value={space.id} />
                <Field label="Username">
                  <Input name="username" required />
                </Field>
                <Field label="Password">
                  <Input name="password" type="password" required />
                </Field>
                <Field label="Full name">
                  <Input name="full_name" />
                </Field>
              </FormDialog>
            </div>
            {parkingAdmins.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {parkingAdmins.map((admin) => (
                  <li key={admin.id}>
                    {admin.username}
                    {admin.full_name && (
                      <span className="text-muted-foreground"> ({admin.full_name})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No parking admin yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Zones</h2>
        {isSuperAdmin && (
          <FormDialog
            trigger={<Button size="sm">+ New Zone</Button>}
            title="New zone"
            action={createZone}
            submitLabel="Create"
          >
            <input type="hidden" name="parking_space_id" value={space.id} />
            <Field label="Name">
              <Input name="name" required placeholder="Level 2" />
            </Field>
          </FormDialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {space.zones.map((zone) => (
          <EntityCard
            key={zone.id}
            href={`/dashboard/parking-spaces/${orgId}/${space.id}/${zone.id}`}
            icon={<Layers />}
            title={zone.name}
            stats={[{ label: "Slots", value: zone.slots[0]?.count ?? 0 }]}
            deleteAction={deleteZone}
            deleteHiddenFields={{ id: zone.id, organization_id: orgId, parking_space_id: space.id }}
            deleteConsequences={
              (zone.slots[0]?.count ?? 0) > 0
                ? [`${zone.slots[0]!.count} slot(s) will be deleted.`]
                : []
            }
          />
        ))}
        {!space.zones.length && (
          <p className="text-sm text-muted-foreground">No zones yet.</p>
        )}
      </div>
    </div>
  );
}
