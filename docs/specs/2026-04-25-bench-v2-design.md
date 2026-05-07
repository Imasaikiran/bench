# bench v2 — Design Spec

**Date:** 2026-04-25 (initial), 2026-04-25 (architect-review amendments)
**Status:** Amended per founder architect review — approved for implementation-plan drafting
**Branch:** `v2-dev`
**Author:** Drafted in Claude Code session, 2026-04-25
**Related:** `V2_KICKOFF.md` (v2-dev), `PRD.md` / `research.md` / `plan.md` (v1-bench), `script.js` persona contract (v1-bench)

**Amendment log (2026-04-25 architect review response):**
- Added §0.5 Problem, user, bet (primary user = the anxious improver; testable bet = 15% W1 share rate)
- Dropped `K` multiplier from hours formula; reframed hero as `hours_with_cc` (§5.3)
- Renamed tier `Orchestrator` → `Operator` to break synonym collision with `Conductor` (§5.4)
- Added §3.4 Competitive / reference frame
- Added §5.8 Cold-start data strategy
- Added §6.1 Rubric governance constitution
- Added §8.4.1 OG image persistence disclosure
- Added §10.3 items 10 & 11 (client HMAC + anomaly detection, server-side re-scoring from counts)
- Added §11 mobile viewport + accessibility NFRs
- Added §11.1 Post-launch product metrics
- Added §11.2 Growth model napkin math
- Tightened Phase 0 kill criterion with 3 specific tripwires (§13)
- Closed previously-open §15 items — now a decisions table

---

## 0. Purpose of this document

Single source of truth for building bench v2 before any implementation starts. Every architectural decision, formula, data contract, and failure mode is fixed here. If a reviewer can't start coding from this doc, it's incomplete and should be extended before work begins.

The doc explicitly does NOT re-open v1 design decisions (hero number, meaning line, persona model, constellation visual, five-chapter structure, must-haves panel, dark palette, typography). Those are frozen at `v1.0.0`.

---

## 0.5 Problem, user, and bet

### 0.5.1 The problem

Claude Code adoption outpaced shared practice. A developer spends hours installing skills, writing hooks, tuning `CLAUDE.md`, comparing setups in DMs — and has no honest read on whether any of it actually makes them better. Blog posts (Huntley, Lancini, the Anthropic cookbook) show what "good" looks like, but give no feedback on a specific setup. Tools exist for GitHub activity (Wakatime, github-readme-stats) and for IDE telemetry (Cursor analytics), but **nothing reads the `~/.claude/` surface a developer actually tunes**. The felt gap: "I've been using Claude Code for 3 months. Am I using it well, or just using it a lot?"

### 0.5.2 The three users

Primary (the one we design for):

- **The anxious improver.** 8–20 weeks on CC. Has some skills, some hooks, a long CLAUDE.md. Reads setup posts with envy. Wants a mirror that shows what's working and what to prune. Will share a card if it makes them look thoughtful, not if it makes them look beginner or elite. This is the fat middle of the distribution and the only segment where share-rate > install-rate is realistic.

Secondary (they'll scan, they won't share as often):

- **The confident pro.** 6+ months on CC. Already posts their setup publicly. Will scan once for validation, share only if the score is flattering. Useful as seed content (seeds `/stats`, demos, screenshots) but not the audience that drives growth.
- **The curious newcomer.** < 4 weeks on CC. Will scan, tier as Explorer, have no hero number (hidden under floor). Useful as conversion funnel — "come back in a week" — not as day-one share driver.

### 0.5.3 Status quo (what they do today)

- Read Huntley / Lancini / Anthropic cookbook blog posts, mentally compare to their own setup, update a few things, forget.
- DM a friend: "can I see your `CLAUDE.md`?"
- Nothing. Suspect their setup could be better. No concrete next step.

None of these produce a shareable artifact. None of them give numeric feedback tied to a published rubric. That's the empty seat bench fills.

### 0.5.4 The bet (single sentence, testable)

> If a developer sees a one-page honest portrait of their Claude Code setup that names what's working, names what's missing, and gives a fat hero number they earned, **at least 15% of installs will share the resulting URL to X or LinkedIn within 7 days, and at least 20% will run `npx bench` a second time within 4 weeks.**

### 0.5.5 Bet-level kill criterion

Distinct from the per-phase kill criteria in §13.

- **If launch-week share rate < 8%**, the visual isn't curiosity-producing enough — bench is a tool, not a portrait. Rework the card before any new feature.
- **If launch-week share rate ≥ 15% but W2 rescan rate < 10%**, the card is shareable but the rubric doesn't feel like something worth chasing. The rubric, not the visual, is the problem.
- **If both thresholds fail after Phase 2 polish**, the founder accepts that the problem as stated was too narrow and either expands the surface (other AI CLIs, git-activity analysis) or sunsets the project. No third attempt.

---

## 1. Product in one paragraph

A developer runs `npx bench` in their terminal. A local TypeScript scanner reads their `~/.claude/` directory, relevant `.claude/` directories in project roots referenced by session logs, and (if available) `git log` for those repos. All reading stays on the machine. The scanner redacts secrets with a published pattern list, computes a scored JSON summary using a versioned open-source rubric, shows the user exactly what it will upload, and waits for explicit `y` consent. On consent, the summary (small, derived numbers only — no raw content) is POSTed to `bench.dev/api/scan`. The user's browser opens to `bench.dev/scan/<id>` where the locked v1 single-page visual renders their portrait. If they like it, they can optionally log in with GitHub to claim `bench.dev/u/<handle>` as a permanent shareable URL. That URL renders an Open Graph card that previews on X and LinkedIn automatically. Zero-revenue, zero-install (via `npx`), no accounts beyond optional GitHub login, no email list, no AI in the scoring path.

---

## 2. Constraints carried forward from v1

**Non-negotiable (founder memory + V2_KICKOFF §2):**

- **Zero revenue.** No pricing, no tiers, no paid upgrade path.
- **Nothing leaves the machine without explicit consent.** Raw file contents never leave. Only derived, redacted numbers.
- **Score-only.** No AI recommendation engine per user. Community wisdom is static.
- **One page.** v1 layout is the layout. v2 fills it with real data.
- **Beloved > monetized.** Every call decides for virality/share-worthiness, not retention mechanics.
- **No LLM in the scoring path.** Deterministic parsing only. "Hallucinated score" must be a category that cannot exist.
- **v1 frozen.** No edits to `v1-bench`, `v1.0.0`, or the locked frontend (`index.html`, `styles.css`, `script.js`). All v2 work on `v2-dev` or sub-branches.

**Persona shape contract (frozen from v1 `script.js`):** Scanner output must match every field on a `personas[key]` entry. No renames. No added fields before v2.1. See §7.2 for the full contract.

---

## 3. Architecture overview

### 3.1 Architecture diagram

```
┌──────────────────── USER'S MACHINE ─────────────────────┐
│                                                         │
│   Terminal                                              │
│      │                                                  │
│      │  $ npx bench                                     │
│      ▼                                                  │
│   ┌──────────────────────────────────────────────┐      │
│   │            bench CLI (npm package)           │      │
│   │  ─────────────────────────────────────────   │      │
│   │                                              │      │
│   │   ┌──────────┐    reads    ┌─────────────┐   │      │
│   │   │ Scanner  │◀────────────│  ~/.claude/ │   │      │
│   │   │          │◀────────────│  ./.claude/ │   │      │
│   │   │          │◀────────────│  session    │   │      │
│   │   │          │             │  JSONLs     │   │      │
│   │   │          │◀────────────│  git log    │   │      │
│   │   └────┬─────┘             │  (scoped)   │   │      │
│   │        │                   └─────────────┘   │      │
│   │        ▼                                     │      │
│   │   ┌──────────┐                               │      │
│   │   │ Redactor │ removes secrets, truncates    │      │
│   │   └────┬─────┘ strings, hashes paths         │      │
│   │        ▼                                     │      │
│   │   ┌──────────┐    loads    ┌─────────────┐   │      │
│   │   │  Rubric  │◀────────────│ rubric.yaml │   │      │
│   │   │  engine  │             │ (bundled)   │   │      │
│   │   └────┬─────┘             └─────────────┘   │      │
│   │        ▼                                     │      │
│   │   ┌──────────┐  →  local JSON on disk        │      │
│   │   │ Persona  │      (./bench-scan.json)      │      │
│   │   │ inference│  →  terminal preview          │      │
│   │   └────┬─────┘                               │      │
│   │        ▼                                     │      │
│   │   ┌──────────┐                               │      │
│   │   │ Consent  │  "Upload this? (y/N)"         │      │
│   │   │  gate    │  shows exact JSON             │      │
│   │   └────┬─────┘                               │      │
│   │        │ y                                   │      │
│   │        ▼                                     │      │
│   │   ┌──────────┐  HTTPS POST  (only to         │      │
│   │   │ Uploader │──bench.dev──▶ bench.dev)      │      │
│   │   └────┬─────┘                               │      │
│   │        │ receives {id, url}                  │      │
│   │        ▼                                     │      │
│   │   ┌──────────┐                               │      │
│   │   │ Browser  │──open──▶ bench.dev/scan/<id>  │      │
│   │   │ launcher │                               │      │
│   │   └──────────┘                               │      │
│   └──────────────────────────────────────────────┘      │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS only (single egress)
                       ▼
┌──────────────── VERCEL EDGE (bench.dev) ────────────────┐
│                                                         │
│   Next.js 15 App Router                                 │
│                                                         │
│   API routes                                            │
│   ├── POST /api/scan         validate → store → return  │
│   ├── POST /api/claim        GitHub OAuth → link handle │
│   ├── POST /api/delete       remove profile + scans     │
│   ├── POST /api/feedback     "this number is wrong"     │
│   └── GET  /api/auth/github  OAuth callback             │
│                                                         │
│   Pages (all render v1 frontend with real JSON)         │
│   ├── GET  /                 landing (npx install line) │
│   ├── GET  /demo             synthetic Priya scan       │
│   ├── GET  /scan/[id]        anonymous scan (30d TTL)   │
│   ├── GET  /u/[handle]       claimed permanent profile  │
│   ├── GET  /rubric           rendered rubric.yaml       │
│   ├── GET  /how-we-scored    every formula, every weight│
│   └── GET  /og/[id].png      dynamic OG image           │
│                                                         │
│   Cron (Vercel Cron, daily 03:00 UTC)                   │
│   └── DELETE FROM scans WHERE expires_at < NOW()        │
│                                                         │
│                           │                             │
│                           ▼                             │
│                 ┌──────────────────┐                    │
│                 │  Neon Postgres   │                    │
│                 │   (free tier)    │                    │
│                 │                  │                    │
│                 │  scans           │                    │
│                 │  profiles        │                    │
│                 │  feedback        │                    │
│                 └──────────────────┘                    │
│                                                         │
│   Cloudflare (free) in front of Vercel                  │
│   └── WAF: rate limit 10/min per IP on /api/scan        │
│                                                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         │  user copies URL to X/LinkedIn
                         ▼
             ┌─────────────────────────┐
             │ X / LinkedIn crawls     │
             │ <meta og:image>         │
             │ renders preview card    │
             └─────────────────────────┘
```

