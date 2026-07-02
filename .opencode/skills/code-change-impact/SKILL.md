---
name: code-change-impact
description: >-
  Trace the impact (blast radius) of a code change in ANY codebase and prove it
  didn't break anything else — language- and framework-agnostic. Use RIGHT AFTER
  a fix, before committing or opening a PR.
license: MIT
compatibility: opencode
metadata:
  author: mghareeb (upstream), adapted for agents-opencode
  version: "1.0.0"
  audience: developers
  workflow: code-review
  upstream: https://github.com/mghareeb/code-change-impact
---

# Code Change Impact — blast-radius / regression analysis for any codebase

A fix is "done" only when you know what it touched *besides* the thing you were
fixing. This skill finds those ripples, then **proves** the answer by running
the project's own build/test/lint and exercising the impacted surfaces.

Run it after a change, against the **VCS diff** (the diff is the source of truth
for "what changed"). It adapts to the language and tooling of whatever repo it's
in — so Phase 0 (discovery) comes first and the rest builds on it.

## Phase 0 — Discover the project (do this before analyzing)

Establish:
1. **Repo root + diff** — `git rev-parse --show-toplevel`; then the change set
   (working tree, staged, or branch-vs-base).
2. **Languages + ecosystems** — from manifests and file extensions.
3. **Verification commands** — typecheck, build, test, lint commands from manifests
   or CI config (see `references/recipes.md` §2).
4. **Module + import style** — how the language names and imports modules.

If discovery is ambiguous, state what you found and ask the user to confirm.

## The five phases

### Phase 1 — Pin the epicenter
```bash
git -C <root> status --short
git -C <root> diff --stat HEAD
git -C <root> diff HEAD
```
Classify each changed file by coupling class (see `references/recipes.md` §3).

### Phase 2 — Trace reverse dependencies
For each changed symbol, find who depends on it. Recipes per ecosystem are in
`references/recipes.md` §1. Build two buckets: **directly impacted** and
**transitively impacted**.

### Phase 3 — Behavioral impact (what the compiler can't see)
Split the risk:
- **Build-caught ripples** — signature/shape changes in typed languages.
- **Silent ripples** — same types, different behavior. Catalogued in
  `references/recipes.md` §4.

### Phase 4 — Verify (prove it, don't assert it)
Run commands discovered in Phase 0, cheapest signal first:
1. Typecheck / compile
2. Build
3. Tests (prefer targeted suites)
4. Lint / static analysis
5. Exercise impacted surfaces

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
- <file / surface> — <route/endpoint/command> — <why> — risk: High|Med|Low
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

### Verdict rules
- **SAFE** — fully traced, all checks pass, no silent risks.
- **SAFE WITH CAVEATS** — passes but residual checks remain.
- **IMPACT FOUND** — a twin is out of sync or a consumer breaks.

## Quick Reference

- `references/recipes.md` — Per-ecosystem grep recipes, coupling taxonomy,
  silent-risk catalog, surface-mapping cheats.

---

> Upstream source: [mghareeb/code-change-impact](https://github.com/mghareeb/code-change-impact)
> (MIT licensed). Adapted for OpenCode agent skill format.
