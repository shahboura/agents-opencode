---
name: code-change-impact
description: >-
  Trace the blast radius of a code change, find silent ripples the compiler
  can't catch, and prove it didn't break anything else. Language- and
  framework-agnostic. Use after a fix, before committing or opening a PR.
license: MIT
compatibility: opencode
metadata:
  author: shahboura (methodology adapted from mghareeb/code-change-impact, MIT)
  version: "1.0.0"
  audience: developers
  workflow: code-review
---

# Code Change Impact — blast-radius / regression analysis

A fix is "done" only when you know what it touched *besides* the thing you were
fixing. This skill traces reverse dependencies, hunts silent behavioral ripples,
runs the project's own verification commands, and delivers a verdict.

Run it against the VCS diff — it adapts to whatever language and tooling the
repo uses by discovering the project's conventions first.

## When to Activate

Activate this skill when:
- Assessing whether a code change is safe to merge or push
- A change touched shared/core/common code, a public API, a type/interface,
  a serialized contract (REST/GraphQL/DTO), a DB schema, or global config
- You need to prove a fix didn't break other features
- Before opening a PR on a change with non-obvious blast radius
- Any request containing "did this break anything", "what else does this affect",
  "check the impact / blast radius", "side effects of this change",
  "is this safe to merge", "regression check", or "what depends on this"

## Methodology

### Phase 0 — Discover the project

Establish before analyzing:
1. **Repo root + diff** — `git rev-parse --show-toplevel`; then the change set
2. **Languages + ecosystems** — from manifests and file extensions
3. **Verification commands** — typecheck, build, test, lint from manifests or CI
4. **Module + import style** — how the language names and imports modules

If discovery is ambiguous, state what you found and ask the user to confirm.

### Phase 1 — Pin the epicenter

```bash
git -C <root> status --short
git -C <root> diff --stat HEAD
git -C <root> diff HEAD
```

Classify each changed file by coupling class:

| Changed file is… | Reach | Where it ripples |
|---|---|---|
| shared/core/common/util module | **wide** | every importer |
| a public/exported symbol, package public API, barrel/index | callers in + out of module | every caller |
| a type / interface / schema / `.proto` | wide | usages (compiler-caught in typed langs; **silent** in dynamic) |
| a serialized contract (REST/GraphQL/DTO/protobuf/event) | cross-service | the other side of the wire |
| a config/registry (route table, DI container, plugin list, feature flags) | fan-out | everything derived from it |
| a DB schema / migration / ORM model | data layer | queries, models, other services |
| global config / styles / theme / i18n strings | **global, silent** | every screen/string, no compiler signal |
| build / deps / lockfile / Dockerfile / CI | build & runtime | the whole app |
| an internal change in a single leaf file | **local** | itself — small verify, done |

### Phase 2 — Trace reverse dependencies

For each changed symbol, find who depends on it. Per-ecosystem grep recipes are
in `references/recipes.md`. Build two buckets: **directly impacted** (import/call
the changed symbol) and **transitively impacted** (depend on the directly-impacted).
Map impacted code to user-facing surfaces (route, endpoint, command, job).

### Phase 3 — Behavioral impact (what the compiler can't see)

Hunt silent ripples — same types, different behavior. Catalog:

- Cache/memo key change, changed default/sort/comparator/rounding
- Serialization drift (field made nullable/optional, enum value added)
- Global mutable state, singleton shape, persisted client state
- Concurrency boundaries, transaction scope, retry policy
- Locale/time zone/number/date formatting
- Regex/validation predicate change
- Feature-flag/env-var default flip
- Error-handling control flow change
- Theme/token/i18n string change
- Mirror/twin files out of sync (generated code with `// Code generated` header,
  cross-language duplicated constants, paired golden files/snapshots)

Dynamic languages (Python/Ruby/JS) have no compiler net — weight Phase 3 heavier.

### Phase 4 — Verify (prove it, don't assert it)

Run the commands discovered in Phase 0, cheapest signal first:
1. Typecheck / compile — catches build-caught ripples fast
2. Build — if shared/entry-point/build-path code was touched
3. Tests — prefer targeted suites matching the impacted area
4. Lint / static analysis — if the project gates on it
5. Exercise impacted surfaces — hit the affected routes, endpoints, CLI commands

### Phase 5 — Report

```
# Code Change Impact: <one-line description>

## Verdict: SAFE | SAFE WITH CAVEATS | IMPACT FOUND

## Project (discovered)
- languages/ecosystems: <…>   verify cmds: typecheck=<…> build=<…> test=<…>

## Epicenter
- <file:line> — <coupling class> — <what changed>

## Blast radius
### Directly impacted
- <file / surface> — <route/endpoint/command> — risk: High|Med|Low
### Transitively impacted
- <…>  (or "none beyond build-checked usages")

## Mirror / twin files
- <generated or duplicated file> — in sync? yes/NO

## Silent-risk callouts
- <…>  (or "none identified")

## Verification
- typecheck/compile: PASS/FAIL
- build: PASS/FAIL/skipped
- tests: <which ran> → PASS/FAIL
- surfaces exercised: <list> → clean? errors?

## Residual risk & manual checklist
- [ ] <thing not auto-verifiable>
```

**Verdict rules:**
- **SAFE** — blast radius traced; mirror/twin files in sync; typecheck +
  warranted build/tests pass; impacted surfaces exercised clean; no silent risks.
- **SAFE WITH CAVEATS** — passes, but residual checks remain. List them as
  checkboxes; don't paper over them.
- **IMPACT FOUND** — a twin is out of sync, a consumer breaks at compile/runtime,
  or a silent ripple is confirmed. List each breakage with file + fix.

## Quick Reference

- `references/recipes.md` — Per-ecosystem grep recipes for reverse-dependency
  tracing, verify-command detection, mirror-file finder, and surface-mapping.
