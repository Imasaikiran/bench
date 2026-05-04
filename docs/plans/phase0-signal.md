# Phase 0 — signal audit + build/kill decision

> **Owner:** founder (`@imasaikiran`).
> **Scheduled audit date:** 2026-05-02 (end of Phase 0 week, per plan §0.5).
> **Decision recorded date:** TODO(launch-day): fill once founder runs the audit.
> **Plan reference:** `docs/plans/2026-04-25-bench-v2-implementation-plan.md` Task 0.5.
> **Spec reference:** `docs/specs/2026-04-25-bench-v2-design.md` §13 (Phase 0 kill criterion).
> **Branch:** decision lives on `v2-dev`. PASS = proceed into Phase 1 tasks. FAIL = stop; no Phase 1 work this quarter on this founder's time.

---

## 1. The question this doc answers

> *"Is the demand signal for `bench` (the Claude-Code-setup score) strong enough to justify spending Phase 1 founder-weeks on the CLI + web app?"*

The plan and spec deliberately gate the build on demand evidence collected from a rubric-only release in week 1. Phase 0 ships `rubric.yaml v0.1` and `/how-we-scored` only — no CLI, no DB, no `/api/scan`. The audit on May 2 reads what the world actually did with the rubric and decides build vs. kill.

This doc is the recorded decision and the trail behind it. It is updated once and never re-litigated mid-Phase-1.

---

## 2. Signal vs. noise

Before counting anything, name what counts.

**Signal (counts):**
- A PR or issue against `Imasaikiran/bench` from a GitHub account that has not previously starred, forked, commented on, or PR'd to any of the founder's public repos. Cross-checked against `gh api users/imasaikiran/events --paginate`.
- A substantive comment (≥ 1 sentence with content beyond "nice" / "cool" / emoji) on the X thread, the r/ClaudeAI post, the Anthropic Discord `#claude-code` thread, or a GitHub issue, from a non-founder account.
- An unsolicited blog post, X thread, YouTube video, or newsletter mention written by someone other than the founder, that names the rubric and links to it.

**Noise (does not count):**
- Stars, likes, retweets, reactions on their own.
- One-word replies or pure emoji reactions.
- Comments by accounts the founder has previously interacted with (friends-responding-to-friends).
- Reposts / quote-tweets that add no original commentary.
- Hits on `bench.dev/how-we-scored` from analytics — they are not legible as opinion.
- Comments on aggregator surfaces (HN, Reddit) that critique the framing of the post itself, not the rubric.

Rationale: the bet (§0.5.4) is that a developer reading the rubric will form a strong enough opinion to act — to PR, to comment substantively, to publish a counter-take. Activity below that bar does not carry the signal we are buying with Phase 0.

---

## 3. The three tripwires

Pulled verbatim from spec §13 / plan Task 0.5 Step 2. **All three must pass.** Any single one failing means the demand model is weaker than assumed and Phase 1 does not get built this quarter.

| ID | Tripwire | Threshold | How measured |
|----|----------|-----------|--------------|
| **A** | New-author PRs/issues | ≥ 3 PRs or issues from accounts with no prior interaction with the founder's repos | `gh api repos/Imasaikiran/bench/issues --paginate` and `gh api repos/Imasaikiran/bench/pulls --paginate --state all`; cross-check authors against `gh api users/imasaikiran/events --paginate` |
| **B** | Substantive comments | ≥ 10 substantive (non-one-word) comments from ≥ 5 distinct non-founder accounts, summed across X replies + Reddit + Discord + GitHub | manual count from each surface; comments captured in §6 below |
| **C** | Unsolicited reference | ≥ 1 unsolicited blog post / X thread / video / newsletter referencing the rubric, written by someone other than the founder | manual log; URL captured in §6 below |

Thresholds are tripwires, not targets. They are deliberately low; the signal we are testing is "does this rubric provoke a reaction at all," not "is it viral." If even these floors do not clear, the bet is wrong as posed.

---

## 4. Pre-set color thresholds + actions

Single composite read across all three tripwires.

| Color | Definition | Action |
|-------|------------|--------|
| **GREEN** | All three tripwires pass at or above their floor. Bonus: any single tripwire clears its floor by ≥ 2× (e.g. ≥ 6 new-author PRs/issues, ≥ 20 substantive comments across ≥ 8 accounts, ≥ 2 unsolicited references). | Decision: **BUILD PHASE 1**. Founder commits to Phase 1 schedule (May 2 → May 22). Begin Task 1.1. Phase 1 launch-week kill threshold (< 30 scans) is the next decision gate. |
| **YELLOW** | All three tripwires pass at or just above their floor, no bonus headroom. *Or:* two of three clear comfortably and one is within 80–99% of its floor (e.g. 8 substantive comments across 5 accounts when threshold is 10). | Decision: **BUILD PHASE 1, but tighten Phase 1 kill gate.** Founder writes a one-line note in this doc explaining which tripwire was thin. Phase 1 week-1 review on May 29 applies the < 30 scans floor strictly — no rationalising. Founder pre-commits in writing to honour kill if hit. |
| **RED** | Any single tripwire fails its floor. | Decision: **KILL.** No Phase 1 tasks executed. Founder writes one paragraph in §7 below naming the most likely failed assumption (rubric is not interesting / wrong audience / launch surfaces wrong / framing wrong). Repo stays public; rubric stays at v0.1. Founder may retry a Phase 0 reboot in a future quarter with a revised framing — not as automatic continuation. |

