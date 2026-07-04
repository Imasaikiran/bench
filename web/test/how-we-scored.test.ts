import { describe, it, expect } from "vitest";
import { renderRubricMarkdown } from "../lib/rubric-render";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

describe("renderRubricMarkdown", () => {
  it("renders all 25 dimensions + version header", () => {
    const rubric: any = load(readFileSync("../rubric/rubric.yaml", "utf8"));
    const md = renderRubricMarkdown(rubric);
    expect(md).toContain(`rubric v${rubric.version}`);
    for (let id = 1; id <= 25; id++) {
      // NOTE: dropped leading \b vs plan's `\\b#${id}\\b` — `#` is a non-word
      // char so a left word boundary cannot fire next to it. Intent (each id
      // appears as a standalone token) is preserved by the trailing \b.
      expect(md).toMatch(new RegExp(`#${id}\\b`));
    }
    expect(md).toContain("## Foundation");
    expect(md).toContain("## Hygiene");
  });
});
