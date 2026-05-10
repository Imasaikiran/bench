"use client";

// web/app/global-error.tsx
// Required by Next.js when @sentry/nextjs is wired — without it, Next emits
// a build-time warning per https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
//
// Only fires on root-layout-level rendering errors. Day-to-day errors are
// caught by app/error.tsx. Sentry capture is gated on SENTRY_DSN being
// set in Production scope (see phase1-launch-runbook.md §1.2).

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (process.env["NEXT_PUBLIC_SENTRY_DSN"] || process.env["SENTRY_DSN"]) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#08080A",
          color: "#F4F1EA",
          fontFamily: "ui-serif, Georgia, serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 480, padding: "0 32px", textAlign: "center" }}>
          <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
            Something went sideways.
          </h1>
          <p
            style={{
              color: "#C9C4B8",
              fontSize: 16,
              lineHeight: 1.6,
              margin: "0 0 24px",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            We've logged it. If this keeps happening, file at{" "}
            <a
              href="https://github.com/Imasaikiran/bench/issues"
              style={{ color: "#C9A96E", borderBottom: "1px solid rgba(201,169,110,0.3)", textDecoration: "none" }}
            >
              github.com/Imasaikiran/bench/issues
            </a>
            .
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#C9A96E",
              color: "#08080A",
              borderRadius: 999,
              fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← back to bench
          </a>
        </div>
      </body>
    </html>
  );
}