### 3.2 Components at a glance

| Component | Technology | Lives in | Responsibility |
|-----------|-----------|----------|----------------|
| CLI scanner | TypeScript + Bun (or Node fallback), published as `bench` npm package | user's machine at `npx` runtime | read files, redact, score, preview, consent, upload, open browser |
| Web app | Next.js 15 (App Router) on Vercel Hobby | `bench.dev` | render pages, handle API, OG images, OAuth |
| Database | Neon Postgres (free tier, serverless) | managed | store scored summaries + claimed profiles |
| OG renderer | `@vercel/og` (Satori) | Vercel runtime | render share-card PNG per scan |
| Rubric | `rubric.yaml` | bundled with CLI + mirrored in web repo | formulas, weights, dimension definitions |
| DNS + WAF | Cloudflare (free) | edge | rate limit, cache static, hide origin IP |

### 3.3 What is deliberately absent from the stack

No payments. No Redis/queue. No email provider. No mobile/desktop app. No IDE extension. No analytics beyond Plausible. No CMS. No ML model. No background workers beyond a nightly cron. Every feature we reject is listed in §14 (non-goals) so future pressure to add them has a written counter-argument.

### 3.4 Competitive / reference frame

Where bench sits relative to adjacent tools. This is not a feature-matrix competitive analysis — it's so a future reader knows why bench doesn't steal ideas from these, and what signal we'd borrow from each if we ever did.

| Tool | What it does | Why bench is not that | Useful thing we might borrow |
|------|-------------|-----------------------|------------------------------|
| **Wakatime** | Minutes-per-language IDE telemetry, private dashboard, paid | Per-user dashboard economy, not a shareable portrait. Minutes alone are not a rubric. | The honesty of timestamp-derived "time with X." We compute similar. |
| **github-readme-stats** | SVG card of public GitHub activity on a README | Closest **visual** reference. Embeddable. Zero-account. | Embed pattern: Phase 3 `<img src="bench.dev/u/handle/card.svg">` |
| **CodersRank** | Cross-platform ranking across GitHub/SO/etc. with profile pages | Ranking + resume product. Opposite ethos — we explicitly refuse absolute leaderboards (§14.11). | Percentile copy tone on `/stats` for distribution, not ranking |
| **Cursor analytics** | IDE-internal telemetry (lines accepted, etc.) | Closed ecosystem, vendor-controlled, no rubric. Data stays with Cursor. | Nothing. The opposite philosophy. |
| **Claude Code plugin marketplace** | Discovery of skills/hooks | Catalog of things to install | "Roster coverage" signal: are you using what you installed? (§5.5 dim 12, 23) |
| **Klout (RIP)** | Influence score aggregated from social metrics | The cautionary tale. We deliberately avoid opaque weighting, closed formulas, and daily re-scoring theater. | Every negative lesson. `/how-we-scored` + versioned rubric is the counter-design. |

The shorthand the founder keeps using is "Klout for your Claude Code setup — but the rubric is published and the scanner is open source." That sentence is the elevator pitch; this table is why it works.

---

## 4. End-to-end user journey

### 4.1 Happy path (sequence diagram)

```
User          CLI           FileSystem      Redactor    Rubric    API (Vercel)    Neon      Browser
 │             │                 │              │          │            │           │          │
 │ npx bench   │                 │              │          │            │           │          │
 │────────────▶│                 │              │          │            │           │          │
 │             │ scan(~/.claude) │              │          │            │           │          │
 │             │────────────────▶│              │          │            │           │          │
 │             │  raw structs    │              │          │            │           │          │
 │             │◀────────────────│              │          │            │           │          │
 │             │ redact(structs) │              │          │            │           │          │
 │             │─────────────────────────────▶ │          │            │           │          │
 │             │  redacted       │              │          │            │           │          │
 │             │◀────────────────────────────── │          │            │           │          │
 │             │ score(redacted) │              │          │            │           │          │
 │             │───────────────────────────────────────▶ │            │           │          │
 │             │  scored         │              │          │            │           │          │
 │             │◀────────────────────────────────────────│            │           │          │
 │             │ inferPersona()  │              │          │            │           │          │
 │             │ assemblePayload │              │          │            │           │          │
 │ preview     │                 │              │          │            │           │          │
 │◀────────────│                 │              │          │            │           │          │
 │ y           │                 │              │          │            │           │          │
 │────────────▶│                 │              │          │            │           │          │
 │             │ POST /api/scan  │              │          │            │           │          │
 │             │────────────────────────────────────────────────────▶ │           │          │
 │             │                                                       │ INSERT    │          │
 │             │                                                       │──────────▶│          │
 │             │                                                       │   id      │          │
 │             │                                                       │◀──────────│          │
 │             │  { id, url }                                          │           │          │
 │             │◀──────────────────────────────────────────────────── │           │          │
 │             │ open(browser, url)                                                           │
 │             │──────────────────────────────────────────────────────────────────────────▶ │
 │             │                                                                  GET /scan/id
 │             │                                                       │◀──────────────────── │
 │             │                                                       │ SELECT payload       │
 │             │                                                       │──────────▶│          │
 │             │                                                       │  JSON     │          │
 │             │                                                       │◀──────────│          │
 │             │                                                       │ render v1 page w/ JSON
 │             │                                                       │──────────────────────▶│
 │                                                                                   score reveal
```

### 4.2 Flow narrative (positive flows, P1–P6)

**P1. First scan → anonymous URL.**
User runs `npx bench`. CLI scans, redacts, scores, prints preview. User types `y`. CLI POSTs to `/api/scan`, receives `{id: "a8f3c2", url: "https://bench.dev/scan/a8f3c2"}`, opens browser. User sees card. URL has 30-day expiry.

**P2. Claim a permanent handle.**
From `/scan/<id>`, user clicks "Claim this". Redirects to GitHub OAuth. On callback, `/api/claim` creates a profile row, links the scan to it, and 302s to `/u/<handle>`. All future `npx bench` runs with `--handle <handle>` or logged-in claim will update that same profile instead of creating a new anonymous scan.

**P3. Rescan (Phase 1 — simple).**
User tunes their setup. Runs `npx bench` again. New anonymous `/scan/<id>` is produced. If they own a claimed profile and are logged into `bench.dev` in their browser, the server shows a one-click "Link this scan to @priya_dev" button on the new `/scan/<id>` page. Clicking it updates the profile's `latest_scan` pointer. Page then animates before/after from the previous latest scan. **No CLI-side auth in Phase 1.** (Phase 2+ can add `npx bench --login` that writes a token to `~/.bench/credentials.json` for automatic linking, but not in MVP.)

**P4. Share on X.**
User clicks "Share on X" button on their card. Opens pre-filled tweet: "187h with Claude Code. I install · I prune · I question. Bench 62 · Tinkerer. bench.dev/u/priya_dev". When the tweet posts, X fetches the URL, sees `<meta property="og:image" content="https://bench.dev/og/<id>.png">`, renders the card inline.

**P5. Friend sees the tweet → demo → install → scan.**
Friend clicks tweet link. Lands on `/u/priya_dev`. Sees Priya's card. Clicks "Scan mine" in the nav. Goes to `/` (landing page) with `npx bench` copy-button prominently. Runs it. Loops back through P1.

**P6. Non-installer visitor.**
Visitor sees tweet. They don't have Claude Code. Clicks through. Sees `/demo` (or Priya's page). Reads the explainer. Bookmarks. Returns after installing CC a week later. Loops through P1.

