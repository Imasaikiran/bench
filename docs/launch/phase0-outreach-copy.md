# Phase 0 outreach copy: drafts

> **Owner:** founder (`@imasaikiran`).
> **Use date:** 2026-04-25 (Phase 0 Day 1, per spec §13).
> **Goal:** ship the rubric publicly and provoke ≥ 3 cold PRs / ≥ 10 substantive comments / ≥ 1 unsolicited reference within 7 days.
> **Voice rule:** terse, opinionated, asks a real question. No "excited to announce" energy.

These are drafts. Founder must read aloud and tune to own voice before posting. Anything that sounds like marketing copy gets cut.

---

## 1. X thread (founder posts on `bench.dev/how-we-scored` going live)

**Tweet 1 (hook):**
> A score for your Claude Code setup, the way Klout would have done it if Klout had been honest.
>
> Open rubric. 25 dimensions. No AI in the scoring path. No paid tier. No leaderboard.
>
> bench.dev/how-we-scored
>
> Roast it. PRs welcome.

**Tweet 2 (frame):**
> Why bother. Adoption outpaced shared practice. Everyone has a CLAUDE.md, a few skills, some hooks. Nobody has a mirror. You compare in DMs and read setup posts with envy.
>
> bench is the mirror.

**Tweet 3 (constraint):**
> What it is NOT:
> – not a leaderboard (per-tier copy, not rank)
> – not a coach (no "do this next" advice)
> – not a content machine (no email list, no drip)
> – not a paid product (zero-revenue, side project, intentional)
>
> Just a published rubric and a CLI that lands May 22.

**Tweet 4 (the ask):**
> Today's release is the rubric. The CLI lands May 22, only if this rubric provokes a real reaction by May 2.
>
> Real reaction = a PR, a sharp critique, a counter-take. Not stars or 🔥.
>
> github.com/Imasaikiran/bench

**Tweet 5 (the bait):**
> The rubric will be wrong about you in at least one place. That's the point.
>
> Where is it wrong about you? What dimension is missing? Which weight feels off?
>
> Best critique gets the first beta slot.

---

## 2. r/ClaudeAI post

**Title:** I wrote a 25-dimension rubric for scoring a Claude Code setup. Roast it before I build the CLI.

**Body:**
> Hey r/ClaudeAI. I'm building a side project called **bench** — a one-page honest portrait of your Claude Code setup. Score, persona tier, what's working, what's pruning candidates. No AI in the scoring path. The CLI doesn't exist yet.
>
> Today I'm publishing only the rubric. 25 dimensions across 5 chapters (Foundation / Automation / Delegation / Craft / Coherence). Plus the formulas, weights, and a /how-we-scored page that explains every number.
>
> **The rubric:** https://bench.dev/how-we-scored
> **The repo:** https://github.com/Imasaikiran/bench
>
> Why I'm asking before building: I gave myself a kill criterion. If this rubric doesn't provoke ≥ 3 cold PRs and ≥ 10 substantive comments by May 2, I don't build the CLI. The point isn't to ship — it's to ship something the community will actually use, and a rubric without engaged critics is the wrong thing to build on.
>
> So I want your sharp opinions:
> – What dimension would you add?
> – What weight feels wrong?
> – What does the rubric miss about how YOU use Claude Code?
> – Where is the methodology dishonest?
>
> File issues, write critiques, send PRs. The merge bar is "evidence + reasoning > vibes." See `docs/specs/2026-04-25-bench-v2-design.md` §6.1 for governance.
>
> CLI lands May 22 if this floats. Otherwise it doesn't.

**Subreddit notes:** post on a Tuesday or Wednesday morning PT. Crosspost to r/programming only if r/ClaudeAI lands < 5 substantive comments by EOD Day 1.

---

## 3. Anthropic Discord: `#claude-code` channel

