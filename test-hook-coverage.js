#!/usr/bin/env node

const hookEventTypes = [
  'SessionStart',
  'UserPromptSubmit', 
  'PreToolUse',
  'PostToolUse',
  'SubagentStop',
  'Stop',
  'Notification',
  'PreCompact'
];

const sourceApps = [
  'multi-agent-observability-system',
  'test-application',
  'demo-system'
];

function generateTestEvent(hookType) {
  return {
    source_app: sourceApps[Math.floor(Math.random() * sourceApps.length)],
    session_id: `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    hook_event_type: hookType,
    payload: {
      tool_name: 'Read',
      tool_input: { file_path: '/test/path' },
      tool_output: { content: 'test output' },
      metadata: {
        user: 'test-user',
        environment: 'test'
      }
    },
    timestamp: Date.now(),
    // Randomly add errors to some events
    ...(Math.random() < 0.1 ? { error: 'Test error occurred' } : {}),
    ...(Math.random() < 0.1 ? { duration: Math.floor(Math.random() * 5000) } : {})
  };
}

async function sendTestEvent(event) {
  try {
    const response = await fetch('http://localhost:4000/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    
    if (response.ok) {
      console.log(`✅ Sent ${event.hook_event_type} event successfully`);
    } else {
      console.log(`❌ Failed to send ${event.hook_event_type} event:`, response.status);
    }
  } catch (error) {
    console.error(`❌ Error sending ${event.hook_event_type} event:`, error.message);
  }
}

async function sendTestEvents() {
  console.log('🚀 Starting Hook Coverage Test - Sending test events...');
  
  // Send multiple events for each hook type to test frequency and success rates
  for (let i = 0; i < 3; i++) {
    for (const hookType of hookEventTypes) {
      const event = generateTestEvent(hookType);
      await sendTestEvent(event);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
  }
  
  console.log('✨ Hook Coverage test events sent! Check your dashboard for updates.');
  console.log('📊 Expected results:');
  console.log('- All 8 hook types should show as "active"');
  console.log('- Success rates should be around 90% (with some random errors)');
  console.log('- Execution counts should show 3 events per hook type');
  console.log('- Last execution should be recent (just now)');
}

// Test hook coverage API endpoint
async function testHookCoverageAPI() {
  try {
    const response = await fetch('http://localhost:4000/api/hooks/coverage');
    if (response.ok) {
      const data = await response.json();
      console.log('\n📈 Hook Coverage API Response:');
      console.log(`- Total Active Hooks: ${data.totalActiveHooks}`);
      console.log(`- Total Inactive Hooks: ${data.totalInactiveHooks}`);
      console.log(`- Total Error Hooks: ${data.totalErrorHooks}`);
      console.log(`- Overall Success Rate: ${data.overallSuccessRate}%`);
      console.log('\n📋 Individual Hook Status:');
      data.hooks.forEach(hook => {
        console.log(`  ${hook.icon} ${hook.displayName}: ${hook.status.toUpperCase()} (${hook.executionCount} executions, ${hook.successRate}% success)`);
      });
    } else {
      console.log('❌ Hook Coverage API failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing Hook Coverage API:', error.message);
  }
}

// Run the test
sendTestEvents().then(() => {
  // Wait a bit for events to be processed, then test the API
  setTimeout(testHookCoverageAPI, 2000);
});