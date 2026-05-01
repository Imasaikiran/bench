// Next.js 13.4+ instrumentation hook.
// Loaded once per server runtime (nodejs / edge). Runtime is selected via
// NEXT_RUNTIME so the matching Sentry config is loaded.
// Sentry init itself is gated on SENTRY_DSN inside each config — this hook
// runs unconditionally but is cheap and side-effect-free without a DSN.

export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env["NEXT_RUNTIME"] === "edge") {
    await import("./sentry.edge.config");
  }
}
