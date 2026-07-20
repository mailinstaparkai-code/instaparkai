import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";
import { registerPushToken } from "@/lib/push/register-token";

// Android registers its FCM token here (bearer-token auth, same as every other v1
// route). mweb registers via a Server Action instead (see m/push-actions.ts) since it
// has no bearer token to send -- its session is an httpOnly cookie.
export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    const body = await req.json();

    if (body.platform !== "android" || typeof body.token !== "string" || !body.token) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const supabase = createServiceClient();
    await registerPushToken(supabase, {
      accountId: session.accountId,
      platform: "android",
      token: body.token,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