**Message 1:**
> hey folks — published a draft rubric for scoring a Claude Code setup: https://bench.dev/how-we-scored
>
> trying to gauge if the rubric is even interesting before I build the CLI to use it. genuinely want sharp critique on what's missing or weighted wrong.
>
> repo with governance + spec: https://github.com/Imasaikiran/bench

**Follow-up if no engagement after 24h, in same thread:**
> if anyone wants to argue with chapter 5 (Coherence: duplicate skills, orphaned hooks, single-topic CLAUDE.md), tell me what's missing. that one's the chapter I'm least confident about.

---

## 4. awesome-claude-code GitHub issue

**Title:** Rubric for scoring a Claude Code setup — looking for critique before building the CLI

**Body:**
> Hi maintainers + contributors,
>
> I've published an open rubric for scoring a Claude Code setup: https://bench.dev/how-we-scored. The CLI that uses it (`npx bench`) lands May 22 — but only if the rubric earns external engagement first.
>
> If this is in scope for awesome-claude-code, either add a "tools / measurement" row, or — more useful — point out which of the 25 dimensions are wrong.
>
> Spec: https://github.com/Imasaikiran/bench/blob/v2-dev/docs/specs/2026-04-25-bench-v2-design.md
> Rubric YAML: https://github.com/Imasaikiran/bench/blob/v2-dev/rubric/rubric.yaml
>
> Happy to roll any merged refinements into rubric v0.2 before launch.

---

## 5. LinkedIn post (lower priority, post Day 2)

> A weekend project I've been thinking about for months: **bench** — a one-page honest portrait of your Claude Code setup.
>
> No AI in the scoring path. No paid tier. No leaderboard. Just a published 25-dimension rubric you can argue with.
>
> The rubric is live today. The CLI lands May 22 — if the rubric earns external engagement first.
>
> If you've spent 8+ weeks tuning a CLAUDE.md, building skills, or writing hooks, I'd love your critique on the rubric: https://bench.dev/how-we-scored
>
> Where is it wrong about you?

---

## 6. After-launch follow-up (Day 4–5 if engagement is thin)

> Halfway through Phase 0. Three tripwires:
> – ≥ 3 cold PRs/issues
> – ≥ 10 substantive comments across ≥ 5 accounts
> – ≥ 1 unsolicited reference
>
> Current state: TODO(launch-day): record actual counts.
>
> If we don't clear all three by May 2, the CLI doesn't ship. That's the deal.

---

## 7. Posting checklist (founder)

- [ ] X thread queued (5 tweets, scheduled to drop within 30 min of `bench.dev/how-we-scored` going live).
- [ ] r/ClaudeAI post drafted in markdown editor (not Reddit's broken inline one).
- [ ] Discord message paste-ready in clipboard manager. Paste, then immediately edit if anything reads off.
- [ ] awesome-claude-code issue title + body lined up.
- [ ] LinkedIn post drafted; will post Day 2 if X traction is healthy.
- [ ] Personal blog post (founder's own surface). Optional Day 3 cross-post.
- [ ] Set a calendar reminder for May 2 09:00 PT to run the Phase 0 audit.
- [ ] Pre-write the kill-decision tweet so it isn't written under emotion: *"bench Phase 0 wrapped. Tripwires didn't clear. CLI parked. Repo stays public; rubric stays at v0.1. Try again next quarter, framed differently."*

---

## 8. Anti-patterns to avoid (founder reminder)

- Do not pre-announce the CLI as "coming soon." The CLI shipping is gated, not promised.
- Do not respond to every reply within the first 24h. Let critique accumulate.
- Do not edit the rubric mid-Phase-0 in response to the loudest critic. Phase 0 collects signal; Phase 0.5 (post-audit) merges the strongest PRs.
- Do not chase engagement metrics on aggregator surfaces (HN). HN is not on the Phase 0 surface list; it's a Phase 1 launch surface.
- Do not let the kill-decision rationale drift to "the launch surfaces were wrong." The launch surfaces ARE part of the bet.
