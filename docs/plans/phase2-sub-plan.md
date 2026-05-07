# Phase 2 sub-plan — Depth (May 22 → Jun 26, 2026)

> **Owner:** founder (`@imasaikiran`).
> **Status:** Sketch. Detailed task breakdown deferred until Phase 1 launch-week metrics land (May 29 review). Phase 2 work begins only after Phase 1 hits its launch-week kill floor (≥ 30 scans) and the W2 rescan rate ≥ 10%.
> **Spec ref:** `docs/specs/2026-04-25-bench-v2-design.md` §13 Phase 2; §11.1 metrics; §6.1 rubric governance.
> **Plan ref:** `docs/plans/2026-04-25-bench-v2-implementation-plan.md` (Phase 2 milestones).

This is the milestone-level sketch. Each sub-task gets fully bite-sized in a follow-on plan after the May 29 launch-week review confirms Phase 2 is funded.

---

## 1. Phase 2 features (per spec §13)

| # | Feature | Why this phase | Kill if |
|---|---------|----------------|---------|
| 2.1 | Delta-reveal on rescan | Rescan rate ≥ 20% W4 is the bet (§0.5.4). Delta-reveal makes returning visible — what changed, what improved, what regressed. Without it, rescan is data-only with no UX payoff. | Rescan rate < 10% after Phase 2 ships → curiosity loop is broken at the data level, not the visual level. |
| 2.2 | `/stats` page | Public aggregate (median, distribution by tier). Honest, not Klout. Gated until 500 non-suspect scans (§5.8 Stage 2). | If `/stats` median feels embarrassing or moves erratically, the rubric needs work before the page goes live — not the page. |
| 2.3 | Rubric v1.1 | Merge accepted community PRs from Phase 0 + Phase 1 issue queue. Bump versions per §6.1 governance. | If no PRs accepted, the rubric is too tightly held — relax governance threshold per §6.1 month-12 transition or accept lower bar. |
| 2.4 | Second OG card variant (A/B) | The first OG card design is a hypothesis. A/B against a second variant keeps share-rate optimisation evidence-based. | If both variants land within 2pp share-rate of each other, the OG card design is not the bottleneck — stop iterating on it and look upstream (the visit-to-scan funnel). |

---

## 2. Milestone-level task list

### Milestone P2.1 — Delta-reveal on rescan (Week 5–6)

- **P2.1.a** Rescan detection: when a logged-in user POSTs a new scan and their `latest_scan_id` exists, mark it. Server returns `previous_scan_id` in the response.
- **P2.1.b** `/scan/[id]` and `/u/[handle]` server-fetch both current and previous scan when `previous_scan_id` is present.
- **P2.1.c** v2-layer Delta component (does NOT touch v1 frontend). Renders above the constellation: changed dimensions, hours delta, score delta, tier change. Visual: small inline indicators, no popups.
- **P2.1.d** `rescan_detect` Plausible event already typed in `web/lib/plausible.ts`. Wire emit on first render of a delta.
- **P2.1.e** Snapshot tests for delta scenarios: tier promotion, tier regression, no-change, score ± 5 points.

### Milestone P2.2 — `/stats` page (Week 6–7)

- **P2.2.a** Aggregation query: median + 25/75/95 percentile of `score`, distribution per tier, count per chapter. Excludes `is_suspect = true`.
- **P2.2.b** Cached 1h. No raw scan data exposed. No per-user rows.
- **P2.2.c** Page UI: 5 chapter histograms, one tier-distribution chart, sample-size counter at top with §5.8 Stage 1 disclaimer.
- **P2.2.d** Gate: page returns 404 (not 503) if scan count < 500. The 404 is a deliberate "doesn't exist yet" rather than "down," so search engines don't index a soft-fail.
- **P2.2.e** No comparison to "you" — `/stats` is a global page, not a personalised one. Personal comparison is a non-goal per §14.11.

### Milestone P2.3 — Rubric v1.1 (Week 7–8, parallel to P2.2)

- **P2.3.a** Audit Phase 0 + Phase 1 issue queue for rubric PRs that meet §6.1 evidence bar.
- **P2.3.b** Founder cuts to top 3 candidate PRs. Open public comment thread for each. Minimum 48h cooldown before merge.
- **P2.3.c** For each merged PR: rubric `version` bumps minor; `/how-we-scored/changelog` updated with founder-authored note (per §6.1).
- **P2.3.d** Server `reScoreFromCounts` already version-aware. Existing claimed scans stay stamped at the version they were scored under; "rescore with latest rubric" button on profile pages becomes the user-side promotion path.
- **P2.3.e** Snapshot fixtures updated for any tier-boundary or chapter-weight change.

### Milestone P2.4 — OG card variant B (Week 8–9)

- **P2.4.a** Design variant B: simpler layout, larger hero, tier-name as bold subtitle. Founder-authored, single-shot, do not crowdsource the design.
- **P2.4.b** Implement at `web/app/api/og/[id]/v2/route.tsx`. Same params, different render.
- **P2.4.c** Server-side A/B: 50/50 split at `og:image` URL generation per scan ID parity. Variant choice persisted as a column on `scans` (`og_variant TEXT NOT NULL DEFAULT 'a'`).
- **P2.4.d** Track per-variant share-rate via Plausible's referer-split or a server-side counter. Need ≥ 200 shares per variant for a credible read.
- **P2.4.e** Decision rule (pre-committed): the variant with higher share-rate at 200 shares per arm wins. Difference < 2pp → keep variant A (status quo bias is intentional; the OG card is not the bottleneck if both perform similarly).

---

## 3. What Phase 2 explicitly does NOT do

- Does not add new persona tiers. The 5-tier ladder is fixed for v2.
- Does not add comments / reactions / likes on profiles (non-goal §14.8).
- Does not introduce LLM-per-user recommendations (non-goal §14.3).
- Does not add an embed `<img>` route. That is Phase 3.
- Does not change the persona-shape contract. v1 frontend stays frozen.
- Does not introduce a paid tier. Zero-revenue is permanent (non-goal §14.1).

---

## 4. Phase 2 → Phase 3 gate

Per spec §13 Phase 2 kill criterion:

- W2 rescan rate < 20% after 4 weeks → re-examine the visual's curiosity-producing power. Phase 3 work paused.
- W2 rescan rate ≥ 20% → continue into Phase 3 (embed cards, rubric v2, monthly editorial).

Phase 3 sub-plan is drafted only after the May 29 + June 12 + June 26 weekly reviews land in writing. Don't pre-spec Phase 3 — Phase 2 evidence will reshape it.

---

## 5. Open questions deferred to May 29 review (not for now)

These are NOT spec-level questions. They live here because Phase 2 detail planning needs them, but they are tractable only after Phase 1 launch-week data:

1. Is the median launch-week score Explorer-heavy (most scans hit the floor) or Tinkerer-centred? Different distributions imply different `/stats` UX.
2. Does the share-on-X tweet template need a per-tier variant, or does the single template work across tiers?
3. Did anomaly detection flag any real users (not adversarial), and do those rules need tuning?
4. Did the "deletion is partial" disclosure modal (§8.4.1) reduce share-click rate noticeably? If yes, the modal copy is too heavy.

Founder records answers in a `phase2-may29-review.md` doc that gets created at that review, not now.
