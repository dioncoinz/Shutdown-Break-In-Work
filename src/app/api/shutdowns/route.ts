import { NextResponse } from "next/server";
import { listShutdowns } from "@/lib/shutdown/setup";

export async function GET() {
  try {
    const loaded = await listShutdowns();

    return NextResponse.json({
      ok: true,
      shutdowns: loaded.shutdowns.map((shutdown) => ({
        id: shutdown.id,
        name: shutdown.name,
        start_date: shutdown.start_date,
        end_date: shutdown.end_date,
        is_active: shutdown.is_active,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load shutdowns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
