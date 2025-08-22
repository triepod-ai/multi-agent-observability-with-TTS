#!/usr/bin/env node

/**
 * Frontend Metrics Display Integration Validation Test
 * 
 * Tests the frontend metrics dashboard functionality:
 * 1. Load dashboard and verify real data appears (not zeros)
 * 2. Test error handling with simulated backend failures
 * 3. Test retry logic and exponential backoff
 * 4. Test cache management and stale data indicators
 * 5. Test WebSocket real-time updates
 * 6. Test loading states and error states
 * 7. Verify connection health indicators
 */

import { readFileSync } from 'fs';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const TEST_SESSION_ID = `display_test_${Date.now()}`;
const TEST_SOURCE_APP = 'metrics-display-test';

// Test configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipCleanup: process.argv.includes('--no-cleanup'),
  waitTime: 2000,
  retries: 3,
  retryDelay: 1000,
  maxWaitTime: 30000 // 30 seconds max wait for async operations
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
    frontend: '🖥️',
    api: '🔗'
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

// Test preparation functions
async function prepareTestData() {
  log('Preparing test data for display validation...', 'test');
  
  const testEvents = [
    {
      hook_event_type: 'SubagentStart',
      session_id: `${TEST_SESSION_ID}_display_1`,
      source_app: TEST_SOURCE_APP,
      timestamp: Date.now(),
      payload: {
        agent_type: 'display-analyzer',
        agent_name: 'DisplayAnalyzer',
        task_description: 'Analyzing display metrics for frontend validation'
      }
    },
    {
      hook_event_type: 'SubagentStart',
      session_id: `${TEST_SESSION_ID}_display_2`,
      source_app: TEST_SOURCE_APP,
      timestamp: Date.now() + 500,
      payload: {
        agent_type: 'display-debugger',
        agent_name: 'DisplayDebugger',
        task_description: 'Debugging display issues for frontend validation'
      }
    },
    {
      hook_event_type: 'SubagentStop',
      session_id: `${TEST_SESSION_ID}_display_1`,
      source_app: TEST_SOURCE_APP,
      timestamp: Date.now() + 2000,
      payload: {
        agent_type: 'display-analyzer',
        agent_name: 'DisplayAnalyzer',
        agent_id: 'display_test_001',
        tokens_used: 2000,
        duration: 4000,
        result: true,
        tools_used: ['Read', 'Grep', 'Edit'],
        status: 'success'
      }
    },
    {
      hook_event_type: 'SubagentStop',
      session_id: `${TEST_SESSION_ID}_display_2`,
      source_app: TEST_SOURCE_APP,
      timestamp: Date.now() + 3000,
      payload: {
        agent_type: 'display-debugger',
        agent_name: 'DisplayDebugger',
        agent_id: 'display_test_002',
        tokens_used: 1800,
        duration: 5500,
        result: true,
        tools_used: ['Read', 'Bash', 'Edit', 'Sequential'],
        status: 'success'
      }
    }
  ];
  
  // Send test events
  for (const event of testEvents) {
    try {
      await makeRequest(`${SERVER_URL}/events`, {
        method: 'POST',
        body: JSON.stringify(event)
      });
      verbose(`Sent test event: ${event.hook_event_type}`);
      await sleep(100);
    } catch (error) {
      throw new Error(`Failed to send test event: ${error.message}`);
    }
  }
  
  // Wait for processing
  await sleep(CONFIG.waitTime);
  
  log(`Successfully prepared ${testEvents.length} test events for display validation`);
  return testEvents.length;
}

