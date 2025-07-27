# Testing Framework Guide

## Overview

The Multi-Agent Observability System client uses a comprehensive testing framework built on **Vitest** and **Vue Test Utils** to ensure code quality, prevent regressions, and maintain system reliability.

## 🏗️ Framework Architecture

### Core Technologies
- **Vitest** - Fast, modern testing framework with TypeScript support
- **Vue Test Utils** - Official testing utilities for Vue.js components
- **JSDOM** - Browser-like environment for testing DOM interactions
- **TypeScript** - Full type safety in tests and test utilities

### Testing Philosophy
- **Regression Prevention** - Primary focus on preventing known issues from reoccurring
- **Component Integration** - Real component mounting and interaction testing
- **Type Safety** - Full TypeScript coverage for tests and utilities
- **Realistic Testing** - Tests mirror real user interactions and scenarios

## 📁 Project Structure

```
tests/
├── setup.ts                           # Global test configuration
├── regression/                        # Regression prevention tests
│   ├── compilation-errors.test.ts     # Build and TypeScript regression tests
│   ├── filter-state-visibility.test.ts # UI state visibility regression tests
│   └── tool-usage-display.test.ts     # Tool display functionality tests
└── [future]/
    ├── unit/                          # Unit tests for individual functions
    ├── integration/                   # Integration tests for workflows
    └── e2e/                          # End-to-end user journey tests
```

## ⚙️ Configuration

### Vitest Configuration (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',      // Browser-like environment
    globals: true,             // Global test functions (describe, it, expect)
    setupFiles: ['./tests/setup.ts']  // Global test setup
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')  // Path alias for imports
    }
  }
})
```

### Global Setup (`tests/setup.ts`)
```typescript
import { beforeEach } from 'vitest'

// Mock console noise
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: console.error // Keep errors for debugging
}

// Mock browser APIs
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.clearAllMocks?.()
})
```

## 🧪 Test Execution

### Available Scripts
```bash
# Interactive test mode (watch mode)
npm run test

# Single test run (CI mode)
npm run test:run

# Visual test interface
npm run test:ui

# Run only regression tests
npm run test:regression
```

### Test Output
```bash
 ✓ tests/regression/compilation-errors.test.ts (9 tests)
 ✓ tests/regression/tool-usage-display.test.ts (15 tests)
 ✓ tests/regression/filter-state-visibility.test.ts (12 tests)

 Test Files  3 passed (3)
      Tests  36 passed (36)
   Start at  10:45:30
   Duration  1.02s
