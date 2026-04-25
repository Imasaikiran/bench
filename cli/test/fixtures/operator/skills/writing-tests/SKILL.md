---
name: writing-tests
description: Use when adding or updating Vitest unit tests
---

# Writing Tests

Co-locate `<module>.test.ts`. One assertion per behavior. Hermetic:
no real network or disk outside `tmpdir()`.
