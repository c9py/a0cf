/**
 * Comprehensive Unit Tests for Frontend API Module
 * Tests every function and edge case in api.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock window and fetch
const mockWindow = {
  API_BASE_URL: 'https://test-api.example.com',
  csrfToken: null,
};

global.window = mockWindow;
global.fetch = vi.fn();

// Import after mocking
const { API, getApiBaseUrl, fetchApi, callJsonApi, uploadFile } = await import('../../js/api.js');

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.API_BASE_URL = 'https://test-api.example.com';
    mockWindow.csrfToken = null;
  });

  // ==========================================
  // getApiBaseUrl Tests
  // ==========================================
  describe('getApiBaseUrl', () => {
    it('should return window.API_BASE_URL when set', () => {
      mockWindow.API_BASE_URL = 'https://custom-api.example.com';
      const result = getApiBaseUrl();
      expect(result).toBe('https://custom-api.example.com');
    });

    it('should return empty string when API_BASE_URL is not set', () => {
      mockWindow.API_BASE_URL = undefined;
      const result = getApiBaseUrl();
      expect(result).toBe('');
    });

    it('should return empty string when API_BASE_URL is null', () => {
      mockWindow.API_BASE_URL = null;
      const result = getApiBaseUrl();
      expect(result).toBe('');
    });

    it('should handle trailing slash in API_BASE_URL', () => {
      mockWindow.API_BASE_URL = 'https://api.example.com/';
      const result = getApiBaseUrl();
      expect(result).toBe('https://api.example.com/');
    });
  });

  // ==========================================
  // URL Normalization Tests
  // ==========================================
  describe('URL Normalization', () => {
    it('should add leading slash to endpoint without one', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('endpoint');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/endpoint'),
        expect.any(Object)
      );
    });

    it('should not double slash when endpoint has leading slash', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('/endpoint');
      
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('//endpoint');
    });

    it('should handle base URL with trailing slash', async () => {
      mockWindow.API_BASE_URL = 'https://api.example.com/';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('endpoint');
      
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://api.example.com/endpoint');
    });
  });

  // ==========================================
  // fetchApi Tests
  // ==========================================
  describe('fetchApi', () => {
    it('should make GET request by default', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should include credentials in request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('should handle POST method', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('/test', { method: 'POST' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchApi('/test')).rejects.toThrow('Network error');
    });

    it('should handle timeout', async () => {
      global.fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(fetchApi('/test')).rejects.toThrow();
    });
  });

  // ==========================================
  // callJsonApi Tests
  // ==========================================
  describe('callJsonApi', () => {
    it('should set Content-Type to application/json', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await callJsonApi('/test', {});
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should stringify body data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const testData = { key: 'value', nested: { a: 1 } };
      await callJsonApi('/test', testData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(testData),
        })
      );
    });

    it('should use POST method by default', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await callJsonApi('/test', {});
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should parse JSON response', async () => {
      const responseData = { success: true, data: { id: 1 } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await callJsonApi('/test', {});
      
      expect(result).toEqual(responseData);
    });

    it('should handle empty response body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const result = await callJsonApi('/test', {});
      
      expect(result).toBeNull();
    });

    it('should handle array response', async () => {
      const responseData = [1, 2, 3];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await callJsonApi('/test', {});
      
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // ==========================================
  // CSRF Token Tests
  // ==========================================
  describe('CSRF Token Handling', () => {
    it('should include CSRF token in headers when available', async () => {
      mockWindow.csrfToken = 'test-csrf-token';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await callJsonApi('/test', {});
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token',
          }),
        })
      );
    });

    it('should not include CSRF token when not available', async () => {
      mockWindow.csrfToken = null;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await callJsonApi('/test', {});
      
      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  // ==========================================
  // Error Response Tests
  // ==========================================
  describe('Error Response Handling', () => {
    it('should handle 400 Bad Request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid input' }),
      });

      await expect(callJsonApi('/test', {})).rejects.toThrow();
    });

    it('should handle 401 Unauthorized', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      });

      await expect(callJsonApi('/test', {})).rejects.toThrow();
    });

    it('should handle 404 Not Found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Endpoint not found' }),
      });

      await expect(callJsonApi('/test', {})).rejects.toThrow();
    });

    it('should handle 500 Internal Server Error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(callJsonApi('/test', {})).rejects.toThrow();
    });

    it('should handle non-JSON error response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Server Error'),
      });

      await expect(callJsonApi('/test', {})).rejects.toThrow();
    });
  });

  // ==========================================
  // File Upload Tests
  // ==========================================
  describe('File Upload', () => {
    it('should create FormData for file upload', async () => {
      const mockFile = new Blob(['test content'], { type: 'text/plain' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await uploadFile('/upload', mockFile, 'test.txt');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    it('should not set Content-Type for file upload (let browser set it)', async () => {
      const mockFile = new Blob(['test content'], { type: 'text/plain' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await uploadFile('/upload', mockFile, 'test.txt');
      
      const headers = global.fetch.mock.calls[0][1].headers || {};
      expect(headers['Content-Type']).toBeUndefined();
    });
  });

  // ==========================================
  // Edge Cases
  // ==========================================
  describe('Edge Cases', () => {
    it('should handle empty string endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('');
      
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle special characters in endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchApi('/test?param=value&other=123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test?param=value&other=123'),
        expect.any(Object)
      );
    });

    it('should handle unicode in request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const unicodeData = { text: '你好世界 🌍 مرحبا' };
      await callJsonApi('/test', unicodeData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(unicodeData),
        })
      );
    });

    it('should handle very large request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const largeData = { text: 'a'.repeat(100000) };
      await callJsonApi('/test', largeData);
      
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle null values in request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const dataWithNull = { key: null, nested: { value: null } };
      await callJsonApi('/test', dataWithNull);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(dataWithNull),
        })
      );
    });

    it('should handle undefined values in request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const dataWithUndefined = { key: undefined };
      await callJsonApi('/test', dataWithUndefined);
      
      // undefined values are stripped by JSON.stringify
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: '{}',
        })
      );
    });
  });
});

// ==========================================
// API Endpoint Specific Tests
// ==========================================
describe('API Endpoint Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.API_BASE_URL = 'https://test-api.example.com';
  });

  describe('API.getHealth', () => {
    it('should call /health endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      await API.getHealth();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object)
      );
    });
  });

  describe('API.getCsrfToken', () => {
    it('should call /csrf_token endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      });

      await API.getCsrfToken();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/csrf_token'),
        expect.any(Object)
      );
    });
  });

  describe('API.getSettings', () => {
    it('should call /settings_get endpoint with POST', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ chat_model: {} }),
      });

      await API.getSettings();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/settings_get'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('API.setSettings', () => {
    it('should call /settings_set endpoint with settings data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const settings = { chat_model: { name: 'gpt-4' } };
      await API.setSettings(settings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/settings_set'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('gpt-4'),
        })
      );
    });
  });

  describe('API.poll', () => {
    it('should call /poll endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contexts: [], logs: [] }),
      });

      await API.poll();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/poll'),
        expect.any(Object)
      );
    });

    it('should include context_id when provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contexts: [], logs: [] }),
      });

      await API.poll('test-context-id');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('test-context-id'),
        })
      );
    });
  });

  describe('API.sendMessage', () => {
    it('should call /message_async endpoint with message data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await API.sendMessage('Hello', 'context-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/message_async'),
        expect.objectContaining({
          body: expect.stringContaining('Hello'),
        })
      );
    });
  });

  describe('API.createChat', () => {
    it('should call /chat_create endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ context: { id: 'new-id' } }),
      });

      await API.createChat();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat_create'),
        expect.any(Object)
      );
    });
  });

  describe('API.loadChat', () => {
    it('should call /chat_load endpoint with context_id', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ context: {} }),
      });

      await API.loadChat('context-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat_load'),
        expect.objectContaining({
          body: expect.stringContaining('context-123'),
        })
      );
    });
  });

  describe('API.resetChat', () => {
    it('should call /chat_reset endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await API.resetChat('context-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat_reset'),
        expect.any(Object)
      );
    });
  });

  describe('API.removeChat', () => {
    it('should call /chat_remove endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await API.removeChat('context-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat_remove'),
        expect.any(Object)
      );
    });
  });

  describe('API.exportChat', () => {
    it('should call /chat_export endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      });

      await API.exportChat('context-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat_export'),
        expect.any(Object)
      );
    });
  });
});
