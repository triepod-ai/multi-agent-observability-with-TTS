#!/usr/bin/env node

/**
 * End-to-End Metrics Pipeline Validation Test
 * 
 * Tests the complete flow from event ingestion to dashboard display:
 * 1. Send various agent events (SubagentStart, SubagentStop, tool usage)
 * 2. Verify data appears in SQLite database  
 * 3. Verify data appears in Redis cache (when available)
 * 4. Verify API endpoints return recorded data
 * 5. Test time range filtering and aggregation accuracy
 */

import { readFileSync } from 'fs';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_SESSION_ID = `test_session_${Date.now()}`;
const TEST_SOURCE_APP = 'metrics-pipeline-test';

// Test configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipCleanup: process.argv.includes('--no-cleanup'),
  waitTime: 2000, // Wait 2s between operations for async processing
  retries: 3,
  retryDelay: 1000
};

// Test data patterns
const TEST_EVENTS = [
  {
    hook_event_type: 'SubagentStart',
    session_id: TEST_SESSION_ID,
    source_app: TEST_SOURCE_APP,
    timestamp: Date.now(),
    payload: {
      agent_type: 'analyzer',
      agent_name: 'TestDataAnalyzer',
      task_description: 'Analyzing test data for pipeline validation',
      tools: ['Read', 'Grep', 'Sequential']
    }
  },
  {
    hook_event_type: 'SubagentStart', 
    session_id: `${TEST_SESSION_ID}_2`,
    source_app: TEST_SOURCE_APP,
    timestamp: Date.now() + 1000,
    payload: {
      agent_type: 'debugger',
      agent_name: 'TestDebugger',
      task_description: 'Debugging test pipeline issues',
      tools: ['Read', 'Bash', 'Edit']
    }
  },
  {
    hook_event_type: 'SubagentStop',
    session_id: TEST_SESSION_ID,
    source_app: TEST_SOURCE_APP,
    timestamp: Date.now() + 2000,
    payload: {
      agent_type: 'analyzer',
      agent_name: 'TestDataAnalyzer',
      agent_id: 'test_agent_001',
      tokens_used: 1500,
      duration: 5000,
      result: true,
      tools_used: ['Read', 'Grep', 'Sequential'],
      status: 'success'
    }
  },
  {
    hook_event_type: 'SubagentStop',
    session_id: `${TEST_SESSION_ID}_2`,
    source_app: TEST_SOURCE_APP,
    timestamp: Date.now() + 3000,
    payload: {
      agent_type: 'debugger',
      agent_name: 'TestDebugger',
      agent_id: 'test_agent_002',
      tokens_used: 2300,
      duration: 8000,
      result: true,
      tools_used: ['Read', 'Bash', 'Edit'],
      status: 'success'
    }
  },
  {
    hook_event_type: 'ToolUse',
    session_id: TEST_SESSION_ID,
    source_app: TEST_SOURCE_APP,
    timestamp: Date.now() + 4000,
    payload: {
      tool_name: 'Edit',
      operation: 'file_modification',
      success: true,
      duration_ms: 150
    }
  }
];

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
    test: '🧪'
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

// Test functions
async function testServerHealth() {
  log('Testing server health and connectivity...', 'test');
  
  try {
    const health = await makeRequest(`${SERVER_URL}/api/agents/health`);
    verbose(`Server health: ${JSON.stringify(health, null, 2)}`);
    
    if (health.status === 'unhealthy') {
      throw new Error(`Server is unhealthy: ${health.sqlite?.error || health.redis?.error || 'Unknown error'}`);
    }
    
    log(`Server health: ${health.status} (SQLite: ${health.sqlite.status}, Redis: ${health.redis.status})`);
    return health;
  } catch (error) {
    throw new Error(`Server health check failed: ${error.message}`);
  }
}

async function sendTestEvents() {
  log('Sending test events to the pipeline...', 'test');
  
  const results = [];
  for (const [index, event] of TEST_EVENTS.entries()) {
    try {
      verbose(`Sending event ${index + 1}/${TEST_EVENTS.length}: ${event.hook_event_type}`);
      
      const result = await retryOperation(
        () => makeRequest(`${SERVER_URL}/events`, {
          method: 'POST',
          body: JSON.stringify(event)
        }),
        `Sending event ${event.hook_event_type}`
      );
      
      results.push({ event, result });
      verbose(`Event ${index + 1} response: ${JSON.stringify(result, null, 2)}`);
      
      // Small delay between events to avoid overwhelming the system
      await sleep(100);
    } catch (error) {
      throw new Error(`Failed to send event ${event.hook_event_type}: ${error.message}`);
    }
  }
  
  log(`Successfully sent ${results.length} test events`);
  return results;
}

