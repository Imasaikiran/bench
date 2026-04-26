// web/lib/plausible.ts
// Typed Plausible event emitter. Safe in SSR — no-ops on server.
// The Plausible <script> tag is injected by V1Page (lib/v1render.tsx).

export type PlausibleEvent =
  | "scan_upload"
  | "claim_complete"
  | "share_click"
  | "delete_complete"
  | "rescan_detect";

export type PlausibleProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: PlausibleProps }) => void;
  }
}

/**
 * Fires a Plausible custom event on the client. Safe in SSR (no-op on server).
 * The Plausible script tag is injected by V1Page (lib/v1render.tsx).
 *
 * Server-side event firing (scan_upload, claim_complete, delete_complete)
 * is deferred — TODO in respective API routes.
 */
export function plausible(event: PlausibleEvent, props?: PlausibleProps): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return; // script not loaded yet, or blocked
  if (props) window.plausible(event, { props });
  else window.plausible(event);
}
