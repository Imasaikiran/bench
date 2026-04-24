# PRD — SetupScore (Klout for Claude Code)

**Date:** 2026-04-24 (rev. for zero-revenue PLG scope)
**Tier:** T2 · S3
**Related:** [research.md](research.md) · [plan.md](plan.md)

**Product in one sentence:** A single-page, beautifully visual score of your Claude Code setup — run one command, see a portrait of your practice, share it if you like, rescan whenever you tune something.

---

## 1. Scope discipline (this page first)

Founder directive (2026-04-24):

> _"Don't think about the revenue of this. The focus is to put it out there and I want adoption. I want people to be hooked on it. Greatest experience on the product, product-led growth. Just one page: great experience, visual storytelling, how great the setup is. Think from a value perspective; I'm not revenue-focused."_

Everything below obeys that frame. This PRD is deliberately short — it exists to prevent feature creep, not to spec every surface.

---

## 2. Problem

Developers use Claude Code daily but have no honest signal for how their setup compares to the world. They read 15+ "my Claude Code setup" blog posts, nod, and remain uncertain. The `.claude/` directory is a black box even to its owner. The gap between what it *looks like to have a strong setup* and what mine *actually looks like* is unknowable — until someone shows you, visually, in one page.

**Falsifiable:**
- If fewer than 100 scans happen in launch week → problem is not as loud as we thought; reconsider.
- If users scan once and never come back → the score isn't story-producing; the visualization failed.
- If the share rate is below 15% → the artifact isn't share-worthy; rebuild the visual.

---

## 3. Who it's for

### Primary persona — "The Curious Tinkerer"
- 2–8 years dev experience. Uses Claude Code 5+ hours per week.
- Has a `~/.claude/` directory with some skills, maybe a `CLAUDE.md`, maybe some commands.
- Has read a few setup posts. Experiments on the side. Tweaks modes, installs a skill, turns it off, installs another.
- Feels a quiet, persistent question: *is this working? is this good?*
- Has not written their own setup post. Yet.
- This is the founder's voice from the original message: *"I'm using prompts, modes, experimenting, but I'm still not sure if my setup is good or not, and compared to the benchmarks, how great is my setup?"*

### Secondary persona — "The Public Builder"
- Already has a strong setup. Posts on X. Shares opinions publicly.
- Will run the tool to flex, not to learn.
- Will amplify reach. Zero share-rate among this group = fatal distribution failure.

### Explicit non-users
- Complete beginners with no `.claude/` dir yet — nothing to score.
- Enterprises wanting audit reports — different product; out of scope forever in this PRD.
- Viberank-style usage trackers' users — that's volume, not setup; ceded to viberank.

---

## 4. The single page

The entire product is one page at `setupscore.dev/@<username>` (or an anonymous preview at `setupscore.dev/preview/<scan-id>` if user skips auth).

### Structure, top to bottom

1. **Hero (above the fold).**
   Giant score, 0–100, animated count-up on first load. One word beneath it — the tier label (e.g. "Tinkerer," "Craftsman," "Orchestrator," "Conductor" — kind, never shaming). The user's GitHub avatar + handle in the corner. Nothing else competing for attention.

2. **The portrait.**
   A bespoke, distinctive visual — **not** a generic dashboard — that turns the `.claude/` directory into a shape. Candidate visual languages (to test):
   - A "constellation" — each skill, hook, MCP, command, agent is a star. Denser = stronger foundation. Clusters reveal coherence or bloat.
   - A "house" metaphor — Foundation (CLAUDE.md + settings), Walls (permissions + hooks), Rooms (agents + MCPs), Roof (rituals + plan mode). Missing pieces = visible gaps in the drawing.
   - A "topographic map" — your configuration as terrain; flat = sparse, peaks = power clusters, rivers = workflows.
   Whichever is chosen, it must be **specific to this product**. Generic bar charts disqualify themselves.

3. **The five-chapter story.** One section per category, each one vertical "panel":
   - Chapter 1 — **Foundation** (your `CLAUDE.md`, your settings, your permissions).
   - Chapter 2 — **Automation** (your hooks, your slash commands).
   - Chapter 3 — **Delegation** (your MCPs, your agents).
   - Chapter 4 — **Craft** (your rituals — plan mode, worktrees, verification).
   - Chapter 5 — **Coherence** (does it fit together, or is it bloated?).
   Each chapter: 1 visual, 1 sentence, no more. The sentence uses *your data*: "You have 2 hooks and 1 of them is a formatter — that's the move."

4. **The share strip.**
   A beautiful OG card preview. One tap to copy the image, one tap to share on X / LinkedIn. The card is **the product's viral surface** — its design gets as much attention as the landing page.

5. **The rubric link.**
   A small, trust-building line: *"Scored on 25 open, community-editable dimensions. See the rubric →"*. Links to the public rubric repo. Never hidden, never prominent.

6. **The re-scan invite.**
   *"Changed something? Run `npx setupscore` again."* Not a nag. Just a door left open.

### What is NOT on the page

