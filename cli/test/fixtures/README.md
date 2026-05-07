# Tier fixtures

Hand-authored minimal `.claude/` shapes for each of the five tiers in
rubric.yaml §5.4. Used by `cli/test/fixtures.test.ts` (presence) and by
later scanner tasks (1.5–1.10) to exercise readers and aggregators.

## Tier directories

| Dir          | Expected tier | Notes                                                    |
|--------------|---------------|----------------------------------------------------------|
| `explorer/`  | Explorer      | No CLAUDE.md / skills / hooks / agents.                  |
| `tinkerer/`  | Tinkerer      | CLAUDE.md + a few skills + 1 MCP. No hooks / agents.     |
| `craftsman/` | Craftsman     | Larger CLAUDE.md, more active skills, plan-mode markers. |
| `operator/`  | Operator      | Adds `hooks/` (executable), `agents/`, `commands/`.      |
| `conductor/` | Conductor     | Multi-project sub-CLAUDE.md, more agents, richer MCP.    |

## Naming conventions

- Skills named `unused-old`, `unused-legacy`, `unused-archive` are
  intentional probes for the `skills_unused_ratio` signal — scanner code
  should treat them as cold/inactive.
- Hook scripts carry the `+x` bit in git (`100755`) so checkout on a
  fresh machine preserves executability.

## What these fixtures DO NOT yet enforce

Session JSONL volumes are token (5–10 sessions per tier) rather than
the literal §5.4 counts (e.g., 300+ for Operator). The Task 1.4 test
only asserts presence + the `Expected tier: <Tier>` line in each
sub-README. Signal-accurate volumes will be synthesized programmatically
when the aggregator lands in Task 1.10.
