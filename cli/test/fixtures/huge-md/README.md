# huge-md fixture

This fixture contains a `CLAUDE.md` file that exceeds the 100 KB threshold
used by the config scanner. It is used to test that `readConfigSurface` truncates
oversized files and sets `claudeMd.truncated = true` rather than loading the
entire file into memory.

The file is ~130 KB of synthetic markdown content and contains no real data.

It is NOT a tier fixture; it is used only by `cli/test/scanner/config.test.ts`.
