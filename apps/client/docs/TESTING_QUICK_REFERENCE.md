# Testing Quick Reference

## 🚀 Quick Start

### Run Tests
```bash
npm run test:regression    # Regression tests only
npm run test              # Interactive/watch mode
npm run test:run          # Single run (CI mode)
npm run test:ui           # Visual interface
```

### Basic Test Structure
```typescript
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Component from '../../src/components/Component.vue';

describe('Component Tests', () => {
  it('should do something', () => {
    const wrapper = mount(Component, {
      props: { /* props */ }
    });
    
    expect(wrapper.text()).toContain('Expected');
  });
});
```

## 🧪 Common Patterns

### Component Mounting
```typescript
// Basic mount
const wrapper = mount(ApplicationsOverview, {
  props: {
    events: mockEvents,
    getAppColor: vi.fn(() => '#3B82F6')
  }
});

// Check text content
expect(wrapper.text()).toContain('Tool Usage');

// Check HTML structure
expect(wrapper.html()).toContain('bg-green-500');
```

### Event Testing
```typescript
// Trigger events
await wrapper.find('button').trigger('click');
await wrapper.find('input').setValue('test');

// Check emissions
expect(wrapper.emitted('filterByTool')).toBeTruthy();
expect(wrapper.emitted('click')?.[0]).toEqual(['arg1', 'arg2']);
```

### Element Finding
```typescript
// Find by CSS selector
const button = wrapper.find('button');
const inputs = wrapper.findAll('input');

// Find by text content
const buttons = wrapper.findAll('button');
const clearButton = buttons.find(b => b.text().includes('Clear'));

// Find by attributes
const toolElements = wrapper.findAll('[data-testid^="tool-"]');
```

## 🎯 Test Data

### Mock Events
```typescript
const mockEvents: HookEvent[] = [
  {
    id: 1,
    source_app: 'claude-code',
    session_id: '12345',
    hook_event_type: 'PostToolUse',
    payload: { tool_name: 'Read' },
    timestamp: Date.now() - 1000
  }
];
```

### Mock Functions
```typescript
const mockGetAppColor = vi.fn(() => '#3B82F6');
const mockGetSessionColor = vi.fn(() => '#10B981');

beforeEach(() => {
  vi.clearAllMocks();
});
```

## 🛡️ Regression Test Types

### 1. Compilation Errors
**File**: `compilation-errors.test.ts`  
**Tests**: TypeScript compilation, interface compatibility, function duplicates

```typescript
// Prevent duplicate functions
const functionDefPattern = /const formatSessionId\\s*=\\s*\\(/g;
const matches = content.match(functionDefPattern) || [];
expect(matches.length).toBeLessThanOrEqual(1);
```

### 2. Filter State Visibility  
**File**: `filter-state-visibility.test.ts`  
**Tests**: Filter indicators, chips, count displays

```typescript
// Must show filter indicators when active
expect(wrapper.text()).toContain('🔍 Filtered');
expect(wrapper.text()).toContain('Active Filters:');
```

### 3. Tool Usage Display
**File**: `tool-usage-display.test.ts`  
**Tests**: Tool names vs session IDs, icons, activity states

```typescript
// Show tool names, NOT session IDs
expect(wrapper.text()).toContain('Read');
expect(wrapper.text()).not.toContain('12345');
```

## 🔍 Debugging

### Debug Single Test
```bash
npm run test -- filter-state-visibility.test.ts
```

### Verbose Output
```bash
npm run test -- --reporter=verbose
```

### Visual Debugging
```bash
npm run test:ui
```

### Console Debug
```typescript
console.log(wrapper.html());      // Full HTML
console.log(wrapper.text());      // Text content
console.log(wrapper.emitted());   // All emissions
```

## ⚡ Best Practices

### ✅ Do
- Use realistic test data
- Test user interactions
- Verify event emissions
- Mock external dependencies
- Clear mocks between tests
- Use descriptive test names

### ❌ Don't
- Test implementation details
- Use hard-coded selectors that might break
- Forget to mock browser APIs
- Test CSS styling (test behavior)
- Use overly complex test setup

## 🚨 Common Issues

### Selector Problems
```typescript
// ❌ CSS pseudo-selectors don't work
wrapper.find('button:contains("Text")')

// ✅ Find by text content
const buttons = wrapper.findAll('button');
const button = buttons.find(b => b.text().includes('Text'));
```

### Component Import Errors
```typescript
// ❌ Can't require Vue SFC directly  
const component = require('../../Component.vue');

// ✅ Test file existence instead
expect(fs.existsSync(componentPath)).toBe(true);
```

### Missing Props
```typescript
// ❌ Missing required props
mount(Component, { props: {} });

// ✅ Provide all required props
mount(Component, {
  props: {
    events: [],
    getAppColor: vi.fn(),
    getSessionColor: vi.fn()
  }
});
```

## 📊 Coverage Goals

### Current (36 tests)
- Compilation: 9 tests
- Filter Visibility: 12 tests  
- Tool Display: 15 tests

### Success Metrics
- ✅ 100% pass rate
- ✅ <1s execution time
- ✅ 5 regressions protected

---

## 📁 File Structure
```
tests/
├── setup.ts                           # Global config
├── regression/
│   ├── compilation-errors.test.ts     # Build/TS tests
│   ├── filter-state-visibility.test.ts # UI state tests  
│   └── tool-usage-display.test.ts     # Tool display tests
└── docs/
    ├── TESTING_FRAMEWORK_GUIDE.md     # Complete guide
    └── TESTING_QUICK_REFERENCE.md     # This file
```

## 🔗 Related
- [Testing Framework Guide](./TESTING_FRAMEWORK_GUIDE.md) - Complete documentation
- [Vitest Docs](https://vitest.dev/) - Framework reference
- [Vue Test Utils](https://test-utils.vuejs.org/) - Component testing