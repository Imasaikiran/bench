# Phase 1 — Launch Day Runbook

> **Owner:** founder (`@imasaikiran`).
> **Launch date:** 2026-05-22 (Friday), 09:00 PT public push (per spec §15 row 6).
> **Soft launch to private beta:** 2026-05-19 (Tuesday).
> **Plan reference:** `docs/plans/2026-04-25-bench-v2-implementation-plan.md` Task 1.39.
> **Spec reference:** `docs/specs/2026-04-25-bench-v2-design.md` §13 (Phase 1 launch sequence) + §11.1 (post-launch product metrics) + §11.2 (growth model napkin math).
> **Phase 0 gate:** `docs/plans/phase0-signal.md` decision must be **BUILD PHASE 1** before this runbook runs.

This document is read top to bottom on launch morning. Do not improvise.

---

## 1. Pre-flight checklist

Run all checks Day -1 (May 21). Tick every box. Any FAIL aborts the launch by 24h, no exceptions — re-shipping after a public 503 is worse than slipping by a day.

### 1.1 Phase 0 gate

- [ ] `docs/plans/phase0-signal.md` `Decision:` field reads **BUILD PHASE 1** (signed, dated).
- [ ] If YELLOW per §4 of that doc, founder has re-read the "honour Phase 1 kill" pre-commitment.

### 1.2 Environment variables

Set in Vercel project settings → Environment Variables → Production. None of these may be empty.

| Variable | Owner | Used by | Notes |
|----------|-------|---------|-------|
| `DATABASE_URL` | Neon | `web/lib/db.ts`, `web/migrations/run.ts` | Production Neon branch URL, not the dev branch. Pooled connection string. |
| `GITHUB_CLIENT_ID` | GitHub OAuth app | `web/app/api/auth/github/route.ts`, `web/lib/github.ts` | Production OAuth app. See §1.4. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app | same | Marked secret in Vercel UI. |
| `OAUTH_STATE_SECRET` | self-generated | `web/app/api/auth/github/route.ts` | 32+ random bytes, hex. |
| `CRON_SECRET` | self-generated | `web/app/api/cron/expire/route.ts` | 32+ random bytes, hex. Same value pasted into Vercel Cron header config. |
| `METRICS_USER` | self-chosen | `web/middleware.ts`, `/internal/metrics` | Founder-only basic-auth. |
| `METRICS_PASS` | self-generated | same | Strong random; do not reuse. |
| `PLAUSIBLE_DOMAIN` | Plausible | `web/app/internal/metrics/page.tsx`, `web/lib/plausible.ts` | `bench.dev`. |
| `PLAUSIBLE_API_KEY` | Plausible | `web/app/internal/metrics/page.tsx` | Stats API token (read-only). |
| `BENCH_PUBLIC_ORIGIN` | self-set | `web/lib/v1render.tsx`, `/scan/[id]`, `/u/[handle]` | `https://bench.dev`. |
| `OVER_CAPACITY` | manual | `web/app/api/scan/route.ts` | **Must be unset or `"0"` at launch.** Set to `"1"` only to engage the kill switch (see §5). |
| `SENTRY_DSN` | Sentry | `web/` runtime (`sentry.client.config.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`) | Sentry wired (commit `c94f690`) and gated on this var. Leave unset for preview deploys; set in **Production** scope only. If unset in Production, runtime is silent — that is the deliberate fallback, not a bug. |

- [ ] All variables above are set in Vercel **Production** scope (not Preview).
- [ ] Re-deploy triggered after env changes (Vercel does not pick up env changes without a redeploy).
- [ ] `vercel env pull` from a clean checkout shows the same set (sanity check).

### 1.3 Database

- [ ] `pnpm -C web migrate` was run against production `DATABASE_URL`. `migrations/0001_init.sql` applied.
- [ ] `psql $DATABASE_URL -c '\dt'` shows tables: `scans`, `profiles`, `feedback`, `rate_limits`.
- [ ] `psql $DATABASE_URL -c "SELECT COUNT(*) FROM scans;"` returns 0 (or only test rows known to founder).
- [ ] Neon dashboard: production branch protection on. No "drop" actions wired into CI.

