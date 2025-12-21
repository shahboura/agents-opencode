# Workflows

Common patterns for using agents effectively.

## Basic Workflow

1. **Plan** with @orchestrator
2. **Implement** with @codebase
3. **Review** with @review
4. **Document** with @docs

## Examples

### Build API Feature
```
@orchestrator Plan user authentication API
@codebase Implement JWT auth endpoints
@review Security audit
@docs Create API documentation
```

### Fix Bug
```
@codebase Debug and fix login issue
@review Check for regressions
```

### Code Review
```
@review Audit payment module for security
```

## Tips

- Start with @orchestrator for complex tasks
- Use @codebase for direct implementation
- Always review plans before approval
- Add context to AGENTS.md for better results
- Adds comprehensive tests
- Validates build and tests pass

### Step 3: Security Review
```
@review Audit the authentication module for:
- Password hashing security
- JWT token expiration
- Rate limiting needs
- SQL injection prevention
- Input validation completeness
```

**Agent identifies:**
- ⚠️ Missing rate limiting on login
- ⚠️ No token refresh mechanism
- ✅ Passwords properly hashed with bcrypt

### Step 4: Fix Issues
```
@codebase Implement the findings:
- Add rate limiting to login endpoint
- Add refresh token mechanism
- Update tests
```

### Step 5: Document API
```
@docs Create API documentation showing:
- All endpoints with examples
- Authentication flow
- Error responses
- Setup instructions
```

**Workflow Complete!** 🎉

Agents handled: Planning → Implementation → Security → Fixes → Documentation

---

## Workflow 2: Refactor Monolith Module (1-2 hours)

**Goal:** Refactor user management from procedural to Clean Architecture.

### Step 1: Analyze Current State
```
@orchestrator Analyze current user management code:
- Identify tight coupling issues
- Find code duplication
- Map dependencies
- Propose layered structure
```

### Step 2: Create Migration Plan
```
@orchestrator Create refactoring plan:
- Keep all functionality identical
- Migrate incrementally
- Ensure tests don't break
- Minimize risk
```

### Step 3: Execute Migration
```
@codebase Execute refactoring plan step-by-step:
- Create new domain layer
- Extract business logic to services
- Implement repository pattern
- Migrate tests
- Remove old code
- Validate all tests pass
```

### Step 4: Quality Check
```
@review Verify refactoring quality:
- Architecture follows standards
- No functionality broken
- Performance unchanged
- Code readability improved
```

---

## Workflow 3: Create Python Data Pipeline (45 min)

**Goal:** Build data validation pipeline with testing.

### Step 1: Plan Architecture
```
@orchestrator Design data pipeline:
- Input validation
- Transformation logic
- Error handling
- Logging
- Unit tests
```

### Step 2: Implement Pipeline
```
@codebase Implement using Python best practices:
- Type hints on all functions
- Context managers for file handling
- Async for I/O operations
- pytest for testing
- Docstrings for all functions
```

**Agent creates:**
- Validators with type hints
- Async data loader
- Data transformer
- Comprehensive tests
- Proper logging

### Step 3: Test Coverage
```
@codebase Generate tests for:
- Happy path scenarios
- Edge cases (empty data, invalid formats)
- Error conditions
```

### Step 4: Document
```
@docs Create README with:
- Usage examples
- Configuration
- Error handling guide
```

---

## Workflow 4: Code Review & Improvement (20 min)

**Goal:** Review payment processing module before production.

### Step 1: Request Security Review
```
@review Audit payment processing for:
- PCI compliance
- Token handling
- Error messaging (no sensitive data)
- Logging (no payment details)
- Rate limiting
```

### Step 2: Address Findings
```
@codebase Fix the identified issues:
- Remove sensitive data from logs
- Add rate limiting
- Improve error messages
- Add token expiration
```

### Step 3: Re-Review
```
@review Verify all issues resolved
```

**Production ready!** ✓

---

## Workflow 5: Leadership: Team Issues (30 min)

**Goal:** Prepare for difficult 1-on-1 about missed deadlines.

### Step 1: Prepare Conversation
```
@em-advisor Help me prepare for 1-on-1 with Jane:
- She's missed 3 deadlines in 2 weeks
- Great developer, unusual pattern
- I want to understand root cause
- Help structure conversation
```

**Advisor suggests:**
- Opening questions to understand issues
- Frameworks for discussion
- Questions to ask
- Action planning approach
- Follow-up plan

### Step 2: Document Meeting
```
@em-advisor After meeting, help me document:
- Key discussion points
- Root causes identified
- Action items
- Next steps
- Support I'm providing
```

**Result:** Clear support plan, team member feels heard, issues resolved

---

## Workflow 6: Multi-Phase Feature (2-3 hours)

**Goal:** Implement user notification system with database, services, and API.

### Step 1: Orchestrate the Project
```
@orchestrator Build notification system with:
- Database schema (notifications table)
- Service layer (notification logic)
- API endpoints (send, retrieve)
- Admin dashboard (view logs)
- Unit tests
- Security review
- API documentation
```

**Orchestrator breaks into phases:**

**Phase 1 - Data Layer** (@codebase)
- Create Notification entity
- Add migrations
- Implement NotificationRepository

**Phase 2 - Business Logic** (@codebase)
- Create NotificationService
- Add business rules
- Implement queuing if needed

**Phase 3 - API Layer** (@codebase)
- Create endpoints
- Add request validation
- Implement authentication

**Phase 4 - Testing** (@codebase)
- Unit tests per layer
- Integration tests

**Phase 5 - Security** (@review)
- Audit for vulnerabilities
- Check rate limiting
- Verify auth/authz

**Phase 6 - Fixes** (@codebase)
- Address security findings

**Phase 7 - Documentation** (@docs)
- API docs
- Setup guide
- Configuration

**Phase 8 - Final Check** (@review)
- Approve for deployment

**Complete Notification System** 🚀

---

## General Patterns

### ✅ DO: Start with Planning
Always let @orchestrator propose a plan before implementing.

### ✅ DO: Review Plans
Take time to review and refine proposed plans.

### ✅ DO: Use Handoffs
Let agents transition between roles automatically.

### ✅ DO: Save Context
Accept agent proposals to update `AGENTS.md`.

### ❌ DON'T: Skip Planning
Jumping straight to implementation causes rework.

### ❌ DON'T: Ignore Review
Security and quality reviews catch issues early.

### ❌ DON'T: Skip Documentation
Document as you go, not after.

---

## Tips for Success

### Be Specific
```
✅ @codebase Create a rate limiter using Redis with 100 requests/hour per IP
❌ @codebase Add rate limiting
```

### Include Requirements
```
✅ @codebase Create payment processing with:
   - PCI compliance
   - Retry logic (3 attempts)
   - Timeout after 30s

❌ @codebase Create payment processing
```

### Leverage Context
```
✅ /code-review  (uses project standards automatically)
❌ @review Check this code
```

---

## Next Steps

- **[Agents Guide](./agents/README.md)** - Deep dive into each agent
- **[Prompts](./prompts.md)** - Slash command reference
- **[Customization](./customization.md)** - Tailor to your project
