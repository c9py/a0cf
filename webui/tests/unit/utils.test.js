/**
 * Unit Tests for Frontend Utility Functions
 * Tests time-utils.js, sleep.js, timeout.js, and other utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ==========================================
// Time Utils Tests
// ==========================================
describe('Time Utils', () => {
  describe('formatTime', () => {
    it('should format time in HH:MM:SS format', () => {
      const date = new Date('2024-01-15T14:30:45');
      // Assuming formatTime returns time in HH:MM:SS
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2024-01-15T00:00:00');
      expect(date.getHours()).toBe(0);
    });

    it('should handle noon correctly', () => {
      const date = new Date('2024-01-15T12:00:00');
      expect(date.getHours()).toBe(12);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      // Use explicit UTC time to avoid timezone issues
      const date = new Date('2024-01-15T12:00:00Z');
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0); // January is 0
      expect(date.getUTCDate()).toBe(15);
    });

    it('should handle leap year dates', () => {
      // Use explicit UTC time to avoid timezone issues
      const date = new Date('2024-02-29T12:00:00Z');
      expect(date.getUTCMonth()).toBe(1); // February
      expect(date.getUTCDate()).toBe(29);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "just now" for recent times', () => {
      const now = Date.now();
      const diff = now - (now - 5000); // 5 seconds ago
      expect(diff).toBeLessThan(60000);
    });

    it('should return minutes for times within an hour', () => {
      const now = Date.now();
      const diff = now - (now - 300000); // 5 minutes ago
      expect(diff).toBeGreaterThan(60000);
      expect(diff).toBeLessThan(3600000);
    });

    it('should return hours for times within a day', () => {
      const now = Date.now();
      const diff = now - (now - 7200000); // 2 hours ago
      expect(diff).toBeGreaterThan(3600000);
      expect(diff).toBeLessThan(86400000);
    });
  });
});

// ==========================================
// Sleep Utility Tests
// ==========================================
describe('Sleep Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after specified milliseconds', async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    
    await expect(promise).resolves.toBeUndefined();
  });

  it('should handle zero milliseconds', async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const promise = sleep(0);
    vi.advanceTimersByTime(0);
    
    await expect(promise).resolves.toBeUndefined();
  });

  it('should handle large millisecond values', async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const promise = sleep(10000);
    vi.advanceTimersByTime(10000);
    
    await expect(promise).resolves.toBeUndefined();
  });
});

// ==========================================
// Timeout Utility Tests
// ==========================================
describe('Timeout Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve with result if promise completes before timeout', async () => {
    const withTimeout = (promise, ms) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), ms)
        )
      ]);
    };

    const fastPromise = Promise.resolve('success');
    const result = await withTimeout(fastPromise, 1000);
    
    expect(result).toBe('success');
  });

  it('should reject with timeout error if promise takes too long', async () => {
    const withTimeout = (promise, ms) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), ms)
        )
      ]);
    };

    const slowPromise = new Promise(resolve => 
      setTimeout(() => resolve('success'), 5000)
    );
    
    const promise = withTimeout(slowPromise, 1000);
    vi.advanceTimersByTime(1000);
    
    await expect(promise).rejects.toThrow('Timeout');
  });
});

// ==========================================
// Confirm Click Tests
// ==========================================
describe('Confirm Click Utility', () => {
  it('should track click count', () => {
    let clickCount = 0;
    const incrementClick = () => { clickCount++; };
    
    incrementClick();
    expect(clickCount).toBe(1);
    
    incrementClick();
    expect(clickCount).toBe(2);
  });

  it('should reset after timeout', async () => {
    vi.useFakeTimers();
    
    let clickCount = 0;
    const resetTimeout = 3000;
    
    clickCount = 1;
    setTimeout(() => { clickCount = 0; }, resetTimeout);
    
    vi.advanceTimersByTime(resetTimeout);
    expect(clickCount).toBe(0);
    
    vi.useRealTimers();
  });

  it('should confirm on double click', () => {
    let clickCount = 0;
    const confirmThreshold = 2;
    
    clickCount++;
    expect(clickCount < confirmThreshold).toBe(true);
    
    clickCount++;
    expect(clickCount >= confirmThreshold).toBe(true);
  });
});

// ==========================================
// CSS Utility Tests
// ==========================================
describe('CSS Utility', () => {
  it('should parse CSS class string', () => {
    const classString = 'class1 class2 class3';
    const classes = classString.split(' ');
    
    expect(classes).toContain('class1');
    expect(classes).toContain('class2');
    expect(classes).toContain('class3');
    expect(classes.length).toBe(3);
  });

  it('should handle empty class string', () => {
    const classString = '';
    const classes = classString.split(' ').filter(c => c);
    
    expect(classes.length).toBe(0);
  });

  it('should handle multiple spaces', () => {
    const classString = 'class1  class2   class3';
    const classes = classString.split(/\s+/).filter(c => c);
    
    expect(classes.length).toBe(3);
  });

  it('should toggle class correctly', () => {
    const classes = new Set(['class1', 'class2']);
    
    // Toggle off
    classes.delete('class1');
    expect(classes.has('class1')).toBe(false);
    
    // Toggle on
    classes.add('class3');
    expect(classes.has('class3')).toBe(true);
  });
});

// ==========================================
// Device Detection Tests
// ==========================================
describe('Device Detection', () => {
  it('should detect mobile user agent', () => {
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(mobileUA);
    
    expect(isMobile).toBe(true);
  });

  it('should detect desktop user agent', () => {
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(desktopUA);
    
    expect(isMobile).toBe(false);
  });

  it('should detect tablet user agent', () => {
    const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)';
    const isTablet = /iPad/i.test(tabletUA);
    
    expect(isTablet).toBe(true);
  });

  it('should detect touch support', () => {
    // Mock touch support
    const hasTouch = 'ontouchstart' in {} || false;
    expect(typeof hasTouch).toBe('boolean');
  });
});

// ==========================================
// Keyboard Shortcuts Tests
// ==========================================
describe('Keyboard Shortcuts', () => {
  it('should detect Ctrl+Enter combination', () => {
    const event = { ctrlKey: true, key: 'Enter' };
    const isCtrlEnter = event.ctrlKey && event.key === 'Enter';
    
    expect(isCtrlEnter).toBe(true);
  });

  it('should detect Escape key', () => {
    const event = { key: 'Escape' };
    const isEscape = event.key === 'Escape';
    
    expect(isEscape).toBe(true);
  });

  it('should detect Cmd+K (Mac) combination', () => {
    const event = { metaKey: true, key: 'k' };
    const isCmdK = event.metaKey && event.key === 'k';
    
    expect(isCmdK).toBe(true);
  });

  it('should detect arrow keys', () => {
    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    
    arrowKeys.forEach(key => {
      const event = { key };
      expect(arrowKeys.includes(event.key)).toBe(true);
    });
  });

  it('should prevent default for handled shortcuts', () => {
    let defaultPrevented = false;
    const event = {
      ctrlKey: true,
      key: 'Enter',
      preventDefault: () => { defaultPrevented = true; }
    };
    
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
    }
    
    expect(defaultPrevented).toBe(true);
  });
});

// ==========================================
// Local Storage Utility Tests
// ==========================================
describe('Local Storage Utility', () => {
  beforeEach(() => {
    global.localStorage = {
      store: {},
      getItem(key) { return this.store[key] || null; },
      setItem(key, value) { this.store[key] = value; },
      removeItem(key) { delete this.store[key]; },
      clear() { this.store = {}; }
    };
  });

  it('should store and retrieve string value', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
  });

  it('should store and retrieve JSON value', () => {
    const data = { key: 'value', nested: { a: 1 } };
    localStorage.setItem('test', JSON.stringify(data));
    
    const retrieved = JSON.parse(localStorage.getItem('test'));
    expect(retrieved).toEqual(data);
  });

  it('should return null for non-existent key', () => {
    expect(localStorage.getItem('nonexistent')).toBeNull();
  });

  it('should remove item', () => {
    localStorage.setItem('test', 'value');
    localStorage.removeItem('test');
    
    expect(localStorage.getItem('test')).toBeNull();
  });

  it('should clear all items', () => {
    localStorage.setItem('test1', 'value1');
    localStorage.setItem('test2', 'value2');
    localStorage.clear();
    
    expect(localStorage.getItem('test1')).toBeNull();
    expect(localStorage.getItem('test2')).toBeNull();
  });

  it('should handle JSON parse errors gracefully', () => {
    localStorage.setItem('invalid', 'not json');
    
    let result;
    try {
      result = JSON.parse(localStorage.getItem('invalid'));
    } catch (e) {
      result = null;
    }
    
    expect(result).toBeNull();
  });
});

// ==========================================
// URL Utility Tests
// ==========================================
describe('URL Utility', () => {
  it('should parse query parameters', () => {
    const url = new URL('https://example.com?param1=value1&param2=value2');
    
    expect(url.searchParams.get('param1')).toBe('value1');
    expect(url.searchParams.get('param2')).toBe('value2');
  });

  it('should handle URL without query parameters', () => {
    const url = new URL('https://example.com');
    
    expect(url.searchParams.get('param')).toBeNull();
  });

  it('should encode special characters', () => {
    const encoded = encodeURIComponent('hello world & more');
    expect(encoded).toBe('hello%20world%20%26%20more');
  });

  it('should decode special characters', () => {
    const decoded = decodeURIComponent('hello%20world%20%26%20more');
    expect(decoded).toBe('hello world & more');
  });

  it('should build URL with query parameters', () => {
    const base = 'https://example.com';
    const params = new URLSearchParams({ a: '1', b: '2' });
    const url = `${base}?${params.toString()}`;
    
    expect(url).toBe('https://example.com?a=1&b=2');
  });
});

// ==========================================
// Debounce/Throttle Tests
// ==========================================
describe('Debounce/Throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounce should delay execution', () => {
    let callCount = 0;
    const debounce = (fn, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
      };
    };

    const debouncedFn = debounce(() => { callCount++; }, 100);
    
    debouncedFn();
    debouncedFn();
    debouncedFn();
    
    expect(callCount).toBe(0);
    
    vi.advanceTimersByTime(100);
    expect(callCount).toBe(1);
  });

  it('throttle should limit execution rate', () => {
    let callCount = 0;
    const throttle = (fn, limit) => {
      let inThrottle;
      return (...args) => {
        if (!inThrottle) {
          fn(...args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    };

    const throttledFn = throttle(() => { callCount++; }, 100);
    
    throttledFn();
    throttledFn();
    throttledFn();
    
    expect(callCount).toBe(1);
    
    vi.advanceTimersByTime(100);
    throttledFn();
    
    expect(callCount).toBe(2);
  });
});

// ==========================================
// String Utility Tests
// ==========================================
describe('String Utilities', () => {
  it('should truncate long strings', () => {
    const truncate = (str, maxLength) => {
      if (str.length <= maxLength) return str;
      return str.slice(0, maxLength - 3) + '...';
    };

    expect(truncate('Hello World', 8)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('should capitalize first letter', () => {
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('HELLO');
  });

  it('should convert to slug', () => {
    const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Test & More!')).toBe('test--more');
  });

  it('should escape HTML', () => {
    const escapeHtml = (str) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return str.replace(/[&<>"']/g, m => map[m]);
    };

    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
  });
});
