---
description: Document an architecture decision with rationale and tradeoffs
agent: em-advisor
---

# Architecture Decision Record (ADR) Prompt

Help me create an Architecture Decision Record for a technical decision.

## Decision Context
- Problem statement: [What problem are we solving?]
- Current situation: [What exists today?]
- Constraints: [Time, budget, team skills, existing tech]
- Stakeholders: [Who cares about this decision?]

## Generate ADR

Create a comprehensive ADR following this structure:

```markdown
# ADR-[NUMBER]: [TITLE]

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: [YYYY-MM-DD]
**Decision Makers**: [Names/Roles]

## Context
[Describe the forces at play: technical, political, social, project]

## Decision
[The change we're proposing or have agreed to]

## Options Considered

### Option 1: [Name]
**Pros:**
- [Benefit 1]
- [Benefit 2]

**Cons:**
- [Drawback 1]
- [Drawback 2]

**Effort Estimate**: [Low/Medium/High]

### Option 2: [Name]
...

## Decision Outcome
**Chosen Option**: [Which option and why]

## Consequences

### Positive
- [Good consequence 1]
- [Good consequence 2]

### Negative
- [Tradeoff 1]
- [Technical debt 1]

### Neutral
- [Neutral impact 1]

## Implementation Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Timeline**: [Estimated timeline]
**Resources**: [People/tools needed]

## Validation Criteria
- [How we'll know this was the right decision]
- [Metrics to track]
- [Success indicators]

## Risks & Mitigation
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | [H/M/L] | [H/M/L] | [How to mitigate] |

## Related Decisions
- [Link to related ADR-XXX]
- [Link to superseded ADR-YYY]

## References
- [Documentation link]
- [Research article]
- [Team discussion link]
```

## Analysis Framework

Apply these decision-making frameworks:

1. **Impact vs Feasibility Matrix**
   - High Impact + High Feasibility = Do First
   - High Impact + Low Feasibility = Plan Carefully
   - Low Impact + High Feasibility = Quick Wins
   - Low Impact + Low Feasibility = Avoid

2. **Risk Assessment**
   - Technical risk
   - Schedule risk
   - Team capability risk
   - Integration risk

3. **Cost-Benefit Analysis**
   - Implementation cost
   - Maintenance cost
   - Opportunity cost
   - Business value

After generating the ADR:
- Suggest review process
- Identify key stakeholders to consult
- Recommend validation experiments
- Propose communication plan
