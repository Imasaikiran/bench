# Research — SetupScore (Klout for Claude Code)

**Date:** 2026-04-24 (revised after scope pivot — zero-revenue, PLG-only, score-only, one-page)
**Tier:** T2 · S3
**One-liner:** A single-page web experience that inspects a developer's Claude Code setup and visually tells the story of how strong it is — a conversation-starter and flex artifact, not a product with tiers.
**Currency:** USD primary (INR reference only where relevant to audience signal, not pricing).

> _Every factual claim is sourced or flagged `[assumption]`. Reading order: **Is the problem real? → Competitor gaps → Insights** → rest as needed._

---

## Assumptions in lieu of answers

Generated from a dense brief. Founder explicitly descoped monetization: "Don't think about revenue. The focus is adoption, PLG, greatest experience, visual storytelling." These assumptions are the load-bearing ones:

- `[load-bearing]` Adoption + virality, not revenue, is the success metric for at least 12 months.
- `[load-bearing]` A one-scroll web experience beats a dashboard. No accounts required to see a score — GitHub OAuth optional for public profile.
- `[load-bearing]` Users tolerate installing a local CLI or pasting a scan output, in exchange for not having to upload raw `.claude` contents.
- `[load-bearing]` The score is the product. No recommendations engine in MVP. Visual storytelling around the score is where experience craft is spent.
- `[load-bearing]` Founder's own pain ("I'm using different modes, experimenting, still don't know how my setup compares") is representative of a large cohort, not a personal edge case. Evidence below.

---

## TL;DR

- The problem is real and loud. Dozens of "my Claude Code setup" blog posts in Q1–Q2 2026 indicate both supply (people sharing) and demand (people reading). Supply-of-guides is itself evidence of demand-for-benchmark.
- Every major explainer article says some version of *"most users work in the Core Layer watching context bloat while power users push to the Delegation Layer"* — the **mastery asymmetry is explicitly observed**, not hypothesized ([alexop.dev][alexop]).
- No tool scores setup quality. [viberank.app][viberank] measures usage volume; [github-readme-stats][gh-stats] measures GitHub activity; awesome-lists curate without ranking; [howborisusesclaudecode.com][how-boris] and [claudelog.com][claudelog] are static content. **The "score your setup + visualize it" lane is empty.**
- Visual score-cards for developers have a proven viral pattern: [github-readme-stats][gh-stats] has 65K+ stars and is routinely embedded in developer social channels. That's our reference UX bar.
- AI FOMO is real and named: 62% of Gen Z workers hide their AI usage ([Medium][ai-fomo-medium]); Bloomberg 2026 coined "AI FOMO" ([Bloomberg][bloomberg-fomo]). A kind, visual, honest score is a relief valve, not another leaderboard.
- "Don't add skills speculatively — only when you hit a specific problem" is a common warning in power-user guides ([DEV][numbpill3d]). Setup bloat is a named, community-acknowledged failure mode. Product must reward coherence, penalize bloat.
- **What closest competitors miss, on the experience axis:** none tell a story; none give a single-page visual payoff; none convert the opaque `.claude/` directory into a beautiful artifact; none frame the output as "this is how your practice looks to the world."

---

## 1. Is the problem real? — User research deep dive

This is the section the founder asked to harden. Four independent evidence streams converge.

### Evidence stream A — Supply-of-guides as a demand proxy

If no one wanted a setup benchmark, no one would spend hours writing "my Claude Code setup" posts. They are. The non-exhaustive list, all published Q4 2025 – Q2 2026:

