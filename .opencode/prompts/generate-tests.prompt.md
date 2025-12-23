---
description: Generate comprehensive unit tests for selected code
agent: codebase
---

# Generate Tests Prompt

Generate unit tests for the selected code following these guidelines:

## 1. Test Framework Detection

Auto-detect based on project:
- **.NET**: Use xUnit + Moq + FluentAssertions
- **Python**: Use pytest + pytest-mock
- **TypeScript**: Use Jest or Vitest
- **Go**: Use standard testing package + testify
- **Generic**: Suggest appropriate framework

## 2. Test Coverage Requirements

Generate tests for:
- ✅ Happy path scenarios
- ✅ Edge cases and boundary conditions
- ✅ Error handling and exceptions
- ✅ Null/undefined/empty inputs
- ✅ Integration points (mocked)
- ✅ Concurrent/async scenarios if applicable

## 3. Test Structure

Use **Arrange-Act-Assert** pattern:
```
// Arrange: Set up test data and mocks
// Act: Execute the code under test
// Assert: Verify expected outcomes
```

**Best Practices:**
- Clear, descriptive test names (describe what's being tested)
- One logical assertion per test
- Proper setup and teardown
- Isolated tests (no shared state)

## 4. Code Quality Standards

- Follow project naming conventions
- Add comments only for complex scenarios
- Group related tests in classes/describe blocks
- Maintain DRY in test setup (use fixtures/helpers)
- Fast execution (mock external I/O)

## 5. Test Examples by Language

### .NET (xUnit)
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
    public async Task GetUserAsync_ValidId_ReturnsUser()
    {
        // Arrange
        var expected = new User { Id = 1, Email = "test@example.com" };
        _mockRepo.Setup(r => r.GetByIdAsync(1, default))
            .ReturnsAsync(expected);

        // Act
        var result = await _sut.GetUserAsync(1, default);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be(expected.Email);
    }

    [Fact]
    public async Task GetUserAsync_InvalidId_ReturnsNull()
    {
        // Arrange
        _mockRepo.Setup(r => r.GetByIdAsync(999, default))
            .ReturnsAsync((User)null);

        // Act
        var result = await _sut.GetUserAsync(999, default);

        // Assert
        result.Should().BeNull();
    }
}
```

### Python (pytest)
```python
import pytest
from unittest.mock import Mock, AsyncMock

@pytest.fixture
def user_service(mocker):
    """Create user service with mocked dependencies."""
    mock_repo = mocker.Mock()
    return UserService(repository=mock_repo)

def test_get_user_valid_id_returns_user(user_service):
    """Test that get_user returns user for valid ID."""
    # Arrange
    expected = User(id=1, email="test@example.com")
    user_service.repository.get_by_id.return_value = expected

    # Act
    result = user_service.get_user(1)

    # Assert
    assert result is not None
    assert result.email == expected.email

def test_get_user_invalid_id_returns_none(user_service):
    """Test that get_user returns None for invalid ID."""
    # Arrange
    user_service.repository.get_by_id.return_value = None

    # Act
    result = user_service.get_user(999)

    # Assert
    assert result is None

@pytest.mark.asyncio
async def test_fetch_user_async_success(user_service):
    """Test async user fetch succeeds."""
    # Arrange
    user_service.repository.fetch = AsyncMock(return_value={"id": 1})

    # Act
    result = await user_service.fetch_user(1)

    # Assert
    assert result["id"] == 1
```

### TypeScript (Jest/Vitest)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './UserService';
import type { UserRepository } from './UserRepository';

describe('UserService', () => {
  let userService: UserService;
  let mockRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepo = {
      getById: vi.fn(),
      create: vi.fn(),
    } as jest.Mocked<UserRepository>;
    
    userService = new UserService(mockRepo);
  });

  it('should return user for valid ID', async () => {
    // Arrange
    const expected = { id: 1, email: 'test@example.com' };
    mockRepo.getById.mockResolvedValue(expected);

    // Act
    const result = await userService.getUser(1);

    // Assert
    expect(result).toEqual(expected);
    expect(mockRepo.getById).toHaveBeenCalledWith(1);
  });

  it('should return null for invalid ID', async () => {
    // Arrange
    mockRepo.getById.mockResolvedValue(null);

    // Act
    const result = await userService.getUser(999);

    // Assert
    expect(result).toBeNull();
  });
});
```

## 6. After Test Generation

1. **Run tests** to verify they pass
2. **Report coverage** percentage if tooling available
3. **Suggest additional scenarios** not covered
4. **Identify flaky tests** (timing, ordering dependencies)

## 7. Common Test Patterns

### Testing Error Handling
```typescript
it('should throw error for invalid input', () => {
  expect(() => service.process(null)).toThrow('Invalid input');
});
```

### Testing Async Operations
```python
@pytest.mark.asyncio
async def test_concurrent_requests():
    results = await asyncio.gather(
        service.fetch(1),
        service.fetch(2)
    )
    assert len(results) == 2
```

### Parameterized Tests
```csharp
[Theory]
[InlineData(0, false)]
[InlineData(1, true)]
[InlineData(100, true)]
public void IsPositive_ReturnsExpected(int input, bool expected)
{
    var result = MathHelper.IsPositive(input);
    result.Should().Be(expected);
}
```

## Output Checklist

After generating tests, confirm:
- [ ] All public methods have test coverage
- [ ] Edge cases identified and tested
- [ ] Error paths tested
- [ ] Mocks properly configured
- [ ] Tests are isolated and repeatable
- [ ] Test names clearly describe what's tested
- [ ] All tests pass when run
