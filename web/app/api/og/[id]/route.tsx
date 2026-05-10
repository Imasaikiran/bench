import { ImageResponse } from "@vercel/og";
import * as Sentry from "@sentry/nextjs";
import { sql } from "../../../../lib/db";
import { ogCard, OG_WIDTH, OG_HEIGHT, type OgPayload } from "../../../../lib/og-render";

export const runtime = "edge";

type ScanRow = { payload: OgPayload };

const DEMO_PAYLOAD: OgPayload = {
  hours_with_cc: 187,
  score: 62,
  tier: "Tinkerer",
  signature_verbs: ["install", "prune", "question"],
  handle: "priya_dev",
};

async function lookupPayload(
  id: string,
): Promise<OgPayload | null> {
  if (id === "demo") return DEMO_PAYLOAD;

  // Try scan id first. Anonymous scans have no handle — leave undefined so
  // the footer falls back to "bench.dev".
  const byScan = (await sql`
    SELECT payload FROM scans
    WHERE id = ${id}
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `) as ScanRow[];
  if (byScan.length > 0 && byScan[0]?.payload) {
    return { ...byScan[0].payload, handle: byScan[0].payload.handle ?? null };
  }

  // Fall back to handle lookup. We KNOW the handle here because the route
  // param matched a profile. Apply the same expiry guard as the scan-id
  // branch so an expired latest_scan doesn't render an OG card while
  // /scan/<id> 404s.
  const byHandle = (await sql`
    SELECT s.payload FROM profiles p
    JOIN scans s ON s.id = p.latest_scan
    WHERE p.handle = ${id.toLowerCase()}
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
    LIMIT 1
  `) as ScanRow[];
  if (byHandle.length > 0 && byHandle[0]?.payload) {
    return { ...byHandle[0].payload, handle: id.toLowerCase() };
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    const p = await lookupPayload(id);
    if (!p) {
      return new Response("not found", { status: 404 });
    }

    return new ImageResponse(ogCard(p), {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    if (process.env["SENTRY_DSN"]) {
      Sentry.captureException(err, { extra: { route: "/api/og/[id]", id } });
    }
    return new Response("og render failed", { status: 500 });
  }
}
