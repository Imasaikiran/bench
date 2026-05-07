# Phase 1 weekly post template

> **Owner:** founder (`@imasaikiran`).
> **Use cadence:** weekly Friday 16:00 PT, every Friday from launch (May 22, 2026) through end of Phase 2 (Jun 26, 2026). 5 posts total in this cadence; monthly thereafter or until Phase 2 kill criterion fires.
> **Spec ref:** `docs/specs/2026-04-25-bench-v2-design.md` §11.1 + §11.2 + §13.
> **Companion docs:** `docs/launch/phase0-outreach-copy.md`, `docs/launch/founder-demo-handle.md`, `docs/plans/phase1-launch-runbook.md`.

---

## 1. Why post weekly

Per spec §0.5.4, the bet is testable in public — share rate ≥ 15% W1, rescan rate ≥ 20% W4. The weekly post is the founder's **own** trust contract: if those numbers slip, the post says so before the founder is asked.

The post is not marketing. It is a public log entry. Tone: terse, opinionated, anti-marketing. Read `docs/launch/phase0-outreach-copy.md` for voice.

If anything in this template starts to feel like growth-marketing copy, delete it. The week the post starts using "we're excited to announce" is the week the project has been captured by the wrong forces.

---

## 2. Tweet-thread template (paste-ready)

Replace `{N}`, `{week}`, `{*_delta}`, `{cohort_size}` placeholders before posting.

### Tweet 1 — hook + raw scan count

> bench week {week} ({date}). {N} scans landed since launch. {cohort_size}% of installs converted to scans. {N_unique_handles} claimed a profile.
>
> bench.dev/stats

### Tweet 2 — the chapter that moved most this week

> the chapter that shifted most was **{chapter_name}** — median score went {direction} {chapter_delta} points week-over-week.
>
> the most-flagged dimension inside it: {dim_name}. {one-line interpretation: e.g. "people are finally writing PreToolUse hooks they actually use, not just configuring them"}.

### Tweet 3 — feedback theme of the week

> {N_feedback} "this number is wrong" submissions came in. dominant theme: {theme}.
>
> {one-line: how the founder is responding — e.g. "the hours formula gets a §5.3 footnote in v1.1, not a value change. honesty before flattery."}

### Tweet 4 — rubric PR queue + decision

> rubric PRs in flight: {N_open}. merged this week: {N_merged}. version is at {rubric_version}.
>
> next merge target: {summary of top-priority PR or "none — queue is thin, would love sharper critique."}

### Tweet 5 — what would shift the score next week

> if you ran <code>npx bench</code> last weekend and want next week's score to move:
>
> - the rubric weights {dim_X} highest right now — that's the lever
> - paste your scan into <code>npx bench --why</code> for per-dimension reasoning
> - PRs to <a href="https://github.com/Imasaikiran/bench/blob/main/rubric/rubric.yaml">rubric.yaml</a> are open

