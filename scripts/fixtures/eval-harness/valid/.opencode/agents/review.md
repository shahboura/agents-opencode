---
description: review
mode: subagent
permission:
  "*": "deny"
  edit: "deny"
  read: "allow"
  skill:
    "*": "deny"
    "docs-validation": "allow"
  task:
    "*": "deny"
---

Verification gate: return pass / pass-with-conditions / fail.
