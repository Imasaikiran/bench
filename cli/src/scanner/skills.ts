import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";

export type Skill = { dir: string; name: string | null; description: string | null };
export type SkillsReport = { total: number; items: Skill[] };

export async function readSkills(claudeHome: string): Promise<SkillsReport> {
  const root = join(claudeHome, "skills");
  const items: Skill[] = [];

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
      } else if (e.isFile() && e.name === "SKILL.md") {
        const text = await fs.readFile(p, "utf8");
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
  return { total: items.length, items };
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
