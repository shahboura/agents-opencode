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

## What I do

- Trace reverse dependencies from a changed symbol to every caller, importer, and consumer
- Hunt silent behavioral ripples the compiler can't catch
- Run the project's own typecheck, build, test, and lint to prove nothing broke
- Deliver a structured verdict: SAFE, SAFE WITH CAVEATS, or IMPACT FOUND

Run it against the VCS diff — it adapts to whatever language and tooling the
repo uses by discovering the project's conventions first.

## When to use me

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
   (for a whole branch: `git diff <base>...HEAD`)
2. **Languages + ecosystems** — from manifests (`package.json`, `pyproject.toml`,
   `go.mod`, `pom.xml`/`build.gradle`, `*.csproj`, `Gemfile`, `Cargo.toml`)
3. **Verification commands** — typecheck, build, test, lint from manifests or CI.
   Note targeted test scripts (named per area) — they verify a specific blast
   radius far cheaper than the full suite.

Classify each changed file by coupling class:

| Changed file is… | Reach |
|---|---|
| shared/core/common/util module | **wide** — every importer |
| public/exported symbol, barrel/index, package public API | every caller, in and out of module |
| type / interface / schema / `.proto` | compiler-caught in typed langs; **silent** in dynamic |
| serialized contract (REST/GraphQL/DTO/protobuf) | cross-service — the other side of the wire |
| config/registry (route table, DI, feature flags) | fan-out — everything derived from it |
| DB schema / migration / ORM model | data layer — queries, models, other services |
| generated, duplicated, or cross-language **twin** file | paired — its twin must change in lockstep |
| global config / styles / theme / i18n strings | **global, silent** — no compiler signal |
| build / deps / lockfile / Dockerfile / CI | the whole app |
| internal change in a single leaf file | **local** — small verify, done |

If discovery is ambiguous, state findings and ask the user to confirm.

### Phase 2 — Trace reverse dependencies

For each changed symbol, find who depends on it. The shape (per `references/recipes.md` §1):
```bash
rg -n "<import-form-for-this-language targeting the changed module>" <root> -l
rg -n "\b<SymbolName>\b" <root> -l
# for a contract change: who is on the other side of the wire?
rg -n "<endpoint path | message name | field name>" <root>
```
Build two buckets: **directly impacted** (import/call the changed symbol) and
**transitively impacted** (depend on the directly-impacted). One hop is usually
enough; go deeper for shared/core and public-API changes. Map impacted code
to user-facing surfaces (route, endpoint, command, job).

### Phase 3 — Hunt silent ripples (what the compiler can't see)

For each directly-impacted site, ask: did the change alter a **shape, signature,
default, side effect, or invariant** — or is it internal and safe? Then check
four categories of silent risk:

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

Run the commands discovered in Phase 1, cheapest signal first, scaled to blast radius:
1. Typecheck / compile — catches build-caught ripples fast
2. Build — if shared/entry-point/build-path code was touched
3. Tests — prefer targeted suites matching the impacted area
4. Lint / static analysis — if the project gates on it
5. Exercise impacted surfaces — hit the affected routes, endpoints, CLI commands

A green local build is not the same as deployed — never claim a change is live
in an environment you didn't check.

### Phase 5 — Report

Always use this structure:

```
# Code Change Impact: <one-line description>

## Verdict: SAFE | SAFE WITH CAVEATS | IMPACT FOUND

## Project
- languages: <…>   verify: typecheck=<…> build=<…> test=<…>

## Epicenter
- <file:line> — <coupling class> — <what changed (shape/default/internal/…)>

## Blast radius
### Directly impacted
- <file/surface> — <route/endpoint/command> — <why> — risk: High|Med|Low
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
  List each breakage with file + fix. State it plainly, don't soften it — this is
  the outcome the skill exists to catch.

## Scope Discipline

- **Analyze; don't silently fix.** If you find collateral damage, report it and propose
  the fix — let the user decide whether the change should grow.
- **Match effort to reach.** An internal one-liner in a leaf file needs a typecheck and
  a glance. A shared/core, public-API, schema, or contract change earns the whole pipeline.
- **When unsure, say so.** If a ripple might be real but you can't confirm, put it on the
  residual checklist rather than declaring SAFE.

## Validation Commands

```bash
# Manual verification checklist — no automated validation
# [ ] Coupling class assigned to every changed file
# [ ] Reverse-dependency grep run for each changed symbol
# [ ] Four silent-risk categories checked against impacted sites
# [ ] Typecheck + build + targeted tests pass
# [ ] Verdict matches evidence (SAFE / SAFE WITH CAVEATS / IMPACT FOUND)
# [ ] Residual checklist populated if anything unverifiable
```

## Quick Reference

- `references/recipes.md` — Per-ecosystem grep recipes for reverse-dependency
  tracing, verify-command detection, mirror-file finder, and surface-mapping.
