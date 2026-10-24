---
name: alignment
description: Interview the user to settle ambiguous or high-stakes requests before planning or implementing
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "1.0.0"
  audience: developers
  workflow: planning
---

# Alignment

Settle the decisions before writing the plan. A plan built on a guess is rework
with extra steps.

## What I do

- Map a request into a design tree of decisions
- Ask the whole frontier in one round, each question with a recommended answer
- Cap the interview at three rounds, then list what is still open
- Return a decision list that seeds the plan and `.gate/plan.md`

## When to use me

Activate when any of these is true:

- The request has more than one plausible reading
- The work is high-stakes: one-way door, security, data loss, public contract
- Acceptance criteria are missing — nobody can say what "done" looks like
- The user asks for a plan or estimate while scope is still unfixed

Skip when the request is small, reversible, and unambiguous — an unnecessary
interview is its own kind of rework. If the user says "just do it", take the
recommended answers, record them as assumptions, and proceed.

## Key Rules

### Design tree and frontier

Every branch is a decision: scope, data model, interface, error behaviour,
rollout, ownership. A decision is **settled** when it has an answer and its
prerequisites have answers.

The **frontier** is every decision whose prerequisites are settled. Ask the
frontier — not the leaves behind unanswered parents, whose answers would change
once the parent lands.

### One round, whole frontier

- Ask **every** frontier decision in a single round. Serial questioning costs a
  human turn per question and hides the shape of the problem.
- **Number** the questions, so answers can be given as `1b, 2a, 3 yes`.
- Give each question a **recommended answer** and a one-line reason. The user can
  accept the default in a word; a question without a default is homework.
- **Wait** for the answers before the next round. Do not interleave investigation
  results with a second batch of questions the user has not seen.

```markdown
## Alignment round 1 — 3 decisions

1. Session storage: (a) signed cookie **← recommended**, (b) server table
   Reason: no new infrastructure; revocation is not required this quarter.
2. Migration window: (a) single deploy **← recommended**, (b) dual-write for 2 weeks
   Reason: table is under 10k rows; downtime is acceptable.
3. Error contract: (a) problem+json **← recommended**, (b) custom envelope
   Reason: existing endpoints already return problem+json.
```

### Facts are the agent's job, decisions are the user's

- **Look up** anything the repo, docs, or the web can answer: existing patterns,
  library versions, current schema, test conventions. Asking the user for a fact
  you could verify wastes the round.
- **Ask** only for choices with real trade-offs: priorities, deadlines, risk
  appetite, ownership, external constraints.
- When a "question" is really a fact with one right answer, state the finding and
  move on.

### Three-round cap

- **Round 1:** the full frontier.
- **Round 2:** only decisions unblocked by Round 1 answers.
- **Round 3:** only the remaining blockers.
- After Round 3, **stop asking**. Write the decision list with an explicit
  **Open items** section naming what is unsettled, the default you will use, and
  what would change it. Silent assumptions are the failure mode; declared ones
  are manageable.

### Output: the decision list

The **orchestrator** writes this file — `@planner` is read-only. Keep it short and
mechanical:

```markdown
## Decision List — <request>

| # | Decision | Chosen | Why |
|---|---|---|---|
| 1 | Session storage | signed cookie | no new infra; no revocation need |
| 2 | Migration window | single deploy | <10k rows; downtime acceptable |

**Assumptions:** <facts taken as given, and how they were verified>
**Open items:** <unsettled decision → default taken → what would change it>
**Acceptance criteria:** <observable conditions that define done>
```

- Write it into the plan. When the Pre-Commit Review Gate applies (non-trivial
  diff), also write `.gate/plan.md` so reviewers judge the diff against the same
  intent the implementer worked from. It needs both sections: `## Acceptance` with
  `- ` observable criteria (the requirements lens judges against them) and
  `## Checks` with matched `- run:` / `- expect:` lines. `gate:freeze` refuses a
  plan missing either (`CONTRIBUTING.md`).
- Keep acceptance criteria observable: see `writing-for-agents` for the standard.
  "Works well" is not a criterion.

### Do not implement yet

Stop after the decision list and get a confirmation. Implementation before
confirmation turns an open question into a revert. Confirmation is cheap; a
wrong one-way door is not.

## Validation

- [ ] Trigger checked; skip reason recorded when skipping
- [ ] Design tree drawn; every question is on the frontier
- [ ] One round asked, numbered, each with a recommended answer
- [ ] Facts looked up rather than asked
- [ ] ≤3 rounds; leftovers listed as open items with defaults
- [ ] Decision list written (plan, plus `.gate/plan.md` for non-trivial diffs)
- [ ] User confirmed before implementation started
