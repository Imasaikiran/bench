---
name: running-builds
description: Use when invoking the project build pipeline
---

# Running Builds

`pnpm build` from the repo root. Inspect `dist/` for the artifact.
Build failures usually point to a typecheck regression — run
`pnpm typecheck` first.
