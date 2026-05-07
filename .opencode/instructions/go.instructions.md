---
description: Go best practices for modules, testing, and concurrency
---

# Go Instructions

## Skill-First Runtime
- For Go tasks, load the `go` skill on demand.
- Treat this file as compact reference guidance; use the skill for detailed conventions.

## Core Guardrails
- Pass `context.Context` through all I/O and long-running operations; honor cancellation.
- Return errors, not panics, for expected failures; wrap with `%w` for caller inspection.
- Prevent goroutine leaks: cancel contexts, close channels, and bound concurrency for external calls.
- Define interfaces on the consumer side; keep them narrow and purposeful.
- Defer resource cleanup (`defer f.Close()`); handle errors explicitly, never silently.
- Guard shared state with channels or sync primitives; avoid data races.

## Testing & Quality
- Use `go test ./...` with table-driven tests; cover success and error paths.
- Run `go test -race ./...` for concurrency-heavy code; keep fixtures minimal.
- Keep vet, lint, and test checks green before delivery.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
go mod tidy
go vet ./...
golangci-lint run || true  # if available
go test ./...
```
