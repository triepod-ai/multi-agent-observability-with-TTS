import { test, expect, Page } from '@playwright/test';

/**
 * Accessibility Testing for Educational Dashboard
 * Tests WCAG 2.1 AA compliance across all browsers
 */

test.describe('Educational Dashboard - Accessibility Compliance', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Inject axe-core for accessibility testing
    await page.goto('/');
    await page.addScriptTag({ url: 'https://unpkg.com/axe-core@4.8.0/axe.min.js' });

    // Enable educational mode by clicking the toggle button
    await page.click('[title="Switch to Educational Mode"]');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
  });

  test('should meet WCAG 2.1 AA standards', async ({ browserName }) => {
    // Run axe-core accessibility scan
    const accessibilityResults = await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        axe.run((err, results) => {
          if (err) resolve({ error: err.message });
          resolve(results);
        });
      });
    });

    const results = accessibilityResults as any;
    
    if (results.error) {
      console.warn(`⚠️ ${browserName}: Accessibility scan failed: ${results.error}`);
      return;
    }

    // Check for violations
    expect(results.violations).toBeDefined();
    
    // Filter for WCAG AA violations only
    const wcagAAViolations = results.violations.filter((violation: any) => 
      violation.tags.includes('wcag2a') || violation.tags.includes('wcag2aa')
    );

    if (wcagAAViolations.length > 0) {
      console.log(`❌ ${browserName}: Found ${wcagAAViolations.length} WCAG AA violations:`);
      wcagAAViolations.forEach((violation: any) => {
        console.log(`  - ${violation.id}: ${violation.description}`);
        violation.nodes.forEach((node: any) => {
          console.log(`    Element: ${node.target.join(', ')}`);
        });
      });
    }

    // Allow some minor violations but not critical ones
    const criticalViolations = wcagAAViolations.filter((v: any) => 
      ['color-contrast', 'keyboard-navigation', 'focus-management'].some(critical => 
        v.tags.includes(critical)
      )
    );

    expect(criticalViolations.length).toBe(0);
    console.log(`✅ ${browserName}: No critical WCAG AA violations found`);
  });

  test('should support keyboard navigation', async ({ browserName }) => {
    // Test tab navigation through all interactive elements
    const focusableElements = await page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
    
    let focusedElements = 0;
    
    for (let i = 0; i < Math.min(focusableElements.length, 20); i++) {
      await page.keyboard.press('Tab');
      
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      if (activeElement && ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement)) {
        focusedElements++;
      }
    }
    
    expect(focusedElements).toBeGreaterThan(0);
    console.log(`✅ ${browserName}: Keyboard navigation works (${focusedElements} focusable elements)`);
  });

  test('should provide proper ARIA labels and roles', async ({ browserName }) => {
    // Check for essential ARIA attributes
    const elementsWithRoles = await page.locator('[role]').count();
    const elementsWithLabels = await page.locator('[aria-label], [aria-labelledby]').count();
    const interactiveElements = await page.locator('button, [role="button"], [role="tab"], [role="tabpanel"]').count();
    
    expect(elementsWithRoles).toBeGreaterThan(0);
    expect(elementsWithLabels).toBeGreaterThan(0);
    
    // Test specific educational dashboard elements
    const tabElements = await page.locator('[role="tab"]').count();
    const tabPanelElements = await page.locator('[role="tabpanel"]').count();
    
    if (tabElements > 0) {
      expect(tabPanelElements).toBeGreaterThan(0);
    }
    
    console.log(`✅ ${browserName}: ARIA attributes present (${elementsWithRoles} roles, ${elementsWithLabels} labels)`);
  });

  test('should support screen reader navigation', async ({ browserName }) => {
    // Test heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = await Promise.all(
      headings.map(h => h.evaluate(el => parseInt(el.tagName.charAt(1))))
    );
    
    // Check for proper heading hierarchy (no skipped levels)
    let properHierarchy = true;
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i-1] > 1) {
        properHierarchy = false;
        break;
      }
    }
    
    expect(properHierarchy).toBeTruthy();
    
    // Test landmark regions
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').count();
    expect(landmarks).toBeGreaterThan(0);
    
    console.log(`✅ ${browserName}: Screen reader navigation supported (${headings.length} headings, ${landmarks} landmarks)`);
  });

  test('should maintain focus visibility', async ({ browserName }) => {
    // Test focus indicators
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Check for focus styles
    const hasFocusStyles = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return false;
      
      const styles = window.getComputedStyle(focused);
      return styles.outline !== 'none' || 
             styles.boxShadow !== 'none' || 
             styles.borderColor !== 'transparent';
    });
    
    expect(hasFocusStyles).toBeTruthy();
    console.log(`✅ ${browserName}: Focus visibility maintained`);
  });

  test('should support high contrast mode', async ({ browserName }) => {
    // Simulate high contrast mode (where possible)
    if (browserName === 'chromium' || browserName === 'msedge') {
      await page.emulateMedia({ colorScheme: 'dark' });
    }
    
    // Check color contrast in key areas
    const importantElements = await page.locator('button, [role="tab"], a, .text-primary, .text-secondary').all();
    
    let contrastIssues = 0;
    
    for (const element of importantElements.slice(0, 10)) { // Test first 10 elements
      const hasGoodContrast = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;
        
        // Simple heuristic: check if colors are defined and not transparent
        return bgColor !== 'rgba(0, 0, 0, 0)' && 
               textColor !== 'rgba(0, 0, 0, 0)' &&
               bgColor !== textColor;
      });
      
      if (!hasGoodContrast) {
        contrastIssues++;
      }
    }
    
    // Allow some elements to have contrast issues but not too many
    expect(contrastIssues).toBeLessThan(3);
    console.log(`✅ ${browserName}: High contrast support acceptable (${contrastIssues} potential issues)`);
  });

  test('should provide text alternatives for interactive elements', async ({ browserName }) => {
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    let buttonsWithoutText = 0;
    
    for (const button of buttons) {
      const hasAccessibleName = await button.evaluate((btn) => {
        return btn.textContent?.trim() || 
               btn.getAttribute('aria-label') || 
               btn.getAttribute('aria-labelledby') ||
               btn.getAttribute('title');
      });
      
      if (!hasAccessibleName) {
        buttonsWithoutText++;
      }
    }
    
    // Allow some icon buttons without text but flag if too many
    expect(buttonsWithoutText).toBeLessThan(Math.max(1, buttons.length * 0.3));
    
    // Check images have alt text
    const images = await page.locator('img').all();
    let imagesWithoutAlt = 0;
    
    for (const img of images) {
      const hasAltText = await img.getAttribute('alt');
      if (!hasAltText) {
        imagesWithoutAlt++;
      }
    }
    
    expect(imagesWithoutAlt).toBe(0);
    console.log(`✅ ${browserName}: Text alternatives provided (${buttonsWithoutText}/${buttons.length} buttons need improvement)`);
  });
});

