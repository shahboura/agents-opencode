---
description: Document an architectural decision with context, options, and rationale
agent: docs
---

# Architecture Decision Record (ADR)

Document significant architectural decisions using the ADR format. This creates a historical record of why decisions were made.

## ADR Template

```markdown
# ADR-[NUMBER]: [Decision Title]

**Status:** [Proposed / Accepted / Deprecated / Superseded by ADR-XXX]  
**Date:** YYYY-MM-DD  
**Deciders:** [List of people involved]  
**Technical Story:** [Link to issue/ticket if applicable]

## Context

[Describe the situation and the forces at play. What is the issue we're trying to solve? What are the constraints? What factors influence the decision?]

### Background
[Additional context about the problem domain, current architecture, or relevant history]

### Driving Forces
- [Factor 1 influencing the decision]
- [Factor 2 influencing the decision]
- [Factor 3 influencing the decision]

### Constraints
- [Constraint 1 that limits options]
- [Constraint 2 that limits options]
- [Technical/Business/Time constraints]

## Decision

[State the decision clearly and concisely. What will we do?]

**We will [chosen approach]**

## Rationale

[Explain why this decision was made. What makes this the best choice given the context?]

### Pros of This Approach
- ✅ [Benefit 1]
- ✅ [Benefit 2]
- ✅ [Benefit 3]

### Cons of This Approach
- ❌ [Drawback 1] - [Why we accept this]
- ❌ [Drawback 2] - [Why we accept this]

### Why Not Alternatives?
[Brief explanation of why other options were rejected]

## Considered Options

### Option 1: [Alternative Approach]
**Description:** [What this approach would involve]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Verdict:** ❌ Rejected because [reason]

---

### Option 2: [Another Alternative]
**Description:** [What this approach would involve]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Verdict:** ⚠️ Could work but [reason for not choosing]

---

### Option 3: [Chosen Approach] ✅
**Description:** [What this approach involves]

**Pros:**
- [Pro 1]
- [Pro 2]
- [Pro 3]

**Cons:**
- [Con 1] - [Mitigation]
- [Con 2] - [Mitigation]

**Verdict:** ✅ **Selected** - Best balance of [trade-offs]

## Implementation

### Changes Required
1. [Specific change 1]
2. [Specific change 2]
3. [Specific change 3]

### Migration Path
[If replacing existing architecture, how will we migrate?]
- Step 1: [Migration step]
- Step 2: [Migration step]
- Step 3: [Migration step]

### Testing Strategy
- [How to validate the decision]
- [What tests need to be added]
- [Performance benchmarks if applicable]

### Rollback Plan
[If the decision doesn't work out, how can we revert?]

## Consequences

### Positive Consequences
- [Expected benefit 1]
- [Expected benefit 2]
- [Expected benefit 3]

### Negative Consequences
- [Accepted trade-off 1]
- [Accepted trade-off 2]

### Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [How to address] |
| [Risk 2] | Low/Med/High | Low/Med/High | [How to address] |

## Follow-up Actions

- [ ] [Action item 1 with owner]
- [ ] [Action item 2 with owner]
- [ ] [Action item 3 with owner]
- [ ] Document implementation in [location]
- [ ] Update team wiki/docs
- [ ] Schedule review after [timeframe]

## References

- [Link to relevant documentation]
- [Link to research/blog posts]
- [Link to similar decisions in other projects]
- [Links to code examples or prototypes]

## Notes

[Any additional notes, concerns, or discussion points]

---

**Review Date:** [When should this decision be reviewed?]  
**Related ADRs:** [Links to related ADRs]
```

## Example ADRs

### Example 1: State Management

```markdown
# ADR-005: Use Redux Toolkit for State Management

**Status:** Accepted  
**Date:** 2025-12-23  
**Deciders:** Frontend Team Lead, Senior Developer  
**Technical Story:** [Issue #234]

## Context

Our React application has grown complex with multiple features sharing state. Component prop drilling is becoming unmaintainable, and we need a scalable state management solution.

### Constraints
- Must integrate with existing React 18 app
- Team familiar with React hooks
- Bundle size concerns (already at 500KB)
- Need TypeScript support

## Decision

We will use **Redux Toolkit** for global state management.

## Rationale

Redux Toolkit provides:
- ✅ Official Redux recommendation with modern APIs
- ✅ Built-in TypeScript support
- ✅ Simplified boilerplate with createSlice
- ✅ DevTools integration for debugging
- ✅ Team has prior Redux experience

## Considered Options

### Option 1: Redux Toolkit ✅
**Selected** - Best balance of power, familiarity, and tooling

### Option 2: Zustand
- Simpler API
- ❌ Less mature ecosystem, smaller community

### Option 3: Context + useReducer
- No dependencies
- ❌ Doesn't scale well, no middleware support

### Option 4: MobX
- Reactive programming model
- ❌ Team unfamiliar, different mental model

## Implementation

1. Install: `npm install @reduxjs/toolkit react-redux`
2. Create store configuration
3. Migrate authentication state first (pilot)
4. Gradually migrate other features

## Consequences

**Positive:**
- Centralized state management
- Better debugging with DevTools
- Standardized patterns across features

**Negative:**
- Adds 45KB to bundle (acceptable given constraints)
- Learning curve for junior devs (mitigation: training session)
```

### Example 2: Database Choice

```markdown
# ADR-012: Use PostgreSQL Instead of MongoDB

**Status:** Accepted  
**Date:** 2025-12-15  
**Deciders:** Backend Team, DBA, CTO

## Context

Choosing primary database for new e-commerce platform handling:
- User accounts & profiles
- Product catalog (10,000+ SKUs)
- Orders & transactions (ACID required)
- Inventory tracking (strong consistency needed)

## Decision

We will use **PostgreSQL** as our primary database.

## Rationale

- ✅ ACID compliance for transactions
- ✅ Strong consistency for inventory
- ✅ Mature indexing and query optimization
- ✅ JSON support for flexible fields
- ✅ Excellent tooling ecosystem

## Considered Options

### Option 1: PostgreSQL ✅
**Selected** - Best for transactional data with consistency requirements

### Option 2: MongoDB
- ❌ Eventual consistency problematic for inventory
- ❌ Transaction support still maturing

### Option 3: MySQL
- Similar to PostgreSQL
- ❌ Weaker JSON support, less extensible

## Implementation

- Use PostgreSQL 15
- Hosted on AWS RDS with Multi-AZ
- Connection pooling via PgBouncer
- Migrations managed with Flyway

## Consequences

**Positive:**
- Reliable transactions
- Rich query capabilities
- Strong community support

**Negative:**
- Vertical scaling limits (mitigation: read replicas)
- More rigid schema (mitigation: JSONB columns for flexibility)
```

## When to Create an ADR

Create an ADR when:
- Making architectural choices affecting multiple components
- Choosing between technologies/frameworks
- Changing core design patterns
- Making decisions with long-term impact
- Documenting why we DIDN'T do something (important!)

## ADR Naming Convention

```
docs/adr/
  ├── 0001-record-architecture-decisions.md
  ├── 0002-use-typescript-for-frontend.md
  ├── 0003-adopt-clean-architecture.md
  └── 0004-use-postgresql-for-database.md
```

## Review Checklist

- [ ] Clear problem statement
- [ ] Multiple options considered
- [ ] Trade-offs explicitly stated
- [ ] Implementation plan defined
- [ ] Consequences documented
- [ ] Risks identified with mitigations
- [ ] References to supporting materials
- [ ] Follow-up actions assigned
