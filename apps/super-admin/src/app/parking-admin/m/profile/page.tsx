import { redirect } from "next/navigation";
import Link from "next/link";
import { getValetSession } from "@/lib/valet-auth/session";
import { Button } from "@/components/ui/button";
import { LogOut, Monitor } from "lucide-react";
import { logoutParkingAdmin } from "../../(authenticated)/actions";

const ROLE_LABEL: Record<string, string> = {
  parking_admin: "Parking Admin",
  valet_operator: "Valet Operator",
};

export default async function MobileProfilePage() {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Profile</h1>

      <div className="glass-card flex items-center gap-3 p-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-brand-blue text-lg font-medium text-white">
          {(session.fullName || session.username).slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="font-medium">{session.fullName || session.username}</p>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[session.role]}</p>
        </div>
      </div>

      <Link
        href="/parking-admin/dashboard"
        className="glass-card flex items-center gap-3 p-4 text-sm font-medium"
      >
        <Monitor className="size-4" />
        Switch to desktop view
      </Link>

      <form action={logoutParkingAdmin}>
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
