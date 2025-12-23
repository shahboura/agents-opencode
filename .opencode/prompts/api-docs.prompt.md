---
description: Generate comprehensive API documentation from code
agent: docs
---

# API Documentation Generation

Generate detailed API documentation by analyzing the codebase and extracting API endpoints, parameters, and responses.

## Step 1: Specify Documentation Scope

What to document:
- [ ] REST API endpoints
- [ ] GraphQL schema
- [ ] gRPC services
- [ ] WebSocket events
- [ ] Public libraries/SDKs
- [ ] CLI commands

## Step 2: Discovery Phase

Analyze codebase for:

### REST APIs
- Controller/route definitions
- HTTP methods and paths
- Request/response schemas
- Authentication requirements
- Query parameters, path parameters, body schemas
- Status codes and error responses
- Rate limiting and pagination

### GraphQL
- Schema definitions (types, queries, mutations, subscriptions)
- Resolver implementations
- Input types and validation
- Authentication/authorization directives

### Libraries/SDKs
- Public classes and methods
- Function signatures and types
- Usage examples
- Configuration options

## Step 3: Choose Output Format

- **OpenAPI 3.0** (REST APIs) - Standard spec with tooling support
- **Markdown** (General docs) - Human-readable, version-controlled
- **AsyncAPI** (Event-driven) - For async/websocket APIs
- **JSDoc/TSDoc** (Code comments) - Inline documentation
- **GraphQL Schema** (SDL) - Self-documenting schema

## Step 4: Generate Documentation

### REST API Documentation Template

```markdown
# [API Name] Documentation

## Overview
[Brief description of the API and its purpose]

**Base URL:** `https://api.example.com/v1`  
**Authentication:** [Bearer Token / API Key / OAuth2]  
**Content-Type:** `application/json`

---

## Authentication

### Bearer Token
Include token in Authorization header:
```
Authorization: Bearer <your_token>
```

**Get Token:**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

---

## Endpoints

### `GET /users`
Retrieve a paginated list of users with optional filtering.

**Authentication:** Required  
**Rate Limit:** 100 requests/minute

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 10 | Items per page (max: 100) |
| `role` | string | No | - | Filter by role: `admin`, `user`, `guest` |
| `search` | string | No | - | Search by name or email |

**Example Request:**
```bash
GET /users?page=1&limit=20&role=admin
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 429 | Too Many Requests - Rate limit exceeded |

---

### `POST /users`
Create a new user account.

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "password": "secure_password"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `name`: 2-100 characters
- `role`: One of: `admin`, `user`, `guest`
- `password`: Minimum 8 characters

**Response: 201 Created**
```json
{
  "id": 151,
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "createdAt": "2025-12-23T18:45:00Z"
}
```

**Error Response: 400 Bad Request**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

---

### `GET /users/:id`
Retrieve a single user by ID.

**Authentication:** Required

**Path Parameters:**
- `id` (integer): User ID

**Response: 200 OK**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "createdAt": "2025-01-15T10:30:00Z",
  "lastLogin": "2025-12-23T17:20:00Z"
}
```

**Error: 404 Not Found**
```json
{
  "error": "User not found",
  "userId": 999
}
```

---

## Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

All endpoints are rate-limited:
- **Authenticated:** 1000 requests/hour
- **Unauthenticated:** 100 requests/hour

Rate limit info in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640275200
```

---

## Pagination

List endpoints support pagination:
- Use `page` and `limit` query parameters
- Response includes `meta` object with pagination details

**Example:**
```bash
GET /users?page=2&limit=50
```

---

## Filtering & Sorting

Use query parameters:
```bash
GET /users?role=admin&sort=-createdAt&search=john
```

- Prefix with `-` for descending sort
- Multiple sort fields: `sort=role,-createdAt`

---

## Examples

### cURL
```bash
curl -X GET "https://api.example.com/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### JavaScript (fetch)
```javascript
const response = await fetch('https://api.example.com/v1/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

### Python (requests)
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
response = requests.get('https://api.example.com/v1/users', headers=headers)
data = response.json()
```

---

## Changelog

### v1.1.0 (2025-12-23)
- Added filtering by role
- Increased rate limits for authenticated users
- Added `lastLogin` field to user response

### v1.0.0 (2025-01-15)
- Initial API release
```

## Step 5: Validation

After generation, verify:
- [ ] All endpoints documented
- [ ] Request/response examples included
- [ ] Authentication clearly explained
- [ ] Error codes documented
- [ ] Rate limits specified
- [ ] Example code in multiple languages
- [ ] Changelog maintained

## OpenAPI Spec Alternative

For machine-readable format, generate OpenAPI 3.0:
```yaml
openapi: 3.0.0
info:
  title: User Management API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        email:
          type: string
```
