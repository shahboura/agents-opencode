---
description: Python best practices with type hints, proper structure, and testing
applyTo: '**/*.py'
---

# Python Best Practices Instructions

## Type Hints (Required)

**Always use type hints for function signatures:**
```python
from typing import Optional, List, Dict
from datetime import datetime

def get_user(user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()

def create_user(email: str, name: str) -> User:
    """Create a new user."""
    user = User(email=email, name=name)
    db.add(user)
    db.commit()
    return user

async def fetch_users(limit: int = 10) -> List[User]:
    """Fetch users asynchronously."""
    return await db.query(User).limit(limit).all()
```

## Code Structure

### Imports Organization
```python
# Standard library imports
import os
import sys
from datetime import datetime

# Third-party imports
import pytest
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine

# Local application imports
from app.models import User
from app.services import UserService
```

### Class Definitions
```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    """User model with dataclass."""
    id: int
    email: str
    name: str
    created_at: datetime
    is_active: bool = True
    phone: Optional[str] = None
```

## Error Handling

**Use proper exception handling:**
```python
from typing import Optional

def get_user_or_fail(user_id: int) -> User:
    """Get user or raise exception."""
    user = get_user(user_id)
    if user is None:
        raise ValueError(f"User with id {user_id} not found")
    return user

def safe_divide(a: float, b: float) -> Optional[float]:
    """Divide safely, return None on error."""
    try:
        return a / b
    except ZeroDivisionError:
        return None
```

## Async/Await

**Use async for I/O operations:**
```python
import asyncio
from typing import List

async def fetch_data(url: str) -> dict:
    """Fetch data asynchronously."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

async def process_multiple_urls(urls: List[str]) -> List[dict]:
    """Process multiple URLs concurrently."""
    tasks = [fetch_data(url) for url in urls]
    return await asyncio.gather(*tasks)
```

## Context Managers

**Use `with` statements for resource management:**
```python
from pathlib import Path
from typing import Iterator

def read_file(filepath: Path) -> str:
    """Read file using context manager."""
    with open(filepath, 'r') as f:
        return f.read()

# Custom context manager
from contextlib import contextmanager

@contextmanager
def db_session() -> Iterator[Session]:
    """Database session context manager."""
    session = Session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
```

## List Comprehensions

**Prefer comprehensions over loops:**
```python
from typing import List

# ✅ Good
active_users: List[User] = [u for u in users if u.is_active]
user_emails: List[str] = [u.email for u in users]

# ✅ Dictionary comprehension
user_map: Dict[int, User] = {u.id: u for u in users}

# ❌ Avoid
active_users = []
for u in users:
    if u.is_active:
        active_users.append(u)
```

## Testing with pytest

```python
import pytest
from typing import Generator
from unittest.mock import Mock, patch

@pytest.fixture
def user_service() -> UserService:
    """Create user service for testing."""
    return UserService(db=Mock())

def test_get_user_success(user_service: UserService) -> None:
    """Test successful user retrieval."""
    # Arrange
    user_service.db.query.return_value.filter.return_value.first.return_value = User(
        id=1, email="test@example.com", name="Test User"
    )

    # Act
    user = user_service.get_user(1)

    # Assert
    assert user is not None
    assert user.email == "test@example.com"

@pytest.mark.asyncio
async def test_async_fetch() -> None:
    """Test async function."""
    result = await fetch_data("https://api.example.com")
    assert result is not None
```

## Dependency Management

**Use virtual environments:**
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Unix)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**requirements.txt structure:**
```txt
# Core dependencies
fastapi==0.104.0
sqlalchemy==2.0.0
pydantic==2.5.0

# Development dependencies
pytest==7.4.0
pytest-asyncio==0.21.0
mypy==1.7.0
black==23.11.0
ruff==0.1.0
```

## Code Quality Tools

**Run these before committing:**
```bash
# Format code
black .

# Lint code
ruff check .

# Type checking
mypy .

# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html
```

## Naming Conventions

- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private attributes: `_leading_underscore`

```python
# Constants
MAX_RETRIES: int = 3
API_BASE_URL: str = "https://api.example.com"

# Class with private attributes
class UserService:
    def __init__(self, db: Database) -> None:
        self._db = db  # Private
        self.cache = {}  # Public

    def _validate_email(self, email: str) -> bool:
        """Private method."""
        return "@" in email
```

## Docstrings

**Use Google-style docstrings:**
```python
def create_user(email: str, name: str, age: int) -> User:
    """Create a new user in the database.

    Args:
        email: User's email address
        name: User's full name
        age: User's age in years

    Returns:
        Created user instance

    Raises:
        ValueError: If email is invalid
        DatabaseError: If database operation fails

    Example:
        >>> user = create_user("test@example.com", "Test User", 25)
        >>> print(user.email)
        test@example.com
    """
    if not validate_email(email):
        raise ValueError(f"Invalid email: {email}")

    user = User(email=email, name=name, age=age)
    db.add(user)
    db.commit()
    return user
```

## Quality Requirements

**Every Python file MUST:**
1. ✅ Include type hints on all functions
2. ✅ Pass mypy type checking
3. ✅ Be formatted with black
4. ✅ Pass ruff linting
5. ✅ Use context managers for resources
6. ✅ Include docstrings for public APIs
7. ✅ Have unit tests with pytest
