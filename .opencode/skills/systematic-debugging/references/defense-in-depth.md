# Defense-in-Depth Validation

**Load this reference when:** you have fixed a bug caused by invalid data and
want to make it structurally impossible rather than patched at one place.

## Overview

When you fix a bug caused by invalid data, adding validation at one place
feels sufficient. But that single check can be bypassed by a different code
path, a refactor, or a mock.

**Core principle:** Validate at EVERY layer the data passes through. Make the
bug structurally impossible.

## Why multiple layers

- Single validation: "we fixed the bug".
- Multiple layers: "we made the bug impossible".

Different layers catch different cases:

- Entry validation catches most bugs
- Business logic catches edge cases
- Environment guards prevent context-specific dangers
- Debug logging helps when other layers fail

## The four layers

### Layer 1 — Entry point validation

Reject obviously invalid input at the API boundary.

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### Layer 2 — Business logic validation

Ensure the data makes sense for this operation.

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### Layer 3 — Environment guards

Prevent dangerous operations in specific contexts.

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));
    if (!normalized.startsWith(tmpDir)) {
      throw new Error(`Refusing git init outside temp dir during tests: ${directory}`);
    }
  }
  // ... proceed
}
```

### Layer 4 — Debug instrumentation

Record diagnostic context for forensic analysis.

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', { directory, cwd: process.cwd(), stack });
  // ... proceed
}
```

## Applying the pattern

1. **Trace the data flow** — where does the bad value originate, and where is it used?
2. **Map all checkpoints** — list every point the data passes through.
3. **Add validation at each layer** — entry, business, environment, debug.
4. **Test each layer** — try to bypass layer 1 and verify layer 2 catches it.

## Key insight

All four layers are usually necessary. During testing, each layer catches
bugs the others missed:

- Different code paths bypassed entry validation
- Mocks bypassed business logic checks
- Platform-specific edge cases needed environment guards
- Debug logging identified structural misuse

Do not stop at one validation point. Add checks at every layer.

## Provenance

Adapted from `obra/superpowers` (MIT). Examples are generic and
language-agnostic in intent.
