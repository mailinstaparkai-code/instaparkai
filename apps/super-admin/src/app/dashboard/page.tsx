import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, assigned_site_id")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-xl font-semibold">
          Insta<span className="text-brand-orange">Park</span> AI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Super Admin portal</p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{profile?.full_name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="rounded-full bg-status-success/15 px-3 py-0.5 font-medium text-status-success">
              {profile?.role}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Assigned site</dt>
            <dd>{profile?.assigned_site_id ?? "— (global access)"}</dd>
          </div>
        </dl>

        <form action={signOut} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
