# Agent Zero - Cloudflare Deployment

This document describes the deployment of Agent Zero to Cloudflare infrastructure with the backend running on Workers and the frontend on Pages.

## Deployment URLs

| Component | URL | Status |
|-----------|-----|--------|
| Frontend (Pages) | https://a0cf.pages.dev | Live |
| Backend (Workers) | https://a0cf-api.d-d1f.workers.dev | Live |
| GitHub Repository | https://github.com/c9py/a0cf | Active |

## Architecture Overview

The deployment consists of two main components that work together to provide a fully functional AI chat interface.

### Frontend (Cloudflare Pages)

The frontend is a static web application deployed to Cloudflare Pages. It includes the complete Agent Zero UI with features such as chat interface, sidebar navigation, dark mode, and various agent controls. The frontend communicates with the backend API via REST endpoints.

**Key Files:**
- `webui/` - Static HTML, CSS, and JavaScript files
- `webui/js/api.js` - API client configured to connect to Workers backend

### Backend (Cloudflare Workers)

The backend is a JavaScript-based API server running on Cloudflare Workers. It handles all API requests from the frontend and integrates with AI services for generating responses.

**Key Files:**
- `workers/src/index.js` - Main Worker script with all API endpoints
- `workers/wrangler.toml` - Cloudflare Worker configuration

## API Endpoints

The Workers backend provides the following API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information and status |
| `/health` | GET | Health check |
| `/csrf_token` | GET | CSRF token generation |
| `/settings_get` | POST | Get application settings |
| `/settings_set` | POST | Update application settings |
| `/poll` | POST | Poll for updates (contexts, logs) |
| `/message` | POST | Send message and get AI response |
| `/chat_create` | POST | Create new chat context |
| `/chat_load` | POST | Load existing chat |
| `/chat_reset` | POST | Reset chat history |
| `/chat_remove` | POST | Delete chat |
| `/chat_export` | POST | Export chat data |

## Configuration

### Environment Variables

The Worker uses the following environment variables (configured as secrets):

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI responses | Yes (preferred) |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | Optional |
| `CHAT_MODEL_NAME` | Model name override | Optional |

### Setting Secrets

To configure the API keys, use the Wrangler CLI:

```bash
# Set OpenRouter API key (recommended)
wrangler secret put OPENROUTER_API_KEY

# Or set OpenAI API key
wrangler secret put OPENAI_API_KEY
```

## Deployment Commands

### Deploy Backend (Workers)

```bash
cd workers
wrangler deploy
```

### Deploy Frontend (Pages)

```bash
wrangler pages deploy webui --project-name=a0cf
```

## Features

The deployment supports the following features:

**Working Features:**
- Chat creation and management
- AI-powered responses via OpenRouter/OpenAI
- Conversation context and history
- Dark mode UI
- Real-time polling for updates
- Settings management
- CSRF protection

**Limitations:**
- File operations require external storage integration
- Memory/knowledge features need additional backend implementation
- Speech synthesis/transcription requires additional API integration

## Development

### Local Testing

```bash
cd workers
wrangler dev
```

### Viewing Logs

```bash
wrangler tail
```

## Troubleshooting

**Issue: AI responses show "Error calling AI: 401"**
- Verify the API key is correctly set as a secret
- Check that the API key is valid and has sufficient credits

**Issue: Frontend shows "Connection Error"**
- Ensure the Workers backend is deployed and running
- Check browser console for CORS errors
- Verify API_BASE_URL is correctly configured in the frontend

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-cf | 2026-01-12 | Initial Cloudflare deployment with OpenRouter API support |
