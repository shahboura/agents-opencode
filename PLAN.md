# Adoption Plan

Status: active. Branch: `chore/trim-and-writing-skills` (trim + writing skills).
No commits until the diff is reviewed and approved.

## Purpose

The pack is strong at governance (permissions, gates, validators) and weaker at craft
(alignment, design, writing, anti-slop) and at proving its own value. This plan closes
those gaps in the cheapest order: measure, delete, add, instrument.

## Evidence base

- Anthropic, "Demystifying evals for AI agents", 9 Jan 2026 -
  https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
  Tasks, trials, graders, pass@k, read transcripts.
- Anthropic, "Building a C compiler with a team of parallel Claudes", 5 Feb 2026 -
  https://www.anthropic.com/research/building-c-compiler
  Near-perfect verifiers; a dedicated agent to remove duplicated code.
- Anthropic, "Scaling Managed Agents", 8 Apr 2026 -
  https://www.anthropic.com/engineering/managed-agents
  Harness assumptions go stale; credentials outside the sandbox.
- Jain/Fowler, "Are Harnesses Worth the Cost?", 13 Oct 2026 -
  https://martinfowler.com/articles/are-harnesses-worth-the-cost.html
  Harness pays off on cost-optimised models, ~7x cost for no gain on frontier ones.
- Stack Overflow Developer Survey 2026 - https://survey.stackoverflow.co/2026/ai
  Design and communication are AI's weakest tasks.
- Reviews: adversarial code review (REJECT as one plan), independent planning review
  (SOUND-WITH-CHANGES), researcher check (component count has an optimum, k*~1-4).

## Workstreams

Each workstream has its own branch, its own review, and is revertible alone.
Acceptance checks use stable IDs (`criterion-A1`) so review lenses can cite them.

### A - Measurement and gate bookkeeping

Release 3.1.3.

- `criterion-A1`: lens evidence is written to `.gate/lens-<name>.md` and records `stagedHash`.
- `criterion-A2`: `gate:pass` rejects a lens file whose `stagedHash` differs from the manifest.
- `criterion-A3`: `pass.json` accepts both legacy `lenses: []` and structured `lenses: [{name, verdict, findingsFile}]`.
- `criterion-A4`: `quality-report.js` prints commits, median diff size, fix ratio, lens
  yield, zero-finding panels, freeze-to-pass time, and skip rate.
- `criterion-A5`: `check-context-size.js` gains a skill-count and always-loaded
  description-word budget (line budgets already exist).
- `criterion-A6`: fix `extractNestedBlock` to accept 4-space indentation (BACKLOG VAL-4).

### B - Requirements enforcement

Release 3.1.4. Adds a new blocking precondition; A changes what the gate verifies.

- `criterion-B1`: `gate:freeze` requires `.gate/plan.md` and hashes it into `manifest.json`.
- `criterion-B2`: `.gate/plan.md` carries runnable checks (command + expected output), not prose criteria.
- `criterion-B3`: lens allowlist is `requirements|code|security|ux-responsive|ponytail`;
  unknown names are rejected (hard reject; no prior release shipped custom names).
- `criterion-B4`: a skipped requirements lens is recorded with a reason, not silently omitted.
- `criterion-B5`: effort-scaling delegation budgets are documented (BACKLOG GATE-1).

### C - Craft skills

Release 3.2.0.

- `criterion-C1`: `writing-for-agents` exists and covers pointers, hierarchy, leading words, no-ops, negation, sediment.
- `criterion-C2`: `alignment` runs at most 3 rounds, each question carries a recommended
  answer, and output is written by the orchestrator (planner is read-only).

### D - Edits, anti-slop, design identity

Release 3.2.1. D3 and D4 land early on the trim branch; this workstream records them
as shipped and adds the rest.

- `criterion-D1`: `refactoring` leads with deletion and YAGNI before extraction.
- `criterion-D2`: `.opencode/skills/refactoring/references/code-smells.md` exists and is
  cited by the review lens brief.
- `criterion-D3`: `blogger` owns voice, claims, anti-slop; channel formats live in `references/formats.md` as defaults.
- `criterion-D4`: `brutal-critic` grades against a rubric and no longer prescribes channel format.
- `criterion-D5`: `design-review` + `DESIGN.md` define reference-first decisions (no invented looks).
- `criterion-D6`: `lens-ponytail.md` exists; every finding carries `Conflicts-with: criterion-X`
  or `none`.
