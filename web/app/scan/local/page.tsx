/**
 * /scan/local: debug-only route that renders V1Page from a bench-scan.json
 * file on the local disk. NOT exposed in production builds.
 *
 * Source path: BENCH_LOCAL_SCAN env var, or default /tmp/bench-real-run/bench-scan.json.
 *
 * Use this to preview your own scan (or any scan you've exported) through the
 * full v1 visual + Recommendations stack without setting up a database.
 */

import { readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import { V1Page } from "../../../lib/v1render";
import { toPersonaShape } from "../../../lib/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PATH = "/tmp/bench-real-run/bench-scan.json";

export const metadata = {
  title: "bench: local scan",
  robots: "noindex",
};

export default function LocalScanPage() {
  const path = process.env["BENCH_LOCAL_SCAN"] ?? DEFAULT_PATH;
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    notFound();
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    notFound();
  }
  return <V1Page persona={toPersonaShape(payload)} />;
}
