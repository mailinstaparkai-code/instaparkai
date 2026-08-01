import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { getVehicleTransactionsReport } from "@/lib/parking-admin/reports";
import { TRANSACTION_META, operatorLabel } from "@/lib/ticket-timeline";

function parseCsv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const url = new URL(req.url);
    const defaults = defaultDateRange();
    const from = url.searchParams.get("from") || defaults.from;
    const to = url.searchParams.get("to") || defaults.to;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

    const supabase = createServiceClient();
    const result = await getVehicleTransactionsReport(
      supabase,
      getCurrentSiteId(session),
      {
        types: parseCsv(url.searchParams.get("type")),
        operators: parseCsv(url.searchParams.get("operator")),
        from,
        to,
      },
      page
    );

    return NextResponse.json({
      transactions: result.transactions.map((t) => ({
        key: t.key,
        type: t.type,
        label: TRANSACTION_META[t.type].label,
        timestamp: t.timestamp,
        vehicleNumber: t.vehicleNumber,
        operatorLabel: operatorLabel(t.operator),
        fare: t.fare,
        paymentCollected: t.paymentCollected,
      })),
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      cappedAt: result.cappedAt,
      stats: result.stats,
      operatorOptions: result.operatorOptions,
      from,
      to,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
