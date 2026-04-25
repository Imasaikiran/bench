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
  settings: Record<string, any>;
  settingsLocal: Record<string, any>;
  parseWarnings: string[];
};

const MAX_BYTES = 100 * 1024;

async function readText(path: string, warnings: string[]): Promise<string | null> {
  try {
    const stat = await fs.stat(path);
    if (!stat.isFile()) return null;
    if (stat.size > MAX_BYTES) {
      warnings.push(`${path} truncated (${stat.size}B > 100KB)`);
      const fd = await fs.open(path, "r");
      const buf = Buffer.alloc(MAX_BYTES);
      await fd.read(buf, 0, MAX_BYTES, 0);
      await fd.close();
      return buf.toString("utf8") + "\n<<truncated>>";
    }
    return fs.readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function readJson(path: string, warnings: string[]): Promise<Record<string, any>> {
  const text = await readText(path, warnings);
  if (text == null) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    warnings.push(`${path}: invalid JSON — using empty object`);
    return {};
  }
}

export async function readConfigSurface(claudeHome: string): Promise<ConfigSurface> {
  const warnings: string[] = [];
  const mdText = await readText(join(claudeHome, "CLAUDE.md"), warnings);
  let claudeMd: ClaudeMd | null = null;
  if (mdText !== null) {
    const headings = [...mdText.matchAll(/^#{1,6}\s+(.+)$/gm)].map(
      (m) => (m[1] ?? "").trim()
    );
    claudeMd = {
      lines: mdText.split("\n").length,
      bytes: Buffer.byteLength(mdText, "utf8"),
      headingCount: headings.length,
      distinctHeadings: new Set(headings.map((h) => h.toLowerCase())).size,
      truncated: mdText.endsWith("<<truncated>>"),
    };
  }
  return {
    claudeMd,
    settings: await readJson(join(claudeHome, "settings.json"), warnings),
    settingsLocal: await readJson(join(claudeHome, "settings.local.json"), warnings),
    parseWarnings: warnings,
  };
}
