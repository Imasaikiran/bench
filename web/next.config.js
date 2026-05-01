import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: resolve(__dirname, ".."),
  outputFileTracingIncludes: {
    "/how-we-scored": ["../rubric/rubric.yaml"],
    "/api/scan": ["../rubric/rubric.yaml"],
  },
  experimental: { typedRoutes: true },
};

// Wrap with Sentry. Source maps upload only when SENTRY_AUTH_TOKEN is set
// (sourcemaps.disable: true skips upload otherwise — no-op without it).
// Sentry runtime init is independently gated on SENTRY_DSN inside the
// sentry.*.config.ts files, so the app behaves identically when neither
// SENTRY_DSN nor SENTRY_AUTH_TOKEN is configured.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env["SENTRY_ORG"],
  project: process.env["SENTRY_PROJECT"],
  authToken: process.env["SENTRY_AUTH_TOKEN"],
  sourcemaps: { disable: !process.env["SENTRY_AUTH_TOKEN"] },
});
