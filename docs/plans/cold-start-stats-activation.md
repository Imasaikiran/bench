# `/stats` cold-start activation rules

> **Spec ref:** `docs/specs/2026-04-25-bench-v2-design.md` §5.8 + §11 + §14.11.
> **Implementation phase:** P2.2 in `docs/plans/phase2-sub-plan.md`. This doc fixes the activation rules + UI copy so the Phase 2 build is unambiguous.

---

## 1. Three stages (verbatim from spec §5.8)

| Stage | Range (non-suspect scans) | Copy posture |
|-------|--------------------------|--------------|
| **Seed** | 0–50 | `/stats` not linked from nav; direct URL only. Top-of-page disclaimer. No percentile copy anywhere. |
| **Warm-up** | 50–500 | `/stats` linked from nav. Median + raw histogram OK. Tiers with < 5 scans show "too few scans to describe this tier yet." |
| **Real** | 500+ | All disclaimers removed. Percentile copy permitted on `/stats` only — never on `/u/<handle>` cards (§14.11). |

Suspect scans (`is_suspect = true`, see §10.3.10–11) are excluded from every aggregate, every stage. The aggregate calculation never touches suspect rows.

---

## 2. Stage-transition triggers

Computed at request time, cached for 1h per spec §11. Triggers are deterministic — the same scan count yields the same stage.

```
non_suspect_count = SELECT COUNT(*) FROM scans WHERE is_suspect = false

stage =
  if non_suspect_count <  50              -> "seed"
  if non_suspect_count <  500             -> "warmup"
  if non_suspect_count >= 500
      AND min_per_tier_count >= 5         -> "real"
  else                                     -> "warmup"  # holds at warmup until thin tier fills

min_per_tier_count = SELECT MIN(c) FROM (
  SELECT COUNT(*) AS c
  FROM scans
  WHERE is_suspect = false
  GROUP BY (payload ->> 'tier')
)
```

The "real" stage has a second guard so that crossing 500 scans while one tier has < 5 doesn't flip the page into a state where it can't honestly describe that tier.

---

## 3. Server query for the gate

Single query, runs at the top of `/stats` server component, cached for 1h:

```sql
WITH live AS (
  SELECT (payload ->> 'tier') AS tier
  FROM scans
  WHERE is_suspect = false
)
SELECT
  COUNT(*)              AS total,
  MIN(per_tier.c)       AS min_per_tier,
  COUNT(DISTINCT tier)  AS tier_count
FROM live
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS c
  FROM live l2
  WHERE l2.tier = live.tier
) per_tier ON true
GROUP BY ();
```

Implementation lives in a future `web/lib/stats-aggregate.ts` module. This doc fixes the contract; it does NOT ship the code.

---

## 4. Disclaimer copy per stage (paste-ready)

### 4.1 Seed (0–50)

Top-of-page banner (above the histograms):

> *"We have **{N}** scans on bench so far. These numbers move every time someone runs `npx bench`. Come back at 500 — until then, treat what you see here as a snapshot, not a population."*

Bottom-of-page note:

> *"`/stats` is not linked from the global nav until 50 non-suspect scans land. You found this URL on purpose — thanks for showing up early."*

### 4.2 Warm-up (50–500)

Top-of-page banner:

> *"**{N}** scans so far. Distributions are real but thin — wait for 500 before treating any tier median as load-bearing."*

For any tier with < 5 scans, the per-tier card replaces its median with:

> *"too few scans to describe this tier yet"*

### 4.3 Real (500+)

No banner. Footer line:

> *"Median over **{N}** non-suspect scans. Suspect scans (anomaly-flagged or HMAC-failed) excluded. Aggregate refreshed hourly."*

All copy strings live in `web/app/stats/page.tsx` when implemented. They are versioned with the rubric, not the schema — copy edits are docs PRs, not migrations.

---

## 5. Anti-patterns (forbidden)

Per spec §5.8 and §14.11:

| Anti-pattern | Why forbidden |
|--------------|---------------|
| Synthesizing scans to inflate the histogram | Spec §5.8: *"No fake scans to pad the histogram. No borrowed Wakatime-style numbers."* |
| Showing percentile on `/u/<handle>` cards | Spec §14.11: *"No absolute leaderboard UI. Percentile is allowed in moderation on `/stats`."* — by inversion, never on `/u/<handle>`. |
| Comparing the visitor to "you" on `/stats` | Spec §5.8: *"`/stats` is a global page, not a personalised one."* — `/u/<handle>` is the personal page. |
| Showing distribution per dimension before the aggregate stabilises | Easier to make a single dimension look weird with a small N than to make the overall median look weird. Hold per-dimension distributions until 500+. |
| Auto-refreshing the page | Cached for 1h per spec §11. The page is not a live ticker. |

---

## 6. Phase 2 implementation hand-off

When milestone P2.2 in `docs/plans/phase2-sub-plan.md` runs:

| Concern | Implementation file | Notes |
|---------|---------------------|-------|
| Server component | `web/app/stats/page.tsx` | reads aggregate, branches on stage |
| Aggregate calc | `web/lib/stats-aggregate.ts` | runs the query in §3, returns `{ total, perTier, perChapter, perScore }` |
| Stage gate fn | `web/lib/stats-aggregate.ts` (same file) | exports `pickStage(count, minPerTier)` returning `"seed" \| "warmup" \| "real"` |
| Cache | `unstable_cache` from Next.js, 3600s tag `"stats-aggregate"` | invalidated by `revalidateTag` on the cron that expires anonymous scans (already running) |
| Tests | `web/test/stats-aggregate.test.ts` | unit-tests `pickStage` boundary cases at 49/50/499/500 with each tier count permutation |
| Snapshot test | `web/test/stats-page.test.tsx` | renders each stage with mocked aggregate, asserts disclaimer copy strings present |

---

## 7. Founder weekly post template — "what {N} scans taught us"

When `/stats` enters the Warm-up stage, founder posts a weekly thread on X that summarises the prior week's distribution. Template:

> bench update, week {W}. **{N}** scans so far.
>
> tier distribution: Explorer {a}% · Tinkerer {b}% · Craftsman {c}% · Operator {d}% · Conductor {e}%
>
> chapter strongest: **{strongest_chapter}** (median {S}/100). chapter weakest: **{weakest_chapter}** (median {W}/100).
>
> the rubric is open at bench.dev/how-we-scored. PRs are landing in v1.1.
>
> bench.dev/stats

Constraints:
- Only post when distribution is statistically meaningful (Warm-up + at least 5 scans per tier).
- If a particular tier moves > 5 percentage points week-over-week, mention it in the thread; that's a real signal.
- Do not extrapolate. The rubric is the population definition; the population isn't.
- If the strongest/weakest chapter swap from one week to the next, that is interesting — call it out and link the PR that moved the rubric.

---

## 8. What this doc does NOT do

- Does not pre-write the React component. Phase 2 owns the implementation.
- Does not change spec §5.8. Anything that contradicts §5.8 is a bug in this doc, not in the spec.
- Does not commit the founder to a `/stats`-driven roadmap. `/stats` is a public artifact, not a feedback loop. Roadmap inputs come from `/api/feedback` and the rubric PR queue.
