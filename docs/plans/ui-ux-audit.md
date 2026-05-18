# UI/UX audit — bench v2

> **Date:** 2026-05-11.
> **Trigger:** founder relayed friend feedback: "looks extremely sloppy, wordings not clear, buttons not clear, graphs don't say anything, too complex for one person to understand."
> **Method:** audited the live `/demo` and `/` against five lenses: UX design, behavioral, analytical, content strategy, PM. Grounded in rendered copy + screenshots, not assumptions.
> **Constraint:** v1 frontend (markup + styles.css + script.js) is FROZEN and hash-pinned. Fixes route through the v2 persona-mapper, the Recommendations component, v2-layer CSS overrides, and the v2-owned landing/about pages.

---

## 1. One-sentence verdict

The product speaks its own internal language to a first-time visitor and shows the same number three times while never saying what the number is out of. The friends are right.

---

## 2. The core problem (PM + content lens)

The job a visitor hires bench for: **"tell me if my Claude Code setup is good, and what to fix first."**

A shared-link visitor gives ~5 seconds before deciding to install or bounce. In those 5 seconds the current `/demo` makes them parse, in order:

1. A fake persona switcher (Sam / Priya / Maya / Alex / Preview)
2. A jargon disclaimer ("synthetic profile · fictional developer · shown for explainer purposes")
3. A headline ("You've been building.")
4. A 4-stat tile strip (weeks / skills / prompts / plan mode)
5. A tier line ("Tinkerer at week 14")
6. **A second identity block** ("your bench / @priya_dev / 187h / hours Claude gave back / …")
7. A third restatement ("Tinkerer · Bench 62 · Wk 14")

The answer to the job ("is it good? what to fix?") is buried under six layers of restated identity and zero anchoring. Time-to-comprehension is far past 5 seconds.

---

## 3. Findings by lens

### 3.1 Content strategy — the words don't land

| String (live) | Problem | Plain-language fix |
|---|---|---|
| "synthetic profile · fictional developer · shown for explainer purposes" | Three ways to say "fake." Jargon. | "This is a sample card. Yours uses your real setup." |
| "hours Claude gave back" | Spec §5.3 changed this to "hours with Claude Code" — the v1 asset + mapper still emit the old, overclaiming line. The founder's own architect review called "gave back" intellectually dishonest. | "hours you've spent with Claude Code" |
| "187h back — 23 workdays, or a side-project shipped" | Overclaim. Implies bench knows what you'd have done with the time. | "≈ 23 working days, side by side with Claude Code" |
| "Bench 62" | A score with no scale. 62 of what? Percentile? Out of 100? Nobody can tell. This is the "graphs don't say anything" complaint. | "Setup score 62 / 100" |
| "Tinkerer" | Tier name with no definition anywhere on the page. | Add one line: "Tinkerer — past the basics, still pruning." |
| "Automation is the next lever." | "lever" is internal jargon. | "Weakest area: Automation. Fix that next." |
| "what to add / The fastest four moves." | Says "four," shows 15. Direct contradiction. | "What to add next" + show the top 3 missing, "see all 15" expands. |
| "Community-sourced from Boris's setup, awesome-claude-code, and alexop.dev." | Name-drops mean nothing to a newcomer. Boris who? | "Sourced from widely-shared Claude Code setups." |
| chapter labels "building / needs work / strong" | Three states, no legend, "building" vs "needs work" ambiguous — which is worse? | Two states only: "Strong" / "Needs work", with a one-line legend. |
| "Download bench" | Download what? Card image? CLI? JSON? Ambiguous primary button. | "Save my card (PNG)" |

### 3.2 UX design — hierarchy and redundancy

- **Three identity blocks.** `187h`, `Tinkerer`, `week 14` each render three times in the first screen. Pick one hero block. Delete the other two. The eye has no primary focal point because everything is repeated at equal weight.
- **The persona switcher (Sam/Priya/Maya/Alex) is a v1 prototype artifact.** On a real scan all four buttons show the same data (the v2 shim overrides every key). It is pure confusion with zero function in production. Hide it via v2 CSS override.
- **Button hierarchy is flat.** "Download bench", "Share on X", "LinkedIn" sit at equal visual weight. The primary action (share — that is the entire growth loop per spec §11.2) is not visually primary. "LinkedIn" lacks the "Share on" prefix the X button has — inconsistent.
- **The score has no visual anchor.** "Bench 62" is a number in a line of text. No bar, no /100, no scale. A score the user cannot place is a graph that says nothing.

