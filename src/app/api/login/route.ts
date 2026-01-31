import { NextResponse } from "next/server";
import crypto from "crypto";

function sign(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const cleaned = email.trim().toLowerCase();

  const domains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const domain = cleaned.split("@")[1] || "";
  if (domains.length > 0 && !domains.includes(domain)) {
    return NextResponse.json(
      { error: `Email domain not allowed (${domain})` },
      { status: 403 }
    );
  }

  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "AUTH_COOKIE_SECRET missing in env" },
      { status: 500 }
    );
  }

  // token = email|timestamp|signature
  const ts = Date.now().toString();
  const base = `${cleaned}|${ts}`;
  const sig = sign(base, secret);
  const token = `${cleaned}|${ts}|${sig}`;

  const res = NextResponse.json({ ok: true });

  res.cookies.set("sibw_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });

  return res;
}
