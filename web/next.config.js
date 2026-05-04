import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  outputFileTracingRoot: resolve(__dirname, ".."),
  outputFileTracingIncludes: {
    "/how-we-scored": ["../rubric/rubric.yaml"],
    "/rubric": ["../rubric/rubric.yaml"],
    "/api/scan": ["../rubric/rubric.yaml"],
  },
  experimental: { typedRoutes: true },
};
