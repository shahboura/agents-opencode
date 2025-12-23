# FAQ & Troubleshooting

## Common Issues

### Agents not showing up

- Ensure `.opencode/agent/` files exist
- Restart OpenCode
- Check file permissions

### Plans too complex

- Be more specific in requests
- Break large tasks into smaller ones
- Use @orchestrator for planning first

### Code not compiling

- Check auto-applied standards match your project
- Review error messages
- Adjust AGENTS.md context

## Help & Resources

- Check agent capabilities in docs
- Review session summaries in AGENTS.md
- Start with simple requests to learn patterns

**[→ Agents Guide](./agents/README.md)**

### How do I customize agents?

Edit `AGENTS.md` to add project context.

**[→ Customization Guide](./customization.md)**

### Do agents save context between sessions?

**Yes!** They update `AGENTS.md` automatically (with approval).

### Can I create custom prompts?

Yes! Add prompts to agent configurations in `.opencode/agent/`.

**[→ Prompts Guide](./prompts.md)**

## Agents Not Showing in Dropdown

**Problem:** Can't find agents in OpenCode Chat.

**Solution:**

1. Verify files exist: `.github/agents/*.agent.md`
2. Check file names end with `.agent.md` exactly
3. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
4. Restart OpenCode

**Files to check:**

- `.opencode/agent/codebase.md`
- `.opencode/agent/orchestrator.md`
- `.opencode/agent/docs.md`
- `.opencode/agent/review.md`
- `.opencode/agent/em-advisor.md`

---

### Agent Ignoring My Instructions

**Problem:** Agent not following project standards.

**Solution:**

1. Create/update `AGENTS.md`
2. Include specific examples
3. Refresh chat context (start new conversation)
4. Mention standards in your request:

    ```bash
    @codebase Create user service following our standards in AGENTS.md
    ```

---

### Wrong Language Detected

**Problem:** @codebase detects wrong language/framework.

**Solution:**

- **Option 1:** Explicitly mention the language:

  ```
  @codebase Using .NET with Clean Architecture, create...
  ```

- **Option 2:** Add detection hints to project root:
  - Add `*.sln` file (forces .NET detection)
  - Add `pyproject.toml` (forces Python detection)
  - Add `tsconfig.json` (forces TypeScript detection)

---

### Plan Not Making Sense

**Problem:** Agent's proposed plan seems wrong.

**Solution:**

1. **Don't approve** - you don't have to
2. **Ask clarifying questions:**

   ```
   I need you to include database migrations in the plan
   ```

3. **Provide context:**

   ```
   We use Clean Architecture, so please organize by layers
   ```

4. **Iterate** until plan is right
5. **Then approve** and implement

---

### Tests Failing After Implementation

**Problem:** Agent implemented code but tests fail.

**Solution:**

1. Check the error messages
2. Ask agent to fix:

   ```
   @codebase These tests are failing: [error details]
   Please fix the implementation
   ```

3. Agent will:
   - Analyze failures
   - Update implementation
   - Re-run tests until passing

---

### Code Review Found Too Many Issues

**Problem:** @review found many problems.

**Solution:**

1. **Don't panic** - this is good!
2. **Review findings:**

   ```
   @review Can you prioritize these by severity?
   ```

3. **Fix incrementally:**

   ```
   @codebase Fix the critical issues first
   ```

4. **Re-review:**

   ```
   @review Review the fixes I just made
   ```

---

### Prompts Not Showing

**Problem:** `/create-readme` and other prompts don't autocomplete.

**Solution:**

1. Check prompts are defined in `.opencode/agent/*.md` files
2. Verify file names end with `.md` exactly
3. Reload OpenCode
4. Type `/` and wait for autocomplete list

---

### Agent Made Wrong Changes

**Problem:** Agent edited something incorrectly.

**Solution:**

1. **Don't panic** - this is what version control is for
2. **Revert the changes:**

   ```bash
   git checkout -- .
   ```

3. **Start over with better context:**

   ```
   @codebase Here's more detail about what I need...
   ```

4. **Or manually fix** the specific issue

