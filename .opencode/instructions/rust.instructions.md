---
description: Rust best practices with ownership, error handling, and performance
---

# Rust Instructions

## Skill-First Runtime
- For Rust implementation/review tasks, load the `rust` skill on demand.
- Keep this file concise; rely on skill guidance for detailed ownership and API patterns.

## Core Guardrails
- Model ownership/borrowing explicitly; avoid unnecessary cloning.
- Prefer `Result`/`Option`-driven error handling over panics in normal flows.
- Keep public APIs ergonomic and strongly typed.
- Use iterator/style patterns for clarity and allocation-aware behavior.
- Prefer safe abstractions and document `unsafe` blocks when unavoidable.

## Testing & Quality
- Cover success, error, and boundary cases.
- Keep formatting, lint, compile, and tests green.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo check
cargo test
```
