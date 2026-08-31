import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSiteId, type ValetSession } from "@/lib/valet-auth/session";
import { AppError } from "./errors";

// Duplicated from queue.ts's assertParkingAdminRole rather than imported -- queue.ts
// imports isVehicleWhitelisted from this file, so importing back would be circular.
function assertParkingAdminRole(session: ValetSession | null): asserts session is ValetSession {
  if (!session || session.role !== "parking_admin") {
    throw new AppError("forbidden", "Parking Admin access required.", 403);
  }
}

export type VehiclePass = {
  id: string;
  vehicle_number: string;
  label: string | null;
};

// Consulted on the Direct Checkout hot path (completeDirectCheckout), so cached the
// same way getCachedVehicleTypes is -- short revalidate as a safety net on top of the
// updateTag() calls from create/delete below.
function getCachedVehiclePasses(siteId: string) {
  return unstable_cache(
    async () => {
      const { data } = await createServiceClient()
        .from("vehicle_passes")
        .select("id, vehicle_number, label")
        .eq("parking_space_id", siteId)
        .order("vehicle_number")
        .returns<VehiclePass[]>();
      return data ?? [];
    },
    ["vehicle-passes", siteId],
    { tags: [`vehicle-passes:${siteId}`], revalidate: 60 }
  )();
}

export async function listVehiclePasses(siteId: string): Promise<VehiclePass[]> {
  return getCachedVehiclePasses(siteId);
}

export async function isVehicleWhitelisted(siteId: string, vehicleNumber: string): Promise<boolean> {
  const passes = await getCachedVehiclePasses(siteId);
  const normalized = vehicleNumber.trim().toUpperCase();
  return passes.some((p) => p.vehicle_number.toUpperCase() === normalized);
}

export async function createVehiclePass(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  fields: { vehicleNumber: string; label?: string }
): Promise<void> {
  assertParkingAdminRole(session);
  const vehicle_number = fields.vehicleNumber.trim().toUpperCase();
  if (!vehicle_number) throw new AppError("invalid_request", "Vehicle number is required.", 400);

  const { error } = await supabase.from("vehicle_passes").insert({
    parking_space_id: getCurrentSiteId(session),
    vehicle_number,
    label: fields.label?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteVehiclePass(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string
): Promise<void> {
  assertParkingAdminRole(session);
  const { error } = await supabase
    .from("vehicle_passes")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", getCurrentSiteId(session));
  if (error) throw new Error(error.message);
}
