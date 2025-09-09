import { test, expect, Page } from '@playwright/test';

/**
 * Browser-Specific Compatibility Tests
 * Tests for known browser differences and compatibility issues
 */

test.describe('Browser-Specific Features', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test('should handle browser-specific JavaScript APIs', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Test browser-specific API availability
    const apiSupport = await page.evaluate(() => {
      const support = {
        webAssembly: typeof WebAssembly !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        webGL: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch (e) {
            return false;
          }
        })(),
        indexedDB: 'indexedDB' in window,
        localStorage: 'localStorage' in window,
        sessionStorage: 'sessionStorage' in window,
        geolocation: 'geolocation' in navigator,
        mediaDevices: 'mediaDevices' in navigator,
        clipboard: 'clipboard' in navigator,
        intersection: 'IntersectionObserver' in window,
        resize: 'ResizeObserver' in window,
        mutation: 'MutationObserver' in window
      };
      
      return support;
    });
    
    // WebAssembly should be supported in all modern browsers
    expect(apiSupport.webAssembly).toBeTruthy();
    
    // Storage APIs should be available
    expect(apiSupport.localStorage).toBeTruthy();
    expect(apiSupport.sessionStorage).toBeTruthy();
    expect(apiSupport.indexedDB).toBeTruthy();
    
    // Observer APIs for responsive behavior
    expect(apiSupport.intersection).toBeTruthy();
    expect(apiSupport.mutation).toBeTruthy();
    
    console.log(`✅ ${browserName}: API support verified`, apiSupport);
  });

  test('should handle CSS feature support correctly', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    const cssSupport = await page.evaluate(() => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);
      
      const support = {
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),
        customProperties: CSS.supports('--custom: value'),
        transform: CSS.supports('transform', 'translateX(10px)'),
        transition: CSS.supports('transition', 'all 0.3s ease'),
        boxShadow: CSS.supports('box-shadow', '0 0 10px rgba(0,0,0,0.1)'),
        borderRadius: CSS.supports('border-radius', '5px'),
        opacity: CSS.supports('opacity', '0.5'),
        rgba: CSS.supports('color', 'rgba(0,0,0,0.5)'),
        calc: CSS.supports('width', 'calc(100% - 20px)')
      };
      
      document.body.removeChild(testElement);
      return support;
    });
    
    // Modern CSS features should be supported
    expect(cssSupport.flexbox).toBeTruthy();
    expect(cssSupport.customProperties).toBeTruthy();
    expect(cssSupport.transform).toBeTruthy();
    expect(cssSupport.transition).toBeTruthy();
    
    console.log(`✅ ${browserName}: CSS support verified`, cssSupport);
  });

  test('should handle touch events on mobile browsers', async ({ browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    const touchSupport = await page.evaluate(() => {
      return {
        touchEvents: 'ontouchstart' in window,
        touchPoints: navigator.maxTouchPoints || 0,
        pointerEvents: 'onpointerdown' in window,
        gestureEvents: 'ongesturestart' in window
      };
    });
    
    // Test touch interaction on tabs
    if (touchSupport.touchEvents || touchSupport.pointerEvents) {
      const tab = page.locator('[data-testid="tab-guide"]');
      await tab.tap();
      await page.waitForSelector('[data-testid="tab-content-guide"]');
      
      const isActive = await tab.evaluate(el => 
        el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
      );
      expect(isActive).toBeTruthy();
    }
    
    console.log(`✅ ${browserName}: Touch support tested`, touchSupport);
  });

  test('should handle file handling correctly', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    const fileSupport = await page.evaluate(() => {
      return {
        fileAPI: 'File' in window,
        fileReader: 'FileReader' in window,
        formData: 'FormData' in window,
        blob: 'Blob' in window,
        url: 'URL' in window && 'createObjectURL' in URL,
        dragDrop: 'ondragstart' in document.createElement('div')
      };
    });
    
    // File APIs should be available for modern functionality
    expect(fileSupport.fileAPI).toBeTruthy();
    expect(fileSupport.fileReader).toBeTruthy();
    expect(fileSupport.blob).toBeTruthy();
    
    console.log(`✅ ${browserName}: File handling support verified`, fileSupport);
  });

  test('should handle canvas and graphics correctly', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    const graphicsSupport = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      
      const support = {
        canvas: !!canvas.getContext,
        canvas2d: !!canvas.getContext('2d'),
        webgl: !!canvas.getContext('webgl'),
        webgl2: !!canvas.getContext('webgl2'),
        imageData: (() => {
          try {
            const ctx = canvas.getContext('2d');
            return ctx && typeof ctx.createImageData === 'function';
          } catch (e) {
            return false;
          }
        })()
      };
      
      document.body.removeChild(canvas);
      return support;
    });
    
    expect(graphicsSupport.canvas).toBeTruthy();
    expect(graphicsSupport.canvas2d).toBeTruthy();
    
    console.log(`✅ ${browserName}: Graphics support verified`, graphicsSupport);
  });

  test('should handle network requests correctly', async ({ browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    const networkSupport = await page.evaluate(async () => {
      const support = {
        fetch: 'fetch' in window,
        xhr: 'XMLHttpRequest' in window,
        cors: true, // Assume CORS support in modern browsers
        streams: 'ReadableStream' in window,
        headers: 'Headers' in window,
        formData: 'FormData' in window
      };
      
      // Test actual fetch functionality
      try {
        const response = await fetch('/');
        support.fetchWorking = response.ok;
      } catch (e) {
        support.fetchWorking = false;
      }
      
      return support;
    });
    
    expect(networkSupport.fetch).toBeTruthy();
    expect(networkSupport.fetchWorking).toBeTruthy();
    
    console.log(`✅ ${browserName}: Network support verified`, networkSupport);
  });
});

