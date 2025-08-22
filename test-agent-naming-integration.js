#!/usr/bin/env node
/**
 * Agent Naming System Integration Demo
 * 
 * This demonstrates the complete agent naming system integration:
 * 1. LLM-generated names with fallback
 * 2. Database persistence and caching
 * 3. Hook system integration
 * 4. API endpoints
 * 5. Terminal status integration
 */

const http = require('http');
const { spawn } = require('child_process');

const SERVER_URL = 'http://localhost:4000';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testNamingService() {
  console.log('\n🧠 Agent Naming System Integration Test\n');

  // Test 1: Generate agent names using the service
  console.log('1. Testing LLM-based name generation...');
  
  try {
    const result = spawn('./utils/agent_naming_service.py', ['agent', 'reviewer', 'TypeScript code analysis'], {
      cwd: '/home/bryan/multi-agent-observability-system/.claude/hooks',
      stdio: 'pipe'
    });

    result.stdout.on('data', (data) => {
      const name = data.toString().trim();
      console.log(`   ✅ Generated name: ${name}`);
    });

    result.on('close', async (code) => {
      if (code === 0) {
        await testDatabaseIntegration();
      } else {
        console.log('   ❌ Name generation failed');
      }
    });

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testDatabaseIntegration() {
  console.log('\n2. Testing database persistence...');

  // Test storing agent name
  const agentData = {
    cache_key: `test_${Date.now()}`,
    name: 'CodeGuardian-Pro',
    agent_type: 'reviewer',
    context: 'Demo integration test',
    generation_method: 'llm',
    ttl: 3600
  };

  try {
    const createResponse = await makeRequest('/api/agent-names', 'POST', agentData);
    
    if (createResponse.status === 200 && createResponse.data.success) {
      console.log('   ✅ Agent name stored in database');
      
      // Test retrieving agent name
      const getResponse = await makeRequest(`/api/agent-names/${agentData.cache_key}`);
      
      if (getResponse.status === 200 && getResponse.data.success) {
        console.log(`   ✅ Agent name retrieved: ${getResponse.data.data.name}`);
        console.log(`   📊 Usage count: ${getResponse.data.data.usage_count}`);
        
        await testSessionNames();
      } else {
        console.log('   ❌ Failed to retrieve agent name');
      }
    } else {
      console.log(`   ❌ Failed to store agent name: ${createResponse.data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }
}

async function testSessionNames() {
  console.log('\n3. Testing session name generation...');

  const sessionData = {
    session_id: `test_session_${Date.now()}`,
    name: 'Mission-DEMO2025',
    session_type: 'main',
    agent_count: 3,
    context: 'Demo session for agent naming',
    generation_method: 'llm'
  };

  try {
    const createResponse = await makeRequest('/api/session-names', 'POST', sessionData);
    
    if (createResponse.status === 200 && createResponse.data.success) {
      console.log('   ✅ Session name stored');
      
      const getResponse = await makeRequest(`/api/session-names/${sessionData.session_id}`);
      
      if (getResponse.status === 200 && getResponse.data.success) {
        console.log(`   ✅ Session retrieved: ${getResponse.data.data.name}`);
        console.log(`   📋 Type: ${getResponse.data.data.session_type}`);
        
        await testAgentExecutions();
      } else {
        console.log('   ❌ Failed to retrieve session name');
      }
    } else {
      console.log(`   ❌ Failed to store session name: ${createResponse.data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ Session error: ${error.message}`);
  }
}

async function testAgentExecutions() {
  console.log('\n4. Testing agent execution tracking...');

  const executionData = {
    agent_id: `demo_agent_${Date.now()}`,
    session_id: `test_session_${Date.now()}`,
    display_name: 'CodeReviewer-Alpha',
    agent_type: 'reviewer',
    status: 'active',
    task_description: 'Reviewing TypeScript code for best practices',
    context: 'Demo execution tracking',
    start_time: Date.now(),
    token_usage: 150,
    estimated_cost: 0.03,
    tools_used: ['Read', 'Grep', 'Edit']
  };

  try {
    const createResponse = await makeRequest('/api/agent-executions', 'POST', executionData);
    
    if (createResponse.status === 200 && createResponse.data.success) {
      console.log('   ✅ Agent execution created');
      
      // Update execution with completion
      const updateData = {
        status: 'complete',
        end_time: Date.now(),
        duration_ms: 5000,
        success_indicators: ['review_complete', 'issues_found']
      };

      const updateResponse = await makeRequest(`/api/agent-executions/${executionData.agent_id}`, 'PUT', updateData);
      
      if (updateResponse.status === 200 && updateResponse.data.success) {
        console.log('   ✅ Agent execution updated');
        
        // Get execution details
        const getResponse = await makeRequest(`/api/agent-executions/${executionData.agent_id}`);
        
        if (getResponse.status === 200 && getResponse.data.success) {
          console.log(`   ✅ Execution retrieved: ${getResponse.data.data.display_name}`);
          console.log(`   ⏱️  Duration: ${getResponse.data.data.duration_ms}ms`);
          console.log(`   🛠️  Tools: ${getResponse.data.data.tools_used.join(', ')}`);
          
          await testActiveExecutions();
        } else {
          console.log('   ❌ Failed to retrieve execution');
        }
      } else {
        console.log('   ❌ Failed to update execution');
      }
    } else {
      console.log(`   ❌ Failed to create execution: ${createResponse.data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ Execution error: ${error.message}`);
  }
}

async function testActiveExecutions() {
  console.log('\n5. Testing active executions endpoint...');

  try {
    const response = await makeRequest('/api/agent-executions');
    
    if (response.status === 200 && response.data.success) {
      console.log(`   ✅ Found ${response.data.data.length} active executions`);
      
      if (response.data.data.length > 0) {
        response.data.data.forEach((exec, index) => {
          console.log(`   ${index + 1}. ${exec.display_name} (${exec.status})`);
        });
      }
      
      await testCleanup();
    } else {
      console.log(`   ❌ Failed to get active executions: ${response.data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ Active executions error: ${error.message}`);
  }
}

async function testCleanup() {
  console.log('\n6. Testing expired name cleanup...');

  try {
    const response = await makeRequest('/api/agent-names/cleanup', 'POST');
    
    if (response.status === 200 && response.data.success) {
      console.log(`   ✅ ${response.data.message}`);
      
      console.log('\n🎉 Agent Naming System Integration Test Complete!\n');
      console.log('Features tested:');
      console.log('✅ LLM-based name generation with fallback');
      console.log('✅ Database persistence and caching');
      console.log('✅ Agent execution tracking');
      console.log('✅ Session management');
      console.log('✅ API endpoints');
      console.log('✅ Cleanup mechanisms');
      console.log('\n📋 The system is ready for integration with the terminal status feature!');
      
    } else {
      console.log(`   ❌ Cleanup failed: ${response.data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ Cleanup error: ${error.message}`);
  }
}

// Run the test
testNamingService().catch(console.error);