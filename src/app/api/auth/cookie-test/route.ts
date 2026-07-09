import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/cookie-options";

export async function GET(req: Request) {
  const response = NextResponse.redirect(new URL("/api/auth/check", req.url), { status: 303 });
  response.cookies.set("breakinz_cookie_test", "ok", getSessionCookieOptions(req, 5 * 60));
  return response;
}
