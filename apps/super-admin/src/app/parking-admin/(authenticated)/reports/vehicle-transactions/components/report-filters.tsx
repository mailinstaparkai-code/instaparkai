"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const TYPE_OPTIONS = [
  { value: "all", label: "All Transactions" },
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
  type: string;
  operator: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const operatorOptions = [{ value: "all", label: "All Operators" }, ...operators.map((op) => ({ value: op.id, label: op.label }))];

  function setParam(key: string, value: string) {
    const params = new URLSearchParams({ type, operator, from, to });
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="glass-card flex flex-wrap items-end gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Transaction Type</Label>
        <Select items={TYPE_OPTIONS} value={type} onValueChange={(v) => setParam("type", String(v))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Operator</Label>
        <Select
          items={operatorOptions}
          value={operator}
          onValueChange={(v) => setParam("operator", String(v))}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operatorOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setParam("from", e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setParam("to", e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
