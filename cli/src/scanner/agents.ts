import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export type AgentsReport = {
  total: number;
  withDescription: number;
  reviewAgent: boolean;
  testAgent: boolean;
  parseWarnings: string[];
};

// §5.5 dim 14/15: literal "review" / "test" in agent name or description
const REVIEW_RE = /review/i;
const TEST_RE = /test/i;

export async function readAgents(claudeHome: string): Promise<AgentsReport> {
  const root = join(claudeHome, "agents");
  let total = 0;
  let withDescription = 0;
  let reviewAgent = false;
  let testAgent = false;
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
        const name = typeof fm["name"] === "string" ? fm["name"] : "";
        const description =
          typeof fm["description"] === "string" ? fm["description"] : "";

        if (description.trim().length > 0) {
          withDescription++;
        }

        const searchStr = `${name} ${description}`;
        if (REVIEW_RE.test(searchStr)) reviewAgent = true;
        if (TEST_RE.test(searchStr)) testAgent = true;
      }
    }
  }

  await walk(root);
  return { total, withDescription, reviewAgent, testAgent, parseWarnings: warnings };
}