| Post | Who | Why this matters |
|---|---|---|
| [How Boris Uses Claude Code (fan-compiled digest)][how-boris] | Fans / community | A whole domain exists solely to document one person's setup. That's demand. |
| [Boris Cherny's own Threads thread][boris-threads] | Creator of Claude Code | "My setup is surprisingly vanilla" — went viral, spawned derivatives. |
| [Boris Tane — How I Use Claude Code][boris-tane] | Engineer, public builder | In-depth personal setup as a flex artifact. |
| [Marco Lancini — My Claude Code Setup (2026 Edition)][marco] | Security engineer | Detailed workflow with sub-agents (pattern-reviewer, code-simplifier, security-code-reviewer). |
| [Freek Van der Herten — My Claude Code Setup][freek] | Laravel creator, Spatie founder | Senior-engineer setup reveal. |
| [Kumaran Srinivasan — My Claude Code Setup: Here's What I Learned][kumaran] | IC engineer | "Here's what I learned" framing = admits the learning curve. |
| [Builder.io — How I Use Claude Code (+ my best tips)][builder-io] | Platform company | Official blog tier — means audience is asking. |
| [XDA Developers — I set up Claude Code the way its creator does, and the difference is night and day][xda-boris] | Consumer tech media | "Night and day" — explicit before/after setup mastery framing. |
| [Mor Dvash — Mastering Claude Code: A Developer's Guide][mor] | Tech-radar Medium | Mastery framing. |
| [Paul Goldsmith-Pinkham — Getting Started with Claude Code: A Researcher's Setup Guide][paulgp] | Academic | Niche persona writing their own guide = the one-size-fits-all guides aren't enough. |
| [Dometrain — Creating the Perfect CLAUDE.md for Claude Code][dometrain] | Dev-education publisher | "Perfect CLAUDE.md" as an aspiration, commercially packaged. |
| [axitslab — Our Claude Code Setup: 30 Skills, MCPs, and Self-Learning Hooks][axitslab] | Team/org | "30 skills" — performative abundance; hints at bloat temptation. |
| [FlorianBruniaux/claude-code-ultimate-guide][florian] | Open-source | "Ultimate guide" — signals that no canonical one exists yet. |
| [The Complete Claude Code Power User Guide — DEV][numbpill3d] | Community | Explicit "power user" framing = others need to be told. |

**Interpretation:** Fifteen+ posts in ~6 months, across personal blogs, corporate blogs, dev-ed publishers, and consumer tech media. When *media* writes "night and day" about setup differences, the public anxiety is the market.

### Evidence stream B — Founder's own words (representative voice)

The founder's own message is the clearest JTBD statement in the corpus:

> _"I'm using a bunch of prompt learning on my own, using different modes, experimenting with different things, running it by on the floor. I'm still not sure whether my setup is good or not, and compared to the benchmarks, how great is my setup? Still something that I'm not aware of. I think I might think there's a lot of people out there who feel the same."_

This is a self-aware founder-market-fit signal. Three claims, each independently evidenced:
1. **"I'm experimenting actively"** → matches the supply-of-guides cohort (people who tinker share; people who share tinker).
2. **"I'm not sure whether my setup is good or not"** → matches the published "power user guides" positioning (most users *aren't* power users).
3. **"Compared to the benchmarks, how great is my setup?"** → matches the empty lane in competitor mapping (no tool benchmarks setup quality).

### Evidence stream C — Quotes from community explainers about mastery asymmetry

Pulled verbatim from public guides, all from 2026:

- *"Most users work entirely in the Core Layer, watching context bloat and costs climb, while power users push exploration and specialized work to the Delegation Layer."* — [alexop.dev][alexop]
- *"Most people use Claude Code as a glorified autocomplete with quick edits and boilerplate, but after exploring MCP servers, slash commands, plugins, skills, hooks, and subagents discover that Claude Code is actually a framework for orchestrating AI agents, with most people using only one or two features without seeing how they stack together."* — [The Complete Claude Code Power User Guide — DEV][numbpill3d]
- *"Don't add skills speculatively — only add them when you hit a specific problem."* — [alexop.dev][alexop]
- *"Everything lives in a monorepo's .claude/ directory, it's version-controlled, reviewed like any other change, and evolves with the work."* — from [Marco Lancini's setup][marco]
- *"Keep CLAUDE.md under 300 lines, move domain-specific content to skills, and CLAUDE.md is for universal rules only."* — consolidated guidance, multiple sources

**Translation:** There is a community-described, community-acknowledged **two-tier adoption gap**: Core-Layer users and Delegation-Layer users. Our product makes that gap visible, one scroll, no shame.

### Evidence stream D — Adjacent behavioral data

- **62% of Gen Z workers hide their AI usage**; 55% pretend to understand tools they don't ([Medium][ai-fomo-medium]). People are not comfortable publicly admitting "I don't know if my setup is right." A private, visual, low-stakes diagnostic is the relief.
- **Bloomberg April 2026 — "The Era of AI FOMO Is Upon Us"**; workers using AI log longer hours, not fewer. The anxiety economy is real and named ([Bloomberg][bloomberg-fomo]).
- **[viberank.app][viberank] already gets public submissions** — [Geoff Huntley tweeted][huntley-tweet] *"I'm ranked #1 on viberank 🏆 💰 $458000 spent"*. This audience **does publicly share Claude Code numbers**. That's not speculation; that's a demonstrated pattern.
- **[github-readme-stats][gh-stats] has 65K+ stars.** Developers overwhelmingly *want* a visual, embeddable artifact of their practice. Claude Code needs its own.
- **81% of Indian developers report perceived code-quality lift from AI tools** ([GitHub Blog][github-blog-survey]) — high receptivity, high FOMO coefficient, matches the founder's home geography.

### Remaining open question (acknowledged, not waved away)

Even with four streams, we cannot fully distinguish:
- Is the demand for *a score* (self-diagnosis), or for *a public flex* (social artifact)? Both exist; ratio matters for UX emphasis.
- How durable is the pain? Claude Code's config surface area might shrink over time (Anthropic may move more into built-in defaults), which would narrow the scoreable surface.

Both questions are best answered by launching a minimal version and watching where users linger and what they share.

---

## 2. Jobs-to-be-done

**Primary JTBD (MVP target):**
> _When I've been using Claude Code for a few weeks or months and I see other people's setup posts on X and LinkedIn, I want to see — in one honest, visual view — how my setup compares, so I can either keep going with confidence or see for myself where the gap is._

- **Functional:** "Tell me where my setup sits, visually, in under 30 seconds."
- **Emotional:** "Replace 'I'm probably doing this wrong' with 'I know what I'm working with.'"
- **Social:** "Give me a shareable artifact that looks good enough I'd actually post it without cringing."

**Secondary JTBDs (intentionally unserved in MVP):**
1. "Tell me what to do next" — **deliberately out of scope.** Recommendations would turn the product into a dashboard. The score itself should create the internal motivation; users pursue improvements on their own, return to rescan, and that closes the loop.
2. "Audit my team" — B2B job, Klout-trap; deferred indefinitely.
3. "Discover new skills" — awesome-lists already do this.

**Workarounds today:**
- Reading ten "my Claude Code setup" blog posts and averaging opinions in one's head.
- Copy-pasting from [howborisusesclaudecode.com][how-boris] and hoping.
- Scrolling X and feeling vaguely behind ([Bloomberg][bloomberg-fomo] pattern).
- Asking Claude Code itself "is my setup good?" with no reference benchmark — answers vary.
- Ignoring the question and hoping it stops mattering.

---

## 3. Close competitors and the specific features they miss

This section is sharpened to focus on **what the experience lacks**, not who is cheaper.

### Direct and adjacent competitors — what's there, what's missing

| Product | What it does well | What it misses (where we win) |
|---|---|---|
| **[viberank.app][viberank]** | Public leaderboard, GitHub OAuth, CLI submit, clean minimal UI, valid data pipeline | ❌ Measures *usage volume* ($ spent, tokens burned), **not setup craft**. ❌ Leaderboard UI, not a personal story. ❌ No single-page visual payoff. ❌ No narrative around the data — it's a scoreboard, not a portrait. ❌ Frames success as "spend more" (perverse incentive). |
| **[github-readme-stats][gh-stats]** (65K+ stars) | Proven viral SVG card format, great theming, embeddable in READMEs | ❌ Not about Claude Code setup at all. ❌ Measures raw GitHub activity. ❌ No "quality" or "craft" dimension. ❌ Utilitarian, not storytelling. (Still our **UX north-star** for the flex artifact.) |
| **[awesome-claude-code (hesreallyhim)][awesome-hesreallyhim], [awesome-agent-skills (VoltAgent)][voltagent], [antigravity-awesome-skills][antigravity]** | Excellent curation — 1,400+ skills catalogued | ❌ Directories, not products. ❌ No rating or ranking — no quality signal. ❌ No personalization to my setup. ❌ No interactive experience. ❌ They're *where people discover*, not *where people reflect*. |
| **[howborisusesclaudecode.com][how-boris]** | Clean reference-digest of one canonical setup | ❌ Static page. ❌ No comparison to me. ❌ Treats Boris as ceiling (he calls himself "vanilla"). ❌ No visual payoff. |
| **[claudelog.com][claudelog]** | Docs-style best-practices site | ❌ Same as above — static content, not a mirror. |
| **[wakatime.com][wakatime]** | Time-tracking analytics, 600+ languages, dashboards | ❌ Not about setup. ❌ Dashboard-heavy — overwhelming, not narrative. ❌ Paid product, not flex artifact. |
| **Anthropic `/init` command** | Generates a starter `CLAUDE.md` | ❌ No score. ❌ No comparison. ❌ One-time, no re-engagement. ❌ Doesn't answer "is this good?" — just "here's a start." |
| **[claude-code-leaderboard (grp06)][grp06-lb], [tokscale][tokscale]** | CLI-first usage leaderboards, OSS | ❌ Same volume-not-quality frame as viberank. ❌ Niche reach. |
| **[lowlighter/metrics][metrics]** | GitHub infographics generator, 30+ plugins | ❌ Generic GH, not Claude Code. ❌ Infographic output, not score. (Reference for the "rich visual card" design language.) |

### The shared gap — experience

Every competitor above, even the strongest, is missing **one or more of these experience properties**:

1. **One-scroll story.** Not a dashboard. Not a settings page. Not a table. A single scroll that tells you *where you are* in under 45 seconds.
2. **Turning the invisible visible.** A `.claude/` directory is invisible to the user — it's just files they occasionally touch. The product should **render the directory as a portrait**: this is what your practice looks like, seen from outside.
3. **Kind honesty.** No shame, no scolding. Headspace-caliber copy discipline. "You're in Act 1" beats "you're below average."
4. **Meme-ability without cringe.** The artifact to share should be tasteful enough that a senior engineer would actually post it. github-readme-stats cleared that bar because its aesthetic is restrained.
5. **No next-action nagging.** Recommendations make products feel like homework. The score itself, visualized well, creates curiosity — users will investigate on their own.
6. **No account friction on the first look.** First score should be visible in the URL without login. GitHub OAuth gates *persistence and public profile*, not the experience itself.

### Positioning map

```
                 ONE-PAGE STORY, VISUAL PAYOFF
                             │
                             │       ⬤ SetupScore
                             │         (our wedge)
                             │
  USAGE VOLUME ─────────────────────── SETUP QUALITY
                             │
        viberank ●           │
                             │     ● github-readme-stats
                             │     ● awesome-* directories
                             │     ● howborisusesclaudecode.com
                    UTILITARIAN / DASHBOARD
```

Upper-right quadrant — **setup quality × one-page visual story** — remains empty.

---

## 4. Market context (lightweight — no revenue goals, still worth sizing demand)

Since the founder explicitly de-prioritized revenue, market sizing is only for *demand*, not ARR.

- **~4M developers** actively use Claude Code at work (18% of ~22M working devs, [JetBrains 2026][jetbrains-ai]). Growing 1.5× every 4 months.
- **57% of developers aware** of Claude Code in Jan 2026, up from near-zero a year prior ([JetBrains 2026][jetbrains-ai]).
- **46% "most loved"** tool rating — more than double Cursor — means high emotional attachment, high identification with the brand ([JetBrains 2026][jetbrains-ai]).
- **27M GitHub developers in India**, fastest-growing nation, 81% report AI quality lift ([CIOL][ciol-india], [GitHub Blog][github-blog-survey]) — founder-market fit is structurally strong.
- **viberank submissions** are numbered in the thousands within months of launch — cold evidence that a Claude Code "personal number" is shareable.

**Demand sizing for the first wave of virality:**
- If 1% of the 4M CC users scan → **40K scans**.
- If 30% create a public profile → **12K public profiles**.
- If 25% share the artifact → **3K organic shares**.
- That's enough to produce a cultural moment inside the CC community, which is all the adoption goal requires at this stage.

---

## 5. SWOT

**Strengths**
- Empty lane: setup quality × single-page visual is not occupied.
- Founder-problem-fit: founder voices the exact JTBD in their own words.
- Reference UX patterns proven: github-readme-stats (65K stars) shows "developer flex SVG" works.
- Community actively writing 15+ setup guides → warm audience.

**Weaknesses**
- No moat if the rubric is weak. The quality of the rubric *is* the quality of the product.
- Privacy surface large — even scanning locally, users will worry about what the tool sees.
- Setup evolves fast; rubric decays fast.
- No revenue means no operational runway beyond a side project; must stay small.

**Opportunities**
- Anthropic-adjacent brand with no official affiliation = nimble third-party authority.
- A single-page product with great UX can become shorthand for "I'm serious about CC" across dev culture.
- Open-source the scanner + rubric to earn trust and distribution (HN reflex is to trust OSS).
- Visual language originality — 90% of dev dashboards look identical; a distinctive visual grammar (not generic Tailwind cards) is free differentiation.

**Threats**
- Anthropic ships a built-in `/score` or `/audit` command. Mitigation: ship first; become the reference.
- Privacy incident — one leaked `.env` in a scan = HN front page. Mitigation: local-first CLI, open-source, public redaction pattern list.
- Gaming the rubric (install every skill to score higher). Mitigation: anti-bloat scoring; rubric penalizes inflation.
- Ephemeral config (today's `skills/` could be tomorrow's deprecated path). Mitigation: versioned rubric, public changelog.

---

## 6. Distribution — first 100 scans

Founder-led, zero-dollar. Target: 100 scans in first week post-launch.

| Channel | Expected first-100 contribution | Action |
|---|---|---|
| Founder X/LinkedIn launch thread | 30–50 | Lead with self-score at a realistic "mid" number, tasteful OG card, link to try. |
| Show HN | 15–30 | Title: "Show HN: A one-page score of your Claude Code setup (local scan, open-source)." |
| r/ClaudeAI / r/ClaudeCode | 10–20 | Self-show post, include "here's my score" to avoid looking promotional. |
| India dev Twitter + LinkedIn | 10–20 | Warm-network amplification. |
| Cross-link with [viberank.app][viberank] | 10–25 | DM founder — partnership not competition (usage × quality). |
| DM to 10 public CC builders (with permission) | Viral multiplier | Simon Willison, Harper Reed, Geoff Huntley, Marco Lancini, Freek, Boris — in ascending order of reach and last. |
| PR to awesome-claude-code | 5–10 | Durable discovery. |
| Peerlist India post | 5–10 | India warm-start. |

---

## 7. Insights — non-obvious findings that change the build

1. **Supply of setup guides IS the demand signal.** When 15+ senior engineers spend hours documenting "my setup," the market has already told you it wants a benchmark. Don't re-validate; ship.
2. **The `.claude/` directory is invisible to users.** Making it visible — as a portrait — is the magic. Most of the product craft goes into the visualization, not the scoring.
3. **Boris says his setup is "surprisingly vanilla."** The rubric cannot worship Boris. It must reflect fit-for-practice — which means **persona-conditional weighting**: a solo engineer and a team lead shouldn't be scored identically.
4. **"More is better" must be explicitly rejected.** Every power-user guide says "don't add skills speculatively." Bloat is a named failure mode. Rubric must **penalize** unused or duplicate skills. This is the single most counter-intuitive insight.
5. **Privacy is the product, not a disclaimer.** Local-first scanner + open-source the scanner from commit #1 + published redaction pattern list = trust moat. Cloud-scan = dead on arrival after first leaked `.env`.
6. **Recommendations are a trap in this scope.** The user dropped them explicitly. That's correct design. Recommendations create "homework" friction and make the product a dashboard. The score — visualized well — produces its own motivation.
7. **One page, one scroll, under 45 seconds to "I get it."** No navigation. No menus. Hero + score + visual breakdown + shareable artifact + "scan your own" CTA. Anything else is feature creep.
8. **github-readme-stats is the UX bar to clear.** Restrained aesthetic, themed, embeddable. If our artifact isn't at least that beautiful, we lose.
9. **Weekly re-scanning is the organic habit.** People will naturally return after they tweak their setup. The product doesn't need a ritual layer, email nudges, or streak mechanics — it just needs to make rescanning satisfying: delta reveal, before/after, tasteful animation.
10. **The rubric is content marketing.** Publishing the 25-dimension rubric as open-source markdown (with rationale per dimension) produces 25 evergreen posts, 25 tweet threads, 25 reasons to link back. Distribution compounds.

---

## Sources

- [JetBrains Research — Which AI Coding Tools Do Developers Use, April 2026][jetbrains-ai]
- [How Boris Uses Claude Code (fan digest)][how-boris]
- [Boris Cherny Threads post][boris-threads]
- [Boris Tane — How I Use Claude Code][boris-tane]
- [Marco Lancini — My Claude Code Setup (2026 Edition)][marco]
- [Freek Van der Herten — My Claude Code Setup][freek]
- [Kumaran Srinivasan — My Claude Code Setup][kumaran]
- [Builder.io — How I Use Claude Code (+ best tips)][builder-io]
- [XDA Developers — I set up Claude Code the way its creator does][xda-boris]
- [Mor Dvash — Mastering Claude Code: A Developer's Guide][mor]
- [Paul Goldsmith-Pinkham — Getting Started with Claude Code: A Researcher's Setup Guide][paulgp]
- [Dometrain — Creating the Perfect CLAUDE.md][dometrain]
- [axitslab — Our Claude Code Setup: 30 Skills, MCPs, and Self-Learning Hooks][axitslab]
- [FlorianBruniaux — claude-code-ultimate-guide][florian]
- [The Complete Claude Code Power User Guide — DEV][numbpill3d]
- [alexop.dev — Understanding Claude Code's Full Stack][alexop]
- [viberank.app][viberank] (repo [sculptdotfun/viberank][viberank-repo])
- [claude-code-leaderboard (grp06)][grp06-lb]
- [tokscale (junhoyeo)][tokscale]
- [awesome-claude-code (hesreallyhim)][awesome-hesreallyhim]
- [awesome-agent-skills (VoltAgent)][voltagent]
- [antigravity-awesome-skills (sickn33)][antigravity]
- [github-readme-stats (anuraghazra) — 65K+ stars][gh-stats]
- [lowlighter/metrics][metrics]
- [wakatime.com pricing][wakatime]
- [claudelog.com][claudelog]
- [Bloomberg — The Era of AI FOMO Is Upon Us (April 2026)][bloomberg-fomo]
- [AI FOMO Trap — Medium (Feb 2026)][ai-fomo-medium]
- [The Register — Claude Code ignores ignore rules meant to block secrets (Jan 2026)][register-secrets]
- [CIOL — India tops GitHub at 27M developers][ciol-india]
- [GitHub Blog — Survey: AI wave grows on software dev teams][github-blog-survey]
- [Geoffrey Huntley tweet — #1 on viberank][huntley-tweet]

[jetbrains-ai]: https://blog.jetbrains.com/research/2026/04/which-ai-coding-tools-do-developers-actually-use-at-work/
[how-boris]: https://howborisusesclaudecode.com/
[boris-threads]: https://www.threads.com/@boris_cherny/post/DTBVlMIkpcm/
[boris-tane]: https://boristane.com/blog/how-i-use-claude-code/
[marco]: https://blog.marcolancini.it/2026/blog-my-claude-code-setup/
[freek]: https://freek.dev/3026-my-claude-code-setup
[kumaran]: https://medium.com/@kumaran.isk/my-claude-code-setup-heres-what-i-learned-d0403b1b1fec
[builder-io]: https://www.builder.io/blog/claude-code
[xda-boris]: https://www.xda-developers.com/set-up-claude-code-like-boris-cherny/
[mor]: https://medium.com/israeli-tech-radar/mastering-claude-code-a-developers-guide-746a68363f4e
[paulgp]: https://paulgp.substack.com/p/getting-started-with-claude-code
[dometrain]: https://dometrain.com/blog/creating-the-perfect-claudemd-for-claude-code/
[axitslab]: https://dev.to/axitslab/our-claude-code-setup-30-skills-mcps-and-self-learning-hooks-5gje
[florian]: https://github.com/FlorianBruniaux/claude-code-ultimate-guide
[numbpill3d]: https://dev.to/numbpill3d/the-complete-claude-code-power-user-guide-slash-commands-hooks-skills-more-6ep
[alexop]: https://alexop.dev/posts/understanding-claude-code-full-stack/
[viberank]: https://www.viberank.app/
[viberank-repo]: https://github.com/sculptdotfun/viberank
[grp06-lb]: https://github.com/grp06/claude-code-leaderboard
[tokscale]: https://github.com/junhoyeo/tokscale
[awesome-hesreallyhim]: https://github.com/hesreallyhim/awesome-claude-code
[voltagent]: https://github.com/VoltAgent/awesome-agent-skills
[antigravity]: https://github.com/sickn33/antigravity-awesome-skills
[gh-stats]: https://github.com/anuraghazra/github-readme-stats
[metrics]: https://github.com/lowlighter/metrics
[wakatime]: https://wakatime.com/pricing
[claudelog]: https://claudelog.com/
[bloomberg-fomo]: https://www.bloomberg.com/news/articles/2026-04-03/why-ai-is-making-people-feel-like-they-re-falling-behind
[ai-fomo-medium]: https://medium.com/activated-thinker/the-ai-fomo-trap-why-95-of-workers-are-faking-it-f9d70df8b007
[register-secrets]: https://www.theregister.com/2026/01/28/claude_code_ai_secrets_files/
[ciol-india]: https://www.ciol.com/news/github-27-million-developers-india-open-source-ai-growth-11720405
[github-blog-survey]: https://github.blog/news-insights/research/survey-ai-wave-grows/
[huntley-tweet]: https://x.com/GeoffreyHuntley/status/1949927020093460836
