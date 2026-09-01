"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { compressImageFile } from "@/lib/image-compress";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/field";
import { extractPlate } from "./ocr-actions";

// Vehicle-number field for the check-in dialog, with an optional OCR assist: tapping
// the camera icon captures/picks a close-up of the plate, runs it through OCR.space
// (server-side, see lib/plate-ocr.ts) and pre-fills the field -- always editable,
// same "suggestion, not truth" philosophy as operators/dl-document-input.tsx's
// DL-expiry OCR. The photo itself rides along as photo_plate when the form submits.
export function PlateCaptureField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "failed">("idle");
  const [ocrSuggested, setOcrSuggested] = useState(false);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Downscaling to compressImageFile's default 1280px measurably degraded OCR
    // accuracy on a real reported photo (confirmed empirically: a correct read at
    // 1600px/q90 became a wrong one at 1280px/q90) -- this is the only check-in
    // photo OCR actually reads text from, so it alone gets a higher ceiling.
    const compressed = await compressImageFile(file, 1920, 0.85);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(compressed);
    if (inputRef.current) inputRef.current.files = dataTransfer.files;

    setStatus("reading");
    const suggested = await extractPlate(
      (() => {
        const fd = new FormData();
        fd.set("file", compressed);
        return fd;
      })()
    );
    if (suggested) {
      setVehicleNumber(suggested);
      setOcrSuggested(true);
      setStatus("idle");
    } else {
      setStatus("failed");
    }
  }

  return (
    <Field label="Vehicle number">
      <div className="relative">
        <span className="absolute top-1/2 left-1.5 -translate-y-1/2 rounded-md bg-status-disabled/20 px-1.5 py-0.5 text-[10px] font-bold text-status-disabled">
          IND
        </span>
        <Input
          name="vehicle_number"
          required
          placeholder="KA01AB1234"
          className="pl-11"
          value={vehicleNumber}
          onChange={(e) => {
            setVehicleNumber(e.target.value);
            setOcrSuggested(false);
            setStatus("idle");
          }}
        />
        <label
          htmlFor={inputId}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title="Scan plate"
        >
          {status === "reading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="photo_plate"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="sr-only"
        />
      </div>
      {status === "reading" && (
        <p className="text-xs text-muted-foreground">Reading plate…</p>
      )}
      {ocrSuggested && (
        <p className="text-xs text-muted-foreground">OCR suggested — please verify.</p>
      )}
      {status === "failed" && (
        <p className="text-xs text-status-danger">Couldn't read plate — please enter manually.</p>
      )}
      {status === "idle" && !ocrSuggested && (
        <p className="text-xs text-muted-foreground">
          Tip: tap the camera icon for a close-up of just the plate for an accurate OCR read.
        </p>
      )}
    </Field>
  );
}
