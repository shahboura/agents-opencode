---
layout: default
title: Instructions
nav_order: 6
---

# Coding Standards

Auto-applied standards by file type. Agents automatically detect file extensions and apply the corresponding coding standards from `.opencode/instructions/`.

## Table of Contents
- [.NET (C#)](#net-c)
- [Python](#python)
- [TypeScript](#typescript)
- [Flutter (Dart)](#flutter-dart)
- [Go](#go)
- [Java (Spring Boot)](#java-spring-boot)
- [Node.js (Express)](#nodejs-express)
- [React (Next.js)](#react-nextjs)
- [Ruby on Rails](#ruby-on-rails)
- [Rust](#rust)
- [Quality Requirements](#quality-requirements)
- [View Full Standards](#view-full-standards)

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

## Go

- Go module conventions
- Error handling with Result pattern
- Goroutine safety and channels
- Interface-based design

## Java (Spring Boot)

- Constructor injection over @Autowired
- Optional for nullable returns
- Records for immutable DTOs
- ControllerAdvice for error handling

## Node.js (Express)

- Security middleware (helmet, CORS, rate limiting)
- Async/await error handling
- Input validation with Joi/Zod
- Structured logging with pino

## React (Next.js)

- TypeScript strict mode
- Accessibility standards
- Performance optimizations
- Component composition patterns

## Ruby on Rails

- MVC pattern with RESTful conventions
- ActiveRecord validations and associations
- Service objects for complex logic
- RSpec testing with factories

## Rust

- Ownership and borrowing principles
- Result/Option error handling (no unwrap in prod)
- Zero-cost abstractions
- Memory safety guarantees

## Node.js Express

- Security middleware (helmet, CORS)
- Async/await error handling
- Input validation (Joi/Zod)
- Structured logging

## React Next.js

- TypeScript strict mode
- Function components and hooks
- Accessibility standards
- Performance optimizations

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

## Go Standards

**Applies to:** `.go` files

### Key Standards

#### Go Modules and Formatting

```go
// go.mod
module example.com/myproject

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
)
```

#### Context Passing

```go
func GetUser(ctx context.Context, id int) (*User, error) {
    // Pass context to database calls
    return db.QueryContext(ctx, "SELECT * FROM users WHERE id = ?", id)
}
```

#### Error Handling

```go
func processData(data []byte) error {
    if len(data) == 0 {
        return fmt.Errorf("data cannot be empty")
    }
    // process...
    return nil
}
```

#### Concurrency

```go
func worker(ctx context.Context, jobs <-chan Job, results chan<- Result) {
    for {
        select {
        case job := <-jobs:
            // process job
            results <- result
        case <-ctx.Done():
            return
        }
    }
}
```

### Validation Commands

```bash
go mod tidy
go vet ./...
golangci-lint run
go test ./...
```

---

## Node.js Express Standards

**Applies to:** `.js` and `.ts` files

### Key Standards

#### Security Middleware

```javascript
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

#### Async/Await Error Handling

```javascript
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});
```

#### Input Validation

```javascript
import Joi from 'joi';

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).required(),
});

app.post('/users', (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
});
```

#### Structured Logging

```javascript
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url });
  next();
});
```

### Validation Commands

```bash
npm ci
npm run lint
npm test
npm run build
```

---

## React Next.js Standards

**Applies to:** `.tsx` and `.jsx` files

### Key Standards

#### TypeScript Strict Mode

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

#### Function Components and Hooks

```typescript
const UserList: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await api.getUsers();
    setUsers(data);
    setLoading(false);
  };

  return (
    <div>
      {loading ? <p>Loading...</p> : users.map(user => <UserItem key={user.id} user={user} />)}
    </div>
  );
};
```

#### Accessibility Standards

```typescript
<button 
  aria-label="Close dialog"
  onClick={onClose}
  className="close-button"
>
  ×
</button>

<label htmlFor="email">Email Address</label>
<input 
  id="email"
  type="email"
  aria-describedby="email-help"
  required
/>
<span id="email-help">We'll never share your email.</span>
```

#### Performance Optimizations

```typescript
const ExpensiveComponent = memo(({ data }: { data: Data[] }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveCalculation(item));
  }, [data]);

  return <div>{processedData.map(item => <Item key={item.id} item={item} />)}</div>;
});
```

### Validation Commands

```bash
npm ci
npm run lint
npm test
npm run build
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

- **[.NET Clean Architecture](../.opencode/instructions/dotnet-clean-architecture.instructions.md)** - Full reference
- **[Flutter Best Practices](../.opencode/instructions/flutter.instructions.md)** - Full reference
- **[Go Best Practices](../.opencode/instructions/go.instructions.md)** - Full reference
- **[Java Spring Boot](../.opencode/instructions/java-spring-boot.instructions.md)** - Full reference
- **[Node.js Express](../.opencode/instructions/node-express.instructions.md)** - Full reference
- **[Python Best Practices](../.opencode/instructions/python-best-practices.instructions.md)** - Full reference
- **[React Next.js](../.opencode/instructions/react-next.instructions.md)** - Full reference
- **[Ruby on Rails](../.opencode/instructions/ruby-on-rails.instructions.md)** - Full reference
- **[Rust Best Practices](../.opencode/instructions/rust.instructions.md)** - Full reference
- **[SQL Migrations](../.opencode/instructions/sql-migrations.instructions.md)** - Full reference
- **[TypeScript Strict Mode](../.opencode/instructions/typescript-strict.instructions.md)** - Full reference
- **[CI/CD Hygiene](../.opencode/instructions/ci-cd-hygiene.instructions.md)** - Full reference

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