- `criterion-D7`: thin operational skills get deterministic scripts instead of deletion (BACKLOG SKILL-1).

### E - Operating loop

Release 3.2.2.

- `criterion-E1`: `LEARNINGS.md` + `retro` command; a retro outputs a check, a standard, a drill, or nothing.
- `criterion-E2`: `check-graph-freshness.js` fails when the graph is present and stale,
  skips when absent, and runs in `doctor`.
- `criterion-E3`: `design-audit` command produces at most 3 sourced proposals.
- `criterion-E4`: `validate-inventory.js` fails on version/count drift between package.json, README, and the filesystem.

### F - Evidence gate

Release 3.3.0.

- `criterion-F1`: 8 drills are pre-registered with prompt, expected artifact, pass
  criteria, and saved transcript. **Pre-registered:** `evals/drills/tasks.md`;
  transcripts are produced by the screening runs.
- `criterion-F2`: a headless profile exists so drills do not stall on `ask`
  (BACKLOG PERM-3). **Met:** `evals/headless.md` (`--auto`; denied rules still deny).
- `criterion-F3`: go/no-go on the A/B runner is recorded, with a cost and wall-time cap
  if it proceeds. **Pre-registered:** `evals/decision.md`; the decision awaits the
  screening runs.

### G - Deprecation

Release 4.0.0. Breaking.

- `criterion-G1`: the installer prunes manifest-recorded skills that no longer ship.
- `criterion-G2`: retired skills are announced with a deprecation note and migration path.
- `criterion-G3`: inventory counts are reconciled everywhere.

### H - Script and gate pruning (deferred until C-G land)

Not started. Runs only after the functional workstreams are in, so it prunes real
usage rather than guesses. Baseline: 38 scripts, 11,670 lines.

- `criterion-H1`: every script is reachable from `package.json`, a workflow, an agent,
  or a documented command; unreferenced ones are deleted or wired.
- `criterion-H2`: duplicated helpers across `scripts/gate`, `scripts/lib`, and the validators have one home.
- `criterion-H3`: test files are split by subject when a single file exceeds ~600 lines.
- `criterion-H4`: the result is recorded as a line-count and file-count delta in `MILESTONES.md`.

## Review rules

- Every workstream: freeze the diff, run the lenses for its risk surface (code always;
  security when scripts/permissions/CI change; requirements when behaviour changes;
  ponytail when the diff adds files, options, or abstractions), triage, then commit.
- Lenses read the frozen patch and `.gate/plan.md`; never the implementation transcript.
- A lens finding that would remove something a criterion requires must cite
  `Conflicts-with: criterion-X`. Cited conflicts block the commit and become a user
  decision. Uncited findings are recorded as suggestions.
- Requirement wins by default; ponytail cannot veto an approved criterion.
- Budget: at most 4 lenses per workstream (the allowlist names 5 possible lenses), at
  most 8 reviewer dispatches per task.

## Sequence

```
A -> B -> C -> D -> E -> F -> G
```

A and C are independent and may run in parallel. F measures A-E and gates G.

## Rejected or deferred, with reasons

| Item | Status | Reason |
|---|---|---|
| Automated behavioural Phase 0 | Deferred behind F | needs a runner, model pinning, and a control condition |
| GATE-5 (Tier 1 into CI) | Rejected | branch protection unverified; the marker also covers Tier 2 |
| Delete command entry points | Rejected | commands provide subagent isolation and narrower permissions |
| Deduplicate the shared verification line across skills | Deferred | those lines ship inside user-installed skills |
| Delete thin skills now | Deferred to G | non-language skills are never pruned, so deletions orphan installs |
| Planner writes the plan file | Rejected | `edit: deny` is the role's safety property; orchestrator writes |
| Full spec-driven pipeline / tracker setup | Rejected | published criticism: overkill, review burden, false control |
| Separate Spec axis | Replaced | make the existing requirements lens enforceable instead |
| `design` lens name | Rejected | no design lens exists; unused component |
| Voting pass (GATE-2) | Deferred | doubles review cost; revisit after A shows panel yield |
| Live-host v2 resolved-rule test (PERM-1) | Separate ticket | needs a pinned v2 host in CI |
| v2 runtime guard verification | Separate ticket | the pack's most consequential unverified claim |

## Status

| Workstream | Status |
|---|---|
| Trim + writing skills | committed (`b207c25`) |
| A | committed (`cbfa387`) |
| B | implemented, uncommitted, reviewed 3x |
| C-G | not started |
| H (pruning) | deferred until C-G land |
