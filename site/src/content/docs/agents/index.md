---
title: Agents
description: Ten specialist agents — what each one owns, its tools, and when to use it.
sidebar:
  label: Overview
  order: 3
---

Every agent has one job and its own tool permissions. The list below is ordered by how often
you will reach for it, not alphabetically.

<div class="agent-grid">
  <a class="agent-card agent-card--lead" href="#orchestrator">
    <span class="agent-card__role">Plans the work</span>
    <strong>orchestrator</strong>
    <p>Scopes the task, writes the plan, then delegates. It has no edit tool, so it can never
    change a file — the safety property that makes it safe to hand a whole feature to.</p>
    <span class="agent-card__badge">primary · plan-only</span>
  </a>

  <a class="agent-card" href="#codebase">
    <span class="agent-card__role">Implements</span>
    <strong>codebase</strong>
    <p>Works across ten language and framework profiles with automatic detection.</p>
    <span class="agent-card__badge">edits code</span>
  </a>

  <a class="agent-card" href="#review">
    <span class="agent-card__role">Reviews</span>
    <strong>review</strong>
    <p>Reports security, performance and correctness findings. The review gate decides what blocks.</p>
    <span class="agent-card__badge">read-only</span>
  </a>

  <a class="agent-card" href="#docs">
    <span class="agent-card__role">Documents</span>
    <strong>docs</strong>
    <p>Turns a finished change into the written record.</p>
    <span class="agent-card__badge">writes docs</span>
  </a>

  <a class="agent-card" href="#planner">
    <span class="agent-card__role">Checks plans</span>
    <strong>planner</strong>
    <p>Read-only plan creation and plan review, before anything is executed.</p>
    <span class="agent-card__badge">no edits</span>
  </a>

  <a class="agent-card" href="#researcher">
    <span class="agent-card__role">Grounds decisions</span>
    <strong>researcher</strong>
    <p>Checks high-stakes choices against primary sources instead of memory.</p>
    <span class="agent-card__badge">web</span>
  </a>

  <a class="agent-card" href="#brutal-critic">
    <span class="agent-card__role">Scores drafts</span>
    <strong>brutal-critic</strong>
    <p>Grades content against a rubric with line-cited fixes.</p>
    <span class="agent-card__badge">read-only</span>
  </a>

  <a class="agent-card" href="#legal-advisor">
    <span class="agent-card__role">Checks compliance</span>
    <strong>legal-advisor</strong>
    <p>Jurisdiction-aware legal and licence review.</p>
    <span class="agent-card__badge">read-only</span>
  </a>

  <a class="agent-card" href="#em-advisor">
    <span class="agent-card__role">Team strategy</span>
    <strong>em-advisor</strong>
    <p>Engineering-management decisions, team dynamics and technical strategy.</p>
    <span class="agent-card__badge">primary · advice</span>
  </a>

  <a class="agent-card" href="#blogger">
    <span class="agent-card__role">Writes content</span>
    <strong>blogger</strong>
    <p>Tech, finance and leadership writing with fact validation.</p>
    <span class="agent-card__badge">primary · content</span>
  </a>
</div>

## orchestrator

The coordinator. Give it an outcome, not a sequence of steps.

```txt title="TUI"
@orchestrator Build a user authentication API with JWT tokens
```

It writes a plan, names the agents, and stops for approval before anything is edited.

## codebase

Implements across .NET, Python, TypeScript, Flutter, Go, Java, Node.js, React, Ruby and Rust.
Profile detection picks the right conventions and test command for the repository it is in.

## review

Read-only. It reports findings and severity; the [review gate](/review-gate/) is what decides
whether a change is blocked.

## docs

Generates the written record: what changed, why, and where to look next.

## planner

Creates and reviews plans without touching files. Use it to pressure-test a plan before
spending implementation tokens on it.

## researcher

Read-only research against primary sources. Use it when a decision is expensive to reverse.

## brutal-critic

Grades a draft against a rubric and returns line-cited fixes.

## legal-advisor

Jurisdiction-aware analysis: contracts, licensing, employment and compliance.

## em-advisor

Leadership and team decisions. Not a coding agent.

## blogger

Content creation with fact validation. Not a coding agent.
