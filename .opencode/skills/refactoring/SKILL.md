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

- **Decide what should not exist first:** apply the deletion test and YAGNI before
  proposing any extraction
- Detect code smells from the twelve-smell baseline in `references/code-smells.md`
- Produce a phased refactoring plan that preserves existing behavior
- Define risk mitigations and measurable success criteria

## When to use me

Activate this skill when:

- Code shows duplication, high complexity, or poor separation of concerns
- A module or class has grown too large to maintain safely
- You need a safe, test-first improvement roadmap before touching production code
- Any request containing "refactor", "clean up", "reduce complexity",
  "restructure", "break apart", or "eliminate duplication"

## Key Rules

### Refactoring Principles (always apply, in this order)

1. **Delete first (YAGNI)** — the safest refactor is removing code nobody needs. Dead
   code, unused flags, single-use indirection: delete before you extract, rename, or
   abstract. Extraction adds lines; deletion cannot regress behavior nobody uses.
2. **Apply the deletion test** — delete the module and see where the complexity lands.
   If it concentrates in the callers, the module earns its keep. If it vanishes, the
   module was a pass-through — leave it deleted. Run this test before defending any
   seam, wrapper, or layer.
3. **Speculative generality gets deleted or inlined** — an abstraction with one caller
   and no scheduled second caller is a guess. Inline it until a real need exists.
4. **One adapter is a hypothetical seam; two adapters make it real** — do not add an
   interface, port, or factory until a second implementation is on the roadmap. A seam
   with one implementation is a wrapper with extra files.
5. **Preserve Behavior** — functionality stays the same; refactoring is not rewriting
6. **Small Steps** — make tiny, verifiable changes so every commit is safe to revert
7. **Test First** — ensure tests exist before refactoring; add missing coverage first
8. **Commit Often** — each small change is its own checkpoint
9. **Review Code** — get feedback early and often

Deletion first does not weaken rule 5: removing unused code changes behavior for nobody.
If a piece of code has a live caller, it is not a deletion candidate — refactor it instead.

### Code Smell Detection

Before building the plan, scan the target area. The baseline catalogue of twelve
Fowler smells — what each one is, its signal, and how to fix it — lives in
`references/code-smells.md`. Read the entries matching what you find; do not carry the
whole list into the plan.

### Five-Phase Refactoring Plan

#### Phase 1 — Preparation (Safety First)

**Goal:** Build a safety net so changes can be verified.

- Add unit tests for every function/method in the target area
- Add integration tests for features that cross module boundaries
- Achieve ≥80% code coverage on the target area before touching production code
- Run the full suite and confirm all tests pass

#### Phase 2 — Extract & Simplify

**Goal:** Delete what has no caller, then break down what remains into
single-responsibility pieces.

- Delete first: dead code, unused exports, unreferenced flags and config, and any
  abstraction with a single implementation and no second one scheduled. Apply the
  deletion test before keeping a module.
- Extract helper functions: pull validation, calculation, persistence, and
  notification out of monolithic functions
- Eliminate duplication: identify repeated patterns across files, extract to a
  shared utility, update all call sites, and add dedicated tests
- Verify: run the full test suite after each extraction

#### Phase 3 — Improve Architecture

**Goal:** Better separation of concerns and testability.

- Introduce a service layer only when a second consumer or a test seam already
  exists (Controllers → Services → Repositories / Functions → Services → Data)
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

### Risk Assessment Format

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | High | Comprehensive test suite first |
| Performance regression | Medium | Benchmark before/after each phase |
| Merge conflicts | Low | Frequent rebasing, small PRs |
| Scope creep | Medium | Stick to phases; defer feature changes |

### Success Criteria

After refactoring:

- [ ] All tests pass (100%)
- [ ] Code coverage ≥80%
- [ ] Cyclomatic complexity <10 per function
- [ ] No unremediated code duplication
- [ ] Performance improved or maintained (measured)
- [ ] Documentation updated
- [ ] No behavior change — the suite passed before and after

## Validation Commands

```bash
# Manual verification checklist — no automated validation
# [ ] Deletion was considered first: the deletion test was applied and YAGNI reviewed
# [ ] Remaining refactoring principles (behavior, small steps, tests) are observed
# [ ] Code smells are named from references/code-smells.md, with severity and fix
# [ ] Each phase has concrete, verifiable tasks (not "improve code")
# [ ] Risks and mitigations are listed
# [ ] Success criteria are measurable (not "code is better")
# [ ] The plan preserves existing behavior — no feature changes included
```
