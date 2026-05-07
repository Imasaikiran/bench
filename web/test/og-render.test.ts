// web/test/og-render.test.ts
//
// Verifies the shared OG-card renderer produces a valid 1200x630 PNG.
// We invoke @vercel/og's ImageResponse directly (it works in Node, not just
// edge), pull the bytes via arrayBuffer(), and parse the PNG signature +
// IHDR chunk to confirm dimensions.
//
// This test catches drift between web/lib/og-render.tsx and the production
// route, which both share the same JSX. If a bytes-on-the-wire format change
// would break X / LinkedIn unfurls, this test fires before launch.

import { describe, it, expect } from "vitest";
import { ImageResponse } from "@vercel/og";
import { ogCard, OG_WIDTH, OG_HEIGHT } from "../lib/og-render";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function renderToBuffer(): Promise<Buffer> {
  const res = new ImageResponse(
    ogCard({
      hours_with_cc: 187,
      score: 62,
      tier: "Tinkerer",
      signature_verbs: ["install", "prune", "question"],
    }),
    { width: OG_WIDTH, height: OG_HEIGHT },
  );
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

describe("og-render shared component", () => {
  it("returns a buffer with the PNG signature", async () => {
    const buf = await renderToBuffer();
    expect(buf.length).toBeGreaterThan(1000); // sanity floor
    expect(buf.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  }, 15_000);

  it("produces 1200×630 PNG (matches OG_WIDTH × OG_HEIGHT exports)", async () => {
    const buf = await renderToBuffer();
    // PNG IHDR chunk: bytes 8..16 are length+type, 16..24 are width+height
    // big-endian 4-byte ints.
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(OG_WIDTH);
    expect(height).toBe(OG_HEIGHT);
    expect(OG_WIDTH).toBe(1200);
    expect(OG_HEIGHT).toBe(630);
  }, 15_000);

  it("renders even when hours_with_cc is null (hours_hidden case)", async () => {
    const res = new ImageResponse(
      ogCard({
        hours_with_cc: null,
        score: 18,
        tier: "Explorer",
        signature_verbs: ["build"],
      }),
      { width: OG_WIDTH, height: OG_HEIGHT },
    );
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  }, 15_000);

  it("renders with empty signature_verbs without throwing", async () => {
    const res = new ImageResponse(
      ogCard({ hours_with_cc: 5, score: 10, tier: "Explorer", signature_verbs: [] }),
      { width: OG_WIDTH, height: OG_HEIGHT },
    );
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(1000);
  }, 15_000);
});