---

### Documentation Generated is Poor Quality

**Problem:** @docs generated README doesn't match your style.

**Solution:**

1. **Review and edit** the generated docs
2. **Give feedback to agent:**

   ```
   @docs Please regenerate the README:
   - Add architecture diagram
   - Include troubleshooting section
   - Style should be concise, not verbose
   ```

3. **Iterate** until quality is good
4. **Then commit** to repository

---

### Agent Too Verbose

**Problem:** Agent generates overly detailed responses.

**Solution:**

```
@codebase Implement this, but keep the response brief.
Show just the file names that changed and validation results.
```

---

### Agent Being Too Cautious

**Problem:** Agent won't implement without extensive planning.

**Solution:**

```
@codebase This is a simple change. Please just:
1. [Specific task]
2. [Specific task]

No need for extensive planning.
```

---

### Performance Issues

**Problem:** OpenCode running slowly.

**Solution:**

1. Make requests more specific (smaller scope)
2. Break large tasks into smaller pieces
3. Restart OpenCode
4. Check internet connection
5. Reduce open files/projects

---

## Common Mistakes

### ❌ Being Too Vague

```
@codebase Add authentication
```

**Better:**

```
@codebase Add JWT authentication with:
- Login endpoint (email/password)
- Refresh token mechanism
- Protected route middleware
- Tests using Jest and Supertest
```

### ❌ Skipping Plan Review

Always review the proposed plan before approving implementation.

### ❌ Not Using Handoffs

Don't do:

```
@codebase Create and test and review and document everything
```

**Better workflow:**

```
@codebase (implement)
→ @review (audit)
→ @docs (document)
```

### ❌ Not Providing Context

Without `AGENTS.md`, agents use generic patterns.

**Provide context!** It makes agents smarter.

### ❌ Ignoring Build Errors

If agent says "Build failed," don't ignore it. Ask agent to fix:

```
@codebase The build failed with these errors: [errors]
Please fix them
```

---

## Getting Help

### Resources

- **[Getting Started](./getting-started.md)** - 5-minute tutorial
- **[Agents Guide](./agents/README.md)** - Detailed agent reference
- **[Workflows](./workflows.md)** - Real-world examples
- **[Customization](./customization.md)** - Tailor to your project

### Still Stuck?

1. Check the relevant guide above
2. Try a simpler version of your request
3. Add more context to your prompt
4. Break large tasks into smaller pieces
5. Open an issue on GitHub

---

## Advanced Tips

### Use Multiple Agents in Sequence

```
@orchestrator Create detailed plan
→ @codebase Implement
→ @review Audit
→ @docs Document
```

### Combine Agents with Prompts

```
@codebase Create user service
then
/code-review on the result
then
/generate-tests for new code
```

### Save Important Context

Accept agent proposals to update `AGENTS.md`:

- Architectural decisions
- Coding patterns established
- Project-specific conventions

This improves all future sessions!

### Reference Previous Decisions

In your request, reference saved context:

```
@codebase Create the auth service using patterns from our AGENTS.md
```

---

## FAQ By Role

### If You're a Developer

- **Quick Reference:** [Getting Started](./getting-started.md)
- **Implementation:** [@codebase Agent](./agents/README.md)
- **Learning:** [Workflows](./workflows.md)

### If You're a Tech Lead

- **Planning & Coordination:** [@orchestrator Agent](./agents/README.md)
- **Quality:** [@review Agent](./agents/README.md)

### If You're a Manager

- **Leadership Support:** [@em-advisor Agent](./agents/README.md)
- **1-on-1 Prep:** [/1-on-1-prep Prompt](./prompts.md#1-on-1-prep)

---

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/shahboura/agents-opencode/issues)
- **Discussions:** [GitHub Discussions](https://github.com/shahboura/agents-opencode/discussions)
- **Documentation:** You're reading it!

---

## Next Steps

- **Try it out!** [Getting Started](./getting-started.md)
- **Learn more:** [Agents Guide](./agents/README.md)
- **See examples:** [Workflows](./workflows.md)
