#!/usr/bin/env node

/**
 * Comprehensive Test Data Creator
 * Creates complete test dataset including events, metrics, and agent API data
 */

const SERVER_BASE = 'http://localhost:4000';

// Helper functions
const generateSessionId = () => `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateAgentId = () => `ag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Send HTTP request
async function sendRequest(endpoint, method = 'POST', data = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${SERVER_BASE}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
}

// Create realistic agent execution via API
async function createAgentExecution(agentName, agentType, taskDescription) {
  console.log(`🤖 Creating ${agentName} execution...`);
  
  const startTime = Date.now();
  
  // Start agent
  const startResult = await sendRequest('/api/agents/start', 'POST', {
    agent_name: agentName,
    agent_type: agentType,
    task_description: taskDescription,
    tools_granted: ['Read', 'Edit', 'Grep', 'Bash'],
    context_size: Math.floor(Math.random() * 3000) + 1000
  });
  
  const agentId = startResult.agent_id;
  console.log(`   ✅ Started: ${agentId}`);
  
  // Wait for "execution time"
  await wait(Math.random() * 1000 + 500);
  
  // Complete agent
  const duration = Date.now() - startTime;
  const tokens = Math.floor(Math.random() * 4000) + 800;
  
  await sendRequest('/api/agents/complete', 'POST', {
    agent_id: agentId,
    agent_name: agentName,
    agent_type: agentType,
    status: Math.random() > 0.15 ? 'success' : 'error',
    duration_ms: duration,
    tools_used: ['Read', 'Edit', 'Grep'].filter(() => Math.random() > 0.4),
    token_usage: {
      total_tokens: tokens,
      input_tokens: Math.floor(tokens * 0.65),
      output_tokens: Math.floor(tokens * 0.35),
      estimated_cost: tokens * 0.000002
    },
    result: `${taskDescription} completed successfully`
  });
  
  console.log(`   ✅ Completed: ${duration}ms`);
  return agentId;
}

