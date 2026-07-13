"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = {
  timestamp: string;
  vehicleNumber: string;
  label: string;
  operatorLabel: string;
  fare: number | null;
  paymentCollected: boolean | null;
};

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportCsvButton({ rows }: { rows: Row[] }) {
  function handleExport() {
    const header = ["Timestamp", "Vehicle", "Transaction", "Operator", "Fare", "Payment"];
    const lines = rows.map((r) =>
      [
        new Date(r.timestamp).toLocaleString(),
        r.vehicleNumber,
        r.label,
        r.operatorLabel,
        r.fare !== null ? String(r.fare) : "",
        r.paymentCollected === null ? "" : r.paymentCollected ? "paid" : "pending",
      ]
        .map(escapeCsv)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vehicle-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={!rows.length}>
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}
