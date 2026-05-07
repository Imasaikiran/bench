---
name: running-builds
description: Use when invoking the project build pipeline
---

# Running Builds

`pnpm build` from the repo root. Inspect `dist/`. Build failures usually
hide a typecheck regression — run `pnpm typecheck` first.
