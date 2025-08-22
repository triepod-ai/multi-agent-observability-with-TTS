#!/usr/bin/env node

/**
 * Test Agent Events Generator
 * Sends realistic agent session events to the observability backend
 * to test the agent detection and modal display functionality.
 */

const SERVER_URL = 'http://localhost:4000/events';

// Generate unique session IDs
const generateSessionId = () => `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Generate unique agent IDs
const generateAgentId = () => `ag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to send events to backend
async function sendEvent(event) {
  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Event sent: ${event.hook_event_type} (${event.source_app})`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send event: ${error.message}`);
    throw error;
  }
}

// Wait helper
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test Agent Session 1: SubagentStop Strategy (Highest Confidence)
async function createSubagentStopSession() {
  console.log('\n🤖 Creating SubagentStop session (Strategy 1 - Highest Confidence)...');
  
  const sessionId = generateSessionId();
  const agentId = generateAgentId();
  const timestamp = Date.now();
  
  // Session start
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SessionStart',
    payload: {
      project_name: 'test-project',
      working_directory: '/home/bryan/test-project',
      git_status: 'clean'
    },
    summary: 'Test session started with agent capabilities',
    timestamp: timestamp - 5000
  });
  
  await wait(100);
  
  // SubagentStart
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SubagentStart',
    payload: {
      agent_id: agentId,
      agent_name: 'screenshot-analyzer',
      agent_type: 'analyzer',
      task_description: 'Analyze UI mockup for data extraction',
      tools_granted: ['Read'],
      context_size: 2048
    },
    summary: 'Screenshot analyzer agent started',
    timestamp: timestamp - 4000
  });
  
  await wait(100);
  
  // Tool usage
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: {
        file_path: '/var/folders/temp/screenshot.png'
      }
    },
    timestamp: timestamp - 3000
  });
  
  await wait(100);
  
  // SubagentStop (key detection event)
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SubagentStop',
    payload: {
      agent_id: agentId,
      agent_name: 'screenshot-analyzer',
      agent_type: 'analyzer',
      status: 'success',
      duration_ms: 2500,
      result: 'Successfully extracted business info from UI mockup',
      tools_used: ['Read'],
      token_usage: {
        total_tokens: 1247,
        input_tokens: 892,
        output_tokens: 355,
        estimated_cost: 0.0034
      }
    },
    summary: 'Screenshot analysis completed successfully',
    chat: [
      { role: 'user', content: '@screenshot-analyzer extract data from this UI' },
      { role: 'assistant', content: 'I\'ll analyze the UI mockup and extract the business information...' }
    ],
    timestamp: timestamp - 500
  });
  
  console.log(`✨ SubagentStop session created: ${sessionId}`);
  return sessionId;
}

// Test Agent Session 2: Task Tool Strategy (High Confidence)
async function createTaskToolSession() {
  console.log('\n🛠️ Creating Task Tool session (Strategy 2 - High Confidence)...');
  
  const sessionId = generateSessionId();
  const timestamp = Date.now();
  
  // Session start
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SessionStart',
    payload: {
      project_name: 'codebase-analysis',
      working_directory: '/home/bryan/my-project'
    },
    summary: 'Starting complex analysis requiring agent delegation',
    timestamp: timestamp - 4000
  });
  
  await wait(100);
  
  // Task tool usage (key detection event)
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Task',
      tool_input: {
        delegate_to: 'code-reviewer',
        agent_category: 'quality',
        task_description: 'Review recent code changes for quality and security issues',
        tools_granted: ['Read', 'Grep', 'Glob', 'Bash'],
        context_summary: 'Large codebase with recent API changes'
      }
    },
    timestamp: timestamp - 3000
  });
  
  await wait(100);
  
  // Multiple tool usage indicating agent work
  const tools = ['Read', 'Grep', 'Glob', 'Bash'];
  for (let i = 0; i < tools.length; i++) {
    await sendEvent({
      source_app: 'multi-agent-obs-test', 
      session_id: sessionId,
      hook_event_type: 'PreToolUse',
      payload: {
        tool_name: tools[i],
        tool_input: {
          file_path: `/project/src/components/Component${i}.tsx`
        }
      },
      timestamp: timestamp - 2000 + (i * 200)
    });
    await wait(50);
  }
  
  // Task completion
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PostToolUse',
    payload: {
      tool_name: 'Task',
      result: {
        success: true,
        agent_used: 'code-reviewer',
        findings: [
          'Found 3 security issues requiring attention',
          'Code quality is good overall',  
          'Recommended refactoring for performance'
        ],
        duration_ms: 3200,
        tokens_used: 2840
      }
    },
    summary: 'Code review completed by agent delegation',
    chat: [
      { role: 'user', content: 'Review the recent changes for quality issues' },
      { role: 'assistant', content: 'I\'ll delegate this to the code-reviewer agent for thorough analysis...' }
    ],
    timestamp: timestamp - 200
  });
  
  console.log(`✨ Task Tool session created: ${sessionId}`);
  return sessionId;
}

