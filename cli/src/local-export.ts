import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Payload } from "./payload.js";

/**
 * Escape a JSON string for safe embedding inside an HTML `<script>` block.
 *
 * JSON.stringify does NOT escape `<`, so a value containing `</script>` would
 * prematurely close the script tag and allow runnable JS injection.
 * This applies the OWASP HTML-script-context escapes.
 */
function htmlScriptEscape(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Extract the body of v1/index.html and strip its bootstrap <script src="script.js">.
 * Mirrors web/lib/v1render.tsx so the offline page renders the same constellation
 * markup that v1's script.js expects to paint into.
 */
export function extractV1Body(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!m || !m[1]) {
    throw new Error("v1-index.html missing <body> -- frozen markup invariant violated");
  }
  return m[1].replace(
    /<script\b[^>]*\bsrc=["']script\.js["'][^>]*><\/script>\s*/gi,
    "",
  );
}

/**
 * Repoint v1's bootstrap script at the injected real persona (`_current`,
 * populated from `window.__BENCH_PERSONA__` by offline-template.html) instead
 * of the hardcoded synthetic `priya` persona.
 *
 * script.js is a generated copy of web/public/v1/script.js (overwritten by
 * `pnpm prebuild`'s copy:assets step), so this patch must be applied here at
 * export time rather than to the asset file directly.
 *
 * @throws If any of the three expected anchors are missing (frozen markup
 * invariant violated — v1's script.js has drifted from what this patch expects).
 */
export function patchScriptForRealPersona(js: string): string {
  const personasDecl = "const PERSONAS = {";
  if (!js.includes(personasDecl)) {
    throw new Error(
      "script.js missing 'const PERSONAS = {' -- frozen markup invariant violated",
    );
  }
  const patchedPersonas = js.replace(
    personasDecl,
    `${personasDecl} _current: window.__BENCH_PERSONA__,`,
  );

  const currentPersonaDecl = /let currentPersona = ['"]priya['"];/;
  if (!currentPersonaDecl.test(patchedPersonas)) {
    throw new Error(
      "script.js missing \"let currentPersona = 'priya';\" -- frozen markup invariant violated",
    );
  }
  const patchedDefault = patchedPersonas.replace(
    currentPersonaDecl,
    "let currentPersona = '_current';",
  );

  const applyPersonaCall = /applyPersona\(['"]priya['"]\)/g;
  if (!applyPersonaCall.test(patchedDefault)) {
    throw new Error(
      "script.js missing \"applyPersona('priya')\" -- frozen markup invariant violated",
    );
  }
  return patchedDefault.replace(applyPersonaCall, "applyPersona('_current')");
}

/**
 * Strip the v1 persona-preview switcher chrome from the extracted body markup.
 * The switcher (Sam / Priya / Maya / Alex toggle) only makes sense in the
 * hosted prototype preview; a real scan should not offer to switch to a
 * stranger's data.
 *
 * @throws If the `<aside class="persona-switcher" ...>...</aside>` block is
 * not found (frozen markup invariant violated — v1's markup has drifted).
 */
export function stripPersonaSwitcher(body: string): string {
  const switcherRe = /<aside\b[^>]*\bclass="persona-switcher"[^>]*>[\s\S]*?<\/aside>\s*/i;
  if (!switcherRe.test(body)) {
    throw new Error(
      'v1-index.html missing <aside class="persona-switcher"> -- frozen markup invariant violated',
    );
  }
  return body.replace(switcherRe, "");
}

/**
 * Replace the "synthetic preview" footer marker with an honest label for a
 * real scan.
 *
 * @throws If the "synthetic preview" text is not found in the footer (frozen
 * markup invariant violated — v1's footer copy has drifted).
 */
export function stripSyntheticFooterMarker(body: string): string {
  const markerRe = /v0\.3 · synthetic preview/i;
  if (!markerRe.test(body)) {
    throw new Error(
      '"synthetic preview" footer marker not found -- frozen markup invariant violated',
    );
  }
  return body.replace(markerRe, "v0.3 · local scan");
}

/**
 * Substitute all four template tokens in a single regex pass over `tpl`.
 *
 * A single-pass approach prevents chain-replacement bugs where injected asset
 * content (e.g. CSS containing the literal `__PERSONA_JSON__`) would be
 * re-processed by a later replaceAll call.
 */
export function substituteTemplate(
  tpl: string,
  css: string,
  js: string,
  personaJson: string,
  body: string,
): string {
  const map: Record<string, string> = {
    "/*__STYLES__*/": css,
    "/*__SCRIPT__*/": js,
    "__PERSONA_JSON__": personaJson,
    "<!--__BODY__-->": body,
  };
  return tpl.replace(
    /\/\*__STYLES__\*\/|\/\*__SCRIPT__\*\/|__PERSONA_JSON__|<!--__BODY__-->/g,
    (m) => map[m]!,
  );
}

/**
 * Write a local export of a bench scan to `dir`.
 *
 * Emits two files:
 *   - `bench-scan.json` — pretty-printed payload (idempotent: overwrites if present)
 *   - `bench-scan.html` — single self-contained HTML file with all CSS and JS
 *     inlined and the persona object embedded as a JS expression. No external
 *     requests are made by this file. (idempotent: overwrites if present)
 *
 * Asset files (styles.css, script.js) are loaded lazily inside this function —
 * no I/O occurs at import time. Task 1.21's prebuild script will overwrite the
 * stub assets with the real v1 frontend files from web/public/v1/.
 *
 * @throws If `dir` does not exist or is not accessible.
 */
export async function writeLocalExport(
  dir: string,
  payload: Payload,
  persona: unknown,
): Promise<void> {
  // Validate dir exists before doing any work
  try {
    await fs.access(dir);
  } catch {
    throw new Error(`writeLocalExport: directory does not exist or is not accessible: ${dir}`);
  }

  // Write JSON payload
  await fs.writeFile(join(dir, "bench-scan.json"), JSON.stringify(payload, null, 2));

  // Load asset files (lazy — no import-time I/O)
  const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "assets");
  const [css, js, tpl, v1Index] = await Promise.all([
    fs.readFile(join(assetsDir, "styles.css"), "utf8"),
    fs.readFile(join(assetsDir, "script.js"), "utf8"),
    fs.readFile(join(assetsDir, "offline-template.html"), "utf8"),
    fs.readFile(join(assetsDir, "v1-index.html"), "utf8"),
  ]);

  // HTML-script-context escape the persona JSON (I-1: prevents </script> injection).
  // substituteTemplate performs a single-pass replacement (I-2: no chain substitution).
  const safePersonaJson = htmlScriptEscape(JSON.stringify(persona));

  // Point the frozen v1 render at the injected real persona and strip preview
  // chrome (C1: the scanned user's real data must render, not synthetic Priya).
  const patchedJs = patchScriptForRealPersona(js);
  let v1Body = extractV1Body(v1Index);
  v1Body = stripPersonaSwitcher(v1Body);
  v1Body = stripSyntheticFooterMarker(v1Body);

  const html = substituteTemplate(tpl, css, patchedJs, safePersonaJson, v1Body);

  await fs.writeFile(join(dir, "bench-scan.html"), html);
}