### 1.4 OAuth app (GitHub)

- [ ] GitHub OAuth app created at `https://github.com/settings/developers`.
- [ ] Authorization callback URL = `https://bench.dev/api/auth/github`.
- [ ] Scope is `read:user` only (per spec §15 row 11). No `repo`, no `write:*`.
- [ ] Client secret rotated within last 30 days (or freshly issued).
- [ ] Test claim flow against production once with founder's own `@imasaikiran` account before launch (smoke test §2).

### 1.5 OG card rendering

- [ ] `https://bench.dev/api/og/<known-scan-id>` returns a 1200×630 PNG within 2s p95.
- [ ] Manual unfurl preview on X, LinkedIn, Slack of `https://bench.dev/scan/<known-scan-id>` — card renders, no broken image, no fallback gray box.
- [ ] Card text legible when scaled to 600×315 (Slack unfurl size) — per spec §11 NFR.

### 1.6 Rate limit + nightly cron

- [ ] `web/lib/ratelimit.ts` is wired into `/api/scan` (already merged per commit `cd3b5a8` Task 1.33). Smoke: send 51 requests from one IP and confirm the 51st gets 429.
- [ ] Vercel cron schedule `0 3 * * *` for `/api/cron/expire` is enabled in production project (per `web/vercel.json`).
- [ ] Cron run history shows at least one prior successful run (run it manually on Day -1 if no history).
- [ ] Cron auth: `Authorization: Bearer $CRON_SECRET` header set in Vercel Cron config.

### 1.7 Plausible

- [ ] `bench.dev` site provisioned in Plausible (EU-hosted, cookieless).
- [ ] Goals configured for each event in spec §15 row 12: `scan_upload`, `claim_complete`, `share_click`, `delete_complete`, `rescan_detect`.
- [ ] Plausible script tag visible in production HTML (`view-source:https://bench.dev`).
- [ ] `/internal/metrics` loads behind basic auth and shows non-error data (even if zero events, the dashboard fetches without 500).

### 1.8 npm package

- [ ] `npm view @imasaikiran/bench version` returns the current alpha tag (e.g. `0.0.1-alpha.0`) per Task 1.38.
- [ ] `npx @imasaikiran/bench@alpha --version` from a clean machine prints `bench v0.0.1-alpha.X` and `rubric v0.1.X`.

### 1.9 Edge / WAF

- [ ] Cloudflare WAF rule live: `(http.request.uri.path eq "/api/scan") and (rate(1m) > 10)` → Block (per Task 1.33 Step 2).
- [ ] Vercel project monthly **spending cap = $50** (spec §12).

### 1.10 Founder readiness

- [ ] Founder scan claimed (`@imasaikiran`) and re-scanned Day 0 morning to confirm rescan path works (per plan Task 1.39 Step 1).
- [ ] `/demo` loads in < 300 ms p95 from a non-California network. Constellation animates.
- [ ] Founder calendar blocked 09:00–15:00 PT for thread replies + incident response.
- [ ] Phone is on for the full window. Vercel + Neon + Sentry mobile alerts enabled (TODO(launch-day): confirm Sentry once wired).

---

## 2. Smoke test sequence (Day -1 evening + Day 0 morning)

Run end-to-end. Any failure aborts.

### 2.1 CLI smoke (clean machine)

On a machine that has never installed `@imasaikiran/bench`:

```
npx @imasaikiran/bench@alpha --version
npx @imasaikiran/bench@alpha --offline
```

- [ ] `--version` prints scanner version + rubric version.
- [ ] `--offline` writes `bench-scan.json` and `bench-scan.html` to cwd.

### 2.2 Full E2E (CLI → web → DB)