// Create comprehensive agent session with mixed events
async function createComprehensiveSession() {
  console.log('\n🎯 Creating comprehensive agent session...');
  
  const sessionId = generateSessionId();
  const timestamp = Date.now();
  
  // Session start
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'SessionStart',
    payload: {
      project_name: 'complex-analysis-project',
      task: 'Multi-stage analysis with several agents',
      complexity: 'high'
    },
    summary: 'Starting complex multi-agent analysis session',
    timestamp: timestamp - 8000
  });
  
  // User asks for comprehensive analysis
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'ChatMessage',
    payload: {
      message: 'I need a comprehensive analysis of this codebase using multiple agents'
    },
    chat: [
      { role: 'user', content: 'I need a comprehensive analysis of this codebase using multiple agents' }
    ],
    timestamp: timestamp - 7500
  });
  
  // First agent: @code-reviewer
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'ChatMessage',
    payload: {
      message: 'I\'ll use @code-reviewer to analyze code quality first'
    },
    chat: [
      { role: 'user', content: 'I need a comprehensive analysis of this codebase using multiple agents' },
      { role: 'assistant', content: 'I\'ll use @code-reviewer to analyze code quality first' }
    ],
    timestamp: timestamp - 7000
  });
  
  // Task tool delegation
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Task',
      tool_input: {
        delegate_to: 'code-reviewer',
        agent_category: 'quality',
        task_description: 'Comprehensive code quality analysis',
        tools_granted: ['Read', 'Grep', 'Glob', 'Edit']
      }
    },
    timestamp: timestamp - 6500
  });
  
  // Multiple tool usage
  const tools = ['Read', 'Grep', 'Glob', 'Edit', 'MultiEdit'];
  for (let i = 0; i < tools.length; i++) {
    await sendRequest('/events', 'POST', {
      source_app: 'comprehensive-test',
      session_id: sessionId,
      hook_event_type: 'PreToolUse',
      payload: {
        tool_name: tools[i],
        tool_input: {
          file_path: `/project/src/components/Component${i}.tsx`,
          context: 'code quality analysis'
        }
      },
      timestamp: timestamp - 6000 + (i * 200)
    });
    await wait(50);
  }
  
  // Second agent mention: @debugger
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'ChatMessage',
    payload: {
      message: 'Now using @debugger to investigate performance issues'
    },
    chat: [
      { role: 'user', content: 'I need a comprehensive analysis of this codebase using multiple agents' },
      { role: 'assistant', content: 'I\'ll use @code-reviewer to analyze code quality first' },
      { role: 'assistant', content: 'Code quality analysis complete. Now using @debugger to investigate performance issues' }
    ],
    timestamp: timestamp - 4000
  });
  
  // Agent file operations
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: {
        file_path: '/project/.claude/agents/debugger.md'
      }
    },
    timestamp: timestamp - 3500
  });
  
  // SubagentStart
  const agentId1 = generateAgentId();
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'SubagentStart',
    payload: {
      agent_id: agentId1,
      agent_name: 'debugger',
      agent_type: 'debugger',
      task_description: 'Performance issue investigation',
      tools_granted: ['Read', 'Bash', 'Grep']
    },
    timestamp: timestamp - 3000
  });
  
  // More tool usage
  const debugTools = ['Bash', 'Grep'];
  for (let i = 0; i < debugTools.length; i++) {
    await sendRequest('/events', 'POST', {
      source_app: 'comprehensive-test',
      session_id: sessionId,
      hook_event_type: 'PreToolUse',
      payload: {
        tool_name: debugTools[i],
        tool_input: {
          command: i === 0 ? 'ps aux | grep node' : 'memory leak',
          context: 'performance debugging'
        }
      },
      timestamp: timestamp - 2500 + (i * 300)
    });
    await wait(50);
  }
  
  // SubagentStop
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'SubagentStop',
    payload: {
      agent_id: agentId1,
      agent_name: 'debugger',
      agent_type: 'debugger',
      status: 'success',
      duration_ms: 2300,
      result: 'Identified memory leak in component lifecycle',
      tools_used: ['Read', 'Bash', 'Grep'],
      token_usage: {
        total_tokens: 2840,
        input_tokens: 1650,
        output_tokens: 1190,
        estimated_cost: 0.0071
      }
    },
    summary: 'Performance debugging completed with findings',
    timestamp: timestamp - 1800
  });
  
  // Third agent: Task delegation
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'PreToolUse',
    payload: {
      tool_name: 'Task',
      tool_input: {
        delegate_to: 'performance-optimizer',
        agent_category: 'performance',
        task_description: 'Fix identified memory leak and optimize performance',
        tools_granted: ['Read', 'Edit', 'MultiEdit', 'Bash']
      }
    },
    timestamp: timestamp - 1500
  });
  
  // Final SubagentStart and Stop
  const agentId2 = generateAgentId();
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'SubagentStart',
    payload: {
      agent_id: agentId2,
      agent_name: 'performance-optimizer',
      agent_type: 'optimizer',
      task_description: 'Memory leak fix and performance optimization'
    },
    timestamp: timestamp - 1200
  });
  
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'SubagentStop',
    payload: {
      agent_id: agentId2,
      agent_name: 'performance-optimizer',
      agent_type: 'optimizer',
      status: 'success',
      duration_ms: 1800,
      result: 'Memory leak fixed, 35% performance improvement achieved',
      tools_used: ['Read', 'Edit', 'MultiEdit', 'Bash'],
      token_usage: {
        total_tokens: 3920,
        input_tokens: 2100,
        output_tokens: 1820,
        estimated_cost: 0.0098
      }
    },
    summary: 'Performance optimization completed successfully',
    timestamp: timestamp - 400
  });
  
  // Session end
  await sendRequest('/events', 'POST', {
    source_app: 'comprehensive-test',
    session_id: sessionId,
    hook_event_type: 'SessionStop',
    payload: {
      session_duration_ms: 8000,
      agents_used: ['code-reviewer', 'debugger', 'performance-optimizer'],
      total_improvements: '35% performance gain, memory leak fixed, code quality improved',
      tools_used: ['Task', 'Read', 'Grep', 'Glob', 'Edit', 'MultiEdit', 'Bash'],
      success: true
    },
    summary: 'Comprehensive multi-agent analysis session completed successfully',
    chat: [
      { role: 'user', content: 'I need a comprehensive analysis of this codebase using multiple agents' },
      { role: 'assistant', content: 'I\'ll use @code-reviewer to analyze code quality first' },
      { role: 'assistant', content: 'Code quality analysis complete. Now using @debugger to investigate performance issues' },
      { role: 'assistant', content: 'Performance debugging identified memory leak. Using optimization agent...' },
      { role: 'assistant', content: 'Analysis complete! Achieved 35% performance improvement and fixed memory leak.' }
    ],
    timestamp: timestamp - 100
  });
  
  console.log(`✨ Comprehensive session created: ${sessionId}`);
  return sessionId;
}

async function main() {
  console.log('🚀 Creating Comprehensive Test Data');
  console.log(`📡 Server: ${SERVER_BASE}`);
  
  try {
    // Test server connection
    const testResponse = await fetch(SERVER_BASE);
    if (!testResponse.ok) {
      throw new Error(`Server not reachable: ${testResponse.status}`);
    }
    console.log('✅ Server connection verified');
    
    // Create comprehensive session
    const comprehensiveSession = await createComprehensiveSession();
    
    // Create individual agent executions via API
    console.log('\n🔄 Creating additional agent executions...');
    
    const executions = [
      ['screenshot-analyzer', 'analyzer', 'Extract business data from UI mockup'],
      ['code-reviewer', 'reviewer', 'Review recent code changes for security'],
      ['documentation-generator', 'generator', 'Generate API documentation'],
      ['test-creator', 'generator', 'Create unit tests for authentication module'],
      ['security-scanner', 'security', 'Scan for security vulnerabilities']
    ];
    
    const completedExecutions = [];
    for (const [name, type, task] of executions) {
      const agentId = await createAgentExecution(name, type, task);
      completedExecutions.push(agentId);
      await wait(300); // Stagger executions
    }
    
    console.log('\n🎉 Comprehensive test data creation completed!');
    console.log(`📊 Created data:`);
    console.log(`   🎯 1 comprehensive multi-agent session: ${comprehensiveSession}`);
    console.log(`   🤖 ${completedExecutions.length} individual agent executions`);
    console.log(`   📈 Additional metrics from previous script`);
    
    console.log('\n💡 The system should now show:');
    console.log('   ✅ Agent sessions in timeline');
    console.log('   ✅ Active metrics and analytics');
    console.log('   ✅ Agent Operations modal with full data');
    console.log('\nRefresh the frontend to see all the data!');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error('\nMake sure the backend server is running:');
    console.error('  cd apps/server && bun run dev');
    process.exit(1);
  }
}

main();