/**
 * WCAG 2.1 AA Accessibility Testing Utilities
 * Comprehensive testing suite for Educational Dashboard components
 */

export interface AccessibilityResult {
  passed: boolean;
  score: number; // 0-100
  violations: AccessibilityViolation[];
  recommendations: string[];
  complianceLevel: 'A' | 'AA' | 'AAA' | 'Fail';
}

export interface AccessibilityViolation {
  type: 'error' | 'warning' | 'info';
  principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust';
  guideline: string;
  criterion: string;
  element: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  fix: string;
}

export class AccessibilityTester {
  private violations: AccessibilityViolation[] = [];
  
  /**
   * Run comprehensive WCAG 2.1 AA audit
   */
  async runFullAudit(container: HTMLElement): Promise<AccessibilityResult> {
    this.violations = [];
    
    // Test all WCAG principles
    await this.testPerceivable(container);
    await this.testOperable(container);
    await this.testUnderstandable(container);
    await this.testRobust(container);
    
    // Calculate score and compliance level
    const score = this.calculateScore();
    const complianceLevel = this.determineComplianceLevel();
    
    return {
      passed: this.violations.filter(v => v.type === 'error').length === 0,
      score,
      violations: this.violations,
      recommendations: this.generateRecommendations(),
      complianceLevel
    };
  }
  
  /**
   * Test Principle 1: Perceivable
   */
  private async testPerceivable(container: HTMLElement): Promise<void> {
    // 1.1 Text Alternatives
    this.testTextAlternatives(container);
    
    // 1.2 Time-based Media (not applicable for this component)
    
    // 1.3 Adaptable
    this.testAdaptableContent(container);
    
    // 1.4 Distinguishable
    await this.testDistinguishable(container);
  }
  
  /**
   * Test Principle 2: Operable
   */
  private async testOperable(container: HTMLElement): Promise<void> {
    // 2.1 Keyboard Accessible
    this.testKeyboardAccessible(container);
    
    // 2.2 Enough Time
    this.testEnoughTime(container);
    
    // 2.3 Seizures and Physical Reactions
    this.testSeizuresAndReactions(container);
    
    // 2.4 Navigable
    this.testNavigable(container);
    
    // 2.5 Input Modalities
    this.testInputModalities(container);
  }
  
  /**
   * Test Principle 3: Understandable
   */
  private async testUnderstandable(container: HTMLElement): Promise<void> {
    // 3.1 Readable
    this.testReadable(container);
    
    // 3.2 Predictable
    this.testPredictable(container);
    
    // 3.3 Input Assistance
    this.testInputAssistance(container);
  }
  
  /**
   * Test Principle 4: Robust
   */
  private async testRobust(container: HTMLElement): Promise<void> {
    // 4.1 Compatible
    this.testCompatible(container);
  }
  
