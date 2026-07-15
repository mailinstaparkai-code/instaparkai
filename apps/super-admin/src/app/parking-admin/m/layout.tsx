import { redirect } from "next/navigation";
import { getValetSession } from "@/lib/valet-auth/session";
import { MobileAppShell } from "@/components/shell/mobile-app-shell";

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  return (
    <MobileAppShell userLabel={session.fullName || session.username}>{children}</MobileAppShell>
  );
}
