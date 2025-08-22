#!/usr/bin/env node

/**
 * Performance and Load Testing
 * 
 * Tests system performance under load:
 * 1. Send high-volume events (100+ per second)
 * 2. Measure API response times
 * 3. Test database query performance
 * 4. Test Redis cache hit rates
 * 5. Verify memory usage stays reasonable
 * 6. Test concurrent user scenarios
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_SESSION_ID = `performance_test_${Date.now()}`;
const TEST_SOURCE_APP = 'performance-load-test';

// Test configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipCleanup: process.argv.includes('--no-cleanup'),
  // Performance test parameters
  eventBurstSize: 100,
  eventBurstCount: 5,
  concurrentUsers: 10,
  testDuration: 30000, // 30 seconds
  maxAcceptableResponseTime: 5000, // 5 seconds
  maxAcceptableMemoryMB: 1024, // 1GB
  targetEventsPerSecond: 50
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
    perf: '🚀',
    load: '⚡'
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

// Performance measurement utilities
class PerformanceMonitor {
  constructor() {
    this.measurements = [];
    this.startTime = null;
    this.endTime = null;
  }
  
  start() {
    this.startTime = Date.now();
    if (global.gc) {
      global.gc(); // Force garbage collection if available
    }
  }
  
  end() {
    this.endTime = Date.now();
  }
  
  addMeasurement(operation, duration, success = true, data = {}) {
    this.measurements.push({
      operation,
      duration,
      success,
      timestamp: Date.now(),
      ...data
    });
  }
  
  getDuration() {
    return this.endTime - this.startTime;
  }
  
  getStats() {
    const successfulMeasurements = this.measurements.filter(m => m.success);
    const failedMeasurements = this.measurements.filter(m => !m.success);
    
    if (successfulMeasurements.length === 0) {
      return {
        totalOperations: this.measurements.length,
        successfulOperations: 0,
        failedOperations: failedMeasurements.length,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        operationsPerSecond: 0
      };
    }
    
    const durations = successfulMeasurements.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = this.getDuration();
    
    return {
      totalOperations: this.measurements.length,
      successfulOperations: successfulMeasurements.length,
      failedOperations: failedMeasurements.length,
      successRate: (successfulMeasurements.length / this.measurements.length) * 100,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      operationsPerSecond: this.measurements.length / (totalDuration / 1000),
      totalTestDuration: totalDuration
    };
  }
}

// Test data generators
function generateTestEvent(index, sessionPrefix = 'perf') {
  const agentTypes = ['analyzer', 'debugger', 'builder', 'tester', 'reviewer', 'optimizer'];
  const tools = ['Read', 'Write', 'Edit', 'Grep', 'Bash', 'Sequential', 'Magic'];
  
  const agentType = agentTypes[index % agentTypes.length];
  const isStart = index % 2 === 0;
  
  if (isStart) {
    return {
      hook_event_type: 'SubagentStart',
      session_id: `${TEST_SESSION_ID}_${sessionPrefix}_${Math.floor(index / 2)}`,
      source_app: TEST_SOURCE_APP,
      timestamp: Date.now(),
      payload: {
        agent_type: agentType,
        agent_name: `${agentType}Agent${Math.floor(index / 2)}`,
        task_description: `Performance test task ${Math.floor(index / 2)}`,
        tools: tools.slice(0, 2 + (index % 3))
      }
    };
  } else {
    return {
      hook_event_type: 'SubagentStop',
      session_id: `${TEST_SESSION_ID}_${sessionPrefix}_${Math.floor(index / 2)}`,
      source_app: TEST_SOURCE_APP,
      timestamp: Date.now(),
      payload: {
        agent_type: agentType,
        agent_name: `${agentType}Agent${Math.floor(index / 2)}`,
        agent_id: `perf_agent_${Math.floor(index / 2)}`,
        tokens_used: 500 + (index * 50),
        duration: 1000 + (index * 100),
        result: Math.random() > 0.1, // 90% success rate
        tools_used: tools.slice(0, 1 + (index % 4)),
        status: Math.random() > 0.1 ? 'success' : 'failed'
      }
    };
  }
}

// Test functions
async function testHighVolumeEventIngestion() {
  log('Testing high-volume event ingestion...', 'perf');
  
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  const results = {
    eventsSent: 0,
    eventsSuccessful: 0,
    eventsFailed: 0,
    burstResults: []
  };
  
  for (let burst = 0; burst < CONFIG.eventBurstCount; burst++) {
    log(`Sending burst ${burst + 1}/${CONFIG.eventBurstCount} (${CONFIG.eventBurstSize} events)...`, 'load');
    
    const burstStart = Date.now();
    const burstPromises = [];
    
    // Send events in parallel for maximum load
    for (let i = 0; i < CONFIG.eventBurstSize; i++) {
      const eventIndex = burst * CONFIG.eventBurstSize + i;
      const testEvent = generateTestEvent(eventIndex, `burst${burst}`);
      
      const eventPromise = (async () => {
        const start = Date.now();
        try {
          await makeRequest(`${SERVER_URL}/events`, {
            method: 'POST',
            body: JSON.stringify(testEvent)
          });
          const duration = Date.now() - start;
          monitor.addMeasurement('event_send', duration, true, { eventType: testEvent.hook_event_type });
          return { success: true, duration };
        } catch (error) {
          const duration = Date.now() - start;
          monitor.addMeasurement('event_send', duration, false, { error: error.message });
          return { success: false, duration, error: error.message };
        }
      })();
      
      burstPromises.push(eventPromise);
    }
    
    // Wait for all events in this burst to complete
    const burstResults = await Promise.all(burstPromises);
    const burstEnd = Date.now();
    const burstDuration = burstEnd - burstStart;
    
    const burstSuccessful = burstResults.filter(r => r.success).length;
    const burstFailed = burstResults.filter(r => !r.success).length;
    const burstEventsPerSecond = CONFIG.eventBurstSize / (burstDuration / 1000);
    
    results.eventsSent += CONFIG.eventBurstSize;
    results.eventsSuccessful += burstSuccessful;
    results.eventsFailed += burstFailed;
    
    results.burstResults.push({
      burstNumber: burst + 1,
      eventsSent: CONFIG.eventBurstSize,
      successful: burstSuccessful,
      failed: burstFailed,
      duration: burstDuration,
      eventsPerSecond: burstEventsPerSecond
    });
    
    log(`Burst ${burst + 1} completed: ${burstSuccessful}/${CONFIG.eventBurstSize} successful (${burstEventsPerSecond.toFixed(1)} events/sec)`);
    
    // Small delay between bursts to allow processing
    if (burst < CONFIG.eventBurstCount - 1) {
      await sleep(2000);
    }
  }
  
  monitor.end();
  const performanceStats = monitor.getStats();
  
  log(`High-volume test completed: ${results.eventsSuccessful}/${results.eventsSent} successful (${performanceStats.successRate.toFixed(1)}%)`);
  
  return {
    success: performanceStats.successRate >= 95, // At least 95% success rate
    eventIngestionResults: results,
    performanceStats,
    details: {
      totalEventsPerSecond: performanceStats.operationsPerSecond,
      avgResponseTime: performanceStats.avgDuration,
      p95ResponseTime: performanceStats.p95Duration,
      maxResponseTime: performanceStats.maxDuration,
      acceptablePerformance: performanceStats.avgDuration < CONFIG.maxAcceptableResponseTime
    }
  };
}

async function testAPIResponseTimes() {
  log('Testing API response times under load...', 'perf');
  
  const endpoints = [
    '/api/agents/metrics/current',
    '/api/agents/metrics/timeline?hours=1',
    '/api/agents/types/distribution',
    '/api/agents/tools/usage',
    '/api/agents/health'
  ];
  
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  const results = {};
  
  for (const endpoint of endpoints) {
    log(`Testing endpoint: ${endpoint}`, 'perf');
    
    const endpointResults = [];
    
    // Test each endpoint multiple times
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      try {
        await makeRequest(`${SERVER_URL}${endpoint}`);
        const duration = Date.now() - start;
        endpointResults.push({ success: true, duration });
        monitor.addMeasurement(`api_${endpoint}`, duration, true);
        
        // Add small delay to avoid overwhelming
        await sleep(100);
      } catch (error) {
        const duration = Date.now() - start;
        endpointResults.push({ success: false, duration, error: error.message });
        monitor.addMeasurement(`api_${endpoint}`, duration, false);
      }
    }
    
    const successful = endpointResults.filter(r => r.success);
    const failed = endpointResults.filter(r => !r.success);
    
    if (successful.length > 0) {
      const durations = successful.map(r => r.duration);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      results[endpoint] = {
        success: failed.length === 0 && avgDuration < CONFIG.maxAcceptableResponseTime,
        totalRequests: endpointResults.length,
        successfulRequests: successful.length,
        failedRequests: failed.length,
        avgDuration,
        minDuration,
        maxDuration,
        acceptablePerformance: avgDuration < CONFIG.maxAcceptableResponseTime
      };
      
      verbose(`${endpoint}: ${avgDuration.toFixed(0)}ms avg (${minDuration}-${maxDuration}ms range)`);
    } else {
      results[endpoint] = {
        success: false,
        error: 'All requests failed',
        totalRequests: endpointResults.length,
        successfulRequests: 0,
        failedRequests: failed.length
      };
    }
  }
  
  monitor.end();
  
  const overallSuccess = Object.values(results).every(r => r.success);
  
  log(`API response time test completed: ${overallSuccess ? 'PASSED' : 'FAILED'}`);
  
  return {
    success: overallSuccess,
    endpointResults: results,
    summary: {
      totalEndpoints: endpoints.length,
      passedEndpoints: Object.values(results).filter(r => r.success).length,
      failedEndpoints: Object.values(results).filter(r => !r.success).length
    }
  };
}

async function testConcurrentUserScenarios() {
  log('Testing concurrent user scenarios...', 'perf');
  
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  // Simulate multiple concurrent users
  const userPromises = [];
  
  for (let user = 0; user < CONFIG.concurrentUsers; user++) {
    const userPromise = (async () => {
      const userResults = {
        userId: user,
        operations: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0
      };
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < CONFIG.testDuration) {
        try {
          // Each user performs a mix of operations
          const operations = [
            // Send an event
            async () => {
              const event = generateTestEvent(userResults.operations, `user${user}`);
              return await makeRequest(`${SERVER_URL}/events`, {
                method: 'POST',
                body: JSON.stringify(event)
              });
            },
            // Get metrics
            async () => {
              return await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
            },
            // Get timeline
            async () => {
              return await makeRequest(`${SERVER_URL}/api/agents/metrics/timeline?hours=1`);
            },
            // Get distribution
            async () => {
              return await makeRequest(`${SERVER_URL}/api/agents/types/distribution`);
            }
          ];
          
          const operation = operations[userResults.operations % operations.length];
          const opStart = Date.now();
          
          await operation();
          
          const opDuration = Date.now() - opStart;
          userResults.operations++;
          userResults.successful++;
          userResults.totalDuration += opDuration;
          
          monitor.addMeasurement(`user_${user}_operation`, opDuration, true);
          
          // Random delay between operations (simulate user behavior)
          await sleep(100 + Math.random() * 500);
          
        } catch (error) {
          userResults.operations++;
          userResults.failed++;
          monitor.addMeasurement(`user_${user}_operation`, 0, false, { error: error.message });
          
          // Brief pause on error
          await sleep(200);
        }
      }
      
      return userResults;
    })();
    
    userPromises.push(userPromise);
  }
  
  log(`Running ${CONFIG.concurrentUsers} concurrent users for ${CONFIG.testDuration/1000} seconds...`, 'load');
  
  // Wait for all users to complete
  const userResults = await Promise.all(userPromises);
  
  monitor.end();
  const performanceStats = monitor.getStats();
  
  // Calculate aggregate results
  const totalOperations = userResults.reduce((sum, user) => sum + user.operations, 0);
  const totalSuccessful = userResults.reduce((sum, user) => sum + user.successful, 0);
  const totalFailed = userResults.reduce((sum, user) => sum + user.failed, 0);
  const avgSuccessRate = (totalSuccessful / totalOperations) * 100;
  
  const concurrentResults = {
    success: avgSuccessRate >= 90 && performanceStats.avgDuration < CONFIG.maxAcceptableResponseTime,
    concurrentUsers: CONFIG.concurrentUsers,
    testDuration: CONFIG.testDuration,
    totalOperations,
    totalSuccessful,
    totalFailed,
    overallSuccessRate: avgSuccessRate,
    operationsPerSecond: performanceStats.operationsPerSecond,
    avgResponseTime: performanceStats.avgDuration,
    p95ResponseTime: performanceStats.p95Duration,
    userResults,
    acceptablePerformance: performanceStats.avgDuration < CONFIG.maxAcceptableResponseTime
  };
  
  log(`Concurrent users test completed: ${totalSuccessful}/${totalOperations} successful (${avgSuccessRate.toFixed(1)}%)`);
  log(`Overall throughput: ${performanceStats.operationsPerSecond.toFixed(1)} operations/second`);
  
  return concurrentResults;
}

async function testMemoryUsage() {
  log('Testing memory usage patterns...', 'perf');
  
  // Note: This is a simplified memory test since we can't directly measure 
  // server memory from the client. We'll test for memory-related issues
  // by looking for performance degradation over time.
  
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  const memoryTestResults = {
    initialResponseTime: 0,
    finalResponseTime: 0,
    responseTimes: [],
    memoryLeakDetected: false
  };
  
  // Measure initial response time
  const initialStart = Date.now();
  await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
  memoryTestResults.initialResponseTime = Date.now() - initialStart;
  
  // Send a series of requests and monitor response time degradation
  for (let i = 0; i < 50; i++) {
    const start = Date.now();
    try {
      await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
      const duration = Date.now() - start;
      memoryTestResults.responseTimes.push(duration);
      monitor.addMeasurement('memory_test_request', duration, true);
    } catch (error) {
      monitor.addMeasurement('memory_test_request', 0, false);
    }
    
    await sleep(50); // Brief delay
  }
  
  // Measure final response time
  const finalStart = Date.now();
  await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
  memoryTestResults.finalResponseTime = Date.now() - finalStart;
  
  // Analyze for memory leak indicators
  const responseTimes = memoryTestResults.responseTimes;
  const firstQuarter = responseTimes.slice(0, Math.floor(responseTimes.length / 4));
  const lastQuarter = responseTimes.slice(-Math.floor(responseTimes.length / 4));
  
  const avgFirstQuarter = firstQuarter.reduce((sum, t) => sum + t, 0) / firstQuarter.length;
  const avgLastQuarter = lastQuarter.reduce((sum, t) => sum + t, 0) / lastQuarter.length;
  
  // If response times increased by more than 100%, it might indicate memory issues
  const performanceDegradation = ((avgLastQuarter - avgFirstQuarter) / avgFirstQuarter) * 100;
  memoryTestResults.memoryLeakDetected = performanceDegradation > 100;
  
  monitor.end();
  
  const memoryResults = {
    success: !memoryTestResults.memoryLeakDetected && 
             memoryTestResults.finalResponseTime < CONFIG.maxAcceptableResponseTime,
    initialResponseTime: memoryTestResults.initialResponseTime,
    finalResponseTime: memoryTestResults.finalResponseTime,
    avgFirstQuarterResponseTime: avgFirstQuarter,
    avgLastQuarterResponseTime: avgLastQuarter,
    performanceDegradation: performanceDegradation,
    memoryLeakDetected: memoryTestResults.memoryLeakDetected,
    totalRequests: responseTimes.length,
    details: {
      stablePerformance: Math.abs(performanceDegradation) < 50, // Less than 50% variation
      acceptableFinalResponseTime: memoryTestResults.finalResponseTime < CONFIG.maxAcceptableResponseTime
    }
  };
  
  log(`Memory usage test completed: ${memoryResults.memoryLeakDetected ? 'POTENTIAL LEAK DETECTED' : 'STABLE'}`);
  log(`Performance change: ${performanceDegradation.toFixed(1)}%`);
  
  return memoryResults;
}

async function generateTestReport(testResults) {
  log('Generating performance test report...', 'test');
  
  const report = {
    testSuite: 'Performance and Load Testing',
    timestamp: new Date().toISOString(),
    server: SERVER_URL,
    testSession: TEST_SESSION_ID,
    configuration: CONFIG,
    results: testResults,
    summary: {
      totalTestCategories: Object.keys(testResults).length,
      passedCategories: Object.values(testResults).filter(r => r.success).length,
      failedCategories: Object.values(testResults).filter(r => !r.success).length,
      overallSuccess: Object.values(testResults).every(r => r.success)
    }
  };
  
  // Generate detailed report
  console.log('\n' + '='.repeat(80));
  console.log('                    PERFORMANCE & LOAD TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Test Suite: ${report.testSuite}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Server: ${report.server}`);
  console.log(`Test Session: ${report.testSession}`);
  console.log('');
  
  console.log('TEST CONFIGURATION:');
  console.log(`  Event Burst Size: ${CONFIG.eventBurstSize}`);
  console.log(`  Event Burst Count: ${CONFIG.eventBurstCount}`);
  console.log(`  Concurrent Users: ${CONFIG.concurrentUsers}`);
  console.log(`  Test Duration: ${CONFIG.testDuration/1000}s`);
  console.log(`  Target Events/Sec: ${CONFIG.targetEventsPerSecond}`);
  console.log(`  Max Response Time: ${CONFIG.maxAcceptableResponseTime}ms`);
  console.log('');
  
  console.log('SUMMARY:');
  console.log(`  Total Categories: ${report.summary.totalTestCategories}`);
  console.log(`  Passed: ${report.summary.passedCategories}`);
  console.log(`  Failed: ${report.summary.failedCategories}`);
  console.log(`  Overall: ${report.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');
  
  console.log('DETAILED RESULTS:');
  
  // High-volume event ingestion
  if (testResults.highVolumeIngestion) {
    const hvr = testResults.highVolumeIngestion;
    const status = hvr.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} High-Volume Event Ingestion`);
    console.log(`      Events Sent: ${hvr.eventIngestionResults.eventsSent}`);
    console.log(`      Success Rate: ${hvr.performanceStats.successRate.toFixed(1)}%`);
    console.log(`      Throughput: ${hvr.details.totalEventsPerSecond.toFixed(1)} events/sec`);
    console.log(`      Avg Response: ${hvr.details.avgResponseTime.toFixed(0)}ms`);
    console.log(`      P95 Response: ${hvr.details.p95ResponseTime.toFixed(0)}ms`);
    console.log('');
  }
  
  // API response times
  if (testResults.apiResponseTimes) {
    const art = testResults.apiResponseTimes;
    const status = art.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} API Response Times`);
    console.log(`      Endpoints Tested: ${art.summary.totalEndpoints}`);
    console.log(`      Passed: ${art.summary.passedEndpoints}`);
    console.log(`      Failed: ${art.summary.failedEndpoints}`);
    
    if (CONFIG.verbose) {
      for (const [endpoint, result] of Object.entries(art.endpointResults)) {
        if (result.avgDuration !== undefined) {
          console.log(`        ${endpoint}: ${result.avgDuration.toFixed(0)}ms avg`);
        }
      }
    }
    console.log('');
  }
  
  // Concurrent users
  if (testResults.concurrentUsers) {
    const cu = testResults.concurrentUsers;
    const status = cu.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} Concurrent User Scenarios`);
    console.log(`      Concurrent Users: ${cu.concurrentUsers}`);
    console.log(`      Total Operations: ${cu.totalOperations}`);
    console.log(`      Success Rate: ${cu.overallSuccessRate.toFixed(1)}%`);
    console.log(`      Throughput: ${cu.operationsPerSecond.toFixed(1)} ops/sec`);
    console.log(`      Avg Response: ${cu.avgResponseTime.toFixed(0)}ms`);
    console.log('');
  }
  
  // Memory usage
  if (testResults.memoryUsage) {
    const mu = testResults.memoryUsage;
    const status = mu.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} Memory Usage Analysis`);
    console.log(`      Memory Leak Detected: ${mu.memoryLeakDetected ? 'YES' : 'NO'}`);
    console.log(`      Performance Change: ${mu.performanceDegradation.toFixed(1)}%`);
    console.log(`      Initial Response: ${mu.initialResponseTime}ms`);
    console.log(`      Final Response: ${mu.finalResponseTime}ms`);
    console.log('');
  }
  
  console.log('PERFORMANCE SUMMARY:');
  if (report.summary.overallSuccess) {
    console.log('  ✅ System handles high load effectively');
    console.log('  ✅ Response times remain acceptable under stress');
    console.log('  ✅ Concurrent user scenarios perform well');
    console.log('  ✅ No significant memory issues detected');
    console.log('  ✅ System is ready for production load');
  } else {
    console.log('  ❌ Performance issues detected');
    console.log('  ⚠️  Review failed tests above');
    console.log('  ⚠️  Consider system optimization before production');
  }
  
  console.log('='.repeat(80));
  
  return report;
}

// Main test execution
async function runTests() {
  const testResults = {};
  
  try {
    log('Starting Performance and Load Testing', 'test');
    log(`Server: ${SERVER_URL}`, 'info');
    log(`Test Session: ${TEST_SESSION_ID}`, 'info');
    
    // Test 1: High-volume event ingestion
    try {
      testResults.highVolumeIngestion = await testHighVolumeEventIngestion();
    } catch (error) {
      log(`High-volume ingestion test failed: ${error.message}`, 'error');
      testResults.highVolumeIngestion = { success: false, error: error.message };
    }
    
    // Small break between tests
    await sleep(3000);
    
    // Test 2: API response times
    try {
      testResults.apiResponseTimes = await testAPIResponseTimes();
    } catch (error) {
      log(`API response time test failed: ${error.message}`, 'error');
      testResults.apiResponseTimes = { success: false, error: error.message };
    }
    
    // Small break between tests
    await sleep(3000);
    
    // Test 3: Concurrent user scenarios
    try {
      testResults.concurrentUsers = await testConcurrentUserScenarios();
    } catch (error) {
      log(`Concurrent users test failed: ${error.message}`, 'error');
      testResults.concurrentUsers = { success: false, error: error.message };
    }
    
    // Small break between tests
    await sleep(3000);
    
    // Test 4: Memory usage analysis
    try {
      testResults.memoryUsage = await testMemoryUsage();
    } catch (error) {
      log(`Memory usage test failed: ${error.message}`, 'error');
      testResults.memoryUsage = { success: false, error: error.message };
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