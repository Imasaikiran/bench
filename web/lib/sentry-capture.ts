// Thin wrapper around Sentry.captureException so route handlers can
// instrument catch blocks without coupling to whether Sentry is configured.
//
// When SENTRY_DSN is unset, Sentry's init is a no-op and captureException
// is a safe no-op as well — but we guard explicitly to keep the dependency
// fully optional and the call cheap.

import * as Sentry from "@sentry/nextjs";

const sentryEnabled = Boolean(process.env["SENTRY_DSN"]);

export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!sentryEnabled) return;
  if (context) {
    Sentry.captureException(err, { extra: context });
    return;
  }
  Sentry.captureException(err);
}
