import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPassword } from "@/lib/valet-auth/password";
import { createValetApiToken } from "@/lib/valet-auth/session";
import { AppError, errorResponse } from "@/lib/parking-admin/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password) {
      throw new AppError("invalid_request", "Username and password are required.", 400);
    }

    const supabase = createServiceClient();
    const { data: account } = await supabase
      .from("valet_accounts")
      .select("id, username, password_hash, role, is_active, assigned_site_id, full_name")
      .eq("username", username)
      .maybeSingle();

    if (
      !account ||
      !account.is_active ||
      (account.role !== "parking_admin" && account.role !== "valet_operator") ||
      !verifyPassword(password, account.password_hash)
    ) {
      throw new AppError("invalid_credentials", "Invalid username or password.", 401);
    }

    const { token, expiresAt } = await createValetApiToken(account.id);

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        fullName: account.full_name,
        assignedSiteId: account.assigned_site_id,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
