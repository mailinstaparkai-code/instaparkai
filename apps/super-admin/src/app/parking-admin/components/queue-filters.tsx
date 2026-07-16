"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";

export function QueueFilters({
  statusOptions,
  vehicleTypeOptions,
  status,
  vehicleType,
}: {
  statusOptions: MultiSelectOption[];
  vehicleTypeOptions: MultiSelectOption[];
  status: string[];
  vehicleType: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function push(next: { status: string[]; vehicleType: string[] }) {
    const params = new URLSearchParams();
    if (next.status.length) params.set("status", next.status.join(","));
    if (next.vehicleType.length) params.set("vehicle_type", next.vehicleType.join(","));
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <div className={`flex flex-wrap gap-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <MultiSelect
        label="Status"
        options={statusOptions}
        selected={status}
        onChange={(v) => push({ status: v, vehicleType })}
      />
      <MultiSelect
        label="Vehicle type"
        options={vehicleTypeOptions}
        selected={vehicleType}
        onChange={(v) => push({ status, vehicleType: v })}
      />
    </div>
  );
}
