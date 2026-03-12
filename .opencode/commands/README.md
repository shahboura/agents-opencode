# OpenCode Commands

Custom commands for common development tasks. Type `/command-name` in the OpenCode TUI to run.

## Available Commands

### Documentation

| Command | Description | Agent | Argument hint |
|---------|-------------|-------|---------------|
| `/api-docs` | Generate comprehensive API documentation from code | docs | `[module, file, or endpoint path]` |
| `/create-readme` | Create professional README files for projects | docs | `[project name or path]` |
| `/architecture-decision` | Document architectural decisions (ADRs) | docs | `[decision topic or system name]` |

### Testing & Quality

| Command | Description | Agent | Argument hint |
|---------|-------------|-------|---------------|
| `/generate-tests` | Generate comprehensive unit tests for code | codebase | `[file, class, or function name]` |
| `/code-review` | Perform thorough code reviews (security, performance, quality) | review | `[file, PR, or scope — blank for current changes]` |
| `/security-audit` | Conduct comprehensive security audits | review | `[scope, file, component, or 'full project']` |
| `/architecture-review` | Validate system/feature design for robustness and scalability | review | `[system, component, or design document]` |

### Content Creation

| Command | Description | Agent | Argument hint |
|---------|-------------|-------|---------------|
| `/blog-post` | Write a blog post with research and fact validation | blogger | `[topic or title]` |
| `/content-review` | Review content with harsh but constructive criticism | brutal-critic | `[content text, file path, or topic]` |

### Development

| Command | Description | Agent | Argument hint |
|---------|-------------|-------|---------------|
| `/refactor-plan` | Create refactoring plans for improving code quality | planner | `[target module, file, or scope]` |
| `/plan-project` | Plan and coordinate a complex multi-phase project | orchestrator | `[feature, objective, or epic]` |

### Management

| Command | Description | Agent | Argument hint |
|---------|-------------|-------|---------------|
| `/1-on-1-prep` | Prepare for effective 1-on-1 meetings with team members | em-advisor | `[person] [context]` |

## Usage

Type `/` followed by the command name in the OpenCode TUI:

```
/code-review
/generate-tests
/security-audit
```

Pass command arguments directly after the command name:

```
/architecture-review Context: Migrating from monolith to microservices
/blog-post How to build REST APIs with Go
/plan-project Add authentication system with OAuth2
```

## Creating New Commands

1. Create `.opencode/commands/your-command.md`
2. Add frontmatter:
   ```yaml
   ---
   description: What this command does
   agent: recommended-agent
   subtask: true
   ---
   ```
3. Write the prompt template as markdown body
4. Test with `/your-command` in the TUI

All commands use `subtask: true` for faster execution with less context overhead.

See [OpenCode Commands docs](https://opencode.ai/docs/commands/) for full reference.
