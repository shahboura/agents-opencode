---
name: test-driven-development
description: >-
  Test-first implementation discipline: write the failing test, watch it fail,
  write minimal code to pass, refactor. Language- and framework-agnostic. Use
  when implementing any feature or bugfix, before writing implementation code.
license: MIT
compatibility: opencode
metadata:
  author: shahboura (methodology adapted from obra/superpowers, MIT)
  version: "1.0.0"
  audience: developers
  workflow: development
---

# Test-Driven Development (TDD)

## What I do

- Enforce write-test-first: no production code without a failing test
- Drive the RED → GREEN → REFACTOR cycle with verification at each step
- Keep tests honest (see `references/writing-good-tests.md`)

## When to use me

**Always:** new features, bug fixes, refactoring, behavior changes.

**Exceptions (ask the user):** generated code, configuration files, throwaway
prototypes. Visual/UI work is not exempt by default — ask the user, and a
Playwright or screenshot regression check may substitute for a unit test.

Thinking "skip TDD just this once"? Stop — that is rationalization.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before the test — **code you wrote in this session and have not
committed**? Delete it and start over: do not keep it as "reference", do not
adapt it, do not look at it. Implement fresh from tests. Never delete
pre-existing, committed, or user-authored code; if the situation is unclear,
ask the user before removing anything.

## The cycle

1. **RED** — write one minimal test showing what should happen.
2. **Verify RED** — run it and watch it fail for the expected reason (feature
   missing, not a typo). A test that passes immediately is testing existing
   behavior; fix the test.
3. **GREEN** — write the simplest code that passes. No extra features, no refactoring beyond the test.
4. **Verify GREEN** — run it; the new test passes and the project's suite stays
   green. Run the project's own test command, not just your file, and report any
   failure by name.
5. **REFACTOR** — remove duplication, improve names, extract helpers; stay green; add no behavior.
6. **Repeat** — next failing test for the next feature.

Commits are a separate concern: follow the repository's review/commit gate
rather than committing once per cycle.

### Good RED — clear name, real behavior, one thing

```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

### Bad RED — vague name, tests the mock instead of the code

```typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
```

### Good GREEN — just enough to pass

```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```

### Bad GREEN — over-engineered beyond the test

```typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; backoff?: 'linear' | 'exponential'; onRetry?: (n: number) => void }
): Promise<T> { /* YAGNI */ }
```

## Good tests

| Quality | Good | Bad |
|---------|------|-----|
| Minimal | One thing; "and" in the name → split it | `test('validates email and domain and whitespace')` |
| Clear | Name describes the behavior | `test('test1')` |
| Shows intent | Demonstrates the desired API | Obscures what the code should do |

When writing or changing any test, read `references/writing-good-tests.md`:
name the break the test catches, derive expectations by hand, assert real
behavior (never the mock), and keep test-only code in test utilities.

## Red flags — stop and start over

- Code written before the test
- Test passes immediately
- Cannot explain why the test failed
- "I'll add tests later" / "I already manually tested it"
- "Keep as reference" or "adapt existing code"
- "TDD is dogmatic, I'm being pragmatic"

## Common rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks; the test takes 30 seconds. |
| "I'll test after" | Tests written after pass immediately — which proves nothing. |
| "Tests after achieve the same goal" | Tests-after ask "what does this do?"; tests-first ask "what should this do?" |
| "Already manually tested" | Manual testing is ad-hoc: no record, no re-run, easy to miss cases. |
| "Deleting hours of work is wasteful" | Sunk cost — keeping code you cannot trust is the real waste. |
| "TDD slows me down" | TDD catches bugs before commit and lets you refactor without fear. |

## When stuck

| Problem | Solution |
|---------|----------|
| Do not know how to test | Write the wished-for API; write the assertion first; ask the user. |
| Test too complicated | The design is too complicated — simplify the interface. |
| Must mock everything | The code is too coupled — use dependency injection. |

## Debugging integration

Found a bug? Write a failing test that reproduces it first, then follow the
cycle — the test proves the fix and prevents regression. Security findings need
a regression test too: reproduce the flaw as a failing test before fixing it.
See `systematic-debugging` for the investigation discipline. Structural cleanups
belong to the `refactoring` skill — do them in the REFACTOR step with the
tests green.

## Final rule

```
Production code → a test exists and failed first
Otherwise → not TDD
```

## Provenance

Adapted from `obra/superpowers` (MIT), © 2025 Jesse Vincent. See
`THIRD_PARTY_NOTICES.md`.
