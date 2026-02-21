# OpenCode Commands

Custom commands for common development tasks. Type `/command-name` in the OpenCode TUI to run.

## Available Commands

### Documentation

| Command | Description | Agent |
|---------|-------------|-------|
| `/api-docs` | Generate comprehensive API documentation from code | docs |
| `/create-readme` | Create professional README files for projects | docs |
| `/architecture-decision` | Document architectural decisions (ADRs) | docs |

### Testing & Quality

| Command | Description | Agent |
|---------|-------------|-------|
| `/generate-tests` | Generate comprehensive unit tests for code | codebase |
| `/code-review` | Perform thorough code reviews (security, performance, quality) | review |
| `/security-audit` | Conduct comprehensive security audits | review |
| `/architecture-review` | Validate system/feature design for robustness and scalability | review |

### Development

| Command | Description | Agent |
|---------|-------------|-------|
| `/refactor-plan` | Create refactoring plans for improving code quality | planner |

### Management

| Command | Description | Agent |
|---------|-------------|-------|
| `/1-on-1-prep` | Prepare for effective 1-on-1 meetings with team members | em-advisor |

## Usage

Type `/` followed by the command name in the OpenCode TUI:

```
/code-review
/generate-tests
/security-audit
```

Pass arguments with `$ARGUMENTS`:

```
/architecture-review Context: Migrating from monolith to microservices
```

## Creating New Commands

1. Create `.opencode/commands/your-command.md`
2. Add frontmatter:
   ```yaml
   ---
   description: What this command does
   agent: recommended-agent
   ---
   ```
3. Write the prompt template as markdown body
4. Test with `/your-command` in the TUI

See [OpenCode Commands docs](https://opencode.ai/docs/commands/) for full reference.
