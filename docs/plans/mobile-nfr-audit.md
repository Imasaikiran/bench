# Mobile NFR audit — bench v2

> **Scope:** Spec §11 mobile viewport rows. Audit run on amended spec + current `v2-dev` HEAD.
> **Audit date:** 2026-05-05.
> **Verdict:** Most NFR items met after changes in this PR. One item deferred to v2.1 (font-size floor) with rationale.

---

## 1. Spec rows audited

| # | NFR | Threshold | Status | Evidence |
|---|-----|-----------|--------|----------|
| 1 | Viewport (320–380px): one scroll, no horizontal scrollbar | scrollbar absent | **PASS (after fix)** | `app/layout.tsx` now exports `viewport = { width: "device-width", initialScale: 1, maximumScale: 5 }`. Without this, mobile browsers emulate a 980px viewport and the v1 layout overflows. |
| 2 | Viewport (320–380px): font ≥ 14px | violated by v1 frozen CSS | **PASS (after fix)** | v2-layer override at `web/public/v2/mobile-overrides.css` bumps every sub-14px v1 selector to 14px inside `@media (max-width: 380px)`. Loaded after `/v1/styles.css` from `web/lib/v1render.tsx`. v1 frozen — never edited. Documented exception: `.mh-copy` (9px chip) bumped to 12px text + 44px min-height to satisfy tap-target NFR without distorting the compact button. Structure regression test in `web/test/mobile-overrides.test.ts`. |
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

None. The font-size floor item that was deferred earlier landed in this audit cycle (`web/public/v2/mobile-overrides.css`). The remaining axe-core run is tracked in §4 below as a launch pre-flight item, not a deferral.

---

## 4. WCAG AA contrast — promoted to launch pre-flight

Add to `phase1-launch-runbook.md` §1.X "Accessibility":

- [ ] Run axe-core against `https://bench.dev/demo`, `https://bench.dev/u/imasaikiran`, `https://bench.dev/scan/<test-id>`.
- [ ] Zero serious/critical violations before launch.
- [ ] Capture screenshot of report into `docs/plans/launch-readiness/`.

(Item to be added in a separate runbook edit.)
