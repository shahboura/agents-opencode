---
description: Flutter/Dart best practices for architecture, state, and testing
---

# Flutter Instructions

## Skill-First Runtime
- For Flutter and Dart tasks, load the `flutter` skill on demand.
- Treat this file as compact reference guidance; use the skill for detailed conventions.

## Core Guardrails
- Keep presentation and business logic separated by feature boundaries.
- Prefer immutable models and predictable state transitions.
- Avoid deep widget trees with mixed responsibilities.
- Keep async flows cancellation-safe and error-aware.
- Ensure responsive layouts across small and large form factors.

## Testing & Quality
- Cover widget behavior and domain logic with focused tests.
- Verify loading, empty, success, and error states.
- Keep analyzer/lint/test checks green before delivery.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
flutter analyze
flutter test
flutter test --coverage
dart format --set-exit-if-changed .
```
