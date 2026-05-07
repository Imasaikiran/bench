import { promises as fs } from "node:fs";
import { join } from "node:path";

export type ClaudeMd = {
  lines: number;
  bytes: number;
  headingCount: number;
  distinctHeadings: number;
  truncated: boolean;
};

export type ConfigSurface = {
  claudeMd: ClaudeMd | null;
  settings: Record<string, unknown>;
  settingsLocal: Record<string, unknown>;
  parseWarnings: string[];
};

const MAX_BYTES = 100 * 1024;

type ReadTextResult = { text: string; truncated: boolean };

async function readText(
  path: string,
  warnings: string[]
): Promise<ReadTextResult | null> {
  try {
    const stat = await fs.stat(path);
    if (!stat.isFile()) {
      warnings.push(`${path}: not a regular file — skipping`);
      return null;
    }
    if (stat.size > MAX_BYTES) {
      warnings.push(`${path} truncated (${stat.size}B > 100KB)`);
      const fd = await fs.open(path, "r");
      try {
        const buf = Buffer.alloc(MAX_BYTES);
        const { bytesRead } = await fd.read(buf, 0, MAX_BYTES, 0);
        return { text: buf.subarray(0, bytesRead).toString("utf8"), truncated: true };
      } finally {
        await fd.close();
      }
    }
    return { text: await fs.readFile(path, "utf8"), truncated: false };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
    warnings.push(`${path}: ${code} — using empty/null`);
    return null;
  }
}

async function readJson(
  path: string,
  warnings: string[]
): Promise<Record<string, unknown>> {
  const result = await readText(path, warnings);
  if (result == null) return {};
  try {
    return JSON.parse(result.text) as Record<string, unknown>;
  } catch {
    warnings.push(`${path}: invalid JSON — using empty object`);
    return {};
  }
}

export async function readConfigSurface(claudeHome: string): Promise<ConfigSurface> {
  const warnings: string[] = [];
  const mdResult = await readText(join(claudeHome, "CLAUDE.md"), warnings);
  let claudeMd: ClaudeMd | null = null;
  if (mdResult !== null) {
    const { text, truncated } = mdResult;
    const headings = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(
      (m) => (m[1] ?? "").trim()
    );
    claudeMd = {
      lines: text.split("\n").length,
      bytes: Buffer.byteLength(text, "utf8"),
      headingCount: headings.length,
      distinctHeadings: new Set(headings.map((h) => h.toLowerCase())).size,
      truncated,
    };
  }
  return {
    claudeMd,
    settings: await readJson(join(claudeHome, "settings.json"), warnings),
    settingsLocal: await readJson(join(claudeHome, "settings.local.json"), warnings),
    parseWarnings: warnings,
  };
}
