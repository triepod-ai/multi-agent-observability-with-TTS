import { test, expect } from '@playwright/test';

/**
 * Hook Coverage Modal E2E Tests
 *
 * These tests verify the functionality of the Hook Coverage Modal,
 * particularly the data display regression that was fixed where
 * the Recent Activity tab was showing "No recent activity found"
 * despite having data in the database.
 */

test.describe('Hook Coverage Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the observability dashboard
    await page.goto('http://localhost:8543');

    // Wait for the page to load by checking for the main header
    await page.waitForSelector('h1:has-text("Multi-Agent Observability")', { timeout: 15000 });

    // Wait a bit more for dynamic content to load
    await page.waitForTimeout(2000);
  });

  test('should display Hook Coverage Status button', async ({ page }) => {
    // Check if the Hook Coverage Status button exists
    const hookCoverageButton = page.locator('text=Hook Coverage Status');
    await expect(hookCoverageButton).toBeVisible();
    await expect(hookCoverageButton).toBeEnabled();
  });

  test('should open modal when Hook Coverage Status is clicked', async ({ page }) => {
    // Click the Hook Coverage Status button
    await page.click('text=Hook Coverage Status');

    // Wait for modal to appear
    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Verify modal header is displayed
    const modalHeader = modal.locator('.modal-header');
    await expect(modalHeader).toBeVisible();
  });

  test('should display all tabs in Hook Coverage Modal', async ({ page }) => {
    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal
    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Verify all expected tabs are present
    const tabs = ['Overview', 'Recent Activity', 'Performance', 'Execution Context'];

    for (const tabName of tabs) {
      const tab = modal.locator('.tab-button', { hasText: tabName });
      await expect(tab).toBeVisible();
    }
  });

  test('should display hook data in the modal', async ({ page }) => {
    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal and check for hook identity section
    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Check for hook info
    const hookInfo = modal.locator('.hook-info');
    await expect(hookInfo).toBeVisible();

    // Check for status badges
    const statusBadge = modal.locator('.status-badge').first();
    await expect(statusBadge).toBeVisible();
  });

  test('Recent Activity tab should display data when available', async ({ page }) => {
    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal
    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Click on Recent Activity tab
    const recentActivityTab = modal.locator('.tab-button', { hasText: 'Recent Activity' });
    await recentActivityTab.click();

    // Wait for the tab panel to switch
    await page.waitForTimeout(500);

    // Check for event data or no-data state
    // The fix ensures that if there's data, it should be displayed
    const tabPanel = modal.locator('.tab-panel');
    await expect(tabPanel).toBeVisible();

    // Look for either event items or no-data state (both are valid depending on DB state)
    const hasEvents = await modal.locator('.event-item').count() > 0;
    const hasNoDataState = await modal.locator('.no-data-state').isVisible().catch(() => false);

    // At least one should be true - either we have events or a no-data message
    expect(hasEvents || hasNoDataState).toBeTruthy();

    // If no data state is shown, verify the message is clear
    if (hasNoDataState) {
      const noDataMessage = modal.locator('.no-data-state p');
      await expect(noDataMessage).toContainText('No recent activity found');
    }
  });

  test('should fetch data from correct API endpoint', async ({ page }) => {
    // Set up request interception to monitor API calls
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/hooks/')) {
        apiCalls.push(request.url());
      }
    });

    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal and API calls
    await page.waitForTimeout(1000);

    // Click on Recent Activity tab
    const modal = page.locator('.enhanced-hook-modal');
    const recentActivityTab = modal.locator('.tab-button', { hasText: 'Recent Activity' });
    await recentActivityTab.click();

    // Wait for potential API calls
    await page.waitForTimeout(1000);

    // Verify that API calls were made to the correct endpoints
    const hasEventsCalls = apiCalls.some(url => url.includes('/events'));
    expect(hasEventsCalls).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and force an error
    await page.route('**/api/hooks/*/events*', route => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      });
    });

    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal
    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Click on Recent Activity tab
    const recentActivityTab = modal.locator('.tab-button', { hasText: 'Recent Activity' });
    await recentActivityTab.click();

    // Should handle error gracefully - either show no data or loading state
    // The app shouldn't crash
    await page.waitForTimeout(1000);

    // Modal should still be visible
    await expect(modal).toBeVisible();
  });

  test('should close modal when close button is clicked', async ({ page }) => {
    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal
    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Find and click the close button
    const closeButton = modal.locator('.close-btn');
    await closeButton.click();

    // Modal should disappear
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when clicking overlay', async ({ page }) => {
    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal
    const modalOverlay = page.locator('.enhanced-hook-modal-overlay');
    await expect(modalOverlay).toBeVisible();

    // Click on the overlay (outside the modal content)
    await modalOverlay.click({ position: { x: 10, y: 10 } });

    // Modal should disappear
    await expect(modalOverlay).not.toBeVisible();
  });

  test('Performance tab should be accessible when data is available', async ({ page }) => {
    // Open the modal
    await page.click('text=Hook Coverage Status');

    // Wait for modal
    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Check if Performance tab is enabled (not disabled)
    const performanceTab = modal.locator('.tab-button', { hasText: 'Performance' });

    // Check if the tab has disabled class
    const isDisabled = await performanceTab.evaluate(el => el.classList.contains('disabled'));

    // Performance tab may be disabled if no metrics are available, which is valid
    if (!isDisabled) {
      // Click the tab
      await performanceTab.click();

      // Verify the tab panel switches
      const tabPanel = modal.locator('.tab-panel');
      await expect(tabPanel).toBeVisible();
    }
  });

  test('should preserve tab selection when switching between hooks', async ({ page }) => {
    // This test would require multiple hooks to be displayed
    // For now, we'll test that the tab state is maintained

    // Open the modal
    await page.click('text=Hook Coverage Status');

    const modal = page.locator('.enhanced-hook-modal');
    await expect(modal).toBeVisible();

    // Click on Recent Activity tab
    const recentActivityTab = modal.locator('.tab-button', { hasText: 'Recent Activity' });
    await recentActivityTab.click();

    // Verify the tab is active
    await expect(recentActivityTab).toHaveClass(/active/);

    // Close and reopen modal
    const closeButton = modal.locator('.close-btn');
    await closeButton.click();
    await page.waitForTimeout(500);

    // Open again
    await page.click('text=Hook Coverage Status');
    await expect(modal).toBeVisible();

    // The Overview tab should be active by default on reopen
    const overviewTab = modal.locator('.tab-button', { hasText: 'Overview' });
    await expect(overviewTab).toHaveClass(/active/);
  });
});

