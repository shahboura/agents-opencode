---
name: go
description: Go best practices for modules, error handling, concurrency, and testing
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce Go module conventions and error handling patterns
- Guide concurrency safety with contexts, channels, and sync primitives
- Apply testing standards with table-driven tests and race detection

## When to use me
Use this when working on Go projects using Go modules.

## Key Rules
- Go modules required: `go.mod` and `go.sum` must be committed; run `go mod tidy` before committing
- ALWAYS pass `context.Context` as the first parameter through I/O and long-running operations
- Return `error` — never `panic` for expected failures; wrap errors with `fmt.Errorf("doing X: %w", err)`
- Use `defer` for all cleanup (file close, mutex unlock, connection release)
- Define interfaces on the consumer side, not the provider; keep interfaces narrow (1-3 methods)
- Guard shared state with channels or `sync.Mutex` — never rely on implicit ordering
- Bound concurrency for external calls using worker pools or `semaphore.Weighted`
- Cancel contexts and close channels to prevent goroutine leaks
- Use table-driven tests with `t.Run` subtests; cover error paths explicitly
- Use `httptest.Server` or fakes — never hit real networks in unit tests
- Prefer `go test -race ./...` for concurrency-heavy code
- Use structured logging (slog/zerolog) with correlation IDs — not `fmt.Println` or `log.Println`
- Format with `gofmt`; lint with `go vet` and `golangci-lint`
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Validation Commands
```bash
go mod tidy
go vet ./...
golangci-lint run || true
go test ./...
```
