# Prompts

Reusable commands for common tasks.

## Available Commands

- `/create-readme` - Generate professional README
- `/code-review` - Comprehensive code review
- `/generate-tests` - Unit test generation
- `/1-on-1-prep` - Meeting preparation
- `/architecture-decision` - ADR creation

## Usage

Type `/` in OpenCode to see available prompts, then select one.

## Examples

```
/create-readme
/code-review
/generate-tests
```
```
/create-readme
```

**Best for:**
- New projects needing documentation
- Existing projects with missing README
- Standardizing documentation style
---

### `/code-review`
**Perform comprehensive code review**

Audits code for:
- Security vulnerabilities
- Performance issues
- Code quality problems
- Best practices violations

**Example:**
```
/code-review
```

**Best for:**
- Pulling PRs before merging
- Auditing critical modules
- Teaching code quality standards
---

### `/generate-tests`
**Generate unit tests**

Creates tests following best practices:
- Happy path scenarios
- Edge cases & boundaries
- Error handling
- Proper test structure
- Language-specific frameworks (xUnit, pytest, Jest)

**Example:**
```
/generate-tests
```

**Best for:**
- Adding tests to untested code
- Increasing code coverage
- Learning testing best practices
---

### `/1-on-1-prep`
**Prepare for 1-on-1 meeting**

Generates agenda and guidance for:
- Opening questions
- Career development discussions
- Feedback exchange
- Action items
- Red flag indicators

**Example:**
```
/1-on-1-prep
```

**Best for:**
- Team leads & managers
- Regular 1-on-1s
- Difficult conversations
---

### `/architecture-decision`
**Create Architecture Decision Record (ADR)**

Documents decisions with:
- Context & problem statement
- Options considered (with pros/cons)
- Decision rationale
- Implementation plan
- Risks & mitigation
- Related decisions

**Example:**
```
/architecture-decision
```

**Best for:**
- Recording major technical decisions
- Maintaining decision history
- Onboarding new team members
---

## How to Use

1. **Open Copilot Chat** - `Ctrl+Shift+I` (Windows) or `Cmd+Shift+I` (Mac)

2. **Type the command**
   ```
   /create-readme
   ```

3. **Select the agent** (if prompted)
   - Most prompts route to specific agents automatically

4. **Provide context** (if requested)
   - Answer clarifying questions
   - Attach files if needed

5. **Review output**
   - Edit as needed
   - Accept or refine

---

## Pro Tips

### Combine with Agents
```
@orchestrator Use /create-readme and /code-review after implementation
```

### Enhance with Context
```
/code-review Focus on security issues in payment processing
```

### Chain Prompts
```
/generate-tests then @review the tests for quality
```

---

## Location

All prompts are stored in:
```
.github/prompts/*.prompt.md
```

You can view them to understand how they work!

---

## Create Custom Prompts

Want to add your own prompt? Create a `.prompt.md` file:

```markdown
---
description: What this prompt does
agent: codebase
---

# Your Prompt Name

Instructions here...
```

Store in `.github/prompts/` and it appears in autocomplete!

---

## Next Steps

- **[Agents Guide](./agents/README.md)** - When to use each agent
- **[Workflows](./workflows.md)** - Real examples combining prompts
- **[Customization](./customization.md)** - Add project context
