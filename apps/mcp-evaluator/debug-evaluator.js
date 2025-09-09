#!/usr/bin/env node

import MCPEvaluator from './src/evaluator.js';

async function debugEvaluator() {
  console.log('=== MCP Evaluator Debug ===');
  
  const evaluator = new MCPEvaluator({
    serverPath: '/home/bryan/run-qdrant-docker-mcp.sh',
    runRuntime: false // Disable runtime testing for now
  });
  
  // Add event listeners
  evaluator.on('static:started', () => {
    console.log('🔄 Static analysis started');
  });
  
  evaluator.on('hook:running', (data) => {
    console.log(`⚡ Running hook: ${data.hook}`);
  });
  
  evaluator.on('hook:completed', (data) => {
    console.log(`✅ Hook completed: ${data.hook} -> ${data.status}`);
  });
  
  evaluator.on('hook:failed', (data) => {
    console.log(`❌ Hook failed: ${data.hook} -> ${data.error}`);
  });
  
  try {
    const results = await evaluator.evaluate();
    console.log('\n=== RESULTS ===');
    console.log('Static results:', JSON.stringify(results.static, null, 2));
    console.log('Combined score:', results.score);
  } catch (error) {
    console.error('Evaluation failed:', error);
  }
}

debugEvaluator().catch(console.error);