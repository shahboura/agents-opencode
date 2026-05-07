---
description: Node.js + Express best practices for services and APIs
---

# Node.js + Express Instructions

## Skill-First Runtime
- For Node.js and Express tasks, load the `node-express` skill on demand.
- Treat this file as compact reference guidance; use the skill for detailed conventions.

## Core Guardrails
- Use async/await exclusively; wrap async handlers to propagate errors to error middleware.
- Validate all input at the edge with a schema library (Joi, Zod) and reject early.
- Enable security middleware: helmet, CORS with explicit origins, rate limiting on sensitive routes.
- Centralize configuration via environment variables; never commit secrets.
- Use structured logging (pino/winston) with request IDs; avoid `console.log`.
- Keep layers separated: routes → controllers → services → data access.

## Testing & Quality
- Use Jest/Vitest/Mocha with isolated side effects; mock external services.
- Include coverage when feasible; avoid real network calls in unit tests.
- Keep lint, build, and test checks green before delivery.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
npm ci
npm run lint
npm test
npm run build || tsc --noEmit
```
