---
name: dotnet
description: Clean Architecture principles and C# conventions for .NET projects
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce Clean Architecture layer boundaries and dependency direction
- Apply C# coding standards with async safety and nullable correctness
- Guide Entity Framework Core configuration and query optimization

## When to use me
Use this when working on .NET/C# projects that follow Clean Architecture patterns.

## Key Rules
- Dependency direction: Domain → Application → Infrastructure → WebAPI (inner layers must never reference outer)
- ALWAYS pass `CancellationToken` through async methods — no exceptions
- Enable `<Nullable>enable</Nullable>` in all .csproj files; use `string?` for nullable, `string.Empty` for non-nullable defaults
- Constructor injection only — never use property or field injection
- Use `IEntityTypeConfiguration<T>` for all EF entity configs; never configure in `OnModelCreating` directly
- Use `AsNoTracking()` for all read-only queries; project to DTOs with `.Select()` early
- Use `record` types for DTOs, not classes
- Apply `sealed` to classes that should not be inherited
- Use `required` keyword (C# 11+) for required properties instead of constructor enforcement
- Prefer `is not null` over `!= null`; use `nameof()` in exception parameter names
- Interfaces belong in the Application layer; implementations in Infrastructure
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Validation Commands
```bash
dotnet restore
dotnet build
dotnet format
dotnet test
```
