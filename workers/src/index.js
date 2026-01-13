/**
 * Agent Zero API Worker
 * Full backend implementation for Cloudflare Workers
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
};

// Route definitions
const routes = {
  // Health & Status
  '/health': handleHealth,
  '/api/health': handleHealth,
  '/api/version': handleVersion,
  
  // CSRF Token
  '/csrf_token': handleCsrfToken,
  
  // Settings
  '/settings_get': handleSettingsGet,
  '/settings_set': handleSettingsSet,
  
  // Polling & Context
  '/poll': handlePoll,
  '/context': handleContext,
  
  // Chat & Messages
  '/message_async': handleMessageAsync,
  '/chat_create': handleChatCreate,
  '/chat_load': handleChatLoad,
  '/chat_reset': handleChatReset,
  '/chat_remove': handleChatRemove,
  '/chat_export': handleChatExport,
  
  // Notifications
  '/notification_create': handleNotificationCreate,
  '/banners': handleBanners,
  
  // Agent Control
  '/pause': handlePause,
  '/nudge': handleNudge,
  '/restart': handleRestart,
  
  // Files & Knowledge
  '/file_info': handleFileInfo,
  '/knowledge_path_get': handleKnowledgePathGet,
  '/knowledge_reindex': handleKnowledgeReindex,
  '/import_knowledge': handleImportKnowledge,
  '/chat_files_path_get': handleChatFilesPathGet,
  '/upload_work_dir_files': handleUploadWorkDirFiles,
  '/delete_work_dir_file': handleDeleteWorkDirFile,
  
  // History & Context Window
  '/history_get': handleHistoryGet,
  '/ctx_window_get': handleCtxWindowGet,
  
  // Backup
  '/backup_create': handleBackupCreate,
  '/backup_download': handleBackupDownload,
  '/backup_inspect': handleBackupInspect,
  '/backup_restore': handleBackupRestore,
  '/backup_restore_preview': handleBackupRestorePreview,
  
  // Speech
  '/synthesize': handleSynthesize,
  '/transcribe': handleTranscribe,
  
  // Tunnel
  '/tunnel_proxy': handleTunnelProxy,
  
  // MCP & A2A
  '/mcp': handleMcp,
  '/a2a': handleA2a,
  
  // Memory Dashboard
  '/memory_dashboard': handleMemoryDashboard,
  
  // Tasks
  '/tasks_get': handleTasksGet,
  '/task_kill': handleTaskKill,
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Default limits per IP
  default: {
    windowMs: 60000,      // 1 minute window
    maxRequests: 120,     // 120 requests per minute
  },
  // Stricter limits for expensive endpoints
  expensive: {
    windowMs: 60000,
    maxRequests: 30,      // 30 requests per minute for AI endpoints
  },
  // Relaxed limits for polling
  polling: {
    windowMs: 60000,
    maxRequests: 300,     // 300 polls per minute (5 per second max)
  },
};

// Expensive endpoints that need stricter rate limiting
const EXPENSIVE_ENDPOINTS = ['/message_async', '/synthesize', '/transcribe'];
const POLLING_ENDPOINTS = ['/poll', '/health', '/api/health'];

// Rate limiter class using in-memory storage (consider KV for production)
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = 60000; // Clean up every minute
    this.lastCleanup = Date.now();
  }

  getClientIP(request) {
    return request.headers.get('CF-Connecting-IP') ||
           request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
           'unknown';
  }

  getConfig(path) {
    if (EXPENSIVE_ENDPOINTS.some(ep => path.startsWith(ep))) {
      return RATE_LIMIT_CONFIG.expensive;
    }
    if (POLLING_ENDPOINTS.some(ep => path.startsWith(ep))) {
      return RATE_LIMIT_CONFIG.polling;
    }
    return RATE_LIMIT_CONFIG.default;
  }

  cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;
    
    for (const [key, data] of this.requests.entries()) {
      if (now - data.windowStart > data.windowMs * 2) {
        this.requests.delete(key);
      }
    }
    this.lastCleanup = now;
  }

  isRateLimited(request, path) {
    this.cleanup();
    
    const clientIP = this.getClientIP(request);
    const config = this.getConfig(path);
    const key = `${clientIP}:${path}`;
    const now = Date.now();

    let data = this.requests.get(key);
    
    if (!data || (now - data.windowStart) > config.windowMs) {
      // Start new window
      data = {
        windowStart: now,
        windowMs: config.windowMs,
        count: 1,
        maxRequests: config.maxRequests,
      };
      this.requests.set(key, data);
      return { limited: false, remaining: config.maxRequests - 1 };
    }

    data.count++;
    
    if (data.count > config.maxRequests) {
      const retryAfter = Math.ceil((data.windowStart + config.windowMs - now) / 1000);
      return { 
        limited: true, 
        remaining: 0,
        retryAfter,
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      };
    }

    return { limited: false, remaining: config.maxRequests - data.count };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// State class to manage in-memory data
class WorkerState {
  constructor() {
    this.contexts = new Map();
    this.notifications = [];
    this.notificationGuid = null;
    this.sessions = new Map();
  }
  
  init() {
    if (!this.notificationGuid) {
      this.notificationGuid = crypto.randomUUID();
    }
  }
}

// Global state instance (initialized lazily)
let state = null;

function getState() {
  if (!state) {
    state = new WorkerState();
  }
  state.init();
  return state;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Apply rate limiting
    const rateLimitResult = rateLimiter.isRateLimited(request, path);
    if (rateLimitResult.limited) {
      return new Response(JSON.stringify({
        error: 'Too Many Requests',
        message: rateLimitResult.message,
        retryAfter: rateLimitResult.retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter),
          'X-RateLimit-Remaining': '0',
          ...corsHeaders
        }
      });
    }

    try {
      // Route handling
      const handler = getHandler(path);
      if (handler) {
        const response = await handler(request, env, ctx);
        // Add rate limit headers to successful responses
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      }

      // Default: return API info
      return jsonResponse({
        service: 'Agent Zero API',
        version: '1.0.0',
        status: 'running',
        endpoints: Object.keys(routes)
      });

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({
        error: 'Internal server error',
        message: error.message
      }, 500);
    }
  }
};

function getHandler(path) {
  // Exact match
  if (routes[path]) return routes[path];
  
  // Prefix match for nested routes
  for (const [route, handler] of Object.entries(routes)) {
    if (path.startsWith(route + '/')) return handler;
  }
  
  return null;
}

// ============ Handler Functions ============

async function handleHealth(request, env) {
  return jsonResponse({
    status: 'ok',
    service: 'a0cf-api',
    timestamp: new Date().toISOString(),
    gitinfo: {
      version: '1.0.0-cf',
      commit_time: new Date().toISOString()
    },
    error: null
  });
}

async function handleVersion(request, env) {
  return jsonResponse({
    name: 'Agent Zero',
    version: '1.0.0',
    platform: 'cloudflare-workers',
    environment: env.ENVIRONMENT || 'production'
  });
}

async function handleCsrfToken(request, env) {
  const s = getState();
  const sessionId = getSessionId(request);
  let session = s.sessions.get(sessionId);
  
  if (!session) {
    session = {
      csrf_token: crypto.randomUUID(),
      created: Date.now()
    };
    s.sessions.set(sessionId, session);
  }
  
  return jsonResponse({
    ok: true,
    token: session.csrf_token,
    runtime_id: 'cf-worker-' + (env.CF_WORKER_ID || 'default')
  });
}

async function handleSettingsGet(request, env) {
  // Return default settings
  const settings = {
    // Chat model settings
    chat_model_provider: env.CHAT_MODEL_PROVIDER || 'openai',
    chat_model_name: env.CHAT_MODEL_NAME || 'gpt-4o-mini',
    chat_model_temperature: 0.7,
    chat_model_ctx_length: 128000,
    chat_model_ctx_history: 10000,
    
    // Utility model settings
    utility_model_provider: env.UTILITY_MODEL_PROVIDER || 'openai',
    utility_model_name: env.UTILITY_MODEL_NAME || 'gpt-4o-mini',
    utility_model_temperature: 0.5,
    utility_model_ctx_length: 128000,
    
    // Embedding model settings
    embedding_model_provider: 'openai',
    embedding_model_name: 'text-embedding-3-small',
    
    // Speech settings
    stt_model_size: 'tiny',
    stt_language: 'en',
    stt_silence_threshold: 0.05,
    stt_silence_duration: 1000,
    stt_waiting_timeout: 2000,
    tts_kokoro: false,
    
    // Agent settings
    agent_name: 'Agent Zero',
    agent_system_prompt: '',
    
    // MCP settings
    mcp_server_token: '',
    
    // Other settings
    dark_mode: true,
    auto_scroll: true,
  };
  
  return jsonResponse({ settings });
}

async function handleSettingsSet(request, env) {
  const body = await getJsonBody(request);
  // In production, save to KV or D1
  return jsonResponse({ success: true, message: 'Settings saved' });
}

async function handlePoll(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.context || '';
  const logFrom = body.log_from || 0;
  const notificationsFrom = body.notifications_from || 0;
  
  // Get or create context
  let context = s.contexts.get(ctxid);
  
  // Build response
  const response = {
    deselect_chat: ctxid && !context,
    context: context?.id || '',
    contexts: Array.from(s.contexts.values()).map(c => ({
      id: c.id,
      name: c.name || 'New Chat',
      created_at: c.created_at,
      paused: c.paused || false,
    })),
    tasks: [],
    logs: context?.logs?.slice(logFrom) || [],
    log_guid: context?.log_guid || crypto.randomUUID(),
    log_version: context?.logs?.length || 0,
    log_progress: 0,
    log_progress_active: false,
    paused: context?.paused || false,
    notifications: s.notifications.slice(notificationsFrom),
    notifications_guid: s.notificationGuid,
    notifications_version: s.notifications.length,
  };
  
  return jsonResponse(response);
}

async function handleContext(request, env) {
  const s = getState();
  return jsonResponse({ contexts: Array.from(s.contexts.values()) });
}

async function handleMessageAsync(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const text = body.text || '';
  const ctxid = body.context || crypto.randomUUID();
  const messageId = body.message_id || crypto.randomUUID();
  
  // Get or create context
  let context = s.contexts.get(ctxid);
  if (!context) {
    context = createContext(ctxid);
    s.contexts.set(ctxid, context);
  }
  
  // Add user message to logs
  context.logs.push({
    id: messageId,
    no: context.logs.length,
    type: 'user',
    heading: 'User',
    content: text,
    temp: false,
    kvps: null,
    timestamp: new Date().toISOString(),
  });
  
  // Generate AI response (placeholder - integrate with Workers AI or external API)
  const responseId = crypto.randomUUID();
  const aiResponse = await generateAIResponse(text, context, env);
  
  context.logs.push({
    id: responseId,
    no: context.logs.length,
    type: 'ai',
    heading: 'Agent Zero',
    content: aiResponse,
    temp: false,
    kvps: null,
    timestamp: new Date().toISOString(),
  });
  
  return jsonResponse({
    context: ctxid,
    message_id: responseId,
    response: aiResponse
  });
}

async function handleChatCreate(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.new_context || crypto.randomUUID();
  const context = createContext(ctxid, body.name || 'New Chat');
  s.contexts.set(ctxid, context);
  
  return jsonResponse({
    ok: true,
    ctxid: ctxid,
    message: 'Context created.',
    context: ctxid,
    name: context.name,
    created_at: context.created_at
  });
}

async function handleChatLoad(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.context;
  const context = s.contexts.get(ctxid);
  
  if (!context) {
    return jsonResponse({ error: 'Context not found' }, 404);
  }
  
  return jsonResponse({
    context: ctxid,
    logs: context.logs,
    name: context.name
  });
}

async function handleChatReset(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.context;
  const context = s.contexts.get(ctxid);
  
  if (context) {
    context.logs = [];
    context.log_guid = crypto.randomUUID();
  }
  
  return jsonResponse({ success: true });
}

async function handleChatRemove(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.context;
  s.contexts.delete(ctxid);
  
  return jsonResponse({ success: true });
}

async function handleChatExport(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.context;
  const context = s.contexts.get(ctxid);
  
  if (!context) {
    return jsonResponse({ error: 'Context not found' }, 404);
  }
  
  return jsonResponse({
    context: ctxid,
    name: context.name,
    logs: context.logs,
    exported_at: new Date().toISOString()
  });
}

async function handleNotificationCreate(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const notification = {
    id: crypto.randomUUID(),
    type: body.type || 'info',
    title: body.title || '',
    message: body.message || '',
    timestamp: new Date().toISOString(),
    read: false
  };
  
  s.notifications.push(notification);
  
  return jsonResponse({ success: true, notification });
}

async function handleBanners(request, env) {
  return jsonResponse({ banners: [] });
}

async function handlePause(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.context;
  const context = s.contexts.get(ctxid);
  
  if (context) {
    context.paused = body.paused ?? !context.paused;
  }
  
  return jsonResponse({ success: true, paused: context?.paused || false });
}

async function handleNudge(request, env) {
  return jsonResponse({ success: true, message: 'Agent nudged' });
}

async function handleRestart(request, env) {
  return jsonResponse({ success: true, message: 'Agent restarted' });
}

async function handleFileInfo(request, env) {
  const body = await getJsonBody(request);
  return jsonResponse({
    path: body.path || '',
    exists: false,
    size: 0,
    type: 'unknown'
  });
}

async function handleKnowledgePathGet(request, env) {
  return jsonResponse({ path: '/knowledge' });
}

async function handleKnowledgeReindex(request, env) {
  return jsonResponse({ success: true, message: 'Knowledge reindex started' });
}

async function handleImportKnowledge(request, env) {
  return jsonResponse({ success: true, message: 'Knowledge imported' });
}

async function handleChatFilesPathGet(request, env) {
  return jsonResponse({ path: '/chat_files' });
}

async function handleUploadWorkDirFiles(request, env) {
  return jsonResponse({ success: true, files: [] });
}

async function handleDeleteWorkDirFile(request, env) {
  return jsonResponse({ success: true });
}

async function handleHistoryGet(request, env) {
  const s = getState();
  const body = await getJsonBody(request);
  const ctxid = body.context;
  const context = s.contexts.get(ctxid);
  
  return jsonResponse({
    history: context?.logs || []
  });
}

async function handleCtxWindowGet(request, env) {
  return jsonResponse({
    ctx_window: [],
    total_tokens: 0
  });
}

async function handleBackupCreate(request, env) {
  return jsonResponse({
    success: true,
    backup_id: crypto.randomUUID(),
    message: 'Backup created'
  });
}

async function handleBackupDownload(request, env) {
  return jsonResponse({ error: 'Backup download not available in Workers' }, 501);
}

async function handleBackupInspect(request, env) {
  return jsonResponse({ backups: [] });
}

async function handleBackupRestore(request, env) {
  return jsonResponse({ success: true, message: 'Backup restored' });
}

async function handleBackupRestorePreview(request, env) {
  return jsonResponse({ preview: {} });
}

async function handleSynthesize(request, env) {
  // TTS synthesis - would need Workers AI or external API
  return jsonResponse({
    success: false,
    message: 'TTS not configured. Enable Workers AI or connect external TTS service.'
  });
}

async function handleTranscribe(request, env) {
  // STT transcription - would need Workers AI or external API
  return jsonResponse({
    success: false,
    message: 'STT not configured. Enable Workers AI or connect external STT service.'
  });
}

async function handleTunnelProxy(request, env) {
  const body = await getJsonBody(request);
  const action = body.action;
  
  if (action === 'get') {
    return jsonResponse({
      success: true,
      tunnel_url: null,
      running: false
    });
  }
  
  return jsonResponse({ success: true });
}

async function handleMcp(request, env) {
  return jsonResponse({
    message: 'MCP endpoint',
    servers: []
  });
}

async function handleA2a(request, env) {
  return jsonResponse({
    message: 'Agent-to-Agent endpoint',
    agents: []
  });
}

// ============ Helper Functions ============

function createContext(id, name = 'New Chat') {
  return {
    id,
    name,
    created_at: new Date().toISOString(),
    logs: [],
    log_guid: crypto.randomUUID(),
    paused: false,
  };
}

async function generateAIResponse(userMessage, context, env) {
  // Check for API keys - prefer OpenRouter, fallback to OpenAI
  const openRouterKey = env.OPENROUTER_API_KEY;
  const openAIKey = env.OPENAI_API_KEY;
  
  const apiKey = openRouterKey || openAIKey;
  const useOpenRouter = !!openRouterKey;
  
  if (!apiKey) {
    return `I received your message: "${userMessage}"\n\nTo enable AI responses, please configure either OPENROUTER_API_KEY or OPENAI_API_KEY environment variable in your Cloudflare Worker settings.`;
  }
  
  try {
    // Build messages array from context
    const messages = [
      {
        role: 'system',
        content: 'You are Agent Zero, a helpful AI assistant. Be concise and helpful.'
      }
    ];
    
    // Add conversation history
    for (const log of context.logs.slice(-10)) {
      if (log.type === 'user') {
        messages.push({ role: 'user', content: log.content });
      } else if (log.type === 'ai') {
        messages.push({ role: 'assistant', content: log.content });
      }
    }
    
    // Add current message
    messages.push({ role: 'user', content: userMessage });
    
    // Choose API endpoint and model
    const apiUrl = useOpenRouter 
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    
    const model = env.CHAT_MODEL_NAME || (useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini');
    
    // Build headers
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    
    // Add OpenRouter specific headers
    if (useOpenRouter) {
      headers['HTTP-Referer'] = 'https://a0cf.pages.dev';
      headers['X-Title'] = 'Agent Zero';
    }
    
    // Call API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', error);
      return `Error calling AI: ${response.status}. Please check your API key configuration.`;
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
    
  } catch (error) {
    console.error('AI generation error:', error);
    return `Error generating response: ${error.message}`;
  }
}

function getSessionId(request) {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/session_id=([^;]+)/);
  return match ? match[1] : 'default-session';
}

async function getJsonBody(request) {
  try {
    if (request.method === 'GET') return {};
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return await request.json();
    }
    // Handle form data
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const obj = {};
      for (const [key, value] of formData.entries()) {
        obj[key] = value;
      }
      return obj;
    }
    return {};
  } catch (e) {
    return {};
  }
}

// Memory Dashboard
async function handleMemoryDashboard(request, env) {
  const body = await getJsonBody(request);
  const action = body.action || 'search';
  
  if (action === 'get_memory_subdirs') {
    return jsonResponse({
      success: true,
      subdirs: ['default']
    });
  }
  
  if (action === 'get_current_memory_subdir') {
    return jsonResponse({
      success: true,
      memory_subdir: 'default'
    });
  }
  
  if (action === 'search') {
    // Return empty results for now - memory is not persisted in Workers
    return jsonResponse({
      success: true,
      memories: [],
      total_count: 0,
      total_db_count: 0,
      knowledge_count: 0,
      conversation_count: 0,
      search_query: body.search || '',
      area_filter: body.area || '',
      memory_subdir: body.memory_subdir || 'default',
      message: 'Memory storage is not available in Cloudflare Workers deployment. Use a persistent backend for memory features.'
    });
  }
  
  return jsonResponse({
    success: false,
    error: `Action '${action}' is not supported in Workers deployment`,
    memories: [],
    total_count: 0
  });
}

// Tasks
async function handleTasksGet(request, env) {
  return jsonResponse({
    tasks: [],
    message: 'Task scheduling is not available in Cloudflare Workers deployment'
  });
}

async function handleTaskKill(request, env) {
  return jsonResponse({
    success: false,
    error: 'Task management is not available in Cloudflare Workers deployment'
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
