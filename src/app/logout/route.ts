import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getSessionCookieOptions } from "@/lib/auth/cookie-options";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });

  response.cookies.set(SESSION_COOKIE, "", getSessionCookieOptions(request, 0));

  return response;
}
