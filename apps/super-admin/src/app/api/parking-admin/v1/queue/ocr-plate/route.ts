import { NextResponse } from "next/server";
import { extractPlateNumber } from "@/lib/plate-ocr";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { getSiteOrganizationId } from "@/lib/parking-admin/queue";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ plateNumber: null });
    }

    const organizationId = await getSiteOrganizationId(createServiceClient(), getCurrentSiteId(session));
    const buffer = Buffer.from(await file.arrayBuffer());
    const plateNumber = await extractPlateNumber(buffer, organizationId);
    return NextResponse.json({ plateNumber });
  } catch (err) {
    return errorResponse(err);
  }
}
