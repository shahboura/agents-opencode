---
description: Create a refactoring plan for improving code quality without changing behavior
agent: planner
---

# Refactoring Plan Prompt

Create a comprehensive refactoring plan that improves code quality, maintainability, and performance while preserving existing behavior.

## Step 1: Identify Refactoring Goals

What needs improvement:
- [ ] **Code duplication** - Extract common logic
- [ ] **Complex functions** - Break into smaller pieces
- [ ] **Poor naming** - Improve clarity
- [ ] **Tight coupling** - Introduce abstractions
- [ ] **Missing tests** - Add test coverage
- [ ] **Performance** - Optimize hot paths
- [ ] **Technical debt** - Address known issues
- [ ] **Design patterns** - Apply appropriate patterns

## Step 2: Analyze Current State

### Code Smells Detected

1. **Long Methods/Functions**
   - [Function name]: [Line count] lines, [complexity score]
   - Does too much: [list responsibilities]

2. **Duplicate Code**
   - Pattern: [Description of repeated code]
   - Locations: [file1:line], [file2:line], [file3:line]

3. **Large Classes**
   - [Class name]: [methods/properties count]
   - Responsibilities: [list of mixed concerns]

4. **Feature Envy**
   - [Class A] heavily uses methods from [Class B]
   - Suggests: Move logic closer to data

5. **Primitive Obsession**
   - Using primitives instead of domain objects
   - Example: Email as string vs Email value object

6. **Switch/If-Else Chains**
   - [Location]: Large conditional logic
   - Better as: Strategy pattern or polymorphism

## Step 3: Create Refactoring Plan

```markdown
# Refactoring Plan: [Area/Feature Name]

## Overview
[What we're refactoring and why]

## Current Problems
1. [Problem 1 with impact]
2. [Problem 2 with impact]
3. [Problem 3 with impact]

## Goals
- [ ] Reduce complexity (Cyclomatic complexity < 10)
- [ ] Eliminate code duplication
- [ ] Improve testability
- [ ] Better separation of concerns
- [ ] Maintain backward compatibility

## Risk Assessment
**Risk Level:** Low / Medium / High

- Breaking changes: [Yes/No - Details]
- Test coverage: [Current %] → [Target %]
- Deployment risk: [Assessment]

---

## Refactoring Steps

### Phase 1: Preparation (Safety First)
**Goal:** Ensure safe refactoring with tests

#### Step 1: Add Missing Tests
**Why:** Prevent regressions during refactoring

**Tasks:**
- [ ] Add unit tests for [Function A]
- [ ] Add integration tests for [Feature B]
- [ ] Achieve 80%+ code coverage on target area

**Estimated time:** 2-3 days

---

### Phase 2: Extract & Simplify
**Goal:** Break down complex code into manageable pieces

#### Step 2: Extract Helper Functions
**Before:**
```typescript
function processOrder(order: Order) {
  // 200 lines of code doing everything
  // validation, calculation, persistence, notification
}
```

**After:**
```typescript
function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateTotal(order);
  saveOrder(order);
  notifyCustomer(order);
}

function validateOrder(order: Order) { /* ... */ }
function calculateTotal(order: Order): number { /* ... */ }
function saveOrder(order: Order): void { /* ... */ }
function notifyCustomer(order: Order): void { /* ... */ }
```

**Benefits:**
- ✅ Each function has single responsibility
- ✅ Easier to test individually
- ✅ More readable and maintainable

**Tasks:**
- [ ] Extract validation logic
- [ ] Extract calculation logic
- [ ] Extract persistence logic
- [ ] Extract notification logic
- [ ] Update tests

**Estimated time:** 1 day

---

#### Step 3: Eliminate Code Duplication
**Duplicate pattern found in:**
- `services/userService.ts:45`
- `services/adminService.ts:78`
- `services/guestService.ts:123`

**Solution:** Extract to shared utility

**Before:**
```typescript
// Repeated in 3 places
const email = input.trim().toLowerCase();
if (!email.includes('@') || email.length < 5) {
  throw new Error('Invalid email');
}
```

**After:**
```typescript
// Shared utility
function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@') || normalized.length < 5) {
    throw new Error('Invalid email');
  }
  return normalized;
}

// Usage
const email = validateEmail(input);
```

**Tasks:**
- [ ] Create `src/utils/validation.ts`
- [ ] Extract email validation
- [ ] Update all 3 call sites
- [ ] Add tests for utility

**Estimated time:** 0.5 days

---

### Phase 3: Improve Architecture
**Goal:** Better separation of concerns and testability

#### Step 4: Introduce Service Layer
**Current:** Controllers directly access database

**Target:** Controllers → Services → Repositories

**Changes:**
```
Before:
├── controllers/
│   └── userController.ts (200 lines, does everything)

After:
├── controllers/
│   └── userController.ts (50 lines, route handling only)
├── services/
│   └── userService.ts (business logic)
└── repositories/
    └── userRepository.ts (data access)
