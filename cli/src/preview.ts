const CHAPTER_ORDER = ["Foundation", "Automation", "Delegation", "Craft", "Coherence"] as const;

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const GOLD = "\x1b[38;5;179m";

// Keep the identity line short enough that an 80-col terminal never wraps it.
const IDENTITY_MAX_WIDTH = 72;

export type PreviewInput = {
  hours_with_cc: number | null | undefined;
  score: number;
  tier: string;
  weeks_on_cc: number;
  identity: string;
  chapters: Record<string, number>;
  url: string;
  hours_meaning?: string;
};

export type PreviewOptions = {
  color?: boolean;
};

function defaultColorEnabled(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env["NO_COLOR"];
}

function bar(score: number, cells = 10): string {
  const filled = Math.max(0, Math.min(cells, Math.round((score / 100) * cells)));
  return "▓".repeat(filled) + "░".repeat(cells - filled);
}

/** Truncate at the last sentence boundary (". ") that fits within maxWidth. Never cuts mid-word. */
function truncateIdentity(identity: string, maxWidth: number): string {
  if (identity.length <= maxWidth) return identity;
  const upToLimit = identity.slice(0, maxWidth);
  const lastSentenceEnd = upToLimit.lastIndexOf(". ");
  if (lastSentenceEnd > 0) {
    return upToLimit.slice(0, lastSentenceEnd + 1);
  }
  // No sentence boundary within the limit — fall back to the last word boundary.
  const lastSpace = upToLimit.lastIndexOf(" ");
  if (lastSpace > 0) {
    return upToLimit.slice(0, lastSpace);
  }
  return upToLimit;
}

function padName(name: string, width: number): string {
  return name + " ".repeat(Math.max(0, width - name.length));
}

export function renderPreview(p: PreviewInput, opts?: PreviewOptions): string {
  const color = opts?.color ?? defaultColorEnabled();
  const bold = color ? BOLD : "";
  const dim = color ? DIM : "";
  const gold = color ? GOLD : "";
  const reset = color ? RESET : "";

  const lines: string[] = [""];

  const validHours =
    typeof p.hours_with_cc === "number" && Number.isFinite(p.hours_with_cc) && p.hours_with_cc >= 0;

  if (validHours) {
    lines.push(`  ${bold}${gold}${p.hours_with_cc}h${reset}`);
    lines.push(`  ${dim}hours with Claude Code${reset}`);
    if (p.hours_meaning) {
      lines.push(`  ${dim}${p.hours_meaning}${reset}`);
    }
  } else {
    lines.push("  (scoring without hours yet — come back in a week)");
  }

  lines.push("");
  lines.push(`  ${p.tier} · Bench ${p.score} · Wk ${p.weeks_on_cc}`);
  lines.push("");

  const nameWidth = Math.max(...CHAPTER_ORDER.map((n) => n.length));
  for (const name of CHAPTER_ORDER) {
    const score = p.chapters[name] ?? 0;
    lines.push(`  ${padName(name, nameWidth)}  ${bar(score)}  ${score}`);
  }

  lines.push("");
  lines.push(`  ${truncateIdentity(p.identity, IDENTITY_MAX_WIDTH)}`);
  lines.push(p.url);

  return lines.join("\n");
}
