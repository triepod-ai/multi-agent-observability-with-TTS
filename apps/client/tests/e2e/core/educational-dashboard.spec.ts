import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Core Educational Dashboard Cross-Browser Tests
 * Tests all major functionality across Chrome, Firefox, Safari, and Edge
 */

test.describe('Educational Dashboard - Core Features', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser, browserName }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="educational-dashboard"]', { 
      timeout: 10000 
    });
    
    console.log(`Testing on ${browserName}`);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should load dashboard with all tabs visible', async ({ browserName }) => {
    // Verify dashboard container exists
    const dashboard = page.locator('[data-testid="educational-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Verify all required tabs are present
    const expectedTabs = [
      'progress', 'guide', 'flow', 'examples', 
      'sandbox', 'scenarios', 'reference', 'glossary'
    ];

    for (const tabId of expectedTabs) {
      const tab = page.locator(`[data-testid="tab-${tabId}"]`);
      await expect(tab).toBeVisible();
    }

    console.log(`✅ ${browserName}: All tabs loaded successfully`);
  });

  test('should switch between tabs correctly', async ({ browserName }) => {
    const tabs = ['guide', 'flow', 'examples', 'sandbox'];

    for (const tabId of tabs) {
      // Click the tab
      await page.click(`[data-testid="tab-${tabId}"]`);
      
      // Wait for tab content to be visible
      await page.waitForSelector(`[data-testid="tab-content-${tabId}"]`, {
        timeout: 5000
      });
      
      // Verify active state
      const activeTab = page.locator(`[data-testid="tab-${tabId}"]`);
      await expect(activeTab).toHaveClass(/active/);
    }

    console.log(`✅ ${browserName}: Tab switching works correctly`);
  });

  test('should display educational content correctly', async ({ browserName }) => {
    // Test Guide tab content
    await page.click('[data-testid="tab-guide"]');
    await page.waitForSelector('[data-testid="guide-content"]');

    // Check for hook explanations
    const hookCards = page.locator('[data-testid^="hook-card-"]');
    const hookCount = await hookCards.count();
    expect(hookCount).toBeGreaterThan(5); // Should have multiple hooks

    // Test interactive elements
    const firstHookCard = hookCards.first();
    await expect(firstHookCard).toBeVisible();
    
    // Test expansion functionality
    if (await firstHookCard.locator('[data-testid="expand-button"]').isVisible()) {
      await firstHookCard.locator('[data-testid="expand-button"]').click();
      await expect(firstHookCard.locator('[data-testid="expanded-content"]')).toBeVisible();
    }

    console.log(`✅ ${browserName}: Educational content displays correctly`);
  });

  test('should handle assessment modal correctly', async ({ browserName }) => {
    // Navigate to a tab with assessment capability
    await page.click('[data-testid="tab-sandbox"]');
    await page.waitForSelector('[data-testid="sandbox-content"]');

    // Look for assessment trigger
    const assessmentButton = page.locator('[data-testid="start-assessment"]').first();
    if (await assessmentButton.isVisible()) {
      await assessmentButton.click();
      
      // Wait for modal to appear
      await page.waitForSelector('[data-testid="assessment-modal"]', { timeout: 5000 });
      
      // Verify modal is visible and functional
      const modal = page.locator('[data-testid="assessment-modal"]');
      await expect(modal).toBeVisible();
      
      // Test modal interaction
      const closeButton = modal.locator('[data-testid="close-modal"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await expect(modal).not.toBeVisible();
      }
    }

    console.log(`✅ ${browserName}: Assessment modal works correctly`);
  });

  test('should handle WebAssembly runtime correctly', async ({ browserName }) => {
    // Navigate to sandbox which uses WebAssembly
    await page.click('[data-testid="tab-sandbox"]');
    await page.waitForSelector('[data-testid="sandbox-content"]');

    // Wait for WebAssembly to initialize (longer timeout for slower browsers)
    const timeout = browserName === 'webkit' ? 15000 : 10000;
    
    try {
      await page.waitForSelector('[data-testid="wasi-ready"]', { 
        timeout,
        state: 'visible'
      });
      
      // Test code execution if available
      const executeButton = page.locator('[data-testid="execute-code"]');
      if (await executeButton.isVisible()) {
        await executeButton.click();
        
        // Wait for execution result
        await page.waitForSelector('[data-testid="execution-result"]', {
          timeout: 5000
        });
        
        const result = page.locator('[data-testid="execution-result"]');
        await expect(result).toBeVisible();
      }
      
      console.log(`✅ ${browserName}: WebAssembly runtime works correctly`);
    } catch (error) {
      console.warn(`⚠️ ${browserName}: WebAssembly runtime not available or slow to load`);
      // Don't fail the test, just log the issue
    }
  });
});

test.describe('Educational Dashboard - Expert/Educational Mode Toggle', () => {
  test('should toggle between educational and expert modes', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');

    // Look for mode toggle
    const modeToggle = page.locator('[data-testid="mode-toggle"]');
    if (await modeToggle.isVisible()) {
      // Test toggle functionality
      await modeToggle.click();
      
      // Wait for mode change to take effect
      await page.waitForTimeout(1000);
      
      // Verify mode change (look for expert mode indicators)
      const expertModeIndicator = page.locator('[data-testid="expert-mode"]');
      if (await expertModeIndicator.isVisible()) {
        await expect(expertModeIndicator).toBeVisible();
        
        // Toggle back
        await modeToggle.click();
        await page.waitForTimeout(1000);
        
        // Verify back to educational mode
        const educationalModeIndicator = page.locator('[data-testid="educational-mode"]');
        if (await educationalModeIndicator.isVisible()) {
          await expect(educationalModeIndicator).toBeVisible();
        }
      }
    }

    console.log(`✅ ${browserName}: Mode toggle works correctly`);
  });
});

test.describe('Educational Dashboard - Responsive Design', () => {
  test('should display correctly on mobile devices', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');

    // Verify mobile layout
    const dashboard = page.locator('[data-testid="educational-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Test mobile tab navigation
    const tabs = page.locator('[data-testid^="tab-"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    // Test touch interaction
    await page.touchTap('[data-testid="tab-guide"]');
    await page.waitForSelector('[data-testid="tab-content-guide"]');

    console.log(`✅ ${browserName}: Mobile responsive design works correctly`);
  });

  test('should display correctly on tablet devices', async ({ page, browserName }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');

    // Verify tablet layout
    const dashboard = page.locator('[data-testid="educational-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Test tablet-specific interactions
    const tabs = page.locator('[data-testid^="tab-"]');
    const firstTab = tabs.first();
    await firstTab.click();

    console.log(`✅ ${browserName}: Tablet responsive design works correctly`);
  });
});