This is the test from Task 1.37 (`cli/test/e2e.test.ts`). Run against **production**, not localhost:

```
BENCH_E2E=1 BENCH_URL=https://bench.dev pnpm -C cli test e2e
```

- [ ] Test passes. CLI produces a payload, POST to `/api/scan` returns `{id, url}`, fetched `/scan/<id>` HTML contains the v1 root mount point.
- [ ] Row appears in Neon `scans` table for the new id.
- [ ] Plausible shows one `scan_upload` event for the test.

(After the smoke passes, manually delete the test scan via `/api/delete` so launch-window analytics reflect real users only.)

### 2.3 Manual web smoke

Ten clicks, in this order:

1. [ ] Land on `/`, click the install line, the npx command is selectable / copyable.
2. [ ] Visit `/demo` — synthetic Priya card animates.
3. [ ] Visit `/rubric` — renders 25 dimensions across 5 chapters.
4. [ ] Visit `/how-we-scored` — formulas + changelog visible.
5. [ ] Visit `/scan/<test-id>` — v1 card renders against real DB-fetched JSON.
6. [ ] Click "Claim" → GitHub OAuth → returns to `/u/<handle>` claimed page.
7. [ ] Click "Share" → ShareBar shows OG persistence disclosure modal (per Task 1.30).
8. [ ] Visit `/over-capacity` — page renders cleanly (sanity check; not yet engaged).
9. [ ] POST to `/api/scan` with malformed JSON → 400.
10. [ ] POST to `/api/scan` 51 times from one IP within 24h → 51st returns 429.

### 2.4 Engaging + disengaging the kill switch (drill, Day -1 only)

In Vercel Production env: set `OVER_CAPACITY=1`, redeploy, confirm `/api/scan` returns 503 with `Retry-After: 3600`. Then unset (or set to `"0"`), redeploy, confirm 200 again. **Leave unset before launch.**

---

## 3. Tag + publish (Day 0 morning, 08:00 PT)

The `publish.yml` workflow (Task 1.38) auto-publishes on tag push.

1. [ ] Final pre-publish: `pnpm -C cli build && pnpm -C cli test` is green on `v2-dev`.
2. [ ] Bump version in `cli/package.json` if needed (alpha → beta if beta-list outreach happened).
3. [ ] Tag and push:
   ```
   git tag v2-beta.1 -m "Phase 1 public launch"
   git push origin v2-beta.1
   ```
   The workflow at `.github/workflows/publish.yml` listens on `v2-alpha.*`, `v2-beta.*`, `v2-rc.*` tags and publishes `@imasaikiran/bench` with `--access public --tag <alpha|beta|...>`.
4. [ ] Watch the Actions tab until the publish job is green.
5. [ ] On a clean machine: `npx @imasaikiran/bench@latest --version` prints the just-published version.
6. [ ] If publish fails: do **not** retry blindly. Inspect the workflow log; common failures are `NPM_TOKEN` expired or version conflict. Fix root cause, then re-tag with a `+1` patch (do not reuse a tag).

---

## 4. Distribution sequence (Day 0, 09:00 PT onward)

Per plan Task 1.39 Step 2. 30 minutes between posts. Founder stays available 6h for thread replies.

| Time (PT) | Surface | Required content |
|-----------|---------|------------------|
| 09:00 | X thread | Hook → score-only framing → install line → link to `/demo` and `/how-we-scored`. |
| 09:30 | r/ClaudeAI | Self-post mirroring the thread, with discussion-prompt last sentence. |
| 10:00 | HN (Show HN) | Title format: `Show HN: bench – a portrait of your Claude Code practice`. URL `https://bench.dev`. First comment from founder is the install line + roast invite. |
| 10:30 | awesome-claude-code | PR adding bench under "tools" section. |
| 11:00 | Anthropic Discord `#claude-code` | Single message, link to thread + install line. No spam in adjacent channels. |

- [ ] All five posts published.
- [ ] Founder watching `/internal/metrics` and Plausible live dashboard.

