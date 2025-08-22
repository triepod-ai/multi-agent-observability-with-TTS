#!/usr/bin/env node

/**
 * Health Check Endpoint Implementation and Testing
 * 
 * Creates and tests the health monitoring endpoint:
 * 1. Unified service health status
 * 2. Redis connection status
 * 3. SQLite database status
 * 4. Recent metrics recording success rates
 * 5. Cache hit rates and performance stats
 * 6. Error counts and recent failures
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_SESSION_ID = `health_test_${Date.now()}`;

// Test configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  healthCheckInterval: 5000, // 5 seconds
  monitoringDuration: 30000, // 30 seconds
  maxResponseTime: 2000, // 2 seconds for health checks
  retries: 3,
  retryDelay: 1000
};

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
    test: '🧪',
    health: '🏥',
    monitor: '📊'
  }[level] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function verbose(message) {
  if (CONFIG.verbose) {
    log(message, 'debug');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

async function retryOperation(operation, description, maxRetries = CONFIG.retries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`${description} failed after ${maxRetries} attempts: ${error.message}`);
      }
      log(`${description} attempt ${attempt} failed: ${error.message}. Retrying...`, 'warn');
      await sleep(CONFIG.retryDelay * attempt);
    }
  }
}

// Health monitoring functions
async function testUnifiedServiceHealth() {
  log('Testing unified metrics service health endpoint...', 'health');
  
  const results = {};
  
  try {
    const start = Date.now();
    const health = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/health`),
      'Unified service health check'
    );
    const responseTime = Date.now() - start;
    
    verbose(`Unified service health: ${JSON.stringify(health, null, 2)}`);
    
    // Validate health response structure
    const validations = {
      hasStatus: health.status !== undefined,
      isHealthy: health.status !== 'unhealthy',
      hasSqliteInfo: health.sqlite !== undefined,
      hasRedisInfo: health.redis !== undefined,
      hasCacheInfo: health.cache !== undefined,
      hasTimestamp: health.timestamp !== undefined,
      hasMetricsAvailable: health.metrics_available !== undefined,
      fastResponse: responseTime < CONFIG.maxResponseTime,
      sqliteHealthy: health.sqlite?.status === 'healthy',
      redisStatusProvided: ['healthy', 'unhealthy'].includes(health.redis?.status)
    };
    
    results.unifiedServiceHealth = {
      success: Object.values(validations).every(v => v),
      responseTime,
      health,
      validations,
      details: {
        status: health.status,
        sqliteStatus: health.sqlite?.status,
        redisStatus: health.redis?.status,
        metricsAvailable: health.metrics_available,
        cacheWarmupTime: health.lastCacheWarmup
      }
    };
    
    if (!validations.isHealthy) {
      throw new Error(`Unified service reports as unhealthy: ${health.status}`);
    }
    
    log(`✅ Unified service health: ${health.status} (${responseTime}ms)`);
    log(`   SQLite: ${health.sqlite?.status}, Redis: ${health.redis?.status}`);
    
  } catch (error) {
    results.unifiedServiceHealth = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function testFallbackSystemHealth() {
  log('Testing fallback system health endpoint...', 'health');
  
  const results = {};
  
  try {
    const start = Date.now();
    const fallbackHealth = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/fallback/health`),
      'Fallback system health check'
    );
    const responseTime = Date.now() - start;
    
    verbose(`Fallback health: ${JSON.stringify(fallbackHealth, null, 2)}`);
    
    // Validate fallback health response
    const validations = {
      hasStatus: fallbackHealth.status !== undefined,
      isOperational: fallbackHealth.status !== 'unhealthy',
      hasRedisInfo: typeof fallbackHealth.redis_available === 'boolean',
      hasFallbackInfo: typeof fallbackHealth.fallback_enabled === 'boolean',
      hasOperationalMode: fallbackHealth.operational_mode !== undefined,
      hasTimestamp: fallbackHealth.timestamp !== undefined,
      fastResponse: responseTime < CONFIG.maxResponseTime,
      validOperationalMode: ['redis', 'fallback'].includes(fallbackHealth.operational_mode)
    };
    
    results.fallbackSystemHealth = {
      success: Object.values(validations).every(v => v),
      responseTime,
      health: fallbackHealth,
      validations,
      details: {
        status: fallbackHealth.status,
        operationalMode: fallbackHealth.operational_mode,
        redisAvailable: fallbackHealth.redis_available,
        fallbackEnabled: fallbackHealth.fallback_enabled
      }
    };
    
    if (!validations.isOperational) {
      throw new Error(`Fallback system reports as unhealthy: ${fallbackHealth.status}`);
    }
    
    log(`✅ Fallback system health: ${fallbackHealth.status} (${responseTime}ms)`);
    log(`   Mode: ${fallbackHealth.operational_mode}, Redis: ${fallbackHealth.redis_available}, Fallback: ${fallbackHealth.fallback_enabled}`);
    
  } catch (error) {
    results.fallbackSystemHealth = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function testRedisConnectivity() {
  log('Testing Redis connectivity and operations...', 'health');
  
  const results = {};
  
  try {
    const start = Date.now();
    const redisTest = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/fallback/test-redis`, { method: 'POST' }),
      'Redis connectivity test'
    );
    const responseTime = Date.now() - start;
    
    verbose(`Redis test: ${JSON.stringify(redisTest, null, 2)}`);
    
    // Validate Redis test response
    const validations = {
      hasConnectionTest: redisTest.connection !== undefined,
      hasOperationsTest: redisTest.operations !== undefined,
      hasTimestamp: redisTest.timestamp !== undefined,
      fastResponse: responseTime < CONFIG.maxResponseTime,
      connectionSuccess: redisTest.connection?.success === true,
      operationsSuccess: redisTest.operations?.success === true
    };
    
    results.redisConnectivity = {
      success: validations.hasConnectionTest && validations.hasOperationsTest,
      responseTime,
      redisTest,
      validations,
      details: {
        connectionStatus: redisTest.connection?.success,
        operationsStatus: redisTest.operations?.success,
        connectionError: redisTest.connection?.error,
        operationsError: redisTest.operations?.error
      }
    };
    
    if (validations.connectionSuccess && validations.operationsSuccess) {
      log(`✅ Redis connectivity: fully operational (${responseTime}ms)`);
    } else if (validations.connectionSuccess) {
      log(`⚠️ Redis connectivity: connected but operations failing`, 'warn');
    } else {
      log(`❌ Redis connectivity: connection failed`, 'warn');
    }
    
  } catch (error) {
    results.redisConnectivity = { success: false, error: error.message };
    log(`Redis connectivity test failed: ${error.message}`, 'warn');
  }
  
  return results;
}

async function testMetricsRecordingSuccessRates() {
  log('Testing metrics recording success rates...', 'health');
  
  const results = {};
  
  try {
    // Send test events and monitor success rates
    const testEvents = [
      {
        hook_event_type: 'SubagentStart',
        session_id: `${TEST_SESSION_ID}_success_test_1`,
        source_app: 'health-monitoring-test',
        timestamp: Date.now(),
        payload: {
          agent_type: 'health-tester',
          agent_name: 'HealthTester',
          task_description: 'Testing metrics recording success rates'
        }
      },
      {
        hook_event_type: 'SubagentStop',
        session_id: `${TEST_SESSION_ID}_success_test_1`,
        source_app: 'health-monitoring-test',
        timestamp: Date.now() + 1000,
        payload: {
          agent_type: 'health-tester',
          agent_name: 'HealthTester',
          agent_id: 'health_test_001',
          tokens_used: 1000,
          duration: 2000,
          result: true,
          status: 'success'
        }
      }
    ];
    
    let successfulEvents = 0;
    let failedEvents = 0;
    
    for (const event of testEvents) {
      try {
        const start = Date.now();
        await makeRequest(`${SERVER_URL}/events`, {
          method: 'POST',
          body: JSON.stringify(event)
        });
        const responseTime = Date.now() - start;
        
        successfulEvents++;
        verbose(`Event sent successfully: ${event.hook_event_type} (${responseTime}ms)`);
        
      } catch (error) {
        failedEvents++;
        verbose(`Event failed: ${event.hook_event_type} - ${error.message}`);
      }
    }
    
    // Wait for processing
    await sleep(2000);
    
    // Verify events were recorded in metrics
    const metricsStart = Date.now();
    const metrics = await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
    const metricsResponseTime = Date.now() - metricsStart;
    
    const successRate = (successfulEvents / testEvents.length) * 100;
    
    results.metricsRecordingSuccess = {
      success: successRate >= 90 && metrics.executions_today > 0,
      totalEvents: testEvents.length,
      successfulEvents,
      failedEvents,
      successRate,
      metricsResponseTime,
      metricsContainTestData: metrics.executions_today > 0,
      details: {
        eventsRecorded: successfulEvents,
        metricsAccessible: metricsResponseTime < CONFIG.maxResponseTime,
        currentExecutions: metrics.executions_today
      }
    };
    
    log(`✅ Metrics recording: ${successfulEvents}/${testEvents.length} events successful (${successRate}%)`);
    log(`   Metrics retrieval: ${metricsResponseTime}ms, ${metrics.executions_today} total executions`);
    
  } catch (error) {
    results.metricsRecordingSuccess = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function testCachePerformanceStats() {
  log('Testing cache performance and hit rates...', 'health');
  
  const results = {};
  
  try {
    // Get initial metrics (likely cache miss)
    const firstStart = Date.now();
    const firstMetrics = await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
    const firstResponseTime = Date.now() - firstStart;
    
    // Brief delay
    await sleep(100);
    
    // Get metrics again (potentially cache hit)
    const secondStart = Date.now();
    const secondMetrics = await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
    const secondResponseTime = Date.now() - secondStart;
    
    // Test different endpoints for cache behavior
    const endpoints = [
      '/api/agents/metrics/timeline?hours=1',
      '/api/agents/types/distribution',
      '/api/agents/tools/usage'
    ];
    
    const cacheTests = {};
    
    for (const endpoint of endpoints) {
      // First request
      const start1 = Date.now();
      await makeRequest(`${SERVER_URL}${endpoint}`);
      const time1 = Date.now() - start1;
      
      await sleep(50);
      
      // Second request
      const start2 = Date.now();
      await makeRequest(`${SERVER_URL}${endpoint}`);
      const time2 = Date.now() - start2;
      
      cacheTests[endpoint] = {
        firstRequestTime: time1,
        secondRequestTime: time2,
        timeDifference: Math.abs(time1 - time2),
        consistentPerformance: Math.abs(time1 - time2) < 1000
      };
    }
    
    // Check if we can get cache stats from the health endpoint
    let cacheStats = null;
    try {
      const health = await makeRequest(`${SERVER_URL}/api/agents/health`);
      cacheStats = health.cache || null;
    } catch (error) {
      verbose(`Could not get cache stats: ${error.message}`);
    }
    
    const avgFirstRequestTime = Object.values(cacheTests).reduce((sum, test) => sum + test.firstRequestTime, 0) / endpoints.length;
    const avgSecondRequestTime = Object.values(cacheTests).reduce((sum, test) => sum + test.secondRequestTime, 0) / endpoints.length;
    
    results.cachePerformanceStats = {
      success: firstResponseTime < CONFIG.maxResponseTime && secondResponseTime < CONFIG.maxResponseTime,
      currentMetricsFirstRequest: firstResponseTime,
      currentMetricsSecondRequest: secondResponseTime,
      avgFirstRequestTime,
      avgSecondRequestTime,
      cacheStats,
      endpointTests: cacheTests,
      details: {
        consistentPerformance: Object.values(cacheTests).every(test => test.consistentPerformance),
        acceptableResponseTimes: Object.values(cacheTests).every(test => 
          test.firstRequestTime < CONFIG.maxResponseTime && test.secondRequestTime < CONFIG.maxResponseTime
        ),
        cacheStatsAvailable: cacheStats !== null
      }
    };
    
    log(`✅ Cache performance: ${avgFirstRequestTime.toFixed(0)}ms → ${avgSecondRequestTime.toFixed(0)}ms avg`);
    if (cacheStats) {
      log(`   Cache stats: available=${cacheStats.redisAvailable}, warmup in progress=${cacheStats.cacheWarmupInProgress}`);
    }
    
  } catch (error) {
    results.cachePerformanceStats = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function testErrorCountsAndFailures() {
  log('Testing error tracking and failure monitoring...', 'health');
  
  const results = {};
  
  try {
    // Intentionally trigger some errors to test error tracking
    const errorTests = [];
    
    // Test 1: Invalid endpoint
    try {
      await makeRequest(`${SERVER_URL}/api/invalid/endpoint`);
      errorTests.push({ test: 'invalid_endpoint', error: 'Expected 404 error not received' });
    } catch (error) {
      errorTests.push({ test: 'invalid_endpoint', success: true, expectedError: error.message });
    }
    
    // Test 2: Malformed event
    try {
      await makeRequest(`${SERVER_URL}/events`, {
        method: 'POST',
        body: JSON.stringify({ invalid: 'event structure' })
      });
      errorTests.push({ test: 'malformed_event', error: 'Expected validation error not received' });
    } catch (error) {
      errorTests.push({ test: 'malformed_event', success: true, expectedError: error.message });
    }
    
    // Test 3: Empty request
    try {
      await makeRequest(`${SERVER_URL}/events`, {
        method: 'POST',
        body: ''
      });
      errorTests.push({ test: 'empty_request', error: 'Expected parse error not received' });
    } catch (error) {
      errorTests.push({ test: 'empty_request', success: true, expectedError: error.message });
    }
    
    // Check if system is still responsive after errors
    const healthCheckStart = Date.now();
    const healthAfterErrors = await makeRequest(`${SERVER_URL}/api/agents/health`);
    const healthCheckTime = Date.now() - healthCheckStart;
    
    const successfulErrorTests = errorTests.filter(test => test.success).length;
    
    results.errorCountsAndFailures = {
      success: successfulErrorTests >= 2 && healthAfterErrors.status !== 'unhealthy',
      errorTestsRun: errorTests.length,
      expectedErrorsTriggered: successfulErrorTests,
      systemStillResponsive: healthCheckTime < CONFIG.maxResponseTime,
      healthAfterErrors: healthAfterErrors.status,
      errorTests,
      details: {
        errorHandlingWorking: successfulErrorTests >= 2,
        systemRecovery: healthAfterErrors.status !== 'unhealthy',
        responseTimeAfterErrors: healthCheckTime
      }
    };
    
    log(`✅ Error tracking: ${successfulErrorTests}/${errorTests.length} expected errors handled correctly`);
    log(`   System health after errors: ${healthAfterErrors.status} (${healthCheckTime}ms)`);
    
  } catch (error) {
    results.errorCountsAndFailures = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function testContinuousHealthMonitoring() {
  log('Testing continuous health monitoring...', 'monitor');
  
  const results = {
    monitoringDuration: CONFIG.monitoringDuration,
    healthChecks: [],
    responseTimes: [],
    statusChanges: [],
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: 0,
    uptimePercentage: 0
  };
  
  const startTime = Date.now();
  let healthCheckCount = 0;
  let successfulChecks = 0;
  
  while (Date.now() - startTime < CONFIG.monitoringDuration) {
    try {
      const checkStart = Date.now();
      const health = await makeRequest(`${SERVER_URL}/api/agents/health`);
      const responseTime = Date.now() - checkStart;
      
      healthCheckCount++;
      successfulChecks++;
      
      results.healthChecks.push({
        timestamp: checkStart,
        responseTime,
        status: health.status,
        sqliteStatus: health.sqlite?.status,
        redisStatus: health.redis?.status,
        success: true
      });
      
      results.responseTimes.push(responseTime);
      
      // Check for status changes
      if (results.healthChecks.length > 1) {
        const prevCheck = results.healthChecks[results.healthChecks.length - 2];
        if (prevCheck.status !== health.status) {
          results.statusChanges.push({
            timestamp: checkStart,
            from: prevCheck.status,
            to: health.status
          });
        }
      }
      
      verbose(`Health check ${healthCheckCount}: ${health.status} (${responseTime}ms)`);
      
    } catch (error) {
      healthCheckCount++;
      
      results.healthChecks.push({
        timestamp: Date.now(),
        responseTime: null,
        status: 'error',
        error: error.message,
        success: false
      });
      
      verbose(`Health check ${healthCheckCount} failed: ${error.message}`);
    }
    
    // Wait for next check
    await sleep(CONFIG.healthCheckInterval);
  }
  
  // Calculate statistics
  if (results.responseTimes.length > 0) {
    results.averageResponseTime = results.responseTimes.reduce((sum, t) => sum + t, 0) / results.responseTimes.length;
    results.maxResponseTime = Math.max(...results.responseTimes);
    results.minResponseTime = Math.min(...results.responseTimes);
  }
  
  results.uptimePercentage = (successfulChecks / healthCheckCount) * 100;
  
  const continuousMonitoringResults = {
    success: results.uptimePercentage >= 95 && results.averageResponseTime < CONFIG.maxResponseTime,
    ...results,
    summary: {
      totalChecks: healthCheckCount,
      successfulChecks,
      failedChecks: healthCheckCount - successfulChecks,
      uptimePercentage: results.uptimePercentage,
      avgResponseTime: results.averageResponseTime,
      statusChanges: results.statusChanges.length
    }
  };
  
  log(`✅ Continuous monitoring: ${results.uptimePercentage.toFixed(1)}% uptime over ${CONFIG.monitoringDuration/1000}s`);
  log(`   ${healthCheckCount} checks, avg response: ${results.averageResponseTime.toFixed(0)}ms`);
  
  return { continuousHealthMonitoring: continuousMonitoringResults };
}

async function generateTestReport(testResults) {
  log('Generating health monitoring test report...', 'test');
  
  const allResults = {};
  let totalTests = 0;
  let passedTests = 0;
  
  // Flatten all test results
  for (const [category, results] of Object.entries(testResults)) {
    if (typeof results === 'object' && results !== null) {
      for (const [testName, result] of Object.entries(results)) {
        const fullTestName = `${category}_${testName}`;
        allResults[fullTestName] = result;
        totalTests++;
        if (result.success) passedTests++;
      }
    }
  }
  
  const report = {
    testSuite: 'Health Monitoring System Validation',
    timestamp: new Date().toISOString(),
    server: SERVER_URL,
    testSession: TEST_SESSION_ID,
    configuration: CONFIG,
    categories: testResults,
    summary: {
      totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      overallSuccess: passedTests === totalTests
    }
  };
  
  // Generate detailed report
  console.log('\n' + '='.repeat(80));
  console.log('                HEALTH MONITORING SYSTEM TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Test Suite: ${report.testSuite}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Server: ${report.server}`);
  console.log(`Test Session: ${report.testSession}`);
  console.log('');
  
  console.log('SUMMARY:');
  console.log(`  Total Tests: ${report.summary.totalTests}`);
  console.log(`  Passed: ${report.summary.passed}`);
  console.log(`  Failed: ${report.summary.failed}`);
  console.log(`  Overall: ${report.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');
  
  console.log('CATEGORY RESULTS:');
  
  // Display results by category
  for (const [category, results] of Object.entries(testResults)) {
    if (typeof results === 'object' && results !== null) {
      const categoryTests = Object.keys(results).length;
      const categoryPassed = Object.values(results).filter(r => r.success).length;
      const categoryStatus = categoryPassed === categoryTests ? '✅ PASS' : '❌ FAIL';
      
      console.log(`  ${categoryStatus} ${category} (${categoryPassed}/${categoryTests})`);
      
      for (const [testName, result] of Object.entries(results)) {
        const status = result.success ? '    ✅' : '    ❌';
        console.log(`${status} ${testName}`);
        
        if (!result.success && result.error) {
          console.log(`        Error: ${result.error}`);
        }
        
        if (result.details && CONFIG.verbose) {
          console.log(`        Details: ${JSON.stringify(result.details, null, 8)}`);
        }
      }
      console.log('');
    }
  }
  
  console.log('HEALTH MONITORING INSIGHTS:');
  if (report.summary.overallSuccess) {
    console.log('  ✅ All health endpoints are functioning correctly');
    console.log('  ✅ System monitoring provides accurate status information');
    console.log('  ✅ Error handling and recovery mechanisms work properly');
    console.log('  ✅ Performance monitoring is operational');
    console.log('  ✅ System is ready for production monitoring');
  } else {
    console.log('  ❌ Health monitoring issues detected');
    console.log('  ⚠️  Review failed tests above for specific problems');
    console.log('  ⚠️  Fix health monitoring before production deployment');
  }
  
  console.log('='.repeat(80));
  
  return report;
}

// Main test execution
async function runTests() {
  const testResults = {};
  
  try {
    log('Starting Health Monitoring System Validation Tests', 'test');
    log(`Server: ${SERVER_URL}`, 'info');
    log(`Test Session: ${TEST_SESSION_ID}`, 'info');
    
    // Test 1: Unified service health
    try {
      const unifiedHealthResults = await testUnifiedServiceHealth();
      Object.assign(testResults, unifiedHealthResults);
    } catch (error) {
      log(`Unified service health test failed: ${error.message}`, 'error');
      testResults.unifiedServiceHealth = { success: false, error: error.message };
    }
    
    // Test 2: Fallback system health
    try {
      const fallbackHealthResults = await testFallbackSystemHealth();
      Object.assign(testResults, fallbackHealthResults);
    } catch (error) {
      log(`Fallback system health test failed: ${error.message}`, 'error');
      testResults.fallbackSystemHealth = { success: false, error: error.message };
    }
    
    // Test 3: Redis connectivity
    try {
      const redisResults = await testRedisConnectivity();
      Object.assign(testResults, redisResults);
    } catch (error) {
      log(`Redis connectivity test failed: ${error.message}`, 'error');
      testResults.redisConnectivity = { success: false, error: error.message };
    }
    
    // Test 4: Metrics recording success rates
    try {
      const metricsResults = await testMetricsRecordingSuccessRates();
      Object.assign(testResults, metricsResults);
    } catch (error) {
      log(`Metrics recording test failed: ${error.message}`, 'error');
      testResults.metricsRecordingSuccess = { success: false, error: error.message };
    }
    
    // Test 5: Cache performance stats
    try {
      const cacheResults = await testCachePerformanceStats();
      Object.assign(testResults, cacheResults);
    } catch (error) {
      log(`Cache performance test failed: ${error.message}`, 'error');
      testResults.cachePerformanceStats = { success: false, error: error.message };
    }
    
    // Test 6: Error counts and failures
    try {
      const errorResults = await testErrorCountsAndFailures();
      Object.assign(testResults, errorResults);
    } catch (error) {
      log(`Error tracking test failed: ${error.message}`, 'error');
      testResults.errorCountsAndFailures = { success: false, error: error.message };
    }
    
    // Test 7: Continuous health monitoring
    try {
      const continuousResults = await testContinuousHealthMonitoring();
      Object.assign(testResults, continuousResults);
    } catch (error) {
      log(`Continuous monitoring test failed: ${error.message}`, 'error');
      testResults.continuousHealthMonitoring = { success: false, error: error.message };
    }
    
  } catch (error) {
    log(`Critical test failure: ${error.message}`, 'error');
  }
  
  // Generate and display report
  const report = await generateTestReport(testResults);
  
  // Exit with appropriate code
  const exitCode = report.summary.overallSuccess ? 0 : 1;
  process.exit(exitCode);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Test interrupted by user', 'warn');
  process.exit(130);
});

// Run the tests
runTests().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});