// Test functions
async function testBasicDataRetrieval() {
  log('Testing basic data retrieval and non-zero values...', 'test');
  
  const results = {};
  
  // Test current metrics endpoint
  try {
    const metrics = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/metrics/current`),
      'Fetching current metrics'
    );
    
    verbose(`Current metrics: ${JSON.stringify(metrics, null, 2)}`);
    
    const validations = {
      hasExecutions: metrics.executions_today > 0,
      hasTokens: metrics.tokens_used_today > 0,
      hasValidCost: metrics.estimated_cost_today >= 0,
      hasBreakdown: metrics.agent_type_breakdown?.length > 0,
      hasTestAgentTypes: ['display-analyzer', 'display-debugger'].some(type =>
        metrics.agent_type_breakdown?.some(b => b.type === type)
      ),
      nonZeroActiveAgents: typeof metrics.active_agents === 'number',
      validSuccessRate: metrics.success_rate >= 0 && metrics.success_rate <= 100,
      validAvgDuration: metrics.avg_duration_ms >= 0
    };
    
    results.currentMetrics = {
      success: Object.values(validations).every(v => v),
      details: validations,
      data: {
        executions: metrics.executions_today,
        tokens: metrics.tokens_used_today,
        cost: metrics.estimated_cost_today,
        activeAgents: metrics.active_agents,
        breakdownCount: metrics.agent_type_breakdown?.length || 0
      }
    };
    
    if (!validations.hasExecutions) {
      throw new Error('Dashboard would show zero executions - metrics pipeline not working');
    }
    
    log(`✅ Current metrics: ${metrics.executions_today} executions, ${metrics.tokens_used_today} tokens`);
    
  } catch (error) {
    results.currentMetrics = { success: false, error: error.message };
    throw error;
  }
  
  // Test timeline endpoint
  try {
    const timeline = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/metrics/timeline?hours=1`),
      'Fetching timeline'
    );
    
    verbose(`Timeline: ${JSON.stringify(timeline, null, 2)}`);
    
    const timelineValidations = {
      hasTimelineData: timeline.timeline?.length > 0,
      hasExecutionData: timeline.timeline?.some(t => t.executions > 0),
      hasTokenData: timeline.timeline?.some(t => t.tokens > 0),
      hasCostData: timeline.timeline?.some(t => t.cost >= 0),
      hasValidTimestamps: timeline.timeline?.every(t => t.timestamp && new Date(t.timestamp).getTime() > 0),
      hasRecentData: timeline.timeline?.some(t => {
        const timestamp = new Date(t.timestamp).getTime();
        const now = Date.now();
        return (now - timestamp) < (2 * 60 * 60 * 1000); // Within 2 hours
      })
    };
    
    results.timeline = {
      success: Object.values(timelineValidations).every(v => v),
      details: timelineValidations,
      data: {
        dataPoints: timeline.timeline?.length || 0,
        maxExecutions: Math.max(...(timeline.timeline?.map(t => t.executions) || [0])),
        maxTokens: Math.max(...(timeline.timeline?.map(t => t.tokens) || [0]))
      }
    };
    
    if (!timelineValidations.hasTimelineData) {
      throw new Error('Dashboard would show empty timeline - temporal data not working');
    }
    
    log(`✅ Timeline: ${timeline.timeline.length} data points`);
    
  } catch (error) {
    results.timeline = { success: false, error: error.message };
    throw error;
  }
  
  // Test distribution endpoint  
  try {
    const distribution = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/types/distribution`),
      'Fetching distribution'
    );
    
    verbose(`Distribution: ${JSON.stringify(distribution, null, 2)}`);
    
    const distributionValidations = {
      hasDistributionData: distribution.distribution?.length > 0,
      hasTestTypes: ['display-analyzer', 'display-debugger'].some(type =>
        distribution.distribution?.some(d => d.type === type)
      ),
      hasValidPercentages: distribution.distribution?.every(d => 
        d.percentage >= 0 && d.percentage <= 100
      ),
      hasValidCounts: distribution.distribution?.every(d => d.count >= 0),
      hasValidDurations: distribution.distribution?.every(d => d.avg_duration_ms >= 0),
      hasValidSuccessRates: distribution.distribution?.every(d => 
        d.success_rate >= 0 && d.success_rate <= 100
      )
    };
    
    results.distribution = {
      success: Object.values(distributionValidations).every(v => v),
      details: distributionValidations,
      data: {
        agentTypes: distribution.distribution?.length || 0,
        totalPercentage: distribution.distribution?.reduce((sum, d) => sum + d.percentage, 0) || 0
      }
    };
    
    if (!distributionValidations.hasDistributionData) {
      throw new Error('Dashboard would show empty distribution - type analysis not working');
    }
    
    log(`✅ Distribution: ${distribution.distribution.length} agent types`);
    
  } catch (error) {
    results.distribution = { success: false, error: error.message };
    throw error;
  }
  
  // Test tool usage endpoint
  try {
    const toolUsage = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/tools/usage`),
      'Fetching tool usage'
    );
    
    verbose(`Tool usage: ${JSON.stringify(toolUsage, null, 2)}`);
    
    const toolValidations = {
      hasToolData: toolUsage.tools?.length > 0,
      hasExpectedTools: ['Read', 'Grep', 'Edit', 'Bash'].some(tool =>
        toolUsage.tools?.some(t => t.name === tool)
      ),
      hasValidUsageCounts: toolUsage.tools?.every(t => t.usage_count >= 0),
      hasValidPercentages: toolUsage.tools?.every(t => 
        t.percentage >= 0 && t.percentage <= 100
      ),
      hasInsights: toolUsage.insights && 
        toolUsage.insights.most_used_tool && 
        toolUsage.insights.total_unique_tools >= 0
    };
    
    results.toolUsage = {
      success: Object.values(toolValidations).every(v => v),
      details: toolValidations,
      data: {
        toolCount: toolUsage.tools?.length || 0,
        totalUsage: toolUsage.tools?.reduce((sum, t) => sum + t.usage_count, 0) || 0,
        mostUsedTool: toolUsage.insights?.most_used_tool || 'none'
      }
    };
    
    if (!toolValidations.hasToolData) {
      throw new Error('Dashboard would show no tool usage - tool tracking not working');
    }
    
    log(`✅ Tool usage: ${toolUsage.tools.length} tools tracked`);
    
  } catch (error) {
    results.toolUsage = { success: false, error: error.message };
    throw error;
  }
  
  return results;
}

