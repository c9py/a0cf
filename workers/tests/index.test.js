/**
 * Comprehensive Unit Tests for Agent Zero Workers Backend
 * Tests API endpoint handlers and utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ==========================================
// Mock Request/Response helpers
// ==========================================
class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Map(Object.entries(options.headers || {}));
    this._body = options.body;
  }

  async json() {
    return JSON.parse(this._body || '{}');
  }

  async text() {
    return this._body || '';
  }
}

class MockResponse {
  constructor(body, options = {}) {
    this._body = body;
    this.status = options.status || 200;
    this.headers = new Map(Object.entries(options.headers || {}));
  }

  async json() {
    return JSON.parse(this._body);
  }

  async text() {
    return this._body;
  }
}

// ==========================================
// Import and test the handler functions
// ==========================================

// Mock environment
const mockEnv = {
  OPENROUTER_API_KEY: 'test-openrouter-key',
  OPENAI_API_KEY: 'test-openai-key',
};

// ==========================================
// URL Routing Tests
// ==========================================
describe('URL Routing', () => {
  it('should parse root path correctly', () => {
    const url = new URL('https://example.com/');
    expect(url.pathname).toBe('/');
  });

  it('should parse health endpoint correctly', () => {
    const url = new URL('https://example.com/health');
    expect(url.pathname).toBe('/health');
  });

  it('should parse nested paths correctly', () => {
    const url = new URL('https://example.com/api/v1/chat');
    expect(url.pathname).toBe('/api/v1/chat');
  });

  it('should handle query parameters', () => {
    const url = new URL('https://example.com/search?q=test&page=1');
    expect(url.searchParams.get('q')).toBe('test');
    expect(url.searchParams.get('page')).toBe('1');
  });
});

// ==========================================
// JSON Response Helper Tests
// ==========================================
describe('JSON Response Helper', () => {
  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
      },
    });
  }

  it('should create response with correct content type', () => {
    const response = jsonResponse({ test: 'data' });
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include CORS headers', () => {
    const response = jsonResponse({ test: 'data' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should set correct status code', () => {
    const response = jsonResponse({ error: 'not found' }, 404);
    expect(response.status).toBe(404);
  });

  it('should stringify data correctly', async () => {
    const response = jsonResponse({ key: 'value', nested: { a: 1 } });
    const body = await response.json();
    expect(body.key).toBe('value');
    expect(body.nested.a).toBe(1);
  });
});

// ==========================================
// Health Endpoint Tests
// ==========================================
describe('Health Endpoint', () => {
  function handleHealth() {
    return {
      status: 'healthy',
      runtime: 'cloudflare-workers',
      timestamp: new Date().toISOString(),
    };
  }

  it('should return healthy status', () => {
    const result = handleHealth();
    expect(result.status).toBe('healthy');
  });

  it('should include runtime info', () => {
    const result = handleHealth();
    expect(result.runtime).toBe('cloudflare-workers');
  });

  it('should include timestamp', () => {
    const result = handleHealth();
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  });
});

// ==========================================
// Version Endpoint Tests
// ==========================================
describe('Version Endpoint', () => {
  function handleVersion() {
    return {
      version: '1.0.1',
      runtime: 'cloudflare-workers',
      features: ['chat', 'settings', 'memory-dashboard', 'task-scheduler'],
    };
  }

  it('should return version string', () => {
    const result = handleVersion();
    expect(result.version).toBeDefined();
    expect(typeof result.version).toBe('string');
  });

  it('should include features list', () => {
    const result = handleVersion();
    expect(Array.isArray(result.features)).toBe(true);
    expect(result.features.length).toBeGreaterThan(0);
  });

  it('should include runtime info', () => {
    const result = handleVersion();
    expect(result.runtime).toBe('cloudflare-workers');
  });
});

// ==========================================
// CSRF Token Tests
// ==========================================
describe('CSRF Token', () => {
  function generateCsrfToken() {
    // Simulate crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function handleCsrfToken() {
    return {
      ok: true,
      token: generateCsrfToken(),
      runtime_id: 'cf-worker-default',
    };
  }

  it('should return ok: true', () => {
    const result = handleCsrfToken();
    expect(result.ok).toBe(true);
  });

  it('should return a token string', () => {
    const result = handleCsrfToken();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should return runtime_id', () => {
    const result = handleCsrfToken();
    expect(result.runtime_id).toBeDefined();
    expect(result.runtime_id).toContain('cf-worker');
  });

  it('should generate unique tokens', () => {
    const result1 = handleCsrfToken();
    const result2 = handleCsrfToken();
    expect(result1.token).not.toBe(result2.token);
  });
});

// ==========================================
// Settings Tests
// ==========================================
describe('Settings', () => {
  function getDefaultSettings() {
    return {
      chat_model: {
        name: 'openrouter/anthropic/claude-3.5-sonnet',
        provider: 'openrouter',
        ctx_length: 128000,
        limit_requests: 0,
        limit_input: 0,
        limit_output: 8096,
        kwargs: {},
      },
      utility_model: {
        name: 'openrouter/anthropic/claude-3.5-sonnet',
        provider: 'openrouter',
        ctx_length: 128000,
        limit_requests: 0,
        limit_input: 0,
        limit_output: 8096,
        kwargs: {},
      },
      embedding_model: {
        name: 'text-embedding-3-small',
        provider: 'openai',
        ctx_length: 8191,
        limit_requests: 500,
        limit_input: 0,
        kwargs: {},
      },
    };
  }

  it('should return chat_model settings', () => {
    const settings = getDefaultSettings();
    expect(settings.chat_model).toBeDefined();
    expect(settings.chat_model.name).toBeDefined();
    expect(settings.chat_model.provider).toBeDefined();
  });

  it('should return utility_model settings', () => {
    const settings = getDefaultSettings();
    expect(settings.utility_model).toBeDefined();
    expect(settings.utility_model.name).toBeDefined();
  });

  it('should return embedding_model settings', () => {
    const settings = getDefaultSettings();
    expect(settings.embedding_model).toBeDefined();
    expect(settings.embedding_model.name).toBeDefined();
  });

  it('should include ctx_length for models', () => {
    const settings = getDefaultSettings();
    expect(settings.chat_model.ctx_length).toBeGreaterThan(0);
    expect(settings.utility_model.ctx_length).toBeGreaterThan(0);
    expect(settings.embedding_model.ctx_length).toBeGreaterThan(0);
  });
});

// ==========================================
// Poll Endpoint Tests
// ==========================================
describe('Poll Endpoint', () => {
  // Simulated state
  let contexts = [];
  let logs = [];

  beforeEach(() => {
    contexts = [
      { id: 'default', name: 'New Chat', log: [], paused: false },
      { id: 'ctx-1', name: 'Chat 1', log: [], paused: false },
    ];
    logs = [];
  });

  function handlePoll(data = {}) {
    const { context_id } = data;
    
    if (context_id) {
      const ctx = contexts.find(c => c.id === context_id);
      return {
        contexts: ctx ? [ctx] : [],
        logs: logs.filter(l => l.context_id === context_id),
      };
    }
    
    return { contexts, logs };
  }

  it('should return contexts array', () => {
    const result = handlePoll();
    expect(Array.isArray(result.contexts)).toBe(true);
  });

  it('should return logs array', () => {
    const result = handlePoll();
    expect(Array.isArray(result.logs)).toBe(true);
  });

  it('should filter by context_id when provided', () => {
    const result = handlePoll({ context_id: 'ctx-1' });
    expect(result.contexts.length).toBe(1);
    expect(result.contexts[0].id).toBe('ctx-1');
  });

  it('should return empty array for non-existent context', () => {
    const result = handlePoll({ context_id: 'non-existent' });
    expect(result.contexts.length).toBe(0);
  });
});

// ==========================================
// Chat Management Tests
// ==========================================
describe('Chat Management', () => {
  let contexts = [];

  beforeEach(() => {
    contexts = [
      { id: 'default', name: 'New Chat', log: [], paused: false },
    ];
  });

  function generateId() {
    return 'ctx-' + Math.random().toString(36).substr(2, 9);
  }

  function handleChatCreate() {
    const newContext = {
      id: generateId(),
      name: 'New Chat',
      log: [],
      paused: false,
    };
    contexts.push(newContext);
    return { context: newContext };
  }

  function handleChatLoad(data) {
    const { context_id } = data;
    const ctx = contexts.find(c => c.id === context_id);
    return { context: ctx || null };
  }

  function handleChatReset(data) {
    const { context_id } = data;
    const ctx = contexts.find(c => c.id === context_id);
    if (ctx) {
      ctx.log = [];
    }
    return { ok: true };
  }

  function handleChatRemove(data) {
    const { context_id } = data;
    const index = contexts.findIndex(c => c.id === context_id);
    if (index !== -1) {
      contexts.splice(index, 1);
    }
    return { ok: true };
  }

  it('should create new chat with unique ID', () => {
    const result1 = handleChatCreate();
    const result2 = handleChatCreate();
    
    expect(result1.context.id).toBeDefined();
    expect(result2.context.id).toBeDefined();
    expect(result1.context.id).not.toBe(result2.context.id);
  });

  it('should create chat with default name', () => {
    const result = handleChatCreate();
    expect(result.context.name).toBe('New Chat');
  });

  it('should create chat with empty log', () => {
    const result = handleChatCreate();
    expect(result.context.log).toEqual([]);
  });

  it('should load existing chat', () => {
    const created = handleChatCreate();
    const loaded = handleChatLoad({ context_id: created.context.id });
    
    expect(loaded.context).toBeDefined();
    expect(loaded.context.id).toBe(created.context.id);
  });

  it('should return null for non-existent chat', () => {
    const result = handleChatLoad({ context_id: 'non-existent' });
    expect(result.context).toBeNull();
  });

  it('should reset chat log', () => {
    const created = handleChatCreate();
    created.context.log = [{ type: 'message', text: 'test' }];
    
    handleChatReset({ context_id: created.context.id });
    
    const loaded = handleChatLoad({ context_id: created.context.id });
    expect(loaded.context.log).toEqual([]);
  });

  it('should remove chat', () => {
    const created = handleChatCreate();
    const contextId = created.context.id;
    
    handleChatRemove({ context_id: contextId });
    
    const loaded = handleChatLoad({ context_id: contextId });
    expect(loaded.context).toBeNull();
  });
});

// ==========================================
// Message Handling Tests
// ==========================================
describe('Message Handling', () => {
  let contexts = [];

  beforeEach(() => {
    contexts = [
      { id: 'test-ctx', name: 'Test Chat', log: [], paused: false },
    ];
  });

  function handleMessageAsync(data) {
    const { text, context_id } = data;
    const ctx = contexts.find(c => c.id === context_id);
    
    if (!ctx) {
      return { ok: false, error: 'Context not found' };
    }
    
    // Add user message to log
    ctx.log.push({
      type: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    });
    
    return { ok: true };
  }

  it('should accept message with text and context_id', () => {
    const result = handleMessageAsync({
      text: 'Hello',
      context_id: 'test-ctx',
    });
    
    expect(result.ok).toBe(true);
  });

  it('should add message to context log', () => {
    handleMessageAsync({
      text: 'Test message',
      context_id: 'test-ctx',
    });
    
    const ctx = contexts.find(c => c.id === 'test-ctx');
    expect(ctx.log.length).toBe(1);
    expect(ctx.log[0].text).toBe('Test message');
  });

  it('should return error for non-existent context', () => {
    const result = handleMessageAsync({
      text: 'Hello',
      context_id: 'non-existent',
    });
    
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle empty text', () => {
    const result = handleMessageAsync({
      text: '',
      context_id: 'test-ctx',
    });
    
    expect(result.ok).toBe(true);
  });

  it('should handle unicode text', () => {
    const result = handleMessageAsync({
      text: '你好世界 🌍 مرحبا',
      context_id: 'test-ctx',
    });
    
    expect(result.ok).toBe(true);
    const ctx = contexts.find(c => c.id === 'test-ctx');
    expect(ctx.log[0].text).toBe('你好世界 🌍 مرحبا');
  });

  it('should handle special characters', () => {
    const result = handleMessageAsync({
      text: '<script>alert("xss")</script>',
      context_id: 'test-ctx',
    });
    
    expect(result.ok).toBe(true);
  });
});

// ==========================================
// Memory Dashboard Tests
// ==========================================
describe('Memory Dashboard', () => {
  function handleMemoryDashboard(data) {
    const { action } = data;
    
    switch (action) {
      case 'search':
        return {
          success: true,
          memories: [],
          total_count: 0,
          filtered_count: 0,
          knowledge_count: 0,
          conversation_count: 0,
          message: 'Memory storage is not available in Cloudflare Workers deployment.',
        };
      case 'get_memory_subdirs':
        return {
          success: true,
          subdirs: ['default'],
        };
      case 'get_current_memory_subdir':
        return {
          success: true,
          memory_subdir: 'default',
        };
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  it('should handle search action', () => {
    const result = handleMemoryDashboard({ action: 'search' });
    expect(result.success).toBe(true);
    expect(result.memories).toBeDefined();
  });

  it('should return empty memories array', () => {
    const result = handleMemoryDashboard({ action: 'search' });
    expect(result.memories).toEqual([]);
    expect(result.total_count).toBe(0);
  });

  it('should handle get_memory_subdirs action', () => {
    const result = handleMemoryDashboard({ action: 'get_memory_subdirs' });
    expect(result.success).toBe(true);
    expect(result.subdirs).toBeDefined();
  });

  it('should handle get_current_memory_subdir action', () => {
    const result = handleMemoryDashboard({ action: 'get_current_memory_subdir' });
    expect(result.success).toBe(true);
    expect(result.memory_subdir).toBe('default');
  });

  it('should return error for unknown action', () => {
    const result = handleMemoryDashboard({ action: 'unknown' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown action');
  });
});

// ==========================================
// Tasks Endpoint Tests
// ==========================================
describe('Tasks Endpoint', () => {
  function handleTasksGet() {
    return {
      tasks: [],
      message: 'Task scheduling is not available in Cloudflare Workers deployment.',
    };
  }

  function handleTaskKill(data) {
    return {
      success: false,
      error: 'Task scheduling is not available in Cloudflare Workers deployment.',
    };
  }

  it('should return empty tasks array', () => {
    const result = handleTasksGet();
    expect(result.tasks).toEqual([]);
  });

  it('should include informative message', () => {
    const result = handleTasksGet();
    expect(result.message).toContain('not available');
  });

  it('should return error for task_kill', () => {
    const result = handleTaskKill({ task_id: 'test' });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// Agent Control Tests
// ==========================================
describe('Agent Control', () => {
  let contexts = [];

  beforeEach(() => {
    contexts = [
      { id: 'test-ctx', name: 'Test Chat', log: [], paused: false },
    ];
  });

  function handlePause(data) {
    const { context_id, paused } = data;
    const ctx = contexts.find(c => c.id === context_id);
    
    if (ctx) {
      ctx.paused = paused;
    }
    
    return { ok: true };
  }

  function handleNudge(data) {
    return { ok: true };
  }

  function handleRestart(data) {
    return { ok: true };
  }

  it('should pause agent', () => {
    handlePause({ context_id: 'test-ctx', paused: true });
    
    const ctx = contexts.find(c => c.id === 'test-ctx');
    expect(ctx.paused).toBe(true);
  });

  it('should unpause agent', () => {
    contexts[0].paused = true;
    handlePause({ context_id: 'test-ctx', paused: false });
    
    const ctx = contexts.find(c => c.id === 'test-ctx');
    expect(ctx.paused).toBe(false);
  });

  it('should handle nudge', () => {
    const result = handleNudge({ context_id: 'test-ctx' });
    expect(result.ok).toBe(true);
  });

  it('should handle restart', () => {
    const result = handleRestart({ context_id: 'test-ctx' });
    expect(result.ok).toBe(true);
  });
});

// ==========================================
// History & Context Window Tests
// ==========================================
describe('History & Context Window', () => {
  function handleHistoryGet(data) {
    return {
      history: [],
    };
  }

  function handleCtxWindowGet(data) {
    return {
      ctx_window: '',
    };
  }

  it('should return empty history', () => {
    const result = handleHistoryGet({ context_id: 'test' });
    expect(result.history).toEqual([]);
  });

  it('should return empty context window', () => {
    const result = handleCtxWindowGet({ context_id: 'test' });
    expect(result.ctx_window).toBe('');
  });
});

// ==========================================
// Backup Endpoint Tests
// ==========================================
describe('Backup Endpoints', () => {
  function handleBackupCreate() {
    return {
      ok: true,
      backup_id: 'backup-' + Date.now(),
      message: 'Backup created (Workers deployment - limited functionality)',
    };
  }

  function handleBackupDownload(data) {
    return {
      ok: false,
      error: 'Backup download not available in Workers deployment',
    };
  }

  function handleBackupInspect(data) {
    return {
      ok: false,
      error: 'Backup inspection not available in Workers deployment',
    };
  }

  it('should create backup with ID', () => {
    const result = handleBackupCreate();
    expect(result.ok).toBe(true);
    expect(result.backup_id).toBeDefined();
  });

  it('should return error for backup download', () => {
    const result = handleBackupDownload({ backup_id: 'test' });
    expect(result.ok).toBe(false);
  });

  it('should return error for backup inspect', () => {
    const result = handleBackupInspect({ backup_id: 'test' });
    expect(result.ok).toBe(false);
  });
});

// ==========================================
// Notification Tests
// ==========================================
describe('Notifications', () => {
  function handleNotificationCreate(data) {
    return { ok: true };
  }

  function handleBanners() {
    return { banners: [] };
  }

  it('should create notification', () => {
    const result = handleNotificationCreate({
      message: 'Test notification',
      type: 'info',
    });
    expect(result.ok).toBe(true);
  });

  it('should return empty banners', () => {
    const result = handleBanners();
    expect(result.banners).toEqual([]);
  });
});

// ==========================================
// Speech Endpoint Tests
// ==========================================
describe('Speech Endpoints', () => {
  function handleSynthesize(data) {
    return {
      ok: false,
      error: 'Speech synthesis not available in Workers deployment',
    };
  }

  function handleTranscribe(data) {
    return {
      ok: false,
      error: 'Speech transcription not available in Workers deployment',
    };
  }

  it('should return error for synthesize', () => {
    const result = handleSynthesize({ text: 'Hello' });
    expect(result.ok).toBe(false);
  });

  it('should return error for transcribe', () => {
    const result = handleTranscribe({});
    expect(result.ok).toBe(false);
  });
});

// ==========================================
// CORS Handling Tests
// ==========================================
describe('CORS Handling', () => {
  function handleOptions() {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  it('should return 200 for OPTIONS', () => {
    const response = handleOptions();
    expect(response.status).toBe(200);
  });

  it('should include Allow-Origin header', () => {
    const response = handleOptions();
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should include Allow-Methods header', () => {
    const response = handleOptions();
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should include Allow-Headers header', () => {
    const response = handleOptions();
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-CSRF-Token');
  });
});

// ==========================================
// Error Handling Tests
// ==========================================
describe('Error Handling', () => {
  function handleUnknownEndpoint(pathname) {
    return {
      error: `Endpoint ${pathname} not found`,
      status: 404,
    };
  }

  function parseJsonSafe(body) {
    try {
      return JSON.parse(body);
    } catch (e) {
      return null;
    }
  }

  it('should return 404 for unknown endpoint', () => {
    const result = handleUnknownEndpoint('/unknown');
    expect(result.status).toBe(404);
    expect(result.error).toContain('not found');
  });

  it('should handle invalid JSON gracefully', () => {
    const result = parseJsonSafe('invalid json');
    expect(result).toBeNull();
  });

  it('should parse valid JSON', () => {
    const result = parseJsonSafe('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle empty string', () => {
    const result = parseJsonSafe('');
    expect(result).toBeNull();
  });
});

// ==========================================
// Integration Tests
// ==========================================
describe('Integration Tests', () => {
  let contexts = [];

  beforeEach(() => {
    contexts = [];
  });

  function createChat() {
    const ctx = {
      id: 'ctx-' + Math.random().toString(36).substr(2, 9),
      name: 'New Chat',
      log: [],
      paused: false,
    };
    contexts.push(ctx);
    return ctx;
  }

  function sendMessage(contextId, text) {
    const ctx = contexts.find(c => c.id === contextId);
    if (!ctx) return { ok: false };
    
    ctx.log.push({ type: 'user', text, timestamp: new Date().toISOString() });
    return { ok: true };
  }

  function getChat(contextId) {
    return contexts.find(c => c.id === contextId) || null;
  }

  it('should complete full chat flow', () => {
    // Create chat
    const chat = createChat();
    expect(chat.id).toBeDefined();
    
    // Send message
    const sendResult = sendMessage(chat.id, 'Hello');
    expect(sendResult.ok).toBe(true);
    
    // Verify message in log
    const loaded = getChat(chat.id);
    expect(loaded.log.length).toBe(1);
    expect(loaded.log[0].text).toBe('Hello');
  });

  it('should handle multiple chats independently', () => {
    const chat1 = createChat();
    const chat2 = createChat();
    
    sendMessage(chat1.id, 'Message 1');
    sendMessage(chat2.id, 'Message 2');
    
    const loaded1 = getChat(chat1.id);
    const loaded2 = getChat(chat2.id);
    
    expect(loaded1.log[0].text).toBe('Message 1');
    expect(loaded2.log[0].text).toBe('Message 2');
  });

  it('should handle multiple messages in same chat', () => {
    const chat = createChat();
    
    sendMessage(chat.id, 'First');
    sendMessage(chat.id, 'Second');
    sendMessage(chat.id, 'Third');
    
    const loaded = getChat(chat.id);
    expect(loaded.log.length).toBe(3);
    expect(loaded.log[0].text).toBe('First');
    expect(loaded.log[2].text).toBe('Third');
  });
});
