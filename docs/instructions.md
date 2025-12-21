# Coding Standards

Auto-applied standards by file type.

## .NET (C#)
- Clean Architecture layers
- Async/await with CancellationToken
- Nullable reference types
- Constructor dependency injection

## Python
- Type hints on all functions
- Context managers for resources
- List comprehensions over loops
- Async/await for I/O

## TypeScript
- Strict mode enabled
- Explicit types, no implicit any
- Strict null checks
- Utility types (Pick, Omit, etc.)

## Flutter (Dart)
- Riverpod for state management
- Freezed for immutable models
- Result pattern for error handling
- Provider for dependency injection

Standards activate automatically when editing matching files.
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

## Flutter Standards

**Applies to:** `.dart` files

### Key Standards

#### State Management with Riverpod
```dart
// Riverpod provider
final userProvider = StateNotifierProvider<UserNotifier, User?>((ref) {
  return UserNotifier();
});

class UserNotifier extends StateNotifier<User?> {
  UserNotifier() : super(null);

  Future<void> login(String email, String password) async {
    state = await _authService.login(email, password);
  }
}

// Usage in widget
class ProfileScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);

    return user == null
        ? LoginScreen()
        : UserProfile(user: user);
  }
}
```

#### Immutable Models with freezed
```dart
@freezed
class User with _$User {
  const factory User({
    required int id,
    required String email,
    required String name,
    @JsonKey(name: 'avatar_url') String? avatarUrl,
    @Default(true) bool isActive,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

#### Result Pattern for Error Handling
```dart
sealed class Result<T> {
  const Result();

  factory Result.success(T data) = Success<T>;
  factory Result.error(String message) = Error<T>;
}

// Usage in repository
Future<Result<User>> getUser(int id) async {
  try {
    final user = await _api.getUser(id);
    return Result.success(user);
  } catch (e) {
    return Result.error('Failed to fetch user: $e');
  }
}
```

#### Widget Testing
```dart
void main() {
  testWidgets('CounterButton increments count on tap',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [counterProvider.overrideWith((ref) => CounterNotifier())],
        child: MaterialApp(home: CounterButton()),
      ),
    );

    expect(find.text('Count: 0'), findsOneWidget);

    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();

    expect(find.text('Count: 1'), findsOneWidget);
  });
}
```

### Validation Commands

```bash
flutter analyze      # Static analysis
flutter test         # Run tests
dart format .        # Format code
flutter build apk    # Build APK
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
- **[Flutter Best Practices](../.github/instructions/flutter.instructions.md)** - Full reference
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