---

## 5. Live kill-switch criteria

Per plan Task 1.39 Step 3 — pause distribution if **any** trigger fires for ≥ 10 minutes sustained:

- `/api/scan` p95 > 2 s.
- `is_suspect=true` rate > 10% of new scans.
- 5xx rate > 1% of `/api/scan` requests.

When triggered:

1. Set `OVER_CAPACITY=1` in Vercel Production env. Redeploy. `/api/scan` now returns 503 + redirect hint to `/over-capacity`. Existing card URLs (`/scan/<id>`, `/u/<handle>`) keep working.
2. Post the "we hit a snag" template (§7.2) on X, Reddit, HN. Pause further surface posts.
3. Triage (§6).
4. Once root cause is fixed and verified in a Vercel preview, unset `OVER_CAPACITY` (or set to `"0"`), redeploy, smoke-test §2.3 step 5 again, and post the "we're back" follow-up.

Founder authority: only the founder flips `OVER_CAPACITY`. No automated flipper in Phase 1.

---

## 6. Incident triage

### 6.1 Where to look

- **Plausible dashboard:** event volume, install→scan funnel. URL: `plausible.io/bench.dev` (or self-hosted equivalent).
- **`/internal/metrics`:** founder-only dashboard, basic-auth via `METRICS_USER` / `METRICS_PASS`. Reads from Plausible Stats API.
- **Vercel dashboard:** function logs, deployment status, spending cap proximity.
- **Neon dashboard:** connection count, slow queries, branch usage.
- **Sentry:** exception traces. TODO(launch-day): confirm DSN is wired into `web/` runtime; if not, fall back to Vercel function logs and add Sentry to the Day-1 fix list.
- **GitHub Issues on `Imasaikiran/bench`:** user reports.

### 6.2 Common failures (if/then)

| Symptom | First check | Likely cause | First action |
|---------|-------------|--------------|--------------|
| `/api/scan` 500s on every request | Vercel function logs | DB connection broken, env var missing | Verify `DATABASE_URL` set; Neon branch alive |
| `/api/scan` 503s only | env vars | `OVER_CAPACITY=1` accidentally set | Unset, redeploy |
| Cards render but OG image is blank | `/api/og/<id>` directly | `@vercel/og` runtime error, font fetch fail | Check function logs; OG route uses Edge runtime — different log surface from /api/scan |
| Claim flow returns to error page | OAuth callback, `OAUTH_STATE_SECRET` | State mismatch, expired secret | Confirm secret + callback URL still match GitHub app |
| `is_suspect` rate spiking | `web/lib/anomaly.ts` rules | Real user surge with edge-case shapes, **or** someone farming scores | Look at /internal/metrics anomaly rule breakdown; do not punish scanner — anomalous scans still render their card, they just don't promote |
| Spending cap nearing | Vercel Usage tab | Genuine viral spike | Cap at $50 will auto-engage Vercel's fallback; we add `OVER_CAPACITY=1` proactively at 80% of cap |

### 6.3 Known gaps at launch (fill if any)

- TODO(launch-day): Sentry wiring — if not shipped pre-launch, log here with the workaround (Vercel function logs only).
- TODO(launch-day): Other gaps surfaced during Day -1 dry run.

---

## 7. Communications templates

Founder voice. Edit lightly. Do not auto-post.

### 7.1 "We're live"

```
bench is live.

`npx @imasaikiran/bench@latest`

It reads your ~/.claude/ surface — skills, hooks, CLAUDE.md, settings — and renders a one-page portrait. Score is from an open rubric you can read at bench.dev/how-we-scored. Roast it; PRs welcome.

Demo (synthetic): bench.dev/demo
Rubric: github.com/Imasaikiran/bench/blob/v2-dev/rubric/rubric.yaml
```

### 7.2 "We hit a snag"

```
bench is paused for a bit — a fix is incoming. Existing card URLs still work.

If you scanned in the last hour and your card is up: that's real, it's saved. If your scan didn't go through: try again in a couple of hours.

Will post here when we're back.
```

