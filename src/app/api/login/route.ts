import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const isFormPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  if (isFormPost) {
    return NextResponse.redirect(new URL("/break-in/dashboard", req.url), { status: 303 });
  }

  return NextResponse.json({ ok: true, next: "/break-in/dashboard" });
}
