"use server";

import { extractPlateNumber } from "@/lib/plate-ocr";
import { getValetSession, getCurrentSiteId } from "@/lib/valet-auth/session";
import { getSiteOrganizationId } from "@/lib/parking-admin/queue";
import { createServiceClient } from "@/lib/supabase/service";

export async function extractPlate(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;

  try {
    const session = await getValetSession();
    const organizationId = session
      ? await getSiteOrganizationId(createServiceClient(), getCurrentSiteId(session))
      : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    return await extractPlateNumber(buffer, organizationId);
  } catch (err) {
    console.error("extractPlate failed", err);
    return null;
  }
}
