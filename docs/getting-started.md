---
layout: default
title: Getting Started
nav_order: 1
---

# Getting Started in 5 Minutes

Get up and running with GitHub Copilot agents in just 5 minutes.

## Prerequisites

- VS Code with GitHub Copilot extension installed
- Any project (this works with existing repos)

## Step 1: Understand Agent Concepts (1 min)

**Agents** are specialized versions of GitHub Copilot that excel at specific tasks.

| Agent | What It Does |
|-------|-------------|
| @orchestrator | Plans and orchestrates complex projects (read-only plan mode or end-to-end execution) |
| @codebase | Implements features (code changes) |
| @review | Audits for security & quality |
| @docs | Creates documentation |
| @em-advisor | Helps with leadership decisions |

## Step 2: Start Your First Conversation (2 min)

1. **Open Copilot Chat**
   - Windows: `Ctrl+Shift+I`
   - Mac: `Cmd+Shift+I`

2. **Select an Agent**
   - Click the agent dropdown at the top
   - Choose `@codebase` (start with the most versatile)

3. **Type Your Request**
   ```
   @codebase Create a REST API endpoint for getting users by ID
   ```

4. **Review the Plan**
   - The agent will propose a step-by-step plan
   - Review it carefully
   - Type "Yes" or "Approved" to proceed

5. **Watch Implementation**
   - Agent implements one step at a time
   - Each step shows what changed
   - Can stop or adjust at any time

## Step 3: Use Reusable Prompts (1 min)

Save time with `/` commands:

```
/code-review          # Quick code review
/generate-tests       # Unit test generation
/create-readme        # Professional README
/1-on-1-prep         # Team meeting prep
/architecture-decision # Design documentation
```

Type `/` in Copilot Chat to see all available prompts.

## Step 4: Add Project Context (1 min)

Make agents smarter by providing project context:

1. **Create file**: `.github/copilot-instructions.md`

2. **Add context**:
```markdown
# My Project

We build microservices using:
- Node.js + TypeScript
- PostgreSQL
- Docker

## Standards
- Use async/await everywhere
- Write tests for new features
- Follow conventional commits
- OpenAPI for API docs
```

3. **Agents automatically use this context!**

## Step 5: Try a Workflow (0 min)

Now you're ready! Try these:

### 👤 Create User Service
```
@codebase Create UserService with:
- Get, create, update, delete methods
- Proper error handling
- Unit tests with Jest
- TypeScript strict mode
```

### 🔐 Secure Review
```
@review Audit this code for security issues
```

### 📖 Generate Docs
```
@docs Create README with installation, usage, and API examples
```

---

## Common Patterns

### ✅ DO: Be Specific
```
@codebase Create an authentication middleware that validates JWT tokens 
and extracts user info to req.user
```

### ❌ DON'T: Be Vague
```
@codebase Add auth
```

### ✅ DO: Review Plans
Always review the agent's proposed plan before approving implementation.

### ✅ DO: Use Handoffs
```
@codebase (implement) → @review (audit) → @docs (document)
```

---

## Next Steps

- **[Explore All Agents](./agents/README.md)** - Deep dive into each agent
- **[View Workflows](./workflows.md)** - Real-world examples
- **[Customize Agents](./customization.md)** - Adapt to your project
- **[Troubleshooting](./troubleshooting.md)** - Common issues and fixes

## Need Help?

- Check the [FAQ](./troubleshooting.md#faq)
- Review [Agent Capabilities](./agents/README.md)
- Browse [Real Workflows](./workflows.md)