### 4.3 Flow narrative (negative flows, N1–N30)

Listed in §9 (failure-mode catalog). Every negative flow has an explicit terminal state that is either (a) a useful local artifact for the user, (b) a graceful "come back later" exit, or (c) a clearly-labeled error with a GitHub Issues link. No unhandled exception is allowed to leave the CLI in a partial state.

---

## 5. Scanner specification

### 5.1 What the scanner reads

**Always read (config surface):**

| Path | Purpose |
|------|---------|
| `~/.claude/CLAUDE.md` | root house rules; length + shape scored |
| `~/.claude/settings.json` | permissions, hooks config, MCP registry |
| `~/.claude/settings.local.json` | local overrides |
| `~/.claude/skills/**/SKILL.md` | skills roster, frontmatter names + descriptions |
| `~/.claude/hooks/**/*.{js,ts,py,sh}` | hook roster (names and file count only) |
| `~/.claude/commands/**/*.md` | slash commands roster |
| `~/.claude/agents/**/*.md` | subagent roster |
| `~/.claude/mcp.json` or the `mcpServers` key in settings | MCP servers configured |

**Always read (behavioral surface):**

| Path | Purpose |
|------|---------|
| `~/.claude/projects/**/*.jsonl` | session logs — **timestamps and counts only** |
| Project roots referenced in session logs (if they still exist) | git log extraction for signature verbs and commit discipline |
| `./.claude/` in current working directory | project-scoped overrides |

**Explicitly refused:**

- Anything outside `~/.claude/`, `./.claude/`, and project roots referenced by session logs.
- Symlinks that escape those boundaries. Scanner follows symlinks but refuses any target not under an allowed prefix, and logs the refusal.
- Running as root (`sudo npx bench`). Scanner detects uid 0 (or Administrator on Windows) and exits with "run as your normal user".
- CI environment (`CI=true`, `GITHUB_ACTIONS=true`, etc.). Scanner refuses, because scoring a CI runner is meaningless and scanning random runners is an attack surface.

### 5.2 Parsing rules

**Robustness rules:**
- All JSON parses wrapped in try/catch. On error, log to diagnostics, continue.
- Files over 100KB (for CLAUDE.md and settings) truncated with warning.
- Binary files skipped.
- Malformed YAML frontmatter in SKILL.md → file still counted as a skill, frontmatter fields default to null.
- Session JSONL parsed line-by-line. Any single broken line is skipped, others still processed.

