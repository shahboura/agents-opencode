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
- Async/await with tokio — cancel tasks, close channels, avoid spawned task leaks
- Run `cargo clippy -- -D warnings` before every commit — treat all warnings as errors
- Release profile: enable LTO, set `codegen-units = 1`, `panic = "abort"` for production binaries
- Use `#[cfg(test)]` module for unit tests; `tokio::test` for async tests
- Document public APIs with `///` rustdoc comments including `# Examples` sections
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Validation Commands
```bash
cargo check
cargo test
cargo clippy
cargo fmt
```
