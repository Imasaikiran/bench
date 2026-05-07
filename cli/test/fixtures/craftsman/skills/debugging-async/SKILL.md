---
name: debugging-async
description: Use when tracking down promise leaks or unhandled rejections
---

# Debugging Async

Check for missing `await`s first. Run with
`--unhandled-rejections=strict` to surface silent failures.
