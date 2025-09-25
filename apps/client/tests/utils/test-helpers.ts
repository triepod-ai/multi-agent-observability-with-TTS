import { Page, expect, Locator } from '@playwright/test';

/**
 * Cross-Browser Test Utilities
 * Common helpers for cross-browser testing
 */

export interface BrowserPerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  memoryUsage?: number;
}

export interface AccessibilityViolation {
  id: string;
  description: string;
  impact: string;
  tags: string[];
  nodes: Array<{ target: string[]; html: string }>;
}

/**
 * Enable educational mode by clicking the toggle button
 */
export async function enableEducationalMode(page: Page): Promise<void> {
  try {
    const educationalToggle = page.locator('[title="Switch to Educational Mode"]');
    if (await educationalToggle.isVisible()) {
      await educationalToggle.click();
      // Wait a moment for the toggle to take effect
      await page.waitForTimeout(500);
    }
  } catch (error) {
    console.warn('Could not enable educational mode:', error);
  }
}

/**
 * Enable educational mode and wait for dashboard to be fully loaded
 */
export async function waitForDashboardReady(page: Page, timeout: number = 10000): Promise<void> {
  // First ensure we're in educational mode by clicking the toggle if not already enabled
  try {
    const educationalToggle = page.locator('[title="Switch to Educational Mode"]');
    if (await educationalToggle.isVisible()) {
      await educationalToggle.click();
    }
  } catch {
    // Toggle might not be visible or educational mode already enabled
  }

  await page.waitForSelector('[data-testid="educational-dashboard"]', { timeout });

  // Wait for any initial loading states to complete
  try {
    await page.waitForSelector('[data-testid="loading"]', { state: 'detached', timeout: 3000 });
  } catch {
    // Loading indicator might not exist, that's ok
  }

  // Ensure main content is visible
  await page.waitForSelector('[data-testid^="tab-content-"]', { timeout: 5000 });
}

/**
 * Navigate to a specific educational tab and wait for content
 */
export async function navigateToTab(page: Page, tabId: string): Promise<void> {
  await page.click(`[data-testid="tab-${tabId}"]`);
  await page.waitForSelector(`[data-testid="tab-content-${tabId}"]`, { timeout: 5000 });
  
  // Wait for tab content to settle
  await page.waitForTimeout(500);
}

/**
 * Get performance metrics for the current page
 */
export async function getPerformanceMetrics(page: Page): Promise<BrowserPerformanceMetrics> {
  return await page.evaluate(() => {
    const perf = performance;
    const timing = perf.timing;
    const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics: BrowserPerformanceMetrics = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: 0,
      firstContentfulPaint: 0
    };
    
    // Get paint timings
    const paintEntries = perf.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    });
    
    // Get memory usage if available (Chrome)
    if ('memory' in perf) {
      metrics.memoryUsage = (perf as any).memory.usedJSHeapSize;
    }
    
    return metrics;
  });
}

/**
 * Check for accessibility violations using axe-core
 */
export async function checkAccessibility(page: Page, selector?: string): Promise<AccessibilityViolation[]> {
  // Inject axe-core if not already present
  try {
    await page.addScriptTag({ url: 'https://unpkg.com/axe-core@4.8.0/axe.min.js' });
  } catch {
    // Already injected
  }
  
  const results = await page.evaluate((sel) => {
    return new Promise((resolve) => {
      const options = sel ? { include: [sel] } : {};
      // @ts-ignore
      axe.run(options, (err: any, results: any) => {
        if (err) resolve({ error: err.message });
        resolve(results);
      });
    });
  }, selector);
  
  const axeResults = results as any;
  
  if (axeResults.error) {
    throw new Error(`Accessibility scan failed: ${axeResults.error}`);
  }
  
  return axeResults.violations || [];
}

/**
 * Test Monaco Editor functionality
 */
export async function testMonacoEditor(page: Page, timeout: number = 15000): Promise<{
  loaded: boolean;
  interactive: boolean;
  hasContent: boolean;
}> {
  try {
    await page.waitForSelector('.monaco-editor', { timeout });
    
    const editor = page.locator('.monaco-editor').first();
    const loaded = await editor.isVisible();
    
    if (!loaded) {
      return { loaded: false, interactive: false, hasContent: false };
    }
    
    // Test interactivity
    await editor.click();
    await page.keyboard.type('// Test code');
    await page.waitForTimeout(500);
    
    const hasContent = await page.evaluate(() => {
      const editors = document.querySelectorAll('.monaco-editor');
      for (const editor of editors) {
        const model = (editor as any)?.monacoEditor?.getModel?.();
        if (model && model.getValue().includes('Test code')) {
          return true;
        }
      }
      return false;
    });
    
    return {
      loaded: true,
      interactive: true,
      hasContent
    };
  } catch (error) {
    return { loaded: false, interactive: false, hasContent: false };
  }
}

/**
 * Test WebAssembly functionality
 */
export async function testWebAssembly(page: Page, browserName: string): Promise<{
  supported: boolean;
  loaded: boolean;
  functional: boolean;
}> {
  const wasmSupport = await page.evaluate(() => {
    return typeof WebAssembly !== 'undefined';
  });
  
  if (!wasmSupport) {
    return { supported: false, loaded: false, functional: false };
  }
  
  try {
    // Browser-specific timeout
    const timeout = browserName === 'webkit' ? 20000 : 15000;
    
    await page.waitForSelector('[data-testid="wasi-ready"]', { timeout });
    
    // Test basic execution if available
    const executeButton = page.locator('[data-testid="execute-code"]');
    if (await executeButton.isVisible()) {
      await executeButton.click();
      await page.waitForSelector('[data-testid="execution-result"]', { timeout: 5000 });
      return { supported: true, loaded: true, functional: true };
    }
    
    return { supported: true, loaded: true, functional: false };
  } catch (error) {
    return { supported: true, loaded: false, functional: false };
  }
}

