#!/usr/bin/env tsx
// web/scripts/render-og-local.ts
//
// Renders the OG card to a PNG on disk without needing Vercel + Postgres.
// Used to sanity-check the unfurl card before launch dry-run.
//
// Usage:
//   pnpm -C web og:preview                              # default JSON path
//   pnpm -C web og:preview /path/to/bench-scan.json     # explicit
//
// Output: /tmp/bench-screenshots/og-card.png (1200x630).
//
// Reads payload, validates required keys, calls @vercel/og's ImageResponse
// (which works in Node despite being shipped for edge), writes the buffer.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ImageResponse } from "@vercel/og";
import { ogCard, OG_WIDTH, OG_HEIGHT, type OgPayload } from "../lib/og-render";

const DEFAULT_INPUT = "/tmp/bench-real-run/bench-scan.json";
const DEFAULT_OUTPUT = "/tmp/bench-screenshots/og-card.png";

function pickPayload(input: unknown): OgPayload {
  if (!input || typeof input !== "object") {
    throw new Error("payload is not an object");
  }
  const o = input as Record<string, unknown>;
  return {
    hours_with_cc: typeof o["hours_with_cc"] === "number" ? (o["hours_with_cc"] as number) : null,
    score: typeof o["score"] === "number" ? (o["score"] as number) : 0,
    tier: typeof o["tier"] === "string" ? (o["tier"] as string) : "Explorer",
    signature_verbs: Array.isArray(o["signature_verbs"])
      ? (o["signature_verbs"] as unknown[]).filter((v): v is string => typeof v === "string")
      : [],
  };
}

async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? DEFAULT_INPUT;
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;

  const raw = readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const payload = pickPayload(parsed);

  // ImageResponse extends Response — extract the body via arrayBuffer().
  const response = new ImageResponse(ogCard(payload), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
  });
  const buf = Buffer.from(await response.arrayBuffer());

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buf);

  console.log(`OG card written: ${outputPath} (${buf.length} bytes, ${OG_WIDTH}x${OG_HEIGHT})`);
  console.log(`Tier=${payload.tier}, Score=${payload.score}, Hours=${payload.hours_with_cc ?? "hidden"}`);
}

main().catch((err) => {
  console.error("og:preview failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
