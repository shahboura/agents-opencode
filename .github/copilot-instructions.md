# GitHub Copilot Custom Instructions

## Context Management
**Auto-maintained by agents.** Persists decisions, patterns, and context across sessions.

**Project Context:**
- Multi-language: .NET, Python, TypeScript
- Architecture: Clean Architecture (.NET), modular patterns (Python/TS)
- Last Updated: December 3, 2025
---

## Custom Agent System

### 5 Agents Created
1. **@orchestrator** - Strategic planning & multi-phase execution (planning + implementation coordination)
2. **@codebase** - Multi-language development
3. **@docs** - Documentation specialist
4. **@review** - Security/quality reviewer
5. **@em-advisor** - Engineering Manager strategic advisor

### 5 Reusable Prompts
- `/create-readme` - Professional README generation
- `/code-review` - Comprehensive code review
- `/generate-tests` - Unit test generation
- `/1-on-1-prep` - EM meeting preparation
- `/architecture-decision` - ADR creation

### 3 Auto-Applied Instructions
Pattern-based context injection (no manual prompting):
- `**/*.{cs,csproj}` → .NET Clean Architecture standards
- `**/*.py` → Python best practices (type hints, pytest)
- `**/*.{ts,tsx}` → TypeScript strict mode
---

## .NET Development Standards

### Role
.NET specialist: Clean Architecture, C# best practices, quality-driven development.

## Architecture Patterns

### Clean Architecture Layers
```
Domain → Application → Infrastructure → WebAPI
```

**Dependency Rules:**
- ✅ Infrastructure → Application → Domain
- ❌ Domain must NOT depend on Application
- ❌ Application must NOT depend on Infrastructure

### Project Structure
```
src/
├── Domain/              (Entities, ValueObjects, Interfaces)
├── Application/         (Services, DTOs, Validators)
├── Infrastructure/      (DbContext, Repositories)
└── WebAPI/              (Controllers, Program.cs)
```

## C# Standards

### Naming Conventions
- Classes/Methods: `PascalCase`
- Interfaces: `IPascalCase`
- Private fields: `_camelCase`
- Parameters: `camelCase`

### Async/Await
```csharp
// ✅ Always include CancellationToken
public async Task<User> GetUserAsync(int id, CancellationToken cancellationToken)
{
    return await _context.Users
        .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}
```

### Nullable Reference Types
```csharp
// Enable in .csproj
<Nullable>enable</Nullable>

// Usage
public string Email { get; set; } = string.Empty;  // Non-nullable
public string? PhoneNumber { get; set; }            // Nullable
```

### Dependency Injection
```csharp
// Constructor injection only
public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository userRepository,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }
}
```

## Entity Framework Core

### Entity Configuration
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
```

## Testing Patterns

### xUnit Unit Tests
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

## Quality Requirements

### Every Code Change Must:
1. ✅ Compile with zero warnings
2. ✅ Pass all tests
3. ✅ Be formatted (dotnet format)
4. ✅ Use nullable reference types correctly
5. ✅ Include async/await with CancellationToken
6. ✅ Follow Clean Architecture layers

## Implementation Workflow

When asked to implement a feature:
1. **Analyze** the request and identify affected layers
2. **Plan** the implementation (entities, services, controllers, tests)
3. **Implement** from Domain → Application → Infrastructure → WebAPI
4. **Test** at each layer (unit tests, integration tests)
5. **Validate** build, tests, and formatting

## Common Patterns

### Repository Pattern
```csharp
// Interface in Application
public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<User> AddAsync(User user, CancellationToken cancellationToken);
}

// Implementation in Infrastructure
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

### Service Pattern
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

    public async Task<UserDto?> GetUserByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting user {UserId}", id);

        var user = await _repository.GetByIdAsync(id, cancellationToken);

        if (user is null)
        {
            _logger.LogWarning("User not found: {UserId}", id);
            return null;
        }

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name
        };
    }
}
```

### Controller Pattern
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
3. ✅ Be formatted (dotnet format)
4. ✅ Use nullable reference types correctly
5. ✅ Include async/await with CancellationToken
6. ✅ Follow Clean Architecture layers

## Implementation Workflow

When implementing features:
1. **Analyze** - Identify affected layers
2. **Plan** - Define entities, services, controllers, tests
3. **Implement** - Domain → Application → Infrastructure → WebAPI
4. **Test** - Unit tests per layer
5. **Validate** - Build, test, format

## Common Patterns to Apply

- Use `record` types for DTOs
- Apply `sealed` to non-inheritable classes
- Use `required` for required properties (C# 11+)
- Prefer `is not null` over `!= null`
- Use `nameof()` in exceptions

## Build Commands

```bash
dotnet restore
dotnet build
dotnet format
dotnet test
```
