import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMarketplaceCategories } from "@/lib/marketplace";

export default async function MarketplacePage() {
  const supabase = await createClient();
  const categories = await listMarketplaceCategories(supabase);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Vendor integrations available to your customers, grouped by category.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/dashboard/marketplace/${category.key}`}
            className="glass-card flex items-start gap-3 p-4 transition-colors hover:bg-accent/5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-5">
              <ShoppingBag />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{category.name}</p>
              {category.description && (
                <p className="text-xs text-muted-foreground">{category.description}</p>
              )}
            </div>
          </Link>
        ))}
        {!categories.length && (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}
      </div>
    </div>
  );
}
