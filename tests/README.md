# Post Tool Use Hook - Regression Test Suite

This directory contains comprehensive regression tests to prevent the bug where tools showed as "Tool used: unknown" instead of actual tool names.

## Test Structure

```
tests/
├── hooks/                          # Python unit tests for hook functions  
│   └── test_post_tool_use.py       # Hook logic testing
├── integration/                    # Integration tests
│   └── test_post_tool_use_integration.py  # Database and API integration
├── fixtures/                      # Test data and utilities
│   └── hook_data_generator.py     # Test data generators and validators
└── README.md                      # This file
```

Frontend tests are located in:
```
apps/client/tests/regression/
└── post-tool-use-display.test.ts  # UI component regression tests
```

## Quick Start

```bash
# Run complete regression test suite
./bin/run-regression-tests.sh

# Quick regression check (faster, skips integration tests)  
./bin/run-regression-tests.sh --quick

# CI/CD mode (no TTS notifications)
./bin/run-regression-tests.sh --ci
```

## Test Categories

### 1. Hook Unit Tests (`tests/hooks/`)
- Tool name extraction from hook input
- Error detection and false positive prevention
- Legacy format compatibility
- Summary generation accuracy

### 2. Integration Tests (`tests/integration/`)
- Database event storage verification
- Server API integration
- End-to-end hook-to-database flow
- Multi-tool operation testing

### 3. Frontend UI Tests (`apps/client/tests/regression/`)
- Event detail modal display
- Event row summary verification
- Applications overview tool usage stats
- Notification display prevention

### 4. Test Data Generation (`tests/fixtures/`)
- Realistic hook input data generation
- Regression scenario recreation
- Data validation utilities
- Mixed format compatibility testing

## Regression Prevention

This test suite specifically prevents these issues:

1. **Tool Name Extraction**: Ensures `tool_name` field is used instead of deprecated `tool` field
2. **Database Contamination**: Prevents "Tool used: unknown" summaries from being stored
3. **UI Display Errors**: Verifies correct tool names appear in all UI components
4. **False Error Detection**: Prevents content containing "timeout" from triggering error notifications

## Test Data Scenarios

The test suite includes these key scenarios:

- **Screenshot Scenario**: Exact reproduction of the bug report with session ID `2250e000-7df8-4747-8662-85a871686956_9150_1737545923`
- **Timeout False Positive**: Files containing timeout-related content that shouldn't trigger errors
- **Unknown Tool Scenario**: Malformed input that previously caused "unknown" tool names
- **Mixed Format Batch**: Combination of new and legacy formats for compatibility testing

## Dependencies

- **Python**: `pytest`, `requests` for hook and integration tests
- **Node.js**: `vitest`, `@vue/test-utils` for frontend tests  
- **Database**: SQLite3 for integration testing
- **Optional**: `bun` or `npm` for package management

## CI/CD Integration

For continuous integration, use:

```bash
./bin/run-regression-tests.sh --ci
```

This mode:
- Disables TTS notifications
- Runs quick tests only
- Optimized for automated environments
- Returns proper exit codes for CI systems

## Manual Testing

Individual test components can be run separately:

```bash
# Python tests only
cd tests && python -m pytest hooks/ integration/ -v

# Frontend tests only  
cd apps/client && npm run test:regression

# Test data validation
python tests/fixtures/hook_data_generator.py
```

## Expected Results

When all tests pass, you should see:
- ✅ Hook unit tests passed
- ✅ Integration tests passed  
- ✅ Frontend regression tests passed
- ✅ Test data generators working correctly
- ✅ Database verification passed

Any failures indicate potential regression of the original bug.

## Troubleshooting

**Integration tests failing**: Ensure server dependencies are installed and ports are available.

**Frontend tests failing**: Run `npm install` in `apps/client/` directory.

**Python import errors**: Ensure `PYTHONPATH` includes the hooks directory.

**Permission errors**: Make sure the test runner script is executable: `chmod +x bin/run-regression-tests.sh`

## Related Documentation

- [HOOKS_DOCUMENTATION.md](../docs/HOOKS_DOCUMENTATION.md) - Complete hook system documentation
- [NOTIFICATION_IMPROVEMENTS.md](../docs/NOTIFICATION_IMPROVEMENTS.md) - False positive timeout fix details
- [TESTING_FRAMEWORK_GUIDE.md](../apps/client/docs/TESTING_FRAMEWORK_GUIDE.md) - Frontend testing framework