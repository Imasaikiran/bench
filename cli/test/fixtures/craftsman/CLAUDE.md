# Project guidelines

This document captures the conventions that make this codebase cohesive.
Read it at the start of every session and keep it open in a side panel.

## Mission

We are building a TypeScript monorepo that ships durable infrastructure
libraries. Stability and predictability matter more than novelty. When
in doubt, choose the boring option.

## Languages and runtimes

- Node.js 20.10 or later.
- TypeScript 5.5 in `strict` mode with `noUncheckedIndexedAccess`.
- `pnpm` 9 for package management; lockfile committed.

## Repository layout

- `apps/` — user-facing applications.
- `packages/` — shared libraries.
- `tools/` — internal scripts.
- `docs/` — long-form documentation.
- `bench/` — performance benchmarks.

Each package owns its own `README.md` with a one-paragraph purpose
statement, an install snippet, and a usage example.

## Plan first

Before coding, write a plan in plan mode (`Cmd+P`):

1. State the goal in one sentence.
2. List the files you expect to touch.
3. Describe the testing strategy.

If the plan exceeds 10 bullets, slice the work into smaller PRs.

## Testing

- Vitest for unit and integration tests.
- Playwright for end-to-end UI flows.
- One test file per module, co-located.
- Avoid network and disk side effects outside of `tmpdir()`.
- Snapshot tests are reserved for stable, small outputs.

`pnpm test` runs everything; `pnpm -C packages/<name> test` scopes to one
package. `pnpm test --watch` for the inner loop.

## Linting and formatting

ESLint + Prettier are enforced in CI. Imports are sorted alphabetically
within each group: `node:`, third-party, internal, relative. Disabling
a rule inline requires an inline justification comment.

## Git workflow

- Branch from `main`; PR back into `main`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`,
  `docs:`, `perf:`).
- Squash merges by default. Keep the squash subject under 72 chars.
- No force pushes to shared branches. `git push --force-with-lease` to
  your own branch only.
- One change per PR. Drive-by fixes go in their own PR.

## Code review

- One approval is the minimum.
- Reviewers focus on correctness, then API design, then style.
- Authors respond to every comment, even with a thumbs-up.
- A PR sitting open for more than three business days gets a poke.

## Style

- Prefer named exports; default exports only at app entry points.
- Pure functions; isolate I/O at the edges of the program.
- Composition over inheritance.
- Throw on programmer errors; return Result-shaped values for expected
  failures.
- Functions should fit in one screen — roughly 50 lines.
- Files should fit in two screens — roughly 250 lines.

## Comments

Comments explain *why*, not *what*. If a block needs a comment to
describe what it does, the block probably wants extracting into a
named function. JSDoc on every public function, optional on internals.

## Dependencies

- Pin direct dependencies to exact versions.
- Audit transitive dependencies before adding anything new.
- Prefer the standard library; reach for a dependency only when the
  cost of writing-and-maintaining-it ourselves exceeds the cost of
  taking it on.
- Renovate keeps dependencies fresh; treat its PRs as work, not noise.

## Performance

We optimize for clarity first. Reach for a profiler before reaching for
an optimization. Document any non-obvious hot path with a benchmark in
`bench/`. Add a regression test before tweaking the hot path.

## Security

- Never commit secrets; use `.env.example` and a real secret manager.
- Sanitize all user input at the system boundary.
- Subscribe to advisories for critical packages.
- Run `pnpm audit` weekly; treat moderate or higher as actionable.

## Logging

- Use the shared `logger` package; no direct `console.*` calls.
- Levels: `error`, `warn`, `info`, `debug`. Production default is `info`.
- Structured JSON in production, pretty text in development.
- Include a stable correlation ID on every request log.

## Error handling

- Cross-package errors subclass `BaseError` with a `.code` for pattern
  matching.
- Never swallow errors silently. If you intentionally ignore one, log
  a `debug` line explaining why.
- User-facing errors carry a stable string code that the UI can map to
  a human message.

## File and directory naming

- Filenames are `kebab-case`.
- Test files are `<module>.test.ts` next to the module.
- Type-only files are `<name>.types.ts`.
- Story files are `<component>.stories.tsx`.

## Documentation

- Every public function carries a JSDoc block describing purpose,
  parameters, returns, and thrown errors.
- Architecture decisions go in `docs/adr/NNNN-title.md`.
- API changes update `docs/api/` in the same PR.

## CI

GitHub Actions on every PR:

1. `pnpm install --frozen-lockfile`.
2. `pnpm typecheck`.
3. `pnpm lint`.
4. `pnpm test --coverage`.
5. `pnpm build`.
6. Bundle-size check.

A red step blocks merge.

## Releases

- Tags follow `vMAJOR.MINOR.PATCH`.
- Release notes are generated from Conventional Commits with
  `changesets`.
- Production deploys are automatic from `main` once CI is green.

## Skills

We maintain a small library of skills under `~/.claude/skills/`. Each
skill is one task done well. When a skill stops being used, archive it
rather than deleting it — you might want it back. Skills referenced in
this codebase live alongside this `CLAUDE.md`.

## When in doubt

- Ask in the design channel before opening a PR larger than ~200 lines.
- Open a discussion thread before a PR that touches more than three
  packages.
- Read the existing code; the patterns are usually already there.

## Working with Claude Code

- Read this file at the start of every session.
- Use plan mode for any change touching more than one file.
- Prefer reading more files than guessing — context is cheap, mistakes
  are expensive.
- When you change a convention here, update the relevant package
  README in the same commit.
- If a refactor is mid-flight, leave a brief note here so the next
  session knows where to pick up.

## Notes on this fixture

This file lives in a fixture directory used by the bench CLI test
suite. The contents are intentionally generic so that the file size
(~250 lines) and clean `##` heading structure match what a Craftsman-
tier user would have authored after a quarter or two on Claude Code.
