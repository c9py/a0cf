# CI/CD Setup for Agent Zero (a0cf)

## Overview

This document describes the comprehensive CI/CD pipeline configured for the Agent Zero Cloudflare deployment.

## GitHub Repository

- **Repository**: https://github.com/c9py/a0cf
- **Default Branch**: `main`

## Workflows

### 1. CI/CD Pipeline (`.github/workflows/ci.yml`)

Triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual dispatch

#### Jobs

| Job | Description | Status |
|-----|-------------|--------|
| **Workers Backend Unit Tests** | Runs vitest tests for Workers API handlers | ✅ Passing |
| **Workers Backend Lint** | ESLint checks for Workers code | ✅ Passing |
| **Frontend Unit Tests** | Runs vitest tests for frontend modules | ✅ Passing |
| **Frontend Lint** | ESLint checks for frontend code | ✅ Passing |
| **E2E Tests** | Playwright tests against live deployment | ✅ Running |
| **Deploy Workers** | Deploys to Cloudflare Workers (main only) | Conditional |
| **Deploy Pages** | Deploys to Cloudflare Pages (main only) | Conditional |
| **CI Summary** | Generates pipeline summary report | Always |

### 2. Scheduled E2E Tests (`.github/workflows/e2e-scheduled.yml`)

Runs daily at 6 AM UTC to monitor production health.

#### Jobs

- Full E2E test suite across multiple browsers (Chromium, Firefox, WebKit)
- Mobile E2E tests (Mobile Chrome, Mobile Safari)
- API health checks
- Summary report

## Test Suites

### Workers Backend Tests (`workers/tests/index.test.js`)

**Coverage**: 60+ test cases

| Category | Tests |
|----------|-------|
| URL Routing | Path parsing, query parameters |
| JSON Response Helper | Content-type, CORS headers, status codes |
| Health Endpoint | Status, runtime info, timestamp |
| Version Endpoint | Version string, features list |
| CSRF Token | Token generation, uniqueness |
| Settings | Model configurations |
| Poll Endpoint | Contexts, logs, filtering |
| Chat Management | Create, load, reset, remove |
| Message Handling | Text, unicode, special characters |
| Memory Dashboard | Search, subdirs, actions |
| Tasks Endpoint | Task listing, error handling |
| Agent Control | Pause, unpause, nudge, restart |
| History & Context | History retrieval |
| Backup Endpoints | Create, download, inspect |
| Notifications | Create, banners |
| Speech Endpoints | Synthesize, transcribe |
| CORS Handling | OPTIONS response, headers |
| Error Handling | 404, invalid JSON |
| Integration Tests | Full chat flow |

### Frontend Tests (`webui/tests/unit/api.test.js`)

**Coverage**: 30+ test cases

| Category | Tests |
|----------|-------|
| fetchApi | URL construction, CSRF tokens, retry logic |
| callJsonApi | Content-type, body serialization, error handling |
| URL Construction | Base URL handling, special characters |
| CSRF Token Caching | Token reuse, cookie setting |
| Error Handling | Network errors, malformed JSON |
| Credentials Handling | External vs same-origin |
| Integration Tests | Sequential requests, full cycle |

### E2E Tests (`webui/tests/e2e/app.spec.js`)

**Coverage**: 30+ test cases

| Category | Tests |
|----------|-------|
| Page Load & Initial State | Main page, sidebar, content area |
| API Connection | CSRF token, health, poll, settings |
| Chat Functionality | New chat, create via API, input area |
| Settings Modal | Button, modal open, data fetch |
| Memory Dashboard | Button, data fetch |
| Task Scheduler | Data fetch |
| Navigation | Sidebar toggle, section navigation |
| Responsive Design | Desktop, tablet, mobile |
| Error Handling | Invalid endpoint, malformed data |
| Accessibility | Focusable elements, button labels |
| Performance | Load time |
| Integration | Full chat flow, settings flow |
| Security | CORS headers, CSRF token |

## Configuration Files

### Workers

- `workers/package.json` - Dependencies and scripts
- `workers/vitest.config.js` - Vitest configuration
- `workers/.eslintrc.json` - ESLint rules
- `workers/wrangler.toml` - Cloudflare Workers config

### Frontend

- `webui/package.json` - Dependencies and scripts
- `webui/vitest.config.js` - Vitest configuration
- `webui/playwright.config.js` - Playwright configuration
- `webui/.eslintrc.json` - ESLint rules

## Running Tests Locally

### Workers Tests

```bash
cd workers
pnpm install
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage
pnpm lint          # Run linter
```

### Frontend Tests

```bash
cd webui
pnpm install
pnpm test          # Run unit tests
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage
pnpm test:e2e      # Run E2E tests
pnpm lint          # Run linter
```

## Required Secrets

Configure these secrets in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token for deployments |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

## Caching

The CI pipeline uses pnpm store caching to speed up builds:
- Separate cache keys for workers and webui
- Cache is restored based on lockfile hash
- Reduces install time on subsequent runs

## Artifacts

The following artifacts are uploaded on each run:
- `workers-coverage-report` - Workers test coverage
- `frontend-coverage-report` - Frontend test coverage
- `playwright-report` - E2E test HTML report
- `e2e-test-results` - E2E test results JSON

## Best Practices

1. **All tests must pass** before merging to main
2. **Lint checks** catch code style issues early
3. **E2E tests** verify production deployment works
4. **Scheduled tests** catch regressions overnight
5. **Coverage reports** help identify untested code
6. **Caching** speeds up CI runs significantly

## Troubleshooting

### E2E Tests Failing

1. Check if the deployment URLs are accessible
2. Verify API endpoints are responding
3. Check for strict mode violations in locators
4. Review Playwright report artifacts

### Unit Tests Failing

1. Check for module import issues
2. Verify mocks are set up correctly
3. Review test output for specific failures

### Deployment Failing

1. Verify Cloudflare secrets are set
2. Check wrangler configuration
3. Review deployment logs
