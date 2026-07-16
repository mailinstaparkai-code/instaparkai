"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";

const ACTIVE_OPTIONS: MultiSelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const DAILY_STATUS_OPTIONS: MultiSelectOption[] = [
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
  { value: "leave", label: "Leave" },
  { value: "break", label: "Break" },
  { value: "unset", label: "Not marked" },
];

export function OperatorFilters({
  active,
  dailyStatus,
}: {
  active: string[];
  dailyStatus: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function push(next: { active: string[]; dailyStatus: string[] }) {
    const params = new URLSearchParams();
    if (next.active.length) params.set("active", next.active.join(","));
    if (next.dailyStatus.length) params.set("daily_status", next.dailyStatus.join(","));
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <div className={`flex flex-wrap gap-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <MultiSelect
        label="Status"
        options={ACTIVE_OPTIONS}
        selected={active}
        onChange={(v) => push({ active: v, dailyStatus })}
      />
      <MultiSelect
        label="Today"
        options={DAILY_STATUS_OPTIONS}
        selected={dailyStatus}
        onChange={(v) => push({ active, dailyStatus: v })}
      />
    </div>
  );
}
