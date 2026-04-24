# bench v2 — Design Spec

**Date:** 2026-04-25
**Status:** Draft for founder review
**Branch:** `v2-dev`
**Author:** Drafted in Claude Code session, 2026-04-25
**Related:** `V2_KICKOFF.md` (v2-dev), `PRD.md` / `research.md` / `plan.md` (v1-bench), `script.js` persona contract (v1-bench)

---

## 0. Purpose of this document

Single source of truth for building bench v2 before any implementation starts. Every architectural decision, formula, data contract, and failure mode is fixed here. If a reviewer can't start coding from this doc, it's incomplete and should be extended before work begins.

The doc explicitly does NOT re-open v1 design decisions (hero number, meaning line, persona model, constellation visual, five-chapter structure, must-haves panel, dark palette, typography). Those are frozen at `v1.0.0`.

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

No payments. No Redis/queue. No email provider. No mobile/desktop app. No IDE extension. No analytics beyond Plausible. No CMS. No ML model. No background workers beyond a nightly cron. Every feature we reject is listed in §15 (non-goals) so future pressure to add them has a written counter-argument.

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
User clicks "Share on X" button on their card. Opens pre-filled tweet: "Claude gave me 187h back. I install · I prune · I question. Bench 62 · Tinkerer. bench.dev/u/priya_dev". When the tweet posts, X fetches the URL, sees `<meta property="og:image" content="https://bench.dev/og/<id>.png">`, renders the card inline.

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

### 5.3 The hours-saved formula (published, bounded, honest)

```
for each session S in ~/.claude/projects/**/*.jsonl:
    active_seconds(S) = Σ min(gap, 900) over consecutive message timestamps
    active_hours(S)   = active_seconds / 3600

active_hours_total = Σ active_hours(S)
hours_saved        = round(active_hours_total × K)
K = 0.60   # published assumption; GitHub Copilot impact research cites 55-64% coding-time reduction
```

**Cap.** `hours_saved` hard-capped at `52 weeks × 60h = 3120h`. Anything above logs a diagnostic and is clamped. Prevents outlier hero numbers.

**Honesty rules.**
- If `active_hours_total < 5`, the hero number is hidden. The card shows chapters + tier but the central hour number is replaced with the eyebrow text "not enough session history yet — come back in a week."
- `K` is displayed on `/how-we-scored` with a linked citation. If community PRs change it, the version bumps and the `/how-we-scored` page explains the change.
- `hours_saved` on every rendered page links to `/how-we-scored#hours`. Skeptics can audit.

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
Orchestrator   : weeks_on_cc ≥ 16 AND agents_configured ≥ 2
                 AND hooks_configured ≥ 3
                 AND automation_events ≥ 300
                 AND coherence_score ≥ 0.75
Conductor      : all Orchestrator conditions
                 AND skills_total ≥ 5  AND skills_unused_ratio ≤ 0.1
                 AND sub_dir_claude_md_count ≥ 2
                 AND commit_burst_correlation ≥ 0.4
```

Evaluated from highest tier down (Conductor → Orchestrator → Craftsman → Tinkerer → Explorer). First tier whose conditions all match is the answer. Explorer is the catch-all default. Each tier has a v1-approved copy line and an optional meaning line ("past the honeymoon," "full season in," etc.).

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

---

## 6. Rubric specification

- File: `rubric.yaml` (YAML for reviewability, parsed into a stable internal shape).
- Version: `semver`, embedded in CLI bundle and server.
- Lives: in `bench/rubric/rubric.yaml` (in main repo) and bundled into the npm package at build time.
- Community PRs: allowed to the repo. Every merged PR bumps the minor version.
- Each dimension has: `id`, `name`, `chapter`, `weight`, `have_criteria` (human-readable), `partial_criteria`, `rationale`, `sources[]` (urls or citations).
- Server and CLI MUST use the same rubric version. The upload payload carries `rubric_version`. If server version is higher, server re-scores from payload counts.

**Re-scoring rule.** Upload contains both the raw counts AND the computed scores. Server trusts its own rubric to re-score from counts if versions differ. Historic pages stay stamped with the rubric version they were scored under; a "rescore with latest rubric" button is offered on profile pages.

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
  "hours": 187,
  "hours_hidden": false,
  "hours_formula_k": 0.60,

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
  "hours_meaning": "a full sprint back — 23 workdays, or a side-project shipped",
  "chapter_note":  "Automation is dark — that's the fastest lever you have.",

  "diagnostics": {
    "redaction_hits": 0,
    "parse_warnings": [],
    "skipped_files": 0,
    "elapsed_ms": 2340
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
  │  hours Claude gave back                     │
  │  a full sprint back — 23 workdays           │
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
    "hours": 187,
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
| Feedback rows | 180 days | quarterly cleanup |
| Rate-limit rows | 24 hours | hourly cleanup |

Deletion button on every profile page. Deletion cascades (profile row + all scans). Database has no analytics tables, no derived aggregates beyond `/stats` which is computed on-the-fly (cached 1h).

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
3. Invite PRs for 7 days.
4. **Kill criterion:** if < 5 external engagement events (PRs, substantive comments), pause build. Demand weaker than modeled.

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

## 15. Open questions for founder (resolve before implementation plan)

1. **Domain:** `bench.dev` or alternative? (plan.md mentions `setupscore.dev`/`setupscore.ai` as earlier candidates, but the v1 frontend already uses `bench.dev` in the footer copy. Assuming bench.dev.)
2. **npm name:** `bench` (likely taken on npm), `@bench/cli`, `benchrun`, or `claude-bench`? A scoped package like `@imasaikiran/bench` is a safe default; the branded name can be reserved separately.
3. **GitHub repo location:** confirmed as `github.com/Imasaikiran/bench`, v2 work lands on `v2-dev`. Scanner can live in `cli/` within the same monorepo, or a separate `bench-cli` repo. Recommendation: monorepo under `cli/`. Simpler release coupling with the web app.
4. **Rubric repo:** same monorepo (`rubric/rubric.yaml`) or separate (`bench-rubric`)? Recommendation: same monorepo to start; split out later if contribution volume justifies.
5. **`K` value in hours formula:** proposed 0.60. Accept, or pick a different citation?
6. **Phase 1 public launch date:** proposed May 22, 2026 (from plan.md). Confirm.
7. **Hand-picked beta list (10 devs):** confirm names before I draft outreach DMs.
8. **Founder's own handle for day-one demo:** confirm it will be scanned and public to seed the `/demo` and `/u/<founder>` page.

---

## 16. What happens after this spec

1. Founder reviews this doc, leaves inline feedback on anything wrong.
2. Spec updated inline until founder approves.
3. Spec committed to `v2-dev` as `docs/specs/2026-04-25-bench-v2-design.md`.
4. Implementation plan drafted next (separate doc, produced by the `writing-plans` skill).
5. Plan breaks the work into commits/PRs with a test-first order.
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
| tier | the persona label (Explorer / Tinkerer / Craftsman / Orchestrator / Conductor) |
| must-have | one of 15 community-curated setup items shown with user's state |
| rubric | the `rubric.yaml` file containing every dimension, weight, criteria, rationale |
| redactor | the CLI component that removes secrets before payload assembly |
| claim | exchanging an anonymous `/scan/<id>` for a permanent `/u/<handle>` via GitHub OAuth |

---

**End of spec.**
