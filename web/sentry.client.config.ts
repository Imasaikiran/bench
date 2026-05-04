// Sentry browser SDK init.
//
// Loaded automatically by @sentry/nextjs in the browser bundle.
// No-op when SENTRY_DSN is not set so the app behaves identically
// in environments without Sentry configured.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"] ?? process.env["SENTRY_DSN"];

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(
      process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? "0.1",
    ),
  });
}
