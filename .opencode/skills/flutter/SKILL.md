---
name: flutter
description: Flutter/Dart best practices with Riverpod, freezed, and feature-based architecture
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce feature-based project architecture with clean layer separation
- Guide state management with Riverpod and immutable models with freezed
- Apply error handling patterns and widget testing conventions

## When to use me
Use this when working on Flutter/Dart projects with Riverpod state management.

## Key Rules
- Use feature-based directory structure: `lib/core/`, `lib/features/<name>/{data,domain,presentation}/`, `lib/shared/`
- Use Riverpod (`StateNotifierProvider`, `ConsumerWidget`) for all state management — not setState or BLoC
- Use `freezed` with `@JsonKey` for ALL data models — never write mutable model classes by hand
- Error handling via sealed `Result<T>` class: `Success<T>` and `Error<T>` — never throw across layers
- Prefer `StatelessWidget` and `ConsumerWidget`; only use `StatefulWidget` when absolutely necessary
- Mark widgets and constructors `const` wherever possible — the analyzer will catch misses
- Use `go_router` for navigation with type-safe path parameters — not Navigator.push
- Use `ThemeExtension<T>` for custom theme properties — never hardcode colors or spacing
- Riverpod providers serve as dependency injection — no service locators or get_it needed
- Wrap async calls in try/catch at the repository layer; return `Result`, not raw exceptions
- Widget tests required for all UI components; use `ProviderScope` overrides for test isolation
- Use `super.key` in widget constructors (Dart 3+), not `Key? key` with `super(key: key)`

## Validation Commands
```bash
flutter analyze
flutter test
flutter test --coverage
dart format .
```
