import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * OAUTH_STATE_SECRET must be set in the environment before any sign/verify
 * call. The SECRET() helper throws at call-time (not at module load) so that
 * tests can set the var before their first use.
 */
const SECRET = (): string => {
  const s = process.env["OAUTH_STATE_SECRET"];
  if (!s) throw new Error("OAUTH_STATE_SECRET not set");
  return s;
};

const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Session = { github_id: number; login: string; exp: number };

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

function b64uEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function b64uDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

function hmacSign(payload: string): string {
  return createHmac("sha256", SECRET()).update(payload).digest("base64url");
}

/** Produce `<base64url(json)>.<base64url(hmac)>` */
function buildToken(data: unknown): string {
  const encoded = b64uEncode(JSON.stringify(data));
  const sig = hmacSign(encoded);
  return `${encoded}.${sig}`;
}

/**
 * Verify the HMAC and return the decoded payload, or null on any failure.
 * Uses timingSafeEqual to avoid timing attacks on the signature.
 */
function parseToken(token: string): unknown | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = hmacSign(encoded);
  try {
    const a = Buffer.from(provided, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(b64uDecode(encoded)) as unknown;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// State sign / verify (10-minute TTL)
// ---------------------------------------------------------------------------

/** Sign an OAuth state token containing the nonce and current timestamp. */
export function signState(nonce: string): string {
  return buildToken({ nonce, ts: Date.now() });
}

/**
 * Verify the state token HMAC and TTL.
 * Returns `{ nonce }` on success, or `null` on any failure.
 * Also rejects future-dated tokens (negative age) to guard against clock skew.
 */
export function verifyState(token: string): { nonce: string } | null {
  const data = parseToken(token);
  if (
    data === null ||
    typeof data !== "object" ||
    !("nonce" in (data as object)) ||
    !("ts" in (data as object))
  ) {
    return null;
  }
  const { nonce, ts } = data as { nonce: unknown; ts: unknown };
  if (typeof nonce !== "string" || typeof ts !== "number") return null;
  const age = Date.now() - ts;
  if (age < 0 || age >= STATE_TTL_MS) return null; // rejects future-dated tokens
  return { nonce };
}

// ---------------------------------------------------------------------------
// Session sign / verify (7-day TTL)
// ---------------------------------------------------------------------------

/** Create a signed session cookie value. `exp` is set to now + 7 days. */
export function signSession(payload: Omit<Session, "exp">): string {
  return buildToken({ ...payload, exp: Date.now() + SESSION_TTL_MS });
}

/** Return the Session if the cookie is valid and unexpired, else null. */
export function verifySession(cookie: string | undefined): Session | null {
  if (!cookie) return null;
  const data = parseToken(cookie);
  if (
    data === null ||
    typeof data !== "object" ||
    !("github_id" in (data as object)) ||
    !("login" in (data as object)) ||
    !("exp" in (data as object))
  ) {
    return null;
  }
  const session = data as Session;
  if (typeof session.github_id !== "number") return null;
  if (typeof session.login !== "string") return null;
  if (typeof session.exp !== "number") return null;
  if (Date.now() > session.exp) return null;
  return session;
}

// ---------------------------------------------------------------------------
// GitHub OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Exchange an OAuth authorization code for an access token.
 * Throws if the exchange fails or the response lacks `access_token`.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const clientId = process.env["GITHUB_CLIENT_ID"];
  const clientSecret = process.env["GITHUB_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set");
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange returned HTTP ${res.status}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("No access_token in GitHub response");
  }
  return json.access_token;
}

/**
 * Fetch the authenticated user's id and login from the GitHub API.
 * Throws on non-2xx responses.
 */
export async function getGitHubUser(
  token: string,
): Promise<{ id: number; login: string }> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "bench-cli/v2",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub /user returned HTTP ${res.status}`);
  }

  const json = (await res.json()) as { id: number; login: string };
  return { id: json.id, login: json.login };
}
