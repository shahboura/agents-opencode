---
description: TypeScript strict mode with type safety and modern patterns
---

# TypeScript Instructions

## Skill-First Runtime
- For TypeScript implementation/review work, load the `typescript` skill on demand.
- Keep this instruction file concise; runtime behavior should prefer skills.

## Core Guardrails
- Prefer precise types over `any`; model unknown input boundaries explicitly.
- Keep `tsconfig` strictness enabled for production paths.
- Use discriminated unions and narrowing for branching business logic.
- Keep side effects isolated and favor pure transforms where practical.
- Avoid type assertions unless constraints are impossible to encode.

## Testing & Quality
- Keep type-check, lint, and tests green for all modified scopes.
- Add regression tests for bugs and edge-condition handling.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
tsc --noEmit
eslint . --ext .ts,.tsx
npm test  # or project-configured test runner (e.g., vitest)
```