// Test Agent Session 3: @-mention Pattern Strategy (Medium Confidence)
async function createMentionSession() {
  console.log('\n📎 Creating @-mention session (Strategy 4 - Medium Confidence)...');
  
  const sessionId = generateSessionId();
  const timestamp = Date.now();
  
  // Session start with agent mention
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SessionStart',
    payload: {
      project_name: 'debugging-session',
      user_request: '@debugger investigate TypeError in authentication module'
    },
    summary: 'Debug session with explicit agent mention',
    chat: [
      { role: 'user', content: '@debugger investigate the TypeError in user authentication' }
    ],
    timestamp: timestamp - 3000
  });
  
  await wait(100);
  
  // Tool usage with agent context
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: {
        file_path: '/project/src/auth/authentication.js'
      },
      context: 'Agent debugging authentication issue'
    },
    timestamp: timestamp - 2500
  });
  
  await wait(100);
  
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Grep',
      tool_input: {
        pattern: 'TypeError',
        path: '/project/src/auth'
      }
    },
    timestamp: timestamp - 2000
  });
  
  await wait(100);
  
  // Resolution
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SessionStop',
    payload: {
      session_duration_ms: 3000,
      tools_used: ['Read', 'Grep'],
      agent_mention: '@debugger',
      resolution: 'Found and fixed TypeError in user.email validation'
    },
    summary: 'Debugging completed successfully with agent assistance',
    chat: [
      { role: 'user', content: '@debugger investigate the TypeError in user authentication' },
      { role: 'assistant', content: 'I\'ll analyze the authentication module for TypeError issues...' },
      { role: 'assistant', content: 'Found the issue: user.email can be null causing TypeError in validation' }
    ],
    timestamp: timestamp - 100
  });
  
  console.log(`✨ @-mention session created: ${sessionId}`);
  return sessionId;
}

// Test Agent Session 4: Agent File Operations (Medium Confidence)
async function createAgentFileOpsSession() {
  console.log('\n📁 Creating Agent File Operations session (Strategy 3 - Medium Confidence)...');
  
  const sessionId = generateSessionId();
  const timestamp = Date.now();
  
  // Session start
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SessionStart',
    payload: {
      project_name: 'agent-management',
      task: 'Managing Claude Code subagents'
    },
    summary: 'Session for agent file management',
    timestamp: timestamp - 3000
  });
  
  await wait(100);
  
  // Read agent files (key detection pattern)
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: {
        file_path: '/project/.claude/agents/code-reviewer.md'
      }
    },
    timestamp: timestamp - 2500
  });
  
  await wait(100);
  
  // List agents directory
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'LS',
      tool_input: {
        path: '/project/.claude/agents/'
      }
    },
    timestamp: timestamp - 2000
  });
  
  await wait(100);
  
  // Edit agent file
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.claude/agents/debugger.md',
        old_string: 'tools: Read, Edit',
        new_string: 'tools: Read, Edit, Bash, Grep'
      }
    },
    timestamp: timestamp - 1500
  });
  
  await wait(100);
  
  // Completion
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SessionStop',
    payload: {
      session_duration_ms: 3000,
      tools_used: ['Read', 'LS', 'Edit'],
      files_modified: ['/project/.claude/agents/debugger.md']
    },
    summary: 'Updated agent configurations successfully',
    timestamp: timestamp - 100
  });
  
  console.log(`✨ Agent File Operations session created: ${sessionId}`);
  return sessionId;
}

