---
layout: default
title: Prompts
nav_order: 5
---

# Prompts

Reusable commands for common tasks.

## Table of Contents
- [Available Commands](#available-commands)
- [Usage](#usage)
- [Examples](#examples)
- [How to Use](#how-to-use)
- [Pro Tips](#pro-tips)
- [Location](#location)
- [Create Custom Prompts](#create-custom-prompts)
  - [Custom Prompts](#custom-prompts)
- [Next Steps](#next-steps)

## Available Commands

- `/api-docs` - Generate comprehensive API documentation
- `/create-readme` - Generate professional README
- `/code-review` - Comprehensive code review
- `/generate-tests` - Unit test generation
- `/security-audit` - Conduct security audits
- `/refactor-plan` - Create refactoring plans
- `/1-on-1-prep` - Meeting preparation
- `/architecture-decision` - ADR creation
- `/architecture-review` - Review architectural decisions

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

### `/api-docs`

**Generate comprehensive API documentation**

Creates detailed API documentation including:

- Endpoint specifications with parameters
- Request/response examples
- Error handling documentation
- Authentication requirements
- Usage examples and code samples

**Example:**

```
/api-docs
```

**Best for:**

- Documenting REST APIs and microservices
- Creating developer portals
- API versioning and maintenance
- Onboarding new developers

---

### `/security-audit`

**Conduct comprehensive security audits**

Performs security analysis covering:

- Common vulnerabilities (OWASP Top 10)
- Authentication and authorization flaws
- Input validation and sanitization
- Secure coding practices
- Dependency vulnerabilities
- Configuration security

**Example:**

```
/security-audit
```

**Best for:**

- Pre-deployment security reviews
- Third-party code audits
- Compliance requirements
- Security training and awareness

---

### `/refactor-plan`

**Create refactoring plans for code improvement**

Develops structured plans for code refactoring including:

- Code smell identification
- Complexity analysis
- Dependency reduction strategies
- Testing approach for refactoring
- Risk assessment and mitigation
- Step-by-step implementation plan

**Example:**

```
/refactor-plan
```

**Best for:**

- Legacy code modernization
- Technical debt reduction
- Code maintainability improvements
- Performance optimization planning

---

### `/architecture-review`

**Review architectural decisions and designs**

Evaluates system architecture including:

- Design pattern appropriateness
- Scalability and performance considerations
- Maintainability and extensibility
- Technology stack alignment
- Security architecture review
- Deployment and operational concerns

**Example:**

```
/architecture-review
```

**Best for:**

- System design validation
- Technology selection review
- Scalability planning
- Team alignment on architecture

---

## How to Use

1. **Open OpenCode Chat** - `opencode` command

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

Prompts are built into the agent configurations in `.opencode/agent/`. Each agent defines the prompts it supports.

---

## Create Custom Prompts

Want to add your own prompt? Add it to an agent configuration in `.opencode/agent/[agent-name].md`:

```markdown
## Custom Prompts

### /my-custom-prompt
Description of what this prompt does.

Usage:
```

/my-custom-prompt Do something specific

```
```

---

## Next Steps

- **[Agents Guide](./agents/README.md)** - When to use each agent
- **[Workflows](./workflows.md)** - Real examples combining prompts
- **[Customization](./customization.md)** - Add project context
