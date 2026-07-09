import { NextResponse } from "next/server";
import { requireApiShutdownManagerUser } from "@/lib/auth/current-user";
import { createShutdown } from "@/lib/shutdown/setup";

export async function POST(req: Request) {
  const auth = await requireApiShutdownManagerUser();
  if (auth.response) return auth.response;

  const contentType = req.headers.get("content-type") || "";
  const isFormPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
  const input = isFormPost
    ? Object.fromEntries((await req.formData()).entries())
    : ((await req.json().catch(() => ({}))) as Record<string, unknown>);

  try {
    const shutdown = await createShutdown({
      name: String(input.name || ""),
      start_date: String(input.start_date || ""),
      end_date: String(input.end_date || ""),
      description: String(input.description || ""),
      is_active: input.is_active !== "off",
      break_in_requires_planner: input.break_in_requires_planner === "on",
      break_in_requires_coordinator: input.break_in_requires_coordinator === "on",
      break_in_requires_superintendent: input.break_in_requires_superintendent === "on",
      break_in_requires_manager: input.break_in_requires_manager === "on",
      late_work_requires_planner: input.late_work_requires_planner === "on",
      late_work_requires_coordinator: input.late_work_requires_coordinator === "on",
      late_work_requires_superintendent: input.late_work_requires_superintendent === "on",
      late_work_requires_manager: input.late_work_requires_manager === "on",
      work_removal_requires_planner: input.work_removal_requires_planner === "on",
      work_removal_requires_coordinator: input.work_removal_requires_coordinator === "on",
      work_removal_requires_superintendent: input.work_removal_requires_superintendent === "on",
      work_removal_requires_manager: input.work_removal_requires_manager === "on",
    });

    if (isFormPost) {
      return NextResponse.redirect(new URL("/admin/setup?created=1", req.url), { status: 303 });
    }

    return NextResponse.json({ ok: true, shutdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create shutdown";

    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/admin/setup?error=${encodeURIComponent(message)}`, req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
