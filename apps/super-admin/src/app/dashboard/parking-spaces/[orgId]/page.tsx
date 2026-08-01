import { notFound } from "next/navigation";
import { ParkingSquare, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createParkingSpace, deleteParkingSpace, assignOrganizationPlan } from "../actions";
import {
  createParkingAdminAccount,
  updateParkingAdminSites,
  deleteParkingAdminAccount,
} from "../parking-admin-actions";
import { Breadcrumb } from "../components/breadcrumb";
import { EntityCard } from "../components/entity-card";
import { FormDialog } from "../components/form-dialog";
import { DeleteButton } from "../components/delete-button";
import { Field, ParkingSpaceFields } from "../components/parking-space-fields";

type SpaceRow = {
  id: string;
  name: string;
  type: string;
  timezone: string;
  valet_parking_enabled: boolean;
  zones: { id: string; slots: { count: number }[] }[];
};

type PlanOption = { id: string; name: string; max_locations: number };

type AdminRow = { id: string; username: string; full_name: string | null; site_ids: string[] };

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
    .select("id, name, subscription_plan_id, subscription_plans(id, name, max_locations)")
    .eq("id", orgId)
    .single<{
      id: string;
      name: string;
      subscription_plan_id: string | null;
      subscription_plans: PlanOption | null;
    }>();

  if (!org) notFound();

  const { data: spaces } = await supabase
    .from("parking_spaces")
    .select("id, name, type, timezone, valet_parking_enabled, zones(id, slots(count))")
    .eq("organization_id", orgId)
    .order("name")
    .returns<SpaceRow[]>();

  const siteCount = spaces?.length ?? 0;
  const valetSites = (spaces ?? []).filter((s) => s.valet_parking_enabled);

  let plans: PlanOption[] = [];
  let admins: AdminRow[] = [];
  // parking_admin accounts may now be assigned to more than one site
  // (valet_admin_sites), so this reads through that join table rather than
  // the account's single assigned_site_id.
  const parkingAdminsBySite = new Map<string, { username: string; onlyThisSite: boolean }[]>();

  if (isSuperAdmin) {
    const { data: planRows } = await supabase
      .from("subscription_plans")
      .select("id, name, max_locations")
      .eq("is_active", true)
      .order("max_locations");
    plans = planRows ?? [];

    if (spaces?.length) {
      const { data: memberships } = await createServiceClient()
        .from("valet_admin_sites")
        .select("site_id, valet_accounts(id, username, full_name)")
        .in(
          "site_id",
          spaces.map((s) => s.id)
        );

      const adminsById = new Map<string, AdminRow>();
      for (const m of memberships ?? []) {
        const acct = m.valet_accounts as unknown as {
          id: string;
          username: string;
          full_name: string | null;
        } | null;
        if (!acct) continue;
        const entry = adminsById.get(acct.id) ?? {
          id: acct.id,
          username: acct.username,
          full_name: acct.full_name,
          site_ids: [],
        };
        entry.site_ids.push(m.site_id);
        adminsById.set(acct.id, entry);
      }
      admins = [...adminsById.values()].sort((a, b) => a.username.localeCompare(b.username));

      for (const admin of admins) {
        for (const siteId of admin.site_ids) {
          const list = parkingAdminsBySite.get(siteId) ?? [];
          list.push({ username: admin.username, onlyThisSite: admin.site_ids.length <= 1 });
          parkingAdminsBySite.set(siteId, list);
        }
      }
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
          <p className="text-sm text-muted-foreground">
            Parking spaces in this organization.
            {org.subscription_plans && (
              <span className="ml-1">
                {org.subscription_plans.name} plan -- {siteCount}/{org.subscription_plans.max_locations}{" "}
                sites used.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <FormDialog
              trigger={
                <Button variant="outline">
                  {org.subscription_plans ? "Manage subscription" : "Assign plan"}
                </Button>
              }
              title="Manage subscription"
              action={assignOrganizationPlan}
            >
              <input type="hidden" name="organization_id" value={org.id} />
              <Field label="Plan">
                <select
                  name="subscription_plan_id"
                  defaultValue={org.subscription_plan_id ?? ""}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No plan (uncapped)</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} -- up to {plan.max_locations} sites
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-muted-foreground">
                Currently using {siteCount} site{siteCount === 1 ? "" : "s"}.
              </p>
            </FormDialog>
          )}
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces?.map((space) => {
          const zoneCount = space.zones.length;
          const slotCount = space.zones.reduce((sum, z) => sum + (z.slots[0]?.count ?? 0), 0);
          const spaceAdmins = parkingAdminsBySite.get(space.id) ?? [];

          const consequences: string[] = [];
          if (zoneCount > 0) {
            consequences.push(
              `${zoneCount} zone${zoneCount === 1 ? "" : "s"} and ${slotCount} slot${slotCount === 1 ? "" : "s"} will be deleted.`
            );
          }
          consequences.push("Its tariff rules and access workflow will be deleted.");
          for (const admin of spaceAdmins) {
            consequences.push(
              admin.onlyThisSite
                ? `The Parking Admin login "${admin.username}" will be deleted.`
                : `"${admin.username}" will lose access to this site (they still manage other sites).`
            );
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

      {isSuperAdmin && valetSites.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Parking admins</p>
            </div>
            <FormDialog
              trigger={<Button size="sm">+ New parking admin</Button>}
              title="New parking admin"
              action={createParkingAdminAccount}
              submitLabel="Create"
            >
              <input type="hidden" name="organization_id" value={org.id} />
              <Field label="Username">
                <Input name="username" required />
              </Field>
              <Field label="Password">
                <Input name="password" type="password" required />
              </Field>
              <Field label="Full name">
                <Input name="full_name" />
              </Field>
              <Field label="Sites they manage">
                <div className="flex flex-col gap-1.5 rounded-md border border-input p-2">
                  {valetSites.map((site) => (
                    <label key={site.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="site_ids" value={site.id} />
                      {site.name}
                    </label>
                  ))}
                </div>
              </Field>
            </FormDialog>
          </div>

          {admins.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {admins.map((admin) => (
                <li
                  key={admin.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{admin.username}</span>
                    {admin.full_name && (
                      <span className="text-muted-foreground"> ({admin.full_name})</span>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {admin.site_ids.map((siteId) => (
                        <span
                          key={siteId}
                          className="rounded-full bg-blue-tint px-2 py-0.5 text-xs font-medium text-brand-blue-deep"
                        >
                          {valetSites.find((s) => s.id === siteId)?.name ?? "Unknown site"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FormDialog
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit sites
                        </Button>
                      }
                      title={`Sites managed by ${admin.username}`}
                      action={updateParkingAdminSites}
                    >
                      <input type="hidden" name="account_id" value={admin.id} />
                      <input type="hidden" name="organization_id" value={org.id} />
                      <div className="flex flex-col gap-1.5 rounded-md border border-input p-2">
                        {valetSites.map((site) => (
                          <label key={site.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="site_ids"
                              value={site.id}
                              defaultChecked={admin.site_ids.includes(site.id)}
                            />
                            {site.name}
                          </label>
                        ))}
                      </div>
                    </FormDialog>
                    <DeleteButton
                      title={admin.username}
                      action={deleteParkingAdminAccount}
                      hiddenFields={{ account_id: admin.id, organization_id: org.id }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No parking admins yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
