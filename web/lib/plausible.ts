// web/lib/plausible.ts
// Typed Plausible event emitter. Safe in SSR — no-ops on server.
// The Plausible <script> tag is injected by V1Page (lib/v1render.tsx).

// Spec §11.1 event list. Keep in sync with web/app/internal/metrics page goals.
export type PlausibleEvent =
  | "scan_upload"
  | "claim_complete"
  | "share_click"
  | "delete_complete"
  | "rescan_detect"
  | "feedback_submit";

export type PlausibleProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: PlausibleProps }) => void;
  }
}

/**
 * Fires a Plausible custom event on the client. Safe in SSR (no-op on server).
 * The Plausible script tag is injected by V1Page (lib/v1render.tsx).
 */
export function plausible(event: PlausibleEvent, props?: PlausibleProps): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return; // script not loaded yet, or blocked
  if (props) window.plausible(event, { props });
  else window.plausible(event);
}

/**
 * Fire a Plausible event from the server (API routes). Fire-and-forget — use
 * `void trackServerSide(...)` at call sites. Errors are swallowed silently so
 * they never interrupt the response.
 */
export async function trackServerSide(
  event: PlausibleEvent,
  props?: PlausibleProps,
): Promise<void> {
  const domain = process.env["PLAUSIBLE_DOMAIN"] ?? "bench.dev";
  try {
    await fetch("https://plausible.io/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "bench-server/1.0" },
      body: JSON.stringify({
        name: event,
        url: `https://${domain}`,
        domain,
        ...(props ? { props } : {}),
      }),
    });
  } catch {
    // fire-and-forget: never let analytics block a response
  }
}
