"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";

const TYPE_OPTIONS: MultiSelectOption[] = [
  { value: "checked_in", label: "Checked In" },
  { value: "parked", label: "Parked" },
  { value: "requested", label: "Pickup Requested" },
  { value: "dispatched", label: "Dispatched" },
  { value: "arrived", label: "Arrived" },
  { value: "completed", label: "Handover Complete" },
];

export function ReportFilters({
  operators,
  type,
  operator,
  from,
  to,
}: {
  operators: { id: string; label: string }[];
  type: string[];
  operator: string[];
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const operatorOptions: MultiSelectOption[] = operators.map((op) => ({
    value: op.id,
    label: op.label,
  }));

  function push(next: { type: string[]; operator: string[]; from: string; to: string }) {
    const params = new URLSearchParams();
    if (next.type.length) params.set("type", next.type.join(","));
    if (next.operator.length) params.set("operator", next.operator.join(","));
    params.set("from", next.from);
    params.set("to", next.to);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className={`glass-card flex flex-wrap items-end gap-4 p-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Transaction Type</Label>
        <MultiSelect
          label="Type"
          options={TYPE_OPTIONS}
          selected={type}
          onChange={(v) => push({ type: v, operator, from, to })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Operator</Label>
        <MultiSelect
          label="Operator"
          options={operatorOptions}
          selected={operator}
          onChange={(v) => push({ type, operator: v, from, to })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => push({ type, operator, from: e.target.value, to })}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => push({ type, operator, from, to: e.target.value })}
          className="w-40"
        />
      </div>
    </div>
  );
}
