---
description: Apply .NET Clean Architecture principles and C# best practices
---

# .NET Instructions

## Skill-First Runtime
- For .NET and C# tasks, load the `dotnet` skill on demand.
- Treat this file as compact reference guidance; use the skill for detailed conventions.

## Core Guardrails
- Respect Clean Architecture layer dependencies: Domain → Application → Infrastructure → WebAPI (inward-only).
- Always include `CancellationToken` in async method signatures and pass it through the call chain.
- Enable nullable reference types (`<Nullable>enable</Nullable>`) and initialize non-nullable strings.
- Use constructor injection exclusively; declare dependencies as `private readonly` fields.
- Optimize EF Core queries with `AsNoTracking()` for reads and early `Select()` projection.
- Decorate controllers with `[ApiController]` and `[ProducesResponseType]`; return `ActionResult<T>`.

## Testing & Quality
- Use xUnit + Moq + FluentAssertions with Arrange/Act/Assert.
- Name tests as `MethodName_Scenario_ExpectedBehavior`.
- Keep build, format, and test checks green before delivery.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
dotnet restore
dotnet build
dotnet format
dotnet test
```
