# Tinkerer fixture

Expected tier: Tinkerer

This fixture mirrors a Claude Code user who has crossed past the
"first month" Explorer hump and is starting to lean on skills, but who
still has dead skills lying around and no automation in place.

## Signal intent (per rubric.yaml v2 §5.4)

- `weeks_on_cc` ≥ 4 — oldest checked-in session is from 2026-01-18 (~14 weeks before today 2026-04-25)
- `sessions_total` ≥ 20 — README documents the intended count (100 over 14 weeks). Only 5 representative sessions are checked in to keep the repo small; downstream scanner tests will pad.
- `skills_total` ≥ 2 — 6 SKILL.md authored
- `skills_unused_ratio` > 0.1 — 4 of 6 skills are referenced in the sample sessions, 2 are intentionally cold (`using-fixtures` and `unused-old-skill`), giving a 2/6 ≈ 0.33 unused ratio
- `hooks_configured` = 0
- `agents_configured` = 0
- `mcp_servers` = 1 (`filesystem`)
- `CLAUDE.md` is ~180 lines (well under the >300 penalty bound)

Expected score band: ~62.

## Layout

```
tinkerer/
├── README.md
├── CLAUDE.md
├── settings.json
├── skills/
│   ├── using-git/SKILL.md           ← referenced
│   ├── writing-tests/SKILL.md       ← referenced
│   ├── running-builds/SKILL.md      ← referenced
│   ├── debugging-async/SKILL.md     ← referenced
│   ├── using-fixtures/SKILL.md      ← cold
│   └── unused-old-skill/SKILL.md    ← cold
└── projects/sample-project/
    └── sess-01.jsonl … sess-05.jsonl
```

## Generator note

The Tinkerer threshold needs ≥20 sessions; we ship 5. Tasks 1.7+ aggregator
tests will programmatically synthesize additional session JSONLs around
this skeleton (timestamps spaced across the 14-week window, alternating
references to the 4 active skills) to prove the rubric output matches
the intended tier.
