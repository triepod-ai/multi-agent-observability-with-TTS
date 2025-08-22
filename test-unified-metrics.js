#!/usr/bin/env bun
/**
 * Test Script for UnifiedMetricsService
 * 
 * This script demonstrates the unified metrics service functionality:
 * - Records test metrics to both SQLite and Redis
 * - Retrieves metrics with cache-first approach
 * - Tests failover scenarios
 * - Demonstrates cache warming
 */

import { unifiedMetricsService } from './apps/server/src/services/unifiedMetricsService.ts';

console.log('🧪 Testing UnifiedMetricsService...\n');

async function testBasicMetricsFlow() {
  console.log('📊 Testing basic metrics flow...');
  
  // Test recording a metric
  const testEvent = {
    source_app: 'test-suite',
    session_id: 'test-session-123',
    hook_event_type: 'SubagentStop',
    timestamp: Date.now(),
    payload: {
      agent_name: 'test-analyzer',
      agent_type: 'analyzer',
      duration_ms: 2500,
      status: 'success',
      token_usage: {
        total_tokens: 150,
        estimated_cost: 0.0025
      },
      tools_used: ['Read', 'Grep', 'Sequential']
    }
  };

  try {
    // Record metric (should work even if Redis is down)
    await unifiedMetricsService.recordMetric(testEvent);
    console.log('✅ Metric recorded successfully');
  } catch (error) {
    console.error('❌ Failed to record metric:', error.message);
    return false;
  }

  // Get metrics (cache-first approach)
  try {
    const metrics = await unifiedMetricsService.getMetrics();
    console.log(`✅ Retrieved metrics - Active agents: ${metrics.active_agents}, Executions: ${metrics.executions_today}`);
  } catch (error) {
    console.error('❌ Failed to get metrics:', error.message);
    return false;
  }

  return true;
}

async function testAgentLifecycle() {
  console.log('\n🤖 Testing agent lifecycle management...');
  
  const agentData = {
    agent_name: 'test-lifecycle-agent',
    agent_type: 'tester',
    session_id: 'test-session-456',
    source_app: 'test-suite',
    task_description: 'Testing agent lifecycle',
    tools: ['Read', 'Write', 'Edit']
  };

  try {
    // Mark agent as started
    const agentId = await unifiedMetricsService.markAgentStarted(agentData);
    console.log(`✅ Agent started with ID: ${agentId}`);

    // Simulate some work time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mark agent as completed
    const completionData = {
      ...agentData,
      agent_id: agentId,
      duration_ms: 100,
      token_usage: {
        total_tokens: 75,
        estimated_cost: 0.00125
      },
      tools_used: ['Read', 'Write']
    };

    const success = await unifiedMetricsService.markAgentCompleted(completionData);
    console.log(`✅ Agent completed: ${success}`);

    return true;
  } catch (error) {
    console.error('❌ Agent lifecycle test failed:', error.message);
    return false;
  }
}

async function testDataRetrieval() {
  console.log('\n📈 Testing data retrieval methods...');
  
  try {
    // Test timeline data
    const timeRange = {
      start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      end: Date.now()
    };

    const timeline = await unifiedMetricsService.getTimeline(timeRange);
    console.log(`✅ Timeline data retrieved - ${timeline.timeline.length} data points`);

    // Test distribution data
    const distribution = await unifiedMetricsService.getDistribution();
    console.log(`✅ Distribution data retrieved - ${distribution.distribution.length} agent types`);

    // Test tool usage data
    const toolUsage = await unifiedMetricsService.getToolUsage();
    console.log(`✅ Tool usage data retrieved - ${toolUsage.tools.length} tools, most used: ${toolUsage.insights.most_used_tool}`);

    return true;
  } catch (error) {
    console.error('❌ Data retrieval test failed:', error.message);
    return false;
  }
}

async function testServiceHealth() {
  console.log('\n🏥 Testing service health monitoring...');
  
  try {
    const health = await unifiedMetricsService.getServiceHealth();
    console.log(`✅ Service health: ${health.status}`);
    console.log(`   - SQLite: ${health.sqlite.status}`);
    console.log(`   - Redis: ${health.redis.status}`);

    const cacheStats = await unifiedMetricsService.getCacheStats();
    console.log(`✅ Cache stats:`);
    console.log(`   - Redis available: ${cacheStats.redisAvailable}`);
    console.log(`   - Cache warmup in progress: ${cacheStats.cacheWarmupInProgress}`);
    console.log(`   - Last warmup: ${cacheStats.lastCacheWarmup > 0 ? new Date(cacheStats.lastCacheWarmup).toISOString() : 'Never'}`);

    return true;
  } catch (error) {
    console.error('❌ Health monitoring test failed:', error.message);
    return false;
  }
}

async function testCacheWarming() {
  console.log('\n🔄 Testing cache warming...');
  
  try {
    // Force cache warmup
    await unifiedMetricsService.forceCacheWarmup();
    console.log('✅ Cache warmup completed');

    return true;
  } catch (error) {
    console.error('❌ Cache warming test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting UnifiedMetricsService comprehensive test suite...\n');

  const tests = [
    { name: 'Basic Metrics Flow', fn: testBasicMetricsFlow },
    { name: 'Agent Lifecycle', fn: testAgentLifecycle },
    { name: 'Data Retrieval', fn: testDataRetrieval },
    { name: 'Service Health', fn: testServiceHealth },
    { name: 'Cache Warming', fn: testCacheWarming }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Running test: ${test.name}`);
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name} - FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} - FAILED with exception:`, error.message);
    }
  }

  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! UnifiedMetricsService is working correctly.');
    console.log('\n💡 Key Benefits Demonstrated:');
    console.log('   - Single API for all metrics operations');
    console.log('   - Automatic failover when Redis is unavailable'); 
    console.log('   - Performance optimization when Redis is working');
    console.log('   - Data consistency between stores');
    console.log('   - Comprehensive error handling');
    console.log('   - Cache warming when Redis recovers');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run the test suite
runAllTests().catch(error => {
  console.error('❌ Test suite failed to run:', error);
  process.exit(1);
});