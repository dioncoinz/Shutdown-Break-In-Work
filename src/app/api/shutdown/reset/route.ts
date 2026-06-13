import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";
import { shutdownAdminActionsEnabled } from "@/lib/shutdown/admin-actions";

const CONFIRMATION = "NEXT SHUTDOWN";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export async function DELETE(req: Request) {
  if (!shutdownAdminActionsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await req.json().catch(() => null)) as {
      confirmation?: string;
    } | null;

    if (body?.confirmation !== CONFIRMATION) {
      return NextResponse.json(
        { error: `Type ${CONFIRMATION} to reset shutdown data.` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseDb();

    const deletes = [
      supabase.from("break_in_resources").delete().neq("id", ZERO_UUID),
      supabase.from("work_removal_resources").delete().neq("id", ZERO_UUID),
      supabase.from("late_work_resources").delete().neq("id", ZERO_UUID),
      supabase.from("break_in_requests").delete().neq("id", ZERO_UUID),
      supabase.from("work_removal_requests").delete().neq("id", ZERO_UUID),
      supabase.from("late_work_requests").delete().neq("id", ZERO_UUID),
    ];

    const results = await Promise.all(deletes);
    const firstError = results.find((result) => result.error)?.error;

    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    );
  }
}
