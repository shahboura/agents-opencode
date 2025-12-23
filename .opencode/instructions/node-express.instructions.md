---
description: Node.js + Express best practices for services and APIs
applyTo: '**/*.{js,ts}'
---

# Node.js + Express Instructions

## Tooling & Runtime
- Target LTS Node; enforce engines in package.json.
- Prefer `npm ci` in CI; use lockfiles (package-lock.json) checked in.
- Lint with ESLint; format with Prettier (or equivalent) consistently.
- Environment config via dotenv or platform env vars; never commit secrets.

## Application Structure
- Keep layers separated: routes → controllers → services → data access.
- Use async/await; avoid callbacks and unhandled promises.
- Centralize configuration; avoid sprinkling process.env reads.

## Routing & Middleware
- Use Express Router; keep routes thin, delegate to services.
- Validate input (Joi/Zod/class-validator) at the edge; reject early.
- Add global error-handling middleware; return consistent JSON shapes.
- Enable security middleware: helmet, compression (as needed), CORS with explicit origins, rate limiting on sensitive endpoints.

## Error Handling & Logging
- Use structured logging (pino/winston) with levels; avoid console.log.
- Normalize errors; avoid leaking stack traces to clients.
- Wrap async handlers to propagate errors to the error middleware.

## Data & I/O
- Parameterize queries; avoid string interpolation for SQL.
- Time out external calls; add retries with backoff where appropriate.
- Close resources and streams; use `finally` for cleanup.

## Testing
- Use Jest/Vitest/Mocha for unit/integration tests; isolate side effects.
- Mock external services; avoid real network calls.
- Provide test commands: `npm test`, with coverage when feasible.

## Performance & Reliability
- Avoid blocking the event loop; offload CPU-heavy work.
- Cache hot data thoughtfully; document TTL/invalidation.
- Instrument with metrics/tracing where available.

## Validation Commands
```bash
npm ci
npm run lint
npm test
npm run build || tsc --noEmit
```
