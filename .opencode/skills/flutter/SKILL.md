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
- Prefer Riverpod (`StateNotifierProvider`, `ConsumerWidget`) for app/shared state; use `setState` for simple local UI state
- Prefer immutable data models (for example `freezed`) for domain/network DTOs; avoid mutable models unless justified
- Error handling via sealed `Result<T>` class: `Success<T>` and `Error<T>` — never throw across layers
- Prefer `StatelessWidget` and `ConsumerWidget`; only use `StatefulWidget` when absolutely necessary
- Mark widgets and constructors `const` wherever possible — the analyzer will catch misses
- Prefer `go_router` for app-scale declarative routing; `Navigator` APIs are fine for simple/local flows
- Use `ThemeExtension<T>` for custom theme properties — never hardcode colors or spacing
- Riverpod providers serve as dependency injection — no service locators or get_it needed
- Wrap async calls in try/catch at the repository layer; return `Result`, not raw exceptions
- Require widget tests for critical UI behavior; use risk-based coverage across unit/widget/integration tests
- Use `super.key` in widget constructors (Dart 3+), not `Key? key` with `super(key: key)`
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Naming Conventions
- `PascalCase` for classes/widgets
- `camelCase` for methods/variables
- `snake_case.dart` for file names
- Name providers by domain intent (`userProfileProvider`, `checkoutNotifierProvider`)

## Common Pitfalls
- Business logic embedded directly in widgets
- Mutable model classes instead of immutable data contracts
- Async exceptions crossing layers without normalization to `Result`
- Hardcoded spacing/colors that bypass theme and break responsive consistency

## Example Patterns
```dart
final userProvider = FutureProvider<Result<User>>((ref) async {
  try {
    final user = await ref.read(apiClientProvider).getUser();
    return Result.success(user);
  } catch (e) {
    return Result.error('Failed to load user: $e');
  }
});

// Result<T> is an app-defined sealed type used for cross-layer error handling.
```

## Validation Commands
Prefer project scripts when present; use defaults below otherwise.

```bash
flutter analyze
flutter test
flutter test --coverage
dart format --set-exit-if-changed .
```