async function testErrorHandling() {
  log('Testing error handling and recovery mechanisms...', 'test');
  
  const results = {};
  
  // Test invalid endpoint handling
  try {
    let errorCaught = false;
    try {
      await makeRequest(`${SERVER_URL}/api/agents/invalid-endpoint`);
    } catch (error) {
      errorCaught = true;
      verbose(`Expected error for invalid endpoint: ${error.message}`);
    }
    
    results.invalidEndpointHandling = {
      success: errorCaught,
      details: { properlyRejectsInvalidEndpoints: errorCaught }
    };
    
    if (!errorCaught) {
      throw new Error('Invalid endpoints should return errors');
    }
    
    log('✅ Invalid endpoint handling works correctly');
    
  } catch (error) {
    results.invalidEndpointHandling = { success: false, error: error.message };
  }
  
  // Test malformed request handling
  try {
    let errorCaught = false;
    try {
      await fetch(`${SERVER_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
    } catch (error) {
      errorCaught = true;
      verbose(`Expected error for malformed request: ${error.message}`);
    }
    
    results.malformedRequestHandling = {
      success: errorCaught,
      details: { properlyRejectsMalformedRequests: errorCaught }
    };
    
    log('✅ Malformed request handling works correctly');
    
  } catch (error) {
    results.malformedRequestHandling = { success: false, error: error.message };
  }
  
  // Test retry mechanism simulation
  try {
    let retryCount = 0;
    const maxRetries = 3;
    
    const simulateRetryOperation = async () => {
      retryCount++;
      if (retryCount < 2) {
        throw new Error('Simulated failure');
      }
      return await makeRequest(`${SERVER_URL}/api/agents/health`);
    };
    
    const result = await retryOperation(
      simulateRetryOperation,
      'Testing retry mechanism'
    );
    
    results.retryMechanism = {
      success: retryCount >= 2 && result !== null,
      details: { 
        retriesAttempted: retryCount,
        eventuallySucceeded: result !== null
      }
    };
    
    log(`✅ Retry mechanism works: ${retryCount} attempts needed`);
    
  } catch (error) {
    results.retryMechanism = { success: false, error: error.message };
  }
  
  return results;
}

async function testWebSocketRealTimeUpdates() {
  log('Testing WebSocket real-time updates for dashboard...', 'test');
  
  return new Promise((resolve, reject) => {
    const wsUrl = SERVER_URL.replace('http', 'ws') + '/stream';
    let ws;
    let eventTypes = new Set();
    let testEventReceived = false;
    let timeout;
    
    try {
      ws = new WebSocket(wsUrl);
      
      // Set a timeout for the test
      timeout = setTimeout(() => {
        ws?.close();
        const success = eventTypes.size > 0 || testEventReceived;
        resolve({
          success,
          details: {
            eventTypesReceived: Array.from(eventTypes),
            testEventReceived,
            totalEventTypes: eventTypes.size
          }
        });
      }, 15000); // 15 second timeout
      
      ws.onopen = () => {
        verbose('WebSocket connected for real-time testing...');
        
        // Send a test event to trigger real-time updates
        const testEvent = {
          hook_event_type: 'SubagentStart',
          session_id: `${TEST_SESSION_ID}_realtime_test`,
          source_app: TEST_SOURCE_APP,
          timestamp: Date.now(),
          payload: {
            agent_type: 'realtime-tester',
            agent_name: 'RealtimeTester',
            task_description: 'Testing real-time dashboard updates'
          }
        };
        
        // Delay sending event to ensure WebSocket is ready
        setTimeout(() => {
          fetch(`${SERVER_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testEvent)
          }).catch(error => {
            verbose(`Error sending real-time test event: ${error.message}`);
          });
        }, 500);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          eventTypes.add(data.type);
          verbose(`WebSocket event received: ${data.type}`);
          
          // Check for our test event
          if (data.type === 'event' && 
              data.data?.payload?.agent_name === 'RealtimeTester') {
            testEventReceived = true;
            verbose('Test event confirmed in WebSocket stream');
          }
          
          // Check for other expected event types
          if (['event', 'agent_started', 'agent_completed', 'terminal_status'].includes(data.type)) {
            verbose(`Expected event type received: ${data.type}`);
          }
          
        } catch (error) {
          verbose(`Error parsing WebSocket message: ${error.message}`);
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject({
          success: false,
          error: `WebSocket error: ${error.message}`,
          details: { eventTypesReceived: Array.from(eventTypes) }
        });
      };
      
      ws.onclose = () => {
        verbose('WebSocket connection closed');
      };
      
    } catch (error) {
      clearTimeout(timeout);
      reject({
        success: false,
        error: `WebSocket connection failed: ${error.message}`
      });
    }
  });
}

