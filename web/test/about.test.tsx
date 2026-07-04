// web/test/about.test.tsx
// Pin /about page invariants. /about is a sync server component, no async
// plumbing — straight renderToStaticMarkup works.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import About from "../app/about/page";

describe("/about", () => {
  const html = renderToStaticMarkup(<About />);

  it("contains the 'anxious improver' framing (spec §0.5.2 primary user)", () => {
    expect(html.toLowerCase()).toContain("anxious improver");
  });

  it("links to the founder's GitHub", () => {
    expect(html).toMatch(/github\.com\/Imasaikiran/i);
  });

  it("links to /rubric and /how-we-scored", () => {
    expect(html).toMatch(/href="\/rubric"/);
    expect(html).toMatch(/href="\/how-we-scored"/);
  });

  it("does NOT mention LinkedIn (scope creep guard — anti-bio)", () => {
    expect(html.toLowerCase()).not.toContain("linkedin");
  });

  it("references the design spec at docs/specs/", () => {
    expect(html).toMatch(/2026-04-25-bench-v2-design/);
  });

  it("sets the metadata description to mention 'open scorecard' and 'no AI in scoring'", async () => {
    // Metadata is exported separately. Import the module's metadata directly.
    const mod = await import("../app/about/page");
    const desc = (mod.metadata?.description ?? "") as string;
    expect(desc.toLowerCase()).toContain("open scorecard");
    expect(desc.toLowerCase()).toContain("no ai in scoring");
  });
});