**Counting rules:**
- A "skill" is a subdirectory of `~/.claude/skills/` containing a `SKILL.md`. Nested skills flattened to one count per `SKILL.md`.
- A "hook" is a file in `~/.claude/hooks/` that matches the extensions list AND is referenced in `settings.json` under a hook event. Files present but not referenced are counted as "orphaned" (separate metric, doesn't inflate hook count).
- A "command" is a `.md` file in `~/.claude/commands/` with YAML frontmatter containing `description:`.
- An "agent" is a `.md` file in `~/.claude/agents/` with YAML frontmatter containing `name:` and `description:`.
- An "MCP server" is a key in `mcpServers` in settings or `~/.claude/mcp.json`.

**Session parsing:**
- Each `.jsonl` file = one session.
- `session_id` = filename stem.
- `session_start` = min `timestamp` across messages.
- `session_end` = max `timestamp` across messages.
- `message_count` = line count.
- `tool_use_count` = messages where `role == "assistant"` and `content` contains `tool_use` blocks.
- `plan_mode_detected` = any message with `content` matching `plan mode` or `<PlanModeStart>`-style markers.
- For each pair of consecutive messages, `active_seconds += min(gap_seconds, 900)`. Gaps over 15 min are treated as "walked away".

### 5.3 The hours-with-Claude-Code formula (published, bounded, honest)

**Intellectual-honesty decision.** v1 copy called the hero "hours Claude gave back." v2 drops the multiplier and stops claiming productivity savings — no credible study has measured Claude Code's agentic impact, and applying Copilot's 55–64% figure to an agent that writes-reads-runs is fabrication. The hero is reframed as **time the developer spent actively working with Claude Code** — an observed quantity the developer can verify against their own memory. It is still a fat shareable number. It just doesn't lie.

```
for each session S in ~/.claude/projects/**/*.jsonl:
    active_seconds(S) = Σ min(gap, 900) over consecutive message timestamps
    active_hours(S)   = active_seconds / 3600

hours_with_cc = round(Σ active_hours(S))
```

No multiplier. No citation to borrowed research. `active_seconds` already excludes "walked away" gaps (>15 min capped to 15 min). What remains is time the user spent in conversation with the tool.

**Copy changes (v1 strings that must update in v2 render):**

| v1 string | v2 replacement |
|-----------|----------------|
| `hours Claude gave back` | `hours with Claude Code` |
| `a full sprint back — 23 workdays, or a side-project shipped` | `~23 workdays of pair-programming — whatever you made, you made it together` |
| `you saved N hours` (anywhere in tiles/meaning copy) | `you worked N hours with it` |

The v1 frontend template strings live in `script.js`. v2 persona-shape mapper supplies the new text; **no edit to `script.js` on v1-bench**. The mapper replaces the string at render time.

**Cap.** `hours_with_cc` hard-capped at `52 weeks × 60h = 3120h`. Outliers logged and clamped.

**Floor.** If `hours_with_cc < 5`, the hero number is hidden. Card shows chapters + tier; center replaced with "not enough session history yet — come back in a week."

**Audit path.**
- Every rendered page links `hours_with_cc` to `/how-we-scored#hours`, which shows the exact gap-capping formula and the session count it was computed from.
- `bench --why` prints every session's (start, end, gap-capped active seconds) so a skeptic can reconcile with their own calendar.
- No `K` anywhere in payload, rubric, or copy. The honest number is the only number.

### 5.4 Persona auto-bucketing (inferred from data, never asked)

Founder requirement: **no persona selector. Bucket from signals.**

**Signals computed during scan:**

| Signal | How it's measured |
|--------|-------------------|
| `weeks_on_cc` | `(now - earliest_session_start) / 7 days`, floored |
| `skills_active` | skills whose name appears in session tool_use events |
| `skills_total` | count of SKILL.md files |
| `skills_unused_ratio` | 1 - (skills_active / max(skills_total, 1)) |
| `hooks_configured` | hooks referenced in settings AND file exists |
| `agents_configured` | subagent files with valid frontmatter |
| `plan_mode_ratio` | sessions with plan_mode_detected / total sessions |
| `sessions_total` | count of JSONL files |
| `automation_events` | hook invocations counted from session logs (if present in log format) |
| `commit_burst_correlation` | commits on repos where CC session was active in same hour / total commits, via `git log` |
| `claude_md_lines` | lines in root CLAUDE.md |
| `sub_dir_claude_md_count` | `.claude/CLAUDE.md` files in project roots |
| `coherence_score` | 1 - (duplicate-skill fraction + orphaned-hook fraction + >300-line CLAUDE.md penalty) |

**Tiers (winner = highest matching tier):**

```
Explorer       : weeks_on_cc < 4  OR  sessions_total < 20
Tinkerer       : weeks_on_cc ≥ 4  AND sessions_total ≥ 20
                 AND skills_total ≥ 2  AND skills_unused_ratio > 0.1
Craftsman      : weeks_on_cc ≥ 12 AND skills_total ≥ 3
                 AND skills_unused_ratio ≤ 0.15
                 AND plan_mode_ratio ≥ 0.25
                 AND coherence_score ≥ 0.6
Operator   : weeks_on_cc ≥ 16 AND agents_configured ≥ 2
                 AND hooks_configured ≥ 3
                 AND automation_events ≥ 300
                 AND coherence_score ≥ 0.75
Conductor      : all Operator conditions
                 AND cross_project_consistency_score ≥ 0.7
                 AND skills_total ≥ 5  AND skills_unused_ratio ≤ 0.1
                 AND sub_dir_claude_md_count ≥ 2
                 AND commit_burst_correlation ≥ 0.4
```

Evaluated from highest tier down (Conductor → Operator → Craftsman → Tinkerer → Explorer). First tier whose conditions all match is the answer. Explorer is the catch-all default. Each tier has a v1-approved copy line and an optional meaning line ("past the honeymoon," "full season in," etc.).

### 5.5 The 25 dimensions (5 chapters × 5 slots each)

Matches v1 constellation (`CLUSTER_LABELS` in `script.js`).

**Chapter I — Foundation (slot labels in v1: CLAUDE.md, settings, permissions, sub-dir md, docs):**

| # | Dimension | `have` if | `partial` if | Weight |
|---|-----------|-----------|--------------|--------|
| 1 | Root CLAUDE.md | exists, 20–300 lines | exists but <20 or >300 lines | 1.0 |
| 2 | settings.json | valid JSON, non-empty | valid JSON but empty object | 1.0 |
| 3 | permissions allowlist | `permissions.allow` has ≥3 entries | `permissions.allow` has 1–2 entries | 1.0 |
| 4 | sub-dir CLAUDE.md | ≥1 project has `.claude/CLAUDE.md` | — | 0.8 |
| 5 | Docs in .claude | `~/.claude/docs/` exists with content | — | 0.4 |

**Chapter II — Automation (labels: PostToolUse, PreToolUse, SessionStart, slash cmds, scripts):**

| # | Dimension | `have` if | `partial` if | Weight |
|---|-----------|-----------|--------------|--------|
| 6 | PostToolUse hook | referenced + file exists | referenced but file missing | 1.0 |
| 7 | PreToolUse hook | referenced + file exists | referenced but file missing | 1.0 |
| 8 | SessionStart or SessionEnd hook | referenced + file exists | referenced but file missing | 0.8 |
| 9 | Custom slash commands (≥3) | 3 or more in `~/.claude/commands/` | 1–2 | 0.8 |
| 10 | Automation events fired | `automation_events` > 100 in last 30 days | 10–100 | 0.6 |

**Chapter III — Delegation (labels: skills, pruned skills, github MCP, review agent, test agent):**

| # | Dimension | `have` if | `partial` if | Weight |
|---|-----------|-----------|--------------|--------|
| 11 | Skills (≥3) | 3 or more SKILL.md files | 1–2 | 1.0 |
| 12 | Pruned skills | skills_unused_ratio ≤ 0.15 | ≤ 0.3 | 1.0 |
| 13 | GitHub MCP | `github` or `mcp-github` server in MCP config | any MCP server configured | 0.8 |
| 14 | Code-review subagent | agent with `review` in name/description | any subagent | 0.8 |
| 15 | Test-runner subagent | agent with `test` in name/description | any subagent | 0.6 |

**Chapter IV — Craft (labels: plan mode, reads craft, worktrees, commits, verify):**

| # | Dimension | `have` if | `partial` if | Weight |
|---|-----------|-----------|--------------|--------|
| 16 | Plan mode used | plan_mode_ratio ≥ 0.25 | ≥ 0.05 | 1.0 |
| 17 | Reads craft | avg bytes read per Read-tool call ≤ 20KB | ≤ 60KB | 0.6 |
| 18 | Worktrees | any path under `.trees/` or git worktree list non-empty | — | 0.6 |
| 19 | Commit discipline | ≥80% of commits on CC-active repos have conventional prefix | ≥50% | 0.8 |
| 20 | Verification before commit | hook exists that runs tests/typecheck pre-commit | hook exists but different type | 1.0 |

**Chapter V — Coherence (labels: focus, clean dir, no-bloat, names, single-topic):**

| # | Dimension | `have` if | `partial` if | Weight |
|---|-----------|-----------|--------------|--------|
| 21 | Focus | sessions grouped into ≤5 project roots | ≤10 | 0.6 |
| 22 | Clean .claude/ | no orphaned hooks, no duplicate skill names | <20% orphans | 0.8 |
| 23 | No-bloat | skills_unused_ratio ≤ 0.1 | ≤ 0.25 | 1.0 |
| 24 | Names | all skills/commands/agents have `description:` in frontmatter | ≥80% have it | 0.6 |
| 25 | Single-topic CLAUDE.md | root CLAUDE.md has ≤5 distinct headings | ≤10 | 0.6 |

**Chapter score:**

```
chapter_score = (Σ weight × state_value) / (Σ weight) × 100
state_value: have=1, partial=0.5, missing=0
```

**Overall score:** equal-weighted mean of the 5 chapter scores, rounded to int 0–100. Published. Version-stamped (`rubric.version`).

### 5.6 The must-haves panel (15 community-curated items)

Matches v1 `MUSTHAVES` array in `script.js`. Items are static, curated. Their `state` per user is derived:

| # | Title | state derivation |
|---|-------|------------------|
| 1 | Root CLAUDE.md | dim 1 state |
| 2 | settings.json permissions allowlist | dim 3 state |
| 3 | Sub-dir CLAUDE.md per repo | dim 4 state |
| 4 | PostToolUse formatter hook | dim 6 state AND hook name/body contains formatter |
| 5 | PreToolUse guardrail hook | dim 7 state AND body contains block/ban pattern |
| 6 | 3+ custom slash commands | dim 9 state |
| 7 | SessionStart context loader | dim 8 state AND body references context |
| 8 | GitHub MCP configured | dim 13 state |
| 9 | Five purposeful skills | skills_total ≥ 5 AND unused ≤ 0.15 |
| 10 | Code-review subagent | dim 14 state |
| 11 | Test-runner subagent | dim 15 state |
| 12 | Plan mode before non-trivial work | dim 16 state |
| 13 | Worktrees for parallel branches | dim 18 state |
| 14 | Verification ritual | dim 20 state |
| 15 | Pruned duplicates | dim 23 state |

Must-haves sort in the UI: missing first (sorted alphabetically within missing), then partial, then have. Click missing → expand inline snippet (snippets already in v1 `MUSTHAVES`, not scanner output).

### 5.7 CLI flags

| Flag | Purpose |
|------|---------|
| `--why` | print full per-dimension scoring reasoning |
| `--offline` | skip upload, save local HTML/JSON only |
| `--handle <name>` | skip interactive prompt, write summary under this handle |
| `--debug` | verbose parse logs (timestamps, skipped files, diagnostics) |
| `--version` | print scanner version + bundled rubric version |
| `--dry-run` | scan but refuse to open consent gate; for CI sanity checks |
| `--rubric <path>` | load a custom rubric.yaml for experimentation (never uploads) |

### 5.8 Cold-start data strategy

Day 1, the DB has 1 row (the founder's scan). `/stats` ("median score," "distribution by tier") needs volume to be trustworthy and not embarrassing. The plan for getting from 1 scan to a meaningful distribution without inflating numbers or lying:

**Stage 1: Seed (Days 1–7 post-launch, 0–50 scans).**
- `/stats` is not yet linked from the global nav. Visible only at the direct URL with a top-of-page notice: *"We have N scans so far. These numbers are a live snapshot and will move. Come back at 500."*
- No percentile claims. Raw histogram + median only. No "you're top 17%" copy anywhere. Anonymous scans and flagged `is_suspect` rows both excluded from `/stats` calculations.
- `/demo` renders synthetic Priya (clearly labeled as such in her eyebrow line) so first-time visitors who haven't scanned see a realistic card — not a founder-flattering real one.

**Stage 2: Warm-up (Week 2–4, 50–500 scans).**
- `/stats` added to nav.
- Founder posts weekly "bench: here's what 500 scans taught us" thread. Transparent, not hype.
- Beta-list members (§15 row 7) asked to scan week 1 with `--offline` first so they can sanity-check their number before uploading, reducing the "wait, the hours are wrong" kind of feedback flooding `/api/feedback`.
- If any single tier has < 5 scans at the end of Week 3, that tier's copy on `/stats` shows "too few scans to describe this tier yet" instead of a median.

**Stage 3: Real (500+ scans).**
- Distributions published without caveats.
- Percentile copy may be introduced on `/stats` only, never on `/u/<handle>` cards.
- Weekly automated aggregate regenerated from non-suspect scans.

**Data we will never synthesize.** No fake scans to pad the histogram. No borrowed Wakatime-style numbers. If distributions are ugly (everyone's an Explorer in week 1), we show it and ship the rubric refinement to widen the middle.

**Founder's own scan as anchor.** The founder scans and claims `@imasaikiran` on Day 1. This is the only hand-curated profile on launch. It functions as a reference card for "what a well-tuned setup looks like" alongside synthetic Priya — but is explicitly labeled with its own scan date on the profile, and re-scanned publicly every 2 weeks in public. No one can say the demo is stale or cherry-picked.

---

## 6. Rubric specification

- File: `rubric.yaml` (YAML for reviewability, parsed into a stable internal shape).
- Version: `semver`, embedded in CLI bundle and server.
- Lives: in `bench/rubric/rubric.yaml` (in main repo) and bundled into the npm package at build time.
- Community PRs: allowed to the repo. Every merged PR bumps the minor version.
- Each dimension has: `id`, `name`, `chapter`, `weight`, `have_criteria` (human-readable), `partial_criteria`, `rationale`, `sources[]` (urls or citations).
- Server and CLI MUST use the same rubric version. The upload payload carries `rubric_version`. If server version is higher, server re-scores from payload counts.

**Re-scoring rule.** Upload contains both the raw counts AND the computed scores. Server trusts its own rubric to re-score from counts if versions differ. Historic pages stay stamped with the rubric version they were scored under; a "rescore with latest rubric" button is offered on profile pages.

### 6.1 Rubric governance (constitution)

The rubric is the load-bearing opinion of bench. Its governance must be written down before the first PR lands. "Community wisdom is static" (§2) does not mean the wisdom never changes — it means it changes slowly, in public, and not per-user.

**Months 0–12 post-launch: Founder-as-custodian (benevolent-dictator model).**

- Founder (`@imasaikiran`) is sole merger of rubric PRs.
- Every PR must include: evidence (linked post/example/data), proposed criteria change, expected tier-distribution impact. Founder may ask for a rough before/after histogram from the PR author on the existing scan corpus.
- No merge in under 48 hours. Minimum one public review round, visible on the PR.
- Merge bumps **minor version** (1.0 → 1.1) for new dimensions or threshold tightening; **patch** (1.0.0 → 1.0.1) for wording fixes and typos; **major** (1.x → 2.0) for chapter restructures. The constraint in §7.1 that "`/api/scan` rejects schemas older than current - 2 minor versions" means rubric changes have a deprecation trail, not a hard break.
- Every merged rubric PR is followed by a founder-authored note on `/how-we-scored/changelog` explaining the change in plain language.

**Month 12+: Three-person council (co-custodian model).**

- Trigger to transition: (a) ≥ 10 merged community PRs from ≥ 6 distinct authors, OR (b) `/stats` publishes > 10k scans, whichever comes first.
- Council: founder + 2 co-custodians nominated from the top-5 rubric PR contributors by merged-PR count.
- Decisions by 2-of-3 majority. Founder retains tiebreak only when council is deadlocked after 14 days.
- Term: 12 months, renewable. One co-custodian rotates annually to prevent capture.

**What governance will NOT do, ever.**
- No per-tenant rubric. One public rubric, one score.
- No "premium" dimensions gated behind payment. Non-goal §14.1.
- No vendor-sponsored dimensions ("top with Anthropic's blessed skills" → no). Non-goal §14.9.
- No silent threshold changes. Every numerical change is a versioned, changelogged commit.
- No LLM-generated rubric additions. Every dimension has a human rationale from the PR author.

---

## 7. Data contracts

### 7.1 Upload payload (`POST /api/scan` body)

```json
{
  "schema_version": "1.0",
  "rubric_version": "1.0.0",
  "scanner_version": "0.1.0",
  "scanned_at": "2026-04-25T12:34:56.000Z",
  "handle": null,
  "previous_scan_id": null,
  "os": "darwin",
  "node_version": "22.3.0",

  "tier": "Tinkerer",
  "score": 62,
  "weeks_on_cc": 14,
  "hours_with_cc": 187,
  "hours_hidden": false,

  "counts": {
    "sessions_total": 412,
    "plan_mode_sessions": 41,
    "skills_total": 6,
    "skills_active": 4,
    "skills_unused_ratio": 0.33,
    "hooks_configured": 0,
    "agents_configured": 0,
    "commands_total": 2,
    "mcp_servers": 1,
    "automation_events": 0,
    "worktrees_detected": 0,
    "claude_md_lines": 147,
    "sub_dir_claude_md_count": 1,
    "coherence_score": 0.72,
    "commit_burst_correlation": 0.38
  },

  "chapters": {
    "Foundation": { "score": 72, "states": ["have","have","partial","missing","missing"] },
    "Automation": { "score": 10, "states": ["missing","missing","missing","missing","missing"] },
    "Delegation": { "score": 60, "states": ["have","partial","have","missing","missing"] },
    "Craft":      { "score": 82, "states": ["have","have","partial","have","missing"] },
    "Coherence":  { "score": 76, "states": ["have","have","partial","have","partial"] }
  },
  "chapter_tags": ["partial","weak","partial","strong","strong"],

  "musthaves": ["have","partial","missing","missing","missing","missing","missing","have","partial","missing","missing","have","partial","missing","missing"],

  "signature_verbs": ["install","prune","question"],
  "tiles": [
    {"label":"weeks","value":"14","equiv":"past the honeymoon"},
    {"label":"skills","value":"6","equiv":"4 daily · 3 overlap"},
    {"label":"prompts","value":"~420","equiv":"saved per month"},
    {"label":"plan mode","value":"41","equiv":"runs · every other task"}
  ],

  "identity":      "You install to learn. You prune to focus. You keep asking if it fits.",
  "hours_meaning": "~23 workdays of pair-programming — whatever you made, you made it together",
  "hours_label":   "hours with Claude Code",
  "chapter_note":  "Automation is dark — that's the fastest lever you have.",

  "diagnostics": {
    "redaction_hits": 0,
    "parse_warnings": [],
    "skipped_files": 0,
    "elapsed_ms": 2340
  },

  "integrity": {
    "client_hmac": "hmac_sha256(bundled_key, canonical_json(counts))",
    "hmac_key_id": "v1"
  }
}
```

**Size budget:** < 8KB JSON per upload. No raw strings from user files. No filesystem paths. No commit messages verbatim — only extracted verbs. No message contents.

### 7.2 Persona shape contract (v1 frozen)

Every rendered page produces a JavaScript object that the v1 frontend consumes in place of a `PERSONAS[key]` entry. The web server produces this object server-side from the stored payload:

```ts
type PersonaShape = {
  handle: string          // "@priya_dev"
  initial: string         // "P"
  weeks: number           // 14
  eyebrow: string         // "scanned just now · 14 weeks on claude code"
  title: string           // "You've been building."
  tiles: Array<{ label: string; value: string; equiv: string }>   // exactly 4
  identity: string
  hours: number
  hoursMeaning: string
  signature: string       // "you install · you prune · you question"
  score: number           // 0..100
  tier: string            // "Tinkerer"
  chapterNote: string
  chapterTags: Array<'strong' | 'partial' | 'weak'>   // exactly 5
  clusters: Record<'Foundation'|'Automation'|'Delegation'|'Craft'|'Coherence',
                   Array<'have'|'partial'|'missing'>>   // each array length 5
  musthaves: Array<'have'|'partial'|'missing'>           // exactly 15
}
```

**No field renames. No new fields until v2.1.** Scanner output → server mapper → persona shape → v1 frontend render.

**Hours-rename note.** The upload payload uses `hours_with_cc` and `hours_label` (§7.1). The persona shape keeps the frozen v1 field name `hours` (number) to stay binary-compatible with `script.js`. The mapper copies `payload.hours_with_cc` → `persona.hours` and supplies `persona.hoursMeaning` from `payload.hours_meaning`. The label text `"hours with Claude Code"` is rendered by the v2 template layer in Next.js, not by v1 `script.js` — so v1 is never edited.

### 7.3 Database schema (Neon Postgres)

```sql
-- scans: one row per scan, anonymous unless linked to a profile
CREATE TABLE scans (
  id            TEXT PRIMARY KEY,       -- nanoid, 10 chars
  payload       JSONB NOT NULL,         -- full upload JSON
  payload_hash  TEXT NOT NULL,          -- sha256 of payload, for duplicate detection
  ip_hash       TEXT,                   -- sha256(ip + daily_salt), rate-limit only, not identifying
  user_agent    TEXT,                   -- CLI version from UA header
  rubric_version TEXT NOT NULL,
  is_suspect    BOOLEAN NOT NULL DEFAULT FALSE,  -- anomaly-detection flag, excluded from /stats
  suspect_reason TEXT,                           -- which rule flagged, for audit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ             -- NULL if claimed, NOW+30d otherwise
);
CREATE INDEX idx_scans_expires ON scans(expires_at) WHERE expires_at IS NOT NULL;

-- profiles: claimed handles
CREATE TABLE profiles (
  handle        TEXT PRIMARY KEY,       -- lowercase github login
  github_id     BIGINT NOT NULL UNIQUE,
  latest_scan   TEXT REFERENCES scans(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_latest ON profiles(latest_scan);

-- feedback: "this number is wrong" submissions
CREATE TABLE feedback (
  id          BIGSERIAL PRIMARY KEY,
  scan_id     TEXT REFERENCES scans(id) ON DELETE CASCADE,
  dimension   TEXT,                      -- "hours", "tier", "dim:14", ...
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rate limit table (also backed by Cloudflare WAF in front)
CREATE TABLE rate_limits (
  ip_hash     TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, window_start)
);
```

Storage projection: 8KB per scan × 100K scans = 800MB. Neon free tier = 512MB. **Projection exceeds free tier only if ≥60K scans claimed (non-expiring).** Anonymous scans auto-delete after 30d, so active storage stays well under free cap. Migrate to Neon Launch ($19/mo) at ~50K permanent profiles.

---

## 8. Privacy & redaction

### 8.1 Redaction pattern list (`redactor.ts`, open-source)

```
OpenAI / Anthropic keys:       /sk-[A-Za-z0-9]{20,}/
GitHub PAT (classic):          /ghp_[A-Za-z0-9]{36}/
GitHub fine-grained:           /github_pat_[A-Za-z0-9_]{80,}/
Slack tokens:                  /xox[baprs]-[A-Za-z0-9-]+/
AWS access key:                /AKIA[0-9A-Z]{16}/
AWS secret:                    /aws_secret_access_key\s*=\s*['"]?[A-Za-z0-9+\/=]{30,}/i
Private keys:                  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/
JWT:                           /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/
Generic secret assignment:     /(password|passwd|secret|token|api[_-]?key)\s*=\s*['"][^'"]{6,}['"]/i
URLs with userinfo:            /https?:\/\/[^:@\s]+:[^@\s]+@/
Email addresses in strings:    /[\w.+-]+@[\w-]+\.[\w.-]+/
Absolute paths (mac/linux):    /\/Users\/[^/\s]+/  →  ~/
                               /\/home\/[^/\s]+/   →  ~/
Absolute paths (windows):      /C:\\Users\\[^\\]+/ →  ~\
```

**Where redaction runs:** on any string field extracted from user files (CLAUDE.md excerpts, settings.json values, skill frontmatter descriptions, commit messages, skill names) **before** that string is folded into the counts or the payload. Counts themselves are just integers, not text.

**Upload safety posture.** Even though the upload payload is structured numbers and tier labels (not free-text strings from user files), the redactor runs over every string field as a defense-in-depth measure. Any redaction hit increments `diagnostics.redaction_hits` in the payload — if >0, the consent prompt highlights "we blocked N potential secrets, want to review before uploading?".

### 8.2 Consent flow (terminal UX)

```
$ npx bench

bench v0.1.0 — scanning your Claude Code setup...
  ✓ read ~/.claude (147 files, 2 skipped)
  ✓ read 412 session logs
  ✓ read git log on 5 project repos
  ✓ applied rubric v1.0.0

Here's your bench:

  ┌─────────────────────────────────────────────┐
  │                                             │
  │         187h                                │
  │  hours with Claude Code                     │
  │  ~23 workdays of pair-programming           │
  │                                             │
  │  Bench 62 · Tinkerer · Wk 14                │
  │                                             │
  └─────────────────────────────────────────────┘

This is what would be uploaded (8.2KB JSON):

  {
    "schema_version": "1.0",
    "tier": "Tinkerer",
    "score": 62,
    "weeks_on_cc": 14,
    "hours_with_cc": 187,
    ...full payload printed...
  }

Nothing else leaves your machine. No file contents.
No paths. No commit messages. Source:
  https://github.com/Imasaikiran/bench/blob/main/cli/redactor.ts

Upload this and see it on bench.dev? [y/N] _
```

- Default is **N**. Typing anything other than `y` or `yes` (case-insensitive) aborts upload.
- If user denies: CLI writes `./bench-scan.json` and `./bench-scan.html` (self-contained single file rendering the v1 page from local JSON). User can still share as screenshot.
- If `diagnostics.redaction_hits > 0`: consent prompt adds a red-highlighted line: `⚠ redacted N potential secrets — type 'show' to review before uploading`. Typing `show` prints the redaction log (which pattern matched, where — with the matched value itself NOT printed, just its kind and location).

### 8.3 Network policy

**Egress allowlist (scanner):**
- `https://bench.dev/api/scan`
- `https://registry.npmjs.org` (during `npm install` only, not during scan)

**No other egress.** No telemetry. No error reporting to third-party. The allowlist is a constant in the code; attempting to POST elsewhere is prevented by a URL check at the uploader boundary. Verifiable by reading ~30 lines of code.

**No DNS lookups for anything other than `bench.dev`** during scan-run. An `--offline` flag skips all network entirely.

**No background processes.** Scanner is one-shot. Exits cleanly. Does not install a daemon, cron job, or LaunchAgent. Does not write outside the CWD (for local HTML export) or `~/.bench/` (for saved handle credentials, opt-in on claim).

### 8.4 Data lifecycle

| State | TTL | Deletion path |
|-------|-----|---------------|
| Anonymous scan `/scan/<id>` | 30 days from `created_at` | nightly cron |
| Claimed profile `/u/<handle>` | until user deletes | `/api/delete` (logged-in user only) |
| OG image PNG (origin) | co-terminus with scan / profile | auto-deleted when scan/profile is | 
| OG image PNG (external CDNs — X, LinkedIn, Slack, Discord) | **out of our control; may persist indefinitely** | see §8.4.1 |
| Feedback rows | 180 days | quarterly cleanup |
| Rate-limit rows | 24 hours | hourly cleanup |

Deletion button on every profile page. Deletion cascades (profile row + all scans + origin-side OG image cache). Database has no analytics tables, no derived aggregates beyond `/stats` which is computed on-the-fly (cached 1h).

#### 8.4.1 OG image persistence (disclosed, not hidden)

When a user shares their URL on X, LinkedIn, Facebook, Slack, or Discord, those platforms fetch and cache the OG image on their own CDNs. We do not control those caches. Deletion on bench.dev does not scrub those caches. This is true of every link-preview service on the internet and is a fact of OG-image sharing, not a bench-specific defect — but we disclose it explicitly:

1. **Consent prompt copy** (when a user clicks "Share on X" for the first time, before opening the prewritten tweet) surfaces a one-line notice: *"Once you share the URL, X may keep a copy of the card image on its servers even if you later delete your bench page. This is how all link previews work."* Single `[Got it, share]` button, no dark pattern.
2. **Deletion page copy** on `/u/<handle>/delete` re-states the same fact: *"Your profile, scan, and bench.dev card will be removed within 24 hours. Any copies of the card image already cached by X, LinkedIn, or other services where you shared the link may remain there — contact those services to remove them."*
3. **OG image origin URL** uses the scan/profile ID, not a stable filename — so deleting+rescanning generates a new image at a new URL. Old cached copies are not updated to "404" but are no longer linked from anywhere on bench.dev.
4. **No face, no real name in OG image by default.** The card shows handle, score, tier, signature verbs, constellation, hours-with-cc. GitHub avatar is opt-in per profile (off by default in Phase 1).

This row exists so future "why does X still show my old card?" complaints have a documented, honest answer.

---

## 9. Failure-mode catalog

Every mode has a terminal state. No mode leaves the CLI hanging or uploads partial data.

| # | Failure | Trigger | Mitigation / terminal state |
|---|---------|---------|-----------------------------|
| N1 | No `~/.claude/` | First-time CC user or CC not installed | CLI: "No `~/.claude/` found. Run Claude Code for a week, then come back." Exit 0. |
| N2 | No session logs (config-only) | User has config but never ran CC | Score chapters normally, hide hours hero, show card with eyebrow "config scan — sessions pending." |
| N3 | Zero skills | Fresh CC user | Score accordingly; tier = Explorer. Positive copy, no shame. |
| N4 | Broken JSON in settings.json | User edited by hand | Log warning to `diagnostics.parse_warnings`, fall back to defaults (empty permissions, no hooks), continue. |
| N5 | Permission denied on file | OS perms weird | Skip file, log to `diagnostics.skipped_files`, continue. |
| N6 | Secret pattern matched | User has API keys in CLAUDE.md or settings | Redactor replaces in-place, increments `redaction_hits`, consent prompt calls attention before upload. |
| N7 | Consent denied (N typed) | User chose not to upload | Write `./bench-scan.json` + self-contained `./bench-scan.html`. Exit 0 with note "not uploaded — you can retry with `npx bench` anytime". |
| N8 | Network unreachable during upload | Wifi off, firewall | Retry 3× with exponential backoff (1s, 3s, 8s). On final failure, write local files and exit 0 with note. |
| N9 | Upload interrupted mid-request | TCP RST, etc. | Same as N8. Never retry with different ID. |
| N10 | Rate limited by API (429) | Abuse or accidental loop | CLI prints "you're going too fast — try again in 5 min". Writes local files. Exit 1. |
| N11 | Scanner version rejected by API | Very old client | API returns 426 with `{required_version: "1.0.0"}`. CLI prints "please run `npx bench@latest`". |
| N12 | Claim handle taken by another GitHub user | User tries to claim someone else's name | `/api/claim` reads `github_id` from OAuth, writes only to THAT id's profile. Another user's handle can't be overwritten. |
| N13 | Massive `.claude/` (>10K files) | Power user with thousands of skills | Scanner time-boxed to 30s. On timeout, score with what we read and flag `diagnostics.partial_scan=true`. Show normal card with an eyebrow note. |
| N14 | Symlink escapes boundary | Malicious or accidental link to `~/.ssh` | Scanner refuses, logs to `diagnostics.skipped_files`. Never follows symlinks outside allowed prefixes. |
| N15 | Running as root | `sudo npx bench` | Refuse at startup. "Run bench as your normal user. Exit 1." |
| N16 | Multi-account / non-standard `CLAUDE_HOME` | Env var set | Scanner respects `CLAUDE_HOME` if set. If both default and env exist, scans the env one and warns. |
| N17 | Sessions without timestamps | Very old CC or corrupted logs | Fall back to file mtime. Flag in diagnostics. |
| N18 | Timezone drift | User in flight | All timestamps normalized to UTC internally. |
| N19 | Hours outlier (>3120h) | Buggy session log or stuck session | Clamp to 3120. Flag `diagnostics.hours_clamped=true`. |
| N20 | Windows paths | User on Windows 11 | Use `%USERPROFILE%\.claude`. All path normalization via `path.resolve`. |
| N21 | `--offline` flag | User explicit | Skip network entirely, write local files, exit 0. |
| N22 | Scanner crash (uncaught) | Truly unexpected | Global error handler: print "something went sideways, please file at github.com/Imasaikiran/bench/issues with this trace", exit 1 with stack + sanitized diagnostics. |
| N23 | Git not installed | User without git | Skip git-derived dimensions (commit_burst_correlation, signature_verbs from commits). Use defaults. Flag in diagnostics. |
| N24 | `bench.dev` is down | Vercel incident | CLI treats as network failure (N8). |
| N25 | DB outage | Neon incident | `/api/scan` returns 503. CLI retries as N8. |
| N26 | Viral spike exceeds spending cap | HN front page at scale | Vercel cap hit → app serves tasteful `/over-capacity` page for reads, `/api/scan` returns 503 with "come back in a few hours." |
| N27 | `.claude/` in a CI runner | Env vars set for CI | Scanner refuses at startup. "bench is for your personal setup, not CI." |
| N28 | CLAUDE.md >100KB | User pasted everything | Truncate to first 100KB for scoring. Flag in diagnostics. |
| N29 | Skills in non-standard path | User points skills elsewhere via settings | Respect `settings.skills.path` if present, else default. |
| N30 | Rubric mismatch CLI vs server | Client stale | Server re-scores from uploaded counts using its own rubric version. Stamps the result page with server's rubric version. |

---

## 10. Guardrails (three categories, referenced from this spec)

### 10.1 Data-integrity guardrails (is the number right?)

1. **No LLM in scoring path.** Deterministic parsing + published formulas only.
2. **Every number has a formula on `/how-we-scored`.** Hero number links to `/how-we-scored#hours`.
3. **`bench --why` prints per-dimension reasoning.** Any user can audit locally.
4. **Hours hidden when `active_hours_total < 5`.** Never filled in with fake.
5. **Hours capped at 3120h.** Outliers clamped + flagged.
6. **Rubric is versioned.** Every rendered page shows `scored with rubric vN.N.N`.
7. **Snapshot test of scanner output.** CI runs scanner against fixture `.claude/` dirs and diffs expected JSON. Any drift fails the build.
8. **Signature verbs extracted from user's own commit messages**, not LLM-generated. Fallback is generic ("you build"), never invented.

### 10.2 Privacy guardrails (do we leak anything?)

1. **Consent required, default = no.** No silent upload. No `--yes` shortcut.
2. **Published redaction list** in open-source CLI repo. Community-editable.
3. **Only derived numbers + tier labels uploaded.** No raw file content ever.
4. **Scanner is open source from commit #1.** "Don't trust me, read the source" is the trust story.
5. **Single-egress network policy.** Enforced in code + easy to audit.
6. **30-day TTL on anonymous scans.** Claimed profiles have a one-click delete.
7. **Scanner refuses root + CI environments.** Prevents accidental mass-scanning.
8. **Refuses symlinks escaping allowed prefixes.** Prevents `~/.ssh`-style attacks.
9. **Redaction hit count shown in consent prompt.** User warned if any pattern matched.

### 10.3 Adversarial guardrails (gaming, abuse, cost blowouts)

1. **Rubric penalizes bloat.** Installing 50 unused skills drops Coherence score. Gaming lowers the number.
2. **Cloudflare WAF rate limit.** 10 req/min per IP on `/api/scan`.
3. **App-level rate limit.** 50 scans per IP per 24h.
4. **Vercel spending cap.** Hard monthly cap at $50. Past that, `/api/scan` returns 503 with "back soon." Rent stays paid.
5. **Payload size limit.** 16KB max on `/api/scan` body. Rejects anything larger.
6. **Schema version enforced.** `/api/scan` rejects schemas older than current - 2 minor versions.
7. **Handle claim tied to `github_id`, not just handle string.** Can't hijack someone else's handle.
8. **Nightly cron deletes expired scans.** Storage stays bounded.
9. **IP hash uses daily salt.** Rate-limit data not identifying, rotates.
10. **Client HMAC over counts + anomaly detection.** The CLI computes `hmac_sha256(bundled_key, canonical_json(counts))` and includes it in the upload as `payload.integrity.client_hmac`. The bundled key is a constant compiled into the npm package — **this is not a secret**, it only costs an attacker a `strings`-grep to extract. Its job is friction, not cryptography. The server additionally runs cheap anomaly rules: `score > 85 AND sessions_total < 10`, `hours_with_cc > 500 AND skills_total = 0`, `coherence_score = 1.0 AND skills_unused_ratio = 0`, `weeks_on_cc > 100`, and payloads where the derived chapter scores don't recompute from the counts using the current rubric. Anomalous scans are accepted but flagged with `is_suspect = true` in the DB, excluded from `/stats` aggregates, and never promoted to `/demo` or featured content. The card still renders — we don't punish the scanner, we just don't quote it publicly.
11. **Rubric-driven re-scoring on upload.** The server always recomputes `score`, `chapter.*.score`, and `tier` from uploaded `counts` using the server's rubric. Client-reported scores are ignored. Gaming the rubric requires gaming the counts — which the anti-bloat dimensions already penalize.

---

## 11. Non-functional requirements

| Metric | Target | Verified by |
|--------|--------|-------------|
| Scan time (typical setup, ~500 sessions) | ≤ 10 s | local benchmark on founder's machine + 3 reviewers |
| Scan time (power user, 10K files, 5K sessions) | ≤ 30 s | synthetic fixture in CI |
| Upload payload size | ≤ 16 KB | enforced at API boundary |
| Page weight (p90) | ≤ 400 KB | Lighthouse in CI |
| `/scan/<id>` TTFB | ≤ 300 ms from Vercel edge | Vercel analytics |
| `/api/scan` latency p95 | ≤ 500 ms | Vercel logs |
| OG image render | ≤ 500 ms cached, ≤ 1 s cold | Vercel analytics |
| CLI cold npx install | ≤ 30 s (registry-bound) | test on clean machine |
| Rubric update round-trip | ≤ 48 h from PR merge to live | ship discipline |
| Mobile viewport (320px–380px) | card renders on one scroll, no horizontal scrollbar, font ≥ 14px, tap targets ≥ 44px | Lighthouse mobile + manual check on iPhone SE, Pixel 5 |
| Mobile viewport (381px–768px) | card renders full-width, constellation legible, share button thumb-reachable | manual check on iPhone 14 Pro, Pixel 8 |
| OG image aspect | 1200×630 (X/LinkedIn safe), text legible when scaled to 600×315 (Slack unfurl) | manual preview on X, LinkedIn, Slack |
| Page accessible | WCAG AA contrast on all text+bg pairs | axe-core in CI |

### 11.1 Post-launch product metrics

Tracked in Plausible (§15 row 12). Reviewed weekly by founder for Phase 1 and Phase 2.

| Metric | Event | Phase 1 target | Phase 2 target | Phase 1 kill trigger |
|--------|-------|----------------|----------------|----------------------|
| **Install → scan rate** | `scan_upload` / `landing_view` with install-cta click | ≥ 40% | ≥ 55% | < 20% |
| **Share rate (W1)** | `share_click` / `scan_upload` within 7 days | ≥ 15% (the bet, §0.5.4) | ≥ 22% | < 8% |
| **Rescan rate (W4)** | any user with ≥ 2 distinct `scan_upload` events within 28 days / total W1 installs | ≥ 20% | ≥ 30% | < 10% |
| **Time-to-first-share** | median seconds between `scan_upload` and `share_click` for users who share | ≤ 8 minutes | ≤ 4 minutes | > 1 hour suggests card doesn't land |
| **Score × share correlation** | share rate grouped by score bucket (0–40, 40–60, 60–80, 80+) | share rate monotonically increases with score, OR peaks at 60–80 (the "I'm thoughtful, not elite" sweet spot) | same | flat or inverted correlation = card rewards completeness theatre, not insight |
| **Claim rate** | `claim_complete` / `scan_upload` | ≥ 25% | ≥ 40% | < 10% (anonymous scans not converting = no one wants to defend their page) |
| **Delete rate** | `delete_complete` / total profiles | < 5% | < 3% | > 10% (trust is broken) |
| **Anomaly rate** | `is_suspect=true` scans / total scans | < 1% | < 0.5% | > 5% means our gating is wrong or someone's farming |
| **Feedback submission rate** | `feedback_submit` / `scan_upload` | any non-zero = healthy | ≥ 1% | 0% after 500 scans = no one trusts we'll read it |

**Dashboards.** `/internal/metrics` (password-protected, founder only). Plausible goals configured for each event above. No per-user tracking beyond the scan-upload → same-session share chain, which Plausible handles without cookies.

### 11.2 Growth model napkin math (falsifiable assumptions)

This is the math that says "Phase 1 kill threshold = < 30 scans in launch week" makes sense. All numbers are assumptions; if any are off by 2x, the model collapses and we learn which one.

```
launch-week funnel (assumed):

  X / HN / r/ClaudeAI                          30,000 impressions
    × 2%   (link CTR)                             600 landing-page visits
    × 40%  (install → scan, Phase 1 target)      240 scans
    × 15%  (share, Phase 1 target)                36 shares
    × 30   (new impressions per share, median)  1,080 secondary impressions
    × 2%                                           22 secondary landing visits
    × 40% × 15%                                  1.3 secondary shares  → viral coefficient < 1 ✔

→ we are explicitly designing for K < 1. The content-led loop (X threads, blog posts,
  HN resubmits) is the growth driver, not viral math.
→ bench is not Cal.com; one person sharing does not spawn an exponential tree.

launch-week scan floor:  30,000 × 2% × 40% = 240   (target)
launch-week scan kill:   < 30 scans          (floor; 12.5% of target)
```

**Assumption tripwires (if any is wrong, the model is wrong):**
1. **Link CTR = 2% assumed.** If HN front page alone → 5%+ on day 1, we underproject. If no HN traction and only X → 0.5% realistic, we overproject by 4x.
2. **Install → scan = 40%.** Anxious improvers are terminal-tolerant but `npx` may still be a barrier. If < 20% actual, landing page copy or install-line is the problem.
3. **Share rate = 15% assumed = the bet.** This is the one we're testing, not assuming confidently.
4. **Impressions per share = 30 median.** Low-follower accounts drag this down; Simon-Willison-class shares pull it way up. Long tail-heavy — mean > median, and most growth is from a few tweets.

If we hit the kill threshold (< 30 scans), the implied failure is either (1) link CTR << 2% (bench didn't interest anyone clicking) or (2) install→scan << 40% (interest did not convert to try). Postmortem inspects which one and decides whether to retry launch after fixing.

---

## 12. Cost projection

Based on research agents' 2026 pricing data.

| Traffic/month | Vercel | Neon | Cloudflare | Domain | Plausible | **Total** |
|---------------|--------|------|------------|--------|-----------|-----------|
| 0 scans (idle) | $0 (Hobby) | $0 (Free) | $0 | $1/mo amortized | $0 (first site free) | **~$1/mo** |
| 1K scans | $0 | $0 | $0 | $1 | $0 | **~$1/mo** |
| 10K scans | $0–$20 (Hobby → maybe Pro if commercial) | $0 | $0 | $1 | $0 | **$1–$21/mo** |
| 100K scans | $20 (Pro) | $0–$19 (Free → Launch) | $0 | $1 | ~$9 | **$30–$49/mo** |
| 1M scans (extreme) | $20 Pro + ~$40 bandwidth overages | $19 Launch | $0 | $1 | $19 | **~$80/mo** |

**One-time / annual:**
- Domain (e.g. `bench.dev`): ~$12/yr.
- Nothing else.

**Not in the budget:**
- No code-signing certs ($99 Apple + $260 Win) → not a desktop app.
- No email provider → no list.
- No Stripe fees → no payments.

**Hard cap:** Vercel monthly spending cap set to $50. Fallback to `/over-capacity` page if exceeded. Founder not on the hook for surprise bills.

---

## 13. Launch sequence

Aligned with plan.md phases, adjusted for v2:

### Phase 0 — Rubric-first (Week 1: Apr 25 – May 2, 2026)

1. Publish `rubric.yaml` v0.1 and `/how-we-scored` content in the public bench repo.
2. Founder X thread: "bench: one-page honest score of your Claude Code setup. Here's the rubric — roast it."
3. Cross-post to r/ClaudeAI, Anthropic Discord `#claude-code` channel, and `awesome-claude-code` issues.
4. Invite PRs for 7 days.
5. **Kill criterion (strict).** Pause build if none of these are met at end of Day 7:
   - **≥ 3 PRs or issues** from GitHub accounts that **have not previously interacted** with the founder's repos (checked via `gh api` on the founder's repo graph). Friends-responding-to-friends is not signal.
   - **≥ 10 substantive comments** (not one-word reactions) from ≥ 5 distinct non-founder accounts across X, Reddit, Discord, GitHub combined.
   - **≥ 1 unsolicited blog post, tweet thread, or video** referencing the rubric by another developer.
   The thresholds are tripwires, not targets. Any single one failing means the demand model is weaker than assumed. Kill means: the CLI and web app don't get built on this founder's time this quarter.

### Phase 1 — CLI + web MVP (Week 2–4: May 2 – May 22, 2026)

Build work in rough order (full build plan comes next in a separate implementation plan):

1. CLI scanner v0.1 (read-only, no network). Pure local preview. Publish as `bench@0.0.1-alpha`.
2. Next.js app scaffold on Vercel. `/api/scan` route. Neon schema applied.
3. GitHub OAuth for claim flow.
4. `@vercel/og` OG image route.
5. Port v1 frontend into Next.js pages, wire to real JSON from DB.
6. `/demo` page with synthetic Priya.
7. `/rubric` + `/how-we-scored` content.
8. CLI `--why` + `--offline` + consent gate.
9. Private beta with 10 hand-picked devs (Marco Lancini, Freek, Simon Willison, Harper Reed, Geoff Huntley, founder, + 4 more).
10. Public launch **May 22, 2026**.

Distribution day-by-day per plan.md §6. Show HN, r/ClaudeAI, X, awesome-claude-code PR.

### Phase 2 — Depth (Week 5–9: May 22 – Jun 26, 2026)

1. Delta-reveal on rescan.
2. `/stats` page — public aggregate (median, distribution), honest not Klout.
3. Rubric v1.1 with accepted community PRs.
4. Second OG card variant; keep winner on share-rate.

### Phase 3 — Cultural footprint (Month 3–6)

1. Embed route `<img src="bench.dev/u/handle/card.svg">` for READMEs (github-readme-stats pattern).
2. Rubric v2 with community-contributed dimensions.
3. Monthly "bench portraits" editorial (one featured setup per month, with consent).

**Kill criteria per phase:**

- Phase 1: < 30 scans in launch week → stop.
- Phase 2: < 20% W2 rescan rate after 4 weeks → re-examine the visual's curiosity-producing power.
- Phase 3: embed cards are ugly at arbitrary sizes → roll back embed feature, aesthetic trumps growth.

---

## 14. Non-goals (permanent)

Re-read before any new feature request:

1. No payments (Stripe, Razorpay, paddle, anything).
2. No teams / enterprise / B2B product.
3. No LLM-per-user recommendation engine.
4. No email list, no digest, no drip.
5. No "coach mode" / "guide me" walkthroughs.
6. No notifications, no push, no webhooks out.
7. No levels / XP / streaks / gamification clichés.
8. No comment threads, reactions, or likes on profiles.
9. No ads / sponsored placements inside the product.
10. No mobile app, no desktop app, no IDE extension. Web + CLI only.
11. No absolute leaderboard UI. Percentile is allowed in moderation on `/stats`.
12. No sign-up wall to see your own score. GitHub OAuth is only for claiming a handle.
13. No other AI tools in MVP (Cursor, Codex, Gemini). CC only.

---

## 15. Decisions (previously open, now resolved)

All items below are **decided**. Reversing any of them is a spec change, not an implementation detail. Listed for traceability.

| # | Decision | Value | Reversal cost |
|---|----------|-------|---------------|
| 1 | **Domain** | `bench.dev` (v1 footer already uses it; avoid rebrand churn) | low pre-launch, high post-launch |
| 2 | **npm package name** | `@imasaikiran/bench` for alpha/beta; reserve `bench` via npm support request; fallback `benchrun` if reservation denied | medium — changes install line on landing page + all copy |
| 3 | **Repo layout** | monorepo at `github.com/Imasaikiran/bench`; CLI at `cli/`, web at `web/`, rubric at `rubric/rubric.yaml`, spec at `docs/specs/` | high post-launch |
| 4 | **Rubric location** | same monorepo (`rubric/rubric.yaml`); split only if community PR volume > 5/week for 3 consecutive weeks | low |
| 5 | **Hours formula** | drop `K`; report `hours_with_cc` as-is; see §5.3 | high — touches copy, rubric, docs, every page |
| 6 | **Phase 1 launch date** | **May 22, 2026** (Friday). Soft-launch to beta Tue May 19; public HN / X / r/ClaudeAI Fri May 22 09:00 PT | medium |
| 7 | **Beta list (10 devs)** | founder + Marco Lancini, Freek van Herk, Simon Willison, Harper Reed, Geoff Huntley, Sai Krishna Reddy, Ben Newton, one from `awesome-claude-code` top 5 contributors, one from Anthropic Discord power-users. Final 3 slots filled from Phase 0 top PR contributors. | low |
| 8 | **Founder demo handle** | `@imasaikiran` will be scanned Phase 0 Day 7 and kept as permanent `/u/imasaikiran` page. `/demo` uses a **synthetic Priya** shape (fictional, labeled as such) — real human not used for `/demo` to avoid freezing one person's setup as canonical | low |
| 9 | **Tier-name change** | Orchestrator renamed to **Operator** (§5.4) to break synonym collision with Conductor | low pre-launch |
| 10 | **Primary user** | **the anxious improver** (§0.5.2) — all copy, kill-criteria, and share-prompt wording designed around this persona | high — changes product voice |
| 11 | **GitHub login scope** | read-only (`read:user`) for claim only. No repo read, no write. Users see "bench will only know your GitHub username" in the OAuth consent screen label if platform allows | low |
| 12 | **Analytics** | Plausible, EU-hosted, cookieless. No GA. No Mixpanel. Events: `scan_upload`, `claim_complete`, `share_click`, `delete_complete`, `rescan_detect`. Nothing per-user | low |

**Anything not in this table is not a question for the founder.** The implementation plan (next doc) treats all 12 rows as fixed inputs.

---

## 16. What happens after this spec

1. ✅ Founder reviewed this doc and delivered an architect-level critique.
2. ✅ Spec amended inline per review (see amendment log at top).
3. ✅ Spec committed to `v2-dev` as `docs/specs/2026-04-25-bench-v2-design.md`.
4. **Next:** Implementation plan drafted via the `writing-plans` skill as a separate doc.
5. Plan breaks the work into commits/PRs with a test-first order, keyed off Phase 0 → Phase 1 milestones in §13.
6. Implementation begins on `v2-dev` or sub-branches. Nothing on `main`, `v1-bench`, or `v1.0.0`.

---

## 17. Glossary

| Term | Definition |
|------|------------|
| bench | the product |
| scan | one run of `npx bench` producing a scored JSON |
| card / portrait | the rendered v1 single-page view of a scan |
| constellation | the v1 SVG visual: 5 clusters × 5 stars each = 25 dimensions |
| chapter | one of the five rubric categories (Foundation, Automation, Delegation, Craft, Coherence) |
| dimension | one of the 25 scoring criteria |
| tier | the persona label (Explorer / Tinkerer / Craftsman / Operator / Conductor) |
| must-have | one of 15 community-curated setup items shown with user's state |
| rubric | the `rubric.yaml` file containing every dimension, weight, criteria, rationale |
| redactor | the CLI component that removes secrets before payload assembly |
| claim | exchanging an anonymous `/scan/<id>` for a permanent `/u/<handle>` via GitHub OAuth |

---

**End of spec.**