(Drop tweet 5 in weeks where the rubric didn't move.)

---

## 3. Things you must NOT do in these posts

Discipline list. If any of these slip in, delete the tweet and rewrite.

| Anti-pattern | Why it's banned |
|--------------|-----------------|
| **Synthetic numbers.** Padding the histogram, rounding up, "approx 100" when it was 73. | Spec §5.8: *"No fake scans to pad the histogram. No borrowed Wakatime-style numbers."* |
| **Editing the rubric in response to your own week's score.** | Spec §6.1: governance constitution. The founder can't merge a PR that pushes their own tier without the same evidence + cooldown bar as anyone else. The weekly post is not a workaround. |
| **Shaming low-tier users.** "Most people are still Explorer-tier 😬" | Spec §0.5.2 names Explorer as the curious newcomer — they're funnel, not failure. Treat the bottom of the histogram with the same voice as the top. |
| **Comparisons to Klout, Wakatime, CodersRank.** | Spec §3.4 frames bench against these, but the **product** voice doesn't punch sideways. The competitive frame lives in the spec, not in the public log. |
| **"We" speak.** | This is one developer with a side project. Spec §15 row 8: the founder profile is anchor, not aspiration. "we" implies a team that doesn't exist. |
| **Marketing verbs.** "excited," "thrilled," "stoked," "delighted." | The post is a log entry. Excitement is for the reader to feel, not the writer to claim. |

---

## 4. Failure mode: a quiet week

If nothing moved more than ±2 points week-over-week in any chapter, AND fewer than 3 substantive feedback submissions arrived, AND no rubric PRs were merged:

> bench week {week}. quiet week.
>
> {N} scans, no chapter moved more than ±2 points, no rubric PRs merged. signal is thin.
>
> if the rubric is wrong about you somewhere, this is the kind of week where a sharp PR or a "this number is wrong" submission has the most leverage. {link to /api/feedback or rubric repo}.
>
> {if applicable: founder's own re-scan delta, posted plainly}.

Do NOT manufacture excitement on a quiet week. Quiet weeks are honest data — they're a signal the rubric is converging or the audience is thinning, both important.

---

## 5. Stop-condition for weekly cadence

Move from weekly → monthly the **first** time any of these triggers:

| Trigger | Decision |
|---------|----------|
| End of Phase 2 (2026-06-26 reached) | Move to monthly. Phase 2 sub-plan in `docs/plans/phase2-sub-plan.md` already gated on this. |
| W2 rescan rate < 10% after 4 weeks | Spec §13 Phase 2 kill criterion fires. Stop posting weekly. Founder writes one final post acknowledging the kill, then drops cadence to "as warranted" — not silence, but not scheduled. |
| Three consecutive quiet weeks (per §4) | Cadence is creating noise without signal. Drop to monthly. |
| Founder cannot post in a given week | Skip that week. Do not double up the next. The cadence is a trust contract, not a debt. Acknowledge the skip the next time you post: *"missed last week. {one-line reason}. continuing."* |

Once moved to monthly, the same template applies, with `{week}` → `{month}` and aggregation windowed correspondingly.

---

## 6. Where the numbers come from

Read-only data sources for `{*}` placeholders. Do NOT add tracking pixels, do NOT scrape X — Plausible + the existing `/internal/metrics` route + direct DB queries are the entire instrumentation.

| Placeholder | Source |
|-------------|--------|
| `{N}` (scan count) | `SELECT COUNT(*) FROM scans WHERE is_suspect = false`. Cached 1h in the app per spec §11. |
| `{cohort_size}` (install→scan conversion) | Plausible: `scan_upload` events / landing-page CTA clicks, week-windowed. |
| `{N_unique_handles}` (claims) | `SELECT COUNT(*) FROM profiles`. |
| `{chapter_name}`, `{chapter_delta}` | Aggregate over `payload.chapters.*.score` weekly. Compare median this week vs. last week. |
| `{dim_name}` | Same aggregation, scoped to one chapter, dimension granularity. |
| `{N_feedback}`, `{theme}` | `/api/feedback` row count this week, manual theme tag from a 5-minute read of submissions. |
| `{N_open}`, `{N_merged}`, `{rubric_version}` | `gh pr list` + `gh pr list --state merged` + `rubric/rubric.yaml` `version` field. |

If any of these sources is unavailable on post day (Plausible out, DB migration in flight), say so in the tweet and skip the affected metric. Don't estimate.

---

## 7. Lifecycle of a post (founder workflow, ~30 min)

1. **T-1h.** Pull the numbers via the sources in §6. Paste raw values into a draft.
2. **T-30m.** Read the draft against §3 anti-patterns. Cut anything that violates.
3. **T-15m.** Have one trusted reader (Sai Krishna Reddy or a beta-list devs from §15 row 7) eyeball the draft for tone slip.
4. **T-0.** Post the thread on X. Cross-post the first tweet to LinkedIn and the Anthropic Discord `#claude-code` channel. r/ClaudeAI gets a top-level summary post linking to the thread.
5. **T+24h.** Read replies. Note any new feedback theme; that becomes input to the next week's tweet 3.

Do NOT respond to every reply. Do NOT engage trolls. The post is a log, not a conversation. Engage substantive critique only — same bar as `/api/feedback` evaluations.
