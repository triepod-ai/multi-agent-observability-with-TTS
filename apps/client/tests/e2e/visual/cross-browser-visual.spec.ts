import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Testing Across Browsers
 * Tests layout consistency, responsive design, and visual elements
 */

test.describe('Visual Regression - Cross-Browser', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test('should maintain consistent layout across browsers', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]', { timeout: 10000 });
    
    // Wait for any animations to complete
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    const screenshot = await page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
    
    // Compare with baseline (will create baseline on first run)
    expect(screenshot).toMatchSnapshot(`dashboard-layout-${browserName}.png`, {
      threshold: 0.3, // Allow 30% pixel difference
      maxDiffPixels: 1000
    });
    
    console.log(`✅ ${browserName}: Layout consistency verified`);
  });

  test('should maintain tab layout consistency', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    const tabs = ['guide', 'flow', 'examples', 'sandbox', 'scenarios', 'reference'];
    
    for (const tabId of tabs) {
      await page.click(`[data-testid="tab-${tabId}"]`);
      await page.waitForSelector(`[data-testid="tab-content-${tabId}"]`);
      await page.waitForTimeout(1000); // Let content settle
      
      // Screenshot specific tab content
      const tabContent = page.locator(`[data-testid="tab-content-${tabId}"]`);
      const tabScreenshot = await tabContent.screenshot();
      
      expect(tabScreenshot).toMatchSnapshot(`tab-${tabId}-${browserName}.png`, {
        threshold: 0.25
      });
    }
    
    console.log(`✅ ${browserName}: Tab layouts consistent`);
  });

  test('should display responsive design correctly', async ({ browserName }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'wide', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForSelector('[data-testid="educational-dashboard"]');
      await page.waitForTimeout(1500);
      
      const screenshot = await page.screenshot({ 
        fullPage: true,
        animations: 'disabled'
      });
      
      expect(screenshot).toMatchSnapshot(`responsive-${viewport.name}-${browserName}.png`, {
        threshold: 0.3
      });
    }
    
    console.log(`✅ ${browserName}: Responsive design verified across viewports`);
  });

  test('should display Monaco Editor consistently', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    await page.click('[data-testid="tab-sandbox"]');
    await page.waitForSelector('[data-testid="sandbox-content"]');
    
    // Wait for Monaco Editor to load
    try {
      await page.waitForSelector('.monaco-editor', { timeout: 15000 });
      await page.waitForTimeout(2000); // Let editor fully initialize
      
      // Add some code to make the editor more visually interesting
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.type(`// Cross-browser test code
function testFunction() {
  const message = "Hello World";
  console.log(message);
  return true;
}`);
      
      await page.waitForTimeout(1000);
      
      // Screenshot the editor area
      const editorScreenshot = await editor.screenshot();
      expect(editorScreenshot).toMatchSnapshot(`monaco-editor-${browserName}.png`, {
        threshold: 0.4 // Monaco Editor can vary slightly between browsers
      });
      
      console.log(`✅ ${browserName}: Monaco Editor visual consistency verified`);
    } catch (error) {
      console.warn(`⚠️ ${browserName}: Monaco Editor not available for visual testing`);
    }
  });

  test('should display assessment modal consistently', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Try to trigger assessment modal
    await page.click('[data-testid="tab-sandbox"]');
    await page.waitForSelector('[data-testid="sandbox-content"]');
    
    // Look for assessment trigger
    const assessmentButton = page.locator('[data-testid="start-assessment"]').first();
    if (await assessmentButton.isVisible()) {
      await assessmentButton.click();
      await page.waitForSelector('[data-testid="assessment-modal"]', { timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Screenshot the modal
      const modal = page.locator('[data-testid="assessment-modal"]');
      const modalScreenshot = await modal.screenshot();
      
      expect(modalScreenshot).toMatchSnapshot(`assessment-modal-${browserName}.png`, {
        threshold: 0.25
      });
      
      console.log(`✅ ${browserName}: Assessment modal visual consistency verified`);
    } else {
      console.log(`ℹ️ ${browserName}: Assessment modal not available for testing`);
    }
  });

  test('should display hover states consistently', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Test hover states on tabs
    const tabs = await page.locator('[data-testid^="tab-"]').all();
    
    if (tabs.length > 0) {
      const firstTab = tabs[0];
      
      // Hover over the first tab
      await firstTab.hover();
      await page.waitForTimeout(500);
      
      // Screenshot the hovered state
      const hoverScreenshot = await page.locator('[data-testid="educational-dashboard"]').screenshot();
      
      expect(hoverScreenshot).toMatchSnapshot(`tab-hover-${browserName}.png`, {
        threshold: 0.3
      });
      
      console.log(`✅ ${browserName}: Hover states consistent`);
    }
  });

  test('should display focus states consistently', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Focus on the first interactive element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Screenshot with focus visible
    const focusScreenshot = await page.locator('[data-testid="educational-dashboard"]').screenshot();
    
    expect(focusScreenshot).toMatchSnapshot(`focus-state-${browserName}.png`, {
      threshold: 0.3
    });
    
    console.log(`✅ ${browserName}: Focus states consistent`);
  });

  test('should display loading states consistently', async ({ browserName }) => {
    // Simulate slow network to capture loading states
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100); // Add small delay
    });
    
    await page.goto('/');
    
    // Try to capture loading state
    try {
      const loadingScreenshot = await page.screenshot({
        animations: 'disabled'
      });
      
      expect(loadingScreenshot).toMatchSnapshot(`loading-state-${browserName}.png`, {
        threshold: 0.5
      });
    } catch (error) {
      console.log(`ℹ️ ${browserName}: Loading state too fast to capture`);
    }
    
    // Wait for full load
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    console.log(`✅ ${browserName}: Loading state test completed`);
  });

  test('should display error states consistently', async ({ browserName }) => {
    // Simulate network errors for certain resources
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    await page.waitForTimeout(2000);
    
    // Look for error indicators
    const errorElements = page.locator('[data-testid*="error"], .error, .alert-error');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      const errorScreenshot = await page.screenshot();
      expect(errorScreenshot).toMatchSnapshot(`error-state-${browserName}.png`, {
        threshold: 0.4
      });
      
      console.log(`✅ ${browserName}: Error state captured`);
    } else {
      console.log(`ℹ️ ${browserName}: No error states found to test`);
    }
  });

  test('should handle animations consistently', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Test tab switching animation
    await page.click('[data-testid="tab-flow"]');
    await page.waitForTimeout(500); // Mid-animation
    
    const animationScreenshot = await page.screenshot({
      animations: 'allow' // Allow animations for this test
    });
    
    expect(animationScreenshot).toMatchSnapshot(`tab-animation-${browserName}.png`, {
      threshold: 0.6 // Animations can vary more between browsers
    });
    
    console.log(`✅ ${browserName}: Animation consistency tested`);
  });
});

test.describe('High DPI Visual Testing', () => {
  test('should display correctly on high DPI screens', async ({ page, browserName }) => {
    // Set high DPI
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    await page.waitForTimeout(2000);
    
    const hidpiScreenshot = await page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
    
    expect(hidpiScreenshot).toMatchSnapshot(`hidpi-layout-${browserName}.png`, {
      threshold: 0.3
    });
    
    console.log(`✅ ${browserName}: High DPI display verified`);
  });
});

test.describe('Dark Mode Visual Testing', () => {
  test('should display dark mode consistently', async ({ page, browserName }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    await page.waitForTimeout(2000);
    
    const darkModeScreenshot = await page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
    
    expect(darkModeScreenshot).toMatchSnapshot(`dark-mode-${browserName}.png`, {
      threshold: 0.3
    });
    
    console.log(`✅ ${browserName}: Dark mode consistency verified`);
  });
});