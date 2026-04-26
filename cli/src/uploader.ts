import type { Payload } from "./payload.js";

export const ALLOWED_ENDPOINT = "https://bench.dev/api/scan";

export const BACKOFF_MS = [1000, 3000] as const;

export const MAX_ATTEMPTS = 3;

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
  const endpoint = opts.endpoint ?? ALLOWED_ENDPOINT;
  if (endpoint !== ALLOWED_ENDPOINT) {
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
