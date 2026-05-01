// Sentry Node-runtime init.
//
// Loaded by `instrumentation.ts` when NEXT_RUNTIME === "nodejs".
// No-op when SENTRY_DSN is not set.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env["SENTRY_DSN"];

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(
      process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? "0.1",
    ),
  });
}
