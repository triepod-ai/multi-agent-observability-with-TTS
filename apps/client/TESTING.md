# Testing Framework

## Overview
Comprehensive testing framework for the Multi-Agent Observability System client built on **Vitest** and **Vue Test Utils**.

## Quick Start
```bash
npm run test:regression    # Run regression tests
npm run test              # Interactive test mode
npm run test:ui           # Visual test interface
```

## Test Coverage
- **36 tests** across 3 regression test suites
- **100% pass rate** with <1s execution time
- **5 major regressions** protected against

## Test Suites
1. **Compilation Errors** (`compilation-errors.test.ts`) - 9 tests
   - Prevents TypeScript and build regressions
   - Validates component interfaces and function uniqueness

2. **Filter State Visibility** (`filter-state-visibility.test.ts`) - 12 tests
   - Prevents "hidden filter state" UX problems
   - Ensures filter indicators are always visible

3. **Tool Usage Display** (`tool-usage-display.test.ts`) - 15 tests
   - Prevents regression to showing session IDs instead of tool names
   - Validates tool icon display and click filtering

## Documentation
- **[docs/TESTING_FRAMEWORK_GUIDE.md](./docs/TESTING_FRAMEWORK_GUIDE.md)** - Complete testing framework documentation
- **[docs/TESTING_QUICK_REFERENCE.md](./docs/TESTING_QUICK_REFERENCE.md)** - Developer quick reference

## Key Features
✅ **Regression Prevention** - Protects against known bugs returning  
✅ **Component Testing** - Real Vue component mounting and interaction  
✅ **Type Safety** - Full TypeScript coverage in tests  
✅ **Visual Debugging** - UI interface for test exploration  
✅ **Fast Execution** - Sub-second test runs for rapid feedback

## Test Structure
```
tests/
├── setup.ts                           # Global test configuration
├── regression/                        # Regression prevention tests
│   ├── compilation-errors.test.ts     # Build/TypeScript tests
│   ├── filter-state-visibility.test.ts # UI state visibility tests
│   └── tool-usage-display.test.ts     # Tool display functionality tests
└── [future]/
    ├── unit/                          # Unit tests
    ├── integration/                   # Integration tests
    └── e2e/                          # End-to-end tests
```

---

**Status**: ✅ Production-ready testing framework with comprehensive regression protection  
**Last Updated**: 2025-07-25