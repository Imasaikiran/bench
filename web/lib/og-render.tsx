// web/lib/og-render.tsx
// Shared OG-card renderer. Used by:
//   - web/app/api/og/[id]/route.tsx (production edge route)
//   - web/scripts/render-og-local.ts (offline preview before Vercel deploy)
//   - web/test/og-render.test.ts (PNG signature + dimension assertions)
//
// We export the JSX node and the call-site assembles ImageResponse with
// caching headers / runtime-specific concerns. Keeps this file isomorphic
// across edge + node + tsx-script.

// React import needed because tsx (esbuild) defaults to classic JSX mode
// in scripts/test-runner contexts where Next's "jsx: preserve" doesn't
// apply. The route file inherits Next's transform + needs no import.
import React from "react";
import type { ReactElement } from "react";

export type OgPayload = {
  hours_with_cc: number | null;
  score: number;
  tier: string;
  signature_verbs: string[];
};

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Render the OG-card React tree for a given payload. Caller wraps it in
 * @vercel/og's ImageResponse (or Satori directly).
 */
export function ogCard(payload: OgPayload): ReactElement {
  const verbs = (payload.signature_verbs ?? []).slice(0, 3);
  const signature = verbs.map((v) => `· ${v}`).join(" ");
  const hero = payload.hours_with_cc ?? "—";

  // @vercel/og (Satori) requires every multi-child div to set display:flex
  // explicitly. Numeric+string sibling text nodes count as multi-child too —
  // we join into single string children to keep each div clean.
  const heroLine = `${hero}h`;
  const seal = `Bench ${payload.score} · ${payload.tier}`;

  return (
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
      <div style={{ fontSize: 120, fontWeight: 700 }}>{heroLine}</div>
      <div style={{ fontSize: 36 }}>hours with Claude Code</div>
      <div style={{ fontSize: 48, marginTop: 32 }}>{seal}</div>
      <div style={{ fontSize: 28, marginTop: 16 }}>{signature}</div>
    </div>
  );
}
