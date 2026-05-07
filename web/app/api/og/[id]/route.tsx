import { ImageResponse } from "@vercel/og";
import * as Sentry from "@sentry/nextjs";
import { sql } from "../../../../lib/db";

export const runtime = "edge";

type ScanRow = {
  payload: {
    hours_with_cc: number | null;
    score: number;
    tier: string;
    signature_verbs: string[];
  };
};

const DEMO_PAYLOAD = {
  hours_with_cc: 187,
  score: 62,
  tier: "Tinkerer",
  signature_verbs: ["install", "prune", "question"],
};

async function lookupPayload(
  id: string,
): Promise<ScanRow["payload"] | null> {
  if (id === "demo") return DEMO_PAYLOAD;

  // Try scan id first.
  const byScan = (await sql`
    SELECT payload FROM scans
    WHERE id = ${id}
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `) as ScanRow[];
  if (byScan.length > 0 && byScan[0]?.payload) return byScan[0].payload;

  // Fall back to handle. Apply the same expiry guard as the scan-id branch
  // so an expired latest_scan doesn't render an OG card while /scan/<id> 404s.
  const byHandle = (await sql`
    SELECT s.payload FROM profiles p
    JOIN scans s ON s.id = p.latest_scan
    WHERE p.handle = ${id.toLowerCase()}
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
    LIMIT 1
  `) as ScanRow[];
  if (byHandle.length > 0 && byHandle[0]?.payload) return byHandle[0].payload;

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

    const verbs = (p.signature_verbs ?? []).slice(0, 3);
    const signature = verbs.map((v) => `· ${v}`).join(" ");

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#0b0b0f",
            color: "white",
            fontFamily: "system-ui",
            padding: 64,
          }}
        >
          <div style={{ fontSize: 120, fontWeight: 700 }}>
            {p.hours_with_cc ?? "—"}h
          </div>
          <div style={{ fontSize: 36 }}>hours with Claude Code</div>
          <div style={{ fontSize: 48, marginTop: 32 }}>
            Bench {p.score} · {p.tier}
          </div>
          <div style={{ fontSize: 28, marginTop: 16 }}>{signature}</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=86400, immutable",
        },
      },
    );
  } catch (err) {
    if (process.env["SENTRY_DSN"]) {
      Sentry.captureException(err, { extra: { route: "/api/og/[id]", id } });
    }
    return new Response("og render failed", { status: 500 });
  }
}
