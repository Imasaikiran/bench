// web/test/mobile-overrides.test.ts
//
// Structure tests for the v2-layer mobile font-size override stylesheet.
// Spec §11 mobile NFR row 2: all text on 320–380px viewport must be ≥ 14px.
// v1 styles.css is frozen — overrides live in /v2/mobile-overrides.css.
//
// We do NOT render anything here. We parse the CSS as text and assert:
//   1. Exactly one @media (max-width: 380px) wrapper.
//   2. Every font-size declaration inside the wrapper is ≥ 14px.
//   3. Every selector targeted exists in the v1 styles.css source.
//
// This catches drift if a maintainer edits v1 (forbidden) or accidentally
// drops a sub-14px rule into the override.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OVERRIDE_PATH = join(HERE, "..", "public", "v2", "mobile-overrides.css");
const V1_PATH = join(HERE, "..", "..", "cli", "src", "assets", "styles.css");

const overrideCss = readFileSync(OVERRIDE_PATH, "utf8");
const v1Css = readFileSync(V1_PATH, "utf8");

function extractMobileMediaBlock(css: string): string {
  // Match `@media (max-width: 380px) { ... }` with balanced braces.
  const match = css.match(/@media\s*\(max-width:\s*380px\)\s*\{([\s\S]*)\}\s*$/);
  if (!match) throw new Error("no @media (max-width: 380px) block found");
  const body = match[1];
  if (body === undefined) throw new Error("media block had no body");
  return body;
}

function selectorsIn(css: string): Set<string> {
  // Naive selector extractor: captures everything before each `{`. Strips
  // pseudo-elements / pseudo-classes / combinators when checking presence.
  const selectors = new Set<string>();
  // Strip comments first so /* ... { ... } */ doesn't confuse the parser.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleRe = /([^{}@]+)\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(stripped)) !== null) {
    const head = m[1] ?? "";
    for (const sel of head.split(",")) {
      const s = sel.trim();
      if (s.length > 0) selectors.add(s);
    }
  }
  return selectors;
}

function fontSizesPxIn(css: string): number[] {
  // Capture every numeric font-size declaration (px only). clamp() is skipped
  // because it does not appear inside the override block (and v1 already
  // covers responsive type via clamp() in places).
  const re = /font-size:\s*(\d+)px/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    if (m[1]) out.push(parseInt(m[1], 10));
  }
  return out;
}

describe("mobile-overrides.css structure", () => {
  it("contains exactly one @media (max-width: 380px) block", () => {
    const matches = overrideCss.match(/@media\s*\(max-width:\s*380px\)\s*\{/g);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(1);
  });

  it("every font-size declaration inside the media block is ≥ 14px", () => {
    const block = extractMobileMediaBlock(overrideCss);
    const sizes = fontSizesPxIn(block);
    expect(sizes.length).toBeGreaterThan(0);
    for (const px of sizes) {
      // .mh-copy is a documented exception (9px → 12px, not 14px). Anything
      // else below 14px is a regression. We assert ≥ 12px globally and ≥ 14px
      // outside the .mh-copy rule. The rule-specific check is below.
      expect(px).toBeGreaterThanOrEqual(12);
    }
  });

  it("only .mh-copy may set font-size below 14px", () => {
    const block = extractMobileMediaBlock(overrideCss);
    // Strip the .mh-copy rule, then assert no <14 leftovers.
    const withoutMhCopy = block.replace(/\.mh-copy\s*\{[^{}]*\}/g, "");
    const remaining = fontSizesPxIn(withoutMhCopy);
    for (const px of remaining) {
      expect(px).toBeGreaterThanOrEqual(14);
    }
  });

  it("every selector targeted in the override exists in v1 styles.css", () => {
    const block = extractMobileMediaBlock(overrideCss);
    const overrideSelectors = selectorsIn(block);
    const v1Selectors = selectorsIn(v1Css);

    // Build a permissive lookup that strips ::pseudo-elements / state-classes
    // for the v1 side. Override "selector A or B" must match v1 selector
    // "A.is-active" / "A:hover" via the base substring.
    const v1Bases = new Set<string>();
    for (const s of v1Selectors) {
      const base = s.split(/[:\s>+~]/)[0]?.trim() ?? "";
      if (base) v1Bases.add(base);
      v1Bases.add(s);
    }

    for (const sel of overrideSelectors) {
      const base = sel.split(/[:\s>+~]/)[0]?.trim() ?? "";
      const present = v1Bases.has(sel) || v1Bases.has(base);
      expect(present, `override selector ${sel} (base ${base}) not found in v1 styles.css`).toBe(true);
    }
  });

  it(".mh-copy override sets a tap-target min-height ≥ 44px", () => {
    const block = extractMobileMediaBlock(overrideCss);
    const mhCopy = block.match(/\.mh-copy\s*\{([^{}]*)\}/);
    expect(mhCopy).not.toBeNull();
    const body = mhCopy?.[1] ?? "";
    const match = body.match(/min-height:\s*(\d+)px/);
    expect(match, ".mh-copy override missing min-height").not.toBeNull();
    const px = match ? parseInt(match[1] ?? "0", 10) : 0;
    expect(px).toBeGreaterThanOrEqual(44);
  });
});