- No navigation.
- No menu.
- No recommendations. (Founder's explicit exclusion.)
- No dashboard.
- No leaderboard.
- No sign-up wall to see the score.
- No email capture.
- No pricing / "upgrade" button.
- No "related tools" sidebar.
- No streaks, badges, XP, levels — anything that smells like a game-loop UI.

---

## 5. The scanning experience

1. User pastes `npx setupscore` in their terminal.
2. CLI announces what it reads (plain English) and what it *will not* read (plain English). Shows redaction preview of any detected secrets before doing anything else.
3. CLI prompts: "Upload scored summary? (nothing sensitive leaves — see output above.) y/N"
4. On y: opens a browser to `setupscore.dev/scan/<id>`, user watches a short, tasteful loading animation (≤4 seconds), lands on their page.
5. On N: CLI prints a JSON diagnostic locally. User may manually share.
6. GitHub OAuth happens *after* the score is visible — it converts a scan into a persistent public profile, but is not a prerequisite for seeing the score.

No email. No password. No verification flow. No tour/onboarding modal.

---

## 6. The rubric (25 dimensions, 5 chapters)

Structure preserved from the previous revision — still 25 dimensions, five categories (Foundation, Automation, Delegation, Craft, Coherence) with specific checks. Full details in the public `rubric.yaml` repo. Weights are published, versioned, and PR-able.

**Principles the rubric must obey:**
- Transparent. Published. Versioned. Community-editable.
- Persona-conditional — solo vs team-lead vs indie-hacker reweight the dimensions.
- **Anti-bloat** — more is not better. Duplicated skills, unused commands, and noisy settings *cost* score.
- Kind thresholds. No "failing grade." Five tiers, each named gently.
- Every dimension has a linked rationale + external source.

See `rubric.yaml` in the separate repo for full specification.

---

## 7. Non-goals (firm, load-bearing)

1. **No revenue mechanics.** No tiers, no paid plan, no premium features. If we need to pay for hosting, it comes from donations or sponsorship — not from the product.
2. **No recommendation engine.** The score itself is the call to action. No "here's what to do next" cards. No weekly quests. No email digests. No AI-generated advice. (Founder-explicit.)
3. **No B2B, no teams, no enterprise.** Ever, within this product identity.
4. **No cloud-scan.** Scanner is local, open-source, auditable. Raw `.claude/` content never leaves the machine.
5. **No absolute leaderboard.** Percentile is okay in small doses (for self-locating); a public scoreboard is not.
6. **No streaks, no gamification clichés.** No Duolingo-style streaks. No XP. No levels. The score is enough.
7. **No other AI tools.** CC first, earn the right to expand. Cursor/Codex/Gemini are not MVP.
8. **No mobile app, no desktop app, no IDE extension.** Web + CLI. That's it.
9. **No comment threads, no reactions, no "likes" on public profiles.** That path leads to Klout.
10. **No email list.** Public profile URLs are the only persistent identifier.

---

## 8. Success metrics — adoption only

Since revenue is explicitly descoped, metrics are adoption + experience signals.

### North Star
**Weekly Active Rescans (WAR)** — how many unique users rescan each week. This captures the habit loop, which is the evidence that the score is story-producing.

### Leading indicators (weekly)
- Unique CLI scans
- Scan → public-profile conversion rate (GitHub OAuth)
- Public-profile → OG-card-share rate (target ≥25%)
- Rubric repo stars / forks / PRs (community-health proxy)
- Inbound references — tweets, LinkedIn posts, blog mentions (count manually for first 90 days)

### Experience signals
- Time from CLI command to score render (target <8 sec from `npx setupscore` to browser paint)
- 90th-percentile page weight on the score page (target <400KB)
- Qualitative: founder + 3 other reviewers give the page a "would share" rating ≥4/5

### Counter-metrics (protect against regressions)
- **Score inflation rate.** Median population score drift per week. If it climbs > organic skill-growth, gaming is happening — rebalance rubric.
- **Redaction fire rate.** If > 2% of scans detect a secret, we've uncovered a community-wide hygiene issue *and* are one bug away from an incident; increase warning prominence.
- **"One-look" dropoff.** % of users who view once and never rescan. If very high, the score doesn't produce curiosity — the visual isn't doing its job.

---

## 9. Design principles — the top-0.1% experience bar

The founder asked for this level. These are the non-negotiables:

1. **Single page. Single story. Single scroll.** No sidebar, no tabs, no expansions.
2. **Visual originality.** The portrait visual must be specific to this product — not a reskinned dashboard, not a generic radar chart. If we can't make it distinctive, we ship *no* visual rather than a generic one.
3. **Kind honesty.** Headspace-caliber copy. No shame, no scolding, no scarcity framing.
4. **Motion discipline.** Animation exists only where it produces meaning — the count-up on reveal, the delta on rescan, the share-button interaction. Nothing decorative, nothing bouncing, nothing parallax for its own sake.
5. **Typographic confidence.** One serif display face + one mono. No icon bloat. Strong vertical rhythm.
6. **Less is flex.** The artifact people share should feel like a piece of editorial design, not a notification.
7. **Speed as luxury.** The page must feel instant. Every interaction responds <100ms. Scan → result in <8s.
8. **Dark and light both immaculate.** Developers toggle; we must too.
9. **Mobile is a preview surface, not a usage surface.** The CLI lives on laptops. But LinkedIn OG previews render on phones. The artifact must look like premium editorial on a 375px screen.
10. **Trust as aesthetic.** Open-source badges, "local scan" guarantees, rubric-in-repo — these are design elements, not disclaimers.

---

## 10. Open questions (to resolve after first 100 scans)

- Which portrait visual wins — constellation, house, or topography? Test all three; kill two.
- Does the anonymous `/preview/<id>` route help or hurt share rate vs GitHub-gated profiles?
- Do the five chapter labels (Foundation/Automation/Delegation/Craft/Coherence) land, or should they be renamed?
- Tier names — "Tinkerer / Craftsman / Orchestrator / Conductor / Maestro"? Or something less classical? Test with real users; the only right answer is the one they repeat.
- Does the rubric-as-repo produce actual contributor PRs, or is it theater? If theater, still fine — but know why it's there.

---

See [plan.md](plan.md) for execution sequence, stack, and the first 14 days.
