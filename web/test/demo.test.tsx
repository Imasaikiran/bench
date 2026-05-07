import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import DemoPage from "../app/demo/page";
import { getDemoPersona } from "../lib/demo-persona";

describe("getDemoPersona", () => {
  it("returns Priya with hours=187, score=62, tier=Tinkerer", () => {
    const p = getDemoPersona();
    expect(p.hours).toBe(187);
    expect(p.score).toBe(62);
    expect(p.tier).toBe("Tinkerer");
    expect(p.handle).toBe("@priya_dev");
  });
  it("eyebrow forced to explainer copy (not the default scanned-just-now)", () => {
    const p = getDemoPersona();
    expect(p.eyebrow).toBe("synthetic profile · fictional developer · shown for explainer purposes");
    expect(p.eyebrow).not.toContain("scanned just now");
  });
});

describe("/demo page", () => {
  it("renders the V1Page shell with Priya data injected", () => {
    const html = renderToString(<DemoPage />);
    expect(html).toContain("@priya_dev");
    expect(html).toContain("synthetic profile");
    expect(html).toContain('id="bench-root"');
  });
});
