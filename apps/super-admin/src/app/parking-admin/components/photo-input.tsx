"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { compressImageFile } from "@/lib/image-compress";
import { Field } from "./field";

export function PhotoInput({ name, label }: { name: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [status, setStatus] = useState<"idle" | "compressing" | "ready">("idle");
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("compressing");
    const compressed = await compressImageFile(file);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(compressed);
    if (inputRef.current) inputRef.current.files = dataTransfer.files;
    setFileName(compressed.name);
    setStatus("ready");
  }

  return (
    <Field label={label}>
      {/* Native file inputs render unstyled, differently-sized browser chrome that
          clashes with the rest of the design system and truncates its "No file
          chosen" text mid-word in narrow grids -- so the native input is visually
          hidden and a styled label drives it instead, truncating with an ellipsis. */}
      <label
        htmlFor={inputId}
        className="flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted"
      >
        <Camera className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{fileName ?? "Choose photo"}</span>
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
      {status === "compressing" && (
        <p className="text-xs text-muted-foreground">Compressing…</p>
      )}
      {status === "ready" && <p className="text-xs text-status-success">Ready to upload</p>}
    </Field>
  );
}
