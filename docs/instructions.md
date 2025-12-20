---
layout: default
title: Coding Standards
nav_order: 4
---

# Auto-Applied Coding Standards

Coding rules that activate automatically based on file type.

## How It Works

When you edit a file, GitHub Copilot checks the file extension and applies relevant standards:

- `.cs` or `.csproj` → .NET Clean Architecture rules
- `.py` → Python best practices
- `.ts` or `.tsx` → TypeScript strict mode

**You don't configure anything** - it just works!

---

## .NET Standards

**Applies to:** `.cs` and `.csproj` files

### Architecture: Clean Architecture
```
Domain → Application → Infrastructure → WebAPI
```

All code follows layered architecture with strict dependency rules.

### Key Standards

#### Async/Await with CancellationToken
```csharp
// ✅ Always include CancellationToken
public async Task<User> GetUserAsync(
    int id, 
    CancellationToken cancellationToken)
{
    return await _context.Users
        .FirstOrDefaultAsync(
            u => u.Id == id, 
            cancellationToken);
}
```

#### Nullable Reference Types
```csharp
// Enabled globally
<Nullable>enable</Nullable>

// Non-nullable
public string Email { get; set; } = string.Empty;

// Nullable
public string? PhoneNumber { get; set; }
```

#### Dependency Injection
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

#### Entity Framework Core
```csharp
// Configuration pattern
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(255);
        builder.HasIndex(u => u.Email).IsUnique();
    }
}
```

### Validation Commands

```bash
dotnet build           # Compile
dotnet test           # Run tests
dotnet format         # Format code
```

---

## Python Standards

**Applies to:** `.py` files

### Key Standards

#### Type Hints (Required)
```python
from typing import Optional, List

def get_user(user_id: int) -> Optional[User]:
    """Get user by ID or None if not found."""
    return db.query(User).filter(
        User.id == user_id
    ).first()

async def fetch_users(limit: int = 10) -> List[User]:
    """Fetch users asynchronously."""
    return await db.query(User).limit(limit).all()
```

#### Context Managers
```python
# Always use 'with' for resource management
def read_file(filepath: Path) -> str:
    with open(filepath, 'r') as f:
        return f.read()

# Custom context manager
@contextmanager
def db_session() -> Iterator[Session]:
    session = Session()
    try:
        yield session
        session.commit()
    except:
        session.rollback()
        raise
    finally:
        session.close()
```

#### List Comprehensions
```python
# ✅ Prefer comprehensions
active_users = [u for u in users if u.is_active]
emails = [u.email for u in users]

# ❌ Avoid loops
active = []
for u in users:
    if u.is_active:
        active.append(u)
```

#### Testing with pytest
```python
@pytest.fixture
def user_service() -> UserService:
    return UserService(db=Mock())

def test_get_user_success(user_service):
    # Arrange, Act, Assert
    result = user_service.get_user(1)
    assert result is not None
```

### Validation Commands

```bash
mypy .                        # Type check
black .                       # Format
ruff check .                  # Lint
pytest                        # Test
pytest --cov=app             # Coverage
```

---

## TypeScript Standards

**Applies to:** `.ts` and `.tsx` files

### Key Standards

#### Strict Type Checking
```typescript
// Enable in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

#### Explicit Function Types
```typescript
// ✅ Good - explicit types
function getUser(id: number): User | null {
    return users.find(u => u.id === id) ?? null;
}

// ❌ Bad - implicit any
function getUser(id) {
    return users.find(u => u.id === id);
}
```

#### Null Safety
```typescript
// Optional chaining & nullish coalescing
const email = user?.contact?.email ?? 'no-email@example.com';

// Type guards
function isUser(value: unknown): value is User {
    return value !== null && 'id' in value;
}
```

#### Generics
```typescript
interface ApiResponse<T> {
    data: T;
    status: number;
}

class Repository<T extends { id: number }> {
    findById(id: number): T | undefined {
        return this.items.get(id);
    }
}
```

#### React with TypeScript
```typescript
interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

const Button: FC<ButtonProps> = ({ label, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>
        {label}
    </button>
);
```

### Validation Commands

```bash
tsc --noEmit      # Type check
npm run lint      # Lint
npm test          # Test
npm run build     # Build
```

---

## Quality Requirements

All files must pass:

✅ **Type checking** (no implicit any)  
✅ **Linting** (no style violations)  
✅ **Compilation/Building** (zero errors)  
✅ **Testing** (passing tests, adequate coverage)  
✅ **Formatting** (consistent style)  

---

## View Full Standards

Each standard has comprehensive details:

- **[.NET Clean Architecture](../.github/instructions/dotnet-clean-architecture.instructions.md)** - Full reference
- **[Python Best Practices](../.github/instructions/python-best-practices.instructions.md)** - Full reference
- **[TypeScript Strict Mode](../.github/instructions/typescript-strict.instructions.md)** - Full reference
---

## Override Standards

If you need to bypass standards for a specific piece of code:

1. **Use appropriate comment** (language-specific)
2. **Document why** you're overriding
3. **Keep scope minimal**

**Example:**
```python
# type: ignore - Legacy API returns untyped dict
result: Any = legacy_api_call()
```

---

## Next Steps

- **[Workflows](./workflows.md)** - See standards in action
- **[Customization](./customization.md)** - Add project-specific standards
- **[Agents Guide](./agents/README.md)** - Agents that enforce standards
