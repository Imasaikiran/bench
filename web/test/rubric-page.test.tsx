import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import RubricPage from "../app/rubric/page";
import type { Rubric } from "../lib/rubric-render";

describe("/rubric page", () => {
  const rubric = load(readFileSync("../rubric/rubric.yaml", "utf8")) as Rubric;
  // React's renderToString inserts <!-- --> markers between adjacent text
  // expressions; strip them so substring assertions read like the rendered DOM.
  const html = renderToString(<RubricPage />).replace(/<!--\s*-->/g, "");

  it("renders the page with version line", () => {
    expect(html).toContain(`rubric v${rubric.version}`);
    expect(html).toContain("The bench rubric.");
  });

  it("includes every chapter name from rubric.yaml", () => {
    for (const chapterName of Object.keys(rubric.chapters)) {
      expect(html).toContain(chapterName);
    }
  });

  it("renders one card per dimension (count matches YAML)", () => {
    const totalDimensions = Object.values(rubric.chapters).reduce(
      (n, ch) => n + ch.dimensions.length,
      0,
    );
    for (let id = 1; id <= totalDimensions; id++) {
      expect(html).toMatch(new RegExp(`#${id}\\b`));
    }
    // Sanity: rubric v0.1.0 has exactly 25 dimensions.
    expect(totalDimensions).toBe(25);
  });
});
