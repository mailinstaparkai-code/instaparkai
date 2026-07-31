"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { Camera, Check } from "lucide-react";
import { compressImageFile } from "@/lib/image-compress";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/field";
import { extractDlExpiry } from "./ocr-actions";

// Driving License upload + expiry date -- on file select, runs OCR (Tesseract.js,
// server-side) to pre-fill the expiry date. The extracted date is only a
// suggestion: DL card layouts vary too much across Indian states for regex-based
// date extraction to be trusted unattended, so the admin always reviews/edits it.
export function DlDocumentInput({ defaultExpiry }: { defaultExpiry?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [status, setStatus] = useState<"idle" | "compressing" | "verifying" | "ready">("idle");
  const [expiry, setExpiry] = useState(defaultExpiry ?? "");
  const [ocrSuggested, setOcrSuggested] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("compressing");
    const compressed = await compressImageFile(file);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(compressed);
    if (inputRef.current) inputRef.current.files = dataTransfer.files;

    setStatus("verifying");
    const suggested = await extractDlExpiry(
      (() => {
        const fd = new FormData();
        fd.set("file", compressed);
        return fd;
      })()
    );
    if (suggested) {
      setExpiry(suggested);
      setOcrSuggested(true);
    }
    setStatus("ready");
  }

  const ready = status === "ready";

  return (
    <>
      <Field label="Driving License">
        <label
          htmlFor={inputId}
          className={cn(
            "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-1 text-center text-xs transition-colors",
            ready
              ? "border-status-success bg-status-success/10 text-status-success"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {ready ? <Check className="size-5" /> : <Camera className="size-5" />}
          <span className="truncate">
            {status === "compressing" || status === "verifying" ? "…" : "Driving License"}
          </span>
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="driving_license"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="sr-only"
        />
      </Field>

      <Field label="DL expiry">
        <Input
          name="driving_license_expiry"
          type="date"
          value={expiry}
          onChange={(e) => {
            setExpiry(e.target.value);
            setOcrSuggested(false);
          }}
        />
        {status === "verifying" && (
          <p className="text-xs text-muted-foreground">Reading expiry date…</p>
        )}
        {ocrSuggested && (
          <p className="text-xs text-muted-foreground">OCR suggested — please verify.</p>
        )}
      </Field>
    </>
  );
}