/**
 * Test responsive design at different viewports
 */
export async function testResponsiveDesign(page: Page, viewports: Array<{width: number, height: number}>): Promise<boolean> {
  // Ensure educational mode is enabled first
  await enableEducationalMode(page);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(1000); // Let layout adjust

    // Check if dashboard is still visible and functional
    const dashboardVisible = await page.locator('[data-testid="educational-dashboard"]').isVisible();
    if (!dashboardVisible) {
      return false;
    }
    
    // Test tab interaction at this viewport
    const firstTab = page.locator('[data-testid^="tab-"]').first();
    if (await firstTab.isVisible()) {
      await firstTab.click();
      await page.waitForTimeout(500);
    }
  }
  
  return true;
}

/**
 * Capture and analyze console errors
 */
export class ConsoleErrorCollector {
  private errors: string[] = [];
  private warnings: string[] = [];
  
  constructor(private page: Page) {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        this.warnings.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      this.errors.push(error.message);
    });
  }
  
  getErrors(): string[] {
    return [...this.errors];
  }
  
  getWarnings(): string[] {
    return [...this.warnings];
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  getCriticalErrors(): string[] {
    return this.errors.filter(error => 
      error.toLowerCase().includes('uncaught') ||
      error.toLowerCase().includes('syntax') ||
      error.toLowerCase().includes('reference')
    );
  }
  
  reset(): void {
    this.errors = [];
    this.warnings = [];
  }
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(page: Page): Promise<{
  focusableElements: number;
  successfulNavigations: number;
  hasVisibleFocus: boolean;
}> {
  let focusableElements = 0;
  let successfulNavigations = 0;
  let hasVisibleFocus = false;
  
  // Count focusable elements
  focusableElements = await page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
  
  // Test tab navigation
  for (let i = 0; i < Math.min(focusableElements, 10); i++) {
    await page.keyboard.press('Tab');
    
    const activeElement = await page.evaluate(() => {
      const active = document.activeElement;
      return active ? {
        tagName: active.tagName,
        hasVisibleFocus: window.getComputedStyle(active).outline !== 'none' ||
                         window.getComputedStyle(active).boxShadow !== 'none'
      } : null;
    });
    
    if (activeElement) {
      successfulNavigations++;
      if (activeElement.hasVisibleFocus) {
        hasVisibleFocus = true;
      }
    }
  }
  
  return { focusableElements, successfulNavigations, hasVisibleFocus };
}

/**
 * Browser-specific test configuration
 */
export const BrowserConfig = {
  getTimeout: (browserName: string, operation: 'load' | 'wasm' | 'editor'): number => {
    const timeouts = {
      webkit: { load: 15000, wasm: 25000, editor: 20000 },
      firefox: { load: 12000, wasm: 18000, editor: 15000 },
      chromium: { load: 10000, wasm: 15000, editor: 10000 },
      msedge: { load: 10000, wasm: 15000, editor: 10000 }
    };
    
    return timeouts[browserName as keyof typeof timeouts]?.[operation] || 10000;
  },
  
  getThreshold: (browserName: string, metric: 'performance' | 'memory' | 'errors'): number => {
    const thresholds = {
      webkit: { performance: 5000, memory: 50 * 1024 * 1024, errors: 3 },
      firefox: { performance: 4000, memory: 40 * 1024 * 1024, errors: 2 },
      chromium: { performance: 3000, memory: 30 * 1024 * 1024, errors: 2 },
      msedge: { performance: 3000, memory: 30 * 1024 * 1024, errors: 2 }
    };
    
    return thresholds[browserName as keyof typeof thresholds]?.[metric] || 3000;
  }
};

/**
 * Visual testing utilities
 */
export async function compareVisuals(
  page: Page, 
  name: string, 
  browserName: string, 
  options: { threshold?: number; fullPage?: boolean } = {}
): Promise<void> {
  const { threshold = 0.3, fullPage = false } = options;
  
  // Wait for any animations to settle
  await page.waitForTimeout(1000);
  
  const screenshot = await page.screenshot({ 
    fullPage,
    animations: 'disabled'
  });
  
  expect(screenshot).toMatchSnapshot(`${name}-${browserName}.png`, {
    threshold,
    maxDiffPixels: 1000
  });
}

/**
 * Network condition simulation
 */
export async function simulateNetworkConditions(
  page: Page, 
  condition: 'slow' | 'fast' | 'offline' | 'unstable'
): Promise<void> {
  switch (condition) {
    case 'slow':
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 200);
      });
      break;
      
    case 'offline':
      await page.route('**/*', route => {
        route.abort('failed');
      });
      break;
      
    case 'unstable':
      await page.route('**/*', route => {
        if (Math.random() > 0.8) {
          route.abort('failed');
        } else {
          setTimeout(() => route.continue(), Math.random() * 1000);
        }
      });
      break;
      
    case 'fast':
    default:
      // No modification - use normal network
      break;
  }
}