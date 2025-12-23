---
layout: default
title: Customization
nav_order: 7
---

# Customization

## Project Context

Make agents smarter by adding context to `AGENTS.md`:

```markdown
# My Project

Tech stack: Node.js, TypeScript, PostgreSQL

## Standards
- Use async/await everywhere
- Write tests for new features
- Follow REST API conventions
```

## Language Standards

Agents auto-apply standards based on file types:

- `.cs` → .NET Clean Architecture
- `.py` → Python type hints
- `.ts` → TypeScript strict mode

## Agent Configuration

Edit `.opencode/agent/[agent].md` to modify behavior:

- Change model settings
- Adjust permissions
- Update tools

```markdown
# Project Context

## Overview
[1-2 sentence description of what your project does]

## Tech Stack
- Backend: Node.js 18+ with Express
- Frontend: React 18 with TypeScript
- Database: PostgreSQL 14
- DevOps: Docker, Kubernetes

## Architecture
[Describe your architecture]

## Coding Standards

### JavaScript/TypeScript
- Use async/await, no callbacks
- Strict TypeScript mode
- ESLint + Prettier for formatting
- Jest for testing
- 80% code coverage minimum

### Node.js Specific
- Use dependency injection
- Middleware pattern for plugins
- Clean error handling with codes
- Structured logging (JSON format)

## Project Structure
```

src/
├── api/           # Express routes
├── services/      # Business logic
├── models/        # Data models
├── middleware/    # Express middleware
├── utils/         # Utilities
└── tests/         # Test files

config/
├── database.js    # DB configuration
└── app.js         # App configuration

```

## Key Files & Standards
- `package.json` - Dependencies (always npm ci in CI/CD)
- `.eslintrc.json` - Linting rules
- `.prettierrc` - Formatting
- `jest.config.js` - Testing config
- `Dockerfile` - Container setup

## Running the Project

### Local Development
```bash
npm install
npm run dev        # Starts on :3000
```

### Testing

```bash
npm test           # Run all tests
npm run test:cov   # With coverage
```

### Building

```bash
npm run build      # Compile TypeScript
npm run lint       # Check style
```

## Dependencies to Know About

- **express** - Web framework
- **sequelize** - ORM for PostgreSQL
- **joi** - Data validation
- **winston** - Logging
- **jest** - Testing

## Important Constraints

- Must maintain backward compatibility
- No external API calls without rate limiting
- All credentials through environment variables
- Minimum Node 16 LTS
- No direct database access from API (always use ORM)

## Common Patterns in This Project

- Middleware for auth/logging
- Validation using Joi
- Error responses with codes: `{ code, message, statusCode }`
- Async error handling with try/catch
- Service layer for business logic

```

### Step 3: Agents Use It Automatically

Now when you:
- Ask @codebase to implement features → uses your architecture
- Ask @review to audit code → checks against your standards
- Ask @docs to create README → references your tech stack
- Ask @orchestrator to coordinate → applies your patterns

**All without additional context!**

---

## Customize Agent Behavior

### Modify an Agent

Agents are defined in `.opencode/agent/`:

```bash
.opencode/agent/
├── codebase.md
├── orchestrator.md
├── docs.md
├── review.md
└── em-advisor.md
```

### Example: Customize @review

Edit `.opencode/agent/review.md`:

```markdown
---
name: review
description: Code review specialist for our standards
tools: [...]
---

# Code Review Agent

## Our Review Standards

### Security (Critical)
- [ ] No hardcoded secrets
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] Rate limiting present
- [ ] Error messages don't leak info

### Performance (High)
- [ ] No N+1 queries
- [ ] Caching strategy defined
- [ ] Load tested at 1000 concurrent users
- [ ] Database indexes on foreign keys
```

---

## Create Custom Prompts

Add project-specific prompts for common tasks.

### Step 1: Create Prompt File

Add to `.opencode/agent/codebase.md` under a Custom Prompts section:

```markdown
## Custom Prompts

### /database-migration
Generate database migration

Usage:
```

/database-migration Add user last_login timestamp

```

### Step 2: Use in OpenCode Chat

```bash
opencode
/database-migration Add user last_login timestamp
```

/database-migration Add user last_login timestamp

```

---

## Add Coding Standards for Your Stack

Create `.opencode/instructions/node-express.instructions.md`:

```markdown
---
description: Node.js Express best practices
applyTo: '**/*.js,**/*.ts'
---

# Node.js Express Standards

## Express Routing
- Use async middleware
- Always handle errors
- Validate request data with Joi
- Return consistent JSON response format

## Error Handling
```javascript
// Middleware format
const asyncHandler = (fn) => (req, res, next) => 
    Promise.resolve(fn(req, res, next)).catch(next);

app.post('/users', asyncHandler(async (req, res) => {
    const user = await createUser(req.body);
    res.json({ success: true, data: user });
}));
```

## Response Format

```javascript
{
  success: boolean,
  code: string,        // e.g., "USER_CREATED"
  message: string,
  data: any,
  statusCode: number
}
```

```

---

## Make Standards Language-Specific

### For TypeScript Only

Create `.opencode/instructions/typescript-only.instructions.md`:

```markdown
---
description: TypeScript-specific standards
applyTo: '**/*.ts'
---

# TypeScript Standards

[Your specific TypeScript rules]
```

### For React Components

Create `.opencode/instructions/react.instructions.md`:

```markdown
---
description: React component standards
applyTo: '**/components/**/*.tsx'
---

# React Component Standards

[Your component patterns]
```

---

## Update Instructions Over Time

As your project evolves:

1. **Agent proposes improvements** at task completion
2. **You review updates** to `AGENTS.md`
3. **Approve or modify** the context
4. **All future sessions use new context**

This creates a continuously improving knowledge base!

---

## Template: Minimal Project Context

For quick setup, use this template:

```markdown
# Project

## Tech
- [Your tech stack here]

## Standards
- Type hints/types required
- 80% test coverage
- No hardcoded secrets

## Architecture
[Brief overview]

## How to Run
```bash
[Your setup commands]
```

## Key Dependencies

- [Your main libraries]

```

---

## Template: Comprehensive Project Context

For mature projects:

```markdown
# [Project Name]

[Full context from the example above...]

## Domain Knowledge
[Business logic, special rules]

## Performance Requirements
[SLA, capacity requirements]

## Security Requirements
[Compliance, data sensitivity]

## Integration Points
[External APIs, services]

## Deployment Process
[How code gets to production]

## Monitoring & Alerts
[Key metrics, dashboards]

## Team Conventions
[Naming, patterns, idioms]
```

---

## Troubleshooting Customization

**Q: Agent not using my context?**  
A: Make sure `AGENTS.md` exists in repository root.

**Q: Agent ignoring my standards?**  
A: Add standards to `.opencode/instructions/` files with proper `applyTo` patterns.

**Q: Custom prompt not showing?**  
A: Verify file is in `.opencode/agent/` with proper format.

---

## Next Steps

- **[Getting Started](./getting-started.md)** - Quick setup if not done yet
- **[Workflows](./workflows.md)** - See your standards in action
- **[Agents Guide](./agents/README.md)** - Deep dive into each agent
- **[FAQ](./troubleshooting.md)** - Common questions
