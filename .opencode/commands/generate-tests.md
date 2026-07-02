---
description: Generate comprehensive unit tests for selected code
agent: codebase
argument-hint: "[file, class, or function name]"
subtask: true
---

# Generate Tests

Generate unit tests. Detect the project profile and use the agent's profile-based
test framework (pytest, jest, go test, dotnet test, etc.). Scope: $ARGUMENTS
