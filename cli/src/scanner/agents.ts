import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";

export type AgentsReport = {
  total: number;
  withDescription: number;
  reviewAgent: boolean;
  testAgent: boolean;
};

// §5.5 dim 14/15 detection regex
const REVIEW_RE = /review|critic|qa/i;
const TEST_RE = /test|tdd/i;

export async function readAgents(claudeHome: string): Promise<AgentsReport> {
  const root = join(claudeHome, "agents");
  let total = 0;
  let withDescription = 0;
  let reviewAgent = false;
  let testAgent = false;

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
  return { total, withDescription, reviewAgent, testAgent };
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
