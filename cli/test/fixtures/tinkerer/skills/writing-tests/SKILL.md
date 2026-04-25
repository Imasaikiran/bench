---
name: writing-tests
description: Use when adding or updating Vitest unit tests
---

# Writing Tests

Co-locate `<module>.test.ts` next to the module. Avoid network and disk
side effects; use `tmpdir()` for fixtures. One assertion per behavior.
