# Phase 1 beta outreach — DM drafts

> **Owner:** founder (`@imasaikiran`).
> **Send window:** 2026-05-15 → 2026-05-18 (3 days before soft launch, May 19).
> **Cadence:** one DM per day, max 4 outreach DMs in any 24h window. Founder-personalised — never paste-perfect.
> **Goal:** 10 hand-picked devs scan their own setup before public launch. Capture (a) any bug they hit, (b) one piece of "the number is wrong because…" feedback, (c) whether they share their card without prompting.
> **Spec ref:** §15 row 7. The fixed list is 7 names + 3 slots filled from Phase 0 top PR contributors.

These are drafts. Founder MUST personalise — no copy-paste blasting. If a name isn't right, drop them and use a Phase 0 contributor instead.

---

## Channel rules

- **X DM**: preferred for Marco, Freek, Geoff, Harper, Simon, the Discord-power-user slot.
- **Email**: for Sai Krishna Reddy (founder's contact) and Ben Newton (find via blog footer).
- **GitHub @-mention with link**: for `awesome-claude-code` top contributor (mentioned only once, never repeated).
- **No LinkedIn DMs.** Wrong context, wrong tone for a CLI side project.

---

## Slot 1 — Marco Lancini

**Channel:** X DM.

> hey Marco — built a thing that scores a Claude Code setup. cli + a one-page portrait. you've been writing about CC longer than most people, and I want to know if the rubric is dishonest somewhere before I push it publicly.
>
> it's a 5-min run on your machine — `npx @imasaikiran/bench` (alpha tag). nothing leaves your laptop without you typing `y` after a preview.
>
> if you have time before May 19, would mean a lot. spec is here if you want to read first: https://github.com/Imasaikiran/bench/blob/v2-dev/docs/specs/2026-04-25-bench-v2-design.md

---

## Slot 2 — Freek van Herk

**Channel:** X DM.

> hi Freek — your hook posts are in the rubric's research trail (chapter II, automation). wanted you to be one of the first 10 devs to scan their own setup before it goes public May 22.
>
> it's an open-rubric score, not a vibes score. running `npx @imasaikiran/bench@alpha` reads `~/.claude/`, prints what it'll upload, asks for `y`. nothing else.
>
> tell me what number it gives you, and which dimension is wrong. ~5 min. https://github.com/Imasaikiran/bench

---

## Slot 3 — Simon Willison

**Channel:** X DM. (Keep short — Simon is busy and you have ~2 sentences to land it.)

> Simon — small thing, no rush. Built `bench`: a 25-dimension scored portrait of your Claude Code setup, deterministic, no LLM in scoring. CLI is `npx @imasaikiran/bench@alpha`, runs locally, asks before uploading. Would value your read on the rubric (https://bench.dev/how-we-scored) if it lands in your queue.

---

## Slot 4 — Harper Reed

**Channel:** X DM.

> Harper — built a side project: `bench`. one-page honest portrait of your CC setup. open rubric, no AI in scoring path, zero accounts unless you want to claim a handle.
>
> testing with 10 devs before public launch May 22. it'd be useful to have your read — both on whether the score makes sense and whether the share card actually works as a share unit.
>
> `npx @imasaikiran/bench@alpha`, takes ~5 min. https://github.com/Imasaikiran/bench

---

## Slot 5 — Geoff Huntley

**Channel:** X DM. (Reference his blog explicitly — he's written extensively about CC.)

> Geoff — your CC posts shaped a lot of the rubric I built for `bench`. CLI scores a setup against a 25-dim open rubric, prints a one-page portrait, optional GitHub-OAuth-claimed URL. no AI in scoring.
>
> launching May 22. want to know what your score is and which dimension is dishonest about you before then. `npx @imasaikiran/bench@alpha`, ~5 min, fully local until you `y`.
>
> spec: https://github.com/Imasaikiran/bench/blob/v2-dev/docs/specs/2026-04-25-bench-v2-design.md

---

## Slot 6 — Sai Krishna Reddy

**Channel:** Email (founder's existing contact).

> Hey Sai —
>
> Quick favour. I'm shipping a side project May 22 — `bench`, a one-page portrait of a Claude Code setup. Score 0–100, persona tier, what's working, what to prune. Open rubric, no AI in the scoring path.
>
> Trying to get 10 devs to scan their setup before public launch and tell me where the number is wrong. Ground truth matters more than aggregate stats at this stage. Yours is a setup I trust to push back on the methodology rather than just nodding.
>
> 5 min. `npx @imasaikiran/bench@alpha`. Reads `~/.claude/`, prints what it'll upload, waits for `y`. Nothing leaves your laptop until you confirm.
>
> Spec / repo if you want to read first:
> https://github.com/Imasaikiran/bench
>
> If you can run it before May 19 and reply with (a) the score it gave, (b) which dimension feels wrong, that'd be huge.
>
> – Sai (Imasaikiran)

---

## Slot 7 — Ben Newton

**Channel:** Email (find via blog footer / GitHub-public email).

> Hi Ben —
>
> I built a tool I think you might find useful, `bench` — open-rubric score of your Claude Code setup. 25 dimensions, deterministic, one-page shareable portrait.
>
> Looking for 10 hand-picked devs to scan before the public launch on May 22. You're on the list because your blog is one of the few places that talks about CC discipline beyond "look at my CLAUDE.md."
>
> Run: `npx @imasaikiran/bench@alpha`. ~5 min. Local-only until you `y` the upload.
>
> If you have time to scan and tell me one thing the rubric gets wrong about your setup, I'd value it. Public spec is here: https://github.com/Imasaikiran/bench
>
> Thanks,
> Sai

---

## Slot 8 — `awesome-claude-code` top contributor (TBD)

**Channel:** GitHub @-mention in a NEW issue on `Imasaikiran/bench`. Title: *"Beta scan invite — top 5 awesome-claude-code contributors"*

> Hey @<top-1>, @<top-2>, @<top-3>, @<top-4>, @<top-5> — I'm shipping `bench` on May 22 and want 10 high-signal devs to scan their setup before launch.
>
> Your contributions to awesome-claude-code put you on the shortlist. If you're up for it:
>
> 1. `npx @imasaikiran/bench@alpha` — runs locally, asks before uploading.
> 2. Reply on this issue with (a) the score it gave, (b) one dimension where you think the rubric is wrong about you.
>
> First two who reply get the slot.
>
> Spec: https://github.com/Imasaikiran/bench/blob/v2-dev/docs/specs/2026-04-25-bench-v2-design.md

---

## Slot 9 — Anthropic Discord power user (TBD)

**Channel:** Discord DM, via `#claude-code` channel.

Pick the user who replied with the longest substantive comment to the Phase 0 thread. Open with a thank-you specific to their critique.

> Hey [name] — your comment on the [chapter X / dimension Y] critique on the bench rubric thread was exactly the kind of feedback I wanted Phase 0 to surface.
>
> I'd love your read on the actual CLI before public launch May 22. `npx @imasaikiran/bench@alpha`, runs locally, ~5 min. Mostly want to know if the score it gives you matches your gut.
>
> No expectation of a writeup or anything — just a sanity check that I'm not shipping a calculator that misreads its own input.

---

## Slots 10 + 3 floats — Phase 0 contributors (TBD on May 2)

After Phase 0 audit lands GREEN/YELLOW per `phase0-signal.md`, the founder picks the 3 highest-signal Phase 0 PR contributors. Those slots fill in by May 15.

DM template (one-size-fits):

> Hey @<handle> — your [PR #X / comment on issue #Y / your reframe of dimension Z] in the bench Phase 0 thread shaped rubric v0.2 more than any other input. I want you to be one of the 10 beta devs who scan a setup before public launch May 22.
>
> `npx @imasaikiran/bench@alpha`. ~5 min. Local until you `y`. Reply with the score + the dimension you'd PR next, no formal writeup needed.

---

## Tracking sheet (recorded inline, not a Notion link)

Update this section as DMs land.

| Slot | Name | Channel | Sent | Replied | Scanned | Score given | Notes |
|------|------|---------|------|---------|---------|-------------|-------|
| 1 | Marco Lancini | X DM | TODO | | | | |
| 2 | Freek van Herk | X DM | TODO | | | | |
| 3 | Simon Willison | X DM | TODO | | | | |
| 4 | Harper Reed | X DM | TODO | | | | |
| 5 | Geoff Huntley | X DM | TODO | | | | |
| 6 | Sai Krishna Reddy | Email | TODO | | | | |
| 7 | Ben Newton | Email | TODO | | | | |
| 8 | awesome-claude-code top contrib | GitHub issue | TODO | | | | |
| 9 | Anthropic Discord power user | Discord DM | TODO | | | | |
| 10 | Phase 0 PR contributor #1 | TBD | TODO (May 15) | | | | |
| 11 | Phase 0 PR contributor #2 | TBD | TODO (May 15) | | | | |
| 12 | Phase 0 PR contributor #3 | TBD | TODO (May 15) | | | | |

Slot 10–12 are floats — first 3 of these to clear an alpha scan stay; remaining drop.

---

## What "useful" looks like from a beta dev

Founder's evaluation rubric for whether the beta phase actually helped:

1. **At least 1 reproducible bug filed before May 22.** If none, beta surfaced no bugs we couldn't have caught with our own snapshot tests — neutral signal, not negative.
2. **At least 3 "the number is wrong because…" critiques** that name a specific dimension and propose a fix. These feed rubric v1.1 (Phase 2).
3. **At least 2 unprompted shares** to X. If zero unprompted shares, the share UX is the bottleneck, not the audience.
4. **At least 1 dev who runs the CLI a second time without being prompted** — strongest signal that the rescan loop works.

If none of (1)(2)(3)(4) clear, the beta cohort was wrong-fit and the public launch on May 22 should slip by 1 week to find a better one. This is a kill-by-postpone gate, not a hard kill.
