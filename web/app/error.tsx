"use client";

// Top-level error boundary. Captures unhandled render/server errors to
// Sentry (no-op when SENTRY_DSN is unset) and shows a minimal recovery UI.
//
// Next.js calls `reset()` to attempt re-render of the segment.

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui",
        padding: 32,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Something went wrong</h1>
      <p style={{ marginBottom: 24, opacity: 0.7 }}>
        An unexpected error occurred. You can try again or head back home.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
