---
description: Generate comprehensive unit tests for selected code
agent: codebase
---

# Generate Tests Prompt

Generate unit tests for the selected code following these guidelines:

1. **Test Framework Detection**
   - .NET: Use xUnit + Moq + FluentAssertions
   - Python: Use pytest + pytest-mock
   - TypeScript: Use Jest or Vitest
   - Generic: Suggest appropriate framework

2. **Test Coverage**
   - Happy path scenarios
   - Edge cases and boundary conditions
   - Error handling and exceptions
   - Null/undefined/empty inputs
   - Integration points (mocked)

3. **Test Structure**
   - Arrange-Act-Assert pattern
   - Clear, descriptive test names
   - One assertion per test (where possible)
   - Proper setup and teardown

4. **Best Practices**
   - Test behavior, not implementation
   - Use meaningful test data
   - Mock external dependencies
   - Fast execution (no network/disk I/O)

5. **Code Quality**
   - Follow project naming conventions
   - Add comments for complex scenarios
   - Group related tests
   - Maintain DRY in test setup

After generating tests:
- Run the tests to verify they pass
- Report code coverage percentage
- Suggest additional test scenarios if needed