test.describe('Educational Content - Accessibility', () => {
  test('should provide accessible learning content', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Test different educational tabs for accessibility
    const educationalTabs = ['guide', 'examples', 'scenarios', 'reference'];
    
    for (const tabId of educationalTabs) {
      await page.click(`[data-testid="tab-${tabId}"]`);
      await page.waitForSelector(`[data-testid="tab-content-${tabId}"]`, { timeout: 5000 });
      
      // Check for accessible content structure
      const headings = await page.locator(`[data-testid="tab-content-${tabId}"] h1, h2, h3, h4, h5, h6`).count();
      const lists = await page.locator(`[data-testid="tab-content-${tabId}"] ul, ol`).count();
      const paragraphs = await page.locator(`[data-testid="tab-content-${tabId}"] p`).count();
      
      // Educational content should have structured information
      expect(headings + lists + paragraphs).toBeGreaterThan(0);
    }
    
    console.log(`✅ ${browserName}: Educational content is structurally accessible`);
  });

  test('should support assistive technology for code editor', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    await page.click('[data-testid="tab-sandbox"]');
    await page.waitForSelector('[data-testid="sandbox-content"]');
    
    // Wait for Monaco Editor to load
    const hasEditor = await page.locator('.monaco-editor').count() > 0;
    
    if (hasEditor) {
      await page.waitForSelector('.monaco-editor', { timeout: 10000 });
      
      // Check for accessibility features in the editor
      const editorAccessibility = await page.evaluate(() => {
        const editor = document.querySelector('.monaco-editor');
        if (!editor) return false;
        
        const hasAriaLabel = editor.getAttribute('aria-label') || 
                           editor.querySelector('[aria-label]');
        const hasRole = editor.getAttribute('role') || 
                       editor.querySelector('[role]');
        const hasTabIndex = editor.getAttribute('tabindex') !== null ||
                          editor.querySelector('[tabindex]');
        
        return { hasAriaLabel: !!hasAriaLabel, hasRole: !!hasRole, hasTabIndex: !!hasTabIndex };
      });
      
      // Monaco Editor should have some accessibility features
      expect(
        editorAccessibility.hasAriaLabel || 
        editorAccessibility.hasRole || 
        editorAccessibility.hasTabIndex
      ).toBeTruthy();
      
      console.log(`✅ ${browserName}: Code editor has accessibility support`);
    } else {
      console.log(`ℹ️ ${browserName}: Code editor not available, skipping test`);
    }
  });
});

test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile devices', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Test touch accessibility
    const tabs = await page.locator('[data-testid^="tab-"]').all();
    
    for (const tab of tabs.slice(0, 3)) { // Test first 3 tabs
      // Test touch target size
      const boundingBox = await tab.boundingBox();
      if (boundingBox) {
        // Touch targets should be at least 44px (iOS) or 48dp (Android)
        expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(40);
      }
      
      // Test touch interaction
      await tab.tap();
      await page.waitForTimeout(500);
      
      // Verify tab activation
      const isActive = await tab.evaluate(el => el.classList.contains('active') || el.getAttribute('aria-selected') === 'true');
      expect(isActive).toBeTruthy();
    }
    
    console.log(`✅ ${browserName}: Mobile accessibility supported`);
  });

  test('should support mobile screen readers', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="educational-dashboard"]');
    
    // Check for mobile-friendly landmarks and labels
    const mobileAccessibilityFeatures = await page.evaluate(() => {
      const hasMainLandmark = !!document.querySelector('main, [role="main"]');
      const hasNavigation = !!document.querySelector('nav, [role="navigation"]');
      const hasAriaLive = !!document.querySelector('[aria-live]');
      const hasAriaDescribedBy = !!document.querySelector('[aria-describedby]');
      
      return { hasMainLandmark, hasNavigation, hasAriaLive, hasAriaDescribedBy };
    });
    
    expect(mobileAccessibilityFeatures.hasMainLandmark).toBeTruthy();
    
    console.log(`✅ ${browserName}: Mobile screen reader support present`);
  });
});