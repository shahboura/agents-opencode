---
description: Apply .NET Clean Architecture principles and C# best practices
applyTo: '**/*.{cs,csproj}'
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
**ALWAYS include CancellationToken:**
```csharp
public async Task<User> GetUserAsync(int id, CancellationToken cancellationToken)
{
    return await _context.Users
        .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}
```

### Nullable Reference Types
**Enable and use properly:**
```csharp
// In .csproj
<Nullable>enable</Nullable>

// Non-nullable
public string Email { get; set; } = string.Empty;

// Nullable
public string? PhoneNumber { get; set; }
```

### Dependency Injection
**Constructor injection only:**
```csharp
public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository repository,
        ILogger<UserService> logger)
    {
        _repository = repository;
        _logger = logger;
    }
}
```

## Entity Framework Core

### Entity Configuration
**Use IEntityTypeConfiguration:**
```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(255);
        builder.HasIndex(u => u.Email).IsUnique();
    }
}
```

### Optimized Queries
```csharp
// ✅ Project early, use AsNoTracking for read-only
var users = await _context.Users
    .AsNoTracking()
    .Select(u => new UserDto { Id = u.Id, Email = u.Email })
    .ToListAsync(cancellationToken);

// ❌ Avoid loading full entities if not needed
```

## Testing Standards

### xUnit + Moq + FluentAssertions
```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepo;
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _mockRepo = new Mock<IUserRepository>();
        _sut = new UserService(_mockRepo.Object);
    }

    [Fact]
    public async Task GetUserAsync_ExistingUser_ReturnsUser()
    {
        // Arrange
        var user = new User { Id = 1, Email = "test@example.com" };
        _mockRepo.Setup(r => r.GetByIdAsync(1, default))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetUserAsync(1, default);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be(user.Email);
    }
}
```

## Repository Pattern

```csharp
// Interface in Application layer
public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<User> AddAsync(User user, CancellationToken cancellationToken);
}

// Implementation in Infrastructure layer
public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;

    public UserRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }
}
```

## Controller Pattern

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDto>> GetUser(
        int id,
        CancellationToken cancellationToken)
    {
        var user = await _userService.GetUserByIdAsync(id, cancellationToken);
        return user is not null ? Ok(user) : NotFound();
    }
}
```

## Quality Requirements

**Every code change MUST:**
1. ✅ Compile with zero warnings
2. ✅ Pass all tests
3. ✅ Use nullable reference types correctly
4. ✅ Include async/await with CancellationToken
5. ✅ Follow Clean Architecture layers
6. ✅ Include XML documentation for public APIs

## Common Patterns to Apply

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
