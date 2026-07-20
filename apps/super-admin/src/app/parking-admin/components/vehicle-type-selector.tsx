"use client";

import { useState } from "react";
import { Bike, Car, MoreHorizontal, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

function iconFor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("bike") || v.includes("motor") || v.includes("scoot") || v.includes("2")) return Bike;
  if (v.includes("truck") || v.includes("van")) return Truck;
  if (v.includes("car") || v.includes("sedan") || v.includes("4")) return Car;
  return MoreHorizontal;
}

/**
 * The 4-across icon-tile vehicle-type picker from `Check in popup.png`, driven by
 * the site's actual configurable vehicle types (not hardcoded). Renders a hidden
 * input so it drops into an existing `<form action={serverAction}>` unchanged.
 */
export function VehicleTypeSelector({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const Icon = iconFor(option.value);
          const active = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-colors",
                active
                  ? "border-status-disabled bg-status-disabled/25 font-semibold text-foreground"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("size-5", active && "text-status-disabled")} />
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
