# Conductor fixture

Expected tier: Conductor

This fixture mirrors a Claude Code power-user who runs the agent across
multiple projects with consistent hygiene: per-project `CLAUDE.md`
files, a curated skill library, hooks on every event, and a roster of
sub-agents.

## Signal intent (per rubric.yaml v2 §5.4)

Builds on every Operator condition, plus:

- `cross_project_consistency_score` ≥ 0.7 — same conventions appear in
  both `projects/proj-a/CLAUDE.md` and `projects/proj-b/CLAUDE.md`
- `skills_total` ≥ 5 — 12 SKILL.md authored
- `skills_unused_ratio` ≤ 0.1 — 11 of 12 skills are referenced
  (`unused-archive` is cold), giving 1/12 ≈ 0.083
- `sub_dir_claude_md_count` ≥ 2 — `projects/proj-a/CLAUDE.md` and
  `projects/proj-b/CLAUDE.md` are present at the fixture root
- `commit_burst_correlation` ≥ 0.4 — README claims this; sample
  sessions encode bursty commit patterns; downstream tests pad
- `weeks_on_cc` ≥ 16 — oldest checked-in session is 2025-12-01 (~21 weeks before today 2026-04-25)
- `agents_configured` ≥ 2 — `agents/` ships 4 sub-agent files
- `hooks_configured` ≥ 3 — same 3-hook setup as Operator
- `mcp_servers` = 2 (`filesystem`, `sqlite`)

Expected score band: ~92.

## Layout

```
conductor/
├── README.md
├── CLAUDE.md                    # ~200 lines, well-structured
├── settings.json                # operator settings + same hooks
├── hooks/                       # 3 chmod +x scripts
├── agents/                      # 4 sub-agent files
├── commands/                    # 1 example slash command
├── skills/                      # 12 SKILL.md (11 used, 1 cold)
└── projects/
    ├── proj-a/
    │   ├── CLAUDE.md            # project-specific guidelines
    │   └── sess-01.jsonl … sess-04.jsonl
    └── proj-b/
        ├── CLAUDE.md            # project-specific guidelines
        └── sess-01.jsonl … sess-03.jsonl
```

## Generator note

Real Conductor accounts run thousands of sessions across many projects
with tens of thousands of automation events. We ship 7 representative
sessions (4 in proj-a, 3 in proj-b) and rely on Task 1.7+ scanner
tests to pad volume signals. The cross-project consistency signal is
encoded literally in the two project `CLAUDE.md` files.
