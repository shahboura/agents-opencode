---
name: refactoring
description: >-
  Systematic refactoring plan creation — detect code smells, phase improvements
  safely, and deliver a step-by-step rollout with success criteria. Language-
  and framework-agnostic.
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "1.0.0"
  audience: developers
  workflow: development
---

# Refactoring — structured improvement without behavior change

## What I do

- Detect code smells: long methods, duplicate code, large classes, feature envy,
  primitive obsession, and switch/if-else chains
- Produce a phased refactoring plan that preserves existing behavior
- Recommend applicable patterns for each problem area
- Define rollout steps, risk mitigations, and measurable success criteria

## When to use me

Activate this skill when:

- Code shows duplication, high complexity, or poor separation of concerns
- A module or class has grown too large to maintain safely
- You need a safe, test-first improvement roadmap before touching production code
- Any request containing "refactor", "clean up", "reduce complexity",
  "restructure", "break apart", or "eliminate duplication"

## Key Rules

### Refactoring Principles (always apply)

1. **Preserve Behavior** — functionality stays the same; refactoring is not rewriting
2. **Small Steps** — make tiny, verifiable changes so every commit is safe to revert
3. **Test First** — ensure tests exist before refactoring; add missing coverage first
4. **Commit Often** — each small change is its own checkpoint
5. **Review Code** — get feedback early and often

### Code Smell Detection

Before building the plan, scan the target area for:

| Smell | Signal | Typical Fix |
|---|---|---|
| Long methods/functions | >~30 lines or high cyclomatic complexity | Extract method |
| Duplicate code | Same logic in 2+ locations | Extract shared utility |
| Large classes | >~10 public methods or mixed concerns | Extract class / delegate |
| Feature envy | One class heavily accesses another's internals | Move method to data |
| Primitive obsession | Primitives used where domain types belong | Value object / domain type |
| Switch/if-else chains | Long conditional blocks, especially on type codes | Strategy or polymorphism |

### Five-Phase Refactoring Plan

#### Phase 1 — Preparation (Safety First)

**Goal:** Build a safety net so changes can be verified.

- Add unit tests for every function/method in the target area
- Add integration tests for features that cross module boundaries
- Achieve ≥80% code coverage on the target area before touching production code
- Run the full suite and confirm all tests pass

#### Phase 2 — Extract & Simplify

**Goal:** Break down complex code into manageable, single-responsibility pieces.

- Extract helper functions: pull validation, calculation, persistence, and
  notification out of monolithic functions
- Eliminate duplication: identify repeated patterns across files, extract to a
  shared utility, update all call sites, and add dedicated tests
- Verify: run the full test suite after each extraction

#### Phase 3 — Improve Architecture

**Goal:** Better separation of concerns and testability.

- Introduce a service layer when controllers/functions directly access data
  sources (Controllers → Services → Repositories / Functions → Services → Data)
- Replace large switch/if-else chains on type codes with the Strategy pattern
  (interface + concrete implementations + lookup map)
- Move business logic close to the data it operates on (resolve feature envy)
- Verify: all existing tests still pass; add tests for new layers

#### Phase 4 — Performance Optimization

**Goal:** Improve performance without changing behavior.

- Identify N+1 query problems and add eager loading or batched fetches
- Add missing database indexes on join columns and common filter predicates
- Benchmark before and after each change; do not "optimize" without data
- Verify: behavior unchanged, performance metrics improved

#### Phase 5 — Final Cleanup

**Goal:** Polish and document.

- Rename ambiguous variables to domain-language names; remove abbreviations
- Add API documentation (JSDoc, XML doc comments, or equivalent)
- Update architecture documentation and record design decisions
- Verify: all tests pass, documentation is current

### Common Refactoring Patterns

| Pattern | When to apply |
|---|---|
| **Extract Method** | A function does too many things or exceeds ~30 lines |
| **Extract Class** | A class has mixed concerns or too many public methods |
| **Rename** | Names are ambiguous, abbreviated, or misaligned with domain language |
| **Introduce Parameter Object** | Groups of related parameters appear in multiple signatures |
| **Replace Conditional with Polymorphism** | Switch/if-else chains on type codes drive behavior selection |
| **Simplify Conditional** | Nested if-else or complex boolean expressions reduce readability |

### Rollout Plan

1. **Feature branch** — `git checkout -b refactor/<area>`, make changes, push
2. **Code review** — request review from 2+ team members, address all feedback
3. **Staged rollout** — deploy to staging, run smoke tests, monitor for issues
4. **Production with safety** — deploy behind a feature flag if possible,
   gradually increase traffic, monitor metrics
5. **Cleanup** — remove old code paths, update documentation, share learnings

### Success Criteria

After refactoring:

- [ ] All tests pass (100%)
- [ ] Code coverage ≥80%
- [ ] Cyclomatic complexity <10 per function
- [ ] No unremediated code duplication
- [ ] Performance improved or maintained (measured)
- [ ] Documentation updated
- [ ] Team reviewed and approved

## Validation Commands

```bash
# Manual verification checklist — no automated validation
# [ ] All five refactoring principles are observed in the plan
# [ ] Code smells catalogued with severity and fix recommendation
# [ ] Each phase has concrete, verifiable tasks (not "improve code")
# [ ] Rollout steps include staging gate before production
# [ ] Success criteria are measurable (not "code is better")
# [ ] The plan preserves existing behavior — no feature changes included
```
