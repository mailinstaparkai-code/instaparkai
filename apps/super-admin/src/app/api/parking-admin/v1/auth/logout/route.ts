import { destroyValetApiToken } from "@/lib/valet-auth/session";
import { getBearerToken } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (token) {
      await destroyValetApiToken(token);
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
