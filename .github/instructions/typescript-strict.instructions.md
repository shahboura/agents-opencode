---
description: TypeScript strict mode with type safety and modern patterns
applyTo: '**/*.{ts,tsx}'
---

# TypeScript Strict Mode Instructions

## TypeScript Configuration

**Enable strict mode in tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Type Definitions

**Always define explicit types:**
```typescript
// ✅ Good - Explicit types
interface User {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
  phone?: string; // Optional
}

function getUser(id: number): User | null {
  return users.find(u => u.id === id) ?? null;
}

// ❌ Bad - Implicit any
function getUser(id) {
  return users.find(u => u.id === id);
}
```

## Null Safety

**Use strict null checks:**
```typescript
// ✅ Good - Handle null explicitly
function getUserEmail(userId: number): string | null {
  const user = getUser(userId);
  return user?.email ?? null;
}

// Optional chaining and nullish coalescing
const email = user?.contact?.email ?? 'no-email@example.com';

// Type guards
function isValidUser(user: User | null): user is User {
  return user !== null && user.isActive;
}

if (isValidUser(user)) {
  // TypeScript knows user is User here
  console.log(user.email);
}
```

## Function Types

**Define function signatures properly:**
```typescript
// Function type
type UserValidator = (user: User) => boolean;

// Generic functions
function findById<T extends { id: number }>(
  items: T[],
  id: number
): T | undefined {
  return items.find(item => item.id === id);
}

// Async functions
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Arrow function with explicit return type
const createUser = (email: string, name: string): User => ({
  id: generateId(),
  email,
  name,
  createdAt: new Date(),
  isActive: true,
});
```

## Generics

**Use generics for reusable code:**
```typescript
// Generic interface
interface ApiResponse<T> {
  data: T;
  status: number;
  error?: string;
}

// Generic class
class Repository<T extends { id: number }> {
  private items: Map<number, T> = new Map();

  add(item: T): void {
    this.items.set(item.id, item);
  }

  findById(id: number): T | undefined {
    return this.items.get(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }
}

// Usage
const userRepo = new Repository<User>();
```

## Type Guards and Narrowing

```typescript
// Type guard function
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Discriminated unions
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>): void {
  if (result.success) {
    // TypeScript knows result.data exists
    console.log(result.data);
  } else {
    // TypeScript knows result.error exists
    console.error(result.error);
  }
}
```

## Utility Types

**Leverage TypeScript utility types:**
```typescript
interface User {
  id: number;
  email: string;
  name: string;
  password: string;
}

// Pick specific properties
type UserPublic = Pick<User, 'id' | 'email' | 'name'>;

// Omit specific properties
type UserWithoutPassword = Omit<User, 'password'>;

// Partial - all properties optional
type UserUpdate = Partial<User>;

// Required - all properties required
type UserCreate = Required<Omit<User, 'id'>>;

// Readonly
type ImmutableUser = Readonly<User>;

// Record
type UserMap = Record<number, User>;
```

## React with TypeScript

```typescript
import { FC, ReactNode, useState } from 'react';

// Props interface
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

// Functional component with props
const Button: FC<ButtonProps> = ({ 
  label, 
  onClick, 
  disabled = false,
  children 
}) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
      {children}
    </button>
  );
};

// Component with state
interface UserListProps {
  initialUsers: User[];
}

const UserList: FC<UserListProps> = ({ initialUsers }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleSelect = (id: number): void => {
    setSelectedId(id);
  };

  return (
    <div>
      {users.map(user => (
        <div key={user.id} onClick={() => handleSelect(user.id)}>
          {user.name}
        </div>
      ))}
    </div>
  );
};
```

## Error Handling

```typescript
// Custom error types
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Type-safe error handling
type AsyncResult<T> = Promise<Result<T>>;

async function fetchUserSafe(id: number): AsyncResult<User> {
  try {
    const user = await fetchUser(id);
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Const Assertions

```typescript
// Const assertion for literal types
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'guest'

// Object literal
const CONFIG = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} as const;

type Config = typeof CONFIG;
```

## Testing with TypeScript

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('UserService', () => {
  it('should get user by id', async () => {
    // Arrange
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      isActive: true,
    };

    const userService = new UserService();
    vi.spyOn(userService, 'getUser').mockResolvedValue(mockUser);

    // Act
    const result = await userService.getUser(1);

    // Assert
    expect(result).toEqual(mockUser);
    expect(result.email).toBe('test@example.com');
  });
});
```

## Naming Conventions

- Interfaces/Types: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Enums: `PascalCase`

```typescript
// Enum
enum UserRole {
  Admin = 'ADMIN',
  User = 'USER',
  Guest = 'GUEST',
}

// Const
const MAX_RETRY_ATTEMPTS = 3;

// Interface
interface ApiConfig {
  baseUrl: string;
  timeout: number;
}
```

## Quality Requirements

**Every TypeScript file MUST:**
1. ✅ Pass strict type checking (no `any` without good reason)
2. ✅ Use explicit return types on functions
3. ✅ Handle null/undefined properly
4. ✅ Compile with zero errors
5. ✅ Pass ESLint checks
6. ✅ Have unit tests

## Build Commands

```bash
# Type check
tsc --noEmit

# Build
tsc

# Lint
eslint . --ext .ts,.tsx

# Test
vitest run

# All checks
npm run check
```
