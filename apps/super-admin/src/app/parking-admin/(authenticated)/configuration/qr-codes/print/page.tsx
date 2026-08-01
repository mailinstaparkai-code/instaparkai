import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSiteId, getValetSession } from "@/lib/valet-auth/session";
import { getBaseUrl } from "@/lib/parking-admin/queue";
import { PrintButton } from "./print-button";

export default async function PrintQrCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }
  if (session.role !== "parking_admin") {
    redirect("/parking-admin/dashboard");
  }

  const { ids } = await searchParams;
  const idList = ids ? ids.split(",").filter(Boolean) : null;

  const supabase = createServiceClient();
  let query = supabase
    .from("qr_codes")
    .select("id, code")
    .eq("site_id", getCurrentSiteId(session))
    .order("code");
  if (idList?.length) query = query.in("id", idList);

  const { data: codes } = await query;
  const baseUrl = await getBaseUrl();

  const cards = await Promise.all(
    (codes ?? []).map(async (c) => ({
      code: c.code,
      svg: await QRCode.toString(`${baseUrl}/track/qr/${c.code}`, {
        type: "svg",
        margin: 1,
        width: 200,
      }),
    }))
  );

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Print QR codes</h1>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.code}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center"
          >
            <div dangerouslySetInnerHTML={{ __html: card.svg }} />
            <p className="font-numeric text-sm font-semibold">{card.code}</p>
          </div>
        ))}
        {!cards.length && <p className="text-sm text-muted-foreground">No codes to print.</p>}
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
        }
      `}</style>
    </div>
  );
}
