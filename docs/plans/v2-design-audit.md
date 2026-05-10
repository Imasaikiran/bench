# v2 design audit — brutal pass

> **Date:** 2026-05-07.
> **Trigger:** founder review *"Go back to V2 itself. This is absolutely pathetic. Audit v2 with impeccable skill and design motion principle skills."*
> **Scope:** the v2 visual product as it sits on `main` HEAD `89ab4a9`. v1 frontend is FROZEN per spec §2 — audit findings about v1 markup go into a v2-layer override list, not into v1 edits.
> **Honesty rule:** the audit names what's bad before it names what to do.

---

## 1. The pathetic verdict (named, not softened)

The v2 visual product clears the spec but does not earn the share. Three hard failures:

### 1.1 The constellation is invisible

The atelier hero is the signature visual. v1 `styles.css` line 340 sets `#constellation { opacity: 0.22; }`. At 22% opacity on a `#08080A` background, the stars register as dust, not as a constellation. The hero `187h` sits on what looks like an empty black frame. The whole atelier-frame's gold corner brackets do not earn their existence — they outline an absence.

**Why this matters for the bet (§0.5.4):** the OG card pulls from the same visual language. If the constellation is not visually present in the hero, the share unit is just "a number on black." That converts at landing-page rates, not at portrait rates.

### 1.2 The OG card is a debug screen

`/api/og/[id]` renders four lines of text on black:

```
—h
hours with Claude Code
Bench 30 · Explorer
· build
```

No constellation, no signature mark, no color accent, no rhythm. This is the asset that goes to X, LinkedIn, Slack unfurls. It is the literal share unit. Every visit-through that sees this card decides whether to install based on it. Right now it loses to a bare blockquote tweet.

This is the highest-leverage fix in the entire product. The §11.2 napkin math depends on impressions × CTR; the OG card determines CTR.

### 1.3 Zero motion

Nothing fades in, nothing counts up, nothing scales beyond CSS color transition on hover. The score is presented at first paint as a number that has always been there. There is no reveal.

**Compare:** Wakatime's setup wizard shows minute counts ticking up on first load. github-readme-stats fades each card. CodersRank scrolls a histogram on first scroll. The bench card paints, sits there, ends.

The product has no animated signature. A reader sees the card, reads the number, leaves. Nothing about the experience says "this number was earned by something."

---

## 2. Secondary failures (real but smaller)

| Problem | Where | Severity |
|---------|-------|----------|
| Share buttons are bare rounded rectangles with no visual indication of what they post | `web/app/_components/ShareBar.tsx` | medium |
| Landing hero shows no portrait above the fold — copy + install line, then user has to scroll to the trust grid before any visual proof | `web/app/page.tsx` | medium |
| `/about` is text-only — no visual rhythm beyond section dividers, no type contrast moments | `web/app/about/page.tsx` | low |
| Chapter dial strip on `/demo` — 5 dials at 36px each, "WORKING / NEEDS WORK / STRONG" labels at 10px mono caps | `cli/src/assets/styles.css` (frozen) | low (mobile override fixes some of it) |
| Must-haves panel state-pill copy is inconsistent ("FOUNDATION TIER" vs "AUTOMATION FIX FIRST") | v1 frozen | accept and document |
| Recommendations panel below the must-haves is text-heavy, low visual hierarchy | `web/app/_components/Recommendations.tsx` | low |
| `/over-capacity` page is appropriate but visually disconnected from the rest of the site (light cream background, different palette) | `web/app/over-capacity/page.tsx` | very low |

---

## 3. Motion principles bench is missing

Six motion-design principles drawn from Disney's 12 → web-product distillation. None of these are about flashy animation; they are about earned attention.

| Principle | What it means in product | Where bench is missing it |
|-----------|--------------------------|---------------------------|
| **Slow-in/slow-out** | Easing is asymmetric — fast acceleration, slow deceleration. Movement feels intentional rather than mechanical. | All transitions are CSS `ease` linear-ish. No cubic-bezier discipline. |
| **Anticipation** | A small counter-movement before the reveal. Score doesn't jump from 0 to 62 — it ticks past briefly higher and settles, like a needle. | Score is rendered at final value at first paint. No anticipatory motion. |
| **Staging** | Sequence reveals so the eye travels in a designed order. Hero first, then tiles, then chapters, then must-haves. | All elements paint simultaneously. No staging. |
| **Follow-through** | The motion of a primary element trails into a secondary. When the score reveals, the constellation glow pulses. | Constellation is static SVG; never responds to the hero. |
| **Arc** | Movement curves through space rather than going in straight lines. Hover scale should rotate slightly. | Star hover (`#stars circle:hover { transform: scale(1.6); }`) is straight scale, no rotation. |
| **Solid drawing** | The element behaves as if it has weight. A button doesn't just change color on hover — it depresses. | All buttons change color only. No depth response. |

---

## 4. Prescription — what gets fixed in this audit

Listed from highest to lowest leverage. Highest two ship in this PR; the rest queue as numbered tasks.

### 4.1 [LANDS NOW] Constellation visibility — bump opacity, add glow, animate connect

v1 `styles.css` is frozen. We add a v2-layer override at `web/public/v2/atelier-overrides.css`:

