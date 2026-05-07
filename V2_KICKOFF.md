# bench · v2 kickoff

> **Read this entire file before touching anything.** This is the single source of truth for a new Claude Code session starting v2.

---

## 0. What is this project

**bench** — "a portrait of your Claude Code practice."

A single-page, zero-revenue, adoption-first visual product that inspects a developer's `.claude/` setup (skills, hooks, MCPs, CLAUDE.md, settings, subagents, slash commands) and produces a shareable card: hours Claude gave back, signature verbs, missing moves.

Founder's positioning: "Klout for Claude Code." Goal is **reach and cultural footprint, not ARR.** PLG-only. One page. Score-only (no AI recommendations — community-sourced must-haves panel).

---

## 1. Where v1 lives (DO NOT TOUCH)

- **Repo:** https://github.com/Imasaikiran/bench (private)
- **Branch locked:** `v1-bench`
- **Immutable tag:** `v1.0.0`
- **PR for record:** https://github.com/Imasaikiran/bench/pull/1 (v1-bench → main, open)
- **Local dir:** `/Users/saikiran/Desktop/Claud Workspace/bench/`

v1 is the **finalized frontend**. UX, copy, visual hierarchy, persona model, constellation, hero number, highlighted meaning line — all approved. v2 does not redesign any of this.

If you need to see v1 exactly as locked:
```bash
git checkout v1.0.0   # detached HEAD, read-only view
# or
git checkout v1-bench # editable copy of v1 branch
```

When done viewing, return to v2:
```bash
git checkout v2-dev
```

---

## 2. What v2 is

**v2 = make the v1 design real.**

v1 ships with synthetic persona data (Sam · Priya · Maya · Alex hardcoded in `script.js`). v2 replaces the synthetic layer with an actual scanner that reads a real `.claude/` directory and produces the same card.

### v2 deliverables (what the new session builds)

