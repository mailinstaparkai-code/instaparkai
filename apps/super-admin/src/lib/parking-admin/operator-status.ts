import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import type { ValetSession } from "@/lib/valet-auth/session";
import { todayIST, type DailyStatusKind } from "@/lib/operator-availability";
import { AppError } from "./errors";

// The three states an operator can set on themselves from the app's home tab. "leave"
// is deliberately excluded -- per the 19th-July doc, only Parking Admin can mark an
// operator on leave (existing setOperatorDailyStatus action, operators/actions.ts).
export const SELF_SETTABLE_STATUSES = ["in", "out", "break"] as const;
export type SelfSettableStatus = (typeof SELF_SETTABLE_STATUSES)[number];

export type MyDailyStatus = {
  status: DailyStatusKind | null;
  statusDate: string;
};

export async function getMyDailyStatus(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession
): Promise<MyDailyStatus> {
  const statusDate = todayIST();
  if (session.role !== "valet_operator") {
    // Parking Admin sessions don't clock in/out -- always report no status rather
    // than reading a row that will never exist for them.
    return { status: null, statusDate };
  }

  const { data } = await supabase
    .from("operator_daily_status")
    .select("status")
    .eq("operator_id", session.accountId)
    .eq("status_date", statusDate)
    .maybeSingle();

  return { status: (data?.status as DailyStatusKind | undefined) ?? null, statusDate };
}

export async function setMyDailyStatus(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  status: string
): Promise<MyDailyStatus> {
  if (session.role !== "valet_operator") {
    throw new AppError("forbidden", "Only valet operators can set their own status.", 403);
  }
  if (!(SELF_SETTABLE_STATUSES as readonly string[]).includes(status)) {
    throw new AppError("invalid_request", "Status must be one of: in, out, break.", 400);
  }

  const statusDate = todayIST();

  const { data: existing } = await supabase
    .from("operator_daily_status")
    .select("status")
    .eq("operator_id", session.accountId)
    .eq("status_date", statusDate)
    .maybeSingle();
  if (existing?.status === "leave") {
    throw new AppError(
      "invalid_state",
      "You're marked on leave today -- ask your Parking Admin to change it.",
      409
    );
  }

  const { error } = await supabase.from("operator_daily_status").upsert(
    {
      operator_id: session.accountId,
      status_date: statusDate,
      status,
      set_by: session.accountId,
    },
    { onConflict: "operator_id,status_date" }
  );
  if (error) throw new Error(error.message);

  return { status: status as DailyStatusKind, statusDate };
}
