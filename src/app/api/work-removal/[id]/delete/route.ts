import { NextResponse } from "next/server";
import { requireApiShutdownManagerUser } from "@/lib/auth/current-user";
import { deleteRequestWithAudit } from "@/lib/request-delete";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiShutdownManagerUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const form = await req.formData();
  const reason = String(form.get("reason") || "");

  try {
    await deleteRequestWithAudit({
      actor: auth.user?.email || auth.user?.full_name || "Unknown user",
      id,
      reason,
      requestType: "work_removal",
      resourceTable: "work_removal_resources",
      table: "work_removal_requests",
    });

    return NextResponse.redirect(new URL("/work-removal/dashboard?deleted=1", req.url), { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete request.";
    return NextResponse.redirect(
      new URL(`/work-removal/${id}?deleteError=${encodeURIComponent(message)}`, req.url),
      { status: 303 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiShutdownManagerUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await readJson(req);

  try {
    await deleteRequestWithAudit({
      actor: auth.user?.email || auth.user?.full_name || "Unknown user",
      id,
      reason: String(body.reason || ""),
      requestType: "work_removal",
      resourceTable: "work_removal_resources",
      table: "work_removal_requests",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function readJson(req: Request) {
  try {
    return (await req.json()) as { reason?: string };
  } catch {
    return {};
  }
}
