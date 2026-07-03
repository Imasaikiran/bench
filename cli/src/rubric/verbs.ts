// Curated set of legitimate commit-subject verbs. Non-verbs that show up as the
// first token of commit subjects (weekly, wip, misc, v2, initial) are excluded.
const KNOWN_VERBS = new Set<string>([
  "add", "build", "fix", "refactor", "ship", "merge", "remove", "rename",
  "update", "improve", "clean", "test", "document", "wire", "extract",
  "revert", "split", "simplify", "harden", "migrate", "tune", "polish",
  "prune", "cache", "gate", "guard", "port", "bump", "format",
]);

export function isKnownVerb(token: string): boolean {
  return KNOWN_VERBS.has(token.trim().toLowerCase());
}

export function pickVerbs(tokens: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    if (isKnownVerb(t) && !out.includes(t.toLowerCase())) out.push(t.toLowerCase());
  }
  return out;
}
