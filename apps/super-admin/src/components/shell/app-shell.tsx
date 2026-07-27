"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Sparkles, Bell, Sun, Moon, LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { superAdminNav, parkingAdminNav, valetOperatorNav } from "./nav-config";
import { NotificationsBell } from "./notifications-bell";
import { CommandPalette } from "@/app/parking-admin/components/command-palette";

export function AppShell({
  nav,
  userLabel,
  userSubLabel,
  signOutAction,
  children,
}: {
  nav: "super-admin" | "parking-admin" | "valet-operator";
  userLabel: string;
  userSubLabel?: string;
  signOutAction: () => void;
  children: React.ReactNode;
}) {
  const navItems =
    nav === "super-admin" ? superAdminNav : nav === "valet-operator" ? valetOperatorNav : parkingAdminNav;
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // The dark SaaS revamp (gradient sidebar, glass topbar, glowing active pill) is
  // scoped to the parking-admin/valet-operator surfaces only -- Super Admin keeps
  // the base design.md look. See globals.css's ".pa-scope" block.
  const isParkingSurface = nav !== "super-admin";

  return (
    <div className={`flex min-h-dvh bg-background text-foreground ${isParkingSurface ? "pa-scope" : ""}`}>
      {drawerOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 -translate-x-full border-r border-border p-4 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:w-16 lg:translate-x-0 lg:p-2 xl:w-64 xl:p-4 ${
          isParkingSurface ? "bg-sidebar pa-sidebar-gradient" : "bg-sidebar"
        } ${drawerOpen ? "translate-x-0" : ""}`}
      >
        {/* Full label at xl+ (1280px); collapses to an icon-only rail between 1024
            and 1280 (design.md §5: "collapses to icon-only under 1280px"). */}
        <div className="flex items-center justify-between px-2 lg:justify-center xl:justify-between">
          {isParkingSurface ? (
            <>
              <Image
                src="/img/logo-instaparkai.png"
                alt="InstaParkAi"
                width={140}
                height={47}
                className="h-8 w-auto lg:hidden xl:block"
              />
              <span className="hidden text-lg font-semibold text-brand-blue lg:inline xl:hidden">
                IP
              </span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold lg:hidden xl:inline">
                Insta<span className="text-brand-orange">Park</span> AI
              </span>
              <span className="hidden text-lg font-semibold text-brand-orange lg:inline xl:hidden">
                IP
              </span>
            </>
          )}
          <button
            aria-label="Close menu"
            className="lg:hidden"
            onClick={() => setDrawerOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.href === pathname;
            const Icon = item.icon;

            if (!item.href) {
              return (
                <span
                  key={item.label}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50 lg:justify-center lg:px-2 xl:justify-start xl:px-3"
                  title="Coming soon"
                >
                  <Icon className="size-4" />
                  <span className="lg:hidden xl:inline">{item.label}</span>
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                title={item.label}
                className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors lg:justify-center lg:px-2 xl:justify-start xl:px-3 ${
                  active
                    ? isParkingSurface
                      ? "border-transparent bg-blue-tint font-medium text-brand-blue-deep"
                      : "border-brand-orange bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className="size-4" />
                <span className="lg:hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {isParkingSurface && (
          <div className="absolute inset-x-4 bottom-4 hidden items-center gap-2 rounded-2xl bg-blue-tint-soft p-2 xl:flex">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-brand-blue text-sm font-medium text-white">
              {userLabel.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{userLabel}</p>
              <p className="truncate text-[11px] text-muted-foreground">{userSubLabel}</p>
            </div>
          </div>
        )}
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
          <button
            aria-label="Open menu"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-5" />
          </button>

          {nav === "super-admin" ? <div className="flex-1" /> : <CommandPalette />}

          <span
            className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium sm:flex ${
              isParkingSurface ? "bg-blue-tint text-brand-blue-deep" : "bg-status-info/15 text-status-info"
            }`}
          >
            <Sparkles className="size-4" />
            AI Copilot
          </span>

          {nav === "super-admin" ? (
            <button
              aria-label="Notifications"
              className="relative rounded-lg p-2 hover:bg-muted"
            >
              <Bell className="size-5" />
            </button>
          ) : (
            <NotificationsBell />
          )}

          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full text-sm font-medium text-white ${
                  isParkingSurface ? "bg-gradient-to-br from-[#3B82F6] to-brand-blue" : "bg-brand-orange"
                }`}
              >
                {userLabel.slice(0, 1).toUpperCase()}
              </span>
            </button>

            {userMenuOpen && (
              <>
                <button
                  aria-label="Close menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10">
                  <p className="truncate text-sm font-medium">{userLabel}</p>
                  {userSubLabel && (
                    <p className="truncate text-xs text-muted-foreground">{userSubLabel}</p>
                  )}
                  {nav !== "super-admin" && (
                    <Link
                      href="/parking-admin/m/dashboard"
                      className="mt-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Smartphone className="size-4" />
                      Switch to mobile view
                    </Link>
                  )}
                  <form action={signOutAction} className="mt-3">
                    <Button type="submit" variant="secondary" size="sm" className="w-full">
                      <LogOut className="size-4" />
                      Sign out
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      aria-label="Toggle theme"
      className="rounded-lg p-2 hover:bg-muted"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  );
}

