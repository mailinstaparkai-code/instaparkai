"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { Camera, Check } from "lucide-react";
import { compressImageFile } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

/**
 * Rendered as a square, dashed-border tile per `Check in popup.png` -- a captured
 * photo swaps the camera icon for a check and the border/label to the success color.
 */
export function PhotoInput({ name, label }: { name: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [status, setStatus] = useState<"idle" | "compressing" | "ready">("idle");

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("compressing");
    const compressed = await compressImageFile(file);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(compressed);
    if (inputRef.current) inputRef.current.files = dataTransfer.files;
    setStatus("ready");
  }

  const ready = status === "ready";

  return (
    <div>
      {/* Native file inputs render unstyled, differently-sized browser chrome that
          clashes with the rest of the design system -- so it's visually hidden and
          a dashed-border square tile drives it instead. */}
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
        <span className="truncate">{status === "compressing" ? "…" : label}</span>
      </label>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="sr-only"
      />
    </div>
  );
}
