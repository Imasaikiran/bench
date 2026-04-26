import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Payload } from "./payload.js";

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
  const [css, js, tpl] = await Promise.all([
    fs.readFile(join(assetsDir, "styles.css"), "utf8"),
    fs.readFile(join(assetsDir, "script.js"), "utf8"),
    fs.readFile(join(assetsDir, "offline-template.html"), "utf8"),
  ]);

  // Embed assets and persona into template.
  // JSON.stringify produces valid JS for our payload (no undefined/Date/Function),
  // so we embed it as a raw JS expression — no quote-escape gymnastics needed.
  const html = tpl
    .replaceAll("/*__STYLES__*/", css)
    .replaceAll("/*__SCRIPT__*/", js)
    .replaceAll("__PERSONA_JSON__", JSON.stringify(persona));

  await fs.writeFile(join(dir, "bench-scan.html"), html);
}
