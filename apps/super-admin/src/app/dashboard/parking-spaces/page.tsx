import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization, deleteOrganization } from "./actions";
import { EntityCard } from "./components/entity-card";
import { FormDialog } from "./components/form-dialog";

type OrgRow = {
  id: string;
  name: string;
  parking_spaces: { count: number }[];
};

export default async function ParkingSpacesPage() {
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

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, parking_spaces(count)")
    .order("name")
    .returns<OrgRow[]>();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parking Spaces</h1>
          <p className="text-sm text-muted-foreground">
            Organizations managing parking sites on InstaPark AI.
          </p>
        </div>

        {isSuperAdmin && (
          <FormDialog
            trigger={<Button>+ New Organization</Button>}
            title="New organization"
            action={createOrganization}
          >
            <div className="flex flex-col gap-1">
              <Label>Name</Label>
              <Input name="name" required />
            </div>
          </FormDialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations?.map((org) => {
          const spaceCount = org.parking_spaces[0]?.count ?? 0;
          return (
            <EntityCard
              key={org.id}
              href={`/dashboard/parking-spaces/${org.id}`}
              icon={<Building2 />}
              title={org.name}
              stats={[{ label: "Parking Spaces", value: spaceCount }]}
              deleteAction={deleteOrganization}
              deleteHiddenFields={{ id: org.id }}
              deleteConsequences={
                spaceCount > 0
                  ? [
                      `${spaceCount} parking space${spaceCount === 1 ? "" : "s"} and everything under them (zones, slots, tariff rules, access workflows, and any Parking Admin logins) will be deleted.`,
                    ]
                  : []
              }
            />
          );
        })}
        {!organizations?.length && (
          <p className="text-sm text-muted-foreground">
            No organizations yet.
            {isSuperAdmin ? " Create one above to get started." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
