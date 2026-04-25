export type PreviewInput = {
  hours_with_cc: number | null | undefined;
  score: number;
  tier: string;
  weeks_on_cc: number;
};

export function renderPreview(p: PreviewInput): string {
  const scoreLine = `Bench ${p.score} · ${p.tier} · Wk ${p.weeks_on_cc}`;

  if (typeof p.hours_with_cc === "number" && Number.isFinite(p.hours_with_cc) && p.hours_with_cc >= 0) {
    return `${p.hours_with_cc}h\n  hours with Claude Code\n\n${scoreLine}`;
  }

  return `(scoring without hours yet — come back in a week)\n\n${scoreLine}`;
}
