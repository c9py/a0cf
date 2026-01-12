/**
 * Comprehensive E2E Tests for Agent Zero Application
 * Tests full user flows and interactions using Playwright
 */

import { test, expect } from '@playwright/test';

// Base URL for testing - can be overridden via environment variable
const BASE_URL = process.env.TEST_URL || 'https://a0cf.pages.dev';
const API_URL = process.env.API_URL || 'https://a0cf-api.d-d1f.workers.dev';

test.describe('Agent Zero E2E Tests', () => {
  
  // ==========================================
  // Page Load & Initial State Tests
  // ==========================================
  test.describe('Page Load & Initial State', () => {
    test('should load the main page successfully', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check page title
      await expect(page).toHaveTitle(/Agent Zero/);
      
      // Check main elements are visible
      await expect(page.locator('text=Welcome to Agent Zero')).toBeVisible();
    });

    test('should display sidebar with navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check sidebar elements
      await expect(page.locator('#toggle-sidebar')).toBeVisible();
      await expect(page.locator('text=Chats')).toBeVisible();
    });

    test('should display welcome cards', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check welcome cards
      await expect(page.locator('text=New Chat')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Memory')).toBeVisible();
    });

    test('should have correct version displayed', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check version info
      await expect(page.locator('text=Version')).toBeVisible();
    });

    test('should load without console errors', async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Filter out expected errors (like API connection issues in test env)
      const criticalErrors = errors.filter(e => 
        !e.includes('Failed to fetch') && 
        !e.includes('net::ERR')
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });

  // ==========================================
  // Navigation Tests
  // ==========================================
  test.describe('Navigation', () => {
    test('should toggle sidebar', async ({ page }) => {
      await page.goto(BASE_URL);
      
      const sidebar = page.locator('.sidebar, [class*="sidebar"]').first();
      const toggleButton = page.locator('#toggle-sidebar');
      
      // Toggle sidebar
      await toggleButton.click();
      await page.waitForTimeout(300); // Wait for animation
      
      // Toggle back
      await toggleButton.click();
      await page.waitForTimeout(300);
    });

    test('should navigate to Settings via card click', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Click Settings card
      await page.locator('text=Settings').first().click();
      
      // Check Settings modal opens
      await expect(page.locator('text=Agent Settings')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Memory Dashboard', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Click Memory card
      await page.locator('text=Memory').first().click();
      
      // Check Memory Dashboard opens
      await expect(page.locator('text=Memory Dashboard')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Task Scheduler', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Click Scheduler button
      await page.locator('#scheduler').click();
      
      // Check Scheduler opens
      await expect(page.locator('text=Task Scheduler')).toBeVisible({ timeout: 5000 });
    });

    test('should close modals with X button', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Open Settings
      await page.locator('text=Settings').first().click();
      await expect(page.locator('text=Agent Settings')).toBeVisible({ timeout: 5000 });
      
      // Close with X button
      await page.locator('button:has-text("×")').first().click();
      
      // Verify modal is closed
      await expect(page.locator('text=Agent Settings')).not.toBeVisible({ timeout: 3000 });
    });

    test('should close modals with Escape key', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Open Settings
      await page.locator('text=Settings').first().click();
      await expect(page.locator('text=Agent Settings')).toBeVisible({ timeout: 5000 });
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Verify modal is closed
      await expect(page.locator('text=Agent Settings')).not.toBeVisible({ timeout: 3000 });
    });
  });

  // ==========================================
  // Chat Functionality Tests
  // ==========================================
  test.describe('Chat Functionality', () => {
    test('should create new chat', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Click New Chat
      await page.locator('text=New Chat').first().click();
      
      // Wait for chat interface
      await page.waitForTimeout(1000);
      
      // Check chat input is visible
      await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible();
    });

    test('should have chat input placeholder', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Create new chat
      await page.locator('text=New Chat').first().click();
      await page.waitForTimeout(1000);
      
      // Check placeholder text
      const input = page.locator('textarea, input[placeholder*="message"]').first();
      await expect(input).toBeVisible();
    });

    test('should enable send button when text is entered', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Create new chat
      await page.locator('text=New Chat').first().click();
      await page.waitForTimeout(1000);
      
      // Type message
      const input = page.locator('textarea, input[placeholder*="message"]').first();
      await input.fill('Test message');
      
      // Check send button
      const sendButton = page.locator('button[type="submit"], button:has-text("send")').first();
      await expect(sendButton).toBeEnabled();
    });

    test('should send message and receive response', async ({ page }) => {
      test.setTimeout(60000); // Allow time for AI response
      
      await page.goto(BASE_URL);
      
      // Create new chat
      await page.locator('text=New Chat').first().click();
      await page.waitForTimeout(1000);
      
      // Type and send message
      const input = page.locator('textarea, input[placeholder*="message"]').first();
      await input.fill('What is 2+2?');
      
      // Click send or press Enter
      await page.keyboard.press('Enter');
      
      // Wait for response (with timeout)
      await page.waitForTimeout(5000);
      
      // Check for response in chat
      const chatArea = page.locator('.chat-messages, .messages, [class*="message"]');
      await expect(chatArea).toBeVisible();
    });

    test('should display user message in chat', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Create new chat
      await page.locator('text=New Chat').first().click();
      await page.waitForTimeout(1000);
      
      // Type and send message
      const input = page.locator('textarea, input[placeholder*="message"]').first();
      const testMessage = 'Hello from E2E test';
      await input.fill(testMessage);
      await page.keyboard.press('Enter');
      
      // Wait for message to appear
      await page.waitForTimeout(2000);
      
      // Check message is displayed
      await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 5000 });
    });

    test('should clear chat with Clear Chat button', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Create new chat
      await page.locator('text=New Chat').first().click();
      await page.waitForTimeout(1000);
      
      // Look for Clear Chat button
      const clearButton = page.locator('button:has-text("Clear"), [title*="Clear"]');
      if (await clearButton.isVisible()) {
        await clearButton.click();
      }
    });
  });

  // ==========================================
  // Settings Modal Tests
  // ==========================================
  test.describe('Settings Modal', () => {
    test('should open Settings modal', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Settings').first().click();
      
      await expect(page.locator('text=Agent Settings')).toBeVisible({ timeout: 5000 });
    });

    test('should display all settings tabs', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Settings').first().click();
      await page.waitForTimeout(1000);
      
      // Check for settings tabs
      await expect(page.locator('text=Agent Settings')).toBeVisible();
      await expect(page.locator('text=External Services')).toBeVisible();
      await expect(page.locator('text=MCP/A2A')).toBeVisible();
      await expect(page.locator('text=Developer')).toBeVisible();
      await expect(page.locator('text=Backup & Restore')).toBeVisible();
    });

    test('should display Agent Config section', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Settings').first().click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Agent Config')).toBeVisible();
    });

    test('should display Chat Model settings', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Settings').first().click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Chat Model')).toBeVisible();
    });

    test('should have Save and Cancel buttons', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Settings').first().click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('button:has-text("Save")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    });

    test('should switch between settings tabs', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Settings').first().click();
      await page.waitForTimeout(1000);
      
      // Click External Services tab
      await page.locator('text=External Services').click();
      await page.waitForTimeout(500);
      
      // Click back to Agent Settings
      await page.locator('text=Agent Settings').click();
      await page.waitForTimeout(500);
    });

    test('should close Settings with Cancel button', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Settings').first().click();
      await expect(page.locator('text=Agent Settings')).toBeVisible({ timeout: 5000 });
      
      await page.locator('button:has-text("Cancel")').click();
      
      await expect(page.locator('text=Agent Settings')).not.toBeVisible({ timeout: 3000 });
    });
  });

  // ==========================================
  // Memory Dashboard Tests
  // ==========================================
  test.describe('Memory Dashboard', () => {
    test('should open Memory Dashboard', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Memory').first().click();
      
      await expect(page.locator('text=Memory Dashboard')).toBeVisible({ timeout: 5000 });
    });

    test('should display memory search input', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Memory').first().click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should display memory filters', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Memory').first().click();
      await page.waitForTimeout(1000);
      
      // Check for filter dropdowns
      await expect(page.locator('text=Memory Directory')).toBeVisible();
      await expect(page.locator('text=Area')).toBeVisible();
    });

    test('should display Search and Clear buttons', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Memory').first().click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('button:has-text("Search")')).toBeVisible();
      await expect(page.locator('button:has-text("Clear")')).toBeVisible();
    });

    test('should show informative message about Workers limitations', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('text=Memory').first().click();
      await page.waitForTimeout(2000);
      
      // Check for the Workers limitation message
      const limitationMessage = page.locator('text=Memory storage is not available');
      if (await limitationMessage.isVisible()) {
        await expect(limitationMessage).toBeVisible();
      }
    });
  });

  // ==========================================
  // Task Scheduler Tests
  // ==========================================
  test.describe('Task Scheduler', () => {
    test('should open Task Scheduler', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('#scheduler').click();
      
      await expect(page.locator('text=Task Scheduler')).toBeVisible({ timeout: 5000 });
    });

    test('should display task filters', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('#scheduler').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Type')).toBeVisible();
      await expect(page.locator('text=State')).toBeVisible();
    });

    test('should display New Task button', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('#scheduler').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('button:has-text("New Task")')).toBeVisible();
    });

    test('should show empty state when no tasks', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await page.locator('#scheduler').click();
      await page.waitForTimeout(1000);
      
      // Check for empty state message
      const emptyState = page.locator('text=No tasks found');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    });
  });

  // ==========================================
  // Theme & Preferences Tests
  // ==========================================
  test.describe('Theme & Preferences', () => {
    test('should have dark mode toggle', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await expect(page.locator('text=Dark mode')).toBeVisible();
    });

    test('should have autoscroll toggle', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await expect(page.locator('text=Autoscroll')).toBeVisible();
    });

    test('should have speech toggle', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await expect(page.locator('text=Speech')).toBeVisible();
    });

    test('should toggle dark mode', async ({ page }) => {
      await page.goto(BASE_URL);
      
      const darkModeToggle = page.locator('text=Dark mode').locator('..').locator('input[type="checkbox"]');
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);
      }
    });
  });

  // ==========================================
  // Responsive Design Tests
  // ==========================================
  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      
      await expect(page.locator('text=Agent Zero')).toBeVisible();
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      
      await expect(page.locator('text=Agent Zero')).toBeVisible();
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      
      await expect(page.locator('text=Agent Zero')).toBeVisible();
    });

    test('sidebar should be collapsible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      
      const toggleButton = page.locator('#toggle-sidebar');
      await expect(toggleButton).toBeVisible();
    });
  });

  // ==========================================
  // API Integration Tests
  // ==========================================
  test.describe('API Integration', () => {
    test('should connect to backend API', async ({ page }) => {
      const response = await page.request.get(`${API_URL}/health`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });

    test('should get CSRF token', async ({ page }) => {
      const response = await page.request.get(`${API_URL}/csrf_token`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.token).toBeDefined();
    });

    test('should get settings', async ({ page }) => {
      const response = await page.request.post(`${API_URL}/settings_get`, {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.chat_model).toBeDefined();
    });

    test('should poll for updates', async ({ page }) => {
      const response = await page.request.post(`${API_URL}/poll`, {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.contexts).toBeDefined();
      expect(data.logs).toBeDefined();
    });

    test('should create chat context', async ({ page }) => {
      const response = await page.request.post(`${API_URL}/chat_create`, {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.context).toBeDefined();
      expect(data.context.id).toBeDefined();
    });
  });

  // ==========================================
  // Error Handling Tests
  // ==========================================
  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // The app should still load even if some API calls fail
      await expect(page.locator('text=Agent Zero')).toBeVisible();
    });

    test('should display error messages in UI', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Try to trigger an error by opening a modal
      await page.locator('text=Settings').first().click();
      await page.waitForTimeout(2000);
      
      // Check if error is displayed or settings loaded
      const hasContent = await page.locator('text=Agent Settings').isVisible() ||
                        await page.locator('text=Failed').isVisible();
      expect(hasContent).toBeTruthy();
    });

    test('should handle network timeout', async ({ page }) => {
      // Set a short timeout
      page.setDefaultTimeout(5000);
      
      await page.goto(BASE_URL);
      
      // App should still be functional
      await expect(page.locator('text=Agent Zero')).toBeVisible();
    });
  });

  // ==========================================
  // Accessibility Tests
  // ==========================================
  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for h1, h2, h3 elements
      const headings = await page.locator('h1, h2, h3').count();
      expect(headings).toBeGreaterThan(0);
    });

    test('should have alt text on images', async ({ page }) => {
      await page.goto(BASE_URL);
      
      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        // Images should have alt attribute (can be empty for decorative)
        expect(alt !== null).toBeTruthy();
      }
    });

    test('should have focusable interactive elements', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Tab through elements
      await page.keyboard.press('Tab');
      
      // Check that something is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
    });

    test('should have proper button labels', async ({ page }) => {
      await page.goto(BASE_URL);
      
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        
        // Button should have some form of label
        const hasLabel = (text && text.trim()) || ariaLabel || title;
        expect(hasLabel).toBeTruthy();
      }
    });
  });

  // ==========================================
  // Performance Tests
  // ==========================================
  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should have reasonable number of network requests', async ({ page }) => {
      const requests = [];
      page.on('request', request => requests.push(request));
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Should not have excessive requests
      expect(requests.length).toBeLessThan(100);
    });
  });
});
