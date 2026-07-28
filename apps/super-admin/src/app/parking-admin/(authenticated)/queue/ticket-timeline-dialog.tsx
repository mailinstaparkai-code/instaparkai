"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TRANSACTION_META, operatorLabel, type Transaction } from "@/lib/ticket-timeline";
import { formatIST } from "@/lib/format-date";
import { getTicketTimeline } from "./actions";

export function TicketTimelineDialog({
  ticketId,
  vehicleNumber,
  qrCode,
}: {
  ticketId: string;
  vehicleNumber: string;
  qrCode?: string | null;
}) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(open: boolean) {
    if (!open || transactions) return;
    setLoading(true);
    setTransactions(await getTicketTimeline(ticketId));
    setLoading(false);
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="font-medium text-left hover:text-brand-orange hover:underline">
            {vehicleNumber}
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vehicleNumber} — journey</DialogTitle>
          {qrCode && <p className="text-xs text-muted-foreground">QR code: {qrCode}</p>}
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        <div className="flex flex-col gap-3">
          {transactions?.map((t) => (
            <div key={t.key} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex size-2 shrink-0 rounded-full ${TRANSACTION_META[t.type].color.split(" ")[0].replace("/15", "")}`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANSACTION_META[t.type].color}`}
                  >
                    {TRANSACTION_META[t.type].label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatIST(t.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Operator: {operatorLabel(t.operator)}
                  {t.fare !== null && (
                    <>
                      {" · "}₹{t.fare} {t.paymentCollected ? "paid" : "pending"}
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
          {transactions && !transactions.length && (
            <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
