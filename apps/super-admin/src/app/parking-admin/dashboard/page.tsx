import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { Button } from "@/components/ui/button";
import { logoutParkingAdmin } from "./actions";

export default async function ParkingAdminDashboardPage() {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const supabase = createServiceClient();
  const { data: site } = await supabase
    .from("parking_spaces")
    .select("name, valet_parking_enabled")
    .eq("id", session.assignedSiteId)
    .single();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-xl font-semibold">
          Insta<span className="text-brand-orange">Park</span> AI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Parking Admin dashboard</p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Username</dt>
            <dd>{session.username}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{session.fullName ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="rounded-full bg-status-success/15 px-3 py-0.5 font-medium text-status-success">
              {session.role}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Site</dt>
            <dd>{site?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Valet parking</dt>
            <dd>{site?.valet_parking_enabled ? "Enabled" : "Disabled"}</dd>
          </div>
        </dl>

        <form action={logoutParkingAdmin} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
