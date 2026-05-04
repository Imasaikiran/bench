import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  signState,
  verifyState,
  signSession,
  exchangeCodeForToken,
  getGitHubUser,
} from "../../../../lib/github";
import { randomBytes } from "node:crypto";
import { captureException } from "../../../../lib/sentry-capture";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const redirectUri = `${req.nextUrl.origin}/api/auth/github`;

  if (!code) {
    // -----------------------------------------------------------------------
    // Initiate OAuth flow: redirect to GitHub authorization URL.
    // Generate a nonce, sign it into the state token, and also store the
    // nonce in a short-lived httpOnly cookie so the callback can verify that
    // the same browser initiated the flow (canonical OAuth CSRF defense).
    // -----------------------------------------------------------------------
    const clientId = process.env["GITHUB_CLIENT_ID"];
    if (!clientId) {
      return NextResponse.json(
        { error: "oauth not configured" },
        { status: 500 },
      );
    }

    const nonce = randomBytes(16).toString("hex");
    const stateToken = signState(nonce);

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", "read:user");
    url.searchParams.set("state", stateToken);
    url.searchParams.set("redirect_uri", redirectUri);

    const res = NextResponse.redirect(url.toString());
    res.cookies.set("bench_oauth_state", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      maxAge: 600,
      path: "/",
    });
    return res;
  }

  // -------------------------------------------------------------------------
  // OAuth callback: validate state token, verify cookie-bound nonce, exchange
  // code, set session cookie, then redirect to /.
  // -------------------------------------------------------------------------

  // 1. Verify state token HMAC + TTL and extract the nonce.
  if (!state) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }
  const verified = verifyState(state);
  if (!verified) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  // 2. Compare the nonce from the state token against the cookie value.
  //    timingSafeEqual prevents timing attacks; length check prevents
  //    allocating mismatched buffers that would throw instead of returning false.
  const cookieNonce = req.cookies.get("bench_oauth_state")?.value;
  if (
    !cookieNonce ||
    cookieNonce.length !== verified.nonce.length ||
    !timingSafeEqual(Buffer.from(cookieNonce), Buffer.from(verified.nonce))
  ) {
    return NextResponse.json({ error: "state nonce mismatch" }, { status: 400 });
  }

  let token: string;
  try {
    token = await exchangeCodeForToken(code, redirectUri);
  } catch (err) {
    captureException(err, { route: "/api/auth/github", step: "exchange_code" });
    return NextResponse.json({ error: "oauth exchange failed" }, { status: 400 });
  }

  let user: { id: number; login: string };
  try {
    user = await getGitHubUser(token);
  } catch (err) {
    captureException(err, { route: "/api/auth/github", step: "fetch_user" });
    return NextResponse.json(
      { error: "github user fetch failed" },
      { status: 500 },
    );
  }

  const sessionCookie = signSession({ github_id: user.id, login: user.login });

  // Always redirect to / — no ?return= param to avoid open-redirect attacks.
  const res = NextResponse.redirect(`${req.nextUrl.origin}/`);
  res.cookies.set("bench_session", sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  // Clear the oauth state cookie now that the flow is complete.
  res.cookies.set("bench_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
