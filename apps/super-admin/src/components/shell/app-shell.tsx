"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Search, Sparkles, Bell, Sun, Moon, LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { superAdminNav, parkingAdminNav, valetOperatorNav } from "./nav-config";
import { NotificationsBell } from "./notifications-bell";

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
          <span className="text-lg font-semibold lg:hidden xl:inline">
            Insta<span className="text-brand-orange">Park</span> AI
          </span>
          <span className="hidden text-lg font-semibold text-brand-orange lg:inline xl:hidden">
            IP
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
                      ? "pa-active-pill border-transparent font-medium"
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
          <div className="absolute inset-x-4 bottom-4 hidden items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 xl:flex">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-sm font-medium text-white">
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

          {nav === "super-admin" ? (
            <div className="flex-1" />
          ) : (
            <Suspense fallback={<SearchFormFallback />}>
              <SearchForm />
            </Suspense>
          )}

          <span className="hidden items-center gap-1.5 rounded-full bg-status-info/15 px-3 py-1.5 text-sm font-medium text-status-info sm:flex">
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

// Isolated in its own component (rather than inline in AppShell) so the
// useSearchParams() call it needs can sit behind a <Suspense> boundary --
// required by Next.js for any component that reads search params, even
// though this app's routes are already forced fully dynamic by
// getValetSession()'s cookies() call, so the fallback below is never
// actually shown in practice.
function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialSearchQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = (searchInputRef.current?.value ?? "").trim();
    router.push(trimmed ? `/parking-admin/vehicles?q=${encodeURIComponent(trimmed)}` : "/parking-admin/vehicles");
  }

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground focus-within:text-foreground"
    >
      <Search className="size-4 shrink-0" />
      <input
        key={initialSearchQuery}
        ref={searchInputRef}
        type="text"
        defaultValue={initialSearchQuery}
        placeholder="Search vehicles…"
        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-xs sm:inline">
        ⌘K
      </kbd>
    </form>
  );
}

// Identical markup to SearchForm's initial render, minus the parts that
// depend on useSearchParams() -- only rendered for the brief instant (if
// ever) before SearchForm resolves.
function SearchFormFallback() {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground focus-within:text-foreground">
      <Search className="size-4 shrink-0" />
      <input
        type="text"
        placeholder="Search vehicles…"
        disabled
        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-xs sm:inline">
        ⌘K
      </kbd>
    </div>
  );
}
