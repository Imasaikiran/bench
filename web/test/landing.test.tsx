// web/test/landing.test.tsx
// Locks key landing-page invariants — copy regression catcher.
// Strategy: invoke the async server component, then renderToStaticMarkup the
// returned tree. Async server components are functions that return a Promise
// of a React element, so we await it before passing to the renderer.
import { describe, it, expect, beforeAll, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Landing from "../app/page";

describe("landing page copy invariants", () => {
  let html = "";
  beforeAll(async () => {
    // Default-mode render: no searchParams, NODE_ENV from vitest (test).
    // This means the local-preview link will render (NODE_ENV !== "production")
    // and the phase-0 banner will render (BENCH_LAUNCH_PHASE unset).
    const tree = await Landing({});
    html = renderToStaticMarkup(tree);
  });

  it("contains the npx install command exactly", () => {
    // CopyInstall is a client component; SSR renders the literal text.
    expect(html).toContain("npx @imasaikiran/bench");
  });

  it("links to /demo as primary CTA", () => {
    expect(html).toMatch(/href="\/demo"/);
  });

  it("links to /how-we-scored", () => {
    expect(html).toMatch(/href="\/how-we-scored"/);
  });

  it("links to /rubric", () => {
    expect(html).toMatch(/href="\/rubric"/);
  });

  it("does NOT promise the CLI is live (Phase 0/1 framing)", () => {
    // After launch, this assertion can flip. Until then guard against
    // "the CLI is live" being merged before npm publish.
    expect(html.toLowerCase()).not.toContain("the cli is live");
  });

  // UX audit §3 — trust grid compressed 6 rows → 4. TTL folded into the
  // egress row; zero-revenue moved to /about (spec §14 non-goals).
  it("trust posture covers the 4 core spec §10.2 items", () => {
    const lower = html.toLowerCase();
    expect(lower).toContain("open-source scanner");
    expect(lower).toContain("no llm in the scoring path");
    expect(lower).toContain("consent gate");
    expect(lower).toContain("only numbers leave");
    expect(lower).toContain("auto-delete"); // TTL folded into the egress row
  });

  it("hero h1 exists and is non-empty", () => {
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    expect(m).not.toBeNull();
    expect((m?.[1] ?? "").replace(/<[^>]+>/g, "").trim().length).toBeGreaterThan(10);
  });

  // UX audit §3.5 — the bet detail moved to /about. The landing body keeps a
  // one-line "Why this exists" with a pointer to /about, not the full essay.
  // (The Phase-0 launch banner still links phase0-signal intentionally; that
  // is the banner, not the bet section, so we don't assert its absence.)
  it("points to /about for the bet", () => {
    expect(html).toMatch(/href="\/about"/);
    expect(html.toLowerCase()).toContain("why this exists");
  });

  it("renders the Phase-0 banner when BENCH_LAUNCH_PHASE is unset (default)", () => {
    expect(html).toContain("data-phase-banner");
    expect(html).toContain("the rubric is open");
  });

  it("renders the local-preview link in non-production NODE_ENV (default test env)", () => {
    expect(html).toContain("data-local-preview");
    expect(html).toMatch(/href="\/scan\/local"/);
  });
});

describe("landing — Phase-1 launched (BENCH_LAUNCH_PHASE=1)", () => {
  it("hides the Phase-0 banner once the env var flips", async () => {
    const original = process.env["BENCH_LAUNCH_PHASE"];
    process.env["BENCH_LAUNCH_PHASE"] = "1";
    try {
      const tree = await Landing({});
      const html = renderToStaticMarkup(tree);
      expect(html).not.toContain("data-phase-banner");
    } finally {
      if (original === undefined) delete process.env["BENCH_LAUNCH_PHASE"];
      else process.env["BENCH_LAUNCH_PHASE"] = original;
    }
  });
});

describe("landing — production NODE_ENV without ?preview=1", () => {
  it("hides the local-preview link in production unless ?preview=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const tree = await Landing({});
      const html = renderToStaticMarkup(tree);
      expect(html).not.toContain("data-local-preview");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("shows the local-preview link in production WHEN ?preview=1 is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const tree = await Landing({ searchParams: Promise.resolve({ preview: "1" }) });
      const html = renderToStaticMarkup(tree);
      expect(html).toContain("data-local-preview");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
