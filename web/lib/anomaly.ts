import type { Payload } from "./schema";
import type { RescoreResult } from "./rubric";

/**
 * 5 anomaly rules per §10.3 item 10.
 * Returns a list of rule-name strings; empty list means no anomalies detected.
 */
export function detectAnomalies(p: Payload, scored: RescoreResult): string[] {
  const r: string[] = [];
  const sessionsTotal = Number(p.counts["sessions_total"] ?? 0);
  const skillsTotal = Number(p.counts["skills_total"] ?? 0);
  const coherence = Number(p.counts["coherence_score"] ?? 0);
  const skillsUnused = Number(p.counts["skills_unused_ratio"] ?? 0);

  if (scored.score > 85 && sessionsTotal < 10) r.push("score_high_sessions_low");
  if ((p.hours_with_cc ?? 0) > 500 && skillsTotal === 0) r.push("hours_high_no_skills");
  if (coherence === 1.0 && skillsUnused === 0) r.push("too_clean");
  if (p.weeks_on_cc > 100) r.push("weeks_absurd");
  if (scored.score !== p.score) r.push("client_reported_score_mismatch");

  return r;
}
