---
name: rust
description: Rust best practices with ownership, error handling, and performance
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce ownership, borrowing, and lifetime rules for memory safety
- Apply idiomatic error handling with Result/Option patterns
- Guide performance optimization, testing, and async patterns

## When to use me
Use this when building or maintaining Rust projects.

## Key Rules
- Respect ownership/borrowing/lifetimes — Rust has no garbage collector; every value has a single owner
- Use `Result<T, E>` for recoverable errors and `Option<T>` for nullable values — never panic for expected failures
- Never use `unwrap()` in production code — use `?` operator for error propagation, `unwrap_or_default()`, or explicit match
- Wrap errors with context via `map_err`, `anyhow::Context`, or `thiserror` crates
- Derive standard traits on structs: `Debug`, `Clone`, `PartialEq`, `Eq`, `Hash` as appropriate
- Use traits for polymorphism; keep trait bounds narrow — define interfaces on consumers, not providers
- Use builder pattern for structs with many optional fields
- Prefer iterators (`.filter()`, `.map()`, `.collect()`) over manual loops
- If using Tokio, cancel tasks, close channels, and avoid spawned task leaks
- Run `cargo clippy -- -D warnings` before every commit — treat all warnings as errors
- Tune release profile (`lto`, `codegen-units`, panic strategy) based on profiling and operational requirements
- Use `#[cfg(test)]` modules for unit tests; if using Tokio, use `tokio::test` for async tests
- Document public APIs with `///` rustdoc comments including `# Examples` sections
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Naming Conventions
- `snake_case` for functions/modules/variables
- `PascalCase` for structs/enums/traits
- `SCREAMING_SNAKE_CASE` for constants/statics
- Error types should be explicit and domain-oriented (`OrderError`, `AuthError`)

## Common Pitfalls
- Hidden clones that bypass ownership intent
- `unwrap()` in production paths
- Public APIs exposing implementation-heavy types unnecessarily
- Async tasks spawned without cancellation/cleanup strategy

## Example Patterns
```rust
#[derive(Debug)]
pub enum AppError {
    NotFound,
    Validation(String),
}

pub fn parse_id(input: &str) -> Result<u64, AppError> {
    input.parse::<u64>().map_err(|_| AppError::Validation("invalid id".into()))
}
```

## Validation Commands
Prefer project scripts when present; use defaults below otherwise.

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo check
cargo test
```