The "tighten Phase 1 kill gate" YELLOW action exists because a marginal Phase 0 result is not a license to relax the next gate; if anything, it raises the prior on Phase 1 also being marginal.

---

## 5. Audit procedure (May 2, 2026)

Run by founder. Same day as audit decision.

1. Open a fresh terminal in the repo root.
2. Pull the data:
   ```
   gh api repos/Imasaikiran/bench/issues --paginate > /tmp/bench-issues.json
   gh api repos/Imasaikiran/bench/pulls --paginate --state all > /tmp/bench-prs.json
   gh api users/imasaikiran/events --paginate > /tmp/founder-events.json
   ```
3. For each PR/issue author login: check whether it appears in `/tmp/founder-events.json`. Logins that do **not** appear are candidates for tripwire A.
4. Manually walk the X thread, the r/ClaudeAI post, the Anthropic Discord `#claude-code` channel, and any awesome-claude-code issues. Tally substantive comments for tripwire B; record account handles into §6. Stop tally at 15 — past the floor we already know the answer.
5. Search X, Google, YouTube, and the founder's RSS for unsolicited references; record URLs into §6.
6. Apply §4 thresholds. Record the color and the decision into §7 below.
7. Commit this file (single commit, single decision):
   ```
   git add docs/plans/phase0-signal.md
   git commit -m "docs(phase0): signal audit + build/kill decision"
   ```
8. **Do not push** until founder has slept on it. Plan §0.5 Step 4 pushes; this doc runs the same flow but adds an overnight pause to make the YELLOW path harder to talk yourself into.

---

## 6. Raw signal log

Filled during audit. Empty rows replaced with concrete entries by audit close.

### 6.1 Thread / post URLs (founder-posted, link the rubric)

- X thread: TODO(launch-day): paste URL.
- r/ClaudeAI post: TODO(launch-day): paste URL.
- Anthropic Discord `#claude-code` thread: TODO(launch-day): paste permalink.
- awesome-claude-code issue: TODO(launch-day): paste URL.

### 6.2 Tripwire A — new-author PRs/issues

| # | URL | Author handle | First-time interaction? (Y/N) | Notes |
|---|-----|---------------|------------------------------|-------|
| 1 | TODO(launch-day) | | | |
| 2 | TODO(launch-day) | | | |
| 3 | TODO(launch-day) | | | |

Count of qualifying entries: TODO(launch-day): N.
**Tripwire A result:** TODO(launch-day): PASS / FAIL.

### 6.3 Tripwire B — substantive comments

| # | Surface | URL / permalink | Author handle | First sentence (verbatim, ≤ 15 words) |
|---|---------|-----------------|---------------|---------------------------------------|
| 1 | TODO(launch-day) | | | |
| 2 | TODO(launch-day) | | | |
| ... | | | | |

Distinct non-founder accounts represented: TODO(launch-day): N.
Total qualifying comments: TODO(launch-day): N.
**Tripwire B result:** TODO(launch-day): PASS / FAIL.

### 6.4 Tripwire C — unsolicited references

| # | URL | Type (blog / thread / video / newsletter) | Author | Date |
|---|-----|-------------------------------------------|--------|------|
| 1 | TODO(launch-day) | | | |

**Tripwire C result:** TODO(launch-day): PASS / FAIL.

---

## 7. Decision

Fields below are TODO(launch-day) until the audit runs. Once written, they are immutable for this Phase 0.

- Audit date: TODO(launch-day): 2026-05-02 (or actual date if shifted).
- Color: TODO(launch-day): GREEN / YELLOW / RED.
- Decision: TODO(launch-day): **BUILD PHASE 1** / **KILL**.
- One-paragraph rationale tying the color to the action in §4: TODO(launch-day).
- If YELLOW: which tripwire was thin, and the explicit pre-commitment to honour the < 30 scans Phase 1 kill floor: TODO(launch-day).
- If RED: which assumption from §11.2 napkin math (link CTR, install→scan, share rate, impressions per share) is the most likely culprit, in one paragraph: TODO(launch-day).
- Founder signed: TODO(launch-day): `@imasaikiran`, YYYY-MM-DD.

---

## 8. What this doc does not do

- It does not define Phase 1 kill criteria. Those live in `docs/plans/phase1-launch-runbook.md` and ultimately in the < 30 scans / launch week threshold from spec §13 / §11.1.
- It does not re-open the rubric content. Rubric edits are governed by `docs/specs/2026-04-25-bench-v2-design.md` §6.1 (rubric governance / constitution).
- It does not commit the founder to a Phase 2 schedule. Phase 2 has its own gate (W2 rescan rate < 20% after 4 weeks) and is planned in a separate doc only after Phase 1 week-1 signal lands.
