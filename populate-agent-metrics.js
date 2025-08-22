#!/usr/bin/env node

/**
 * Agent Metrics Population Script
 * Populates Redis with realistic agent metrics data for testing
 * the Agent Operations modal analytics features.
 */

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Sample agent types and names
const AGENT_TYPES = ['analyzer', 'debugger', 'optimizer', 'reviewer', 'generator'];
const AGENT_NAMES = [
  'screenshot-analyzer', 'code-reviewer', 'debugger', 'performance-optimizer',
  'security-scanner', 'documentation-generator', 'test-creator', 'refactoring-assistant'
];

const TOOLS = ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'Bash', 'Task'];

// Generate realistic agent execution data
function generateAgentExecution(agentName, agentType) {
  const now = new Date();
  const duration = Math.floor(Math.random() * 10000) + 1000; // 1-11 seconds
  const tokens = Math.floor(Math.random() * 5000) + 500; // 500-5500 tokens
  const cost = tokens * 0.000002; // Rough cost estimate
  
  return {
    agent_id: `ag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agent_name: agentName,
    agent_type: agentType,
    status: Math.random() > 0.1 ? 'success' : 'error', // 90% success rate
    duration_ms: duration,
    enhanced_timestamp: now.toISOString(),
    tools_used: TOOLS.filter(() => Math.random() > 0.6), // Random tool subset
    token_usage: {
      total_tokens: tokens,
      input_tokens: Math.floor(tokens * 0.6),
      output_tokens: Math.floor(tokens * 0.4),
      estimated_cost: cost
    }
  };
}

async function populateMetrics() {
  const redis = createClient({ url: REDIS_URL });
  
  try {
    console.log('🔌 Connecting to Redis...');
    await redis.connect();
    console.log('✅ Connected to Redis');
    
    const now = new Date();
    
    // Generate data for the last 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(now.getTime() - day * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dailyKey = `metrics:daily:${dateStr}`;
      
      console.log(`📅 Generating data for ${dateStr}...`);
      
      let dailyExecutions = 0;
      let dailySuccesses = 0;
      let dailyDuration = 0;
      let dailyTokens = 0;
      let dailyCost = 0;
      
      // Generate hourly data
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(date.getTime() + hour * 3600000);
        
        // Generate 0-5 agent executions per hour
        const executionsThisHour = Math.floor(Math.random() * 6);
        
        for (let exec = 0; exec < executionsThisHour; exec++) {
          const agentName = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
          const agentType = AGENT_TYPES[Math.floor(Math.random() * AGENT_TYPES.length)];
          const execution = generateAgentExecution(agentName, agentType);
          
          // Update hourly metrics by agent type
          const hourKey = `metrics:hourly:${hourDate.toISOString().slice(0, 13)}:${agentType}`;
          
          await redis.hIncrBy(hourKey, 'execution_count', 1);
          await redis.hIncrBy(hourKey, `${execution.status}_count`, 1);
          await redis.hIncrBy(hourKey, 'total_duration_ms', execution.duration_ms);
          await redis.hIncrBy(hourKey, 'total_tokens', execution.token_usage.total_tokens);
          await redis.hIncrBy(hourKey, 'total_cost', Math.floor(execution.token_usage.estimated_cost * 10000));
          await redis.expire(hourKey, 7 * 24 * 3600);
          
          // Update daily aggregates
          dailyExecutions++;
          if (execution.status === 'success') dailySuccesses++;
          dailyDuration += execution.duration_ms;
          dailyTokens += execution.token_usage.total_tokens;
          dailyCost += execution.token_usage.estimated_cost;
          
          // Store agent history
          const historyKey = `agent:history:${agentName}`;
          await redis.lPush(historyKey, JSON.stringify(execution));
          await redis.lTrim(historyKey, 0, 99); // Keep last 100
          
          // Update tool usage
          const toolsKey = `tools:usage:${dateStr}`;
          for (const tool of execution.tools_used) {
            await redis.zIncrBy(toolsKey, 1, tool);
            await redis.sAdd(`tool:${tool}:agents`, agentName);
            await redis.expire(`tool:${tool}:agents`, 7 * 24 * 3600);
          }
          
          // Performance tracking
          const perfKey = `agent:performance:${agentName}:duration`;
          await redis.zAdd(perfKey, { score: execution.duration_ms, value: execution.agent_id });
          await redis.zRemRangeByRank(perfKey, 0, -1001); // Keep last 1000
        }
      }
      
      // Store daily rollup
      if (dailyExecutions > 0) {
        await redis.hSet(dailyKey, {
          'total_executions': dailyExecutions,
          'success_count': dailySuccesses,
          'error_count': dailyExecutions - dailySuccesses,
          'total_duration_ms': dailyDuration,
          'total_tokens': dailyTokens,
          'total_cost': Math.floor(dailyCost * 10000)
        });
        await redis.expire(dailyKey, 90 * 24 * 3600);
      }
      
      console.log(`   ✅ Generated ${dailyExecutions} executions, ${dailySuccesses} successes`);
    }
    
    // Add some active agents for testing
    console.log('🏃 Adding active agents...');
    const activeAgents = 3;
    for (let i = 0; i < activeAgents; i++) {
      const agentName = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
      const agentId = `ag_${Date.now() + i}_${Math.random().toString(36).substr(2, 9)}`;
      
      const activeData = {
        agent_id: agentId,
        agent_name: agentName,
        start_time: new Date(Date.now() - Math.random() * 300000).toISOString(), // Started within last 5 min
        task_description: `Test task for ${agentName}`,
        tools_granted: TOOLS.filter(() => Math.random() > 0.5),
        context_size: Math.floor(Math.random() * 4000) + 1000,
        progress: Math.floor(Math.random() * 100)
      };
      
      await redis.setEx(`agent:active:${agentId}`, 300, JSON.stringify(activeData));
      await redis.sAdd('agents:active', agentId);
      await redis.zAdd('agents:timeline', { score: Date.now(), value: agentId });
    }
    
    console.log(`   ✅ Added ${activeAgents} active agents`);
    
    // Add tool preferences for agent types
    console.log('🛠️ Setting up tool preferences...');
    for (const agentType of AGENT_TYPES) {
      const commonTools = TOOLS.filter(() => Math.random() > 0.5);
      if (commonTools.length > 0) {
        await redis.sAdd(`agent:${agentType}:tools`, ...commonTools);
      }
    }
    
    console.log('✅ Agent metrics population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error populating metrics:', error);
    throw error;
  } finally {
    await redis.disconnect();
    console.log('🔌 Disconnected from Redis');
  }
}

async function main() {
  console.log('📊 Starting Agent Metrics Population');
  console.log(`🔌 Connecting to Redis: ${REDIS_URL}`);
  
  try {
    await populateMetrics();
    
    console.log('\n🎉 All agent metrics populated successfully!');
    console.log('\nMetrics available:');
    console.log('   📈 7 days of execution data');
    console.log('   🏃 3 active agents');
    console.log('   🛠️ Tool usage statistics');
    console.log('   ⚡ Performance metrics');
    console.log('\n💡 Check the Agent Operations modal to see the analytics!');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error('\nMake sure Redis is running and accessible:');
    console.error('  redis-server');
    process.exit(1);
  }
}

// Check if redis package is available
try {
  require('redis');
} catch (error) {
  console.error('❌ Redis package not found. Please install it:');
  console.error('  npm install redis');
  process.exit(1);
}

main();