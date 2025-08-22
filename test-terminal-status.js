#!/usr/bin/env node

const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:4000';

// Agent types for testing
const agentTypes = [
  'analyzer', 'debugger', 'builder', 'tester', 'reviewer',
  'optimizer', 'security', 'writer', 'data-processor'
];

// Task descriptions for testing
const taskDescriptions = [
  'Analyzing code structure',
  'Debugging authentication flow',
  'Building React component',
  'Running unit tests',
  'Code quality review',
  'Optimizing database queries',
  'Security vulnerability scan',
  'Generating documentation',
  'Processing user data'
];

// Generate a random session ID
function generateSessionId() {
  return `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a random agent ID
function generateAgentId() {
  return `ag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Send SubagentStart event
async function sendAgentStart(agentId, agentType, taskDescription) {
  const event = {
    source_app: 'claude-code-test',
    session_id: generateSessionId(),
    hook_event_type: 'SubagentStart',
    payload: {
      agent_id: agentId,
      agent_name: `${agentType}-agent`,
      agent_type: agentType,
      task: taskDescription,
      task_description: taskDescription,
      tools: ['Read', 'Write', 'Bash'],
      start_time: new Date().toISOString()
    },
    timestamp: Date.now()
  };

  try {
    const response = await fetch(`${SERVER_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (response.ok) {
      console.log(`✓ Started agent: ${agentType} (${agentId})`);
      return await response.json();
    } else {
      console.error(`✗ Failed to start agent: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`✗ Error starting agent: ${error.message}`);
  }
}

// Send SubagentStop event
async function sendAgentStop(agentId, agentType, duration, success = true) {
  const event = {
    source_app: 'claude-code-test',
    session_id: generateSessionId(),
    hook_event_type: 'SubagentStop',
    payload: {
      agent_id: agentId,
      agent_name: `${agentType}-agent`,
      agent_type: agentType,
      duration: duration,
      result: success ? 'success' : 'failed',
      status: success ? 'success' : 'failed',
      tokens_used: Math.floor(Math.random() * 5000) + 500,
      tools_used: ['Read', 'Write'],
      start_time: new Date(Date.now() - duration).toISOString(),
      end_time: new Date().toISOString()
    },
    timestamp: Date.now()
  };

  try {
    const response = await fetch(`${SERVER_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (response.ok) {
      console.log(`✓ Completed agent: ${agentType} (${agentId}) in ${Math.round(duration/1000)}s`);
    } else {
      console.error(`✗ Failed to complete agent: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`✗ Error completing agent: ${error.message}`);
  }
}

// Simulate agent lifecycle
async function simulateAgent(agentType, taskDescription, minDuration = 2000, maxDuration = 15000) {
  const agentId = generateAgentId();
  
  // Start the agent
  await sendAgentStart(agentId, agentType, taskDescription);
  
  // Wait for a random duration
  const duration = Math.floor(Math.random() * (maxDuration - minDuration)) + minDuration;
  
  return new Promise((resolve) => {
    setTimeout(async () => {
      // Complete the agent (90% success rate)
      const success = Math.random() > 0.1;
      await sendAgentStop(agentId, agentType, duration, success);
      resolve();
    }, duration);
  });
}

// Main simulation function
async function runSimulation() {
  console.log('🚀 Starting terminal status simulation...');
  console.log(`📊 Server: ${SERVER_URL}`);
  console.log('📈 This will create several agent start/stop events to test the terminal status bar');
  console.log('');
  
  // Start several agents with different lifecycles
  const simulations = [];
  
  // Quick agents (2-5 seconds)
  for (let i = 0; i < 3; i++) {
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const taskDesc = taskDescriptions[Math.floor(Math.random() * taskDescriptions.length)];
    simulations.push(simulateAgent(agentType, taskDesc, 2000, 5000));
  }
  
  // Medium agents (5-10 seconds)
  for (let i = 0; i < 2; i++) {
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const taskDesc = taskDescriptions[Math.floor(Math.random() * taskDescriptions.length)];
    simulations.push(simulateAgent(agentType, taskDesc, 5000, 10000));
  }
  
  // Long-running agents (10-15 seconds)
  for (let i = 0; i < 2; i++) {
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const taskDesc = taskDescriptions[Math.floor(Math.random() * taskDescriptions.length)];
    simulations.push(simulateAgent(agentType, taskDesc, 10000, 15000));
  }
  
  console.log(`⏳ Running ${simulations.length} agent simulations...`);
  console.log('💡 You can now view the terminal status bar in the UI at http://localhost:5173');
  console.log('');
  
  // Wait for all simulations to complete
  await Promise.all(simulations);
  
  console.log('');
  console.log('✅ All simulations completed!');
  console.log('📊 Check the terminal status bar to see the results');
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Simulation stopped by user');
  process.exit(0);
});

// Run the simulation
runSimulation().catch(error => {
  console.error('❌ Simulation error:', error.message);
  process.exit(1);
});