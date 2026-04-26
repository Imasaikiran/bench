import { describe, it, expect } from "vitest";
import { reScoreFromCounts } from "../lib/rubric";
import { scoreFromCounts } from "../../cli/src/rubric/score";
import { loadRubric } from "../../cli/src/rubric/load";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rubricPath = join(here, "..", "..", "rubric", "rubric.yaml");

// A handful of representative count snapshots covering tier bands.
// Borrowed shape from cli/test/fixtures snapshot tests.
const FIXTURES: Array<{ name: string; counts: Record<string, unknown> }> = [
  {
    name: "explorer-ish (mostly missing)",
    counts: {
      sessions_total: 4, weeks_active: 1, plan_mode_ratio: 0,
      skills_total: 0, skills_active: 0, skills_unused_ratio: 0,
      hooks_total: 0, agents_total: 0, mcp_servers: 0,
      claude_md_present: 0, claude_md_lines: 0,
      coherence_score: 0,
    },
  },
  {
    name: "tinkerer-ish",
    counts: {
      sessions_total: 60, weeks_active: 8, plan_mode_ratio: 0.05,
      skills_total: 6, skills_active: 4, skills_unused_ratio: 0.33,
      hooks_total: 0, agents_total: 0, mcp_servers: 1,
      claude_md_present: 1, claude_md_lines: 80,
      coherence_score: 0.6,
    },
  },
  {
    name: "operator-ish",
    counts: {
      sessions_total: 350, weeks_active: 24, plan_mode_ratio: 0.18,
      skills_total: 18, skills_active: 14, skills_unused_ratio: 0.22,
      hooks_total: 4, agents_total: 3, mcp_servers: 5,
      claude_md_present: 1, claude_md_lines: 220,
      coherence_score: 0.85,
    },
  },
];

describe("rubric port parity (cli vs web)", () => {
  const rubric = loadRubric(rubricPath);
  for (const f of FIXTURES) {
    it(`${f.name} — score and chapters match`, () => {
      const cli = scoreFromCounts(f.counts, rubric);
      const web = reScoreFromCounts(f.counts);
      // cli returns { score, chapters }; web returns { score, tier, chapters, rubricVersion }.
      // Only compare the overlapping fields to avoid shape mismatch failures.
      expect(web.score).toBe(cli.score);
      expect(web.chapters).toEqual(cli.chapters);
    });
  }
});
