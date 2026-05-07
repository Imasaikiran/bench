import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { renderRubricMarkdown, type Rubric } from "../../lib/rubric-render";

export const dynamic = "force-static";

function isRubric(value: unknown): value is Rubric {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.version === "string" && !!v.chapters && typeof v.chapters === "object";
}

export default function HowWeScoredPage() {
  const parsed = load(readFileSync("../rubric/rubric.yaml", "utf8"));
  if (!isRubric(parsed)) {
    throw new Error(
      "rubric.yaml missing or malformed — expected { version, chapters }",
    );
  }
  const md = renderRubricMarkdown(parsed);
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
