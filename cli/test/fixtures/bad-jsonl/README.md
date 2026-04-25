# bad-jsonl fixture

Used by `cli/test/scanner/sessions.test.ts` to verify that the sessions reader
gracefully skips malformed JSONL lines.

`projects/p/session-001.jsonl` intentionally contains:
- Two valid JSON object lines
- Two invalid lines (`{not valid json` and `notavalidobject`)
- One blank line

Expected outcomes:
- `sessionsTotal === 1` (one .jsonl file found)
- `skippedLines > 0` (at least the two invalid lines are counted)
