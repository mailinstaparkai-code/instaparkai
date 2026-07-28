import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveActiveTicketByQrCode } from "@/lib/parking-admin/qr-codes";

export default async function QrLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createServiceClient();

  const ticket = await resolveActiveTicketByQrCode(supabase, code.trim().toUpperCase());
  if (!ticket) notFound();

  redirect(`/track/${ticket.ticket_token}`);
}
