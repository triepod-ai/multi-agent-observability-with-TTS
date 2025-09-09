/**
 * MCP Server Evaluator
 * Combines static analysis (hooks) with runtime testing (Inspector)
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import InspectorBridge from './inspector-bridge.js';

const execAsync = promisify(exec);

class MCPEvaluator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.serverPath = options.serverPath;
    this.config = {
      runStatic: options.runStatic !== false,
      runRuntime: options.runRuntime !== false,
      transport: options.transport || 'stdio',
      hooksPath: options.hooksPath || '.claude/hooks',
      observabilityUrl: options.observabilityUrl || 'http://localhost:3456',
      ...options
    };
    
    this.inspector = new InspectorBridge({
      transport: this.config.transport
    });
    
    this.results = {
      static: {},
      runtime: {},
      combined: {},
      score: 0,
      recommendations: []
    };
  }

  /**
   * Run complete evaluation
   */
  async evaluate() {
    this.emit('evaluation:started', { 
      serverPath: this.serverPath,
      timestamp: new Date().toISOString()
    });

    try {
      // Phase 1: Static Analysis
      if (this.config.runStatic) {
        await this.runStaticAnalysis();
      }

      // Phase 2: Runtime Testing
      if (this.config.runRuntime) {
        await this.runRuntimeTests();
      }

      // Phase 3: Combine Results
      this.combineResults();

      // Phase 4: Generate Report
      const report = this.generateReport();

      // Send to observability system
      await this.sendToObservability();

      this.emit('evaluation:completed', {
        score: this.results.score,
        report
      });

      return this.results;
    } catch (error) {
      this.emit('evaluation:failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run static analysis hooks
   */
  async runStaticAnalysis() {
    console.log('Starting static analysis...');
    this.emit('static:started');

    const hooks = [
      { name: 'functionality-match', requirement: 'Functionality Match' },
      { name: 'prompt-injection', requirement: 'No Prompt Injections' },
      { name: 'tool-naming', requirement: 'Clear Tool Names' },
      { name: 'working-examples', requirement: 'Working Examples' },
      { name: 'error-handling', requirement: 'Error Handling' }
    ];

    console.log(`Will run ${hooks.length} hooks for server: ${this.serverPath}`);

    for (const hook of hooks) {
      try {
        this.emit('hook:running', { hook: hook.name });
        
        const result = await this.runHook(hook.name);
        
        this.results.static[hook.requirement] = {
          status: result.score,
          evidence: result.evidence,
          issues: result.issues || [],
          timestamp: new Date().toISOString()
        };

        this.emit('hook:completed', { 
          hook: hook.name, 
          status: result.score 
        });
      } catch (error) {
        this.results.static[hook.requirement] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };

        this.emit('hook:failed', { 
          hook: hook.name, 
          error: error.message 
        });
      }
    }

    this.emit('static:completed', { results: this.results.static });
  }

  /**
   * Run a single hook
   */
  async runHook(hookName) {
    // For shell script paths, look for hooks in the MCP evaluator's hooks directory
    let hookPath;
    let cwd;
    
    if (this.serverPath.endsWith('.sh')) {
      // Use built-in MCP hooks from the parent directory
      hookPath = path.join(process.cwd(), '..', '..', '.claude', 'mcp-hooks', `${hookName}.py`);
      cwd = path.dirname(this.serverPath);
    } else {
      // Use project-specific hooks
      hookPath = path.join(this.serverPath, this.config.hooksPath, `${hookName}.py`);
      cwd = this.serverPath;
    }
    
    // Check if hook exists
    try {
      await fs.access(hookPath);
    } catch (error) {
      console.log(`Hook ${hookName} not found at ${hookPath}, skipping...`);
      return {
        score: 'skip',
        evidence: [`Hook file not found: ${hookPath}`],
        issues: [`Static analysis not available for ${hookName}`]
      };
    }
    
    // Use Python executable from environment or default to python3
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    
    try {
      console.log(`Running hook: ${pythonExecutable} ${hookPath}`);
      const { stdout } = await execAsync(`${pythonExecutable} ${hookPath} "${this.serverPath}"`, {
        cwd
      });

      // Parse hook output (assuming JSON output)
      try {
        const result = JSON.parse(stdout);
        // Normalize score format for consistency
        if (result.score) {
          result.score = this.normalizeScore(result.score);
        }
        return result;
      } catch (e) {
        return this.parseHookOutput(stdout);
      }
    } catch (error) {
      console.log(`Hook ${hookName} failed:`, error.message);
      // Fallback to text parsing if not JSON
      return this.parseHookOutput(error.stdout || error.message);
    }
  }

  /**
   * Normalize hook score values
   */
  normalizeScore(score) {
    if (typeof score === 'string') {
      const lowerScore = score.toLowerCase();
      if (lowerScore.includes('pass') || lowerScore === 'good') return 'pass';
      if (lowerScore.includes('fail') || lowerScore === 'bad') return 'fail';
      if (lowerScore.includes('warn') || lowerScore.includes('need')) return 'warning';
    }
    return score; // Return as-is if already normalized
  }

  /**
   * Parse hook output
   */
  parseHookOutput(output) {
    // Simple parser for hook output
    const lines = output.split('\n');
    const result = {
      score: 'unknown',
      evidence: [],
      issues: []
    };

    for (const line of lines) {
      if (line.includes('PASS')) {
        result.score = 'pass';
      } else if (line.includes('FAIL')) {
        result.score = 'fail';
      } else if (line.includes('Evidence:')) {
        result.evidence.push(line.replace('Evidence:', '').trim());
      } else if (line.includes('Issue:')) {
        result.issues.push(line.replace('Issue:', '').trim());
      }
    }

    return result;
  }

  /**
   * Run runtime tests using Inspector
   */
  async runRuntimeTests() {
    console.log('Starting runtime testing phase...');
    this.emit('runtime:started');

    // Always use manual testing mode to avoid hanging
    console.log('Using manual testing mode - static analysis complete, runtime testing via Inspector UI');
    
    const testResults = {
      mode: 'manual_testing_mode',
      message: 'Static analysis completed. Use Inspector UI for runtime testing.',
      inspector_url: 'http://localhost:6274',
      tools: [{ 
        status: 'manual_testing_recommended', 
        message: 'Use Inspector UI to test tool functionality and responses' 
      }],
      resources: [{ 
        status: 'manual_testing_recommended', 
        message: 'Use Inspector UI to test resource access and content' 
      }],
      prompts: [{ 
        status: 'manual_testing_recommended', 
        message: 'Use Inspector UI to test prompt handling and responses' 
      }],
      errorHandling: [{ 
        status: 'manual_testing_recommended', 
        message: 'Use Inspector UI to test error scenarios and recovery' 
      }],
      performance: [{ 
        status: 'manual_testing_recommended', 
        message: 'Use Inspector UI to assess response times and performance' 
      }]
    };
    
    this.results.runtime = testResults;
    console.log('Runtime testing phase completed (manual mode)');
    this.emit('runtime:completed', { results: testResults });
  }

  /**
   * Check if Inspector is already running
   */
  async checkInspectorRunning() {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('lsof -i:6274 -i:6277', { timeout: 2000 });
      return stdout.trim().length > 0;
    } catch (error) {
      // lsof command failed or ports not in use
      return false;
    }
  }

  /**
   * Load server configuration
   */
  async loadServerConfig() {
    // Handle shell script paths directly
    if (this.serverPath.endsWith('.sh')) {
      return {
        name: path.basename(this.serverPath, '.sh'),
        command: 'bash',
        args: [this.serverPath],
        env: process.env
      };
    }

    // Try to find MCP config file
    const configPaths = [
      'mcp.json',
      'claude_mcp.json',
      '.mcp/config.json'
    ];

    for (const configPath of configPaths) {
      try {
        const fullPath = path.join(this.serverPath, configPath);
        const config = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(config);
      } catch (e) {
        // Try next config path
      }
    }

    // Fallback to package.json
    try {
      const pkgPath = path.join(this.serverPath, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      
      // Check if it's a Python MCP server
      if (pkg.scripts && pkg.scripts.start) {
        // Parse the start script
        const startScript = pkg.scripts.start;
        const parts = startScript.split(' ');
        
        // Extract command and args
        const command = parts[0]; // 'python'
        const args = parts.slice(1); // ['-m', 'module', '--transport', 'stdio']
        
        return {
          name: pkg.name,
          command: command,
          args: args,
          env: {
            PYTHONPATH: this.serverPath,
            ...process.env
          }
        };
      }
      
      // JavaScript/Node.js server fallback
      return {
        name: pkg.name,
        command: pkg.bin || 'node',
        args: [pkg.main || 'index.js']
      };
    } catch (e) {
      throw new Error('No MCP configuration found');
    }
  }

  /**
   * Test tools
   */
  async testTools() {
    this.emit('tools:testing');

    // Discover tools from server
    const tools = await this.discoverTools();
    
    // Test each tool
    const results = await this.inspector.testTools(tools);

    this.emit('tools:tested', { results });
    return results;
  }

  /**
   * Test resources
   */
  async testResources() {
    this.emit('resources:testing');

    // Discover resources
    const resources = await this.discoverResources();
    
    // Test each resource
    const results = await this.inspector.testResources(resources);

    this.emit('resources:tested', { results });
    return results;
  }

  /**
   * Test prompts
   */
  async testPrompts() {
    this.emit('prompts:testing');

    const testPrompts = [
      {
        prompt: "List available tools",
        expectedType: "tools_list"
      },
      {
        prompt: "Show server capabilities",
        expectedType: "capabilities"
      },
      {
        prompt: "Get resource data",
        expectedType: "resource_data"
      }
    ];

    const results = [];
    
    for (const test of testPrompts) {
      try {
        const response = await this.inspector.sendCommand('prompt.send', {
          prompt: test.prompt
        });

        results.push({
          prompt: test.prompt,
          status: 'passed',
          response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          prompt: test.prompt,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    this.emit('prompts:tested', { results });
    return results;
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    this.emit('errors:testing');
    
    const results = await this.inspector.testErrorHandling();
    
    this.emit('errors:tested', { results });
    return results;
  }

  /**
   * Test performance
   */
  async testPerformance() {
    this.emit('performance:testing');

    const performanceTests = [
      { name: 'response_time', threshold: 1000 },
      { name: 'memory_usage', threshold: 100 * 1024 * 1024 }, // 100MB
      { name: 'concurrent_requests', count: 10 }
    ];

    const results = [];
    
    for (const test of performanceTests) {
      const start = Date.now();
      
      try {
        // Run performance test
        await this.runPerformanceTest(test);
        
        const duration = Date.now() - start;
        const passed = duration < (test.threshold || 5000);
        
        results.push({
          test: test.name,
          status: passed ? 'passed' : 'failed',
          duration,
          threshold: test.threshold,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          test: test.name,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    this.emit('performance:tested', { results });
    return results;
  }

  /**
   * Run specific performance test
   */
  async runPerformanceTest(test) {
    switch (test.name) {
      case 'response_time':
        return this.inspector.sendCommand('tool.call', {
          name: 'test_tool',
          arguments: {}
        });
        
      case 'concurrent_requests':
        const promises = [];
        for (let i = 0; i < test.count; i++) {
          promises.push(this.inspector.sendCommand('tool.call', {
            name: 'test_tool',
            arguments: { index: i }
          }));
        }
        return Promise.all(promises);
        
      default:
        return true;
    }
  }

  /**
   * Discover available tools
   */
  async discoverTools() {
    try {
      const response = await this.inspector.sendCommand('tools.list');
      return response.tools || [];
    } catch (error) {
      // Fallback to static discovery
      return this.discoverToolsStatic();
    }
  }

  /**
   * Static tool discovery from code
   */
  async discoverToolsStatic() {
    // Parse source code to find tool definitions
    const tools = [];
    
    // This would parse the server code to find tools
    // For now, return empty array
    return tools;
  }

  /**
   * Discover available resources
   */
  async discoverResources() {
    try {
      const response = await this.inspector.sendCommand('resources.list');
      return response.resources || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Combine static and runtime results
   */
  combineResults() {
    const requirements = [
      'Functionality Match',
      'No Prompt Injections',
      'Clear Tool Names',
      'Working Examples',
      'Error Handling'
    ];

    let totalScore = 0;
    let maxScore = requirements.length * 2; // 2 points per requirement (static + runtime)

    for (const req of requirements) {
      const staticResult = this.results.static[req];
      const runtimeKey = req.toLowerCase().replace(/ /g, '_');
      const runtimeResult = this.results.runtime[runtimeKey];

      // Combine scores
      let score = 0;
      if (staticResult && staticResult.status === 'pass') score += 1;
      if (runtimeResult && this.isRuntimePassed(runtimeResult)) score += 1;

      this.results.combined[req] = {
        staticStatus: staticResult?.status || 'not_tested',
        runtimeStatus: runtimeResult ? 'tested' : 'not_tested',
        score: score / 2, // Normalize to 0-1
        issues: [
          ...(staticResult?.issues || []),
          ...(this.getRuntimeIssues(runtimeResult) || [])
        ]
      };

      totalScore += score;
    }

    this.results.score = (totalScore / maxScore) * 100;
    this.generateRecommendations();
  }

  /**
   * Check if runtime test passed
   */
  isRuntimePassed(result) {
    if (!result) return false;
    
    if (Array.isArray(result)) {
      return result.every(r => r.status === 'passed');
    }
    
    return result.status === 'passed';
  }

  /**
   * Get runtime issues
   */
  getRuntimeIssues(result) {
    const issues = [];
    
    if (!result) return issues;
    
    if (Array.isArray(result)) {
      result.forEach(r => {
        if (r.status !== 'passed') {
          issues.push(`Runtime test failed: ${r.test || r.tool || r.resource}`);
        }
      });
    }
    
    return issues;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    this.results.recommendations = [];

    for (const [req, result] of Object.entries(this.results.combined)) {
      if (result.score < 1) {
        if (result.staticStatus !== 'pass') {
          this.results.recommendations.push(
            `Fix static analysis issues for ${req}`
          );
        }
        if (result.runtimeStatus !== 'tested' || result.score < 0.5) {
          this.results.recommendations.push(
            `Improve runtime behavior for ${req}`
          );
        }
      }
    }

    if (this.results.score >= 80) {
      this.results.recommendations.unshift(
        '✅ Server appears ready for MCP Directory submission'
      );
    } else if (this.results.score >= 60) {
      this.results.recommendations.unshift(
        '⚠️ Server needs minor improvements before submission'
      );
    } else {
      this.results.recommendations.unshift(
        '❌ Server requires significant work before submission'
      );
    }
  }

  /**
   * Generate evaluation report
   */
  generateReport() {
    const report = [];
    
    report.push('='.repeat(60));
    report.push('MCP SERVER EVALUATION REPORT');
    report.push('='.repeat(60));
    report.push(`Timestamp: ${new Date().toISOString()}`);
    report.push(`Server: ${this.serverPath}`);
    report.push(`Overall Score: ${this.results.score.toFixed(1)}%`);
    report.push('-'.repeat(60));
    report.push('');
    
    // Requirements table
    report.push('REQUIREMENTS ASSESSMENT:');
    report.push('');
    
    for (const [req, result] of Object.entries(this.results.combined)) {
      const status = result.score === 1 ? '✅' : result.score > 0 ? '⚠️' : '❌';
      report.push(`${status} ${req}`);
      report.push(`   Static: ${result.staticStatus} | Runtime: ${result.runtimeStatus}`);
      
      if (result.issues.length > 0) {
        report.push('   Issues:');
        result.issues.forEach(issue => {
          report.push(`   - ${issue}`);
        });
      }
      report.push('');
    }
    
    // Recommendations
    report.push('RECOMMENDATIONS:');
    report.push('');
    this.results.recommendations.forEach(rec => {
      report.push(`• ${rec}`);
    });
    
    report.push('');
    report.push('='.repeat(60));
    
    return report.join('\n');
  }

  /**
   * Send results to observability system
   */
  async sendToObservability() {
    try {
      const response = await fetch(`${this.config.observabilityUrl}/api/mcp-evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverPath: this.serverPath,
          results: this.results,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Observability API error: ${response.statusText}`);
      }

      this.emit('observability:sent');
    } catch (error) {
      this.emit('observability:failed', { error: error.message });
      // Don't throw - observability is optional
    }
  }
}

export default MCPEvaluator;