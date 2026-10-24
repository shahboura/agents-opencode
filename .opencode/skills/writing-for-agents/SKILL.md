---
name: writing-for-agents
description: Writing rules for documents an agent consumes — skills, AGENTS.md, instruction files, and docs reached by a pointer
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "1.0.0"
  audience: maintainers
  workflow: documentation
  adapted-from: "mattpocock/skills (MIT)"
---

# Writing for Agents

Rules for any text an agent reads: a skill, an `AGENTS.md`, a doc reached through
a pointer. The reader is a model with a fixed attention budget, not a colleague
who asks follow-up questions.

## What I do

- Check pointer wording, load cost, and document hierarchy before drafting
- Rewrite steps into completion criteria the agent can check
- Replace prohibitions and restatements with one positive target
- Prune duplicates, no-ops, and sediment, starting with the environment's own sources

## When to use me

Activate when writing or editing:

- A skill, agent file, instruction file, or `AGENTS.md`
- A doc that another document points at ("read X for details")
- A prompt, checklist, or command body an agent executes
- A doc that keeps growing while compliance stays flat

## Key Rules

### 1. Context pointers

A pointer is a line that tells the agent when to open something else. The pointer
is always loaded; its target is not.

- **Wording decides invocation.** If the sentence never names the situation, the
  skill never loads. Write the situation, not the concept: "before merging a
  migration" beats "for database concerns".
- **One trigger per branch.** Each "when" clause maps to exactly one skill. Two
  skills in one sentence split the decision and the agent picks neither.
- **Front-load the leading word.** Put the discriminating term first in the
  sentence, so the match happens before attention drifts: "Ambiguous request →
  `alignment`", not "If the request is ambiguous, consider loading…".

### 2. Two loads

- **Context load:** tokens paid every time the file is read. Lower it by writing less,
  or by moving detail behind a pointer.
- **Cognitive load:** the human's memory of what exists and when to reach for it. Lower
  it with fewer files and names that are findable without a map.
- A new file trades context load for cognitive load. Make that trade knowingly.

### 3. Information hierarchy

Three tiers, cheapest first:

1. **In-file step** — the agent must do it now.
2. **In-file reference** — available beside the step, read when needed.
3. **Disclosed reference** — a separate file behind a pointer.

- **Progressive disclosure:** push detail down only when it is not needed on
  every pass. Anything load-bearing for the step stays in the step.
- **Co-location:** keep what changes together, together. A rule and its exception
  should not be separated by three sections.
- **Sprawl:** if one reader needs three documents to do one thing, the hierarchy
  is wrong. The top document holds the decision and points to the mechanics.

### 4. Steps and completion criteria

- A **step** says what to do. A **completion criterion** says how you know it is
  done. Agents stop at the first plausible stopping point.
- **Clarity is not demand.** A clear instruction is understood; a demanding one
  is binding. "Consider X" gets skipped; "Do X before Y" gets done.
- **Premature completion:** any step without a checkable end state gets declared
  complete at the cheapest point. Give it an observable end: a command, an exit
  code, a file that exists.
- **Post-completion pull:** text after the stop condition ("then also…") pulls the
  agent past the finish line or stops it early. Put the finish line last, or move
  the extra work before it.

### 5. Leading words

- One pretrained token replaces a paragraph: *atomic*, *idempotent*, *regression*,
  *root cause*, *frozen snapshot*. The model already knows the pattern; naming it
  is cheaper than describing it.
- **Hunt restatements.** If the same idea appears twice, keep the version with the
  leading word and delete the other. Two spellings of one rule read as two rules.

### 6. Negation

- **Prohibitions activate the banned behaviour.** "Do not use tabs" makes tabs
  salient. State the positive target instead: "Indent with two spaces".
- Keep a prohibition only when the failure is silent and costly, and always pair
  it with the replacement behaviour.

### 7. Pruning

- **Single source of truth:** one normative home per rule. Everything else points
  at it or is deleted.
- **The environment is a source.** Package scripts, config, directory layout, and
  CLI help already state facts. Do not restate them; your copy goes stale, theirs
  does not.
- **No-ops:** delete lines that repeat the model's default ("be careful", "write
  clean code"). They cost tokens and change nothing.
- **Sediment:** text accumulates because adding feels safer than deleting. On
  every edit, remove one thing.

## Review checklist

- [ ] Pointer names the triggering situation; leading word comes first
- [ ] Always-loaded text earns its tokens; detail sits one level down
- [ ] Every step has an observable completion criterion
- [ ] No restated leading word, no bare prohibition
- [ ] No fact the repo already stores in scripts, config, or layout
