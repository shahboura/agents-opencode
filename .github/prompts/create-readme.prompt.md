---
description: Generate a comprehensive, professional README.md file for your project
agent: docs
---

# Create README Prompt

Generate a comprehensive README.md file for this project following best practices.

## Analysis Phase

First, analyze the project:
1. Scan the codebase to understand the project type
2. Identify the main technology stack
3. Find existing configuration files (package.json, pyproject.toml, *.csproj, etc.)
4. Detect project structure and organization
5. Identify key features from code

## README Structure

Generate a README with these sections:

### 1. Project Title & Description
- Clear, descriptive title
- Concise 1-2 sentence description
- Badges (build status, license, version, etc.)

### 2. Features
- Bullet list of key features
- What makes this project valuable
- Core capabilities

### 3. Tech Stack
- Languages and frameworks
- Key dependencies
- Tools and platforms

### 4. Getting Started

**Prerequisites:**
- Required software (Node.js version, Python version, .NET SDK, etc.)
- System requirements
- API keys or accounts needed

**Installation:**
```bash
# Step-by-step installation commands
# For Node.js/npm
npm install

# For Python
pip install -r requirements.txt

# For .NET
dotnet restore
```

**Configuration:**
- Environment variables needed
- Config file setup
- Example .env file

**Running the Project:**
```bash
# Development mode
npm run dev

# Production build
npm run build

# Run tests
npm test
```

### 5. Usage

Provide clear examples:

```language
// Code examples showing how to use the project
// Include common use cases
// Show expected output
```

### 6. API Documentation (if applicable)

**Endpoints:**
```
GET /api/users
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

**Example Request:**
```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

### 7. Project Structure

```
project-root/
├── src/                    # Source code
│   ├── components/        # React components
│   ├── services/          # Business logic
│   └── utils/             # Utility functions
├── tests/                 # Test files
├── docs/                  # Documentation
├── .env.example          # Environment template
├── package.json          # Dependencies
└── README.md             # This file
```

### 8. Development

**Setup Development Environment:**
- IDE recommendations
- Required extensions
- Linting and formatting setup

**Running Tests:**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test UserService
```

**Coding Standards:**
- Follow ESLint/Prettier configuration
- Use TypeScript strict mode
- Write tests for new features
- Follow conventional commits

### 9. Deployment

**Build:**
```bash
npm run build
```

**Deploy to [Platform]:**
```bash
# Deployment commands
```

**Environment Variables:**
```
VARIABLE_NAME=value
API_KEY=your_key_here
DATABASE_URL=postgres://...
```

### 10. Contributing

```markdown
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass
- Code follows project style guidelines
- Documentation is updated
```

### 11. Troubleshooting

**Common Issues:**

**Issue 1: [Problem]**
```
Error message
```
**Solution:**
```bash
fix command
```

**Issue 2: [Problem]**
**Solution:** [Step-by-step fix]

### 12. License

```
MIT License

Copyright (c) [year] [author]

[Full license text or link]
```

### 13. Contact & Support

- **Author:** [Name]
- **Email:** [email]
- **GitHub:** [@username](https://github.com/username)
- **Issues:** [Link to issues](https://github.com/user/repo/issues)

### 14. Acknowledgments

- Libraries and tools used
- Inspiration sources
- Contributors

## Formatting Guidelines

- Use proper markdown syntax
- Add code fence language tags
- Include working links
- Use badges from shields.io
- Add screenshots/GIFs for UI projects
- Keep line length reasonable
- Use tables where appropriate

## Badges to Include

```markdown
![Build Status](https://github.com/user/repo/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/user/repo)
![Version](https://img.shields.io/github/v/release/user/repo)
![Coverage](https://img.shields.io/codecov/c/github/user/repo)
```

## Quality Checklist

After generating README, ensure:
- [ ] All code examples are accurate
- [ ] All commands are tested
- [ ] Links work correctly
- [ ] No placeholder text remains
- [ ] Spelling and grammar checked
- [ ] Appropriate detail level (not too verbose, not too sparse)
- [ ] Beginner-friendly explanations
- [ ] Advanced usage documented

## Tone & Style

- Professional but approachable
- Clear and concise
- Assume reader is a developer
- Explain "why" not just "what"
- Use active voice
- Be specific with versions and requirements
---

Generate the README now based on the current project structure and code.
