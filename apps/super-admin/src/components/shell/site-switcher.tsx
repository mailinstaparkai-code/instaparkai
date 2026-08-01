"use client";

import { useState, useTransition } from "react";
import { MapPin, Check } from "lucide-react";
import { switchSite } from "@/lib/valet-auth/site-switch";

export function SiteSwitcher({
  sites,
  currentSiteId,
}: {
  sites: { id: string; name: string }[];
  currentSiteId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const current = sites.find((s) => s.id === currentSiteId);

  if (sites.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full bg-blue-tint px-3 py-1.5 text-sm font-medium text-brand-blue-deep hover:opacity-90 disabled:opacity-60"
      >
        <MapPin className="size-4" />
        <span className="max-w-32 truncate sm:max-w-48">{current?.name ?? "Select site"}</span>
      </button>

      {open && (
        <>
          <button
            aria-label="Close site switcher"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => {
                  setOpen(false);
                  if (site.id === currentSiteId) return;
                  const formData = new FormData();
                  formData.set("site_id", site.id);
                  startTransition(() => {
                    switchSite(formData);
                  });
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{site.name}</span>
                {site.id === currentSiteId && <Check className="size-4 shrink-0 text-brand-blue" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
