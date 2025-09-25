import { test, expect, Page } from '@playwright/test';
import { waitForDashboardReady, enableEducationalMode } from "../../utils/test-helpers";

/**
 * WebAssembly Performance Testing Across Browsers
 * Tests WASI runtime performance, memory usage, and execution speed
 */

test.describe('WebAssembly Performance - Cross-Browser', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('/');
    await waitForDashboardReady(page);
    
    // Navigate to sandbox where WebAssembly is used
    await page.click('[data-testid="tab-sandbox"]');
    await page.waitForSelector('[data-testid="sandbox-content"]');
  });

  test('should load WebAssembly runtime within performance thresholds', async ({ browserName }) => {
    const startTime = Date.now();
    
    try {
      // Wait for WebAssembly to initialize with browser-specific timeouts
      const timeout = getBrowserTimeout(browserName, 'wasm_load');
      
      await page.waitForSelector('[data-testid="wasi-ready"]', { 
        timeout,
        state: 'visible'
      });
      
      const loadTime = Date.now() - startTime;
      const threshold = getBrowserThreshold(browserName, 'wasm_load');
      
      expect(loadTime).toBeLessThan(threshold);
      console.log(`✅ ${browserName}: WASM loaded in ${loadTime}ms (threshold: ${threshold}ms)`);
      
      // Record performance metrics
      await recordPerformanceMetric(page, 'wasm_load_time', loadTime, browserName);
      
    } catch (error) {
      console.error(`❌ ${browserName}: WebAssembly failed to load within timeout`);
      throw error;
    }
  });

  test('should execute code within performance bounds', async ({ browserName }) => {
    // Wait for WASM to be ready
    await page.waitForSelector('[data-testid="wasi-ready"]', { 
      timeout: getBrowserTimeout(browserName, 'wasm_load')
    });
    
    // Test code execution performance
    const testCode = `
      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
      console.log(fibonacci(10));
    `;
    
    // Find code editor and input test code
    const editor = page.locator('.monaco-editor').first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(testCode);
    }
    
    const startTime = Date.now();
    
    // Execute the code
    const executeButton = page.locator('[data-testid="execute-code"]');
    if (await executeButton.isVisible()) {
      await executeButton.click();
      
      // Wait for execution result
      await page.waitForSelector('[data-testid="execution-result"]', {
        timeout: getBrowserTimeout(browserName, 'code_execution')
      });
      
      const executionTime = Date.now() - startTime;
      const threshold = getBrowserThreshold(browserName, 'code_execution');
      
      expect(executionTime).toBeLessThan(threshold);
      console.log(`✅ ${browserName}: Code executed in ${executionTime}ms (threshold: ${threshold}ms)`);
      
      await recordPerformanceMetric(page, 'code_execution_time', executionTime, browserName);
    } else {
      console.log(`ℹ️ ${browserName}: Code execution not available, skipping test`);
    }
  });

  test('should handle memory usage efficiently', async ({ browserName }) => {
    await page.waitForSelector('[data-testid="wasi-ready"]', { 
      timeout: getBrowserTimeout(browserName, 'wasm_load')
    });
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Execute memory-intensive operations
    const memoryTestCode = `
      // Create arrays to test memory usage
      const largeArray = new Array(1000).fill(0).map((_, i) => i);
      const result = largeArray.reduce((acc, val) => acc + val, 0);
      console.log('Sum:', result);
    `;
    
    const editor = page.locator('.monaco-editor').first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(memoryTestCode);
      
      const executeButton = page.locator('[data-testid="execute-code"]');
      if (await executeButton.isVisible()) {
        await executeButton.click();
        await page.waitForSelector('[data-testid="execution-result"]', { timeout: 5000 });
        
        // Wait a bit for memory to be allocated
        await page.waitForTimeout(1000);
        
        // Get memory usage after execution
        const finalMemory = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });
        
        if (initialMemory > 0 && finalMemory > 0) {
          const memoryIncrease = finalMemory - initialMemory;
          const threshold = getBrowserThreshold(browserName, 'memory_usage');
          
          expect(memoryIncrease).toBeLessThan(threshold);
          console.log(`✅ ${browserName}: Memory increase: ${memoryIncrease} bytes (threshold: ${threshold} bytes)`);
          
          await recordPerformanceMetric(page, 'memory_increase', memoryIncrease, browserName);
        } else {
          console.log(`ℹ️ ${browserName}: Memory API not available, skipping memory test`);
        }
      }
    }
  });

  test('should maintain responsiveness during heavy computation', async ({ browserName }) => {
    await page.waitForSelector('[data-testid="wasi-ready"]', { 
      timeout: getBrowserTimeout(browserName, 'wasm_load')
    });
    
    // Test UI responsiveness during computation
    const heavyComputationCode = `
      // Heavy computation test
      function isPrime(n) {
        if (n <= 1) return false;
        if (n <= 3) return true;
        if (n % 2 === 0 || n % 3 === 0) return false;
        
        for (let i = 5; i * i <= n; i += 6) {
          if (n % i === 0 || n % (i + 2) === 0) return false;
        }
        return true;
      }
      
      const primes = [];
      for (let i = 2; i < 1000; i++) {
        if (isPrime(i)) primes.push(i);
      }
      console.log('Found', primes.length, 'primes');
    `;
    
    const editor = page.locator('.monaco-editor').first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(heavyComputationCode);
      
      const executeButton = page.locator('[data-testid="execute-code"]');
      if (await executeButton.isVisible()) {
        // Start execution
        await executeButton.click();
        
        // Test UI responsiveness by trying to interact with other elements
        const startTime = Date.now();
        
        // Try to click on a different tab while computation is running
        const guideTab = page.locator('[data-testid="tab-guide"]');
        await guideTab.click();
        
        const responseTime = Date.now() - startTime;
        const threshold = getBrowserThreshold(browserName, 'ui_responsiveness');
        
        expect(responseTime).toBeLessThan(threshold);
        console.log(`✅ ${browserName}: UI remained responsive during computation (${responseTime}ms)`);
        
        await recordPerformanceMetric(page, 'ui_responsiveness', responseTime, browserName);
        
        // Switch back to sandbox
        await page.click('[data-testid="tab-sandbox"]');
      }
    }
  });

  test('should handle multiple WASM instances efficiently', async ({ browserName }) => {
    await page.waitForSelector('[data-testid="wasi-ready"]', { 
      timeout: getBrowserTimeout(browserName, 'wasm_load')
    });
    
    const startTime = Date.now();
    
    // Test multiple code executions
    const testCodes = [
      'console.log("Test 1:", 1 + 1);',
      'console.log("Test 2:", [1,2,3].length);',
      'console.log("Test 3:", Math.PI);'
    ];
    
    const editor = page.locator('.monaco-editor').first();
    const executeButton = page.locator('[data-testid="execute-code"]');
    
    if (await editor.isVisible() && await executeButton.isVisible()) {
      for (let i = 0; i < testCodes.length; i++) {
        await editor.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.type(testCodes[i]);
        
        await executeButton.click();
        await page.waitForSelector('[data-testid="execution-result"]', { timeout: 3000 });
        
        // Brief pause between executions
        await page.waitForTimeout(100);
      }
      
      const totalTime = Date.now() - startTime;
      const threshold = getBrowserThreshold(browserName, 'multiple_executions');
      
      expect(totalTime).toBeLessThan(threshold);
      console.log(`✅ ${browserName}: Multiple WASM executions completed in ${totalTime}ms`);
      
      await recordPerformanceMetric(page, 'multiple_executions_time', totalTime, browserName);
    }
  });
});

