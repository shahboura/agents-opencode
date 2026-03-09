---
name: typescript
description: TypeScript strict mode with type safety and modern patterns
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce strict TypeScript compiler options and null safety
- Guide proper use of generics, utility types, and type narrowing
- Apply naming conventions and error handling patterns

## When to use me
Use this when working on TypeScript projects that require strict type safety.

## Key Rules
- Enable `strict: true` in tsconfig.json — this is non-negotiable
- Also enable `noUncheckedIndexedAccess`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`
- ALWAYS use explicit return types on functions — never rely on inference for public APIs
- Prefer `unknown` over `any`; if `any` is used, it must be justified with a comment
- Use discriminated unions for Result types: `{ success: true; data: T } | { success: false; error: string }`
- Use type guard functions (`value is T`) for runtime type narrowing — not raw type assertions
- Leverage utility types: `Pick`, `Omit`, `Partial`, `Required`, `Readonly`, `Record` instead of redefining shapes
- Use `as const` assertions for literal tuples and object constants
- Optional chaining (`?.`) and nullish coalescing (`??`) over manual null checks
- Naming: `PascalCase` for interfaces/types/enums, `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants
- Enum values should be string-valued (`Role = 'ADMIN'`), not numeric
- Custom error classes must extend `Error` and set `this.name`
- Never use `!` (non-null assertion) without an adjacent comment explaining why it's safe
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Validation Commands
```bash
tsc --noEmit
eslint . --ext .ts,.tsx
vitest run
```