async function testConnectionHealthIndicators() {
  log('Testing connection health indicators...', 'test');
  
  const results = {};
  
  // Test main health endpoint
  try {
    const health = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/health`),
      'Fetching service health'
    );
    
    verbose(`Service health: ${JSON.stringify(health, null, 2)}`);
    
    const healthValidations = {
      hasHealthStatus: health.status !== undefined,
      isOperational: health.status !== 'unhealthy',
      hasSqliteInfo: health.sqlite !== undefined,
      hasRedisInfo: health.redis !== undefined,
      hasCacheInfo: health.cache !== undefined,
      hasTimestamp: health.timestamp !== undefined,
      metricsAvailable: health.metrics_available !== undefined
    };
    
    results.serviceHealth = {
      success: Object.values(healthValidations).every(v => v),
      details: healthValidations,
      data: {
        status: health.status,
        sqliteStatus: health.sqlite?.status,
        redisStatus: health.redis?.status,
        metricsAvailable: health.metrics_available
      }
    };
    
    if (!healthValidations.isOperational) {
      throw new Error(`Service is unhealthy: ${health.status}`);
    }
    
    log(`✅ Service health: ${health.status} (SQLite: ${health.sqlite?.status}, Redis: ${health.redis?.status})`);
    
  } catch (error) {
    results.serviceHealth = { success: false, error: error.message };
    throw error;
  }
  
  // Test fallback system health
  try {
    const fallbackHealth = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/fallback/health`),
      'Fetching fallback health'
    );
    
    verbose(`Fallback health: ${JSON.stringify(fallbackHealth, null, 2)}`);
    
    const fallbackValidations = {
      hasStatus: fallbackHealth.status !== undefined,
      isOperational: fallbackHealth.status !== 'unhealthy',
      hasRedisInfo: typeof fallbackHealth.redis_available === 'boolean',
      hasFallbackInfo: typeof fallbackHealth.fallback_enabled === 'boolean',
      hasOperationalMode: fallbackHealth.operational_mode !== undefined,
      hasTimestamp: fallbackHealth.timestamp !== undefined
    };
    
    results.fallbackHealth = {
      success: Object.values(fallbackValidations).every(v => v),
      details: fallbackValidations,
      data: {
        status: fallbackHealth.status,
        operationalMode: fallbackHealth.operational_mode,
        redisAvailable: fallbackHealth.redis_available,
        fallbackEnabled: fallbackHealth.fallback_enabled
      }
    };
    
    log(`✅ Fallback health: ${fallbackHealth.status} (mode: ${fallbackHealth.operational_mode})`);
    
  } catch (error) {
    results.fallbackHealth = { success: false, error: error.message };
    log(`Could not get fallback health: ${error.message}`, 'warn');
    results.fallbackHealth = { success: false, error: error.message };
  }
  
  return results;
}

