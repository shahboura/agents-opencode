---
description: Compare current design references with DESIGN.md and propose at most 3 sourced changes
agent: researcher
subtask: true
---

# Design Audit

Scope: `$ARGUMENTS` (default: the current UI surface).

Read-only. Do not edit files.

## Method

1. Read `DESIGN.md`; if it is missing, say so and treat it as empty.
2. Pull current references for the scope (official design-system docs, accessibility
   guidance, platform conventions) with URL and access date.
3. Compare references against `DESIGN.md`. Report only gaps where a reference
   contradicts or extends it.

## Output

At most 3 proposals. Each proposal has exactly:
- Reference (URL, access date)
- Gap or contradiction
- Proposed change
- File to touch

If nothing is contradicted or missing, output `no change`. No generic advice.
