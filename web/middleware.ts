// web/middleware.ts
// Basic-auth gate for /internal/* routes.
// Requires METRICS_USER and METRICS_PASS env vars. Fails closed if unset.

import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest): NextResponse {
  if (!req.nextUrl.pathname.startsWith("/internal")) return NextResponse.next();

  const user = process.env["METRICS_USER"];
  const pass = process.env["METRICS_PASS"];
  if (!user || !pass) {
    // Fail closed — if env unset, /internal is unreachable.
    return new NextResponse("metrics not configured", { status: 503 }) as never;
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Basic ")) {
    return new NextResponse("auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="bench-internal"' },
    }) as never;
  }
  const decoded = Buffer.from(auth.slice("Basic ".length), "base64").toString("utf8");
  const [u, p] = decoded.split(":", 2);
  if (u !== user || p !== pass) {
    return new NextResponse("forbidden", { status: 403 }) as never;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/internal/:path*"],
};
