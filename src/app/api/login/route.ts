import { NextResponse } from "next/server";
import { authenticateAppUser } from "@/lib/auth/users";
import { SESSION_COOKIE, getSessionSecret } from "@/lib/auth/session";
import { getSessionCookieOptions } from "@/lib/auth/cookie-options";
import { createSessionToken } from "@/lib/auth/session-token";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const isFormPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  const credentials = isFormPost
    ? Object.fromEntries((await req.formData()).entries())
    : ((await req.json().catch(() => ({}))) as Record<string, unknown>);

  const email = String(credentials.email || "").trim().toLowerCase();
  const password = String(credentials.password || "");
  const user = email && password ? await authenticateAppUser(email, password) : null;

  if (!user) {
    if (isFormPost) {
      return NextResponse.redirect(
        new URL("/login?error=Invalid%20email%20or%20password", req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = createSessionToken(user.email, getSessionSecret());
  const response = isFormPost
    ? NextResponse.redirect(new URL("/break-in/dashboard", req.url), { status: 303 })
    : NextResponse.json({ ok: true, next: "/break-in/dashboard", user });

  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions(req, 12 * 60 * 60));

  return response;
}

export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