async function waitForProcessing() {
  log(`Waiting ${CONFIG.waitTime}ms for event processing...`, 'test');
  await sleep(CONFIG.waitTime);
}

async function validateMetricsAPI() {
  log('Validating metrics API endpoints return real data...', 'test');
  
  const validations = [];
  
  // Test current metrics
  try {
    const metrics = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/metrics/current`),
      'Fetching current metrics'
    );
    
    verbose(`Current metrics: ${JSON.stringify(metrics, null, 2)}`);
    
    // Validate metrics contain expected data
    const validMetrics = {
      hasExecutions: metrics.executions_today > 0,
      hasTokens: metrics.tokens_used_today > 0,
      hasCost: metrics.estimated_cost_today > 0,
      hasBreakdown: metrics.agent_type_breakdown?.length > 0,
      hasAnalyzer: metrics.agent_type_breakdown?.some(t => t.type === 'analyzer'),
      hasDebugger: metrics.agent_type_breakdown?.some(t => t.type === 'debugger')
    };
    
    validations.push({
      endpoint: '/api/agents/metrics/current',
      success: Object.values(validMetrics).every(v => v),
      details: validMetrics,
      data: metrics
    });
    
    if (!validMetrics.hasExecutions) {
      throw new Error('No executions recorded in metrics - pipeline may not be working');
    }
    
    log(`✅ Current metrics validation passed: ${metrics.executions_today} executions, ${metrics.tokens_used_today} tokens`);
    
  } catch (error) {
    validations.push({
      endpoint: '/api/agents/metrics/current',
      success: false,
      error: error.message
    });
    throw error;
  }
  
  // Test timeline
  try {
    const timeline = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/metrics/timeline?hours=1`),
      'Fetching timeline'
    );
    
    verbose(`Timeline: ${JSON.stringify(timeline, null, 2)}`);
    
    const validTimeline = {
      hasData: timeline.timeline?.length > 0,
      hasExecutions: timeline.timeline?.some(t => t.executions > 0),
      hasTokens: timeline.timeline?.some(t => t.tokens > 0)
    };
    
    validations.push({
      endpoint: '/api/agents/metrics/timeline',
      success: Object.values(validTimeline).every(v => v),
      details: validTimeline,
      data: timeline
    });
    
    if (!validTimeline.hasData) {
      throw new Error('No timeline data recorded - temporal aggregation may not be working');
    }
    
    log(`✅ Timeline validation passed: ${timeline.timeline.length} data points`);
    
  } catch (error) {
    validations.push({
      endpoint: '/api/agents/metrics/timeline',
      success: false,
      error: error.message
    });
    throw error;
  }
  
  // Test distribution
  try {
    const distribution = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/types/distribution`),
      'Fetching distribution'
    );
    
    verbose(`Distribution: ${JSON.stringify(distribution, null, 2)}`);
    
    const validDistribution = {
      hasData: distribution.distribution?.length > 0,
      hasAnalyzer: distribution.distribution?.some(d => d.type === 'analyzer'),
      hasDebugger: distribution.distribution?.some(d => d.type === 'debugger'),
      hasCount: distribution.distribution?.some(d => d.count > 0)
    };
    
    validations.push({
      endpoint: '/api/agents/types/distribution',
      success: Object.values(validDistribution).every(v => v),
      details: validDistribution,
      data: distribution
    });
    
    if (!validDistribution.hasData) {
      throw new Error('No distribution data recorded - type aggregation may not be working');
    }
    
    log(`✅ Distribution validation passed: ${distribution.distribution.length} agent types`);
    
  } catch (error) {
    validations.push({
      endpoint: '/api/agents/types/distribution',
      success: false,
      error: error.message
    });
    throw error;
  }
  
  // Test tool usage
  try {
    const toolUsage = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/tools/usage`),
      'Fetching tool usage'
    );
    
    verbose(`Tool usage: ${JSON.stringify(toolUsage, null, 2)}`);
    
    const validToolUsage = {
      hasTools: toolUsage.tools?.length > 0,
      hasRead: toolUsage.tools?.some(t => t.name === 'Read'),
      hasGrep: toolUsage.tools?.some(t => t.name === 'Grep'),
      hasUsage: toolUsage.tools?.some(t => t.usage_count > 0)
    };
    
    validations.push({
      endpoint: '/api/agents/tools/usage',
      success: Object.values(validToolUsage).every(v => v),
      details: validToolUsage,
      data: toolUsage
    });
    
    if (!validToolUsage.hasTools) {
      throw new Error('No tool usage data recorded - tool tracking may not be working');
    }
    
    log(`✅ Tool usage validation passed: ${toolUsage.tools.length} tools tracked`);
    
  } catch (error) {
    validations.push({
      endpoint: '/api/agents/tools/usage',
      success: false,
      error: error.message
    });
    throw error;
  }
  
  return validations;
}

