# Project guidelines

This file captures conventions Claude Code should respect when working in
this repository. It is intentionally written in plain English so that
both humans and the agent stay aligned.

## Languages and runtimes

We target Node.js 20.10+ across every package in this monorepo. TypeScript
is the default for new code; existing JavaScript may stay JavaScript until
a feature touches it.

Use `pnpm` for package management. `npm` and `yarn` lockfiles must not be
committed.

## Repository layout

- `apps/` — user-facing applications
- `packages/` — shared libraries
- `tools/` — scripts and one-off utilities
- `docs/` — long-form documentation

Each package has a `README.md` describing its purpose in one paragraph.

## Testing

- Every new module ships with a Vitest test file alongside it.
- Unit tests should not touch the network or the filesystem outside of
  `tmpdir()`.
- Snapshot tests are discouraged unless the snapshot is small and stable.

Run the full suite with `pnpm test`. Run a single package's suite with
`pnpm -C packages/<name> test`.

## Linting and formatting

- ESLint is the source of truth for lint failures.
- Prettier formats on save; do not hand-format.
- Imports are sorted alphabetically within their group.

If a lint rule conflicts with reality, propose a config change in a
follow-up PR rather than disabling it inline.

## Git workflow

- Branch from `main`.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Squash-merge by default; keep the squash message tidy.
- No force-pushes to shared branches.

When in doubt, prefer many small commits over one large one — they are
easier to review and to revert.

## Code review

- At least one approval is required to merge.
- Reviewers should leave at least one substantive comment, even if it is
  just praise.
- Authors respond to every comment, even with a thumbs up.

## Style

- Prefer named exports.
- Prefer pure functions; isolate I/O at the edges.
- Prefer composition over inheritance.
- Throw on programmer errors; return Result-shaped values for expected
  failures.
- Keep functions under ~50 lines unless there is a strong reason.

## Comments

Comments explain *why*, not *what*. If a block needs a comment to
describe what it does, the block probably wants extracting into a
named function instead.

## Dependencies

- Pin direct dependencies to exact versions in `package.json`.
- Prefer the standard library over a new dependency.
- Audit transitive dependencies before adding anything new.

## Performance

We optimize for clarity first and performance second. Reach for a
profiler before reaching for an optimization. Document any non-obvious
hot path with a benchmark in `bench/`.

## Security

- Never commit secrets. Use the `.env.example` pattern instead.
- Sanitize all user input at the boundary of the system.
- Keep dependencies up to date; subscribe to advisories for critical
  packages.

## Logging

- Use the shared `logger` package; do not call `console.*` directly.
- Log levels: `error`, `warn`, `info`, `debug`. `info` is the default
  in production.
- Log structured JSON in production, pretty text in development.

## Error handling

- Errors thrown across package boundaries should subclass the shared
  `BaseError` so that callers can pattern-match on `.code`.
- Never swallow errors silently. If you catch an error and intentionally
  ignore it, log a `debug` line explaining why.

## File and directory naming

- Filenames are `kebab-case`.
- Test files are `<module>.test.ts` next to the module.
- Type-only files are `<name>.types.ts`.

## Documentation

Each public function carries a JSDoc block describing its purpose,
parameters, return type, and any thrown errors. Internal helpers can
skip the block if their name and signature already make them obvious.

## CI

GitHub Actions runs:

1. Install with `pnpm install --frozen-lockfile`.
2. `pnpm typecheck`.
3. `pnpm lint`.
4. `pnpm test --coverage`.
5. `pnpm build`.

A failing step blocks the merge.

## Releases

- Releases are tagged with `vMAJOR.MINOR.PATCH`.
- The release notes are generated from Conventional Commits.
- Production deploys happen automatically from `main` once CI is green.

## When in doubt

Ask. Open a discussion thread before opening a PR if the change is
larger than ~200 lines or touches more than three packages. Small,
focused changes are always better than big ones.

## Working with Claude Code

- Read this file at the start of every session.
- When you change a convention here, also update the relevant package
  README.
- Prefer reading more files than guessing — context is cheap, mistakes
  are expensive.
- If a refactor is in flight, leave a brief note here so the next
  session knows.

## Notes on this fixture

This file exists in a fixture directory used by the bench CLI test
suite. The contents are intentionally generic so that the file size
(~180 lines) and structure (clear `##` headings) match what a Tinkerer-
tier user would have authored after a few months on Claude Code.
