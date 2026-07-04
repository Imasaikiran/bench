# bench

A portrait of your Claude Code practice. Klout for Claude Code: scan your `.claude/` setup, get a one-page shareable card: hours Claude gave back, signature verbs, missing moves.

Zero revenue. Adoption-first. Score-only. Open rubric, community-editable.

## Try it

```
npx @imasaikiran/bench@alpha
```

> **TODO:** Task 1.38 (npm publish of `0.0.1-alpha.0`) has not run yet, so the package is not on the registry. Until then, run from a local checkout: `pnpm -C cli build && node cli/dist/index.js`.

The CLI scans `~/.claude/` (or `$CLAUDE_HOME`), shows a terminal preview, asks consent, and either uploads to `https://bench.dev/api/scan` to open a shareable card or writes `bench-scan.json` + `bench-scan.html` locally with `--offline`. Nothing leaves the machine without a y/N prompt.

## Repo layout

This is a pnpm workspace. Three packages:

| Path      | Package                       | What it is                                                                 |
|-----------|-------------------------------|----------------------------------------------------------------------------|
| `cli/`    | `@imasaikiran/bench`          | TypeScript CLI. Scans `.claude/`, scores against the rubric, uploads or exports. Bin: `bench`. |
| `web/`    | `@imasaikiran/bench-web`      | Next.js 15 App Router app (`bench.dev`). Receives scans, renders the v1 portrait, OG images, GitHub claim. |
| `rubric/` | `@imasaikiran/bench-rubric`   | Single `rubric.yaml` + JSON schema. Bundled into the CLI and re-imported by the web for server-side re-scoring. |

Other top-level dirs:

- `docs/specs/`: frozen design docs.
- `docs/plans/`: implementation plans (current: `2026-04-25-bench-v2-implementation-plan.md`).
- `V2_KICKOFF.md`: single source of truth for v2 scope, constraints, and what v1 looked like.

v1 (static HTML, the locked frontend) lives on tag `v1.0.0` and branch `v1-bench`. Do not touch those. v2 work happens on `v2-dev`.

## Local dev

Requires Node `>=20.10` and pnpm 9.

```
pnpm install
pnpm typecheck
pnpm test
```

Run the web app:

```
pnpm -C web dev
```

It boots on `http://localhost:3000`. Most pages render without env vars; routes that touch the database, GitHub OAuth, the cron, or `/internal/metrics` need the variables documented in [`.env.example`](./.env.example). Copy it to `web/.env.local`.

Build the CLI and run it against your own setup:

```
pnpm -C cli build
node cli/dist/index.js --offline
```

Run a single package's tests:

```
pnpm -C cli test
pnpm -C web test
pnpm -C rubric test
```

## Environment

All env vars are documented in [`.env.example`](./.env.example): purpose, file:line where each is read, required vs optional, and an example value. Copy it to `web/.env.local` for local dev.

Note: `BENCH_HMAC_KEY` is **not** an env var. The integrity key is hard-coded in `cli/src/payload.ts` and `web/lib/hmac.ts` as a public constant. It exists to deter casual tampering, not as an auth secret. See `.env.example` for context.

## The scorecard is open

`rubric/rubric.yaml` is the single source of truth for scoring. Versioned, community-editable. PRs that propose new checks, retune thresholds, or add tier conditions are welcome. See `docs/specs/2026-04-25-bench-v2-design.md` §10 for the rubric contract.

No LLM is in the scoring path. All scoring is deterministic from the rubric file.

## Docs

- **What we're building:** [`V2_KICKOFF.md`](./V2_KICKOFF.md)
- **Design spec (frozen):** [`docs/specs/2026-04-25-bench-v2-design.md`](./docs/specs/2026-04-25-bench-v2-design.md)
- **Implementation plan:** [`docs/plans/2026-04-25-bench-v2-implementation-plan.md`](./docs/plans/2026-04-25-bench-v2-implementation-plan.md)

## Branch policy

- `v2-dev`: active v2 work. All PRs land here or on `v2-dev/<task-slug>` branches merged back.
- `v1-bench`, tag `v1.0.0`: frozen v1 frontend. Read-only. Never rebase or force-push.
- `main`: held at the seed commit until v2 is merge-ready.
