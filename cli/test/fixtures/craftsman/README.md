# Craftsman fixture

Expected tier: Craftsman

This fixture mirrors a Claude Code user who has internalised the
"plan-first" habit and curates their skill library. They have not yet
adopted hooks or sub-agents, which is what keeps them below Operator.

## Signal intent (per rubric.yaml v2 §5.4)

- `weeks_on_cc` ≥ 12 — oldest checked-in session is 2026-01-04 (~16 weeks before today 2026-04-25)
- `sessions_total` ≥ 20 — README documents intended count; only 6 representative sessions are checked in (downstream tests pad)
- `skills_total` ≥ 3 — 8 SKILL.md authored
- `skills_unused_ratio` ≤ 0.15 — 7 of 8 skills are referenced; only `unused-legacy` is cold (1/8 = 0.125)
- `plan_mode_ratio` ≥ 0.25 — 2 of the 6 sample sessions emit `plan_mode_enter` (33%)
- `coherence_score` ≥ 0.6 — sessions follow plan → tool_use → result patterns; CLAUDE.md is well-structured
- No hooks, no agents → blocks the Operator promotion
- 1 MCP server (`filesystem`)
- `CLAUDE.md` is ~250 lines with clear `##` headings (under the >300 penalty bound)

Expected score band: ~75.

## Layout

```
craftsman/
├── README.md
├── CLAUDE.md
├── settings.json                 # 8 permissions, 1 MCP server
├── skills/                       # 8 SKILL.md (7 used, 1 cold)
└── projects/sample-project/
    └── sess-01.jsonl … sess-06.jsonl
```

## Generator note

Real Craftsman accounts run hundreds of sessions across 12+ weeks; we
ship 6 to represent the intended distribution and rely on Task 1.7+
scanner tests to pad the volume.
