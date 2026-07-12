"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Search, Sparkles, Bell, Sun, Moon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { superAdminNav, parkingAdminNav, valetOperatorNav } from "./nav-config";

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

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {drawerOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 -translate-x-full border-r border-border bg-sidebar p-4 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <span className="text-lg font-semibold">
            Insta<span className="text-brand-orange">Park</span> AI
          </span>
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
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
                  title="Coming soon"
                >
                  <Icon className="size-4" />
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-brand-orange bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
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

          <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="size-4" />
            <span className="flex-1">Search vehicles, plates, passes…</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-xs">
              ⌘K
            </kbd>
          </div>

          <span className="hidden items-center gap-1.5 rounded-full bg-status-info/15 px-3 py-1.5 text-sm font-medium text-status-info sm:flex">
            <Sparkles className="size-4" />
            AI Copilot
          </span>

          <button
            aria-label="Notifications"
            className="relative rounded-lg p-2 hover:bg-muted"
          >
            <Bell className="size-5" />
          </button>

          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-orange text-sm font-medium text-white">
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
                <div className="glass-card absolute right-0 z-50 mt-2 w-56 p-3">
                  <p className="truncate text-sm font-medium">{userLabel}</p>
                  {userSubLabel && (
                    <p className="truncate text-xs text-muted-foreground">{userSubLabel}</p>
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
