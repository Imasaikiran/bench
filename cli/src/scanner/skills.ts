import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export type Skill = {
  /** Parent directory containing SKILL.md (e.g. `skills/foo` for `skills/foo/SKILL.md`). */
  dir: string;
  name: string | null;
  description: string | null;
};
export type SkillsReport = { total: number; items: Skill[]; parseWarnings: string[] };

export async function readSkills(claudeHome: string): Promise<SkillsReport> {
  const root = join(claudeHome, "skills");
  const items: Skill[] = [];
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
      } else if (e.isFile() && e.name === "SKILL.md") {
        let text: string;
        try {
          text = await fs.readFile(p, "utf8");
        } catch (err) {
          warnings.push(
            `${p}: ${(err as NodeJS.ErrnoException).code ?? "UNKNOWN"} — skipped`
          );
          continue;
        }
        const fm = parseFrontmatter(text);
        const name =
          typeof fm["name"] === "string" ? fm["name"] : null;
        const description =
          typeof fm["description"] === "string" ? fm["description"] : null;
        items.push({ dir, name, description });
      }
    }
  }

  await walk(root);
  return { total: items.length, items, parseWarnings: warnings };
}
