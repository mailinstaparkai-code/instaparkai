"use server";

import { extractPlateNumber } from "@/lib/plate-ocr";

export async function extractPlate(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return await extractPlateNumber(buffer);
  } catch (err) {
    console.error("extractPlate failed", err);
    return null;
  }
}