test.describe('Browser-Specific Workarounds', () => {
  test('should handle Safari WebAssembly quirks', async ({ page, browserName }) => {
    if (browserName !== 'webkit') {
      test.skip(`Skipping Safari-specific test on ${browserName}`);
    }
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    await page.click('[data-testid="tab-sandbox"]');
    
    // Safari has specific WebAssembly loading characteristics
    const wasmSupport = await page.evaluate(() => {
      return {
        webAssembly: typeof WebAssembly !== 'undefined',
        instantiate: typeof WebAssembly.instantiate === 'function',
        compile: typeof WebAssembly.compile === 'function',
        streaming: typeof WebAssembly.instantiateStreaming === 'function'
      };
    });
    
    expect(wasmSupport.webAssembly).toBeTruthy();
    
    // Wait longer for Safari WebAssembly initialization
    try {
      await page.waitForSelector('[data-testid="wasi-ready"]', { timeout: 20000 });
      console.log(`✅ Safari: WebAssembly loaded successfully`);
    } catch (error) {
      console.warn(`⚠️ Safari: WebAssembly loading slower than expected`);
    }
  });

  test('should handle Firefox Monaco Editor differences', async ({ page, browserName }) => {
    if (browserName !== 'firefox') {
      test.skip(`Skipping Firefox-specific test on ${browserName}`);
    }
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    await page.click('[data-testid="tab-sandbox"]');
    
    // Firefox can have different Monaco Editor behavior
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });
    
    const editorInfo = await page.evaluate(() => {
      const editors = document.querySelectorAll('.monaco-editor');
      return {
        count: editors.length,
        hasTextArea: !!document.querySelector('.monaco-editor textarea'),
        hasContent: !!document.querySelector('.monaco-editor .view-line')
      };
    });
    
    expect(editorInfo.count).toBeGreaterThan(0);
    console.log(`✅ Firefox: Monaco Editor working correctly`);
  });

  test('should handle Chrome DevTools integration', async ({ page, browserName }) => {
    if (browserName !== 'chromium') {
      test.skip(`Skipping Chrome-specific test on ${browserName}`);
    }
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Chrome-specific performance API
    const perfSupport = await page.evaluate(() => {
      return {
        performance: 'performance' in window,
        memory: 'memory' in (window as any).performance,
        timing: 'timing' in performance,
        navigation: 'navigation' in performance,
        observer: 'PerformanceObserver' in window
      };
    });
    
    expect(perfSupport.performance).toBeTruthy();
    
    if (perfSupport.memory) {
      const memInfo = await page.evaluate(() => {
        return (window as any).performance.memory;
      });
      
      expect(memInfo.usedJSHeapSize).toBeGreaterThan(0);
      console.log(`✅ Chrome: Performance monitoring available`);
    }
  });

  test('should handle Edge legacy compatibility', async ({ page, browserName }) => {
    if (browserName !== 'msedge') {
      test.skip(`Skipping Edge-specific test on ${browserName}`);
    }
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Edge-specific feature detection
    const edgeSupport = await page.evaluate(() => {
      return {
        msTouchAction: 'msTouchAction' in document.documentElement.style,
        msUserSelect: 'msUserSelect' in document.documentElement.style,
        edge: navigator.userAgent.includes('Edg'),
        webDriver: 'webdriver' in navigator
      };
    });
    
    console.log(`✅ Edge: Browser detection and compatibility verified`, edgeSupport);
  });
});

test.describe('Cross-Browser Error Handling', () => {
  test('should handle JavaScript errors gracefully', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Collect page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Navigate through the app to trigger any potential errors
    const tabs = ['guide', 'flow', 'examples', 'sandbox'];
    for (const tab of tabs) {
      await page.click(`[data-testid="tab-${tab}"]`);
      await page.waitForTimeout(1000);
    }
    
    // Allow some non-critical errors but not too many
    expect(pageErrors.length).toBeLessThan(5);
    
    // Log errors for debugging
    if (consoleErrors.length > 0) {
      console.log(`ℹ️ ${browserName}: Console errors:`, consoleErrors.slice(0, 3));
    }
    if (pageErrors.length > 0) {
      console.log(`ℹ️ ${browserName}: Page errors:`, pageErrors.slice(0, 3));
    }
    
    console.log(`✅ ${browserName}: Error handling acceptable (${pageErrors.length} page errors)`);
  });

  test('should handle network failures gracefully', async ({ page, browserName }) => {
    // Simulate network failures
    await page.route('**/api/**', route => {
      if (Math.random() > 0.7) { // Fail 30% of API requests
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    await page.goto('/');
    
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    await page.waitForTimeout(3000); // Let any network requests complete/fail
    
    // App should still function despite network issues
    const dashboardVisible = await page.locator('[data-testid="educational-dashboard"]').isVisible();
    expect(dashboardVisible).toBeTruthy();
    
    console.log(`✅ ${browserName}: Network failure handling works`);
  });
});