### 3.3 Behavioral — can the user act?

- Good behavioral copy already exists in the must-haves microcopy: "Stops the 'allow?' prompt ~30× a day" and "No more 'please format.' Diffs land clean." These are concrete and consequence-framed. Keep this voice; it is the one part working.
- The chapter dials fail the action test. "Foundation: building" gives the user nothing to do. A user reading "needs work" vs "building" cannot tell which to fix first or what the gap is.
- "The fastest four moves" promises a short, ranked action list. Delivering 15 items unranked breaks the promise and induces the exact overwhelm the friends reported.

### 3.4 Analytical — information density

- First screen of `/demo` carries ~11 distinct data points (4 tiles + hours + meaning + signature + tier + score + week + handle + date) before any explanation of what one of them means. Cognitive load is front-loaded; payoff (what to fix) is below the fold.
- The constellation visual encodes 25 dimensions as dots. Without a legend it reads as decoration, not data. "Graphs don't say anything" — correct, because nothing maps the dots to meaning on-screen.

### 3.5 PM — is the product solving the stated problem?

The problem (spec §0.5): the anxious improver wants a mirror. The mirror currently shows them their reflection six times and never circles what to fix. The fix is not more features. It is **subtraction**: one identity block, one anchored score, one ranked action list, defined terms.

---

## 4. Prescription — three tiers

### Tier 1 — copy + clarity (no layout risk, ship first)

All via v2 persona-mapper (`web/lib/mapper.ts`), Recommendations component, and a v2 CSS override. v1 frozen asset untouched.

1. `hours Claude gave back` → `hours you've spent with Claude Code` (also closes the spec §5.3 drift bug).
2. `Bench 62` → `Setup score 62 / 100` everywhere it renders.
3. Add a one-line tier definition under the tier name.
4. `Automation is the next lever.` → `Weakest area: Automation. Fix that next.`
5. Fix "four moves / 15 shown": rename to "What to add next", default-collapse to top 3, "show all 15".
6. Replace `synthetic profile · fictional developer · shown for explainer purposes` → `This is a sample card. Yours uses your real setup.`
7. Drop the "Boris" name-drop.
8. Chapter states: collapse three vague labels to `Strong` / `Needs work` + a one-line legend.
9. Button copy: `Download bench` → `Save my card (PNG)`; `LinkedIn` → `Share on LinkedIn`.

### Tier 2 — hierarchy (v2 CSS override, medium risk)

10. Hide the v1 persona switcher (Sam/Priya/Maya/Alex) in production via `web/public/v2/atelier-overrides.css` `display:none`.
11. Suppress the two redundant identity restatements; keep one hero block. (Override CSS to hide the duplicate `.handle` / restated tier rows the v1 markup paints.)
12. Make Share the visually primary button (filled gold), Save secondary (outline), via the existing ShareBar + a v2 override on the v1 `.btn` row.
13. Add a `/100` scale bar under the score (small v2-injected element, not a v1 edit — appended in V1Page after the hero, like FeedbackForm/ShareBar already are).

### Tier 3 — landing + about (v2-owned, free to edit)

14. Landing hero: replace "A portrait of how you work with Claude Code" with a concrete promise: "Score your Claude Code setup. See what's working and what to fix — in one command."
15. Compress the 6-paragraph trust grid to 4 short lines.
16. Move "The bet behind this" off the landing (insider content) into `/about`.

---

## 5. What this audit refuses to do

- Does not edit the v1 frozen frontend. Hash pin holds.
- Does not add features. Every fix is subtraction or relabeling.
- Does not touch the rubric or scoring. This is a presentation audit, not a methodology audit.
- Does not soften the verdict. The friends' feedback is accurate and was not defended away.

---

## 6. Expected outcome

After Tier 1 + 2, the first screen of a shared `/demo` link reads, top to bottom:

1. "This is a sample card. Yours uses your real setup."
2. **187h** — hours you've spent with Claude Code (≈ 23 working days)
3. **Setup score 62 / 100** · Tinkerer (past the basics, still pruning)
4. Weakest area: **Automation**. Fix that next.
5. What to add next: [3 ranked items] · show all 15
6. [Share on X — primary] [Share on LinkedIn] [Save card]

One identity. One anchored score. One ranked next action. Defined terms. That is the mirror the spec promised.
