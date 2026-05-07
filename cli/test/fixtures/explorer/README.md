# Explorer fixture

Expected tier: Explorer

This fixture mirrors a brand-new Claude Code user's `~/.claude/` directory
exactly two weeks into their journey. It deliberately sits below every
non-Explorer threshold so the rubric engine drops to the catch-all tier.

## Signal intent (per rubric.yaml v2 §5.4)

- `weeks_on_cc` — ~2 (oldest session is < 4 weeks old)
- `sessions_total` — 5 (well below the 20 needed to even reach Tinkerer)
- `skills_total` — 0 (no `skills/` directory)
- `hooks_configured` — 0
- `agents_configured` — 0
- `mcp_servers` — 0 (settings.json is `{}`)
- No `CLAUDE.md` at the fixture root

## Layout

```
explorer/
├── README.md
├── settings.json          # {}
└── projects/
    └── sample-project/
        ├── sess-01.jsonl … sess-05.jsonl   # 1–2 messages each
```

The aggregator (Task 1.10) should evaluate Explorer first by elimination —
`sessions_total < 20` short-circuits every higher tier.
