import { describe, it, expect } from "vitest";
import { renderPreview } from "../src/preview";

const BASE = {
  hours_with_cc: 187,
  score: 62,
  tier: "Tinkerer",
  weeks_on_cc: 14,
  identity: "445 skills across 73 projects.",
  chapters: { Foundation: 48, Automation: 10, Delegation: 33, Craft: 28, Coherence: 8 },
  url: "bench.dev",
};

describe("renderPreview terminal card", () => {
  it("renders hero + tier + wk + chapters + identity + url", () => {
    const s = renderPreview(BASE, { color: false });
    expect(s).toContain("187h");
    expect(s).toContain("hours with Claude Code");
    expect(s).toContain("Bench 62");
    expect(s).toContain("Tinkerer");
    expect(s).toContain("Wk 14");
    expect(s).toContain("445 skills across 73 projects.");
    expect(s.split("\n").at(-1)).toBe("  bench.dev");
  });

  it("shows the hero hours and all five chapter names", () => {
    const out = renderPreview(BASE, { color: false });
    expect(out).toMatch(/161|187/);
    for (const c of ["Foundation", "Automation", "Delegation", "Craft", "Coherence"]) {
      expect(out).toMatch(new RegExp(c));
    }
  });

  it("draws a proportional bar per chapter", () => {
    const out = renderPreview(BASE, { color: false });
    expect(out).toMatch(/[▓█][▓█░ ]*░/);
  });

  it("ends with the URL and fits one screenshot (<= 16 lines)", () => {
    const out = renderPreview(BASE, { color: false });
    const lines = out.split("\n");
    expect(lines.length).toBeLessThanOrEqual(16);
    expect(lines[lines.length - 1]).toMatch(/bench\.dev/);
  });

  it("omits ANSI codes when color is disabled", () => {
    const out = renderPreview(BASE, { color: false });
    expect(out).not.toMatch(/\[/);
  });

  it("includes ANSI codes when color is enabled", () => {
    const out = renderPreview(BASE, { color: true });
    // eslint-disable-next-line no-control-regex
    expect(out).toMatch(/\x1b\[/);
  });

  it("defaults to no color when not a TTY (deterministic in test env)", () => {
    const out = renderPreview(BASE);
    // vitest's stdout is not a TTY — no color escapes expected by default
    // eslint-disable-next-line no-control-regex
    expect(out).not.toMatch(/\x1b\[/);
  });

  it("hides hero and shows honest no-hours copy when hours_with_cc is null", () => {
    const s = renderPreview({ ...BASE, hours_with_cc: null }, { color: false });
    expect(s).not.toContain("h\n  hours with Claude Code");
    expect(s).toContain("scoring without hours yet");
    expect(s).toContain("come back in a week");
    const lines = s.split("\n");
    expect(lines.length).toBeLessThanOrEqual(16);
    expect(lines[lines.length - 1]).toBe("  bench.dev");
  });

  it("URL line carries the same 2-space gutter as the rest of the card (both branches)", () => {
    const withHours = renderPreview(BASE, { color: false });
    const noHours = renderPreview({ ...BASE, hours_with_cc: null }, { color: false });
    expect(withHours.split("\n").at(-1)).toBe("  bench.dev");
    expect(noHours.split("\n").at(-1)).toBe("  bench.dev");
  });

  // I-1: bad hours_with_cc values fall back to the no-hours hero
  it("undefined hours -> fallback string", () => {
    const s = renderPreview({ ...BASE, hours_with_cc: undefined }, { color: false });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("undefinedh");
  });
  it("NaN hours -> fallback string", () => {
    const s = renderPreview({ ...BASE, hours_with_cc: NaN }, { color: false });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("NaNh");
  });
  it("Infinity hours -> fallback string", () => {
    const s = renderPreview({ ...BASE, hours_with_cc: Infinity }, { color: false });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("Infinityh");
  });
  it("-1 hours -> fallback string", () => {
    const s = renderPreview({ ...BASE, hours_with_cc: -1 }, { color: false });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("-1h");
  });
  it("0 hours -> renders '0h' hero", () => {
    const s = renderPreview({ ...BASE, hours_with_cc: 0 }, { color: false });
    expect(s).toContain("0h");
    expect(s).toContain("hours with Claude Code");
  });

  it("bar proportionality: score 100 -> all filled cells, no empty", () => {
    const input = {
      ...BASE,
      chapters: { Foundation: 100, Automation: 100, Delegation: 100, Craft: 100, Coherence: 100 },
    };
    const out = renderPreview(input, { color: false });
    const foundationLine = out.split("\n").find((l) => l.includes("Foundation"));
    expect(foundationLine).toBeDefined();
    expect(foundationLine).not.toMatch(/░/);
  });

  it("bar proportionality: score 0 -> all empty cells, no filled", () => {
    const input = {
      ...BASE,
      chapters: { Foundation: 0, Automation: 0, Delegation: 0, Craft: 0, Coherence: 0 },
    };
    const out = renderPreview(input, { color: false });
    const foundationLine = out.split("\n").find((l) => l.includes("Foundation"));
    expect(foundationLine).toBeDefined();
    expect(foundationLine).not.toMatch(/[▓█]/);
  });

  it("truncates an over-long identity line at a sentence boundary, never mid-word", () => {
    const longIdentity =
      "You ship fast. You refactor without fear. You delegate to subagents constantly. You write tests before code. You document everything you touch.";
    const out = renderPreview({ ...BASE, identity: longIdentity }, { color: false });
    const identityLine = out.split("\n").find((l) => l.trim().startsWith("You ship fast."));
    expect(identityLine).toBeDefined();
    const trimmed = identityLine!.trim();
    expect(trimmed.length).toBeLessThan(longIdentity.length);
    // must end at a sentence boundary (period), never mid-word
    expect(trimmed.endsWith(".")).toBe(true);
    expect(longIdentity.startsWith(trimmed)).toBe(true);
  });

  it("founder-style two-clause line over budget cuts at its sentence boundary, no ellipsis", () => {
    // 122 chars total; first sentence is 89 chars, which fits the 100-char budget,
    // so the cut lands on the ". " boundary and needs no ellipsis.
    const founder =
      "445 skills installed across 73 projects: you collect capability faster than you spend it. You add more than anything else.";
    const out = renderPreview({ ...BASE, identity: founder }, { color: false });
    const identityLine = out.split("\n").find((l) => l.trim().startsWith("445 skills installed"));
    expect(identityLine).toBeDefined();
    expect(identityLine!.trim()).toBe(
      "445 skills installed across 73 projects: you collect capability faster than you spend it.",
    );
  });

  it("over-budget line with no sentence boundary ends with an ellipsis, never mid-word", () => {
    // 135 chars, no ". " anywhere — word-boundary fallback fires and appends "…".
    const noBoundary =
      "you collect capability faster than you spend it and you keep collecting it across every project you have ever touched in this workspace";
    const out = renderPreview({ ...BASE, identity: noBoundary }, { color: false });
    const identityLine = out.split("\n").find((l) => l.trim().startsWith("you collect"));
    expect(identityLine).toBeDefined();
    const trimmed = identityLine!.trim();
    expect(trimmed.endsWith("…")).toBe(true);
    // strip the ellipsis: what remains must be a prefix of the original that
    // ends exactly at a word boundary (next char in the original is a space)
    const body = trimmed.slice(0, -1);
    expect(noBoundary.startsWith(body)).toBe(true);
    expect(noBoundary[body.length]).toBe(" ");
  });

  it("wires the optional meaning line under the hero when present", () => {
    const out = renderPreview(
      { ...BASE, hours_meaning: "~20 workdays of pair-programming" },
      { color: false },
    );
    expect(out).toContain("~20 workdays of pair-programming");
    const lines = out.split("\n");
    expect(lines.length).toBeLessThanOrEqual(16);
    expect(lines[lines.length - 1]).toBe("  bench.dev");
  });

  // S-2/S-3 predecessor: exact hero byte sequence — now covered structurally
  // above (hero hours, label, tier/score/wk line) rather than a full-string
  // pin, since the card now carries chapters + identity + url too.
  it("exact fallback substrings still present without hours", () => {
    const s = renderPreview({ ...BASE, hours_with_cc: null }, { color: false });
    expect(s).toContain("(scoring without hours yet — come back in a week)");
    expect(s).toContain("Tinkerer · Bench 62 · Wk 14");
  });
});