/**
 * Browser-specific timeout configuration
 */
function getBrowserTimeout(browserName: string, operation: string): number {
  const timeouts = {
    webkit: {
      wasm_load: 20000,
      code_execution: 8000
    },
    firefox: {
      wasm_load: 15000,
      code_execution: 6000
    },
    chromium: {
      wasm_load: 10000,
      code_execution: 4000
    },
    msedge: {
      wasm_load: 10000,
      code_execution: 4000
    }
  };
  
  return timeouts[browserName as keyof typeof timeouts]?.[operation as keyof typeof timeouts.webkit] || 10000;
}

/**
 * Browser-specific performance thresholds
 */
function getBrowserThreshold(browserName: string, metric: string): number {
  const thresholds = {
    webkit: {
      wasm_load: 18000,
      code_execution: 7000,
      memory_usage: 50 * 1024 * 1024, // 50MB
      ui_responsiveness: 2000,
      multiple_executions: 15000
    },
    firefox: {
      wasm_load: 12000,
      code_execution: 5000,
      memory_usage: 40 * 1024 * 1024, // 40MB
      ui_responsiveness: 1500,
      multiple_executions: 12000
    },
    chromium: {
      wasm_load: 8000,
      code_execution: 3000,
      memory_usage: 30 * 1024 * 1024, // 30MB
      ui_responsiveness: 1000,
      multiple_executions: 8000
    },
    msedge: {
      wasm_load: 8000,
      code_execution: 3000,
      memory_usage: 30 * 1024 * 1024, // 30MB
      ui_responsiveness: 1000,
      multiple_executions: 8000
    }
  };
  
  return thresholds[browserName as keyof typeof thresholds]?.[metric as keyof typeof thresholds.webkit] || 10000;
}

/**
 * Record performance metrics for analysis
 */
async function recordPerformanceMetric(page: Page, metric: string, value: number, browserName: string) {
  await page.evaluate(
    ({ metric, value, browserName }) => {
      // Store performance data in sessionStorage for later analysis
      const key = `perf_${metric}_${browserName}`;
      sessionStorage.setItem(key, JSON.stringify({
        metric,
        value,
        browserName,
        timestamp: Date.now()
      }));
    },
    { metric, value, browserName }
  );
}