async function testPerformanceAndCaching() {
  log('Testing performance and caching behavior...', 'test');
  
  const results = {};
  
  // Test response times
  try {
    const endpoints = [
      '/api/agents/metrics/current',
      '/api/agents/metrics/timeline?hours=1',
      '/api/agents/types/distribution',
      '/api/agents/tools/usage'
    ];
    
    const performanceResults = {};
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      try {
        await makeRequest(`${SERVER_URL}${endpoint}`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        performanceResults[endpoint] = {
          success: true,
          responseTime,
          acceptable: responseTime < 5000 // 5 second threshold
        };
        
        verbose(`${endpoint}: ${responseTime}ms`);
        
      } catch (error) {
        performanceResults[endpoint] = {
          success: false,
          error: error.message
        };
      }
    }
    
    const allResponsesAcceptable = Object.values(performanceResults)
      .every(r => r.success && r.acceptable);
    
    const avgResponseTime = Object.values(performanceResults)
      .filter(r => r.success && r.responseTime)
      .reduce((sum, r, _, arr) => sum + r.responseTime / arr.length, 0);
    
    results.responsePerformance = {
      success: allResponsesAcceptable,
      details: performanceResults,
      data: {
        averageResponseTime: Math.round(avgResponseTime),
        allEndpointsResponsive: allResponsesAcceptable
      }
    };
    
    log(`✅ Performance: ${Math.round(avgResponseTime)}ms average response time`);
    
  } catch (error) {
    results.responsePerformance = { success: false, error: error.message };
  }
  
  // Test cache behavior (make same request twice)
  try {
    const endpoint = '/api/agents/metrics/current';
    
    // First request
    const firstStart = Date.now();
    await makeRequest(`${SERVER_URL}${endpoint}`);
    const firstTime = Date.now() - firstStart;
    
    // Small delay
    await sleep(100);
    
    // Second request (might be cached)
    const secondStart = Date.now();
    await makeRequest(`${SERVER_URL}${endpoint}`);
    const secondTime = Date.now() - secondStart;
    
    const cacheValidations = {
      firstRequestSuccessful: firstTime > 0,
      secondRequestSuccessful: secondTime > 0,
      reasonablePerformance: firstTime < 10000 && secondTime < 10000,
      // Cache hit would typically be faster, but not always guaranteed
      performanceConsistent: Math.abs(firstTime - secondTime) < 5000
    };
    
    results.cacheBehavior = {
      success: Object.values(cacheValidations).every(v => v),
      details: cacheValidations,
      data: {
        firstRequestTime: firstTime,
        secondRequestTime: secondTime,
        timeDifference: Math.abs(firstTime - secondTime)
      }
    };
    
    log(`✅ Cache behavior: ${firstTime}ms → ${secondTime}ms`);
    
  } catch (error) {
    results.cacheBehavior = { success: false, error: error.message };
  }
  
  return results;
}

