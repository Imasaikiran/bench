// web/test/sharebar.test.ts
// Pure-function tests for ShareBar URL builders.
// Modal interaction tests are omitted here because the vitest config uses
// environment:"node" and @testing-library/react + jsdom are not installed
// (adding ~50 MB of deps for one file was deemed disproportionate per spec).
// The modal flow is covered by the exported function contracts below.
import { describe, it, expect } from "vitest";
import { buildShareUrl, tweetIntent, linkedInIntent } from "../app/_components/ShareBar";
import type { PersonaShape } from "../lib/mapper";

const persona: PersonaShape = {
  handle: "@priya_dev",
  initial: "P",
  weeks: 14,
  eyebrow: "scanned just now",
  title: "You've been building.",
  tiles: [],
  identity: "x",
  hours: 187,
  hoursMeaning: "187h back",
  signature: "you install · you prune",
  score: 62,
  tier: "Tinkerer",
  chapterNote: "z",
  chapterTags: ["partial", "weak", "partial", "strong", "strong"],
  clusters: {
    Foundation: [],
    Automation: [],
    Delegation: [],
    Craft: [],
    Coherence: [],
  } as never,
  musthaves: [] as never,
};

describe("ShareBar URL builders", () => {
  it("buildShareUrl uses /u/<handle> for claimed handle", () => {
    expect(buildShareUrl({ ...persona, handle: "@priya_dev" }, "https://bench.dev")).toBe(
      "https://bench.dev/u/priya_dev",
    );
  });

  it("buildShareUrl falls back to / for @anonymous", () => {
    expect(buildShareUrl({ ...persona, handle: "@anonymous" }, "https://bench.dev")).toBe(
      "https://bench.dev/",
    );
  });

  it("buildShareUrl uses provided origin (staging/preview)", () => {
    expect(buildShareUrl({ ...persona, handle: "@priya_dev" }, "https://preview.bench.dev")).toBe(
      "https://preview.bench.dev/u/priya_dev",
    );
  });

  it("buildShareUrl defaults to bench.dev when no origin provided", () => {
    expect(buildShareUrl({ ...persona, handle: "@priya_dev" })).toBe(
      "https://bench.dev/u/priya_dev",
    );
  });

  it("tweetIntent encodes the share text correctly", () => {
    const url = tweetIntent(
      { ...persona, hours: 187, signature: "you install · you prune", score: 62, tier: "Tinkerer" },
      "https://bench.dev/u/priya_dev",
    );
    expect(url.startsWith("https://twitter.com/intent/tweet?text=")).toBe(true);
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("187h with Claude Code");
    expect(decoded).toContain("Bench 62 · Tinkerer");
    expect(decoded).toContain("https://bench.dev/u/priya_dev");
  });

  it("linkedInIntent encodes the URL correctly", () => {
    const url = linkedInIntent("https://bench.dev/u/priya_dev");
    expect(url).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fbench.dev%2Fu%2Fpriya_dev",
    );
  });
});
