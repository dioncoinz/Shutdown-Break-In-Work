import { NextResponse } from "next/server";
import { buildShutdownExcelHtml } from "@/lib/shutdown/export";
import { shutdownAdminActionsEnabled } from "@/lib/shutdown/admin-actions";

export async function GET() {
  if (!shutdownAdminActionsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const html = await buildShutdownExcelHtml();
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="shutdown-data-${stamp}.xls"`,
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
