---
description: Comprehensive code review for security, performance, and best practices
agent: review
---

# Code Review Prompt

Perform a thorough code review of the selected code or recent changes, focusing on security, performance, maintainability, and best practices.

## Review Checklist

### 1. Security
- [ ] **Input validation**: All inputs sanitized and validated
- [ ] **SQL injection**: Parameterized queries used
- [ ] **XSS prevention**: Output properly escaped
- [ ] **Authentication**: Proper auth checks before sensitive operations
- [ ] **Authorization**: Role/permission checks implemented
- [ ] **Secrets management**: No hardcoded credentials or API keys
- [ ] **HTTPS/TLS**: Secure connections enforced
- [ ] **CSRF protection**: Tokens used for state-changing operations
- [ ] **Rate limiting**: Protection against abuse
- [ ] **Error handling**: No sensitive info leaked in errors

### 2. Performance
- [ ] **Database queries**: Optimized, indexed, no N+1 problems
- [ ] **Caching**: Appropriate caching strategy
- [ ] **Async operations**: Non-blocking I/O used where applicable
- [ ] **Memory management**: No leaks, proper resource cleanup
- [ ] **Algorithm efficiency**: Optimal time/space complexity
- [ ] **Bundle size**: Minimal dependencies, tree-shaking applied
- [ ] **Lazy loading**: Large resources loaded on-demand

### 3. Code Quality
- [ ] **Naming**: Clear, descriptive variable/function names
- [ ] **Functions**: Small, single-responsibility functions
- [ ] **DRY**: No code duplication
- [ ] **Comments**: Complex logic explained, not obvious code
- [ ] **Error handling**: Comprehensive try-catch, proper error types
- [ ] **Type safety**: Strong typing used (TypeScript, C#, etc.)
- [ ] **Null safety**: Proper null/undefined checks

### 4. Testing
- [ ] **Unit tests**: Critical logic covered
- [ ] **Integration tests**: API endpoints tested
- [ ] **Edge cases**: Boundary conditions tested
- [ ] **Error cases**: Failure scenarios tested
- [ ] **Test isolation**: No shared state between tests
- [ ] **Mock appropriately**: External dependencies mocked

### 5. Architecture & Design
- [ ] **SOLID principles**: Followed appropriately
- [ ] **Separation of concerns**: Clear layer boundaries
- [ ] **Dependency injection**: Loose coupling maintained
- [ ] **Scalability**: Design supports growth
- [ ] **Maintainability**: Easy to understand and modify

### 6. Language-Specific

#### .NET/C#
- [ ] Async/await with CancellationToken
- [ ] IDisposable implemented for resources
- [ ] Nullable reference types used correctly
- [ ] No blocking calls in async code
- [ ] EF Core queries optimized (AsNoTracking, projections)

#### Python
- [ ] Type hints on all functions
- [ ] Context managers for resources
- [ ] PEP 8 compliance
- [ ] No circular imports
- [ ] Virtual environment documented

#### TypeScript/JavaScript
- [ ] Strict mode enabled
- [ ] No `any` types without justification
- [ ] Proper async/await usage
- [ ] Event listeners cleaned up
- [ ] Memory leaks prevented (subscriptions, timers)

### 7. Documentation
- [ ] **API docs**: Public APIs documented
- [ ] **README**: Setup instructions clear
- [ ] **Inline comments**: Complex logic explained
- [ ] **Change log**: Breaking changes noted

## Review Format

### Summary
[Brief overview of what was reviewed]

**Overall Assessment:** ✅ Approved / ⚠️ Needs Minor Changes / ❌ Needs Major Changes

---

### Critical Issues 🔴
Issues that MUST be fixed before merge:

1. **[Security/Performance/Bug]**: [Issue description]
   - **Location:** `file.ts:123`
   - **Impact:** [What could go wrong]
   - **Fix:** [Recommended solution]

---

### Important Issues 🟡
Should be addressed but not blocking:

1. **[Code Quality/Maintainability]**: [Issue description]
   - **Location:** `file.py:45`
   - **Suggestion:** [Improvement recommendation]

---

### Suggestions 🟢
Nice-to-have improvements:

1. **[Optimization/Refactor]**: [Suggestion]
   - **Location:** `file.cs:78`
   - **Benefit:** [Why this would help]

---

### Positive Highlights ⭐
Things done well:

- Good separation of concerns in service layer
- Comprehensive error handling
- Clear naming conventions
- Well-structured tests

---

## Example Issues

### Critical: SQL Injection Vulnerability 🔴
```python
# ❌ Bad: String interpolation
query = f"SELECT * FROM users WHERE email = '{email}'"
cursor.execute(query)

# ✅ Good: Parameterized query
query = "SELECT * FROM users WHERE email = %s"
cursor.execute(query, (email,))
```

### Important: N+1 Query Problem 🟡
```csharp
// ❌ Bad: Loads related data in loop
foreach (var user in users)
{
    var posts = await context.Posts.Where(p => p.UserId == user.Id).ToListAsync();
}

// ✅ Good: Eager loading
var users = await context.Users
    .Include(u => u.Posts)
    .ToListAsync();
```

### Suggestion: Extract Duplicate Logic 🟢
```typescript
// ❌ Duplicated validation logic
if (!email || !email.includes('@')) throw new Error('Invalid email');
// ... same check repeated elsewhere

// ✅ Extract to utility function
function validateEmail(email: string): void {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email');
  }
}
```

---

## Security-Specific Checks

### Authentication
```typescript
// ❌ Bad: No auth check
app.delete('/users/:id', async (req, res) => {
  await deleteUser(req.params.id);
});

// ✅ Good: Auth middleware
app.delete('/users/:id', authenticateUser, authorizeAdmin, async (req, res) => {
  await deleteUser(req.params.id);
});
```

### Input Validation
```python
# ❌ Bad: No validation
def create_user(age: int):
    user = User(age=age)

# ✅ Good: Validate constraints
def create_user(age: int):
    if age < 0 or age > 150:
        raise ValueError("Invalid age")
    user = User(age=age)
```

### Error Handling
```csharp
// ❌ Bad: Leaks implementation details
catch (Exception ex)
{
    return StatusCode(500, ex.Message); // Could expose DB structure
}

// ✅ Good: Generic error message, log details
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to create user");
    return StatusCode(500, "An error occurred");
}
```

---

## Final Checklist

Before approving:
- [ ] No critical security issues
- [ ] No major performance problems
- [ ] Tests pass and cover new code
- [ ] Documentation updated
- [ ] No breaking changes without migration plan
- [ ] Code follows project conventions
- [ ] Ready for production deployment

**Recommendation:** [Approve / Request Changes / Reject]
