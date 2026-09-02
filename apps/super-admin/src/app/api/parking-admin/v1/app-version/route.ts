import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLatestRelease } from "@/lib/parking-admin/app-releases";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { broadcastAndroidPush } from "@/lib/push/dispatch";

export async function GET(req: Request) {
  try {
    // Available to both parking_admin and valet_operator -- bug fixes benefit both
    // roles, so this deliberately skips requireApiParkingAdmin.
    await requireApiSession(req);
    const platform = new URL(req.url).searchParams.get("platform") ?? "android";

    const supabase = createServiceClient();
    const latest = await getLatestRelease(supabase, platform);

    return NextResponse.json({
      latestVersionCode: latest?.versionCode ?? null,
      latestVersionName: latest?.versionName ?? null,
      apkUrl: latest?.apkUrl ?? null,
      releaseNotes: latest?.releaseNotes ?? null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

// Publishes a new release: upserts the app_releases row and (Android only)
// broadcasts a real push notification to every registered install. This is an
// ops/release-checklist action run by hand, not a parking_admin/valet_operator
// session flow -- requireApiSession's bearer-token scheme doesn't apply. Auth is the
// service-role key, the exact same secret the release checklist's Storage-upload
// step already uses, so cutting a release needs no new secret to provision.
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      throw new AppError("unauthorized", "Unauthorized.", 401);
    }

    const body = await req.json().catch(() => null);
    const platform = typeof body?.platform === "string" ? body.platform : "android";
    const versionCode = typeof body?.versionCode === "number" ? body.versionCode : null;
    const versionName = typeof body?.versionName === "string" ? body.versionName : null;
    const apkUrl = typeof body?.apkUrl === "string" ? body.apkUrl : null;
    const releaseNotes = typeof body?.releaseNotes === "string" ? body.releaseNotes : null;
    if (!versionCode || !versionName || !apkUrl) {
      throw new AppError("invalid_request", "versionCode, versionName, apkUrl required.", 400);
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("app_releases")
      .upsert(
        { platform, version_code: versionCode, version_name: versionName, apk_url: apkUrl, release_notes: releaseNotes },
        { onConflict: "platform,version_code" }
      );
    if (error) throw new AppError("db_error", error.message, 500);

    if (platform === "android") {
      // Best-effort, never throws -- a Firebase outage shouldn't fail the release step;
      // the app_releases upsert above (and the in-app polling banner it feeds) already
      // succeeded regardless of whether the push goes out.
      await broadcastAndroidPush(
        supabase,
        "Update available",
        `Version ${versionName} is ready to install`,
        { type: "app_update", versionCode: String(versionCode), versionName, apkUrl }
      );
    }

    return NextResponse.json({ ok: true, versionCode, versionName });
  } catch (err) {
    return errorResponse(err);
  }
}
