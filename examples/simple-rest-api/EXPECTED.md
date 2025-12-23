# Expected Implementation

## File Structure

```
simple-rest-api/
├── src/
│   ├── main.py          (FastAPI app with routes)
│   └── models.py        (Pydantic models)
├── tests/
│   └── test_api.py      (Pytest tests)
├── requirements.txt
└── README.md
```

## Key Files

### src/main.py

```python
from fastapi import FastAPI, HTTPException
from models import User, CreateUserRequest, UpdateUserRequest
from typing import Dict
import uvicorn

app = FastAPI(title="User Management API")

# In-memory storage
users: Dict[str, User] = {}
next_id = 1

@app.post("/users", response_model=User, status_code=201)
def create_user(request: CreateUserRequest):
    global next_id
    user_id = str(next_id)
    next_id += 1
    
    user = User(id=user_id, **request.dict())
    users[user_id] = user
    return user

@app.get("/users/{user_id}", response_model=User)
def get_user(user_id: str):
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[user_id]

@app.put("/users/{user_id}", response_model=User)
def update_user(user_id: str, request: UpdateUserRequest):
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users[user_id]
    update_data = request.dict(exclude_unset=True)
    updated_user = user.copy(update=update_data)
    users[user_id] = updated_user
    return updated_user

@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str):
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    del users[user_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### src/models.py

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    age: Optional[int] = Field(None, ge=0, le=150)

class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    age: Optional[int] = Field(None, ge=0, le=150)

class User(BaseModel):
    id: str
    name: str
    email: str
    age: Optional[int] = None
```

### tests/test_api.py

```python
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_create_user():
    response = client.post("/users", json={
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert "id" in data

def test_get_user():
    # Create user first
    create_response = client.post("/users", json={
        "name": "Jane Doe",
        "email": "jane@example.com"
    })
    user_id = create_response.json()["id"]
    
    # Get user
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Jane Doe"

def test_get_nonexistent_user():
    response = client.get("/users/999")
    assert response.status_code == 404

def test_update_user():
    # Create user first
    create_response = client.post("/users", json={
        "name": "Bob",
        "email": "bob@example.com"
    })
    user_id = create_response.json()["id"]
    
    # Update user
    response = client.put(f"/users/{user_id}", json={
        "name": "Bob Updated"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Bob Updated"
    assert data["email"] == "bob@example.com"

def test_delete_user():
    # Create user first
    create_response = client.post("/users", json={
        "name": "Alice",
        "email": "alice@example.com"
    })
    user_id = create_response.json()["id"]
    
    # Delete user
    response = client.delete(f"/users/{user_id}")
    assert response.status_code == 204
    
    # Verify deleted
    get_response = client.get(f"/users/{user_id}")
    assert get_response.status_code == 404

def test_invalid_email():
    response = client.post("/users", json={
        "name": "Invalid",
        "email": "not-an-email"
    })
    assert response.status_code == 422
```

## Test Results

All tests should pass:

```
pytest tests/
======================== 6 passed in 0.45s ========================
```

## API Documentation

Available at http://localhost:8000/docs (automatic Swagger UI)

## Security Review Findings

1. ⚠️ **Missing Authentication**: No auth layer (intentional for demo)
2. ⚠️ **Missing Rate Limiting**: Should add for production
3. ⚠️ **Missing CORS**: May need CORS middleware
4. ✅ **Input Validation**: Properly implemented with Pydantic
5. ✅ **Error Messages**: Safe, no sensitive data leaked
