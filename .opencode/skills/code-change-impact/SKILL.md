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
- A change touches shared/core code, a public API, a type/interface, a serialized
  contract, a DB schema, or global config — anything with non-obvious blast radius
- You need to prove a fix didn't break other features before merging
- Any request containing "did this break anything", "what else does this affect",
  "check the impact", "is this safe to merge", or "regression check"

## Methodology

### Phase 1 — Discover the project + pin the epicenter

Establish the repo context:
1. **Repo root + diff** — `git rev-parse --show-toplevel` then `git diff HEAD`
2. **Languages + ecosystems** — from manifests and file extensions
3. **Verification commands** — typecheck, build, test, lint from manifests or CI

Classify each changed file by coupling class:

| Changed file is… | Reach |
|---|---|
| shared/core/common/util module | **wide** — every importer |
| public/exported symbol, barrel/index, package public API | every caller, in and out of module |
| type / interface / schema / `.proto` | compiler-caught in typed langs; **silent** in dynamic |
| serialized contract (REST/GraphQL/DTO/protobuf) | cross-service — the other side of the wire |
| config/registry (route table, DI, feature flags) | fan-out — everything derived from it |
| DB schema / migration / ORM model | data layer — queries, models, other services |
| global config / styles / theme / i18n strings | **global, silent** — no compiler signal |
| build / deps / lockfile / Dockerfile / CI | the whole app |
| internal change in a single leaf file | **local** — small verify, done |

If discovery is ambiguous, state findings and ask the user to confirm.

### Phase 2 — Trace reverse dependencies

For each changed symbol, find who depends on it. The shape (per `references/recipes.md` §1):
```bash
rg -n "<import-form-for-this-language targeting the changed module>" <root> -l
rg -n "\b<SymbolName>\b" <root> -l
```
Build two buckets: **directly impacted** (import/call the changed symbol) and
**transitively impacted** (depend on the directly-impacted). Map impacted code
to user-facing surfaces (route, endpoint, command, job).

### Phase 3 — Hunt silent ripples (what the compiler can't see)

For each directly-impacted site, check four categories of silent risk:

- **Shape drift** — serialization changes (nullable field, enum added, default
  changed), mirror/twin files out of sync (generated code, cross-language
  constants), regex/validation predicate changes
- **Behavioral shift** — changed defaults, sort order, comparator, rounding,
  cache/memo key change, error-handling control flow
- **Environment sensitivity** — locale/time/number formatting, feature-flag
  defaults, theme/token/i18n strings
- **Runtime hazards** — concurrency boundaries, transaction scope, retry policy,
  global mutable state, persisted client state holding an old shape after upgrade

Dynamic languages (Python/Ruby/JS) have no compiler net — weight Phase 3 heavier
for those stacks.

### Phase 4 — Verify (prove it, don't assert it)

Run the commands discovered in Phase 0, cheapest signal first:
1. Typecheck / compile — catches build-caught ripples fast
2. Build — if shared/entry-point/build-path code was touched
3. Tests — prefer targeted suites matching the impacted area
4. Lint / static analysis — if the project gates on it
5. Exercise impacted surfaces — hit the affected routes, endpoints, CLI commands

### Phase 5 — Report

Always use this structure:

```
# Code Change Impact: <one-line description>

## Verdict: SAFE | SAFE WITH CAVEATS | IMPACT FOUND

## Project
- languages: <…>   verify: typecheck=<…> build=<…> test=<…>

## Epicenter
- <file:line> — <coupling class> — <what changed>

## Blast radius
### Directly impacted
- <file/surface> — <route/endpoint/command> — risk: High|Med|Low
### Transitively impacted
- <…>  (or "none beyond build-checked usages")

## Mirror / twin files
- <generated or duplicated file> — in sync? yes/NO

## Silent-risk callouts
- <…>  (or "none identified")

## Verification
- typecheck/compile: PASS/FAIL   build: PASS/FAIL/skipped
- tests: <which ran> → PASS/FAIL
- surfaces exercised: <list> → clean? errors?

## Residual checklist
- [ ] <thing not auto-verifiable>
```

**Verdict rules:**
- **SAFE** — fully traced, twin files in sync, build/tests pass, surfaces clean, no silent risks.
- **SAFE WITH CAVEATS** — passes but residual checks remain. List them; don't paper over them.
- **IMPACT FOUND** — a twin is out of sync, a consumer breaks, or a silent ripple is confirmed.
  List each breakage with file + fix. This is the outcome the skill exists to catch.

## Quick Reference

- `references/recipes.md` — Per-ecosystem grep recipes for reverse-dependency
  tracing, verify-command detection, mirror-file finder, and surface-mapping.
