import { NextResponse } from "next/server";
import { requireApiShutdownManagerUser } from "@/lib/auth/current-user";
import { assignUnassignedRequestsToShutdown } from "@/lib/shutdown/setup";

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
    const counts = await assignUnassignedRequestsToShutdown(String(input.shutdown_id || ""));

    if (isFormPost) {
      const assigned = counts.emergent + counts.lateWork + counts.workRemoval;
      return NextResponse.redirect(
        new URL(`/admin/setup?assigned=${assigned}`, req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to assign existing requests";

    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/admin/setup?error=${encodeURIComponent(message)}`, req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