1. **Local scanner** — reads a user's `.claude/` directory, emits a JSON profile matching the persona shape in `script.js`. CLI entry point: `npx bench` (already promised in v1 copy).
2. **Scoring rubric** — the "25 dimensions" v1 mentions. Store as `rubric.yaml` or `rubric.json`. Must be community-editable (per v1 footer: "open rubric · community-editable").
3. **Scan → render bridge** — drop the JSON into the v1 frontend and have the card render from real data instead of the hardcoded personas.
4. **Hours-saved estimation** — the hero flex number. Needs a defensible method (commit counts? session logs? self-reported?). Must be intellectually honest, not fabricated.
5. **Meaning-line generator** — Wispr-Flow-style equivalences (e.g. "187h = a full sprint back"). v1 has 4 hardcoded; v2 needs these generated dynamically from the hour count.
6. **"What to add" panel data** — the community-sourced must-haves (Boris's setup, awesome-claude-code, alexop.dev guides). Needs to be a real curated list, not synthetic.
7. **Share-card export** — the "Download bench" button needs to produce a shareable PNG/SVG. v1 button is wired but has no backing export.

### v2 constraints (hard rules from founder memory)

- **Zero revenue.** No pricing, no tiers, no paid upgrades, no accounts beyond what a public profile URL requires.
- **Nothing leaves the machine** (per v1 footer). Local scan only. If you add a backend, it is opt-in and for the shareable URL feature only.
- **Score-only.** No AI recommendation engine. No weekly quests. No email digests.
- **One page.** Not a dashboard. One scroll, one story. v1 layout is the layout.
- **Beloved > monetized.** Every v2 decision optimizes for "would a dev share this on X?"

### v2 non-goals (do not build)

- Mobile app, native iOS/Android
- User accounts / auth (unless strictly required by URL sharing)
- Leaderboards, percentile shaming (founder explicitly rejected)
- LLM-generated per-user recommendations (community wisdom only)
- Any analytics that phones home without opt-in

---

## 3. Files in this repo (read order for the new session)

Read these in order. Each one is small enough to read in full.

| # | File | What it gives you |
|---|------|-------------------|
| 1 | `V2_KICKOFF.md` | This file. |
| 2 | `README.md` | 10-line summary + how to run v1 locally. |
| 3 | `research.md` | 27KB — market, competitors, SWOT, JTBD, distribution, India+US signal. Read cover-to-cover. |
| 4 | `PRD.md` | 12KB — problem, users, scope, non-goals, metrics. Source of truth for what to build. |
| 5 | `plan.md` | 13KB — user journey (with mermaid), platform pick, stack pick (conservative/modern/cutting-edge), phased build, kill criteria. v2 starts executing this plan. |
| 6 | `index.html` / `styles.css` / `script.js` | The locked v1 frontend. Shape of the data in `script.js` at the `personas` object is the contract your scanner must satisfy. |
| 7 | `.claude/launch.json` | Local dev server config (`python3 -m http.server 5173`). |

**Persona shape contract** — your scanner must emit an object matching each key on a `personas[key]` entry in `script.js`. Do not rename fields. Do not add fields until v2.1.

---

## 4. How the new session starts (bootstrap)

**Step 1 — open a fresh Claude Code session** in the v2 working dir:

```bash
cd "/Users/saikiran/Desktop/Claud Workspace/bench"
git checkout v2-dev
git pull origin v2-dev   # pulls this kickoff file
claude   # or your alias for Claude Code
```

**Step 2 — paste this as the very first message** (the kickoff prompt):

```
You are starting v2 of the "bench" project. Do not touch v1.

Read these files in this exact order before writing any code:
  1. V2_KICKOFF.md  (full context, scope, constraints)
  2. README.md
  3. research.md
  4. PRD.md
  5. plan.md
  6. index.html, styles.css, script.js  (the locked v1 frontend — study
     the `personas` object in script.js; its shape is your scanner's
     output contract)

v1 is locked at tag v1.0.0 on branch v1-bench. You are on branch v2-dev.
Any v2 change goes on v2-dev or a sub-branch of v2-dev. Never commit to
main, v1-bench, or the v1.0.0 tag.

Your job: build the real scanner + rubric that replaces the synthetic
persona data in script.js, following the v2 deliverables in section 2
of V2_KICKOFF.md. Constraints in section 2 are non-negotiable.

After reading, propose a v2 build plan (phases, stack choices, kill
criteria) and wait for approval before coding. The founder wants
alignment before implementation.

Founder context: zero-revenue, adoption-first, PLG, one-page, local-only,
score-only. Nothing in v2 changes that.
```

**Step 3 — the new session will do its own brainstorm / PRD refinement for v2** and ask you the clarifying questions it needs (scan method, rubric format, share-card tech, etc).

---

## 5. Guardrails (repeat for the new session)

- ✅ All v2 work goes on `v2-dev` or branches off `v2-dev`
- ✅ `main` stays at the seed commit until v2 is merge-ready
- ✅ `v1-bench` and `v1.0.0` are frozen — never rebase, never force-push, never delete
- ✅ PR #1 (v1-bench → main) stays open as the v1 record — do not close it
- ❌ Do not re-open design decisions on the v1 frontend (hero number, meaning line, persona model, constellation, dark palette, typography trio) unless real user research from v2 builds demands it
- ❌ Do not add a backend/database for v2.0. First prove the local scan + real data loop is compelling. Backend only for share-URL feature, opt-in, after local loop ships.

---

## 6. Founder memory (persists across sessions)

The founder has a persistent memory note:

> SetupScore (bench) is a **zero-revenue, adoption-first product**.
> First working prototype without any backend, synthetic data only.
> Won't continue until great UX end-to-end.
> The recommendations panel is static community wisdom — derived from top
> Claude Code GitHub repos (awesome-claude-code, awesome-agent-skills,
> Boris's public setup, alexop.dev guides) — not LLM-generated per user.

v1 satisfied the "great UX end-to-end" gate. v2 is authorized to move beyond synthetic — but the other constraints still hold.

---

## 7. Session kickoff — one-liner summary

> New session: `cd bench && git checkout v2-dev && claude`, then paste
> the block in section 4. First response must be a v2 plan for approval,
> not code.

Good luck. Make it beloved.
