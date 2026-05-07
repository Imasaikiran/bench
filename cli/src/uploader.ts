import type { Payload } from "./payload.js";

export const ALLOWED_ENDPOINT = "https://bench.dev/api/scan";

export const BACKOFF_MS = [1000, 3000] as const;

export const MAX_ATTEMPTS = 3;

/**
 * Returns the production endpoint by default. If `BENCH_API_BASE` is set
 * AND points at a loopback address (127.0.0.1 or localhost), use that
 * instead. Any other host is REJECTED — production single-egress policy
 * (spec §10.2.5) is preserved by hard-rejecting non-loopback overrides.
 *
 * The override path exists for the in-process round-trip smoke test
 * (cli/test/consent-roundtrip.test.ts) and local dev against a Next dev
 * server. It cannot be turned into a data-exfiltration vector.
 */
export function resolveEndpoint(envBase: string | undefined): string {
  if (!envBase) return ALLOWED_ENDPOINT;
  let parsed: URL;
  try {
    parsed = new URL(envBase);
  } catch {
    throw new Error(`BENCH_API_BASE not a valid URL: ${envBase}`);
  }
  const host = parsed.hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new Error(`BENCH_API_BASE host must be loopback, got: ${host}`);
  }
  // Strip trailing slash + append /api/scan if not already present.
  const base = envBase.replace(/\/$/, "");
  if (base.endsWith("/api/scan")) return base;
  return `${base}/api/scan`;
}

/** Thrown for errors that should NOT be retried (4xx responses). */
class TerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerminalError";
  }
}

type Opts = {
  fetch?: typeof globalThis.fetch;
  endpoint?: string;
  sleep?: (ms: number) => Promise<void>;
};

export async function upload(
  payload: Payload,
  opts: Opts = {}
): Promise<{ id: string; url: string }> {
  // Caller-passed opts.endpoint wins (existing test path). Otherwise resolve
  // from env (loopback-only override) or fall back to production.
  const envBase = process.env["BENCH_API_BASE"];
  const endpoint = opts.endpoint ?? resolveEndpoint(envBase);
  if (endpoint !== ALLOWED_ENDPOINT && !/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/)/.test(endpoint)) {
    throw new Error(`egress policy: ${endpoint} not allowed`);
  }
  const doFetch = opts.fetch ?? globalThis.fetch;
  const doSleep =
    opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const safeVersion = payload.scanner_version.replace(/[^\w.\-+]/g, "_");

  let lastErr: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await doFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `bench/${safeVersion}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        throw new TerminalError("rate-limited");
      }
      if (res.status === 426) {
        const j = (await res.json().catch(() => ({}))) as { required_version?: string };
        throw new TerminalError(`stale-client: ${j.required_version ?? "unknown"}`);
      }
      if (res.status >= 400 && res.status < 500) {
        throw new TerminalError(`http ${res.status}`);
      }
      if (res.status >= 500) {
        throw new Error(`server ${res.status}`);
      }
      if (res.status >= 300) {
        throw new TerminalError(`http ${res.status}`);
      }
      return (await res.json()) as { id: string; url: string };
    } catch (e) {
      // Terminal errors: do not retry, re-throw immediately
      if (e instanceof TerminalError) {
        throw e;
      }
      lastErr = e;
      if (i < BACKOFF_MS.length) {
        await doSleep(BACKOFF_MS[i] as number);
      }
    }
  }
  throw new Error(`upload failed after ${MAX_ATTEMPTS} attempts: ${String(lastErr)}`, { cause: lastErr });
}
