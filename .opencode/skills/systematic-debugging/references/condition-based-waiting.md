# Condition-Based Waiting

**Load this reference when:** a test uses arbitrary delays (`setTimeout`,
`sleep`), tests are flaky, or tests time out when run in parallel.

## Overview

Flaky tests often guess at timing with arbitrary delays, creating race
conditions where tests pass on fast machines but fail under load or in CI.

**Core principle:** Wait for the actual condition you care about, not a guess
about how long it takes.

## When to use

- Tests have arbitrary delays (`setTimeout`, `sleep`, `time.sleep()`)
- Tests are flaky — pass sometimes, fail under load
- Tests time out when run in parallel
- Waiting for async operations to complete

## When NOT to use

- You are testing actual timing behavior (debounce, throttle intervals)
- If you must use an arbitrary timeout, document WHY

## Core pattern

```typescript
// ❌ BEFORE: guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// ✅ AFTER: waiting for the condition (the description is required)
await waitFor(() => getResult() !== undefined, 'result to be defined');
const result = getResult();
expect(result).toBeDefined();
```

## Quick patterns

The second argument to `waitFor` is a required description used in the timeout
error.

| Scenario | Pattern |
|----------|---------|
| Wait for event | `waitFor(() => events.find(e => e.type === 'DONE'), 'done event')` |
| Wait for state | `waitFor(() => machine.state === 'ready', 'machine ready')` |
| Wait for count | `waitFor(() => items.length >= 5, 'five items')` |
| Wait for file | `waitFor(() => fs.existsSync(path), 'file to exist')` |
| Complex condition | `waitFor(() => obj.ready && obj.value > 10, 'object ready')` |

## Implementation

Generic polling helper:

```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) return result;

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }

    await new Promise(r => setTimeout(r, 10)); // Poll every 10ms
  }
}
```

## Common mistakes

- **Polling too fast** (`setTimeout(check, 1)`) — wastes CPU; poll every ~10ms.
- **No timeout** — loops forever if the condition never becomes true; always include a timeout with a clear error.
- **Stale data** — caching state before the loop; call the getter inside the loop for fresh data.

## When an arbitrary timeout IS correct

```typescript
// Illustrative — `waitFor` is the helper defined above.
await waitFor(() => started(manager), 'tool started'); // first: wait for the condition
await new Promise(r => setTimeout(r, 200));            // then: wait for timed behavior
// 200ms = 2 ticks at 100ms intervals — documented and justified
```

Requirements:

1. First wait for the triggering condition.
2. Base the delay on known timing, not a guess.
3. Comment explaining WHY.

## Provenance

Adapted from `obra/superpowers` (MIT).
