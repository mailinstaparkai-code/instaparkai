import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { deleteTariffRule, updateTariffRule, mapTariffRuleForApi } from "@/lib/parking-admin/configuration";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body?.pricingType) {
      throw new AppError("invalid_request", "pricingType is required.", 400);
    }

    const rule = await updateTariffRule(createServiceClient(), getCurrentSiteId(session), id, {
      pricing_type: body.pricingType,
      rate: typeof body.rate === "number" ? body.rate : undefined,
      surge_multiplier: typeof body.surgeMultiplier === "number" ? body.surgeMultiplier : null,
      slab_tiers: Array.isArray(body.slabTiers) ? body.slabTiers : null,
      effective_date: typeof body.effectiveDate === "string" ? body.effectiveDate : null,
    });
    return NextResponse.json({ tariffRule: mapTariffRuleForApi(rule) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { id } = await params;
    await deleteTariffRule(createServiceClient(), getCurrentSiteId(session), id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
