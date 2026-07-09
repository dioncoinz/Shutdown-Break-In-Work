import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/current-user";
import { reopenRejectedRequest } from "@/lib/request-edit";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const actor = auth.user?.full_name || auth.user?.email || "A user";

  try {
    await reopenRejectedRequest({
      actor,
      id,
      requestType: "late_work",
      table: "late_work_requests",
    });

    return redirectToRequest(req, id, "reopened", "1");
  } catch (error) {
    return redirectToRequest(req, id, "detailsError", error instanceof Error ? error.message : "Failed to reopen request.");
  }
}

function redirectToRequest(req: Request, id: string, key: string, value: string) {
  const url = new URL(`/late-work/${id}`, req.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}
