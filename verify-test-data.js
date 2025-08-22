#!/usr/bin/env node

/**
 * Test Data Verification Script
 * Checks what agent data is available in the system
 */

const SERVER_BASE = 'http://localhost:4000';

async function checkEndpoint(path, description) {
  try {
    console.log(`🔍 Checking ${description}...`);
    const response = await fetch(`${SERVER_BASE}${path}`);
    
    if (!response.ok) {
      console.log(`   ❌ ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`   ✅ Success`);
    return data;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Verifying Test Data');
  console.log(`📡 Server: ${SERVER_BASE}\n`);
  
  // Check recent events
  const events = await checkEndpoint('/events/recent?limit=50', 'Recent Events');
  if (events) {
    console.log(`   📊 Found ${events.length} recent events`);
    
    // Count sessions by source_app
    const sessionsByApp = {};
    const sessionIds = new Set();
    events.forEach(event => {
      sessionIds.add(event.session_id);
      sessionsByApp[event.source_app] = (sessionsByApp[event.source_app] || 0) + 1;
    });
    
    console.log(`   🎯 Sessions: ${sessionIds.size} unique sessions`);
    Object.entries(sessionsByApp).forEach(([app, count]) => {
      console.log(`      - ${app}: ${count} events`);
    });
    
    // Check for agent-related events
    const agentEvents = events.filter(event => 
      event.hook_event_type === 'SubagentStop' ||
      event.hook_event_type === 'SubagentStart' ||
      (event.hook_event_type === 'PreToolUse' && event.payload.tool_name === 'Task') ||
      JSON.stringify(event.payload).toLowerCase().includes('@agent-') ||
      JSON.stringify(event.payload).toLowerCase().includes('@debugger') ||
      JSON.stringify(event.payload).toLowerCase().includes('@code-reviewer') ||
      JSON.stringify(event.payload).toLowerCase().includes('@screenshot-analyzer')
    );
    
    console.log(`   🤖 Agent-related events: ${agentEvents.length}`);
    
    // Check event types
    const eventTypes = {};
    events.forEach(event => {
      eventTypes[event.hook_event_type] = (eventTypes[event.hook_event_type] || 0) + 1;
    });
    
    console.log(`   📋 Event types:`);
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`      - ${type}: ${count}`);
    });
  }
  
  console.log('');
  
  // Check agent metrics
  const metrics = await checkEndpoint('/api/agents/metrics/current', 'Current Agent Metrics');
  if (metrics) {
    console.log(`   🏃 Active agents: ${metrics.active_agents}`);
    console.log(`   📈 Executions today: ${metrics.executions_today}`);
    console.log(`   ✅ Success rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
    console.log(`   ⏱️ Avg duration: ${metrics.avg_duration_ms}ms`);
    console.log(`   🪙 Tokens used: ${metrics.tokens_used_today}`);
    console.log(`   💰 Est cost: $${metrics.estimated_cost_today.toFixed(4)}`);
    
    if (metrics.active_agent_details?.length > 0) {
      console.log(`   🤖 Active agent details:`);
      metrics.active_agent_details.forEach(agent => {
        console.log(`      - ${agent.agent_name}: ${agent.duration_so_far_ms}ms (${agent.status})`);
      });
    }
  }
  
  console.log('');
  
  // Check agent timeline
  const timeline = await checkEndpoint('/api/agents/metrics/timeline?hours=24', 'Agent Timeline');
  if (timeline?.timeline) {
    console.log(`   📊 Timeline entries: ${timeline.timeline.length}`);
    if (timeline.timeline.length > 0) {
      const recent = timeline.timeline.slice(-3);
      console.log(`   🕒 Recent entries:`);
      recent.forEach(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        console.log(`      - ${time}: ${entry.executions} executions, ${entry.avg_duration_ms}ms avg`);
      });
    }
  }
  
  console.log('');
  
  // Check agent type distribution
  const distribution = await checkEndpoint('/api/agents/types/distribution', 'Agent Type Distribution');
  if (distribution?.distribution) {
    console.log(`   📈 Agent types: ${distribution.distribution.length}`);
    distribution.distribution.slice(0, 5).forEach(type => {
      console.log(`      - ${type.type}: ${type.count} (${(type.percentage * 100).toFixed(1)}%)`);
    });
  }
  
  console.log('');
  
  // Check filter options
  const filters = await checkEndpoint('/events/filter-options', 'Filter Options');
  if (filters) {
    console.log(`   🎛️ Filter options:`);
    console.log(`      - Source apps: ${filters.source_apps?.length || 0}`);
    console.log(`      - Session IDs: ${filters.session_ids?.length || 0}`);
    console.log(`      - Event types: ${filters.hook_event_types?.length || 0}`);
    
    if (filters.source_apps?.length > 0) {
      console.log(`      - Apps: ${filters.source_apps.slice(0, 3).join(', ')}${filters.source_apps.length > 3 ? '...' : ''}`);
    }
  }
  
  console.log('\n🎉 Data verification complete!');
  
  // Summary recommendation
  if (events && events.length > 0) {
    const agentSessions = new Set();
    events.forEach(event => {
      const content = JSON.stringify(event.payload).toLowerCase();
      if (event.hook_event_type === 'SubagentStop' ||
          (event.hook_event_type === 'PreToolUse' && event.payload.tool_name === 'Task') ||
          content.includes('@agent-') || content.includes('@debugger') || 
          content.includes('@code-reviewer') || content.includes('@screenshot-analyzer') ||
          content.includes('subagent') || content.includes('.claude/agents')) {
        agentSessions.add(event.session_id);
      }
    });
    
    console.log(`\n💡 Agent detection should find ${agentSessions.size} sessions:`);
    Array.from(agentSessions).slice(0, 5).forEach(sessionId => {
      console.log(`   🎯 ${sessionId}`);
    });
    
    if (agentSessions.size > 0) {
      console.log('\n✅ The Agent Operations modal should now show data!');
      console.log('🔄 Refresh the frontend application to see the results.');
    }
  }
}

main();