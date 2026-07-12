import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single();

  return (
    <AppShell
      nav="super-admin"
      userLabel={profile?.full_name || user?.email || "Account"}
      userSubLabel={profile?.role}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
