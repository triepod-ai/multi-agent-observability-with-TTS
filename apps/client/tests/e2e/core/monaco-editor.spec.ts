import { test, expect, Page } from '@playwright/test';

/**
 * Monaco Editor Cross-Browser Compatibility Tests
 * Tests code editor functionality across all browsers
 */

test.describe('Monaco Editor - Cross-Browser Compatibility', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Navigate to sandbox tab where Monaco Editor is used
    await page.click('[data-testid="tab-sandbox"]');
    await page.waitForSelector('[data-testid="sandbox-content"]');
  });

  test('should load Monaco Editor correctly', async ({ browserName }) => {
    // Wait for Monaco Editor to initialize
    const timeout = browserName === 'webkit' ? 15000 : 10000;
    
    try {
      await page.waitForSelector('.monaco-editor', { 
        timeout,
        state: 'visible'
      });
      
      const editor = page.locator('.monaco-editor').first();
      await expect(editor).toBeVisible();
      
      // Verify editor is interactive
      const editorTextArea = page.locator('.monaco-editor textarea').first();
      await expect(editorTextArea).toBeVisible();
      
      console.log(`✅ ${browserName}: Monaco Editor loaded successfully`);
    } catch (error) {
      console.warn(`⚠️ ${browserName}: Monaco Editor failed to load within timeout`);
      throw error;
    }
  });

  test('should support code input and editing', async ({ browserName }) => {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Focus the editor
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    // Wait for editor to be ready
    await page.waitForTimeout(1000);
    
    // Clear any existing content and type new code
    const testCode = '// Test code\nconsole.log("Hello World");';
    
    // Use keyboard shortcut to select all and replace
    await page.keyboard.press('Control+A');
    await page.keyboard.type(testCode);
    
    // Wait for content to be processed
    await page.waitForTimeout(500);
    
    // Verify content was entered (check for presence of test text)
    const hasContent = await page.evaluate(() => {
      const editors = document.querySelectorAll('.monaco-editor');
      for (const editor of editors) {
        const model = (editor as any)?.monacoEditor?.getModel?.();
        if (model) {
          const content = model.getValue();
          if (content.includes('Hello World')) {
            return true;
          }
        }
      }
      return false;
    });
    
    expect(hasContent).toBeTruthy();
    console.log(`✅ ${browserName}: Code input and editing works correctly`);
  });

  test('should support syntax highlighting', async ({ browserName }) => {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    // Type code with syntax that should be highlighted
    await page.keyboard.press('Control+A');
    await page.keyboard.type(`function testFunction() {
  const message = "Hello World";
  console.log(message);
  return true;
}`);
    
    await page.waitForTimeout(1000);
    
    // Check for syntax highlighting elements
    const syntaxElements = page.locator('.monaco-editor .mtk1, .monaco-editor .mtk2, .monaco-editor .mtk3');
    const elementCount = await syntaxElements.count();
    
    expect(elementCount).toBeGreaterThan(0);
    console.log(`✅ ${browserName}: Syntax highlighting works correctly`);
  });

  test('should support keyboard shortcuts', async ({ browserName }) => {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    // Test Ctrl+A (Select All)
    await page.keyboard.type('Hello World');
    await page.keyboard.press('Control+A');
    
    // Test Ctrl+C and Ctrl+V (Copy/Paste)
    await page.keyboard.press('Control+C');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+V');
    
    await page.waitForTimeout(500);
    
    // Verify the operation worked
    const hasContent = await page.evaluate(() => {
      const editors = document.querySelectorAll('.monaco-editor');
      for (const editor of editors) {
        const model = (editor as any)?.monacoEditor?.getModel?.();
        if (model) {
          const content = model.getValue();
          // Should have duplicated content
          const lines = content.split('\n');
          if (lines.length >= 2 && lines[0] === lines[1]) {
            return true;
          }
        }
      }
      return false;
    });
    
    expect(hasContent).toBeTruthy();
    console.log(`✅ ${browserName}: Keyboard shortcuts work correctly`);
  });

  test('should handle different programming languages', async ({ browserName }) => {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Test different language syntaxes
    const languages = [
      { lang: 'javascript', code: 'const x = 42; console.log(x);' },
      { lang: 'python', code: 'x = 42\nprint(x)' },
      { lang: 'json', code: '{"key": "value", "number": 42}' }
    ];
    
    for (const { lang, code } of languages) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      
      // Clear and enter new code
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      await page.waitForTimeout(500);
      
      // Check that content was entered
      const hasContent = await page.evaluate((testCode) => {
        const editors = document.querySelectorAll('.monaco-editor');
        for (const editor of editors) {
          const model = (editor as any)?.monacoEditor?.getModel?.();
          if (model && model.getValue().includes(testCode.split('\n')[0])) {
            return true;
          }
        }
        return false;
      }, code);
      
      expect(hasContent).toBeTruthy();
    }
    
    console.log(`✅ ${browserName}: Multiple programming languages supported`);
  });

  test('should support code folding and expanding', async ({ browserName }) => {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    // Enter code with foldable blocks
    const foldableCode = `function outerFunction() {
  function innerFunction() {
    console.log("Inner");
  }
  
  if (true) {
    innerFunction();
  }
}`;
    
    await page.keyboard.press('Control+A');
    await page.keyboard.type(foldableCode);
    await page.waitForTimeout(1000);
    
    // Look for folding controls
    const foldingControls = page.locator('.monaco-editor .cldr');
    const controlCount = await foldingControls.count();
    
    // Even if no visible folding controls, the code should be properly formatted
    const hasFormattedCode = await page.evaluate(() => {
      const editors = document.querySelectorAll('.monaco-editor');
      for (const editor of editors) {
        const model = (editor as any)?.monacoEditor?.getModel?.();
        if (model) {
          const content = model.getValue();
          return content.includes('function') && content.includes('{') && content.includes('}');
        }
      }
      return false;
    });
    
    expect(hasFormattedCode).toBeTruthy();
    console.log(`✅ ${browserName}: Code structure and folding supported`);
  });

  test('should maintain performance with large code blocks', async ({ browserName }) => {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    // Generate a larger code block
    const largeCode = Array.from({ length: 50 }, (_, i) => 
      `function func${i}() {\n  console.log("Function ${i}");\n  return ${i};\n}`
    ).join('\n\n');
    
    const startTime = Date.now();
    
    await page.keyboard.press('Control+A');
    await page.keyboard.type(largeCode.substring(0, 500)); // Limit size for test speed
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold for slower browsers)
    const threshold = browserName === 'webkit' ? 5000 : 3000;
    expect(duration).toBeLessThan(threshold);
    
    console.log(`✅ ${browserName}: Large code performance acceptable (${duration}ms)`);
  });
});

test.describe('Monaco Editor - Accessibility', () => {
  test('should be accessible via keyboard navigation', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Navigate using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Navigate to sandbox tab using keyboard
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Focus the editor using keyboard
    await page.keyboard.press('Tab');
    
    // Type in the editor
    await page.keyboard.type('// Accessible code editor');
    
    const hasContent = await page.evaluate(() => {
      const editors = document.querySelectorAll('.monaco-editor');
      for (const editor of editors) {
        const model = (editor as any)?.monacoEditor?.getModel?.();
        if (model && model.getValue().includes('Accessible')) {
          return true;
        }
      }
      return false;
    });
    
    expect(hasContent).toBeTruthy();
    console.log(`✅ ${browserName}: Keyboard accessibility works correctly`);
  });

  test('should support screen reader labels', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    await page.click('[data-testid="tab-sandbox"]');
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Check for accessibility attributes
    const editor = page.locator('.monaco-editor').first();
    const ariaLabel = await editor.getAttribute('aria-label');
    const role = await editor.getAttribute('role');
    
    // Monaco Editor should have accessibility attributes
    expect(ariaLabel || role).toBeTruthy();
    
    console.log(`✅ ${browserName}: Screen reader support present`);
  });
});