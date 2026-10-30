---
name: codebase-discovery
description: >-
  Find where behavior lives and what depends on it before planning or changing
  code. Uses a local knowledge graph when present, falls back to explore/grep,
  and keeps the staleness rule in one place. Language- and framework-agnostic.
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "1.0.0"
  audience: developers
  workflow: discovery
---

# Codebase Discovery

## What I do

- Locate the code path that owns a behavior, its callers, and reuse candidates.
- Choose the cheapest reliable method: graph query when available, else explore/grep/read.

## When to use me

Structural questions only: "what calls X", "where is Y handled", "what depends on
this", "is there already a Z", pre-change blast radius, cross-module planning.

Not for: edits where the path is already known and no structural question is
asked, benchmarks, a pure diff review, or post-change blast radius (use
`code-change-impact`).

## Method

1. Check `graphify-out/graph.json`.
   - Exists and `graphify-usage` is available: load it and use `query|path|explain`.
   - Absent, the command is missing or fails, or the skill is unavailable: use
     `explore` if your agent may dispatch it, otherwise `grep`/`glob`, then `read`
     to confirm.
2. Staleness: refresh when the graph is older than the newest tracked code file
   (`find . -newer graphify-out/graph.json -name '*.ts' -print -quit`), when
   `git status --porcelain` shows code edits, or after changing code. Portable mtime:
   `node -p "Math.floor(require('fs').statSync('graphify-out/graph.json').mtimeMs/1000)"`.
   Without shell: do not claim freshness; say it may be stale and use the fallback.
   After doc edits run `graphify extract . --backend deepseek` then `graphify cluster-only .`.
3. Confirm: a graph hit is a location, not proof. Open the file before claiming
   behavior.
4. Report locations as `path:line`; separate "found" from "inferred". Stop when the
   call path is closed or two sources agree.

## Related

- `code-change-impact` — post-change blast radius.
- `graphify-usage` (host) — CLI contract and query syntax.
