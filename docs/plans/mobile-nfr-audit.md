# Mobile NFR audit — bench v2

> **Scope:** Spec §11 mobile viewport rows. Audit run on amended spec + current `v2-dev` HEAD.
> **Audit date:** 2026-05-05.
> **Verdict:** Most NFR items met after changes in this PR. One item deferred to v2.1 (font-size floor) with rationale.

---

## 1. Spec rows audited

| # | NFR | Threshold | Status | Evidence |
|---|-----|-----------|--------|----------|
| 1 | Viewport (320–380px): one scroll, no horizontal scrollbar | scrollbar absent | **PASS (after fix)** | `app/layout.tsx` now exports `viewport = { width: "device-width", initialScale: 1, maximumScale: 5 }`. Without this, mobile browsers emulate a 980px viewport and the v1 layout overflows. |
| 2 | Viewport (320–380px): font ≥ 14px | violated by v1 frozen CSS | **DEFERRED to v2.1** | v1 `cli/src/assets/styles.css` has 18 rules at 9–13px (eyebrows, labels, captions). v1 is FROZEN per spec §2 — editing it breaks the persona-shape contract guard and the `web/test/v1-frozen.test.ts` hash pin. v2.1 will introduce a `min-font-size` mobile override layer. |
| 3 | Viewport (320–380px): tap targets ≥ 44px | hard requirement | **PASS (after fix)** | `web/app/_components/ShareBar.tsx` buttons bumped to `min-height: 44px`, `padding: 0.85rem 1.4rem`, `font-size: 0.95rem`. Total computed height ≥ 46px. Stacking layout < 380px (`flex-direction: column`). |
| 4 | Viewport (381–768px): card full-width | hard requirement | **PASS** | v1 `.constellation-stage` already uses `clamp()` and `max-width: var(--maxw)`. Inspection at 414px shows full-width fill. |
| 5 | Viewport (381–768px): constellation legible | qualitative | **PASS** | v1 `.cluster-label` font-size 11px is borderline but legible at 414px+; SVG dots scale via clamp. |
| 6 | Viewport (381–768px): share button thumb-reachable | bottom-region placement | **PASS** | ShareBar renders after `<Recommendations>` at the bottom of `V1Page`. On a 700px-tall iPhone 14 Pro viewport the buttons land in the lower thumb zone after one scroll. |
| 7 | OG image 1200×630 (X/LinkedIn safe), legible at 600×315 (Slack) | rendered text legibility | **PASS** | `web/app/api/og/[id]/route.tsx` sets `width: 1200, height: 630`. Hero number uses `fontSize: 192px` per current OG impl. At 50% scale (600×315) hero is 96px — well above legibility floor. Manual unfurl preview deferred to launch dry-run. |
| 8 | WCAG AA contrast | foreground/background ratios | **NOT AUDITED in this pass** | axe-core CI scaffold exists (`Task 1.36`) but hasn't been run against final pages. Promote to launch-day pre-flight item. |

---

## 2. Changes landed in this audit

- `web/app/layout.tsx` — added `export const viewport = {...}`.
- `web/app/_components/ShareBar.tsx`
  - Bumped button padding/min-height/min-width to meet 44px tap-target floor.
  - Added `@media (max-width: 380px)` rule that stacks buttons full-width and tightens vertical padding.
  - Disclosure-modal copy rewritten to spec §8.4.1 wording (acknowledges external CDN cache persistence after deletion).
- `web/lib/plausible.ts` — added `feedback_submit` to `PlausibleEvent` union (§11.1 row 9).
- `web/test/plausible.test.ts` — added an event-list-completeness regression test.

No edits to v1 frozen assets (`cli/src/assets/styles.css`, `script.js`, `v1-index.html`). The `web/test/v1-frozen.test.ts` hash pin remains unaffected.

---

## 3. Deferred to v2.1

**Mobile font-size floor.** v1 CSS uses 9–13px in many places. To satisfy the ≥ 14px NFR on small viewports without touching v1, the v2 layer must inject a mobile-only override stylesheet that bumps every rule below 14px to 14px inside a `@media (max-width: 380px)` block.

This is straightforward but not safe to land mid-Phase-1 — visual regression risk is real and the audit window is past. Tracking item:

- New task in v2.1 plan: `mobile-font-floor.css` + visual snapshot test at 320px / 375px / 390px viewports.
- Must run on Pixel 5 (393px), iPhone SE (375px), iPhone 14 Pro (393px) before promoting to production.

---

## 4. WCAG AA contrast — promoted to launch pre-flight

Add to `phase1-launch-runbook.md` §1.X "Accessibility":

- [ ] Run axe-core against `https://bench.dev/demo`, `https://bench.dev/u/imasaikiran`, `https://bench.dev/scan/<test-id>`.
- [ ] Zero serious/critical violations before launch.
- [ ] Capture screenshot of report into `docs/plans/launch-readiness/`.

(Item to be added in a separate runbook edit.)
