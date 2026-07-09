export function getSessionCookieOptions(req: Request, maxAge: number) {
  const url = new URL(req.url);
  const host = (req.headers.get("host") || url.host).split(":")[0].toLowerCase();
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || url.protocol === "https:";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const domain = host === "breakinz.com.au" || host === "www.breakinz.com.au"
    ? ".breakinz.com.au"
    : undefined;

  return {
    domain,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps && !isLocal,
    maxAge,
    path: "/",
  };
}
