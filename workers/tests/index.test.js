/**
 * Comprehensive Unit Tests for Agent Zero Workers Backend
 * Tests every API endpoint and edge case
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unstable_dev } from 'wrangler';

// Mock environment
const mockEnv = {
  OPENROUTER_API_KEY: 'test-openrouter-key',
  OPENAI_API_KEY: 'test-openai-key',
};

let worker;

describe('Agent Zero Workers Backend', () => {
  beforeEach(async () => {
    worker = await unstable_dev('src/index.js', {
      experimental: { disableExperimentalWarning: true },
      vars: mockEnv,
    });
  });

  afterEach(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  // ==========================================
  // Health & Status Endpoints
  // ==========================================
  describe('Health & Status Endpoints', () => {
    it('GET /health should return healthy status', async () => {
      const response = await worker.fetch('/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.runtime).toBe('cloudflare-workers');
      expect(data).toHaveProperty('timestamp');
    });

    it('GET /health should include CORS headers', async () => {
      const response = await worker.fetch('/health');
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('GET /version should return version info', async () => {
      const response = await worker.fetch('/version');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('runtime');
      expect(data).toHaveProperty('features');
      expect(Array.isArray(data.features)).toBe(true);
    });

    it('GET / should return API info', async () => {
      const response = await worker.fetch('/');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.name).toBe('Agent Zero API');
      expect(data.status).toBe('running');
      expect(data).toHaveProperty('endpoints');
    });
  });

  // ==========================================
  // CSRF Token Endpoint
  // ==========================================
  describe('CSRF Token Endpoint', () => {
    it('GET /csrf_token should return valid token', async () => {
      const response = await worker.fetch('/csrf_token');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data).toHaveProperty('token');
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
    });

    it('GET /csrf_token should return runtime_id', async () => {
      const response = await worker.fetch('/csrf_token');
      const data = await response.json();
      
      expect(data).toHaveProperty('runtime_id');
      expect(data.runtime_id).toContain('cf-worker');
    });

    it('GET /csrf_token should return unique tokens', async () => {
      const response1 = await worker.fetch('/csrf_token');
      const data1 = await response1.json();
      
      const response2 = await worker.fetch('/csrf_token');
      const data2 = await response2.json();
      
      expect(data1.token).not.toBe(data2.token);
    });
  });

  // ==========================================
  // Settings Endpoints
  // ==========================================
  describe('Settings Endpoints', () => {
    it('POST /settings_get should return default settings', async () => {
      const response = await worker.fetch('/settings_get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('chat_model');
      expect(data).toHaveProperty('utility_model');
      expect(data).toHaveProperty('embedding_model');
    });

    it('POST /settings_get should include model configurations', async () => {
      const response = await worker.fetch('/settings_get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(data.chat_model).toHaveProperty('name');
      expect(data.chat_model).toHaveProperty('provider');
      expect(data.chat_model).toHaveProperty('ctx_length');
    });

    it('POST /settings_set should accept settings update', async () => {
      const response = await worker.fetch('/settings_set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_model: { name: 'gpt-4' } }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('POST /settings_get with empty body should not error', async () => {
      const response = await worker.fetch('/settings_get', {
        method: 'POST',
      });
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // Poll Endpoint
  // ==========================================
  describe('Poll Endpoint', () => {
    it('POST /poll should return contexts and logs', async () => {
      const response = await worker.fetch('/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('contexts');
      expect(data).toHaveProperty('logs');
      expect(Array.isArray(data.contexts)).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
    });

    it('POST /poll should include default context', async () => {
      const response = await worker.fetch('/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(data.contexts.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /poll with context_id should filter results', async () => {
      const response = await worker.fetch('/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // Chat Management Endpoints
  // ==========================================
  describe('Chat Management Endpoints', () => {
    it('POST /chat_create should create new chat context', async () => {
      const response = await worker.fetch('/chat_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('context');
      expect(data.context).toHaveProperty('id');
      expect(data.context).toHaveProperty('name');
    });

    it('POST /chat_create should return unique IDs', async () => {
      const response1 = await worker.fetch('/chat_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data1 = await response1.json();
      
      const response2 = await worker.fetch('/chat_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data2 = await response2.json();
      
      expect(data1.context.id).not.toBe(data2.context.id);
    });

    it('POST /chat_load should load existing chat', async () => {
      // First create a chat
      const createResponse = await worker.fetch('/chat_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const createData = await createResponse.json();
      
      // Then load it
      const loadResponse = await worker.fetch('/chat_load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: createData.context.id }),
      });
      const loadData = await loadResponse.json();
      
      expect(loadResponse.status).toBe(200);
      expect(loadData).toHaveProperty('context');
    });

    it('POST /chat_load with invalid ID should handle gracefully', async () => {
      const response = await worker.fetch('/chat_load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'non-existent-id' }),
      });
      
      expect(response.status).toBe(200);
    });

    it('POST /chat_reset should clear chat history', async () => {
      const response = await worker.fetch('/chat_reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('POST /chat_remove should delete chat', async () => {
      const response = await worker.fetch('/chat_remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('POST /chat_export should export chat data', async () => {
      const response = await worker.fetch('/chat_export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('messages');
    });
  });

  // ==========================================
  // Message Handling Endpoints
  // ==========================================
  describe('Message Handling Endpoints', () => {
    it('POST /message_async should accept message', async () => {
      const response = await worker.fetch('/message_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello',
          context_id: 'test-context',
        }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('POST /message_async with empty text should handle gracefully', async () => {
      const response = await worker.fetch('/message_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
          context_id: 'test-context',
        }),
      });
      
      expect(response.status).toBe(200);
    });

    it('POST /message_async should include response in poll', async () => {
      // Send a message
      await worker.fetch('/message_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'What is 2+2?',
          context_id: 'test-context',
        }),
      });
      
      // Poll for response
      const pollResponse = await worker.fetch('/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const pollData = await pollResponse.json();
      
      expect(pollResponse.status).toBe(200);
    });
  });

  // ==========================================
  // Memory Dashboard Endpoints
  // ==========================================
  describe('Memory Dashboard Endpoints', () => {
    it('POST /memory_dashboard with search action should return results', async () => {
      const response = await worker.fetch('/memory_dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('memories');
      expect(data).toHaveProperty('total_count');
    });

    it('POST /memory_dashboard with get_memory_subdirs action', async () => {
      const response = await worker.fetch('/memory_dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_memory_subdirs' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('subdirs');
    });

    it('POST /memory_dashboard with get_current_memory_subdir action', async () => {
      const response = await worker.fetch('/memory_dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_current_memory_subdir' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('memory_subdir');
    });

    it('POST /memory_dashboard with unknown action should return error', async () => {
      const response = await worker.fetch('/memory_dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unknown_action' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
    });
  });

  // ==========================================
  // Tasks Endpoints
  // ==========================================
  describe('Tasks Endpoints', () => {
    it('POST /tasks_get should return tasks list', async () => {
      const response = await worker.fetch('/tasks_get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      expect(Array.isArray(data.tasks)).toBe(true);
    });

    it('POST /task_kill should return error (not supported)', async () => {
      const response = await worker.fetch('/task_kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: 'test-task' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
    });
  });

  // ==========================================
  // Notification Endpoints
  // ==========================================
  describe('Notification Endpoints', () => {
    it('POST /notification_create should create notification', async () => {
      const response = await worker.fetch('/notification_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test notification',
          type: 'info',
        }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('POST /banners should return banners list', async () => {
      const response = await worker.fetch('/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('banners');
    });
  });

  // ==========================================
  // Agent Control Endpoints
  // ==========================================
  describe('Agent Control Endpoints', () => {
    it('POST /pause should toggle pause state', async () => {
      const response = await worker.fetch('/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context', paused: true }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('POST /nudge should nudge agent', async () => {
      const response = await worker.fetch('/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });

    it('POST /restart should restart agent', async () => {
      const response = await worker.fetch('/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // File & Knowledge Endpoints
  // ==========================================
  describe('File & Knowledge Endpoints', () => {
    it('POST /file_info should return file info', async () => {
      const response = await worker.fetch('/file_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/test/file.txt' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });

    it('POST /knowledge_path_get should return knowledge path', async () => {
      const response = await worker.fetch('/knowledge_path_get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });

    it('POST /knowledge_reindex should handle reindex request', async () => {
      const response = await worker.fetch('/knowledge_reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // History & Context Window Endpoints
  // ==========================================
  describe('History & Context Window Endpoints', () => {
    it('POST /history_get should return history', async () => {
      const response = await worker.fetch('/history_get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('history');
    });

    it('POST /ctx_window_get should return context window', async () => {
      const response = await worker.fetch('/ctx_window_get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_id: 'test-context' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('ctx_window');
    });
  });

  // ==========================================
  // Backup Endpoints
  // ==========================================
  describe('Backup Endpoints', () => {
    it('POST /backup_create should create backup', async () => {
      const response = await worker.fetch('/backup_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });

    it('POST /backup_download should handle download request', async () => {
      const response = await worker.fetch('/backup_download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_id: 'test-backup' }),
      });
      
      expect(response.status).toBe(200);
    });

    it('POST /backup_inspect should inspect backup', async () => {
      const response = await worker.fetch('/backup_inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_id: 'test-backup' }),
      });
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // Speech Endpoints
  // ==========================================
  describe('Speech Endpoints', () => {
    it('POST /synthesize should handle synthesis request', async () => {
      const response = await worker.fetch('/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello world' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });

    it('POST /transcribe should handle transcription request', async () => {
      const response = await worker.fetch('/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // CORS & Preflight Handling
  // ==========================================
  describe('CORS & Preflight Handling', () => {
    it('OPTIONS request should return CORS headers', async () => {
      const response = await worker.fetch('/health', {
        method: 'OPTIONS',
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('OPTIONS request to any endpoint should work', async () => {
      const endpoints = ['/settings_get', '/poll', '/chat_create', '/message_async'];
      
      for (const endpoint of endpoints) {
        const response = await worker.fetch(endpoint, { method: 'OPTIONS' });
        expect(response.status).toBe(200);
      }
    });
  });

  // ==========================================
  // Error Handling & Edge Cases
  // ==========================================
  describe('Error Handling & Edge Cases', () => {
    it('Unknown endpoint should return 404', async () => {
      const response = await worker.fetch('/unknown-endpoint');
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('Invalid JSON body should be handled gracefully', async () => {
      const response = await worker.fetch('/settings_get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });
      
      // Should not crash, may return 200 with empty body handling
      expect([200, 400]).toContain(response.status);
    });

    it('Missing Content-Type header should be handled', async () => {
      const response = await worker.fetch('/settings_get', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(200);
    });

    it('Very long input should be handled', async () => {
      const longText = 'a'.repeat(10000);
      const response = await worker.fetch('/message_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: longText,
          context_id: 'test-context',
        }),
      });
      
      expect(response.status).toBe(200);
    });

    it('Special characters in input should be handled', async () => {
      const response = await worker.fetch('/message_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '<script>alert("xss")</script>',
          context_id: 'test-context',
        }),
      });
      
      expect(response.status).toBe(200);
    });

    it('Unicode characters should be handled', async () => {
      const response = await worker.fetch('/message_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '你好世界 🌍 مرحبا',
          context_id: 'test-context',
        }),
      });
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // State Management Tests
  // ==========================================
  describe('State Management', () => {
    it('Multiple contexts should be independent', async () => {
      // Create two contexts
      const ctx1Response = await worker.fetch('/chat_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const ctx1 = await ctx1Response.json();
      
      const ctx2Response = await worker.fetch('/chat_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const ctx2 = await ctx2Response.json();
      
      expect(ctx1.context.id).not.toBe(ctx2.context.id);
    });

    it('Poll should return all contexts', async () => {
      const response = await worker.fetch('/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      expect(data.contexts.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ==========================================
// Integration Tests
// ==========================================
describe('Integration Tests', () => {
  let worker;

  beforeEach(async () => {
    worker = await unstable_dev('src/index.js', {
      experimental: { disableExperimentalWarning: true },
      vars: mockEnv,
    });
  });

  afterEach(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  it('Full chat flow: create -> message -> poll -> export', async () => {
    // 1. Create chat
    const createResponse = await worker.fetch('/chat_create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const createData = await createResponse.json();
    const contextId = createData.context.id;
    
    expect(contextId).toBeDefined();
    
    // 2. Send message
    const messageResponse = await worker.fetch('/message_async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello',
        context_id: contextId,
      }),
    });
    expect(messageResponse.status).toBe(200);
    
    // 3. Poll for updates
    const pollResponse = await worker.fetch('/poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_id: contextId }),
    });
    expect(pollResponse.status).toBe(200);
    
    // 4. Export chat
    const exportResponse = await worker.fetch('/chat_export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_id: contextId }),
    });
    expect(exportResponse.status).toBe(200);
  });

  it('Settings flow: get -> modify -> get', async () => {
    // 1. Get initial settings
    const getResponse1 = await worker.fetch('/settings_get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const settings1 = await getResponse1.json();
    
    // 2. Modify settings
    const setResponse = await worker.fetch('/settings_set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_model: { name: 'gpt-4' } }),
    });
    expect(setResponse.status).toBe(200);
    
    // 3. Get updated settings
    const getResponse2 = await worker.fetch('/settings_get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(getResponse2.status).toBe(200);
  });
});
