import { readFileSync } from "node:fs";
import { load as yamlLoad } from "js-yaml";

export type RubricDimension = {
  id: number;
  name: string;
  weight: number;
  have_criteria?: string;
  partial_criteria?: string | null;
  rationale?: string;
  sources?: string[];
};

export type RubricChapter = {
  slot_labels?: string[];
  dimensions: RubricDimension[];
};

export type Rubric = {
  version: string;
  chapters: Record<string, RubricChapter>;
  // tiers, etc — leave permissive
  [key: string]: unknown;
};

export function loadRubric(path: string): Rubric {
  const parsed = yamlLoad(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`loadRubric: ${path} did not parse to an object`);
  }
  return parsed as Rubric;
}
