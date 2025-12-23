---
description: Go best practices for modules, testing, and concurrency
applyTo: '**/*.go'
---

# Go Instructions

## Tooling & Modules
- Require Go modules; keep `go.mod` and `go.sum` committed.
- Enforce formatting with `gofmt` (or gofmt via `go fmt ./...`).
- Lint with `go vet` plus a linter suite (e.g., `golangci-lint`).

## Code Standards
- Pass `context.Context` through I/O and long-running operations; avoid ignoring cancellations.
- Return errors, not panics, for expected failure; wrap with context (`fmt.Errorf("...: %w", err)`).
- Keep functions small and cohesive; avoid overusing global state.
- Prefer interfaces on consumers, not providers; keep interfaces narrow.

## Concurrency
- Avoid goroutine leaks; cancel contexts, close channels when done.
- Guard shared state with channels or sync primitives; avoid data races.
- Bound concurrency (worker pools, semaphores) for external calls.

## I/O & Errors
- Close resources (`defer f.Close()`); handle errors explicitly.
- Validate inputs; avoid silent failure.

## Testing
- Use `go test ./...` with table-driven tests; cover error paths.
- Use golden files sparingly; keep fixtures minimal.
- Avoid hitting real networks in unit tests; use httptest/fakes.

## Performance & Observability
- Measure before optimizing; use pprof/benchmarks when needed.
- Log with structure; include correlation IDs when available.

## Validation Commands
```bash
go mod tidy
go vet ./...
golangci-lint run || true  # if available
go test ./...
```
