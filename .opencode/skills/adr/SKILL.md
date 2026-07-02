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
- Provide a structured template covering context, options, rationale, consequences
- Enforce naming conventions and review checklist for consistency
- Help teams document *why* decisions were made — not just *what* was decided

## When to use me

Activate this skill when:
- Making architectural choices that affect multiple components or teams
- Choosing between technologies, frameworks, or libraries
- Changing core design patterns, data models, or system boundaries
- Making decisions with long-term impact or high reversal cost
- Documenting why an approach was explicitly rejected (negative decisions)

## Key Rules

### ADR Template Structure

Every ADR includes these sections in order:

1. **Header block** — ADR number, title, status (Proposed / Accepted / Deprecated /
   Superseded by ADR-XXX), date, deciders, and optional technical story link
2. **Context** — the situation and forces at play: background, driving forces, and constraints (technical, business, time)
3. **Decision** — a clear, concise statement: "We will [chosen approach]"
4. **Rationale** — why this is the best choice given the context: pros, accepted cons, and why alternatives were rejected
5. **Considered Options** — for each option: description, pros, cons, and verdict (Selected / Rejected / Could work but)
6. **Implementation** — changes required, migration path (if replacing existing), testing strategy, and rollback plan
7. **Consequences** — positive outcomes, negative trade-offs, and a risk table (Risk / Probability / Impact / Mitigation)
8. **Follow-up Actions** — action items with owners, documentation updates, review scheduling
9. **References** — links to docs, research, similar decisions, code examples
10. **Footer** — review date and links to related ADRs

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

## Validation Commands

Review each ADR against this checklist before marking it as Accepted:

- [ ] Clear problem statement — reader understands the context without prior knowledge
- [ ] Multiple options considered — at least two alternatives evaluated beyond the chosen one
- [ ] Trade-offs explicitly stated — pros and cons listed for each option with verdicts
- [ ] Implementation plan defined — concrete steps, not vague intentions
- [ ] Consequences documented — both positive outcomes and accepted negative trade-offs
- [ ] Risks identified with mitigations — risk table populated, not left empty
- [ ] References to supporting materials — links to docs, research, or prototypes
- [ ] Follow-up actions assigned — owners named, timeboxes set
- [ ] Status matches reality — Proposed for drafts, Accepted only after team approval
- [ ] Naming follows convention — zero-padded number, kebab-case slug under `docs/adr/`

---

ADR files live alongside code in version control — the record is only useful if it stays in
sync with the decisions it describes. Review Accepted ADRs when revisiting the architecture
they govern; supersede (don't delete) when a decision is replaced.