```

## 🛡️ Regression Test Suites

### 1. Compilation Errors (`compilation-errors.test.ts`)
**Purpose**: Prevent TypeScript and build-time regressions

**Test Categories**:
- **Type Definitions** - Validates HookEvent interface completeness
- **Filter Interface Compatibility** - Ensures component prop interfaces remain compatible
- **Function Definition Uniqueness** - Prevents duplicate function declarations
- **Component Import Resolution** - Validates component file accessibility
- **Build System Compatibility** - Ensures package.json and tsconfig validity
- **Vue Template Compilation** - Validates Vue single-file component structure
- **Prop Interface Validation** - Ensures parent-child component compatibility
- **Event Emission Interface** - Validates component event contracts

**Key Protection**:
```typescript
// Prevents: Identifier 'formatSessionId' has already been declared
const functionDefPattern = /const formatSessionId\\s*=\\s*\\(/g;
const matches = content.match(functionDefPattern) || [];
expect(matches.length).toBeLessThanOrEqual(1);
```

### 2. Filter State Visibility (`filter-state-visibility.test.ts`)
**Purpose**: Prevent "hidden filter state" UX problems

**Test Categories**:
- **Filter Visibility Indicators** - Ensures filter badges and indicators are visible
- **Active Filter Chips Display** - Validates filter chip rendering and interaction
- **Filter Removal Functionality** - Tests individual and bulk filter clearing
- **Filter State Persistence Prevention** - Critical regression prevention tests
- **Edge Cases** - Handles undefined props and missing data gracefully

**Key Protection**:
```typescript
// Critical regression test: These elements MUST be visible when filters are active
expect(wrapper.text()).toContain('🔍 Filtered');
expect(wrapper.text()).toContain('Active Filters:');
expect(wrapper.text()).toMatch(/\\d+\\s*of\\s*\\d+/);
expect(wrapper.text()).toContain('Clear All Filters');
```

### 3. Tool Usage Display (`tool-usage-display.test.ts`)
**Purpose**: Prevent regression to showing cryptic session IDs instead of tool names

**Test Categories**:
- **Tool Usage Section Display** - Validates "Recent Tool Usage" vs "Recent Sessions"
- **Tool Icon Display** - Ensures tool-specific emoji icons are rendered
- **Tool Activity Indicators** - Tests active/recent/idle status indicators
- **Tool Click Filtering** - Validates click-to-filter functionality
- **Tool Name Extraction Logic** - Tests tool name extraction from different event sources
- **Tool Usage Sorting and Limiting** - Ensures proper ordering and display limits

**Key Protection**:
```typescript
// Critical regression test: Should show tool usage, not sessions
expect(wrapper.text()).toContain('Recent Tool Usage');
expect(wrapper.text()).not.toContain('Recent Sessions');

// Should show tool names, NOT raw session IDs
expect(wrapper.text()).toContain('Read');
expect(wrapper.text()).toContain('Edit');
expect(wrapper.text()).not.toContain('12345');
expect(wrapper.text()).not.toContain('67890');
```

## 🔧 Writing Tests

### Component Testing Pattern
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ComponentName from '../../src/components/ComponentName.vue';
import type { HookEvent } from '../../src/types';

describe('Component Name Tests', () => {
  const mockProps = {
    events: mockEvents,
    getAppColor: vi.fn(() => '#3B82F6'),
    getSessionColor: vi.fn(() => '#10B981')
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly with props', () => {
    const wrapper = mount(ComponentName, {
      props: mockProps
    });

    expect(wrapper.text()).toContain('Expected Text');
  });
});
```

### Testing Vue Components
```typescript
// Mount component with props
const wrapper = mount(ApplicationsOverview, {
  props: {
    events: mockEvents,
    activeFilters: { sourceApp: 'test-app' },
    getAppColor: mockGetAppColor,
    getSessionColor: mockGetSessionColor
  }
});

// Test text content
expect(wrapper.text()).toContain('Recent Tool Usage');

// Test HTML structure
expect(wrapper.html()).toContain('bg-green-500');

// Test event emissions
await wrapper.find('button').trigger('click');
expect(wrapper.emitted('filterByTool')).toBeTruthy();

// Test CSS selectors
const toolItems = wrapper.findAll('.cursor-pointer');
expect(toolItems).toHaveLength(3);
```

### Mock Data Patterns
```typescript
const mockToolEvents: HookEvent[] = [
  {
    id: 1,
    source_app: 'claude-code',
    session_id: '12345',
    hook_event_type: 'PostToolUse',
    payload: { tool_name: 'Read' },
    timestamp: Date.now() - 1000
  },
  // ... more test data
];

const mockGetAppColor = vi.fn(() => '#3B82F6');
const mockGetSessionColor = vi.fn(() => '#10B981');
```

## 🎯 Testing Best Practices

### 1. Regression-First Approach
- **Start with the bug** - Write tests that would have caught the original issue
- **Real scenarios** - Use actual data patterns and user interactions
- **Critical path coverage** - Focus on user-facing functionality first

### 2. Component Testing
- **Mount realistically** - Use real props and realistic data
- **Test user interactions** - Click events, form inputs, navigation
- **Verify emissions** - Ensure component events fire correctly
- **Check visual state** - Validate classes, text content, and structure

### 3. Mock Strategy
- **Mock external dependencies** - Color functions, API calls, complex computations
- **Keep data realistic** - Use data that mirrors production patterns
- **Mock console noise** - Reduce test output clutter
- **Mock browser APIs** - ResizeObserver, IntersectionObserver, etc.

### 4. Test Organization
- **Descriptive names** - Test names should explain what they prevent/validate
- **Logical grouping** - Group related tests in describe blocks
- **Clear comments** - Explain complex test logic and regression context
- **Consistent patterns** - Use similar structure across test files

## 🚨 Regression Prevention Strategy

### Known Regressions Protected
1. **Duplicate Function Declarations** - Prevented by compilation error tests
2. **Hidden Filter States** - Prevented by filter visibility tests
3. **Session ID Display** - Prevented by tool usage display tests
4. **TypeScript Interface Mismatches** - Prevented by type validation tests
5. **Component Import Failures** - Prevented by import resolution tests

### Adding New Regression Tests
1. **Identify the bug** - Understand what went wrong and why
2. **Create failing test** - Write a test that would catch the issue
3. **Verify test fails** - Run test against buggy code to confirm detection
4. **Fix the code** - Implement the fix
5. **Verify test passes** - Confirm test passes with fix in place
6. **Document the protection** - Add comments explaining what regression is prevented

## 📊 Test Coverage Goals

### Current Coverage (36 tests)
- **Compilation Errors**: 9 tests
- **Filter State Visibility**: 12 tests  
- **Tool Usage Display**: 15 tests

### Future Expansion Targets
- **Unit Tests**: Individual function testing
- **Integration Tests**: Multi-component workflows
- **E2E Tests**: Complete user journeys
- **Performance Tests**: Component rendering speed
- **Accessibility Tests**: WCAG compliance validation

## 🔍 Debugging Tests

### Common Issues and Solutions

**Test Selector Problems**:
```typescript
// ❌ CSS selectors that don't work in JSDOM
wrapper.find('button:contains("Text")')

// ✅ Use text-based finding instead
const buttons = wrapper.findAll('button');
const targetButton = buttons.find(b => b.text().includes('Text'));
```

**Mock Data Mismatches**:
```typescript
// ❌ Unrealistic test data
const events = [{ id: 1 }]; // Missing required fields

// ✅ Complete, realistic test data
const events = [{
  id: 1,
  source_app: 'claude-code',
  session_id: '12345',
  hook_event_type: 'PostToolUse',
  payload: { tool_name: 'Read' },
  timestamp: Date.now()
}];
```

**Component Import Issues**:
```typescript
// ❌ Trying to require Vue SFC directly
const component = require('../../src/Component.vue');

// ✅ Test file existence instead
const fs = require('fs');
expect(fs.existsSync(componentPath)).toBe(true);
```

### Debug Commands
```bash
# Run specific test file
npm run test filter-state-visibility.test.ts

# Run with verbose output
npm run test -- --reporter=verbose

# Run in debug mode
npm run test -- --inspect-brk

# Run with UI for visual debugging
npm run test:ui
```

## 🔮 Future Enhancements

### Planned Additions
- **Visual Regression Testing** - Screenshot comparison for UI consistency
- **Performance Testing** - Component render time and memory usage
- **Accessibility Testing** - Automated WCAG compliance checks
- **Cross-Browser Testing** - Playwright integration for browser compatibility
- **API Integration Testing** - WebSocket and HTTP endpoint testing

### Test Automation
- **Pre-commit Hooks** - Run regression tests before commits
- **CI/CD Integration** - Automated test runs on pull requests
- **Coverage Reporting** - Track test coverage metrics over time
- **Regression Alerts** - Notify team when regression tests fail

---

## Quick Reference

### Essential Commands
```bash
npm run test:regression    # Run all regression tests
npm run test              # Interactive test mode
npm run test:ui           # Visual test interface
```

### File Locations
- Configuration: `vitest.config.ts`
- Global Setup: `tests/setup.ts`
- Regression Tests: `tests/regression/`
- Documentation: `docs/TESTING_FRAMEWORK_GUIDE.md`

### Key Metrics
- **36 tests** across 3 test suites
- **100% pass rate** on all regression tests
- **5 major regressions** protected against
- **<1s execution time** for full regression suite