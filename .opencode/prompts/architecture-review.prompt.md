# /architecture-review

Validate a system or feature design for robustness and scalability.

## What to Provide

- Context: Problem, constraints, non-goals
- Current/Proposed architecture diagrams (optional)
- Tech stack preferences/constraints
- Scale assumptions (traffic, data, latency)

## Checklist

- Requirements coverage and risks
- Architecture soundness (modularity, coupling, cohesion)
- Scalability: horizontal vs vertical, hotspots, state
- Reliability: failure modes, retries, backoff, idempotency
- Security: authn/z, data protection, secrets, least privilege
- Data: schema, migrations, consistency, retention
- Observability: metrics, logs, tracing, SLOs, alerts
- Operations: deployments, rollbacks, runbooks
- Cost awareness and tradeoffs

## Output Format

- Summary
- Key risks and mitigations
- Architecture notes
- Decisions/recommendations
- Next steps

## Example

```
/architecture-review
Context: Add API v2 with backward compatibility for 6 months.
Constraints: Single DB, no new queue allowed.
Scale: 1k RPS peak; P95 latency < 200ms.
```
