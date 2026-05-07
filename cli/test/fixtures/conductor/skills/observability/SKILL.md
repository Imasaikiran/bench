---
name: observability
description: Use when adding metrics, traces, or structured logs
---

# Observability

Every public endpoint emits a span and a counter. Use the shared
`logger` package and the standard correlation ID. No `console.*`.
