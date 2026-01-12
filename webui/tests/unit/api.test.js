/**
 * Comprehensive Unit Tests for Frontend API Module
 * Tests the exported functions from api.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window
global.window = {
  API_BASE_URL: 'https://test-api.example.com',
  location: { href: '' },
};

// Mock document
global.document = {
  cookie: '',
};

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window.API_BASE_URL = 'https://test-api.example.com';
    global.document.cookie = '';
    
    // Reset module cache to get fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // fetchApi Tests
  // ==========================================
  describe('fetchApi', () => {
    it('should make request to correct URL with base URL', async () => {
      // Mock CSRF token response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'test-token', runtime_id: 'test-runtime' }),
        redirected: false,
      });
      
      // Mock actual API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('/test-endpoint');
      
      // Second call should be to the API endpoint
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch.mock.calls[1][0]).toBe('https://test-api.example.com/test-endpoint');
    });

    it('should include CSRF token in headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'csrf-test-token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('/test');
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.headers['X-CSRF-Token']).toBe('csrf-test-token');
    });

    it('should normalize URL without leading slash', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('endpoint-without-slash');
      
      expect(global.fetch.mock.calls[1][0]).toBe('https://test-api.example.com/endpoint-without-slash');
    });

    it('should not double slash when URL has leading slash', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('/endpoint-with-slash');
      
      const calledUrl = global.fetch.mock.calls[1][0];
      expect(calledUrl).not.toContain('//endpoint');
      expect(calledUrl).toBe('https://test-api.example.com/endpoint-with-slash');
    });

    it('should retry on 403 CSRF error', async () => {
      // First CSRF token
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'old-token', runtime_id: 'test' }),
        redirected: false,
      });
      
      // First request returns 403
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        redirected: false,
      });
      
      // Second CSRF token
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'new-token', runtime_id: 'test' }),
        redirected: false,
      });
      
      // Retry request succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      const response = await fetchApi('/test');
      
      expect(global.fetch).toHaveBeenCalledTimes(4);
      expect(response.status).toBe(200);
    });

    it('should handle network errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const { fetchApi } = await import('../../js/api.js');
      
      await expect(fetchApi('/test')).rejects.toThrow('Network error');
    });
  });

  // ==========================================
  // callJsonApi Tests
  // ==========================================
  describe('callJsonApi', () => {
    it('should set Content-Type to application/json', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      await callJsonApi('/test', { key: 'value' });
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.headers['Content-Type']).toBe('application/json');
    });

    it('should stringify body data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      const testData = { key: 'value', nested: { a: 1 } };
      await callJsonApi('/test', testData);
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.body).toBe(JSON.stringify(testData));
    });

    it('should use POST method', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      await callJsonApi('/test', {});
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.method).toBe('POST');
    });

    it('should parse JSON response', async () => {
      const responseData = { success: true, data: { id: 1 } };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      const result = await callJsonApi('/test', {});
      
      expect(result).toEqual(responseData);
    });

    it('should throw error on non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      
      await expect(callJsonApi('/test', {})).rejects.toThrow('Server Error');
    });

    it('should handle empty request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      await callJsonApi('/test', {});
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.body).toBe('{}');
    });

    it('should handle array data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      const arrayData = [1, 2, 3];
      await callJsonApi('/test', arrayData);
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.body).toBe('[1,2,3]');
    });

    it('should handle null values in data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      const dataWithNull = { key: null };
      await callJsonApi('/test', dataWithNull);
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.body).toBe('{"key":null}');
    });

    it('should handle unicode in data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      const unicodeData = { text: '你好世界 🌍 مرحبا' };
      await callJsonApi('/test', unicodeData);
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.body).toContain('你好世界');
    });
  });

  // ==========================================
  // URL Construction Tests
  // ==========================================
  describe('URL Construction', () => {
    it('should work with base URL ending in slash', async () => {
      global.window.API_BASE_URL = 'https://test-api.example.com/';
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('/endpoint');
      
      // URL should be properly constructed
      expect(global.fetch.mock.calls[1][0]).toContain('endpoint');
    });

    it('should work without base URL (same origin)', async () => {
      global.window.API_BASE_URL = '';
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('/endpoint');
      
      expect(global.fetch.mock.calls[1][0]).toBe('/endpoint');
    });

    it('should handle special characters in endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('/test?param=value&other=123');
      
      expect(global.fetch.mock.calls[1][0]).toContain('param=value');
    });
  });

  // ==========================================
  // CSRF Token Caching Tests
  // ==========================================
  describe('CSRF Token Caching', () => {
    it('should cache CSRF token after first request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'cached-token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test1' }),
        redirected: false,
      });
      
      // Second API call should reuse cached token
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test2' }),
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      
      await fetchApi('/test1');
      await fetchApi('/test2');
      
      // Should only have 3 fetch calls (1 CSRF + 2 API calls)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should set cookie with CSRF token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'cookie-token', runtime_id: 'runtime-123' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      await fetchApi('/test');
      
      expect(global.document.cookie).toContain('csrf_token_runtime-123=cookie-token');
    });
  });

  // ==========================================
  // Error Handling Tests
  // ==========================================
  describe('Error Handling', () => {
    it('should throw error when CSRF token request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: false, error: 'Token error' }),
        redirected: false,
      });

      const { fetchApi } = await import('../../js/api.js');
      
      await expect(fetchApi('/test')).rejects.toThrow('Token error');
    });

    it('should handle CSRF token network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const { fetchApi } = await import('../../js/api.js');
      
      await expect(fetchApi('/test')).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      
      await expect(callJsonApi('/test', {})).rejects.toThrow();
    });
  });

  // ==========================================
  // Credentials Handling Tests
  // ==========================================
  describe('Credentials Handling', () => {
    it('should omit credentials when using external API', async () => {
      global.window.API_BASE_URL = 'https://external-api.example.com';
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      await callJsonApi('/test', {});
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.credentials).toBe('omit');
    });

    it('should use same-origin credentials when no base URL', async () => {
      global.window.API_BASE_URL = '';
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, token: 'token', runtime_id: 'test' }),
        redirected: false,
      });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        redirected: false,
      });

      const { callJsonApi } = await import('../../js/api.js');
      await callJsonApi('/test', {});
      
      const secondCallOptions = global.fetch.mock.calls[1][1];
      expect(secondCallOptions.credentials).toBe('same-origin');
    });
  });
});

// ==========================================
// Integration-style Tests
// ==========================================
describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    global.window.API_BASE_URL = 'https://test-api.example.com';
    global.document.cookie = '';
  });

  it('should complete full request cycle', async () => {
    // CSRF token
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true, token: 'integration-token', runtime_id: 'int-test' }),
      redirected: false,
    });
    
    // API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 123 } }),
      redirected: false,
    });

    const { callJsonApi } = await import('../../js/api.js');
    const result = await callJsonApi('/api/test', { action: 'create' });
    
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(123);
  });

  it('should handle multiple sequential requests', async () => {
    // CSRF token (only once)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true, token: 'seq-token', runtime_id: 'seq-test' }),
      redirected: false,
    });
    
    // First API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: 1 }),
      redirected: false,
    });
    
    // Second API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: 2 }),
      redirected: false,
    });
    
    // Third API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: 3 }),
      redirected: false,
    });

    const { callJsonApi } = await import('../../js/api.js');
    
    const result1 = await callJsonApi('/api/1', {});
    const result2 = await callJsonApi('/api/2', {});
    const result3 = await callJsonApi('/api/3', {});
    
    expect(result1.result).toBe(1);
    expect(result2.result).toBe(2);
    expect(result3.result).toBe(3);
    
    // Should have 4 total calls (1 CSRF + 3 API)
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});
