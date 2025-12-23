# Agent Prompts for Simple REST API

Follow these prompts in order with the appropriate agents.

## Step 1: Planning (@orchestrator)

```
@orchestrator Plan a simple REST API for user management:
- Language: Python with FastAPI
- Features: CRUD operations (Create, Read, Update, Delete)
- Storage: In-memory for simplicity
- Requirements:
  * Input validation with Pydantic
  * Error handling (404, 400)
  * Unit tests with pytest
  * Auto-generated API docs
- Output: Step-by-step implementation plan
```

**Expected Output:**
- Detailed plan with phases
- List of files to create
- Testing strategy
- Documentation approach

## Step 2: Implementation (@codebase)

```
@codebase Implement the REST API according to the plan:
- Create FastAPI app with 4 endpoints:
  * POST /users - Create user
  * GET /users/{id} - Get user by ID
  * PUT /users/{id} - Update user
  * DELETE /users/{id} - Delete user
- Use Pydantic models for validation
- In-memory dict for storage
- Include error handling
- Add comprehensive pytest tests
- Follow Python best practices (type hints, docstrings)
```

**Expected Output:**
- `src/main.py` - FastAPI app
- `src/models.py` - Pydantic models
- `tests/test_api.py` - Pytest tests
- All tests passing

## Step 3: Security Review (@review)

```
@review Audit the API for security issues:
- Input validation completeness
- Error message safety (no sensitive data leaks)
- Missing authentication/authorization (note for production)
- SQL injection risks (N/A for in-memory)
- Rate limiting needs
```

**Expected Output:**
- Security audit report
- List of findings with severity
- Recommendations for production hardening

## Step 4: Documentation (@docs)

```
@docs Create comprehensive API documentation:
- README with setup instructions
- API endpoint reference
- Example requests/responses
- Error codes and meanings
- Development and testing guide
```

**Expected Output:**
- Updated README.md
- API_DOCS.md with endpoint details
- Examples for each endpoint

## Step 5: Final Validation

Run the API and test manually:

```bash
python src/main.py &
curl http://localhost:8000/docs
pytest tests/
```

## Notes

- Approve each agent's plan before execution
- Review code after each step
- Run tests frequently
- Keep context updated in AGENTS.md
