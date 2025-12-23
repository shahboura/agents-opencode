# Simple REST API Example

Build a user management API with CRUD operations using Python FastAPI.

## Goal

Demonstrate basic multi-agent workflow:
1. Planning with @orchestrator
2. Implementation with @codebase
3. Security review with @review
4. Documentation with @docs

## Prerequisites

```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Time Estimate

~15 minutes

## What You'll Build

- FastAPI REST API with 4 endpoints
- In-memory user store (for simplicity)
- Input validation with Pydantic
- Comprehensive tests
- API documentation

## Agent Workflow

See [PROMPTS.md](PROMPTS.md) for exact prompts to use.

## Running the Result

```bash
# Run API
python src/main.py

# Test
pytest tests/

# View docs
open http://localhost:8000/docs
```

## Success Criteria

- ✅ All 4 CRUD endpoints working
- ✅ Input validation functioning
- ✅ Tests passing
- ✅ API docs generated
- ✅ Error handling implemented
