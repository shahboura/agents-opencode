---
layout: default
title: Performance Metrics
nav_order: 10
---

# Performance Metrics

Measure and improve agent effectiveness.

## What to Track

- Task success rate
- Plan approval rate
- Time to complete (per phase)
- Rework rate after reviews
- Test pass rate

## Common Failure Patterns

- Missing requirements in plan
- Unclear acceptance criteria
- Skipping review/documentation
- Environment mismatches

## How to Measure

- Add lightweight logging to agent outputs
- Tag sessions with task types
- Aggregate results weekly

## Dashboards

- Success vs failures over time
- Average cycle time by agent
- Hotspots: modules with most issues

## Actions

- Improve prompts where failures cluster
- Add examples to docs for tricky areas
- Tighten validation gates in CI
