import { NextResponse } from "next/server";
import { requireApiShutdownManagerUser } from "@/lib/auth/current-user";
import { updateShutdownActive } from "@/lib/shutdown/setup";

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
    const shutdown = await updateShutdownActive(
      String(input.shutdown_id || ""),
      input.is_active === "on" || input.is_active === true
    );

    if (isFormPost) {
      return NextResponse.redirect(new URL("/admin/shutdowns?updated=1", req.url), {
        status: 303,
      });
    }

    return NextResponse.json({ ok: true, shutdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update shutdown";

    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/admin/shutdowns?error=${encodeURIComponent(message)}`, req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