```

**Tasks:**
- [ ] Create `UserService` class
- [ ] Move business logic from controller
- [ ] Create `UserRepository` interface
- [ ] Implement repository
- [ ] Update controller to use service
- [ ] Add service tests
- [ ] Add repository tests

**Estimated time:** 2 days

---

#### Step 5: Apply Strategy Pattern
**Problem:** Large switch statement for payment processing

**Before:**
```typescript
function processPayment(type: string, amount: number) {
  switch(type) {
    case 'credit': /* 50 lines */ break;
    case 'debit': /* 50 lines */ break;
    case 'paypal': /* 50 lines */ break;
    // 5 more cases...
  }
}
```

**After:**
```typescript
interface PaymentStrategy {
  process(amount: number): Promise<PaymentResult>;
}

class CreditCardPayment implements PaymentStrategy { /* ... */ }
class DebitCardPayment implements PaymentStrategy { /* ... */ }
class PayPalPayment implements PaymentStrategy { /* ... */ }

const strategies = {
  credit: new CreditCardPayment(),
  debit: new DebitCardPayment(),
  paypal: new PayPalPayment(),
};

function processPayment(type: string, amount: number) {
  const strategy = strategies[type];
  return strategy.process(amount);
}
```

**Benefits:**
- ✅ Open/Closed principle - easy to add new payment types
- ✅ Each strategy isolated and testable
- ✅ Eliminates conditional complexity

**Tasks:**
- [ ] Create `PaymentStrategy` interface
- [ ] Implement concrete strategies
- [ ] Refactor processPayment
- [ ] Add tests for each strategy
- [ ] Update documentation

**Estimated time:** 3 days

---

### Phase 4: Performance Optimization
**Goal:** Improve performance without changing behavior

#### Step 6: Optimize Database Queries
**Problem:** N+1 query problem

**Before:**
```typescript
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  user.posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [user.id]);
}
```

**After:**
```typescript
const users = await db.query(`
  SELECT u.*, p.*
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.id
`);
// Map results to user objects with posts
```

**Expected improvement:** 100ms → 10ms for 100 users

**Tasks:**
- [ ] Identify N+1 queries
- [ ] Add eager loading
- [ ] Add database indexes
- [ ] Benchmark before/after
- [ ] Update documentation

**Estimated time:** 1 day

---

### Phase 5: Final Cleanup
**Goal:** Polish and document

#### Step 7: Improve Naming
- Rename ambiguous variables
- Use domain language consistently
- Remove abbreviations

#### Step 8: Add Documentation
- [ ] Update README with new architecture
- [ ] Add JSDoc/XML comments to public APIs
- [ ] Create architecture diagram
- [ ] Document design decisions (ADR)

**Estimated time:** 1 day

---

## Testing Strategy

### During Refactoring
1. Run tests after each small change
2. Use git commits as checkpoints
3. Never commit failing tests

### Validation
- [ ] All existing tests pass
- [ ] New tests for refactored code
- [ ] Integration tests still pass
- [ ] Performance benchmarks meet targets
- [ ] No regressions in functionality

### Test Coverage Goals
- Before: [Current %]
- After: [Target %] (minimum 80%)

---

## Rollout Plan

### Step 1: Refactor in Feature Branch
```bash
git checkout -b refactor/user-service
# Make changes
git push origin refactor/user-service
```

### Step 2: Code Review
- Request review from 2+ team members
- Address feedback
- Ensure all checks pass

### Step 3: Gradual Rollout
- Deploy to staging
- Run smoke tests
- Monitor for issues
- Deploy to production with feature flag
- Gradually increase traffic
- Monitor metrics

### Step 4: Cleanup
- Remove old code paths
- Update documentation
- Share learnings with team

---

## Success Criteria

After refactoring:
- [ ] All tests pass (100%)
- [ ] Code coverage ≥ 80%
- [ ] Cyclomatic complexity < 10 per function
- [ ] No code duplication
- [ ] Performance improved or maintained
- [ ] Documentation updated
- [ ] Team reviewed and approved

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | High | Comprehensive test suite first |
| Performance regression | Medium | Benchmark before/after |
| Merge conflicts | Low | Frequent rebasing, small PRs |
| Extended timeline | Medium | Break into smaller phases |

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Preparation | 2-3 days | None |
| Phase 2: Extract & Simplify | 2 days | Phase 1 |
| Phase 3: Architecture | 5 days | Phase 2 |
| Phase 4: Performance | 1 day | Phase 3 |
| Phase 5: Cleanup | 1 day | Phase 4 |
| **Total** | **11-12 days** | |

---

## Follow-up Actions

After refactoring:
- [ ] Schedule retrospective
- [ ] Document patterns for team
- [ ] Identify other areas needing refactoring
- [ ] Update coding standards
- [ ] Share lessons learned
```

## Refactoring Principles

1. **Preserve Behavior:** Functionality stays the same
2. **Small Steps:** Make tiny, verifiable changes
3. **Test First:** Ensure tests exist before refactoring
4. **Commit Often:** Each small change is a commit
5. **Review Code:** Get feedback early and often

## Common Refactoring Patterns

### Extract Method
Break large functions into smaller ones

### Extract Class
Move related methods to new class

### Rename
Improve clarity of names

### Introduce Parameter Object
Group related parameters

### Replace Conditional with Polymorphism
Use strategy/factory patterns

### Simplify Conditional
Reduce nested if-else

## Checklist Before Starting

- [ ] Team agreement on goals
- [ ] Adequate test coverage
- [ ] Time allocated in sprint
- [ ] Backup/rollback plan ready
- [ ] Stakeholders informed
