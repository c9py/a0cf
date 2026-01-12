# Agent Zero - Cloudflare Deployment

This document describes the deployment of Agent Zero to Cloudflare infrastructure with the backend running on Workers and the frontend on Pages.

## Deployment URLs

| Component | URL | Status |
|-----------|-----|--------|
| **Frontend (Pages)** | https://a0cf.pages.dev | ✅ Live |
| **Frontend (Latest)** | https://8d0ace47.a0cf.pages.dev | ✅ Live |
| **Backend (Workers)** | https://a0cf-api.d-d1f.workers.dev | ✅ Live |
| **GitHub Repository** | https://github.com/c9py/a0cf | ✅ Synced |

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│  Cloudflare Pages   │────▶│  Cloudflare Workers │
│    (Frontend UI)    │     │   (Backend API)     │
│  a0cf.pages.dev     │     │ a0cf-api.workers.dev│
└─────────────────────┘     └─────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │   OpenRouter API    │
                            │  (AI Responses)     │
                            └─────────────────────┘
```

### Frontend (Cloudflare Pages)

The frontend is a static web application deployed to Cloudflare Pages. It includes the complete Agent Zero UI with features such as chat interface, sidebar navigation, dark mode, and various agent controls.

**Key Files:**
- `webui/` - Static HTML, CSS, and JavaScript files
- `webui/js/api.js` - API client configured to connect to Workers backend

### Backend (Cloudflare Workers)

The backend is a JavaScript-based API server running on Cloudflare Workers. It handles all API requests from the frontend and integrates with AI services for generating responses.

**Key Files:**
- `workers/src/index.js` - Main Worker script with all API endpoints
- `workers/wrangler.toml` - Cloudflare Worker configuration

## Working Features

### ✅ Fully Functional
- **Chat Interface**: Create new chats, send messages, receive AI responses
- **AI Responses**: Powered by OpenRouter API (gpt-4.1-mini model)
- **Settings Modal**: Full configuration panel with all options
- **Memory Dashboard**: Opens correctly (shows informative message about Workers limitations)
- **Task Scheduler**: Opens correctly (shows informative message about Workers limitations)
- **Sidebar Navigation**: All navigation elements work
- **Dark Mode**: Theme toggle works
- **Responsive UI**: Full Agent Zero interface

### ⚠️ Limited Functionality (Workers Constraints)
- **Memory Storage**: Not persistent (Cloudflare Workers are stateless)
- **Task Scheduling**: Not available (requires persistent backend)
- **File Operations**: Limited (no persistent filesystem)
- **Knowledge Import**: Limited (no persistent storage)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/csrf_token` | GET | CSRF token generation |
| `/settings_get` | POST | Get application settings |
| `/settings_set` | POST | Update application settings |
| `/poll` | POST | Poll for updates (contexts, logs) |
| `/message_async` | POST | Send message and get AI response |
| `/chat_create` | POST | Create new chat context |
| `/chat_load` | POST | Load existing chat |
| `/chat_reset` | POST | Reset chat history |
| `/memory_dashboard` | POST | Memory dashboard operations |
| `/tasks_get` | POST | Get scheduled tasks |

## Configuration

### Environment Variables (Secrets)

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI responses | Yes (preferred) |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | Optional |

### Setting Secrets

```bash
# Set OpenRouter API key (recommended)
cd workers
wrangler secret put OPENROUTER_API_KEY

# Or set OpenAI API key
wrangler secret put OPENAI_API_KEY
```

## Deployment Commands

### Deploy Backend (Workers)

```bash
cd workers
npm install
wrangler deploy
```

### Deploy Frontend (Pages)

```bash
wrangler pages deploy webui --project-name=a0cf
```

## Fixes Applied (v1.0.1)

1. **URL Construction Bug**: Fixed missing `/` between base URL and endpoint in `api.js`
2. **API Module Loading**: Changed `API_BASE_URL` from constant to getter function for late initialization
3. **Memory Dashboard Endpoint**: Added with informative message about Workers limitations
4. **Task Scheduler Endpoint**: Added with informative message about Workers limitations
5. **CORS Headers**: Properly configured for cross-origin requests

## Troubleshooting

**Issue: Settings shows "Failed to fetch"**
- Clear browser cache or use incognito mode
- Ensure you're using the latest deployment URL
- Check that Workers backend is responding at `/settings_get`

**Issue: AI responses show "Error calling AI"**
- Verify the API key is correctly set as a secret
- Check that the API key is valid and has sufficient credits

**Issue: Memory Dashboard shows "Failed to search memories"**
- This is expected if using an older deployment
- Update to the latest version which shows an informative message instead

## Future Enhancements

To enable full Agent Zero functionality, consider:

1. **Cloudflare D1**: For persistent chat history and settings
2. **Cloudflare KV**: For session storage and caching
3. **Cloudflare R2**: For file storage and knowledge base
4. **Durable Objects**: For real-time collaboration and task scheduling

---

*Deployed on: 2026-01-12*
*Version: 1.0.1-cf*
