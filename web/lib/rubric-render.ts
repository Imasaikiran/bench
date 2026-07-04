export type Dim = {
  id: number;
  name: string;
  weight: number;
  have_criteria: string;
  partial_criteria: string | null;
  rationale: string;
  sources: string[];
};

export type Rubric = {
  version: string;
  chapters: Record<string, { slot_labels: string[]; dimensions: Dim[] }>;
};

export function renderRubricMarkdown(r: Rubric): string {
  const lines: string[] = [];
  lines.push(`# How we scored: rubric v${r.version}\n`);
  for (const [name, ch] of Object.entries(r.chapters)) {
    lines.push(`## ${name}\n`);
    for (const d of ch.dimensions) {
      lines.push(`### #${d.id} ${d.name} (weight ${d.weight})`);
      lines.push(`- **have:** ${d.have_criteria}`);
      if (d.partial_criteria) lines.push(`- **partial:** ${d.partial_criteria}`);
      lines.push(`- **why:** ${d.rationale}`);
      if (d.sources.length) {
        lines.push(
          `- **sources:** ${d.sources.map((s) => `<${s}>`).join(", ")}`,
        );
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}
