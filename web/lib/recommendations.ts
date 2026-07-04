import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { PersonaShape, ChapterName, State } from "./mapper";

type Dimension = {
  id: number;
  name: string;
  weight: number;
  have_criteria: string;
  partial_criteria: string | null;
  rationale: string;
  sources: string[];
};
type Chapter = { slot_labels: string[]; dimensions: Dimension[] };
type Rubric = { version: string; chapters: Record<ChapterName, Chapter> };

const here = dirname(fileURLToPath(import.meta.url));
// rubric.yaml is bundled into the route's serverless package via
// outputFileTracingIncludes in next.config.js (see /api/scan setup).
const rubricPath = join(here, "..", "..", "rubric", "rubric.yaml");
const RUBRIC = yaml.load(readFileSync(rubricPath, "utf8")) as Rubric;

export const RUBRIC_VERSION: string = RUBRIC.version;

/**
 * One recommended action, sourced verbatim from rubric.yaml.
 * Every text field traces back to a `name` / `have_criteria` / `rationale`
 * entry — no editorial copy lives in this module.
 */
export type Recommendation = {
  chapter: ChapterName;
  dimensionId: number;
  state: Exclude<State, "have">;
  name: string;
  haveCriteria: string;
  partialCriteria: string | null;
  rationale: string;
  sources: string[];
  weight: number;
};

const CHAPTER_ORDER: ChapterName[] = [
  "Foundation",
  "Automation",
  "Delegation",
  "Craft",
  "Hygiene",
];

/**
 * Compute the prioritized list of action items from a PersonaShape.
 *
 * Ordering: missing before partial; within each, heavier weight first;
 * within same weight, the chapter order (Foundation -> Hygiene) wins.
 */
export function recommend(persona: PersonaShape): Recommendation[] {
  const out: Recommendation[] = [];
  for (const chapter of CHAPTER_ORDER) {
    const ch = RUBRIC.chapters[chapter];
    const states = persona.clusters[chapter] ?? [];
    for (let i = 0; i < ch.dimensions.length; i++) {
      const dim = ch.dimensions[i];
      const state = states[i];
      if (!dim || !state || state === "have") continue;
      out.push({
        chapter,
        dimensionId: dim.id,
        state,
        name: dim.name,
        haveCriteria: dim.have_criteria,
        partialCriteria: dim.partial_criteria,
        rationale: dim.rationale,
        sources: dim.sources,
        weight: dim.weight,
      });
    }
  }
  return out.sort((a, b) => {
    if (a.state !== b.state) return a.state === "missing" ? -1 : 1;
    if (a.weight !== b.weight) return b.weight - a.weight;
    return CHAPTER_ORDER.indexOf(a.chapter) - CHAPTER_ORDER.indexOf(b.chapter);
  });
}
