#!/usr/bin/env node

const fetch = require('node-fetch');

async function testAgentStart() {
  const agentId = `test_agent_${Date.now()}`;
  
  console.log('🚀 Testing agent start/stop cycle...');
  
  // Send SubagentStart event
  const startEvent = {
    source_app: 'claude-code-test',
    session_id: `test_session_${Date.now()}`,
    hook_event_type: 'SubagentStart',
    payload: {
      agent_name: 'test-analyzer',
      agent_type: 'analyzer',
      task: 'Analyzing test data',
      task_description: 'This is a test analyzer agent',
      tools: ['Read', 'Write'],
      subagent_type: 'analyzer'
    },
    timestamp: Date.now()
  };

  console.log('📤 Sending SubagentStart event...');
  const startResponse = await fetch('http://localhost:4000/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(startEvent)
  });

  if (startResponse.ok) {
    const startResult = await startResponse.json();
    console.log('✅ SubagentStart sent:', startResult.payload?.agent_id || 'No agent_id returned');
    
    // Check terminal status
    console.log('📊 Checking terminal status...');
    const statusResponse = await fetch('http://localhost:4000/api/terminal/status');
    const status = await statusResponse.json();
    console.log('📈 Terminal Status:', JSON.stringify(status, null, 2));
    
    // Wait a bit then send stop event
    setTimeout(async () => {
      const stopEvent = {
        source_app: 'claude-code-test',
        session_id: startEvent.session_id,
        hook_event_type: 'SubagentStop',
        payload: {
          agent_id: startResult.payload?.agent_id,
          agent_name: 'test-analyzer',
          agent_type: 'analyzer',
          duration: 5000,
          result: 'success',
          status: 'success',
          tokens_used: 1500,
          tools_used: ['Read']
        },
        timestamp: Date.now()
      };

      console.log('📤 Sending SubagentStop event...');
      const stopResponse = await fetch('http://localhost:4000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stopEvent)
      });

      if (stopResponse.ok) {
        console.log('✅ SubagentStop sent');
        
        // Check terminal status again
        setTimeout(async () => {
          console.log('📊 Final terminal status check...');
          const finalStatusResponse = await fetch('http://localhost:4000/api/terminal/status');
          const finalStatus = await finalStatusResponse.json();
          console.log('📈 Final Terminal Status:', JSON.stringify(finalStatus, null, 2));
        }, 1000);
      } else {
        console.error('❌ SubagentStop failed:', stopResponse.statusText);
      }
    }, 3000);
    
  } else {
    console.error('❌ SubagentStart failed:', startResponse.statusText);
  }
}

testAgentStart().catch(console.error);