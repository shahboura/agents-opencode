# Root Cause Tracing

**Load this reference when:** a bug appears deep in a call stack, a stack
trace shows a long chain, or you cannot tell where invalid data originated.

## Overview

Bugs often manifest deep in the call stack — a command runs in the wrong
directory, a file lands in the wrong place, a database opens with the wrong
path. The instinct is to fix where the error appears, but that treats a
symptom.

**Core principle:** Trace backward through the call chain until you find the
original trigger, then fix at the source.

## When to use

- The error happens deep in execution, not at the entry point
- The stack trace shows a long call chain
- It is unclear where invalid data originated
- You need to find which test or code path triggers the problem

If the bug does not appear deep in the stack, or cannot be traced backward,
fix at the symptom point — but also consider adding defense-in-depth (see
`defense-in-depth.md`).

## The tracing process

1. **Observe the symptom.**
   ```
   Error: git init failed in ~/project/packages/core
   ```
2. **Find the immediate cause** — what code directly causes this?
   ```typescript
   await execFileAsync('git', ['init'], { cwd: projectDir });
   ```
3. **Ask what called this** — walk up the chain:
   ```
   WorktreeManager.createSessionWorktree(projectDir, sessionId)
     → Session.initializeWorkspace()
     → Session.create()
     → test at Project.create()
   ```
4. **Keep tracing up** — inspect the values passed. A `projectDir` of `''`
   (empty string) resolves `cwd` to `process.cwd()`: the source directory.
5. **Find the original trigger** — where did the empty string come from?
   ```typescript
   const context = setupCoreTest(); // Returns { tempDir: '' }
   Project.create('name', context.tempDir); // accessed before beforeEach!
   ```

## Adding stack traces

When you cannot trace manually, add instrumentation before the problematic
operation (not after it fails):

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    stack,
  });

  await execFileAsync('git', ['init'], { cwd: directory });
}
```

- Use `console.error()` in tests — loggers may be suppressed.
- Capture output (`npm test 2>&1 | grep 'DEBUG git init'`; on Windows
  PowerShell use `Select-String 'DEBUG git init'`) and look for the test file
  and line that triggers the call.

## Finding which test causes pollution

If a side effect appears during a test run but the culprit is unknown, run
the suite one test at a time (or bisect the test files) and stop at the
first run that reproduces the pollution.

## Key principle

Found the immediate cause → can you trace one level up?
- **Yes** → trace backward; is this the source? If not, keep going.
- **No** → never fix just the symptom.
- When the source is found → fix at source, then add validation at each
  layer so the bug becomes structurally impossible.

**NEVER fix just where the error appears.** Trace back to the original
trigger.

## Stack trace tips

- **In tests:** use `console.error()`, not a logger that may be suppressed.
- **Before the operation:** log before the dangerous call, not after failure.
- **Include context:** directory, cwd, environment variables, timestamps — but log only the specific non-sensitive values needed; never log secrets, tokens, or PII.
- **Capture the stack:** `new Error().stack` shows the complete call chain.

## Provenance

Adapted from `obra/superpowers` (MIT). Illustrative examples are generic;
the technique is language- and framework-agnostic.
