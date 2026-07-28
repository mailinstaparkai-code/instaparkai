"use client";

import Link from "next/link";
import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Field } from "../../../components/field";
import { FormDialog } from "../../../components/form-dialog";
import { updateGuestRequestMode, generateQrCodes } from "../actions";

type QrCodeStatus = {
  id: string;
  code: string;
  created_at: string;
  inUse: boolean;
  ticket: { id: string; vehicle_number: string; status: string } | null;
};

export function GuestRequestsTab({
  guestRequestMode,
  qrCodes,
}: {
  guestRequestMode: "link" | "qr";
  qrCodes: QrCodeStatus[];
}) {
  const [pending, setPending] = useState(false);

  async function handleModeChange(checked: boolean) {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("mode", checked ? "qr" : "link");
      await updateGuestRequestMode(formData);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card flex items-center justify-between gap-4 bg-gradient-to-br from-brand-blue/10 via-card to-card p-4">
        <div>
          <p className="text-sm font-medium">QR code check-in mode</p>
          <p className="text-xs text-muted-foreground">
            When on, guests scan a printed QR card to request their vehicle instead of
            using the SMS/WhatsApp tracking link. Only one mode is active at a time.
          </p>
        </div>
        <Switch
          key={guestRequestMode}
          defaultChecked={guestRequestMode === "qr"}
          disabled={pending}
          onCheckedChange={handleModeChange}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {qrCodes.length} code(s) generated · printed cards are reusable across vehicles
        </p>
        <div className="flex items-center gap-2">
          {qrCodes.length > 0 && (
            <Link
              href="/parking-admin/configuration/qr-codes/print"
              target="_blank"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Print all
            </Link>
          )}
          <FormDialog
            trigger={<Button size="sm">+ Generate QR codes</Button>}
            title="Generate QR codes"
            subtitle="Creates new printable codes for this site"
            icon={<QrCode className="size-5" />}
            action={generateQrCodes}
            submitLabel="Generate"
          >
            <Field label="How many?">
              <Input name="count" type="number" min={1} max={100} required placeholder="10" />
            </Field>
          </FormDialog>
        </div>
      </div>

      <div className="glass-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {qrCodes.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-numeric">{c.code}</td>
                <td className="p-3">
                  {c.inUse ? (
                    <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-xs font-medium text-status-warning">
                      In use — {c.ticket?.vehicle_number}
                    </span>
                  ) : (
                    <span className="rounded-full bg-status-success/15 px-2 py-0.5 text-xs font-medium text-status-success">
                      Available
                    </span>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <Link
                    href={`/parking-admin/configuration/qr-codes/print?ids=${c.id}`}
                    target="_blank"
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    Print
                  </Link>
                </td>
              </tr>
            ))}
            {!qrCodes.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                  No QR codes generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
