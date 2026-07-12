"use server";

import { redirect } from "next/navigation";
import { destroyValetSession } from "@/lib/valet-auth/session";

export async function logoutParkingAdmin() {
  await destroyValetSession();
  redirect("/parking-admin/login");
}
