---
description: Apply .NET Clean Architecture principles and C# best practices
---

# .NET Clean Architecture Instructions

## Architecture Layers

Follow Clean Architecture dependency rules:
```
Domain → Application → Infrastructure → WebAPI
```

**Dependency Rules:**
- ✅ Infrastructure → Application → Domain
- ❌ Domain must NOT depend on Application
- ❌ Application must NOT depend on Infrastructure

## Project Structure
```
src/
├── Domain/              (Entities, ValueObjects, Interfaces)
├── Application/         (Services, DTOs, Validators)
├── Infrastructure/      (DbContext, Repositories)
└── WebAPI/              (Controllers, Program.cs)
```

## C# Coding Standards

### Naming Conventions
- Classes/Methods: `PascalCase`
- Interfaces: `IPascalCase`
- Private fields: `_camelCase`
- Parameters/locals: `camelCase`

### Async/Await
Always include `CancellationToken` in async methods. Use `ConfigureAwait(false)` where context capture is not needed.

### Nullable Reference Types
Enable in `.csproj` with `<Nullable>enable</Nullable>`. Initialize non-nullable strings with `= string.Empty`. Use `?` suffix for optional properties.

### Dependency Injection
Constructor injection only. Declare dependencies as `private readonly` fields initialized in the constructor. Register services with appropriate lifetimes (`Scoped`, `Singleton`, `Transient`).

## Entity Framework Core

### Entity Configuration
Use `IEntityTypeConfiguration<T>` for fluent configuration. Configure via `builder.ToTable()`, `builder.HasKey()`, `builder.Property()`, `builder.HasIndex()`. Apply in `OnModelCreating` with `modelBuilder.ApplyConfigurationsFromAssembly()`.

### Optimized Queries
Use `AsNoTracking()` for read-only queries. Project to DTOs with `Select()` early. Always pass `CancellationToken` to async EF methods.

## Testing Standards

Use xUnit + Moq + FluentAssertions. Name tests with `MethodName_Scenario_ExpectedBehavior`. Follow Arrange/Act/Assert. Mock interfaces with `Mock<T>` and inject via constructor. Assert with `result.Should().NotBeNull()` style.

## Repository Pattern

Define repository interfaces in the Application layer (contracts). Implement in the Infrastructure layer with EF Core. Each repository method takes `CancellationToken`. Use `FirstOrDefaultAsync`, `ToListAsync`, `AddAsync`, etc.

## Controller Pattern

Use `[ApiController]` attribute for automatic model validation and error responses. Use `[ProducesResponseType]` for Swagger documentation. Inject services via constructor. Pass `CancellationToken` through to service calls. Return `ActionResult<T>` for proper status codes.

## Quality Requirements

**Every code change MUST:**
1. ✅ Compile with zero warnings
2. ✅ Pass all tests
3. ✅ Use nullable reference types correctly
4. ✅ Include async/await with CancellationToken
5. ✅ Follow Clean Architecture layers
6. ✅ Include XML documentation for public APIs

## Common Patterns

- Use `record` types for DTOs
- Apply `sealed` to classes that shouldn't be inherited
- Use `required` keyword for required properties (C# 11+)
- Prefer `is not null` over `!= null`
- Use `nameof()` for parameter names in exceptions

## Validation Commands

After code changes, run:
```bash
dotnet restore
dotnet build
dotnet format
dotnet test
```

For detailed examples and extended guidance, see [dotnet-clean-architecture-reference.instructions.md](dotnet-clean-architecture-reference.instructions.md).
