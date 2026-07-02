---
name: api-documentation
description: API documentation standards for REST, GraphQL, gRPC, WebSocket, and SDKs
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "1.0.0"
  audience: developers
  workflow: documentation
---

## What I do
- Guide discovery and extraction of API surfaces from code (REST, GraphQL, gRPC, WebSocket, SDKs)
- Define documentation structure for endpoints, authentication, parameters, responses, and errors
- Provide OpenAPI 3.0 and Markdown format conventions
- Enforce pagination, filtering, rate limiting, error codes, and changelog standards

## When to use me
Use when generating API documentation from code, standardizing format across services, or reviewing docs for completeness.

## Key Rules

### Discovery Phase
Analyze the codebase for:
- **REST:** Route definitions, HTTP methods/paths, request/response schemas, auth,
  query/path/body params, status codes, rate limiting, pagination
- **GraphQL:** Schema definitions (types, queries, mutations, subscriptions), resolvers, input types, validation, auth directives
- **gRPC:** Service definitions, message types, streaming patterns
- **WebSocket:** Event names, message schemas, connection lifecycle
- **SDKs:** Public classes and methods, function signatures, configuration options

### Output Format Selection
- **OpenAPI 3.0** — REST APIs with tooling support
- **Markdown** — Human-readable, version-controlled docs
- **AsyncAPI** — Event-driven and WebSocket APIs
- **GraphQL SDL** — Self-documenting schema
- **JSDoc/TSDoc** — Inline code comments

### REST API Endpoint Documentation Format
Each documented endpoint must include: HTTP method, path, summary, authentication requirement, and rate limit.

**Parameter tables use this structure:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|

Provide separate tables for query parameters, path parameters, headers, and request body fields.

**Requests include:** method, full path, headers (Authorization, Content-Type), and body when applicable.

**Responses include:** status code, description, and JSON body structure. Error responses documented in a separate table:

| Status | Code | Description |
|--------|------|-------------|

**Common error codes section** must cover at minimum: 400 (validation), 401 (unauthorized), 403 (forbidden),
404 (not found), 429 (rate limit), 500 (internal).

### OpenAPI 3.0 Structure
For machine-readable specs, use this minimal structure:

```yaml
openapi: 3.0.0
info:
  title: {API Name}
  version: {semver}
paths:
  /resource:
    get|post|put|delete:
      summary: {description}
      parameters: [...]
      responses:
        '{status}':
          description: {description}
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/{Model}'
components:
  schemas:
    {Model}:
      type: object
      properties: {...}
```

### Pagination and Filtering
- Use `page` (integer, default 1) and `limit` (integer, document max value) query parameters
- Response includes a `meta` object: `{ page, limit, total, totalPages }`
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Filtering via query parameters matching field names
- Sorting via `sort` parameter: prefix with `-` for descending, comma-separated for multiple fields
- Document separate rate limits for authenticated vs unauthenticated access

### Multi-Language Examples
Provide at minimum cURL, JavaScript (fetch), and Python (requests) examples for each endpoint category.

### Changelog
Maintain versioned changelog entries with date, additions, deprecations, and breaking changes.

## Validation Commands

After generation, verify each checklist item:
- [ ] All endpoints documented
- [ ] Request and response examples included for each endpoint
- [ ] Authentication clearly explained (method, token acquisition flow)
- [ ] Error codes and status codes documented in dedicated tables
- [ ] Rate limits and pagination conventions specified
- [ ] Multi-language example code present (cURL, JS, Python minimum)
- [ ] Changelog maintained with version dates
- [ ] OpenAPI spec validates against the 3.0 schema (if generated)