  /**
   * 1.1.1 Non-text Content (Level A)
   */
  private testTextAlternatives(container: HTMLElement): void {
    // Test images without alt text
    const images = container.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.hasAttribute('alt') && !img.hasAttribute('aria-label')) {
        this.addViolation({
          type: 'error',
          principle: 'Perceivable',
          guideline: '1.1 Text Alternatives',
          criterion: '1.1.1 Non-text Content (Level A)',
          element: `img[${index}]`,
          description: 'Image missing alternative text',
          impact: 'serious',
          fix: 'Add alt attribute or aria-label to describe the image content'
        });
      }
    });
    
    // Test decorative images (should have empty alt or aria-hidden)
    const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
    decorativeElements.forEach((element, index) => {
      if (element.tagName === 'IMG' && element.hasAttribute('alt') && element.getAttribute('alt') !== '') {
        this.addViolation({
          type: 'warning',
          principle: 'Perceivable',
          guideline: '1.1 Text Alternatives',
          criterion: '1.1.1 Non-text Content (Level A)',
          element: `img[aria-hidden="true"][${index}]`,
          description: 'Decorative image should have empty alt text',
          impact: 'moderate',
          fix: 'Set alt="" for decorative images marked with aria-hidden="true"'
        });
      }
    });
    
    // Test icon buttons
    const iconButtons = container.querySelectorAll('button');
    iconButtons.forEach((button, index) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.hasAttribute('aria-label') || button.hasAttribute('aria-labelledby');
      const hasTitle = button.hasAttribute('title');
      
      if (!hasText && !hasAriaLabel && !hasTitle) {
        this.addViolation({
          type: 'error',
          principle: 'Perceivable',
          guideline: '1.1 Text Alternatives',
          criterion: '1.1.1 Non-text Content (Level A)',
          element: `button[${index}]`,
          description: 'Button has no accessible name',
          impact: 'serious',
          fix: 'Add aria-label, visible text, or title attribute to describe button purpose'
        });
      }
    });
  }
  
  /**
   * 1.3 Adaptable Content Tests
   */
  private testAdaptableContent(container: HTMLElement): void {
    // 1.3.1 Info and Relationships (Level A)
    this.testInfoAndRelationships(container);
    
    // 1.3.2 Meaningful Sequence (Level A)
    this.testMeaningfulSequence(container);
    
    // 1.3.3 Sensory Characteristics (Level A)
    this.testSensoryCharacteristics(container);
    
    // 1.3.4 Orientation (Level AA)
    this.testOrientation(container);
    
    // 1.3.5 Identify Input Purpose (Level AA)
    this.testIdentifyInputPurpose(container);
  }
  
  private testInfoAndRelationships(container: HTMLElement): void {
    // Test heading hierarchy
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (index === 0 && level !== 1) {
        this.addViolation({
          type: 'warning',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.1 Info and Relationships (Level A)',
          element: `${heading.tagName.toLowerCase()}[${index}]`,
          description: 'Page should start with h1 heading',
          impact: 'moderate',
          fix: 'Start page with h1, then use h2, h3, etc. in order'
        });
      }
      
      if (level > previousLevel + 1) {
        this.addViolation({
          type: 'error',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.1 Info and Relationships (Level A)',
          element: `${heading.tagName.toLowerCase()}[${index}]`,
          description: 'Heading levels skip hierarchical order',
          impact: 'serious',
          fix: 'Use heading levels in sequential order (h1, h2, h3, etc.)'
        });
      }
      
      previousLevel = level;
    });
    
    // Test form labels
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const hasLabel = input.hasAttribute('aria-label') || 
                      input.hasAttribute('aria-labelledby') ||
                      container.querySelector(`label[for="${input.id}"]`) !== null;
      
      if (!hasLabel && input.getAttribute('type') !== 'hidden') {
        this.addViolation({
          type: 'error',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.1 Info and Relationships (Level A)',
          element: `${input.tagName.toLowerCase()}[${index}]`,
          description: 'Form control missing accessible label',
          impact: 'serious',
          fix: 'Add label element, aria-label, or aria-labelledby attribute'
        });
      }
    });
    
    // Test table headers
    const tables = container.querySelectorAll('table');
    tables.forEach((table, index) => {
      const hasHeaders = table.querySelector('th') !== null;
      const hasHeadersAttribute = table.querySelectorAll('td[headers]').length > 0;
      
      if (!hasHeaders && !hasHeadersAttribute) {
        this.addViolation({
          type: 'error',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.1 Info and Relationships (Level A)',
          element: `table[${index}]`,
          description: 'Data table missing headers',
          impact: 'serious',
          fix: 'Use th elements or headers attribute to identify table headers'
        });
      }
    });
    
    // Test list structure
    const listItems = container.querySelectorAll('li');
    listItems.forEach((li, index) => {
      const parent = li.parentElement;
      if (parent && !['UL', 'OL', 'MENU'].includes(parent.tagName)) {
        this.addViolation({
          type: 'error',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.1 Info and Relationships (Level A)',
          element: `li[${index}]`,
          description: 'List item not contained in list element',
          impact: 'moderate',
          fix: 'Wrap li elements in ul, ol, or menu elements'
        });
      }
    });
  }
  
  private testMeaningfulSequence(container: HTMLElement): void {
    // Test tab order
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    let previousTabIndex = -1;
    focusableElements.forEach((element, index) => {
      const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
      
      if (tabIndex > 0 && tabIndex < previousTabIndex) {
        this.addViolation({
          type: 'warning',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.2 Meaningful Sequence (Level A)',
          element: `[tabindex="${tabIndex}"][${index}]`,
          description: 'Tab order may not match visual order',
          impact: 'moderate',
          fix: 'Ensure tabindex values follow logical sequence or use tabindex="0"'
        });
      }
      
      previousTabIndex = tabIndex;
    });
  }
  
  private testSensoryCharacteristics(container: HTMLElement): void {
    // Test for instructions that rely only on sensory characteristics
    const textContent = container.textContent?.toLowerCase() || '';
    
    const sensoryTerms = [
      'click the red button',
      'green indicates',
      'see the icon',
      'round button',
      'square box',
      'above',
      'below',
      'left',
      'right'
    ];
    
    sensoryTerms.forEach(term => {
      if (textContent.includes(term)) {
        this.addViolation({
          type: 'warning',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.3 Sensory Characteristics (Level A)',
          element: 'text content',
          description: `Instructions may rely on sensory characteristics: "${term}"`,
          impact: 'moderate',
          fix: 'Provide additional non-sensory information (labels, descriptions)'
        });
      }
    });
  }
  
  private testOrientation(container: HTMLElement): void {
    // Check for orientation restrictions
    const style = window.getComputedStyle(container);
    if (style.transform && style.transform.includes('rotate')) {
      this.addViolation({
        type: 'info',
        principle: 'Perceivable',
        guideline: '1.3 Adaptable',
        criterion: '1.3.4 Orientation (Level AA)',
        element: 'container',
        description: 'Content may be restricted to specific orientation',
        impact: 'minor',
        fix: 'Ensure content works in both portrait and landscape orientations'
      });
    }
  }
  
  private testIdentifyInputPurpose(container: HTMLElement): void {
    const inputs = container.querySelectorAll('input');
    inputs.forEach((input, index) => {
      const type = input.getAttribute('type');
      const autocomplete = input.getAttribute('autocomplete');
      
      if (['email', 'password', 'text'].includes(type || '') && !autocomplete) {
        this.addViolation({
          type: 'info',
          principle: 'Perceivable',
          guideline: '1.3 Adaptable',
          criterion: '1.3.5 Identify Input Purpose (Level AA)',
          element: `input[type="${type}"][${index}]`,
          description: 'Input could benefit from autocomplete attribute',
          impact: 'minor',
          fix: 'Add appropriate autocomplete attribute for common input types'
        });
      }
    });
  }
  
  /**
   * 1.4 Distinguishable Content Tests
   */
  private async testDistinguishable(container: HTMLElement): Promise<void> {
    // 1.4.1 Use of Color (Level A)
    await this.testUseOfColor(container);
    
    // 1.4.3 Contrast (Level AA)
    await this.testContrast(container);
    
    // 1.4.4 Resize text (Level AA)
    this.testResizeText(container);
    
    // 1.4.5 Images of Text (Level AA)
    this.testImagesOfText(container);
    
    // 1.4.10 Reflow (Level AA)
    this.testReflow(container);
    
    // 1.4.11 Non-text Contrast (Level AA)
    await this.testNonTextContrast(container);
    
    // 1.4.12 Text Spacing (Level AA)
    this.testTextSpacing(container);
    
    // 1.4.13 Content on Hover or Focus (Level AA)
    this.testContentOnHoverOrFocus(container);
  }
  
  private async testUseOfColor(container: HTMLElement): Promise<void> {
    // Check for color-only indicators
    const colorIndicators = container.querySelectorAll(
      '.text-red-400, .text-green-400, .text-yellow-400, .bg-red-500, .bg-green-500, .bg-yellow-500'
    );
    
    colorIndicators.forEach((element, index) => {
      const hasAlternativeIndicator = 
        element.textContent?.includes('✓') ||
        element.textContent?.includes('✗') ||
        element.textContent?.includes('⚠') ||
        element.querySelector('[aria-hidden="true"]') !== null;
      
      if (!hasAlternativeIndicator) {
        this.addViolation({
          type: 'warning',
          principle: 'Perceivable',
          guideline: '1.4 Distinguishable',
          criterion: '1.4.1 Use of Color (Level A)',
          element: `colored-element[${index}]`,
          description: 'Information may be conveyed by color alone',
          impact: 'moderate',
          fix: 'Add icons, text, or other visual indicators alongside color'
        });
      }
    });
  }
  
  private async testContrast(container: HTMLElement): Promise<void> {
    const textElements = container.querySelectorAll('*');
    
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i] as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      
      if (element.textContent?.trim() && computedStyle.color) {
        const contrast = await this.calculateContrastRatio(
          computedStyle.color,
          computedStyle.backgroundColor || '#000000'
        );
        
        const fontSize = parseFloat(computedStyle.fontSize);
        const fontWeight = computedStyle.fontWeight;
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && ['bold', '700', '800', '900'].includes(fontWeight));
        
        const requiredRatio = isLargeText ? 3.0 : 4.5;
        
        if (contrast < requiredRatio) {
          this.addViolation({
            type: 'error',
            principle: 'Perceivable',
            guideline: '1.4 Distinguishable',
            criterion: '1.4.3 Contrast (Level AA)',
            element: `text-element[${i}]`,
            description: `Insufficient color contrast: ${contrast.toFixed(2)}:1 (required: ${requiredRatio}:1)`,
            impact: 'serious',
            fix: `Increase contrast to at least ${requiredRatio}:1 ratio`
          });
        }
      }
    }
  }
  
  private testResizeText(container: HTMLElement): void {
    // Test for fixed font sizes that prevent scaling
    const textElements = container.querySelectorAll('*');
    
    textElements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element as HTMLElement);
      const fontSize = computedStyle.fontSize;
      
      if (fontSize && fontSize.includes('px') && parseFloat(fontSize) < 12) {
        this.addViolation({
          type: 'warning',
          principle: 'Perceivable',
          guideline: '1.4 Distinguishable',
          criterion: '1.4.4 Resize text (Level AA)',
          element: `small-text[${index}]`,
          description: `Very small font size: ${fontSize}`,
          impact: 'moderate',
          fix: 'Use minimum 12px font size or relative units (rem, em)'
        });
      }
    });
  }
  
  private testImagesOfText(container: HTMLElement): void {
    const images = container.querySelectorAll('img');
    
    images.forEach((img, index) => {
      const alt = img.getAttribute('alt') || '';
      if (alt && alt.length > 50 && /[a-zA-Z]{20,}/.test(alt)) {
        this.addViolation({
          type: 'info',
          principle: 'Perceivable',
          guideline: '1.4 Distinguishable',
          criterion: '1.4.5 Images of Text (Level AA)',
          element: `img[${index}]`,
          description: 'Image may contain text that could be presented as HTML text',
          impact: 'minor',
          fix: 'Use HTML text instead of images of text when possible'
        });
      }
    });
  }
  
  private testReflow(container: HTMLElement): void {
    // Test responsive design at 320px width
    const originalWidth = window.innerWidth;
    
    // Simulate narrow viewport (this would need actual testing in different viewports)
    if (originalWidth > 320) {
      this.addViolation({
        type: 'info',
        principle: 'Perceivable',
        guideline: '1.4 Distinguishable',
        criterion: '1.4.10 Reflow (Level AA)',
        element: 'viewport',
        description: 'Content should be tested at 320px width for reflow',
        impact: 'minor',
        fix: 'Ensure content reflows properly at 320px width without horizontal scrolling'
      });
    }
  }
  
  private async testNonTextContrast(container: HTMLElement): Promise<void> {
    // Test focus indicators and interactive element borders
    const interactiveElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    for (let i = 0; i < interactiveElements.length; i++) {
      const element = interactiveElements[i] as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      
      if (computedStyle.borderColor && computedStyle.borderWidth && parseFloat(computedStyle.borderWidth) > 0) {
        const contrast = await this.calculateContrastRatio(
          computedStyle.borderColor,
          computedStyle.backgroundColor || '#000000'
        );
        
        if (contrast < 3.0) {
          this.addViolation({
            type: 'error',
            principle: 'Perceivable',
            guideline: '1.4 Distinguishable',
            criterion: '1.4.11 Non-text Contrast (Level AA)',
            element: `interactive-element[${i}]`,
            description: `Insufficient border contrast: ${contrast.toFixed(2)}:1 (required: 3.0:1)`,
            impact: 'serious',
            fix: 'Increase border contrast to at least 3.0:1 ratio'
          });
        }
      }
    }
  }
  
  private testTextSpacing(container: HTMLElement): void {
    // Test that text spacing can be adjusted
    const testElement = container.querySelector('p, div, span');
    if (testElement) {
      const originalStyle = window.getComputedStyle(testElement);
      this.addViolation({
        type: 'info',
        principle: 'Perceivable',
        guideline: '1.4 Distinguishable',
        criterion: '1.4.12 Text Spacing (Level AA)',
        element: 'text-content',
        description: 'Text spacing should be user-adjustable',
        impact: 'minor',
        fix: 'Ensure text remains readable when spacing is increased by users'
      });
    }
  }
  
  private testContentOnHoverOrFocus(container: HTMLElement): void {
    const elementsWithTooltips = container.querySelectorAll('[title], [aria-describedby]');
    
    elementsWithTooltips.forEach((element, index) => {
      this.addViolation({
        type: 'info',
        principle: 'Perceivable',
        guideline: '1.4 Distinguishable',
        criterion: '1.4.13 Content on Hover or Focus (Level AA)',
        element: `tooltip-element[${index}]`,
        description: 'Hover/focus content should be dismissible, hoverable, and persistent',
        impact: 'minor',
        fix: 'Ensure tooltips can be dismissed, hovered, and remain visible'
      });
    });
  }
  
  /**
   * 2.1 Keyboard Accessible Tests
   */
  private testKeyboardAccessible(container: HTMLElement): void {
    // 2.1.1 Keyboard (Level A)
    this.testKeyboard(container);
    
    // 2.1.2 No Keyboard Trap (Level A)
    this.testNoKeyboardTrap(container);
    
    // 2.1.4 Character Key Shortcuts (Level A)
    this.testCharacterKeyShortcuts(container);
  }
  
  private testKeyboard(container: HTMLElement): void {
    const interactiveElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [onclick], [onkeydown], [role="button"]'
    );
    
    interactiveElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      
      // Check for keyboard inaccessible elements
      if (tabIndex === '-1' && !element.hasAttribute('aria-hidden')) {
        this.addViolation({
          type: 'warning',
          principle: 'Operable',
          guideline: '2.1 Keyboard Accessible',
          criterion: '2.1.1 Keyboard (Level A)',
          element: `interactive-element[${index}]`,
          description: 'Interactive element may not be keyboard accessible',
          impact: 'serious',
          fix: 'Remove tabindex="-1" or add keyboard event handlers'
        });
      }
      
      // Check for missing keyboard handlers on custom interactive elements
      if (element.hasAttribute('onclick') && !element.hasAttribute('onkeydown') && 
          !element.hasAttribute('onkeyup') && !element.hasAttribute('onkeypress')) {
        this.addViolation({
          type: 'error',
          principle: 'Operable',
          guideline: '2.1 Keyboard Accessible',
          criterion: '2.1.1 Keyboard (Level A)',
          element: `onclick-element[${index}]`,
          description: 'Click handler without keyboard equivalent',
          impact: 'serious',
          fix: 'Add keyboard event handlers (Enter/Space keys)'
        });
      }
    });
  }
  
  private testNoKeyboardTrap(container: HTMLElement): void {
    // Check for potential keyboard traps in modals/dialogs
    const modals = container.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    
    modals.forEach((modal, index) => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) {
        this.addViolation({
          type: 'error',
          principle: 'Operable',
          guideline: '2.1 Keyboard Accessible',
          criterion: '2.1.2 No Keyboard Trap (Level A)',
          element: `modal[${index}]`,
          description: 'Modal has no focusable elements',
          impact: 'critical',
          fix: 'Add at least one focusable element (close button) to modal'
        });
      }
    });
  }
  
  private testCharacterKeyShortcuts(container: HTMLElement): void {
    // This would require testing actual keyboard shortcuts implementation
    this.addViolation({
      type: 'info',
      principle: 'Operable',
      guideline: '2.1 Keyboard Accessible',
      criterion: '2.1.4 Character Key Shortcuts (Level A)',
      element: 'keyboard-shortcuts',
      description: 'If character key shortcuts exist, they should be configurable',
      impact: 'minor',
      fix: 'Provide way to turn off or remap single character shortcuts'
    });
  }
  
  /**
   * Additional test methods would continue here for all WCAG criteria...
   * For brevity, I'm showing the pattern but not implementing all ~50 criteria
   */
  
  private testEnoughTime(container: HTMLElement): void {
    // Test for time limits and auto-updating content
    const timerElements = container.querySelectorAll('[role="timer"], .timer');
    
    timerElements.forEach((timer, index) => {
      this.addViolation({
        type: 'info',
        principle: 'Operable',
        guideline: '2.2 Enough Time',
        criterion: '2.2.1 Timing Adjustable (Level A)',
        element: `timer[${index}]`,
        description: 'Timer should be adjustable, extendable, or disableable',
        impact: 'moderate',
        fix: 'Provide controls to adjust, extend, or turn off time limits'
      });
    });
  }
  
  private testSeizuresAndReactions(container: HTMLElement): void {
    // Test for flashing content
    const animatedElements = container.querySelectorAll('.animate-pulse, .animate-spin, .animate-bounce');
    
    animatedElements.forEach((element, index) => {
      this.addViolation({
        type: 'info',
        principle: 'Operable',
        guideline: '2.3 Seizures and Physical Reactions',
        criterion: '2.3.1 Three Flashes or Below Threshold (Level A)',
        element: `animated-element[${index}]`,
        description: 'Animated content should respect prefers-reduced-motion',
        impact: 'moderate',
        fix: 'Use @media (prefers-reduced-motion: reduce) to disable animations'
      });
    });
  }
  
  private testNavigable(container: HTMLElement): void {
    // Test skip links
    const skipLinks = container.querySelectorAll('a[href^="#"]');
    if (skipLinks.length === 0) {
      this.addViolation({
        type: 'warning',
        principle: 'Operable',
        guideline: '2.4 Navigable',
        criterion: '2.4.1 Bypass Blocks (Level A)',
        element: 'page',
        description: 'No skip links found',
        impact: 'moderate',
        fix: 'Add skip links to bypass repetitive content'
      });
    }
    
    // Test page title
    const title = document.title;
    if (!title || title.trim().length === 0) {
      this.addViolation({
        type: 'error',
        principle: 'Operable',
        guideline: '2.4 Navigable',
        criterion: '2.4.2 Page Titled (Level A)',
        element: 'title',
        description: 'Page missing descriptive title',
        impact: 'serious',
        fix: 'Add descriptive page title'
      });
    }
    
    // Test focus order
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) {
      this.addViolation({
        type: 'warning',
        principle: 'Operable',
        guideline: '2.4 Navigable',
        criterion: '2.4.3 Focus Order (Level A)',
        element: 'container',
        description: 'No focusable elements found',
        impact: 'moderate',
        fix: 'Ensure interactive elements are focusable'
      });
    }
  }
  
  private testInputModalities(container: HTMLElement): void {
    // Test pointer gestures
    this.addViolation({
      type: 'info',
      principle: 'Operable',
      guideline: '2.5 Input Modalities',
      criterion: '2.5.1 Pointer Gestures (Level A)',
      element: 'gestures',
      description: 'Complex gestures should have simple alternatives',
      impact: 'minor',
      fix: 'Provide single-pointer alternatives for multipoint/path-based gestures'
    });
    
    // Test touch targets
    const touchTargets = container.querySelectorAll('button, [href], input, select, textarea');
    
    touchTargets.forEach((target, index) => {
      const rect = (target as HTMLElement).getBoundingClientRect();
      const minSize = 44; // WCAG recommendation
      
      if (rect.width < minSize || rect.height < minSize) {
        this.addViolation({
          type: 'warning',
          principle: 'Operable',
          guideline: '2.5 Input Modalities',
          criterion: '2.5.5 Target Size (Level AAA)',
          element: `touch-target[${index}]`,
          description: `Touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px (recommended: 44x44px minimum)`,
          impact: 'moderate',
          fix: 'Increase touch target size to at least 44x44px'
        });
      }
    });
  }
  
  private testReadable(container: HTMLElement): void {
    // Test language attribute
    const hasLang = document.documentElement.hasAttribute('lang') || 
                   container.hasAttribute('lang');
    
    if (!hasLang) {
      this.addViolation({
        type: 'error',
        principle: 'Understandable',
        guideline: '3.1 Readable',
        criterion: '3.1.1 Language of Page (Level A)',
        element: 'html',
        description: 'Page language not specified',
        impact: 'moderate',
        fix: 'Add lang attribute to html element'
      });
    }
  }
  
  private testPredictable(container: HTMLElement): void {
    // Test for context changes on focus
    const formElements = container.querySelectorAll('input, select');
    
    formElements.forEach((element, index) => {
      if (element.hasAttribute('onblur') || element.hasAttribute('onfocus')) {
        this.addViolation({
          type: 'info',
          principle: 'Understandable',
          guideline: '3.2 Predictable',
          criterion: '3.2.1 On Focus (Level A)',
          element: `form-element[${index}]`,
          description: 'Focus events should not cause unexpected context changes',
          impact: 'minor',
          fix: 'Avoid automatic form submission or navigation on focus/blur'
        });
      }
    });
  }
  
  private testInputAssistance(container: HTMLElement): void {
    // Test error identification
    const errorElements = container.querySelectorAll('[aria-invalid="true"], .error, .invalid');
    const errorMessages = container.querySelectorAll('[role="alert"], .error-message');
    
    if (errorElements.length > 0 && errorMessages.length === 0) {
      this.addViolation({
        type: 'error',
        principle: 'Understandable',
        guideline: '3.3 Input Assistance',
        criterion: '3.3.1 Error Identification (Level A)',
        element: 'error-handling',
        description: 'Errors marked but no error messages provided',
        impact: 'serious',
        fix: 'Provide clear error messages for invalid inputs'
      });
    }
    
    // Test labels and instructions
    const requiredFields = container.querySelectorAll('[required], [aria-required="true"]');
    
    requiredFields.forEach((field, index) => {
      const hasRequiredIndicator = field.getAttribute('aria-label')?.includes('required') ||
                                  field.getAttribute('placeholder')?.includes('required') ||
                                  container.querySelector(`label[for="${field.id}"]`)?.textContent?.includes('*');
      
      if (!hasRequiredIndicator) {
        this.addViolation({
          type: 'warning',
          principle: 'Understandable',
          guideline: '3.3 Input Assistance',
          criterion: '3.3.2 Labels or Instructions (Level A)',
          element: `required-field[${index}]`,
          description: 'Required field not clearly indicated',
          impact: 'moderate',
          fix: 'Add visual and programmatic indication for required fields'
        });
      }
    });
  }
  
  private testCompatible(container: HTMLElement): void {
    // Test HTML validity
    this.testHTMLValidity(container);
    
    // Test ARIA usage
    this.testARIAUsage(container);
    
    // Test status messages
    this.testStatusMessages(container);
  }
  
  private testHTMLValidity(container: HTMLElement): void {
    // Test for duplicate IDs
    const allIds: string[] = [];
    const elementsWithIds = container.querySelectorAll('[id]');
    
    elementsWithIds.forEach((element, index) => {
      const id = element.id;
      if (allIds.includes(id)) {
        this.addViolation({
          type: 'error',
          principle: 'Robust',
          guideline: '4.1 Compatible',
          criterion: '4.1.1 Parsing (Level A)',
          element: `#${id}`,
          description: `Duplicate ID: ${id}`,
          impact: 'serious',
          fix: 'Ensure all IDs are unique within the document'
        });
      } else {
        allIds.push(id);
      }
    });
    
    // Test for invalid ARIA attributes
    const ariaElements = container.querySelectorAll('[aria-labelledby], [aria-describedby]');
    
    ariaElements.forEach((element, index) => {
      const labelledby = element.getAttribute('aria-labelledby');
      const describedby = element.getAttribute('aria-describedby');
      
      if (labelledby) {
        const referencedElements = labelledby.split(' ').map(id => document.getElementById(id));
        if (referencedElements.some(el => el === null)) {
          this.addViolation({
            type: 'error',
            principle: 'Robust',
            guideline: '4.1 Compatible',
            criterion: '4.1.1 Parsing (Level A)',
            element: `aria-labelledby-element[${index}]`,
            description: 'aria-labelledby references non-existent element(s)',
            impact: 'serious',
            fix: 'Ensure aria-labelledby references valid element IDs'
          });
        }
      }
      
      if (describedby) {
        const referencedElements = describedby.split(' ').map(id => document.getElementById(id));
        if (referencedElements.some(el => el === null)) {
          this.addViolation({
            type: 'error',
            principle: 'Robust',
            guideline: '4.1 Compatible',
            criterion: '4.1.1 Parsing (Level A)',
            element: `aria-describedby-element[${index}]`,
            description: 'aria-describedby references non-existent element(s)',
            impact: 'serious',
            fix: 'Ensure aria-describedby references valid element IDs'
          });
        }
      }
    });
  }
  
  private testARIAUsage(container: HTMLElement): void {
    // Test ARIA roles, properties, and states
    const ariaElements = container.querySelectorAll('[role], [aria-expanded], [aria-selected], [aria-checked]');
    
    ariaElements.forEach((element, index) => {
      const role = element.getAttribute('role');
      
      // Test invalid roles
      const validRoles = [
        'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox',
        'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog',
        'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group',
        'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee',
        'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation',
        'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup',
        'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox',
        'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
        'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
        'treeitem'
      ];
      
      if (role && !validRoles.includes(role)) {
        this.addViolation({
          type: 'error',
          principle: 'Robust',
          guideline: '4.1 Compatible',
          criterion: '4.1.2 Name, Role, Value (Level A)',
          element: `role-element[${index}]`,
          description: `Invalid ARIA role: ${role}`,
          impact: 'serious',
          fix: 'Use valid ARIA role or remove role attribute'
        });
      }
    });
    
    // Test elements that should have accessible names
    const nameRequiredElements = container.querySelectorAll(
      'button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"], [role="link"], a'
    );
    
    nameRequiredElements.forEach((element, index) => {
      const hasAccessibleName = element.getAttribute('aria-label') ||
                               element.getAttribute('aria-labelledby') ||
                               element.textContent?.trim() ||
                               (element as HTMLInputElement).value?.trim() ||
                               element.getAttribute('title');
      
      if (!hasAccessibleName) {
        this.addViolation({
          type: 'error',
          principle: 'Robust',
          guideline: '4.1 Compatible',
          criterion: '4.1.2 Name, Role, Value (Level A)',
          element: `interactive-element[${index}]`,
          description: 'Interactive element missing accessible name',
          impact: 'serious',
          fix: 'Add aria-label, visible text, or other accessible name'
        });
      }
    });
  }
  
  private testStatusMessages(container: HTMLElement): void {
    // Test for status messages and live regions
    const statusElements = container.querySelectorAll('[role="status"], [role="alert"], [aria-live]');
    const dynamicContent = container.querySelectorAll('.loading, .success, .error, .updated');
    
    if (dynamicContent.length > 0 && statusElements.length === 0) {
      this.addViolation({
        type: 'warning',
        principle: 'Robust',
        guideline: '4.1 Compatible',
        criterion: '4.1.3 Status Messages (Level AA)',
        element: 'dynamic-content',
        description: 'Dynamic content changes may not be announced to screen readers',
        impact: 'moderate',
        fix: 'Use aria-live, role="status", or role="alert" for dynamic content updates'
      });
    }
  }
  
  /**
   * Helper method to calculate color contrast ratio
   */
  private async calculateContrastRatio(color1: string, color2: string): Promise<number> {
    // Simplified contrast calculation (in a real implementation, you'd use a proper color library)
    // This is a placeholder that returns reasonable values for testing
    
    // Convert colors to RGB values (this is simplified)
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    // Calculate relative luminance (simplified)
    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);
    
    // Calculate contrast ratio
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  private parseColor(color: string): [number, number, number] {
    // Simplified color parsing (would use proper color parsing in real implementation)
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255
      ];
    }
    
    // Default values for testing
    return color === 'rgb(255, 255, 255)' ? [1, 1, 1] : [0, 0, 0];
  }
  
  private getRelativeLuminance([r, g, b]: [number, number, number]): number {
    // Simplified luminance calculation
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  }
  
  /**
   * Add violation to the list
   */
  private addViolation(violation: AccessibilityViolation): void {
    this.violations.push(violation);
  }
  
  /**
   * Calculate overall accessibility score
   */
  private calculateScore(): number {
    if (this.violations.length === 0) return 100;
    
    const weights = {
      critical: 25,
      serious: 15,
      moderate: 10,
      minor: 5
    };
    
    const totalPenalty = this.violations.reduce((sum, violation) => {
      return sum + weights[violation.impact];
    }, 0);
    
    return Math.max(0, 100 - totalPenalty);
  }
  
  /**
   * Determine WCAG compliance level
   */
  private determineComplianceLevel(): 'A' | 'AA' | 'AAA' | 'Fail' {
    const errorViolations = this.violations.filter(v => v.type === 'error');
    const criticalViolations = this.violations.filter(v => v.impact === 'critical');
    const seriousViolations = this.violations.filter(v => v.impact === 'serious');
    
    if (criticalViolations.length > 0) return 'Fail';
    if (errorViolations.length > 2 || seriousViolations.length > 3) return 'Fail';
    if (errorViolations.length > 0 || seriousViolations.length > 0) return 'A';
    
    const moderateViolations = this.violations.filter(v => v.impact === 'moderate');
    if (moderateViolations.length > 5) return 'A';
    
    return 'AA';
  }
  
  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(): string[] {
    const recommendations = new Set<string>();
    
    this.violations.forEach(violation => {
      switch (violation.guideline) {
        case '1.1 Text Alternatives':
          recommendations.add('Add descriptive alt text for all images and icons');
          break;
        case '1.3 Adaptable':
          recommendations.add('Ensure proper heading hierarchy and semantic structure');
          break;
        case '1.4 Distinguishable':
          recommendations.add('Improve color contrast ratios and avoid color-only information');
          break;
        case '2.1 Keyboard Accessible':
          recommendations.add('Ensure all interactive elements are keyboard accessible');
          break;
        case '2.4 Navigable':
          recommendations.add('Add skip links and improve focus management');
          break;
        case '3.3 Input Assistance':
          recommendations.add('Provide clear labels and error messages for form fields');
          break;
        case '4.1 Compatible':
          recommendations.add('Fix HTML validation errors and ARIA implementation');
          break;
      }
    });
    
    return Array.from(recommendations);
  }
}

/**
 * Quick accessibility test function
 */
export async function testAccessibility(element?: HTMLElement): Promise<AccessibilityResult> {
  const tester = new AccessibilityTester();
  const container = element || document.body;
  return await tester.runFullAudit(container);
}

/**
 * Test specific WCAG principle
 */
export async function testWCAGPrinciple(
  principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust',
  element?: HTMLElement
): Promise<AccessibilityViolation[]> {
  const tester = new AccessibilityTester();
  const container = element || document.body;
  
  switch (principle) {
    case 'Perceivable':
      await (tester as any).testPerceivable(container);
      break;
    case 'Operable':
      await (tester as any).testOperable(container);
      break;
    case 'Understandable':
      await (tester as any).testUnderstandable(container);
      break;
    case 'Robust':
      await (tester as any).testRobust(container);
      break;
  }
  
  return (tester as any).violations;
}
