import { NextResponse } from "next/server";
import { acceptUserInvite } from "@/lib/auth/users";
import { SESSION_COOKIE, getSessionSecret } from "@/lib/auth/session";
import { getSessionCookieOptions } from "@/lib/auth/cookie-options";
import { createSessionToken } from "@/lib/auth/session-token";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const isFormPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
  const input = isFormPost
    ? Object.fromEntries((await req.formData()).entries())
    : ((await req.json().catch(() => ({}))) as Record<string, unknown>);

  const token = String(input.token || "");
  const password = String(input.password || "");
  const confirmPassword = String(input.confirm_password || "");

  try {
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const user = await acceptUserInvite({ token, password });
    const sessionToken = createSessionToken(user.email, getSessionSecret());
    const response = isFormPost
      ? NextResponse.redirect(new URL("/break-in/dashboard", req.url), { status: 303 })
      : NextResponse.json({ ok: true, user });

    response.cookies.set(SESSION_COOKIE, sessionToken, getSessionCookieOptions(req, 12 * 60 * 60));

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept invite.";

    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`, req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
