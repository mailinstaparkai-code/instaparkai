import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { listTariffRules, createTariffRule, mapTariffRuleForApi } from "@/lib/parking-admin/configuration";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const rules = await listTariffRules(createServiceClient(), getCurrentSiteId(session));
    return NextResponse.json({ tariffRules: rules.map(mapTariffRuleForApi) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const body = await req.json().catch(() => null);
    if (!body?.vehicleCategory || !body?.pricingType) {
      throw new AppError("invalid_request", "vehicleCategory and pricingType are required.", 400);
    }

    const rule = await createTariffRule(createServiceClient(), getCurrentSiteId(session), {
      vehicle_category: body.vehicleCategory,
      pricing_type: body.pricingType,
      rate: typeof body.rate === "number" ? body.rate : undefined,
      surge_multiplier: typeof body.surgeMultiplier === "number" ? body.surgeMultiplier : null,
      slab_tiers: Array.isArray(body.slabTiers) ? body.slabTiers : null,
    });
    return NextResponse.json({ tariffRule: mapTariffRuleForApi(rule) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
