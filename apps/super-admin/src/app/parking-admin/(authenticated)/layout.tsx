import { redirect } from "next/navigation";
import { getValetSession } from "@/lib/valet-auth/session";
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

  return (
    <AppShell
      nav="parking-admin"
      userLabel={session.fullName || session.username}
      userSubLabel="Parking Admin"
      signOutAction={logoutParkingAdmin}
    >
      {children}
    </AppShell>
  );
}
