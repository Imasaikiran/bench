## Summary

<!-- One-line summary at the top. For multi-item PRs, use a table:
| Item | Where | Diff |
|------|-------|------|
| ... | ... | ... |
-->

## Test plan

- [ ] `pnpm -C web typecheck` clean
- [ ] `pnpm -C cli typecheck` clean
- [ ] `pnpm -C web test` passing
- [ ] `pnpm -C cli test` passing
- [ ] `pnpm -C web build` clean
- [ ] `pnpm -C cli build` clean

<!-- Add any visual-regression / a11y / specific verification steps. -->

## Style check (per docs/STYLE.md)

- [ ] No marketing verbs ("excited", "thrilled", "stoked", "delighted")
- [ ] No "we"-speak (this is a one-developer project)
- [ ] Em-dash density ≤ 1 per 20 lines in any new doc
- [ ] No filler adjectives ("comprehensive", "robust", "nuanced", "seamless")
- [ ] No "highest-leverage" / "load-bearing" as filler — names the thing leveraged
