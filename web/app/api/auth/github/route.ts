import { NextRequest, NextResponse } from "next/server";
import {
  signState,
  verifyState,
  signSession,
  exchangeCodeForToken,
  getGitHubUser,
} from "../../../../lib/github";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const redirectUri = `${req.nextUrl.origin}/api/auth/github`;

  if (!code) {
    // -----------------------------------------------------------------------
    // Initiate OAuth flow: redirect to GitHub authorization URL
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

    return NextResponse.redirect(url.toString());
  }

  // -------------------------------------------------------------------------
  // OAuth callback: validate state, exchange code, set session cookie
  // -------------------------------------------------------------------------
  if (!state || !verifyState(state)) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  let token: string;
  try {
    token = await exchangeCodeForToken(code, redirectUri);
  } catch {
    return NextResponse.json({ error: "oauth exchange failed" }, { status: 400 });
  }

  let user: { id: number; login: string };
  try {
    user = await getGitHubUser(token);
  } catch {
    return NextResponse.json(
      { error: "github user fetch failed" },
      { status: 500 },
    );
  }

  const sessionCookie = signSession({ github_id: user.id, login: user.login });

  const returnUrl = req.nextUrl.searchParams.get("return") ?? "/";
  const res = NextResponse.redirect(`${req.nextUrl.origin}${returnUrl}`);
  res.cookies.set("bench_session", sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
