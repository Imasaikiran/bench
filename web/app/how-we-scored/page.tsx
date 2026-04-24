import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { renderRubricMarkdown } from "../../lib/rubric-render";

export const dynamic = "force-static";

export default function HowWeScoredPage() {
  const rubric = load(
    readFileSync("../rubric/rubric.yaml", "utf8"),
  ) as Parameters<typeof renderRubricMarkdown>[0];
  const md = renderRubricMarkdown(rubric);
  return (
    <main>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {md}
      </pre>
    </main>
  );
}
