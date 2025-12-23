---
description: SQL and database migration best practices
applyTo: '**/*.sql'
---

# SQL & Database Migrations Instructions

## Migrations
- Make migrations idempotent where possible; always provide down/rollback steps.
- Never drop data or tables without explicit approval and backups.
- Use explicit versions/timestamps; keep order deterministic.
- Avoid destructive changes in the same migration as data moves; stage in steps.
- Test migrations on a prod-like snapshot before release.

## Schema & Data
- Declare explicit column types and constraints (PK, FK, UNIQUE, CHECK, NOT NULL).
- Add indexes for joins and common filters; avoid over-indexing.
- Use default values and computed columns thoughtfully; document them.
- Avoid `SELECT *` in views/procedures; specify columns.

## Safety
- Wrap DDL in transactions when supported; guard against lock escalation on large tables.
- Use `WHERE` clauses on updates/deletes; avoid unintended full-table changes.
- Avoid long-running blocking migrations during peak; prefer phased rollouts.

## Data Quality
- Validate data before transformation; backfill with batches, not single massive statements.
- Use consistent time zones (e.g., UTC) and collation/charset across schema.

## Review Checklist
- Forward-only + rollback path documented.
- Indexes cover critical queries; no redundant indexes.
- Constraints enforce integrity; no silent truncation of critical fields.

## Validation Commands
```bash
# Example (adjust to your tooling)
sqlfluff lint || true
# Run migrations against test DB
# e.g., flyway migrate -url=... -locations=filesystem:sql
```
