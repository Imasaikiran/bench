import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";

export type CommandsReport = { total: number; withDescription: number };

export async function readCommands(claudeHome: string): Promise<CommandsReport> {
  const root = join(claudeHome, "commands");
  let total = 0;
  let withDescription = 0;

  async function walk(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        total++;
        const text = await fs.readFile(p, "utf8");
        const fm = parseFrontmatter(text);
        const description = fm["description"];
        if (typeof description === "string" && description.trim().length > 0) {
          withDescription++;
        }
      }
    }
  }

  await walk(root);
  return { total, withDescription };
}

function parseFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  try {
    return (yamlLoad(m[1] ?? "") as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}