- `#constellation { opacity: 0.55; filter: saturate(0.85) drop-shadow(0 0 20px rgba(201,169,110,0.15)); }` — moves the constellation from "dust" to "earned background."
- `#stars circle.bright` — give the gold accent dots a gentle keyframe pulse: `@keyframes star-pulse { 0% { filter: drop-shadow(0 0 10px rgba(201,169,110,0.65)); } 50% { filter: drop-shadow(0 0 18px rgba(201,169,110,0.85)); } 100% { ...0.65) } }` running at `4s ease-in-out infinite`.
- `#links line` — animate `stroke-dashoffset` on first paint so links draw in over 1.2s with a stagger.

All in the override layer; v1 file untouched.

### 4.2 [LANDS NOW] OG card complete redesign

`web/lib/og-render.tsx` rewritten. Goals:

1. Hero number bigger, with serif weight
2. Hours-meaning subtitle
3. Tier seal (gold accent border-radius pill) with score + tier
4. Signature verbs as a horizontal row with separator dots
5. Constellation glyph in upper-right corner (small SVG, gold accent)
6. wordmark + URL footer

The redesign uses Satori-compatible SVG (one inline `<svg>` with circles + connect lines) since Satori can't run external SVG resources. Test the byte size stays sane.

### 4.3 [LANDS NOW] Score reveal motion + cascade fade-in

Client component at `web/app/_components/HeroReveal.tsx` wraps the v1 hero and runs:

1. `requestAnimationFrame` count-up on the hero number from 0 → final over 1.4s with `easeOutCubic`.
2. Tile strip: each tile fade+rise (translateY 8px → 0, opacity 0 → 1) on a 80ms stagger after the hero starts.
3. Constellation: SVG gets a class that triggers the dash-offset draw-in.
4. Chapters dial strip: each dial's `--val` (the conic-gradient angle) animates from 0 to its true value over 900ms with 60ms stagger.

This is the audit's biggest behavior change. v1 styles + script are untouched; everything is added in the v2 layer.

### 4.4 [LANDS NOW] ShareBar visual upgrade

X and LinkedIn icons inline (small SVG glyphs, monochrome currentColor). Buttons get `box-shadow: 0 1px 0 rgba(0,0,0,0.4) inset, 0 4px 14px rgba(0,0,0,0.25)`. Hover: `transform: translateY(-1px)` plus shadow boost. Click: `translateY(0)` (depress). Tap targets stay ≥44px (already correct).

### 4.5 [LANDS NOW] Landing hero — small portrait teaser above the fold

A miniature mock-card to the right of the hero text on desktop (>900px viewport), or below the install line on mobile. Renders a stylized hour number ("187h"), tier seal, signature row — uses the same OG-card visual language so the landing is a literal preview of what the user will get. Static SVG, no JS.

### 4.6 [QUEUED, NOT THIS PR] Recommendations panel rhythm

Current: pure text list. Proposed: each row gets a small chapter-color accent strip (Foundation = gold-1, Automation = gold-2, etc.) on the left. Hover reveals the rubric line that would move if this rec is acted on.

### 4.7 [QUEUED, NOT THIS PR] /about type rhythm

Each section gets a tiny mono eyebrow ("01 — what it is", "02 — why this exists") in muted gold. Section h2s become italic serif at 32px instead of regular 28px. Section text becomes 18px serif instead of 17px sans. The page becomes a reading object, not a wall of paragraph.

---

## 5. Hard rules the audit refuses to break

1. **v1 frontend stays frozen.** Every visual fix is a v2-layer override or a v2 component. The v1-frozen test (`web/test/v1-frozen.test.ts`) hash pin must still pass.
2. **No new dependencies.** Motion ships in CSS keyframes + small `useEffect` count-up. No GSAP, no framer-motion, no react-spring.
3. **Mobile NFR §11 stays intact.** All animation respects `prefers-reduced-motion`. Tap targets stay ≥44px after every change.
4. **Performance budget — Lighthouse mobile must stay ≥90.** Animation runs on GPU-accelerated properties only (`opacity`, `transform`, `filter`); no layout-thrashing animations.
5. **Accessibility — `prefers-reduced-motion: reduce`** disables count-up, dial-fill animation, and constellation pulse. Static fallback shows the final state.

---

## 6. What "earned the share" looks like after these fixes

The reader lands on `/scan/<id>`. In the first 1.4 seconds:

1. The hero number ticks up from 0 to 187, easing out, settling like a meter needle.
2. The constellation behind it draws its own connect-lines, gold dots pulse softly.
3. The tile strip fades in left-to-right (weeks → skills → prompts → plan-mode).
4. The five chapter dials fill clockwise, in order, taking ~1.5 seconds total.
5. The must-haves panel slides up from below.
6. The ShareBar appears at the bottom with subtle elevation.

The user does not need to see all of this consciously. They just feel: *this number was earned.* Then they share.

---

## 7. Self-imposed kill criterion for this audit

If after these fixes Lighthouse mobile drops below 88 OR the OG card render time exceeds 1s p95 OR `/scan/<id>` largest contentful paint exceeds 2.5s, the audit failed and we revert the motion changes (constellation visibility + OG redesign stay; cascade reveal goes).
