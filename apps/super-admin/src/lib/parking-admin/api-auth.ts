import "server-only";
import { getValetSessionFromToken, type ValetSession } from "@/lib/valet-auth/session";
import { AppError } from "./errors";

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

export async function requireApiSession(req: Request): Promise<ValetSession> {
  const token = getBearerToken(req);
  const session = token ? await getValetSessionFromToken(token) : null;
  if (!session) throw new AppError("unauthorized", "Sign-in required.", 401);
  return session;
}

export function requireApiParkingAdmin(session: ValetSession): void {
  if (session.role !== "parking_admin") {
    throw new AppError("forbidden", "Parking Admin access required.", 403);
  }
}
