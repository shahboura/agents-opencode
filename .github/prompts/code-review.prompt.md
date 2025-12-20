---
description: Perform a comprehensive code review focusing on security, performance, and best practices
agent: review
---

# Code Review Prompt

Review the selected code or recent changes for:

1. **Security Issues**
   - Input validation vulnerabilities
   - Authentication/authorization flaws
   - Secrets or sensitive data exposure
   - SQL injection or XSS risks

2. **Performance Problems**
   - N+1 query issues
   - Inefficient algorithms
   - Memory leaks
   - Missing caching opportunities

3. **Code Quality**
   - SOLID principles violations
   - Code duplication (DRY)
   - Proper error handling
   - Naming conventions
   - Code complexity

4. **Best Practices**
   - Language-specific idioms
   - Framework patterns
   - Test coverage
   - Documentation completeness

Provide a detailed report with:
- Critical issues requiring immediate attention
- Warnings for potential problems
- Suggestions for improvements
- Positive notes on what's done well

Format the output as:
```markdown
## Review Summary
**Status**: ✅ Approved / ⚠️ Needs Attention / ❌ Requires Changes

### Critical Issues
[List with file:line references]

### Warnings
[List with recommendations]

### Suggestions
[List with optional improvements]

### Positive Notes
[What was done well]
```
