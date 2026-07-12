"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { compressImageFile } from "@/lib/image-compress";
import { Field } from "./field";

export function PhotoInput({ name, label }: { name: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
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

  return (
    <Field label={label}>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
      />
      {status === "compressing" && (
        <p className="text-xs text-muted-foreground">Compressing…</p>
      )}
      {status === "ready" && <p className="text-xs text-status-success">Ready to upload</p>}
    </Field>
  );
}
