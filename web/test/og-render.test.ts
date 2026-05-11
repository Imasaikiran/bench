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
import { PRIYA_OG } from "./__fixtures__/priya";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// PRIYA_OG without handle — pre-claim anonymous render path. Keeps the
// renderToBuffer() byte-shape test scoped to the minimal payload contract
// (no handle dependence in the PNG signature).
const PRIYA_OG_ANON = { ...PRIYA_OG, handle: null };

async function renderToBuffer(): Promise<Buffer> {
  const res = new ImageResponse(
    ogCard(PRIYA_OG_ANON),
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

  // Visual regression catcher — locks key signal lines from the design audit
  // §4.2 (constellation glyph, gold seal, signature row, handle footer).
  // We don't byte-diff the PNG (rendering is non-deterministic across font
  // versions); we assert the JSX structure produces the right text content
  // by walking the React element tree.
  it("includes the wordmark, hero, hours caption, tier seal, signature, and handle footer", () => {
    const tree = ogCard(PRIYA_OG);
    const seen = collectText(tree);
    expect(seen).toContain("bench");
    expect(seen).toContain("187h");
    expect(seen).toContain("hours with Claude Code");
    expect(seen).toContain("Bench 62 · Tinkerer");
    expect(seen).toMatch(/you install/);
    expect(seen).toMatch(/you prune/);
    expect(seen).toMatch(/you question/);
    expect(seen).toContain("bench.dev/u/priya_dev");
  });

  it("falls back to bench.dev (no /u/ path) when handle is missing", () => {
    const tree = ogCard({
      hours_with_cc: 12,
      score: 24,
      tier: "Explorer",
      signature_verbs: ["build"],
    });
    const seen = collectText(tree);
    expect(seen).toContain("bench.dev");
    expect(seen).not.toMatch(/bench\.dev\/u\//);
  });

  it("uses '—h' + 'scanning still in progress' caption when hours hidden", () => {
    const tree = ogCard({
      hours_with_cc: null,
      score: 18,
      tier: "Explorer",
      signature_verbs: [],
    });
    const seen = collectText(tree);
    expect(seen).toContain("—h");
    expect(seen).toContain("scanning still in progress");
    expect(seen).toContain("scanned just now");
  });
});

// ────────────────────── helpers ──────────────────────

/** Walks a React element tree and returns the joined text content. */
function collectText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props: { children?: unknown } }).props;
    return collectText(props.children);
  }
  return "";
}
