# Operator fixture

Expected tier: Operator

This fixture mirrors a Claude Code user who runs Claude as an automated
collaborator: hooks fire on every tool use, sub-agents handle dedicated
roles, and skills are pruned to a tight active set.

## Signal intent (per rubric.yaml v2 §5.4)

- `weeks_on_cc` ≥ 16 — oldest checked-in session is 2025-12-07 (~20 weeks before today 2026-04-25)
- `sessions_total` ≥ 20 — README documents intended count; only 6 sample sessions are checked in
- `agents_configured` ≥ 2 — `agents/` ships 2 sub-agent files with valid frontmatter
- `hooks_configured` ≥ 3 — `hooks/` ships 3 executable shell scripts (`pre-tool-use.sh`, `post-tool-use.sh`, `stop.sh`), all wired in `settings.json`
- `automation_events` ≥ 300 — README claims this; the sample sessions encode rich tool_use sequences but the literal count is exercised in scanner tests
- `coherence_score` ≥ 0.75 — sessions follow plan → tool → result patterns; CLAUDE.md is well-structured and ~200 lines
- `skills_total` ≥ 2 — 10 SKILL.md authored
- `skills_unused_ratio` ≈ 0.10 — 9 of 10 skills are referenced (`unused-old` is cold)
- `mcp_servers` = 2 (`filesystem`, `sqlite`)
- `commands/` ships an example slash command for documentation

Expected score band: ~85.

## Layout

```
operator/
├── README.md
├── CLAUDE.md
├── settings.json                # 12 permissions, hooks block, 2 MCP servers
├── hooks/
│   ├── pre-tool-use.sh          (chmod +x)
│   ├── post-tool-use.sh         (chmod +x)
│   └── stop.sh                  (chmod +x)
├── agents/
│   ├── code-reviewer.md
│   └── release-driver.md
├── commands/
│   └── ship-it.md
├── skills/                      # 10 SKILL.md (9 used, 1 cold)
└── projects/sample-project/
    └── sess-01.jsonl … sess-06.jsonl
```

## Generator note

Real Operator accounts run hundreds of sessions and tens of thousands
of automation events per quarter. We ship 6 representative sessions and
rely on Task 1.7+ scanner tests to pad the literal automation_events
count above 300.
