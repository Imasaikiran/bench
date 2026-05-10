// web/lib/v1render.tsx
//
// CONCERN (render-shim gap):
//   v1/script.js boots with `applyPersona('priya')` -- a hardcoded string.
//   It does NOT read any `window.__BENCH_KEY__` variable; there is no
//   runtime key-selector mechanism in the frozen script.
//
//   Shim strategy: we override `window.PERSONAS` so that the key "priya"
//   points to the real user's PersonaShape. Boot calls `PERSONAS["priya"]`
//   and renders the correct data. The persona-switcher buttons (Sam/Priya/
//   Maya/Alex) lose their distinct personas -- clicking them all shows the
//   same injected data, which is acceptable for a real user's portrait page.
//
//   We also set `window.__BENCH_PERSONA__` for any future v1 revision that
//   adds a key-selector hook. Do NOT edit public/v1/script.js -- it is
//   hash-pinned by web/test/v1-frozen.test.ts.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactElement } from "react";
import { FeedbackForm } from "../app/_components/FeedbackForm";
import { HeroReveal } from "../app/_components/HeroReveal";
import { Recommendations } from "../app/_components/Recommendations";
import { ShareBar } from "../app/_components/ShareBar";
import type { PersonaShape } from "./mapper";

const here = dirname(fileURLToPath(import.meta.url));
const v1HtmlPath = join(here, "..", "public", "v1", "index.html");
// Read once at module load -- cheap and avoids per-request I/O.
const V1_HTML = readFileSync(v1HtmlPath, "utf8");

// Server-side origin for og:image and ShareBar prop. Client components cannot
// read BENCH_PUBLIC_ORIGIN directly (no NEXT_PUBLIC_ prefix); we pass it as a
// prop from this server component instead.
const ORIGIN = process.env["BENCH_PUBLIC_ORIGIN"] ?? "https://bench.dev";

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!m || !m[1]) {
    throw new Error("v1/index.html missing <body> — frozen markup invariant violated");
  }
  // Drop v1's bootstrap <script src="script.js"> — V1Page injects /v1/script.js
  // itself with a defer attribute. Leaving the original tag would issue a
  // 404 on every render (resolves relative to the route path, not /v1/).
  return m[1].replace(
    /<script\b[^>]*\bsrc=["']script\.js["'][^>]*><\/script>\s*/gi,
    "",
  );
}

/**
 * Escapes a JSON string for safe inline embedding inside a <script> tag.
 * Prevents </script> injection and handles U+2028 / U+2029 line-terminator
 * characters that are valid in JSON strings but illegal in JS scripts.
 */
function htmlScriptEscape(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/-->/g, "--\\u003e")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

/**
 * V1Page renders the v1 portrait as a React fragment.
 *
 * It does NOT emit <html>/<head>/<body> — those are owned by app/layout.tsx.
 * Per-page og:image and title metadata are set via generateMetadata() exports
 * on the individual route pages (/scan/[id], /u/[handle]).
 * The Plausible script is injected once by app/layout.tsx.
 *
 * `scanId` (optional) flows down to <FeedbackForm>. Anonymous renders without
 * a scanId — e.g. /demo (synthetic Priya) — get no feedback affordance,
 * which is intentional per spec §5.8 (synthetic data should not pollute
 * the feedback signal).
 */
export function V1Page({
  persona,
  scanId,
}: {
  persona: PersonaShape;
  scanId?: string;
}): ReactElement {
  const personaJson = htmlScriptEscape(JSON.stringify(persona));

  // v1's script.js declares `const PERSONAS = {...}` at top-level — that's
  // script-scoped, NOT window.PERSONAS, so we cannot override the data from
  // outside the script. BUT v1's render functions (renderHero, renderAtelier,
  // renderChapters, renderMustHaves) are top-level `function` declarations,
  // which DO become window properties in a classic script. We exploit that:
  // after window 'load' (which fires AFTER all defer scripts have run their
  // DOMContentLoaded handlers, including v1's `applyPersona('priya')`), we
  // re-invoke the render functions with our injected persona, overwriting
  // every text node v1 just painted with its hardcoded fallback.
  const shimScript =
    `window.__BENCH_PERSONA__ = ${personaJson};` +
    `window.addEventListener('load', function() {` +
    `  var p = window.__BENCH_PERSONA__;` +
    `  if (typeof window.renderHero === 'function') window.renderHero(p);` +
    `  if (typeof window.renderAtelier === 'function') window.renderAtelier(p);` +
    `  if (typeof window.renderChapters === 'function') window.renderChapters(p);` +
    `  if (typeof window.renderMustHaves === 'function') window.renderMustHaves(p);` +
    `});`;

  return (
    <>
      <link rel="stylesheet" href="/v1/styles.css" />
      {/* v2-layer mobile overrides — must load AFTER v1 so the cascade
          resolves the !important rules correctly. Spec §11 NFR. */}
      <link rel="stylesheet" href="/v2/mobile-overrides.css" />
      {/* v2-layer atelier visual upgrades — constellation glow, link draw-in,
          star pulse. v1 frontend stays frozen.
          Spec: docs/plans/v2-design-audit.md §4.1. */}
      <link rel="stylesheet" href="/v2/atelier-overrides.css" />
      {/* Shim must execute before v1 script.js so PERSONAS is overridden */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: shimScript }}
      />
      <div
        id="bench-root"
        // v1 was authored as a static HTML prototype, not React-validated —
        // browser-side parsing may auto-correct nested tags slightly, causing
        // a benign hydration warning that is not a real mismatch. Suppress.
        suppressHydrationWarning
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: extractBody(V1_HTML) }}
      />
      <Recommendations persona={persona} />
      <FeedbackForm scanId={scanId} />
      <ShareBar persona={persona} origin={ORIGIN} />
      <script src="/v1/script.js" defer />
      <HeroReveal />
    </>
  );
}
