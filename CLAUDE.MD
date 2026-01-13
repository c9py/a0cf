# Agent Zero (a0cf) - Claude Code Guide

## Project Overview

Agent Zero is a dynamic, agentic AI framework designed as a general-purpose personal assistant. It's an open-source Python-based AI agent framework with modular architecture supporting agents, tools, extensions, instruments, memory, and knowledge bases.

**Version**: 0.9.7 (Projects feature)
**License**: MIT

## Technology Stack

### Backend
- **Python 3.x** - Core framework
- **Flask** - Web server with async support
- **LiteLLM** - Multi-model LLM provider abstraction (OpenAI, Anthropic, OpenRouter, Azure, local models)
- **Langchain** - LLM integration components
- **Paramiko** - SSH client for remote code execution
- **FAISS/Sentence-Transformers** - Vector databases and embeddings for memory/knowledge
- **Pydantic** - Data validation

### Frontend
- **Vanilla JavaScript** (ES modules)
- **HTML5/CSS3**
- **Cloudflare Workers** - API backend (`/workers` directory)
- **Vitest** - Frontend testing
- **Playwright** - E2E browser testing

### Infrastructure
- **Docker** - Runtime containerization
- **Wrangler** - Cloudflare Workers CLI

## Project Structure

```
/home/user/a0cf/
├── python/                  # Python backend
│   ├── api/                 # API handlers (Flask endpoints)
│   ├── helpers/             # Utility modules (files, secrets, auth)
│   ├── tools/               # Agent tools (code_execution, etc.)
│   ├── extensions/          # Agent extensions
│   └── instruments/         # Agent instruments
├── webui/                   # Frontend web interface
│   ├── js/                  # JavaScript modules
│   └── css/                 # Stylesheets
├── workers/                 # Cloudflare Workers API
├── docs/                    # Documentation
├── prompts/                 # AI prompt templates
├── tests/                   # Test suites
│   ├── frontend/            # Frontend unit tests
│   ├── workers/             # Workers tests
│   └── e2e/                 # Playwright E2E tests
└── tmp/                     # Temporary files and uploads
```

## Key Files

- `run_ui.py` - Main Flask web server entry point
- `python/helpers/login.py` - Authentication logic
- `python/helpers/secrets.py` - Secrets management with masking
- `python/helpers/files.py` - File operations and path handling
- `python/api/api_files_get.py` - File API endpoint
- `python/tools/code_execution_tool.py` - Code execution tool
- `python/helpers/shell_ssh.py` - SSH interactive sessions

## Running the Project

### Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the web UI
python run_ui.py
```

### Docker
```bash
docker-compose up
```

### Tests
```bash
# Frontend tests
cd webui && npm test

# Workers tests
cd workers && npm test

# E2E tests
cd tests/e2e && npx playwright test
```

## Security Architecture

### Authentication
- Optional login via `AUTH_LOGIN` and `AUTH_PASSWORD` environment variables
- Session-based authentication with secure cookies (SameSite=Strict)
- CSRF token protection on state-changing requests
- API key authentication for external API access

### Secrets Management
- Secrets stored in `tmp/secrets.env` (never in settings.json)
- Automatic masking of secrets in output streams
- Placeholder format: `§§secret(KEY_NAME)`

### Code Execution
- Docker containerization for isolated execution
- SSH-based remote execution support
- Configurable timeouts (30s first output, 180s max execution)

## Development Guidelines

### Adding New API Endpoints
1. Create handler in `python/api/`
2. Extend `ApiHandler` base class
3. Implement `requires_auth()`, `requires_csrf()`, `requires_api_key()` as needed
4. Implement `process()` method

### Path Security
- Always use `files.get_abs_path()` for path resolution
- Validate paths are within allowed directories using `files.is_in_base_dir()`
- Use `os.path.realpath()` to resolve symlinks before validation

### Testing
- Write unit tests for new functionality
- Use Vitest for frontend tests
- Use Playwright for E2E tests
- Run full test suite before committing

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH_LOGIN` | Optional username for authentication |
| `AUTH_PASSWORD` | Optional password for authentication |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |
| `CODE_EXEC_SSH_ENABLED` | Enable SSH-based code execution |
| `CODE_EXEC_SSH_ADDR` | SSH server address |
| `CODE_EXEC_SSH_PORT` | SSH server port |
| `CODE_EXEC_SSH_USER` | SSH username |
| `CODE_EXEC_SSH_PASS` | SSH password |

## Common Tasks

### Debugging API Issues
1. Check Flask logs in console
2. Verify authentication requirements
3. Test with valid API key/session

### Adding New Tools
1. Create tool class in `python/tools/`
2. Extend `Tool` base class
3. Implement `execute()` method
4. Register in agent configuration

### Memory/Knowledge Base
- FAISS vector store for semantic search
- Sentence-transformers for embeddings
- Project-scoped knowledge bases