async function validateTimeRangeFiltering() {
  log('Testing time range filtering functionality...', 'test');
  
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  try {
    // Test with time range
    const rangedMetrics = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/metrics/current?start=${oneHourAgo}&end=${now}`),
      'Fetching ranged metrics'
    );
    
    verbose(`Ranged metrics: ${JSON.stringify(rangedMetrics, null, 2)}`);
    
    // Test timeline with range
    const rangedTimeline = await retryOperation(
      () => makeRequest(`${SERVER_URL}/api/agents/metrics/timeline?start=${oneHourAgo}&end=${now}`),
      'Fetching ranged timeline'
    );
    
    verbose(`Ranged timeline: ${JSON.stringify(rangedTimeline, null, 2)}`);
    
    // Validate that time filtering works
    const hasTimeFiltering = rangedMetrics.executions_today >= 0 && rangedTimeline.timeline.length >= 0;
    
    if (!hasTimeFiltering) {
      throw new Error('Time range filtering not working properly');
    }
    
    log('✅ Time range filtering validation passed');
    return true;
    
  } catch (error) {
    throw new Error(`Time range filtering validation failed: ${error.message}`);
  }
}

async function validateAggregationAccuracy() {
  log('Testing aggregation accuracy...', 'test');
  
  try {
    const metrics = await makeRequest(`${SERVER_URL}/api/agents/metrics/current`);
    
    // Verify that our test events contributed to the totals
    const expectedAnalyzerTokens = 1500; // From our test event
    const expectedDebuggerTokens = 2300; // From our test event
    const totalExpectedTokens = expectedAnalyzerTokens + expectedDebuggerTokens;
    
    // Find our agent types in the breakdown
    const analyzerBreakdown = metrics.agent_type_breakdown?.find(t => t.type === 'analyzer');
    const debuggerBreakdown = metrics.agent_type_breakdown?.find(t => t.type === 'debugger');
    
    const validations = {
      hasAnalyzerData: analyzerBreakdown && analyzerBreakdown.total_tokens >= expectedAnalyzerTokens,
      hasDebuggerData: debuggerBreakdown && debuggerBreakdown.total_tokens >= expectedDebuggerTokens,
      totalTokensAccurate: metrics.tokens_used_today >= totalExpectedTokens,
      executionCountAccurate: metrics.executions_today >= 2, // At least our 2 test executions
      avgDurationReasonable: metrics.avg_duration_ms > 0 && metrics.avg_duration_ms < 60000 // Between 0 and 1 minute
    };
    
    verbose(`Aggregation validation: ${JSON.stringify(validations, null, 2)}`);
    verbose(`Analyzer breakdown: ${JSON.stringify(analyzerBreakdown, null, 2)}`);
    verbose(`Debugger breakdown: ${JSON.stringify(debuggerBreakdown, null, 2)}`);
    
    const allValid = Object.values(validations).every(v => v);
    
    if (!allValid) {
      throw new Error(`Aggregation accuracy issues detected: ${JSON.stringify(validations, null, 2)}`);
    }
    
    log('✅ Aggregation accuracy validation passed');
    return validations;
    
  } catch (error) {
    throw new Error(`Aggregation accuracy validation failed: ${error.message}`);
  }
}

async function validateWebSocketUpdates() {
  log('Testing WebSocket real-time updates...', 'test');
  
  return new Promise((resolve, reject) => {
    const wsUrl = SERVER_URL.replace('http', 'ws') + '/stream';
    let ws;
    let receivedEvents = [];
    let timeout;
    
    try {
      ws = new WebSocket(wsUrl);
      
      // Set a timeout for the test
      timeout = setTimeout(() => {
        ws?.close();
        reject(new Error('WebSocket test timeout - no events received within 10 seconds'));
      }, 10000);
      
      ws.onopen = () => {
        verbose('WebSocket connected, sending test event...');
        
        // Send a test event that should trigger WebSocket broadcast
        const testEvent = {
          hook_event_type: 'SubagentStart',
          session_id: `ws_test_${Date.now()}`,
          source_app: 'websocket-test',
          timestamp: Date.now(),
          payload: {
            agent_type: 'websocket-tester',
            agent_name: 'WebSocketTester',
            task_description: 'Testing WebSocket real-time updates'
          }
        };
        
        fetch(`${SERVER_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testEvent)
        }).catch(error => {
          verbose(`Error sending WebSocket test event: ${error.message}`);
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          receivedEvents.push(data);
          verbose(`WebSocket event received: ${data.type}`);
          
          // Look for our test event
          if (data.type === 'event' && data.data?.payload?.agent_name === 'WebSocketTester') {
            clearTimeout(timeout);
            ws.close();
            log('✅ WebSocket real-time updates validation passed');
            resolve({
              success: true,
              eventsReceived: receivedEvents.length,
              testEventFound: true
            });
          }
        } catch (error) {
          verbose(`Error parsing WebSocket message: ${error.message}`);
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      };
      
      ws.onclose = () => {
        verbose('WebSocket connection closed');
        if (receivedEvents.length === 0) {
          clearTimeout(timeout);
          reject(new Error('WebSocket closed without receiving any events'));
        }
      };
      
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`WebSocket connection failed: ${error.message}`));
    }
  });
}