// Test Agent Session 5: Combined Pattern Session (Multiple Strategies)
async function createCombinedPatternSession() {
  console.log('\n🎯 Creating Combined Pattern session (Multiple Strategies)...');
  
  const sessionId = generateSessionId();
  const agentId = generateAgentId();
  const timestamp = Date.now();
  
  // Session start with agent keywords
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SessionStart',
    payload: {
      project_name: 'complex-agent-task',
      description: 'Complex analysis requiring subagent execution',
      metadata: {
        agent_type: 'analyzer',
        complexity: 'high'
      }
    },
    summary: 'Starting complex agent execution task',
    timestamp: timestamp - 6000
  });
  
  await wait(100);
  
  // Multiple tool usage (Strategy 6)
  const tools = ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'Bash'];
  for (let i = 0; i < tools.length; i++) {
    await sendEvent({
      source_app: 'multi-agent-obs-test',
      session_id: sessionId,
      hook_event_type: 'PreToolUse',
      payload: {
        tool_name: tools[i],
        tool_input: {
          context: 'Agent execution task',
          file_path: `/project/src/module${i}.js`
        }
      },
      timestamp: timestamp - 5000 + (i * 200)
    });
    await wait(50);
  }
  
  // Agent mention in chat
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'ChatMessage',
    payload: {
      message: 'Using @code-reviewer for quality analysis',
      context: 'agent delegation'
    },
    chat: [
      { role: 'user', content: 'Analyze this codebase comprehensively' },
      { role: 'assistant', content: 'I\'ll use @code-reviewer to perform thorough analysis...' }
    ],
    timestamp: timestamp - 3500
  });
  
  await wait(100);
  
  // Task tool usage
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Task',
      tool_input: {
        delegate_to: 'performance-optimizer',
        agent_category: 'performance',
        task_description: 'Optimize critical path performance',
        tools_granted: ['Read', 'Edit', 'Bash']
      }
    },
    timestamp: timestamp - 3000
  });
  
  await wait(100);
  
  // SubagentStop (highest confidence trigger)
  await sendEvent({
    source_app: 'multi-agent-obs-test',
    session_id: sessionId,
    hook_event_type: 'SubagentStop',
    payload: {
      agent_id: agentId,
      agent_name: 'performance-optimizer',
      agent_type: 'performance',
      status: 'success',
      duration_ms: 4200,
      result: 'Optimized critical path reducing response time by 40%',
      tools_used: ['Read', 'Edit', 'Bash'],
      token_usage: {
        total_tokens: 3840,
        input_tokens: 2100,
        output_tokens: 1740,
        estimated_cost: 0.0089
      }
    },
    summary: 'Performance optimization completed successfully',
    chat: [
      { role: 'user', content: 'Analyze this codebase comprehensively' },
      { role: 'assistant', content: 'I\'ll use @code-reviewer to perform thorough analysis...' },
      { role: 'assistant', content: 'Analysis complete. Now optimizing performance with specialized agent...' },
      { role: 'assistant', content: 'Performance optimization completed - 40% improvement achieved' }
    ],
    timestamp: timestamp - 500
  });
  
  console.log(`✨ Combined Pattern session created: ${sessionId}`);
  return sessionId;
}

// Main execution
async function main() {
  console.log('🚀 Starting Test Agent Events Generator');
  console.log(`📡 Sending events to: ${SERVER_URL}`);
  
  try {
    // Test server connection
    const testResponse = await fetch('http://localhost:4000');
    if (!testResponse.ok) {
      throw new Error(`Server not reachable: ${testResponse.status}`);
    }
    console.log('✅ Server connection verified');
    
    // Create different types of agent sessions
    const sessions = [];
    
    // Strategy 1: SubagentStop (Highest Confidence)
    sessions.push(await createSubagentStopSession());
    await wait(500);
    
    // Strategy 2: Task Tool (High Confidence)  
    sessions.push(await createTaskToolSession());
    await wait(500);
    
    // Strategy 4: @-mentions (Medium Confidence)
    sessions.push(await createMentionSession());
    await wait(500);
    
    // Strategy 3: Agent File Operations (Medium Confidence)
    sessions.push(await createAgentFileOpsSession());
    await wait(500);
    
    // Combined: Multiple Strategies
    sessions.push(await createCombinedPatternSession());
    
    console.log('\n🎉 All test agent sessions created successfully!');
    console.log(`📊 Created ${sessions.length} agent sessions:`);
    sessions.forEach((sessionId, index) => {
      console.log(`   ${index + 1}. ${sessionId}`);
    });
    
    console.log('\n💡 These sessions should now be detected as agent sessions in the frontend.');
    console.log('   Check the Agent Operations modal to see the results!');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error('\nMake sure the backend server is running on port 4000:');
    console.error('  cd apps/server && bun run dev');
    process.exit(1);
  }
}

// Run the script
main();