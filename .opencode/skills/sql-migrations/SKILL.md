---
name: sql-migrations
description: SQL and database migration best practices for safe schema changes
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce safe migration patterns with rollback support
- Apply schema design rules for constraints, indexes, and data integrity
- Guide destructive change management and data backfill strategies

## When to use me
Use this when writing database migrations, schema changes, or data transformation scripts.

## Key Rules
- Migrations must be idempotent where possible; always provide down/rollback steps
- Never drop data or tables without explicit approval and confirmed backups
- Use explicit versions or timestamps; keep migration order deterministic
- Stage destructive changes (drops, renames) separately from data moves — never in the same migration
- Test migrations against a prod-like snapshot before deploying to production
- Declare explicit column types and constraints: PK, FK, UNIQUE, CHECK, NOT NULL on every column
- Add indexes for join columns and common filter predicates; avoid over-indexing
- Wrap DDL statements in transactions when the database supports it; guard against lock escalation on large tables
- Always include `WHERE` clauses on UPDATE and DELETE — never allow unintended full-table changes
- Use UTC timezone and consistent collation/charset across the entire schema
- Backfill data in batches — never use single massive statements that lock tables
- Avoid `SELECT *` in views and procedures; specify columns explicitly
- Avoid long-running blocking migrations during peak traffic; prefer phased rollouts

## Validation Commands
```bash
sqlfluff lint || true
```
