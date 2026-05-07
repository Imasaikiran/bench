# proj-b guidelines

This project follows the global `CLAUDE.md` defaults. The notes below
are deltas specific to proj-b.

## Mission

proj-b is a metrics ingestion service. Throughput and observability
matter more than novelty.

## Languages and runtimes

- Node.js 20.10+, TypeScript 5.5 strict.
- pnpm 9 with a committed lockfile.

## Plan first

Plan mode for any change touching more than one file. Plans list goal,
files, tests.

## Hooks

The global hooks (`pre-tool-use.sh`, `post-tool-use.sh`, `stop.sh`) all
fire here. No project-specific hooks.

## Sub-agents

`code-reviewer` runs on every feature branch. `release-driver` ships
the service. `triage-bot` sorts incoming bug reports.

## Skills referenced

- `using-git`, `writing-tests`, `running-builds`, `debugging-async`,
  `plan-first`, `refactor-safely`, `api-design`, `deploy-safely`,
  `observability`, `docs-driven`.

## Style

Same as the global file: named exports, pure functions, composition
over inheritance, functions ≤ 50 lines, files ≤ 250 lines.

## Testing

Vitest. One test file per module, co-located. `pnpm test` runs the
suite.

## Git workflow

Conventional Commits, squash merges, no force pushes to shared
branches.

## Releases

`vMAJOR.MINOR.PATCH` tags via `release-driver`.

## proj-b specifics

- Every endpoint emits a span and a counter (`observability` skill).
- p99 latency budget is 200ms; CI fails if the load test regresses.
- Roll forward — never roll back a metrics deploy; ship a hotfix.
