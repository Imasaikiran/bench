# Global guidelines

This is the user-level `CLAUDE.md` — conventions that apply to every
project. Project-level `CLAUDE.md` files override or extend these.

## Mission

Run Claude Code as a real collaborator across every active project.
Consistent hygiene beats clever one-offs. Hooks observe; sub-agents
specialize; skills compose.

## Languages and runtimes

- Node.js 20.10+.
- TypeScript 5.5 in strict mode.
- pnpm 9 with a committed lockfile.

## Plan first

Plan mode for any change touching more than one file. Plans list the
goal, files, and tests. Sub-agents read the plan before executing.

## Hooks

Three hooks fire on every project:

- `pre-tool-use.sh` — logs the invocation.
- `post-tool-use.sh` — logs the exit status.
- `stop.sh` — flushes the buffer and emits a session summary.

Hooks must exit 0 unless they want to halt the agent.

## Sub-agents

Four sub-agents handle recurring work:

- `code-reviewer` — runs at the end of every feature branch.
- `release-driver` — drives a release end-to-end.
- `triage-bot` — sorts incoming issues into buckets.
- `doc-keeper` — keeps docs in sync with code.

## Slash commands

`/ship-it` — hands off to `release-driver`.

## Skills

Skills are small and single-purpose. Aggressively retire skills that
have not fired in 30 days. The active set lives in `~/.claude/skills/`.

## Testing

- Vitest for unit; Playwright for end-to-end.
- One test file per module, co-located.
- No real network or disk outside `tmpdir()`.

## Linting and formatting

ESLint + Prettier are enforced in CI. Imports sorted alphabetically.

## Git workflow

- Branch from `main`.
- Conventional Commits.
- Squash merges, message under 72 chars.
- No force pushes to shared branches.

## Code review

Two approvals on shared infra; one elsewhere. Authors respond to every
comment.

## Style

- Named exports.
- Pure functions; isolate I/O at the edges.
- Composition over inheritance.
- Throw on programmer errors; Result-shaped values for expected
  failures.
- Functions ≤ 50 lines; files ≤ 250 lines.

## Comments

Explain *why*, not *what*.

## Dependencies

Pin direct dependencies. Audit transitive ones. Renovate keeps things
fresh.

## Performance

Optimize for clarity first. Profile before optimizing. Document hot
paths with a benchmark in `bench/`.

## Security

- Never commit secrets.
- Sanitize user input at the boundary.
- Subscribe to advisories.

## Logging

- Shared `logger` package only.
- Structured JSON in production.
- Stable correlation ID per request.

## Error handling

- Cross-package errors subclass `BaseError` with a `.code`.
- Never swallow silently.

## File and directory naming

- `kebab-case` filenames.
- `<module>.test.ts` next to the module.
- `<name>.types.ts` for type-only files.

## Documentation

- JSDoc on every public function.
- ADRs in `docs/adr/NNNN-title.md`.
- Per-project `CLAUDE.md` describes the project's deviations.

## CI

GitHub Actions: install, typecheck, lint, test, build, bundle-size,
deploy-preview. A red step blocks merge.

## Releases

- `vMAJOR.MINOR.PATCH` tags.
- `release-driver` sub-agent runs the flow.

## Cross-project consistency

When a convention works in one project, port it to the others within
the same week. The `doc-keeper` sub-agent reminds you when a project's
`CLAUDE.md` drifts from this global file.

## Working with Claude Code

- Read this file at session start, then read the project's
  `CLAUDE.md`.
- Plan mode for multi-file changes.
- Prefer reading files over guessing.
- Keep this file under 250 lines.

## Notes on this fixture

This file is the user-level `CLAUDE.md` for the Conductor fixture used
by the bench CLI test suite. It's kept under 250 lines and uses clean
`##` heading structure. The two project-level `CLAUDE.md` files in
`projects/proj-a/` and `projects/proj-b/` mirror the same vocabulary
to model `cross_project_consistency_score`.
