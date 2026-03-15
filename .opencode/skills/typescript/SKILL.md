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
- Require explicit return types for exported/public APIs; allow inference for local private functions when clear
- Prefer `unknown` over `any`; if `any` is used, it must be justified with a comment
- Use discriminated unions for Result types: `{ success: true; data: T } | { success: false; error: string }`
- Use type guard functions (`value is T`) for runtime type narrowing — not raw type assertions
- Leverage utility types: `Pick`, `Omit`, `Partial`, `Required`, `Readonly`, `Record` instead of redefining shapes
- Use `as const` assertions for literal tuples and object constants
- Optional chaining (`?.`) and nullish coalescing (`??`) over manual null checks
- Prefer union literals + `as const` over enums where practical; if enums are used, prefer string enums
- Custom error classes must extend `Error` and set `this.name`
- Never use `!` (non-null assertion) without an adjacent comment explaining why it's safe
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Naming Conventions
- `PascalCase` for interfaces/types/enums/classes
- `camelCase` for functions/variables
- `UPPER_SNAKE_CASE` for constants
- Use explicit suffixes where helpful (`Dto`, `Params`, `Result`)

## Common Pitfalls
- Leaking `any` into core domain types
- Using non-null assertions (`!`) without documented safety
- Treating external input as trusted without runtime guards
- Skipping explicit return types on public APIs

## Example Patterns
```ts
type Result<T> = { success: true; data: T } | { success: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseName(input: unknown): Result<string> {
  if (!isRecord(input) || typeof input.name !== "string") {
    return { success: false, error: "Invalid payload" }
  }
  return { success: true, data: input.name }
}
```

## Validation Commands
Prefer project scripts when present; use defaults below otherwise.

```bash
tsc --noEmit
eslint . --ext .ts,.tsx
npm test  # or project-configured test runner (e.g., vitest)
```
