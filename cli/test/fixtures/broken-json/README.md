# broken-json fixture

This fixture contains an intentionally malformed `settings.json` (invalid JSON)
used to test that the config scanner handles parse errors gracefully — recording
a `parseWarning` and returning `{}` for settings instead of throwing.

It is NOT a tier fixture; it is used only by `cli/test/scanner/config.test.ts`.
