# Comprehensive Test Suite for Metrics Pipeline Validation

This directory contains a comprehensive test suite to validate that the metrics pipeline fix is working end-to-end and that the dashboard will show real data instead of zeros.

## Test Suite Overview

### 1. **`test-metrics-pipeline.js`** - End-to-End Pipeline Validation
**Purpose**: Validates the complete flow from event ingestion to dashboard display.

**Test Scenarios**:
- Send SubagentStart events with various agent types
- Send SubagentStop events with tokens, duration, costs
- Send tool usage events  
- Verify data appears in SQLite database
- Verify data appears in Redis cache (when available)
- Verify API endpoints return recorded data
- Test time range filtering and aggregation accuracy

**Success Criteria**: Events flow through entire system and produce accurate metrics

### 2. **`test-redis-failure.js`** - Fallback System Validation  
**Purpose**: Tests system behavior when Redis is unavailable.

**Test Scenarios**:
- Start with Redis working normally
- Send events and verify normal operation
- Simulate Redis failure/disconnection
- Send events and verify SQLite fallback works
- Verify API endpoints still return data from SQLite
- Restore Redis connection and verify cache warming

**Success Criteria**: System continues operating with SQLite when Redis fails

### 3. **`test-metrics-display.js`** - Frontend Integration Validation
**Purpose**: Tests the frontend metrics dashboard functionality.

**Test Scenarios**:
- Load dashboard and verify real data appears (not zeros)
- Test error handling with simulated backend failures
- Test retry logic and exponential backoff
- Test WebSocket real-time updates
- Test loading states and error states
- Verify connection health indicators

**Success Criteria**: Dashboard displays real data and handles errors gracefully

### 4. **`test-performance.js`** - Performance and Load Testing
**Purpose**: Ensures the system performs well under load.

**Test Scenarios**:
- Send high-volume events (100+ per second)
- Measure API response times
- Test database query performance
- Test Redis cache hit rates
- Verify memory usage stays reasonable
- Test concurrent user scenarios

**Success Criteria**: System handles expected load volumes without degradation

### 5. **`test-health-monitoring.js`** - Health Check Endpoint Validation
**Purpose**: Validates system health monitoring capabilities.

**Test Scenarios**:
- Unified service health status
- Redis connection status
- SQLite database status  
- Recent metrics recording success rates
- Cache hit rates and performance stats
- Error counts and recent failures

**Success Criteria**: Health endpoints provide accurate system status

## Running the Tests

### Individual Test Suites

```bash
# Run individual test suites
npm run test:pipeline         # End-to-end pipeline validation
npm run test:redis-failure    # Redis failure fallback testing
npm run test:display          # Frontend integration testing  
npm run test:performance      # Performance and load testing
npm run test:health          # Health monitoring validation
```

### Master Test Runner

```bash
# Run all tests with summary report
npm run test:all

# Run with verbose output
npm run test:all:verbose  

# Continue running even if critical tests fail
npm run test:critical
```

### Direct Node.js Execution

```bash
# Run individual tests directly
node test-metrics-pipeline.js
node test-redis-failure.js --verbose
node test-metrics-display.js
node test-performance.js
node test-health-monitoring.js

# Run master test runner
node run-all-tests.js --verbose
```

## Test Configuration

### Environment Variables

```bash
export SERVER_URL=http://localhost:3001    # Server URL
export CLIENT_URL=http://localhost:5173    # Client URL (for frontend tests)
```

### Command Line Options

- `--verbose` / `-v`: Enable detailed logging and output
- `--no-cleanup`: Skip cleanup operations after tests
- `--continue-on-failure`: Continue running tests even if critical tests fail
- `--no-report`: Skip generating JSON report files

## Prerequisites

### 1. Server Running
Ensure the observability server is running:

```bash
cd apps/server
PORT=3001 bun run start
```

### 2. Database Initialized
The server should have initialized the SQLite database automatically.

### 3. Redis (Optional)
Redis can be running or stopped to test fallback behavior:

```bash
# To test with Redis
sudo systemctl start redis-server

# To test fallback behavior
sudo systemctl stop redis-server
```

## Test Output

### Success Indicators

**✅ All tests passed**: 
- Events flow through entire pipeline
- Dashboard will show real data (not zeros)
- Fallback systems work correctly
- Performance is acceptable
- Health monitoring is functional

**⚠️ Partial success**:
- Critical tests passed but some standard tests failed
- Dashboard should work but review issues
- Production deployment possible with monitoring

**❌ Critical failure**:
- Essential pipeline components not working
- Dashboard will likely show zeros or errors
- System not ready for production

### Understanding Exit Codes

- **0**: All tests passed - system ready for production
- **1**: Critical tests failed - fix immediately  
- **2**: Non-critical tests failed - review and fix when possible
- **130**: Tests interrupted by user

## Validation Checklist

After running tests, verify:

- [ ] **Event Ingestion**: Events are successfully received and stored
- [ ] **Database Storage**: SQLite contains test event data
- [ ] **Redis Caching**: Cache layer working (when Redis available)
- [ ] **API Endpoints**: All metrics endpoints return real data
- [ ] **Frontend Ready**: Dashboard will show non-zero values
- [ ] **Error Handling**: System gracefully handles failures
- [ ] **Performance**: Response times acceptable under load
- [ ] **Health Monitoring**: Status endpoints provide accurate information

## Troubleshooting

### Common Issues

1. **Server not running**: Start server with `PORT=3001 bun run start`
2. **Connection errors**: Check SERVER_URL environment variable
3. **Database errors**: Ensure SQLite database is properly initialized
4. **Redis connection**: Tests should pass with or without Redis
5. **Timeout errors**: Increase timeout values in test configuration

### Debug Mode

Run with verbose output to see detailed information:

```bash
node run-all-tests.js --verbose
```

### Log Analysis

Check server logs for errors:

```bash
tail -f apps/server/server.log
```

## Test Development

### Adding New Tests

1. Create new test file following naming convention: `test-[feature].js`
2. Follow the established test structure with logging and error handling
3. Add to TEST_SUITES array in `run-all-tests.js`
4. Add npm script to package.json

### Test Best Practices

- **Clear naming**: Descriptive test and function names
- **Comprehensive logging**: Use log() function with appropriate levels
- **Error handling**: Catch and report errors gracefully  
- **Cleanup**: Reset test state when possible
- **Validation**: Verify expected outcomes with specific assertions
- **Performance**: Include timing measurements
- **Documentation**: Comment complex test logic

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run metrics pipeline tests
  run: |
    cd apps/server
    PORT=3001 bun run start &
    sleep 5
    npm run test:all
```

## Production Readiness

The test suite validates these production readiness criteria:

- **Functional**: All core features working correctly
- **Reliable**: System handles failures gracefully  
- **Performant**: Acceptable response times under load
- **Observable**: Health monitoring and error tracking functional
- **Resilient**: Fallback mechanisms working correctly

Run `npm run test:all` to get a comprehensive production readiness assessment.