# bench — house style

> **Scope:** prose written for the bench product, repo, and any public surface — landing copy, weekly posts, audit docs, commit bodies, PR descriptions. Not user-supplied content (`/api/feedback` rows pass through untouched).
> **Status:** authoritative. If something in another doc contradicts this one, this wins.

The rules below are anti-patterns. Each is a thing the project does NOT do. Most originated as findings from the May 2026 AI-slop audit (see `docs/plans/v2-design-audit.md` peer files for the audit trail).

---

## 1. Forbidden patterns

| Anti-pattern | Why forbidden |
|--------------|---------------|
| **"We"-speak.** "We're excited to announce", "we believe", "we built". | bench is a one-developer side project. "we" implies a team that does not exist. Use "I" for the founder; use "bench" for the product. |
| **Marketing verbs.** "excited", "thrilled", "stoked", "delighted", "proud", "honoured". | The reader feels excitement. The writer does not claim it. |
| **Synthesizing numbers** to fill a histogram, round a percentage, or paper over a quiet week. | Spec §5.8: *"No fake scans to pad the histogram. No borrowed Wakatime-style numbers."* |
| **Shaming low-tier users.** "Most people are still Explorer-tier 😬". | Spec §0.5.2 frames Explorer as the curious newcomer — funnel, not failure. Treat the bottom of the histogram with the same voice as the top. |
| **Editing the rubric in response to your own week's score.** | Spec §6.1: the founder cannot merge a PR that pushes their own tier without the same evidence + cooldown bar as anyone else. |
| **Sideways punches at adjacent tools** (Klout, Wakatime, CodersRank, Cursor) in product voice. | The competitive frame lives in spec §3.4, not in landing copy or social posts. |
| **Marketing-soft asks.** "I'd love to hear", "I'd appreciate", "would mean a lot", "if you have time". | Tighten to the direct ask. "Tell me what's missing", "either add X or critique Y". |
| **Filler adjectives.** "comprehensive", "robust", "nuanced", "seamless", "cutting-edge", "holistic", "crucial", "paramount", "empower", "streamline", "delve". | Replace with the concrete thing being described. |
| **Tic phrases.** "highest-leverage", "load-bearing" used metaphorically. | If something is highest-leverage, name what it leverages (e.g. "the OG card determines CTR"). If something is load-bearing, name what it bears. |
| **Performative critique.** "Brutal pass." "Pathetic verdict (named, not softened)." "Honesty rule: the audit names what's bad before naming what to do." | Be honest, do not announce that you are being honest. |

---

## 2. Em-dash discipline

Em-dash density is the strongest AI-fingerprint signal in this repo's writing. Hard rule:

- **Aim for ≤ 1 em-dash per 20 lines** in any doc you write.
- Em-dashes are fine inside table cells and inside quoted tweet/post bodies where rhythm earns them.
- Use commas for parentheticals, colons before lists, semicolons for sentence-joins. Save em-dashes for genuinely disjunctive interruptions.

Reference current density on the three slop-flagged files (post-audit, 2026-05-11):

| File | em-dashes | lines | density |
|------|-----------|-------|---------|
| `docs/plans/v2-design-audit.md` | 12 | 150 | 1 per 12.5 lines |
| `docs/launch/phase0-outreach-copy.md` | 9 | 159 | 1 per 17.7 |
| `docs/launch/phase1-weekly-template.md` | 6 | 132 | 1 per 22 |

If a new doc lands with density > 1 per 10 lines, a reviewer should push back.

---

## 3. Commit messages

- **Subject:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Under 70 characters. Imperative mood.
- **Body:** 0–10 lines. Explain the *why*, not the *what*. The diff shows what.
- **Forbidden in commit bodies:** marketing verbs, performative voice, AI-changelog-style "this is amazing because" framing, exhaustive enumeration of every line touched. The diff is the enumeration.
- **`🤖 Generated with [Claude Code]` footer:** if used, used consistently. Currently the repo has it on some commits and not others — pick one and apply uniformly going forward.
- **`Co-Authored-By: Claude` trailer:** same rule. Consistent or absent.

Reference: this STYLE.md commit body is the target length. Anything past 10 lines and you're writing a changelog, not a commit message.

---

## 4. Pull-request descriptions

- Lead with a one-line summary at the top.
- Include a small table for multi-item PRs (item / where / diff). Tables beat prose when listing changes.
- "Test plan" checklist with concrete commands (`pnpm -C web build clean`, not "tests pass").
- Skip the "Generated with Claude" footer unless every PR has it. Consistency over individual flair.

---

## 5. Outreach copy (X threads, Reddit, Discord, DMs)

- Voice: terse, opinionated, asks a real question.
- No "excited to announce" energy. Ever.
- One direct ask per post: "argue with chapter 5", "tell me what number it gives you", "PR the rubric". Not "feedback welcome" or "thoughts?".
- Quote real numbers. If you don't have a number yet, do not invent one.
- For X threads: 5 tweets max. Each tweet must stand alone — first tweet is the hook + the ask.

---

## 6. Public artifacts ship through this filter

Before any of the following ships, it gets a final read against §1–§5:

- Anything posted to X / LinkedIn / r/ClaudeAI / Discord
- Anything that renders to `bench.dev` (landing copy, /about, /how-we-scored, /demo, footer text)
- Any commit landing on `main`
- Any PR description on `Imasaikiran/bench`

Internal-only docs (audit notes, planning scratch) are exempt from the formality of §3–§4 but still bound by §1–§2.

---

## 7. Self-test before publishing

Two-question gate before any public-surface text ships:

1. **Does it sound like one person wrote it?** If it sounds like a content-marketing team, rewrite.
2. **Would a skeptical reader spot AI fingerprints?** If yes (em-dashes everywhere, "highest-leverage" twice, "we" without a team), rewrite.

If both pass, ship.
