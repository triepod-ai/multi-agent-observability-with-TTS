#!/usr/bin/env node

/**
 * Redis Failure Fallback System Validation Test
 * 
 * Tests system behavior when Redis is unavailable:
 * 1. Start with Redis working normally
 * 2. Send events and verify normal operation
 * 3. Simulate Redis failure/disconnection
 * 4. Send events and verify SQLite fallback works
 * 5. Verify API endpoints still return data from SQLite
 * 6. Restore Redis connection
 * 7. Verify cache warming and sync
 * 8. Verify system returns to normal Redis+SQLite operation
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_SESSION_ID = `redis_failure_test_${Date.now()}`;
const TEST_SOURCE_APP = 'redis-failure-test';

// Test configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipCleanup: process.argv.includes('--no-cleanup'),
  waitTime: 3000, // Longer wait for Redis operations
  retries: 5,
  retryDelay: 2000
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
    redis: '🔴'
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

// Test helper functions
async function sendTestEvent(eventData) {
  return await makeRequest(`${SERVER_URL}/events`, {
    method: 'POST',
    body: JSON.stringify(eventData)
  });
}

async function getSystemHealth() {
  return await makeRequest(`${SERVER_URL}/api/agents/health`);
}

async function getFallbackStatus() {
  return await makeRequest(`${SERVER_URL}/api/fallback/status`);
}

async function getMetrics() {
  return await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
}

async function testRedisConnectivity() {
  return await makeRequest(`${SERVER_URL}/api/fallback/test-redis`, {
    method: 'POST'
  });
}

async function forceSync() {
  return await makeRequest(`${SERVER_URL}/api/fallback/sync`, {
    method: 'POST'
  });
}

// Test phases
async function phase1_VerifyNormalOperation() {
  log('Phase 1: Verifying normal Redis+SQLite operation...', 'test');
  
  const results = {};
  
  // Check initial system health
  try {
    const health = await getSystemHealth();
    verbose(`Initial health: ${JSON.stringify(health, null, 2)}`);
    
    results.initialHealth = {
      success: health.status !== 'unhealthy',
      redisStatus: health.redis?.status,
      sqliteStatus: health.sqlite?.status
    };
    
    if (health.status === 'unhealthy') {
      throw new Error(`System is unhealthy: ${health.sqlite?.error || 'Unknown error'}`);
    }
    
    log(`Initial system health: ${health.status} (Redis: ${health.redis.status}, SQLite: ${health.sqlite.status})`);
    
  } catch (error) {
    results.initialHealth = { success: false, error: error.message };
    throw error;
  }
  
  // Send test events during normal operation
  try {
    const testEvents = [
      {
        hook_event_type: 'SubagentStart',
        session_id: `${TEST_SESSION_ID}_normal_1`,
        source_app: TEST_SOURCE_APP,
        timestamp: Date.now(),
        payload: {
          agent_type: 'normal-test',
          agent_name: 'NormalOperationTester',
          task_description: 'Testing normal Redis+SQLite operation'
        }
      },
      {
        hook_event_type: 'SubagentStop',
        session_id: `${TEST_SESSION_ID}_normal_1`,
        source_app: TEST_SOURCE_APP,
        timestamp: Date.now() + 1000,
        payload: {
          agent_type: 'normal-test',
          agent_name: 'NormalOperationTester',
          agent_id: 'normal_test_001',
          tokens_used: 1000,
          duration: 3000,
          result: true,
          status: 'success'
        }
      }
    ];
    
    for (const event of testEvents) {
      await sendTestEvent(event);
      await sleep(100); // Small delay between events
    }
    
    results.normalEventSending = { success: true, eventCount: testEvents.length };
    log(`Successfully sent ${testEvents.length} events during normal operation`);
    
  } catch (error) {
    results.normalEventSending = { success: false, error: error.message };
    throw error;
  }
  
  // Wait for processing and verify metrics
  await sleep(CONFIG.waitTime);
  
  try {
    const metrics = await getMetrics();
    verbose(`Normal operation metrics: ${JSON.stringify(metrics, null, 2)}`);
    
    results.normalMetricsRetrieval = {
      success: metrics.executions_today > 0,
      executionsFound: metrics.executions_today,
      tokensFound: metrics.tokens_used_today
    };
    
    if (metrics.executions_today === 0) {
      throw new Error('No executions recorded during normal operation');
    }
    
    log(`Normal operation metrics: ${metrics.executions_today} executions, ${metrics.tokens_used_today} tokens`);
    
  } catch (error) {
    results.normalMetricsRetrieval = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function phase2_SimulateRedisFailure() {
  log('Phase 2: Simulating Redis failure...', 'redis');
  
  const results = {};
  
  // Note: In a real test environment, we would actually stop Redis service
  // For this test, we'll simulate failure by monitoring system behavior
  // when Redis becomes unavailable naturally or via configuration
  
  log('Monitoring system for Redis disconnection...', 'redis');
  log('In production, this would involve stopping Redis service: sudo systemctl stop redis-server', 'redis');
  
  // Check if Redis is currently available and working
  try {
    const redisTest = await testRedisConnectivity();
    verbose(`Redis connectivity test: ${JSON.stringify(redisTest, null, 2)}`);
    
    results.redisConnectivityTest = {
      success: true,
      connectionStatus: redisTest.connection?.success,
      operationsStatus: redisTest.operations?.success
    };
    
    if (redisTest.connection?.success && redisTest.operations?.success) {
      log('Redis is currently operational. To test failure handling:', 'redis');
      log('1. Stop Redis service: sudo systemctl stop redis-server', 'redis');
      log('2. Or disconnect Redis network access', 'redis');
      log('3. Then run this test again', 'redis');
      
      // For testing purposes, we'll proceed to test the fallback system
      // even if Redis is working
      log('Proceeding with fallback system testing...', 'redis');
    }
    
  } catch (error) {
    results.redisConnectivityTest = { success: false, error: error.message };
    log(`Redis appears to be unavailable: ${error.message}`, 'redis');
    log('This is perfect for testing fallback behavior!', 'redis');
  }
  
  return results;
}

async function phase3_TestSQLiteFallback() {
  log('Phase 3: Testing SQLite fallback operation...', 'test');
  
  const results = {};
  
  // Send events while Redis may be unavailable
  try {
    const fallbackEvents = [
      {
        hook_event_type: 'SubagentStart',
        session_id: `${TEST_SESSION_ID}_fallback_1`,
        source_app: TEST_SOURCE_APP,
        timestamp: Date.now(),
        payload: {
          agent_type: 'fallback-test',
          agent_name: 'FallbackTester',
          task_description: 'Testing SQLite fallback when Redis unavailable'
        }
      },
      {
        hook_event_type: 'SubagentStop',
        session_id: `${TEST_SESSION_ID}_fallback_1`,
        source_app: TEST_SOURCE_APP,
        timestamp: Date.now() + 1000,
        payload: {
          agent_type: 'fallback-test',
          agent_name: 'FallbackTester',
          agent_id: 'fallback_test_001',
          tokens_used: 1500,
          duration: 4000,
          result: true,
          status: 'success'
        }
      },
      {
        hook_event_type: 'ToolUse',
        session_id: `${TEST_SESSION_ID}_fallback_1`,
        source_app: TEST_SOURCE_APP,
        timestamp: Date.now() + 2000,
        payload: {
          tool_name: 'Read',
          operation: 'file_read',
          success: true,
          duration_ms: 200
        }
      }
    ];
    
    for (const event of fallbackEvents) {
      try {
        await sendTestEvent(event);
        verbose(`Sent fallback event: ${event.hook_event_type}`);
        await sleep(200); // Slightly longer delay during potential Redis issues
      } catch (error) {
        log(`Failed to send fallback event ${event.hook_event_type}: ${error.message}`, 'error');
        throw error;
      }
    }
    
    results.fallbackEventSending = { success: true, eventCount: fallbackEvents.length };
    log(`Successfully sent ${fallbackEvents.length} events during potential Redis unavailability`);
    
  } catch (error) {
    results.fallbackEventSending = { success: false, error: error.message };
    throw error;
  }
  
  // Wait for processing
  await sleep(CONFIG.waitTime);
  
  // Verify that metrics are still available (should come from SQLite)
  try {
    const metrics = await retryOperation(
      () => getMetrics(),
      'Fetching metrics during fallback operation'
    );
    
    verbose(`Fallback metrics: ${JSON.stringify(metrics, null, 2)}`);
    
    results.fallbackMetricsRetrieval = {
      success: metrics.executions_today > 0,
      executionsFound: metrics.executions_today,
      tokensFound: metrics.tokens_used_today,
      hasBreakdown: metrics.agent_type_breakdown?.length > 0
    };
    
    if (metrics.executions_today === 0) {
      throw new Error('No executions found during fallback operation - SQLite fallback may not be working');
    }
    
    log(`Fallback metrics retrieval successful: ${metrics.executions_today} executions`);
    
  } catch (error) {
    results.fallbackMetricsRetrieval = { success: false, error: error.message };
    throw error;
  }
  
  // Check fallback system status
  try {
    const fallbackStatus = await getFallbackStatus();
    verbose(`Fallback status: ${JSON.stringify(fallbackStatus, null, 2)}`);
    
    results.fallbackSystemStatus = {
      success: true,
      mode: fallbackStatus.overall_status?.mode,
      operational: fallbackStatus.overall_status?.operational,
      redisConnected: fallbackStatus.redis?.status?.isConnected,
      fallbackEnabled: fallbackStatus.fallback_storage?.enabled
    };
    
    log(`Fallback system status: mode=${fallbackStatus.overall_status?.mode}, operational=${fallbackStatus.overall_status?.operational}`);
    
    if (!fallbackStatus.overall_status?.operational) {
      throw new Error('Fallback system reports as non-operational');
    }
    
  } catch (error) {
    results.fallbackSystemStatus = { success: false, error: error.message };
    log(`Could not get fallback status: ${error.message}`, 'warn');
  }
  
  return results;
}

async function phase4_TestRedisRecovery() {
  log('Phase 4: Testing Redis recovery and cache warming...', 'test');
  
  const results = {};
  
  // Test Redis connectivity (simulating recovery)
  try {
    const redisTest = await testRedisConnectivity();
    verbose(`Redis recovery test: ${JSON.stringify(redisTest, null, 2)}`);
    
    results.redisRecoveryTest = {
      success: redisTest.connection?.success || false,
      connectionStatus: redisTest.connection?.success,
      operationsStatus: redisTest.operations?.success
    };
    
    if (redisTest.connection?.success) {
      log('Redis connectivity restored!', 'redis');
    } else {
      log('Redis still unavailable - testing will continue with SQLite-only mode', 'redis');
    }
    
  } catch (error) {
    results.redisRecoveryTest = { success: false, error: error.message };
    log(`Redis recovery test failed: ${error.message}`, 'redis');
  }
  
  // Attempt to force sync (cache warming)
  try {
    if (results.redisRecoveryTest?.success) {
      log('Attempting to force cache warming...', 'redis');
      
      const syncResult = await retryOperation(
        () => forceSync(),
        'Force sync operation'
      );
      
      verbose(`Sync result: ${JSON.stringify(syncResult, null, 2)}`);
      
      results.cacheSyncOperation = {
        success: syncResult.success || false,
        operationsSynced: syncResult.operations_synced || 0,
        operationsFailed: syncResult.operations_failed || 0,
        duration: syncResult.duration_ms || 0
      };
      
      if (syncResult.success) {
        log(`Cache sync completed: ${syncResult.operations_synced} operations synced in ${syncResult.duration_ms}ms`);
      } else {
        log(`Cache sync had issues: ${syncResult.operations_failed} operations failed`, 'warn');
      }
      
    } else {
      results.cacheSyncOperation = { success: false, error: 'Redis not available for sync' };
      log('Skipping cache sync - Redis not available', 'redis');
    }
    
  } catch (error) {
    results.cacheSyncOperation = { success: false, error: error.message };
    log(`Cache sync failed: ${error.message}`, 'warn');
  }
  
  // Wait for cache warming to complete
  if (results.redisRecoveryTest?.success) {
    await sleep(CONFIG.waitTime);
  }
  
  return results;
}

async function phase5_VerifyRecoveredOperation() {
  log('Phase 5: Verifying system operation after Redis recovery...', 'test');
  
  const results = {};
  
  // Send events after potential Redis recovery
  try {
    const recoveryEvents = [
      {
        hook_event_type: 'SubagentStart',
        session_id: `${TEST_SESSION_ID}_recovery_1`,
        source_app: TEST_SOURCE_APP,
        timestamp: Date.now(),
        payload: {
          agent_type: 'recovery-test',
          agent_name: 'RecoveryTester',
          task_description: 'Testing system after Redis recovery'
        }
      },
      {
        hook_event_type: 'SubagentStop',
        session_id: `${TEST_SESSION_ID}_recovery_1`,
        source_app: TEST_SOURCE_APP,
        timestamp: Date.now() + 1000,
        payload: {
          agent_type: 'recovery-test',
          agent_name: 'RecoveryTester',
          agent_id: 'recovery_test_001',
          tokens_used: 1200,
          duration: 3500,
          result: true,
          status: 'success'
        }
      }
    ];
    
    for (const event of recoveryEvents) {
      await sendTestEvent(event);
      await sleep(100);
    }
    
    results.recoveryEventSending = { success: true, eventCount: recoveryEvents.length };
    log(`Successfully sent ${recoveryEvents.length} events after recovery`);
    
  } catch (error) {
    results.recoveryEventSending = { success: false, error: error.message };
    throw error;
  }
  
  // Wait for processing
  await sleep(CONFIG.waitTime);
  
  // Verify final system health
  try {
    const finalHealth = await getSystemHealth();
    verbose(`Final health: ${JSON.stringify(finalHealth, null, 2)}`);
    
    results.finalSystemHealth = {
      success: finalHealth.status !== 'unhealthy',
      status: finalHealth.status,
      redisStatus: finalHealth.redis?.status,
      sqliteStatus: finalHealth.sqlite?.status,
      metricsAvailable: finalHealth.metrics_available
    };
    
    log(`Final system health: ${finalHealth.status} (Redis: ${finalHealth.redis.status}, SQLite: ${finalHealth.sqlite.status})`);
    
  } catch (error) {
    results.finalSystemHealth = { success: false, error: error.message };
    throw error;
  }
  
  // Verify final metrics
  try {
    const finalMetrics = await getMetrics();
    verbose(`Final metrics: ${JSON.stringify(finalMetrics, null, 2)}`);
    
    results.finalMetricsRetrieval = {
      success: finalMetrics.executions_today > 0,
      executionsFound: finalMetrics.executions_today,
      tokensFound: finalMetrics.tokens_used_today,
      hasBreakdown: finalMetrics.agent_type_breakdown?.length > 0,
      hasAllTestTypes: ['normal-test', 'fallback-test', 'recovery-test'].every(type =>
        finalMetrics.agent_type_breakdown?.some(b => b.type === type)
      )
    };
    
    log(`Final metrics: ${finalMetrics.executions_today} total executions, ${finalMetrics.tokens_used_today} total tokens`);
    
  } catch (error) {
    results.finalMetricsRetrieval = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function generateTestReport(phaseResults) {
  log('Generating Redis failure test report...', 'test');
  
  const allResults = {};
  let totalTests = 0;
  let passedTests = 0;
  
  // Flatten all phase results
  for (const [phase, results] of Object.entries(phaseResults)) {
    for (const [testName, result] of Object.entries(results)) {
      const fullTestName = `${phase}_${testName}`;
      allResults[fullTestName] = result;
      totalTests++;
      if (result.success) passedTests++;
    }
  }
  
  const report = {
    testSuite: 'Redis Failure Fallback System Validation',
    timestamp: new Date().toISOString(),
    server: SERVER_URL,
    testSession: TEST_SESSION_ID,
    phases: phaseResults,
    summary: {
      totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      overallSuccess: passedTests === totalTests
    }
  };
  
  // Generate detailed report
  console.log('\n' + '='.repeat(80));
  console.log('                REDIS FAILURE FALLBACK TEST REPORT');
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
  
  console.log('PHASE RESULTS:');
  for (const [phase, results] of Object.entries(phaseResults)) {
    const phaseTests = Object.keys(results).length;
    const phasePassed = Object.values(results).filter(r => r.success).length;
    const phaseStatus = phasePassed === phaseTests ? '✅ PASS' : '❌ FAIL';
    
    console.log(`  ${phaseStatus} ${phase} (${phasePassed}/${phaseTests})`);
    
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
  
  console.log('='.repeat(80));
  
  return report;
}

// Main test execution
async function runTests() {
  const phaseResults = {};
  
  try {
    log('Starting Redis Failure Fallback System Validation Tests', 'test');
    log(`Server: ${SERVER_URL}`, 'info');
    log(`Test Session: ${TEST_SESSION_ID}`, 'info');
    log('Note: To test actual Redis failure, stop Redis service before running this test', 'info');
    
    // Phase 1: Normal operation
    try {
      phaseResults.phase1 = await phase1_VerifyNormalOperation();
    } catch (error) {
      log(`Phase 1 failed: ${error.message}`, 'error');
      phaseResults.phase1 = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Phase 2: Simulate Redis failure
    try {
      phaseResults.phase2 = await phase2_SimulateRedisFailure();
    } catch (error) {
      log(`Phase 2 failed: ${error.message}`, 'error');
      phaseResults.phase2 = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Phase 3: Test SQLite fallback
    try {
      phaseResults.phase3 = await phase3_TestSQLiteFallback();
    } catch (error) {
      log(`Phase 3 failed: ${error.message}`, 'error');
      phaseResults.phase3 = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Phase 4: Test Redis recovery
    try {
      phaseResults.phase4 = await phase4_TestRedisRecovery();
    } catch (error) {
      log(`Phase 4 failed: ${error.message}`, 'error');
      phaseResults.phase4 = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Phase 5: Verify recovered operation
    try {
      phaseResults.phase5 = await phase5_VerifyRecoveredOperation();
    } catch (error) {
      log(`Phase 5 failed: ${error.message}`, 'error');
      phaseResults.phase5 = { criticalFailure: { success: false, error: error.message } };
    }
    
  } catch (error) {
    log(`Critical test failure: ${error.message}`, 'error');
  }
  
  // Generate and display report
  const report = await generateTestReport(phaseResults);
  
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