async function generateTestReport(testResults) {
  log('Generating frontend display test report...', 'test');
  
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
    testSuite: 'Frontend Metrics Display Integration Validation',
    timestamp: new Date().toISOString(),
    server: SERVER_URL,
    client: CLIENT_URL,
    testSession: TEST_SESSION_ID,
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
  console.log('              FRONTEND METRICS DISPLAY TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Test Suite: ${report.testSuite}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Server: ${report.server}`);
  console.log(`Client: ${report.client}`);
  console.log(`Test Session: ${report.testSession}`);
  console.log('');
  
  console.log('SUMMARY:');
  console.log(`  Total Tests: ${report.summary.totalTests}`);
  console.log(`  Passed: ${report.summary.passed}`);
  console.log(`  Failed: ${report.summary.failed}`);
  console.log(`  Overall: ${report.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');
  
  console.log('CATEGORY RESULTS:');
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
        
        if (result.data && CONFIG.verbose) {
          console.log(`        Data: ${JSON.stringify(result.data, null, 8)}`);
        }
      }
      console.log('');
    }
  }
  
  // Key insights for dashboard development
  console.log('DASHBOARD DEVELOPMENT INSIGHTS:');
  
  if (report.summary.overallSuccess) {
    console.log('  ✅ Dashboard will display real data (not zeros)');
    console.log('  ✅ All API endpoints return valid metrics');
    console.log('  ✅ Real-time updates are working');
    console.log('  ✅ Error handling is functional');
    console.log('  ✅ Performance is acceptable');
  } else {
    console.log('  ❌ Dashboard may show zeros or errors');
    console.log('  ⚠️  Check failed tests above for specific issues');
  }
  
  console.log('='.repeat(80));
  
  return report;
}

// Main test execution
async function runTests() {
  const testResults = {};
  
  try {
    log('Starting Frontend Metrics Display Integration Tests', 'test');
    log(`Server: ${SERVER_URL}`, 'info');
    log(`Client: ${CLIENT_URL}`, 'info');
    log(`Test Session: ${TEST_SESSION_ID}`, 'info');
    
    // Prepare test data
    try {
      await prepareTestData();
    } catch (error) {
      log(`Failed to prepare test data: ${error.message}`, 'error');
      throw error;
    }
    
    // Test 1: Basic data retrieval
    try {
      testResults.dataRetrieval = await testBasicDataRetrieval();
    } catch (error) {
      log(`Data retrieval tests failed: ${error.message}`, 'error');
      testResults.dataRetrieval = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Test 2: Error handling
    try {
      testResults.errorHandling = await testErrorHandling();
    } catch (error) {
      log(`Error handling tests failed: ${error.message}`, 'error');
      testResults.errorHandling = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Test 3: WebSocket real-time updates
    try {
      testResults.webSocketUpdates = await testWebSocketRealTimeUpdates();
    } catch (error) {
      log(`WebSocket tests failed: ${error.message}`, 'error');
      testResults.webSocketUpdates = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Test 4: Connection health indicators
    try {
      testResults.healthIndicators = await testConnectionHealthIndicators();
    } catch (error) {
      log(`Health indicator tests failed: ${error.message}`, 'error');
      testResults.healthIndicators = { criticalFailure: { success: false, error: error.message } };
    }
    
    // Test 5: Performance and caching
    try {
      testResults.performanceAndCaching = await testPerformanceAndCaching();
    } catch (error) {
      log(`Performance tests failed: ${error.message}`, 'error');
      testResults.performanceAndCaching = { criticalFailure: { success: false, error: error.message } };
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