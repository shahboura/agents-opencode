---
description: React / Next.js frontend best practices with TypeScript and accessibility
---

# React & Next.js Instructions

## Skill-First Runtime
- For React and Next.js tasks, load the `react-next` skill on demand.
- Treat this file as compact reference guidance; use the skill for detailed conventions.

## Core Guardrails
- Use function components and hooks exclusively; avoid legacy class components.
- Enable TypeScript strict mode with `noImplicitAny` and `strictNullChecks`.
- Use stable, unique keys for dynamic lists; never use array index as key.
- Wrap error-prone subtrees in error boundaries; surface user-friendly error messages.
- Prefer semantic HTML over divs; label interactive elements; ensure keyboard navigation.
- Keep styling consistent with a single approach (CSS modules, Tailwind, or tokens); avoid ad hoc patterns.

## Testing & Quality
- Use React Testing Library + Jest/Vitest; test behavior, not implementation details.
- Mock network calls; add smoke tests for critical flows and accessibility checks when feasible.
- Keep lint, build, and test checks green before delivery.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
npm ci
npm run lint
npm test
npm run build
```
