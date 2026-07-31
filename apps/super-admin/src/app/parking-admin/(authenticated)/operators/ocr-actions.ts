"use server";

import { extractDlExpiryDate } from "@/lib/dl-ocr";

export async function extractDlExpiry(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  return extractDlExpiryDate(buffer);
}
