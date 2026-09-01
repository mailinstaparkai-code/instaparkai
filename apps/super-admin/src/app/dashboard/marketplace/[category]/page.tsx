import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceCategoryByKey, listMarketplaceApps } from "@/lib/marketplace";
import { AppManageDialog } from "../components/app-manage-dialog";

export default async function MarketplaceCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categoryKey } = await params;
  const supabase = await createClient();

  const category = await getMarketplaceCategoryByKey(supabase, categoryKey);
  if (!category) notFound();

  const apps = await listMarketplaceApps(supabase, category.id);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard/marketplace"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Marketplace
        </Link>
        <h1 className="text-xl font-semibold">{category.name}</h1>
        {category.description && (
          <p className="text-sm text-muted-foreground">{category.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <div key={app.id} className="glass-card flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-5">
                  <ScanLine />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{app.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{app.vendor}</p>
                </div>
              </div>
              <span
                className={
                  app.is_configured
                    ? "shrink-0 rounded-full bg-status-success/15 px-2 py-0.5 text-xs font-medium text-status-success"
                    : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                }
              >
                {app.is_configured ? "Configured" : "Not configured"}
              </span>
            </div>

            {app.description && (
              <p className="text-sm text-muted-foreground">{app.description}</p>
            )}

            <div className="flex items-center gap-4 border-t border-border pt-3">
              <div>
                <p className="font-numeric text-lg">{app.enabled_assignment_count}</p>
                <p className="text-xs text-muted-foreground">
                  Customer{app.enabled_assignment_count === 1 ? "" : "s"} enabled
                </p>
              </div>
            </div>

            <div className="flex border-t border-border pt-3">
              <AppManageDialog
                appId={app.id}
                categoryKey={categoryKey}
                name={app.name}
                vendor={app.vendor}
                isConfigured={app.is_configured}
              />
            </div>
          </div>
        ))}
        {!apps.length && (
          <p className="text-sm text-muted-foreground">No apps in this category yet.</p>
        )}
      </div>
    </div>
  );
}
