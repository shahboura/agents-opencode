---
name: adr
description: >-
  Document significant architectural decisions with context, options, trade-offs,
  and rationale. Creates lightweight Architecture Decision Records (ADRs) stored
  as version-controlled markdown files.
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "1.0.0"
  audience: developers
  workflow: documentation
---

# ADR — Architecture Decision Records

## What I do

- Guide creation of lightweight, version-controlled Architecture Decision Records
- Provide a short template covering context, decision, options, consequences
- Keep naming and storage consistent
- Document *why* decisions were made — not just *what* was decided

## When to use me

Activate this skill when:
- Making architectural choices that affect multiple components or teams
- Choosing between technologies, frameworks, or libraries
- Changing core design patterns, data models, or system boundaries
- Making decisions with long-term impact or high reversal cost
- Documenting why an approach was explicitly rejected (negative decisions)

## Key Rules

### ADR Template Structure

Every ADR uses these five sections:

1. **Context** — the situation and forces at play: background and constraints
2. **Decision** — a clear, concise statement: "We will [chosen approach]"
3. **Options** — the alternatives considered, each with pros, cons, and verdict (Selected / Rejected / Could work but)
4. **Consequences** — positive outcomes, accepted negative trade-offs, and risks with mitigations
5. **Status** — Proposed / Accepted / Deprecated / Superseded by ADR-XXX, with date and deciders

### Naming Convention

Store ADRs under `docs/adr/` with zero-padded numbering and kebab-case slugs:

```
docs/adr/
  ├── 0001-record-architecture-decisions.md
  ├── 0002-use-typescript-for-frontend.md
  ├── 0003-adopt-clean-architecture.md
  └── 0004-use-postgresql-for-database.md
```

### When to Create an ADR

Create an ADR for decisions that are:
- **Cross-cutting** — impact spans multiple components, services, or teams
- **Sticky** — hard to reverse once implemented (data model, language, framework)
- **Significant** — involve substantial cost, risk, or architectural direction
- **Informative** — the *rejection* of a plausible option carries insight worth preserving

Skip ADRs for routine choices, trivial refactors, or decisions already captured in design docs or RFCs.

---

ADR files live alongside code in version control — the record is only useful if it stays in
sync with the decisions it describes. Review Accepted ADRs when revisiting the architecture
they govern; supersede (don't delete) when a decision is replaced.

## Acceptance Checklist

An ADR is ready only when all three hold:

- [ ] **At least two options were considered** — a single-option ADR records a
  foregone conclusion, not a decision.
- [ ] **Trade-offs are stated** — each rejected option says what it lost on, and
  the Consequences section names the accepted costs.
- [ ] **Status matches reality** — Proposed / Accepted / Superseded reflects what
  is actually true today, with date and deciders.
