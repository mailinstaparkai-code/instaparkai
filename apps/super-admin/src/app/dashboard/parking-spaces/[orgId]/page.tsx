import { notFound } from "next/navigation";
import { ParkingSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";
import { createParkingSpace, deleteParkingSpace } from "../actions";
import { Breadcrumb } from "../components/breadcrumb";
import { EntityCard } from "../components/entity-card";
import { FormDialog } from "../components/form-dialog";
import { ParkingSpaceFields } from "../components/parking-space-fields";

type SpaceRow = {
  id: string;
  name: string;
  type: string;
  timezone: string;
  valet_parking_enabled: boolean;
  zones: { id: string; slots: { count: number }[] }[];
};

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
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

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (!org) notFound();

  const { data: spaces } = await supabase
    .from("parking_spaces")
    .select("id, name, type, timezone, valet_parking_enabled, zones(id, slots(count))")
    .eq("organization_id", orgId)
    .order("name")
    .returns<SpaceRow[]>();

  const parkingAdminsBySite = new Map<string, { username: string }[]>();
  if (isSuperAdmin && spaces?.length) {
    const { data: admins } = await createServiceClient()
      .from("valet_accounts")
      .select("username, assigned_site_id")
      .eq("role", "parking_admin")
      .in(
        "assigned_site_id",
        spaces.map((s) => s.id)
      );
    for (const admin of admins ?? []) {
      const list = parkingAdminsBySite.get(admin.assigned_site_id) ?? [];
      list.push({ username: admin.username });
      parkingAdminsBySite.set(admin.assigned_site_id, list);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Breadcrumb
        items={[{ label: "Organizations", href: "/dashboard/parking-spaces" }, { label: org.name }]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{org.name}</h1>
          <p className="text-sm text-muted-foreground">Parking spaces in this organization.</p>
        </div>

        {isSuperAdmin && (
          <FormDialog
            trigger={<Button>+ New Parking Space</Button>}
            title="New parking space"
            action={createParkingSpace}
          >
            <input type="hidden" name="organization_id" value={org.id} />
            <ParkingSpaceFields />
          </FormDialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces?.map((space) => {
          const zoneCount = space.zones.length;
          const slotCount = space.zones.reduce((sum, z) => sum + (z.slots[0]?.count ?? 0), 0);
          const admins = parkingAdminsBySite.get(space.id) ?? [];

          const consequences: string[] = [];
          if (zoneCount > 0) {
            consequences.push(
              `${zoneCount} zone${zoneCount === 1 ? "" : "s"} and ${slotCount} slot${slotCount === 1 ? "" : "s"} will be deleted.`
            );
          }
          consequences.push("Its tariff rules and access workflow will be deleted.");
          for (const admin of admins) {
            consequences.push(`The Parking Admin login "${admin.username}" will be deleted.`);
          }

          return (
            <EntityCard
              key={space.id}
              href={`/dashboard/parking-spaces/${org.id}/${space.id}`}
              icon={<ParkingSquare />}
              title={space.name}
              meta={space.timezone}
              badges={[
                {
                  label: space.type,
                  className: "bg-status-warning/15 text-status-warning capitalize",
                },
                ...(space.valet_parking_enabled
                  ? [{ label: "Valet enabled", className: "bg-status-success/15 text-status-success" }]
                  : []),
              ]}
              stats={[
                { label: "Zones", value: zoneCount },
                { label: "Slots", value: slotCount },
              ]}
              deleteAction={deleteParkingSpace}
              deleteHiddenFields={{ id: space.id, organization_id: org.id }}
              deleteConsequences={consequences}
            />
          );
        })}
        {!spaces?.length && (
          <p className="text-sm text-muted-foreground">
            No parking spaces yet.
            {isSuperAdmin ? " Create one above to get started." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
