import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getValetSession } from "@/lib/valet-auth/session";
import { MobileAppShell } from "@/components/shell/mobile-app-shell";

export const metadata: Metadata = {
  manifest: "/manifest.json",
};

// design.md §7 sky-blue revamp -- matches the app shell's white top bar (was the old
// dark-SaaS #0B0D12, alongside manifest.json's background/theme_color).
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  return (
    <MobileAppShell userLabel={session.fullName || session.username}>{children}</MobileAppShell>
  );
}
