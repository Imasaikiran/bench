# proj-a guidelines

This project follows the global `CLAUDE.md` defaults. The notes below
are deltas specific to proj-a.

## Mission

proj-a is a queue library. Stability and predictability matter more
than novelty.

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
the package.

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

## proj-a specifics

- The wire format is documented in `docs/wire-format.md`.
- Backwards compatibility is non-negotiable; deprecate over two minor
  releases before removing.
- Run the soak test (`pnpm test:soak`) before any release.
