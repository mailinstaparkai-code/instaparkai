"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type MultiSelectOption = { value: string; label: string };

// Lightweight checkbox-list popover -- no multi-select primitive exists in this app's
// component set to extend (components/ui/select.tsx is single-select only), so this
// follows the same "button trigger + absolute popover + click-outside backdrop" pattern
// already used by notifications-bell.tsx rather than fighting base-ui's Select for
// multi-value support.
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs"
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{summary}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <button
            aria-label="Close"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 z-50 mt-1.5 max-h-64 w-48 overflow-y-auto rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="size-3.5"
                />
                {opt.label}
              </label>
            ))}
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-1 w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
