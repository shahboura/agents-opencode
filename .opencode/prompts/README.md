# OpenCode Prompts

Reusable prompt templates for common development tasks. These prompts provide structured approaches for complex workflows.

## Available Prompts

### 📝 Documentation

- **[api-docs.prompt.md](api-docs.prompt.md)** - Generate comprehensive API documentation from code
- **[create-readme.prompt.md](create-readme.prompt.md)** - Create professional README files for projects
- **[architecture-decision.prompt.md](architecture-decision.prompt.md)** - Document architectural decisions (ADRs)

### 🧪 Testing & Quality

- **[generate-tests.prompt.md](generate-tests.prompt.md)** - Generate comprehensive unit tests for code
- **[code-review.prompt.md](code-review.prompt.md)** - Perform thorough code reviews (security, performance, quality)
- **[security-audit.prompt.md](security-audit.prompt.md)** - Conduct comprehensive security audits

### 🔧 Development

- **[refactor-plan.prompt.md](refactor-plan.prompt.md)** - Create refactoring plans for improving code quality

### 👥 Management

- **[1-on-1-prep.prompt.md](1-on-1-prep.prompt.md)** - Prepare for effective 1-on-1 meetings with team members

## Usage

### With OpenCode Agents

Reference prompts when working with agents:

```markdown
@docs Please follow the api-docs.prompt.md template to document our REST API
```

### As Templates

Use prompts as checklists or templates for your own workflows:

1. Open the relevant prompt file
2. Follow the structure and guidelines
3. Adapt to your specific needs

### In Documentation

Link to prompts in project documentation:

```markdown
## Testing Guidelines
When adding new features, follow our test generation guidelines (see generate-tests.prompt.md).
```

## Prompt Structure

Each prompt follows a consistent structure:

```markdown
---
description: Brief description of what the prompt does
agent: Suggested agent to use (docs, codebase, review, etc.)
---

# Prompt Title

[Introduction and context]

## Step 1: [First Phase]
[Detailed instructions]

## Step 2: [Second Phase]
[More instructions]

## Examples
[Practical examples]

## Checklist
- [ ] Validation items
```

## Creating New Prompts

To add a new prompt:

1. **Create file**: `.opencode/prompts/your-prompt.prompt.md`
2. **Add frontmatter**:
   ```yaml
   ---
   description: What this prompt does
   agent: recommended-agent
   ---
   ```
3. **Structure content**:
   - Clear goal/objective
   - Step-by-step instructions
   - Examples and templates
   - Validation checklist
4. **Update this README**: Add entry to the list above
5. **Test the prompt**: Use it with an agent or manually

## Best Practices

### When Using Prompts

- **Adapt to context**: Prompts are starting points, not rigid scripts
- **Provide context**: Give agents/users project-specific information
- **Validate output**: Review generated content for accuracy and fit
- **Iterate**: Refine prompts based on results

### When Creating Prompts

- **Be specific**: Include concrete examples
- **Show structure**: Provide templates and formats
- **Think checklist**: Add validation criteria
- **Consider audience**: Write for both humans and AI agents
- **Stay focused**: One prompt = one clear purpose

## Contributing

Have ideas for new prompts or improvements? Contributions welcome:

1. Fork the repository
2. Create a new prompt following the structure above
3. Test it with relevant agents
4. Submit a pull request

## Related Documentation

- [Agents](../agent/) - Available OpenCode agents
- [Main Documentation](../../docs/) - Full project documentation

---

**Need help?** Check the [troubleshooting guide](../../docs/troubleshooting.md) or create an issue in your project repository.
