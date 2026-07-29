import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { completeHandover } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    const { id } = await params;
    const formData = await req.formData();
    const otp = formData.get("otp")?.toString() || undefined;
    const qrCode = formData.get("qr_code")?.toString() || undefined;
    const fareAmount = formData.get("fare_amount")?.toString() || null;
    const paymentCollected = formData.get("payment_collected")?.toString() === "true";

    const supabase = createServiceClient();
    await completeHandover(supabase, session, id, { otp, qrCode, fareAmount, paymentCollected }, formData);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