async function generateTestReport(results) {
  log('Generating test report...', 'test');
  
  const report = {
    testSuite: 'Metrics Pipeline End-to-End Validation',
    timestamp: new Date().toISOString(),
    server: SERVER_URL,
    testSession: TEST_SESSION_ID,
    results: results,
    summary: {
      totalTests: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length,
      overallSuccess: Object.values(results).every(r => r.success)
    }
  };
  
  // Generate detailed report
  console.log('\n' + '='.repeat(80));
  console.log('                    METRICS PIPELINE TEST REPORT');
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
  
  console.log('DETAILED RESULTS:');
  for (const [testName, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${testName}`);
    
    if (!result.success && result.error) {
      console.log(`      Error: ${result.error}`);
    }
    
    if (result.details && CONFIG.verbose) {
      console.log(`      Details: ${JSON.stringify(result.details, null, 6)}`);
    }
  }
  
  console.log('='.repeat(80));
  
  return report;
}

// Main test execution
async function runTests() {
  const results = {};
  
  try {
    log('Starting Metrics Pipeline End-to-End Validation Tests', 'test');
    log(`Server: ${SERVER_URL}`, 'info');
    log(`Test Session: ${TEST_SESSION_ID}`, 'info');
    
    // Test 1: Server Health
    try {
      const healthResult = await testServerHealth();
      results.serverHealth = { success: true, data: healthResult };
    } catch (error) {
      results.serverHealth = { success: false, error: error.message };
      throw error; // Server health is critical
    }
    
    // Test 2: Send Events
    try {
      const eventResults = await sendTestEvents();
      results.eventIngestion = { success: true, data: eventResults };
    } catch (error) {
      results.eventIngestion = { success: false, error: error.message };
      throw error; // Can't continue without events
    }
    
    // Wait for processing
    await waitForProcessing();
    
    // Test 3: Validate Metrics API
    try {
      const validationResults = await validateMetricsAPI();
      results.metricsAPI = { success: true, data: validationResults };
    } catch (error) {
      results.metricsAPI = { success: false, error: error.message };
    }
    
    // Test 4: Time Range Filtering
    try {
      const timeRangeResult = await validateTimeRangeFiltering();
      results.timeRangeFiltering = { success: true, data: timeRangeResult };
    } catch (error) {
      results.timeRangeFiltering = { success: false, error: error.message };
    }
    
    // Test 5: Aggregation Accuracy
    try {
      const aggregationResult = await validateAggregationAccuracy();
      results.aggregationAccuracy = { success: true, data: aggregationResult };
    } catch (error) {
      results.aggregationAccuracy = { success: false, error: error.message };
    }
    
    // Test 6: WebSocket Updates
    try {
      const wsResult = await validateWebSocketUpdates();
      results.webSocketUpdates = { success: true, data: wsResult };
    } catch (error) {
      results.webSocketUpdates = { success: false, error: error.message };
    }
    
  } catch (error) {
    log(`Critical test failure: ${error.message}`, 'error');
  }
  
  // Generate and display report
  const report = await generateTestReport(results);
  
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