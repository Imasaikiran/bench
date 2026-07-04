// web/lib/og-render.tsx
// Shared OG-card renderer. Used by:
//   - web/app/api/og/[id]/route.tsx (production edge route)
//   - web/scripts/render-og-local.ts (offline preview before Vercel deploy)
//   - web/test/og-render.test.ts (PNG signature + dimension assertions)
//
// Per docs/plans/v2-design-audit.md §4.2: this is the highest-leverage
// share unit in the product. It must NOT look like a debug screen.
//
// Design language matches v1 atelier:
//   - serif hero number, weight 400
//   - gold accent (#C9A96E)
//   - constellation glyph in upper-right (small inline SVG)
//   - tier seal (gold pill with score + tier)
//   - signature verbs row with mid-dot separators
//   - bench wordmark + URL footer
//
// Satori constraints:
//   - every multi-child <div> needs explicit display:flex
//   - text children must be single strings (no `${a} ${b}` JSX siblings)
//   - SVG works inline; no external image refs
//
// React import needed because tsx (esbuild) defaults to classic JSX mode
// in scripts/test-runner contexts where Next's "jsx: preserve" doesn't apply.

import React from "react";
import type { ReactElement } from "react";

export type OgPayload = {
  hours_with_cc: number | null;
  score: number;
  tier: string;
  signature_verbs: string[];
  handle?: string | null;
};

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Palette mirrors v1 styles.css :root vars.
const COLORS = {
  bg: "#08080A",
  bgGradTop: "#0c0c10",
  bgGradBottom: "#06060A",
  fg: "#F4F1EA",
  fg2: "#C9C4B8",
  muted: "#6B6660",
  border: "#28262B",
  accent: "#C9A96E",
  accentSoft: "rgba(201, 169, 110, 0.18)",
  accentBorder: "rgba(201, 169, 110, 0.35)",
};

// Constellation glyph: 12 stars connected by 6 lines, scaled into 220×140.
// Stars positioned to evoke v1 constellation without copying the exact
// 25-dimension layout (this is the share-unit signature, not the rubric).
function ConstellationGlyph(): ReactElement {
  const stars = [
    { x: 12, y: 28, r: 3, bright: true },
    { x: 48, y: 14, r: 2.5, bright: false },
    { x: 80, y: 38, r: 3.5, bright: true },
    { x: 110, y: 22, r: 2, bright: false },
    { x: 140, y: 52, r: 4, bright: true },
    { x: 178, y: 30, r: 2.5, bright: false },
    { x: 200, y: 70, r: 3, bright: true },
    { x: 32, y: 86, r: 2, bright: false },
    { x: 70, y: 102, r: 3, bright: true },
    { x: 108, y: 118, r: 2.5, bright: false },
    { x: 152, y: 96, r: 2.5, bright: false },
    { x: 188, y: 124, r: 3, bright: true },
  ];
  const links: Array<[number, number]> = [
    [0, 2], [2, 4], [4, 6], [1, 3], [7, 8], [8, 9], [9, 10], [4, 10], [10, 11],
  ];
  return (
    <svg width="220" height="140" viewBox="0 0 220 140" style={{ display: "flex" }}>
      {links.map(([a, b], i) => {
        const sa = stars[a]!;
        const sb = stars[b]!;
        return (
          <line
            key={i}
            x1={sa.x}
            y1={sa.y}
            x2={sb.x}
            y2={sb.y}
            stroke={COLORS.accent}
            strokeOpacity="0.25"
            strokeWidth="1"
          />
        );
      })}
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill={s.bright ? COLORS.accent : "none"}
          stroke={s.bright ? "none" : COLORS.muted}
          strokeWidth={s.bright ? 0 : 1}
          strokeDasharray={s.bright ? undefined : "2 2"}
          opacity={s.bright ? 0.95 : 0.55}
        />
      ))}
    </svg>
  );
}

export function ogCard(payload: OgPayload): ReactElement {
  const verbs = (payload.signature_verbs ?? []).slice(0, 3);
  const hasVerbs = verbs.length > 0;
  // Mid-dot is U+00B7 (·); the separator the rest of the product uses.
  const signatureLine = hasVerbs
    ? verbs.map((v) => `you ${v}`).join("  ·  ")
    : "scanned just now";
  const heroLine = payload.hours_with_cc !== null ? `${payload.hours_with_cc}h` : "-h";
  const heroSubtitle =
    payload.hours_with_cc !== null ? "hours with Claude Code" : "scanning still in progress";
  const sealLine = `Bench ${payload.score} · ${payload.tier}`;
  const handleLine = payload.handle ? `bench.dev/u/${payload.handle}` : "bench.dev";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, ${COLORS.bgGradTop} 0%, ${COLORS.bgGradBottom} 100%)`,
        color: COLORS.fg,
        fontFamily: "Georgia, serif",
        padding: "56px 72px",
        position: "relative",
      }}
    >
      {/* Top strip: bench wordmark on left, constellation glyph on right */}
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Georgia, serif",
            fontSize: 32,
            letterSpacing: "-0.02em",
            color: COLORS.fg,
          }}
        >
          {/* "bench." with the dot in gold */}
          <div style={{ display: "flex" }}>bench</div>
          <div style={{ display: "flex", color: COLORS.accent, fontStyle: "italic" }}>.</div>
        </div>
        <ConstellationGlyph />
      </div>

      {/* Hero block: number + subtitle + meaning */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 36,
          flexGrow: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 200,
            fontWeight: 400,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: COLORS.fg,
            textShadow: "0 0 60px rgba(201, 169, 110, 0.18)",
          }}
        >
          {heroLine}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
            fontSize: 16,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: COLORS.muted,
            marginTop: 18,
          }}
        >
          {heroSubtitle}
        </div>
      </div>

      {/* Bottom bar: tier seal pill + signature verbs row + handle */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Tier seal — gold-bordered pill */}
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Georgia, serif",
              fontSize: 30,
              fontStyle: "italic",
              color: COLORS.accent,
              padding: "10px 26px",
              border: `1px solid ${COLORS.accentBorder}`,
              borderRadius: 999,
              background: COLORS.accentSoft,
              letterSpacing: "-0.005em",
            }}
          >
            {sealLine}
          </div>
        </div>

        {/* Signature verbs */}
        <div
          style={{
            display: "flex",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 26,
            color: COLORS.fg2,
            letterSpacing: "0.005em",
          }}
        >
          {signatureLine}
        </div>

        {/* Handle / URL */}
        <div
          style={{
            display: "flex",
            fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
            fontSize: 18,
            color: COLORS.muted,
            letterSpacing: "0.06em",
          }}
        >
          {handleLine}
        </div>
      </div>
    </div>
  );
}
