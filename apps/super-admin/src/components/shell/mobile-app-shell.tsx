"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, Car, User } from "lucide-react";
import { NotificationsBell } from "./notifications-bell";

const TABS = [
  { label: "Home", href: "/parking-admin/m/dashboard", icon: LayoutDashboard },
  { label: "Queue", href: "/parking-admin/m/queue", icon: ListOrdered },
  { label: "Vehicles", href: "/parking-admin/m/vehicles", icon: Car },
  { label: "Profile", href: "/parking-admin/m/profile", icon: User },
];

export function MobileAppShell({
  userLabel,
  children,
}: {
  userLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="pa-scope flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
        <span className="text-base font-semibold">
          Insta<span className="text-brand-orange">Park</span> AI
        </span>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-orange text-sm font-medium text-white">
            {userLabel.slice(0, 1).toUpperCase()}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 py-2 text-xs ${
                  active ? "text-brand-orange" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
