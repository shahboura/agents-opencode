---
description: Create comprehensive README documentation for a project
agent: docs
---

# Create README Prompt

Generate a complete, professional README.md file for the project based on codebase analysis.

## README Structure

```markdown
# [Project Name]

[Project tagline or one-sentence description]

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/shahboura/agents-opencode/validate.yml?branch=main)](https://github.com/shahboura/agents-opencode/actions)

## Overview

[2-3 paragraph description of what the project does, who it's for, and why it exists]

**Key Features:**
- 🚀 Feature 1 - Brief description
- 🔒 Feature 2 - Brief description
- 📊 Feature 3 - Brief description
- ⚡ Feature 4 - Brief description

## Table of Contents

- [Getting Started](#getting-started)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- [Tool/Language] version X.X or higher
- [Database] (optional, for full features)
- [Other dependencies]

### Quick Start

```bash
# Clone the repository
git clone https://github.com/shahboura/agents-opencode.git
cd project-name

# Install dependencies
npm install  # or pip install -r requirements.txt, dotnet restore, etc.

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run the application
npm start  # or python main.py, dotnet run, etc.
```

Visit `http://localhost:3000` to see the application.

## Installation

### Option 1: Local Development

#### For Node.js Projects
```bash
npm install
npm run build
npm start
```

#### For Python Projects
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

#### For .NET Projects
```bash
dotnet restore
dotnet build
dotnet run --project src/WebAPI
```

### Option 2: Docker

```bash
docker build -t project-name .
docker run -p 3000:3000 project-name
```

### Option 3: Using Docker Compose

```bash
docker-compose up -d
```

## Usage

### Basic Example

```typescript
import { ExampleClass } from 'project-name';

const instance = new ExampleClass({
  option1: 'value1',
  option2: 'value2'
});

const result = await instance.doSomething();
console.log(result);
```

### Advanced Example

```typescript
// More complex usage scenario
const advanced = new ExampleClass({
  option1: 'value1',
  option2: 'value2',
  advanced: {
    feature1: true,
    feature2: 'custom'
  }
});

// With custom configuration
advanced.configure({
  timeout: 5000,
  retries: 3
});

const result = await advanced.processData({
  input: 'data',
  format: 'json'
});
```

### CLI Usage (if applicable)

```bash
# List all commands
project-name --help

# Run specific command
project-name command --option value

# Examples
project-name generate --type model --name User
project-name deploy --environment production
```

## Configuration

Configuration via environment variables or `.env` file:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | Database connection string | - | Yes |
| `API_KEY` | External API key | - | Yes |
| `PORT` | Server port | 3000 | No |
| `LOG_LEVEL` | Logging level | info | No |
| `REDIS_URL` | Redis connection (optional) | - | No |

**Example `.env` file:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
API_KEY=your_api_key_here
PORT=3000
LOG_LEVEL=debug
```

## API Reference

### REST API Endpoints

#### `GET /api/resource`
Retrieve a list of resources.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1
  }
}
```

#### `POST /api/resource`
Create a new resource.

**Request Body:**
```json
{
  "name": "Resource Name",
  "type": "example"
}
```

**Response:** `201 Created`

See full API documentation (add link to your docs site)

## Development

### Project Structure

```
project-name/
├── src/
│   ├── controllers/    # Route handlers
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   └── utils/          # Utility functions
├── tests/              # Test files
├── docs/               # Documentation
├── .env.example        # Environment template
└── README.md           # This file
```

### Running in Development Mode

```bash
npm run dev          # Node.js with hot reload
# or
dotnet watch run     # .NET with hot reload
# or
python main.py --dev # Python with auto-reload
```

### Code Style

This project uses:
- **Linting:** ESLint / Pylint / RuboCop
- **Formatting:** Prettier / Black / dotnet format
- **Pre-commit hooks:** Husky / pre-commit

Run checks:
```bash
npm run lint         # Lint code
npm run format       # Format code
npm run type-check   # Type checking
```

## Testing

### Run All Tests

```bash
npm test             # Node.js/TypeScript
pytest               # Python
dotnet test          # .NET
go test ./...        # Go
```

### Run with Coverage

```bash
npm run test:coverage
# or
pytest --cov=src --cov-report=html
# or
dotnet test /p:CollectCoverage=true
```

### Test Structure

```
tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── e2e/             # End-to-end tests
```

## Deployment

### Environment Setup

1. Set production environment variables
2. Build the application
3. Run database migrations
4. Start the server

### Deploy to Cloud Platforms

#### Heroku
```bash
heroku create app-name
git push heroku main
heroku run npm run migrate
```

#### AWS/Azure/GCP
See deployment guide (add link to your deployment docs)

#### Docker Production
```bash
docker build -t project-name:latest .
docker run -d -p 80:3000 \
  -e DATABASE_URL=$DATABASE_URL \
  project-name:latest
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Please ensure:**

- All tests pass
- Code is linted and formatted
- Documentation is updated
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

<!-- Update these template links with actual project files -->
See CONTRIBUTING.md for detailed guidelines.

## License

This project is licensed under the MIT License - see https://opensource.org/licenses/MIT for details.

## Support

<!-- Update these template links with actual project documentation -->

- 📖 [Documentation](https://docs.example.com)
- 💬 [Discord Community](https://discord.gg/example)
- 🐛 [Issue Tracker](https://github.com/shahboura/agents-opencode/issues)
- 📧 Email: support@example.com

## Acknowledgments

- Thanks to [contributor] for [contribution]
- Built with [tool/library]
- Inspired by [project]

---

**Made with ❤️ by [Your Name/Organization]**
```

## Content Guidelines

### Overview Section
- Clear value proposition in first paragraph
- Explain the "why" - what problem does it solve?
- Target audience identification
- Key differentiators

### Installation Section
- Multiple installation methods
- Platform-specific instructions (Windows, macOS, Linux)
- Common issues and troubleshooting
- Verification steps

### Usage Section
- Start simple, then show advanced
- Real-world examples
- Common use cases
- Best practices

### Configuration Section
- All environment variables documented
- Required vs optional clearly marked
- Security considerations noted
- Example configurations provided

### API Reference
- Brief overview with link to detailed docs
- Most common endpoints documented
- Request/response examples
- Error handling

### Development Section
- How to set up dev environment
- Code organization explained
- Development workflow
- Testing approach

## Best Practices

1. **Keep it scannable**: Use headers, lists, and tables
2. **Show, don't just tell**: Include code examples
3. **Be concise**: Link to detailed docs instead of dumping everything
4. **Stay updated**: Include version info and last updated date
5. **Be welcoming**: Friendly tone, assume no prior knowledge
6. **Add badges**: Build status, coverage, version, license
7. **Include visuals**: Screenshots, diagrams, GIFs of key features

## Checklist

After generating README, verify:
- [ ] Clear project description
- [ ] Installation instructions work
- [ ] Usage examples run without errors
- [ ] All links are valid
- [ ] Configuration options documented
- [ ] Development setup explained
- [ ] Testing instructions included
- [ ] Contributing guidelines present
- [ ] License specified
- [ ] Contact/support information provided
