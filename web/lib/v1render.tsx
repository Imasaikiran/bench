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
import type { PersonaShape } from "./mapper";

const here = dirname(fileURLToPath(import.meta.url));
const v1HtmlPath = join(here, "..", "public", "v1", "index.html");
// Read once at module load -- cheap and avoids per-request I/O.
const V1_HTML = readFileSync(v1HtmlPath, "utf8");

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
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function V1Page({ persona }: { persona: PersonaShape }): ReactElement {
  const personaJson = htmlScriptEscape(JSON.stringify(persona));
  // Strip leading "@" for URL segments (og:image, share URLs).
  const bareHandle = persona.handle.replace(/^@/, "");
  const ogImageUrl = `https://bench.dev/api/og/${bareHandle}`;

  // Shim injects persona data under "priya" key (v1 boot hardcodes
  // `applyPersona('priya')`) and also under "_current" for forward compat.
  // window.__BENCH_PERSONA__ is a forward-looking hook -- unused by v1.0.0.
  const shimScript =
    `window.__BENCH_PERSONA__ = ${personaJson};` +
    `window.PERSONAS = { priya: ${personaJson}, _current: ${personaJson} };` +
    `window.__BENCH_KEY__ = "_current";`;

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/v1/styles.css" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:title" content={`${persona.handle} on bench`} />
        <meta name="description" content={`${persona.handle} -- Bench ${persona.score} -- ${persona.tier}`} />
      </head>
      <body>
        {/* Shim must execute before v1 script.js so PERSONAS is overridden */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: shimScript }}
        />
        <div
          id="bench-root"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: extractBody(V1_HTML) }}
        />
        <script src="/v1/script.js" defer />
      </body>
    </html>
  );
}
