import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export type CommandsReport = { total: number; withDescription: number; parseWarnings: string[] };

export async function readCommands(claudeHome: string): Promise<CommandsReport> {
  const root = join(claudeHome, "commands");
  let total = 0;
  let withDescription = 0;
  const warnings: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        warnings.push(
          `${dir}: ${(e as NodeJS.ErrnoException).code ?? "UNKNOWN"} — skipped`
        );
      }
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        let text: string;
        try {
          text = await fs.readFile(p, "utf8");
        } catch (err) {
          warnings.push(
            `${p}: ${(err as NodeJS.ErrnoException).code ?? "UNKNOWN"} — skipped`
          );
          continue;
        }
        total++;
        const fm = parseFrontmatter(text);
        const description = fm["description"];
        if (typeof description === "string" && description.trim().length > 0) {
          withDescription++;
        }
      }
    }
  }

  await walk(root);
  return { total, withDescription, parseWarnings: warnings };
}
