"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSiteId, getValetSession } from "@/lib/valet-auth/session";

export type CommandSearchResult = {
  plate: string;
  meta: string;
  status: string;
};

/**
 * HANDOFF 28-Jul §10, screen 6c "⌘K search". Reuses the same ilike match the
 * existing Vehicles page's `q` filter already does (`vehicle_number`/`mobile_number`),
 * just against a slightly wider (not-yet-completed-first) result set for the palette.
 */
export async function searchVehiclesAction(query: string): Promise<CommandSearchResult[]> {
  const session = await getValetSession();
  const trimmed = query.trim().replace(/[%,()]/g, "");
  if (!session || !trimmed) return [];

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("valet_tickets")
    .select("vehicle_number, vehicle_type, mobile_number, status, slots(slot_number)")
    .eq("parking_space_id", getCurrentSiteId(session))
    .or(`vehicle_number.ilike.%${trimmed}%,mobile_number.ilike.%${trimmed}%`)
    .order("checked_in_at", { ascending: false })
    .limit(6);

  return (data ?? []).map((t) => {
    const slot = (t as unknown as { slots: { slot_number: string } | null }).slots;
    return {
      plate: t.vehicle_number,
      meta: [t.vehicle_type, slot ? `Slot ${slot.slot_number}` : null, t.mobile_number]
        .filter(Boolean)
        .join(" · "),
      status: t.status,
    };
  });
}