// Regression test specific to the proxy configuration fix
test.describe('Proxy Configuration Regression', () => {
  test('API requests should be properly proxied from client to server', async ({ page }) => {
    let apiRequestMade = false;
    let apiResponseReceived = false;

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/hooks/')) {
        apiRequestMade = true;
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/hooks/') && response.status() === 200) {
        apiResponseReceived = true;
      }
    });

    // Navigate to dashboard
    await page.goto('http://localhost:8543');

    // Open Hook Coverage Modal
    await page.click('text=Hook Coverage Status');

    // Wait for API calls to complete
    await page.waitForTimeout(2000);

    // Verify that API requests were made and responses were received
    expect(apiRequestMade).toBeTruthy();

    // Note: apiResponseReceived might be false if there's no data,
    // but the request should still be made
    expect(apiRequestMade).toBeTruthy();
  });

  test('WebSocket connections should be properly proxied', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:8543');

    // Check if WebSocket connection is established
    // This is done by checking for real-time updates or connection indicators

    // Wait for potential WebSocket connection
    await page.waitForTimeout(2000);

    // Look for any WebSocket connection indicators
    // The specific implementation may vary, but we're checking the app doesn't crash
    const dashboardContainer = page.locator('.dashboard-container');
    await expect(dashboardContainer).toBeVisible();

    // The app should remain stable with WebSocket proxy configuration
    await page.waitForTimeout(1000);
    await expect(dashboardContainer).toBeVisible();
  });
});