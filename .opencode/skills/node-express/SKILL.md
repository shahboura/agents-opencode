---
name: node-express
description: Node.js + Express best practices for services and APIs
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce layered architecture and async safety for Express applications
- Apply security middleware and structured logging standards
- Guide input validation, error handling, and data access patterns

## When to use me
Use this when building or maintaining Node.js services with Express.

## Key Rules
- Target LTS Node; enforce `engines` field in package.json
- Use `npm ci` in CI — never `npm install`
- Maintain strict layer separation: routes → controllers → services → data access
- Async/await only — no callbacks, no unhandled promise rejections
- Validate all input at the edge using Joi, Zod, or class-validator; reject early
- Add global error-handling middleware; return consistent JSON error shapes across all endpoints
- Enable helmet, CORS with explicit origins, and rate limiting on sensitive endpoints
- Use structured logging (pino or winston) with log levels and request IDs — never console.log
- Parameterize all SQL queries — never use string interpolation
- Set timeouts on all external calls; add retries with exponential backoff where appropriate
- Centralize configuration — avoid sprinkling `process.env` reads throughout the codebase
- Close resources and streams in `finally` blocks
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Validation Commands
```bash
npm ci
npm run lint
npm test
npm run build
```