### 7.3 "We're back"

```
bench is back. Thanks for the patience — root cause was [one-sentence honest description]. New scans are flowing again.
```

---

## 8. End-of-week tripwire (May 29, 2026)

Per plan Task 1.39 Step 4 + spec §13 / §11.1.

Hard floor: **< 30 scans in launch week → stop.** This is the kill threshold from the napkin math (spec §11.2: 30,000 impressions × 2% × 40% = 240 target; 30 = 12.5% of target, the floor below which the model is broken in a way one fix won't repair).

On May 29:

1. Pull the scan count from Neon: `SELECT COUNT(*) FROM scans WHERE created_at >= '2026-05-22' AND is_suspect = FALSE;`.
2. Pull `scan_upload` event count from Plausible for the same window.
3. If scan count < 30: write `docs/plans/phase1-week1-postmortem.md` per Task 1.39 Step 4. Per spec §11.2 the postmortem inspects two failure modes — link CTR << 2% (interest never clicked) or install→scan << 40% (interest didn't convert) — and decides whether a re-launch after fixing copy is worth a second Phase 1 push, or whether the bet itself is wrong.
4. If scan count ≥ 30: continue to Phase 2 planning (separate doc, not yet written per plan §3314).

This is a hard gate; the YELLOW pre-commitment in `phase0-signal.md` §4 explicitly applies here.

---

## 9. Rollback plan

Three reversible actions, listed cheapest first.

### 9.1 Throttle scan ingest (cheapest)

Set `OVER_CAPACITY=1` in Vercel env, redeploy. `/api/scan` returns 503 with `Retry-After: 3600`. All existing pages keep rendering. This is the live kill switch (§5). Reversible in < 5 minutes.

### 9.2 Unpublish / deprecate the npm release

For a critical CLI bug (e.g. payload-shape break, secret leak from scanner):

```
npm deprecate '@imasaikiran/bench@<bad-version>' "use @latest — known issue: <one-line>"
```

Do **not** `npm unpublish` — it permanently burns the version number in npm's registry policy and breaks any user who already cached the bad version. `deprecate` is the right tool: existing installs keep working, new installs see a warning.

If a hotfix is ready: cut a new patch (e.g. `0.0.2-alpha.0`), tag, push — `publish.yml` ships it. Then deprecate the bad version.

### 9.3 Revert the DB migration

Last resort. Only if `migrations/0001_init.sql` itself is broken in production (extremely unlikely — schema is small and was applied to dev first).

There is no `down` migration in `web/migrations/`. To revert:

1. Take a Neon point-in-time backup screenshot first (Neon UI → Branches → Restore).
2. Drop the broken artefact only (e.g. one column, one index) via a hand-written SQL statement applied via `psql $DATABASE_URL`.
3. Add a follow-up migration `0002_*.sql` that re-applies the corrected version.

**Do not** `DROP TABLE scans` — that destroys real user data. If the schema is fundamentally broken, take the Neon branch offline (which is equivalent to §9.1 because every API route depends on `DATABASE_URL`) and stage a fix branch.

### 9.4 Full rollback (worst case)

Vercel → Deployments → previous green deployment → Promote to Production. This reverts the **deploy** to before launch but does not undo the DB migration. Pair with `OVER_CAPACITY=1` to stop new writes during the rollback window.

---

## 10. After launch

- [ ] Day +1: founder writes a one-paragraph "what surprised me" note into a fresh scratch doc (not committed to repo unless useful). Captures gut signal before the numbers narrative locks in.
- [ ] Day +7 (May 29): apply §8 (end-of-week tripwire).
- [ ] Day +7: if PASS, begin Phase 2 plan. If FAIL, write the postmortem, do not start Phase 2.
- [ ] Update `phase0-signal.md` with a single line linking to the Phase 1 outcome (closes the loop on the Phase 0 decision).
