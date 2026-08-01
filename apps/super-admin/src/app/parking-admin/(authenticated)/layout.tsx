import { redirect } from "next/navigation";
import { getValetSession } from "@/lib/valet-auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { AppShell } from "@/components/shell/app-shell";
import { logoutParkingAdmin } from "./actions";

export default async function ParkingAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const isOperator = session.role === "valet_operator";

  let sites: { id: string; name: string }[] | undefined;
  if (!isOperator && session.accessibleSiteIds.length > 1) {
    const { data } = await createServiceClient()
      .from("parking_spaces")
      .select("id, name")
      .in("id", session.accessibleSiteIds)
      .order("name");
    sites = data ?? [];
  }

  return (
    <AppShell
      nav={isOperator ? "valet-operator" : "parking-admin"}
      userLabel={session.fullName || session.username}
      userSubLabel={isOperator ? "Valet Operator" : "Parking Admin"}
      signOutAction={logoutParkingAdmin}
      sites={sites}
      currentSiteId={session.currentSiteId}
    >
      {children}
    </AppShell>
  );
}
