import { NextResponse } from "next/server";
import { buildShutdownExcelHtml } from "@/lib/shutdown/export";
import { requireApiUser } from "@/lib/auth/current-user";

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  try {
    const shutdownId = new URL(req.url).searchParams.get("shutdown")?.trim() || undefined;
    const html = await buildShutdownExcelHtml(shutdownId);
    const stamp = new Date().toISOString().slice(0, 10);
    const scope = shutdownId ? `shutdown-${shutdownId.slice(0, 8)}` : "all-shutdowns";

    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scope}-${stamp}.xls"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
