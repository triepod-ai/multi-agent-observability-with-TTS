/**
 * Unified MCP Evaluator
 * Combines static analysis and runtime testing with weighted scoring
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import RuntimeTester from './runtime-tester.js';

const execAsync = promisify(exec);

class UnifiedEvaluator extends EventEmitter {
  constructor(serverPath, options = {}) {
    super();
    this.serverPath = serverPath;
    this.config = {
      // Test configuration
      runStatic: options.runStatic !== false,
      runRuntime: options.runRuntime !== false,
      
      // Scoring weights (must sum to 1.0)
      weights: {
        static: options.weights?.static || 0.4,
        runtime: options.weights?.runtime || 0.6
      },
      
      // Paths
      hooksPath: options.hooksPath || '.claude/hooks',
      configPath: options.configPath || 'mcp.json',
      
      // Thresholds
      passThreshold: options.passThreshold || 70,
      failThreshold: options.failThreshold || 40,
      
      // Features
      sendToObservability: options.sendToObservability !== false,
      observabilityUrl: options.observabilityUrl || 'http://localhost:3456',
      generateReport: options.generateReport !== false,
      outputFormat: options.outputFormat || 'json', // json, markdown, html
      
      ...options
    };

    this.runtimeTester = new RuntimeTester(serverPath, options);
    
    this.results = {
      static: {
        score: 0,
        tests: {},
        summary: {}
      },
      runtime: {
        score: 0,
        tests: {},
        summary: {}
      },
      combined: {
        score: 0,
        status: 'pending',
        breakdown: {},
        recommendations: []
      },
      metadata: {
        serverPath: serverPath,
        timestamp: new Date().toISOString(),
        duration: 0
      }
    };
  }

  /**
   * Run complete evaluation
   */
  async evaluate() {
    const startTime = Date.now();
    
    this.emit('evaluation:started', {
      serverPath: this.serverPath,
      config: this.config,
      timestamp: new Date().toISOString()
    });

    try {
      // Load server configuration
      const serverConfig = await this.loadServerConfig();

      // Phase 1: Static Analysis
      if (this.config.runStatic) {
        await this.runStaticAnalysis();
      }

      // Phase 2: Runtime Testing
      if (this.config.runRuntime) {
        await this.runRuntimeTests(serverConfig);
      }

      // Phase 3: Calculate Combined Score
      this.calculateCombinedScore();

      // Phase 4: Generate Recommendations
      this.generateRecommendations();

      // Phase 5: Set Final Status
      this.setFinalStatus();

      // Update metadata
      this.results.metadata.duration = Date.now() - startTime;

      // Send to observability system
      if (this.config.sendToObservability) {
        await this.sendToObservability();
      }

      // Generate report
      const report = this.config.generateReport ? 
        await this.generateReport() : 
        this.results;

      this.emit('evaluation:completed', {
        score: this.results.combined.score,
        status: this.results.combined.status,
        report: report
      });

      return report;

    } catch (error) {
      this.emit('evaluation:failed', { error: error.message });
      this.results.combined.status = 'error';
      this.results.combined.error = error.message;
      throw error;
    }
  }

  /**
   * Run static analysis using hooks
   */
  async runStaticAnalysis() {
    this.emit('static:started');

    const hooks = [
      { 
        name: 'functionality-match', 
        requirement: 'Functionality Match',
        weight: 0.25,
        description: 'Server description matches actual functionality'
      },
      { 
        name: 'prompt-injection', 
        requirement: 'No Prompt Injections',
        weight: 0.25,
        description: 'Resistant to prompt injection attacks'
      },
      { 
        name: 'tool-naming', 
        requirement: 'Clear Tool Names',
        weight: 0.15,
        description: 'Tools have clear, descriptive names'
      },
      { 
        name: 'working-examples', 
        requirement: 'Working Examples',
        weight: 0.20,
        description: 'Documentation includes working examples'
      },
      { 
        name: 'error-handling', 
        requirement: 'Error Handling',
        weight: 0.15,
        description: 'Proper error handling implemented'
      }
    ];

    let totalScore = 0;
    let totalWeight = 0;

    for (const hook of hooks) {
      try {
        this.emit('hook:running', { hook: hook.name });
        
        const result = await this.runHook(hook.name);
        
        // Convert pass/fail to score
        const score = result.score === 'pass' ? 100 : 
                     result.score === 'partial' ? 50 : 0;
        
        this.results.static.tests[hook.requirement] = {
          status: result.score,
          score: score,
          weight: hook.weight,
          evidence: result.evidence || [],
          issues: result.issues || [],
          description: hook.description,
          timestamp: new Date().toISOString()
        };

        totalScore += score * hook.weight;
        totalWeight += hook.weight;

        this.emit('hook:completed', {
          hook: hook.name,
          status: result.score,
          score: score
        });

      } catch (error) {
        this.results.static.tests[hook.requirement] = {
          status: 'error',
          score: 0,
          weight: hook.weight,
          error: error.message,
          description: hook.description,
          timestamp: new Date().toISOString()
        };

        this.emit('hook:failed', {
          hook: hook.name,
          error: error.message
        });
      }
    }

    // Calculate static score
    this.results.static.score = totalWeight > 0 ? 
      Math.round(totalScore / totalWeight) : 0;

    // Generate summary
    this.results.static.summary = this.generateStaticSummary();

    this.emit('static:completed', {
      score: this.results.static.score,
      summary: this.results.static.summary
    });
  }

  /**
   * Run hook script
   */
  async runHook(hookName) {
    const hookPath = path.join(this.serverPath, this.config.hooksPath, `${hookName}.py`);
    
    // Check if hook exists
    try {
      await fs.access(hookPath);
    } catch (e) {
      throw new Error(`Hook not found: ${hookPath}`);
    }

    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    
    try {
      const { stdout, stderr } = await execAsync(
        `${pythonExecutable} ${hookPath}`,
        { cwd: this.serverPath }
      );

      // Try to parse as JSON first
      try {
        return JSON.parse(stdout);
      } catch (e) {
        // Fallback to text parsing
        return this.parseHookOutput(stdout);
      }
    } catch (error) {
      // Check if error contains output
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch (e) {
          return this.parseHookOutput(error.stdout);
        }
      }
      throw error;
    }
  }

  /**
   * Parse text hook output
   */
  parseHookOutput(output) {
    const lines = output.split('\n');
    const result = {
      score: 'unknown',
      evidence: [],
      issues: []
    };

    for (const line of lines) {
      if (line.includes('PASS')) {
        result.score = 'pass';
      } else if (line.includes('PARTIAL')) {
        result.score = 'partial';
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
   * Run runtime tests
   */
  async runRuntimeTests(serverConfig) {
    this.emit('runtime:started');

    try {
      // Run comprehensive runtime tests
      const runtimeResults = await this.runtimeTester.runTests(serverConfig);
      
      // Process results
      this.results.runtime.tests = runtimeResults;
      
      // Calculate runtime score
      this.results.runtime.score = this.runtimeTester.calculateScore();
      
      // Generate summary
      this.results.runtime.summary = this.generateRuntimeSummary(runtimeResults);

      this.emit('runtime:completed', {
        score: this.results.runtime.score,
        summary: this.results.runtime.summary
      });

    } catch (error) {
      this.emit('runtime:failed', { error: error.message });
      
      // Implement fallback mechanism
      console.log('Runtime testing failed, attempting fallback...');
      
      // Try basic runtime tests without Inspector
      try {
        const fallbackResults = await this.runFallbackTests(serverConfig);
        this.results.runtime.tests = fallbackResults;
        this.results.runtime.score = this.calculateFallbackScore(fallbackResults);
        this.results.runtime.summary = {
          method: 'fallback',
          message: 'Runtime tests completed using fallback method (Inspector unavailable)',
          error: error.message
        };
        
        this.emit('runtime:fallback', {
          score: this.results.runtime.score,
          originalError: error.message
        });
      } catch (fallbackError) {
        // Complete failure - no runtime testing possible
        this.results.runtime.score = 0;
        this.results.runtime.error = {
          primary: error.message,
          fallback: fallbackError.message
        };
        this.results.runtime.summary = {
          method: 'failed',
          message: 'Runtime testing unavailable',
          errors: [error.message, fallbackError.message]
        };
      }
    }
  }

  /**
   * Run fallback tests without Inspector
   */
  async runFallbackTests(serverConfig) {
    const results = {
      capabilities: { discovered: false, reason: 'Inspector unavailable' },
      tools: [],
      resources: [],
      errors: [],
      performance: {},
      security: []
    };

    // Try to start the server directly and test basic functionality
    try {
      // Check if server executable exists
      const { stdout } = await execAsync(`which ${serverConfig.command || 'node'}`);
      if (stdout) {
        results.capabilities.serverExecutable = true;
      }

      // Try to run server with --version or --help
      try {
        const { stdout: versionOut } = await execAsync(
          `${serverConfig.command || 'node'} ${serverConfig.args ? serverConfig.args.join(' ') : ''} --version`,
          { timeout: 5000 }
        );
        if (versionOut) {
          results.capabilities.version = versionOut.trim();
        }
      } catch (e) {
        // Version check failed, not critical
      }

      // Mark as partially successful
      results.capabilities.fallbackTest = 'partial';
      
    } catch (error) {
      results.capabilities.fallbackTest = 'failed';
      results.capabilities.error = error.message;
    }

    return results;
  }

  /**
   * Calculate fallback score
   */
  calculateFallbackScore(results) {
    let score = 0;
    
    // Basic scoring for fallback tests
    if (results.capabilities.serverExecutable) score += 30;
    if (results.capabilities.version) score += 20;
    if (results.capabilities.fallbackTest === 'partial') score += 10;
    
    // Maximum fallback score is 60 (partial credit)
    return Math.min(score, 60);
  }

  /**
   * Load server configuration
   */
  async loadServerConfig() {
    // Try multiple config locations
    const configPaths = [
      this.config.configPath,
      'mcp.json',
      'claude_mcp.json',
      '.mcp/config.json',
      'mcp-server.json'
    ];

    for (const configPath of configPaths) {
      try {
        const fullPath = path.join(this.serverPath, configPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const config = JSON.parse(content);
        
        this.emit('config:loaded', { path: configPath });
        return config;
      } catch (e) {
        // Try next config
      }
    }

    // Fallback to package.json
    try {
      const pkgPath = path.join(this.serverPath, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      
      return {
        name: pkg.name || 'mcp-server',
        command: pkg.bin ? Object.values(pkg.bin)[0] : 'node',
        args: [pkg.main || 'index.js'],
        description: pkg.description,
        version: pkg.version
      };
    } catch (e) {
      throw new Error('No MCP configuration found');
    }
  }

  /**
   * Calculate combined score
   */
  calculateCombinedScore() {
    const staticScore = this.results.static.score * this.config.weights.static;
    const runtimeScore = this.results.runtime.score * this.config.weights.runtime;
    
    this.results.combined.score = Math.round(staticScore + runtimeScore);
    
    this.results.combined.breakdown = {
      static: {
        score: this.results.static.score,
        weight: this.config.weights.static,
        contribution: staticScore
      },
      runtime: {
        score: this.results.runtime.score,
        weight: this.config.weights.runtime,
        contribution: runtimeScore
      }
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Static analysis recommendations
    if (this.results.static.tests) {
      for (const [requirement, test] of Object.entries(this.results.static.tests)) {
        if (test.status !== 'pass') {
          recommendations.push({
            category: 'static',
            requirement: requirement,
            priority: test.status === 'fail' ? 'high' : 'medium',
            issue: test.issues?.join(', ') || `${requirement} check failed`,
            recommendation: this.getRecommendation(requirement, test)
          });
        }
      }
    }

    // Runtime testing recommendations
    if (this.results.runtime.tests) {
      // Tool recommendations
      if (this.results.runtime.tests.tools) {
        const failedTools = this.results.runtime.tests.tools.filter(t => t.status !== 'passed');
        if (failedTools.length > 0) {
          recommendations.push({
            category: 'runtime',
            requirement: 'Tool Functionality',
            priority: 'high',
            issue: `${failedTools.length} tools failed testing`,
            recommendation: 'Review and fix tool implementations'
          });
        }
      }

      // Security recommendations
      if (this.results.runtime.tests.security) {
        const securityFails = this.results.runtime.tests.security.filter(s => s.status !== 'passed');
        if (securityFails.length > 0) {
          recommendations.push({
            category: 'runtime',
            requirement: 'Security',
            priority: 'critical',
            issue: 'Security vulnerabilities detected',
            recommendation: 'Implement proper input validation and security controls'
          });
        }
      }

      // Performance recommendations
      if (this.results.runtime.tests.performance) {
        for (const [test, perf] of Object.entries(this.results.runtime.tests.performance)) {
          if (perf.avg > 1000) {
            recommendations.push({
              category: 'runtime',
              requirement: 'Performance',
              priority: 'medium',
              issue: `${test} average response time: ${perf.avg}ms`,
              recommendation: 'Optimize performance for better response times'
            });
          }
        }
      }
    }

    this.results.combined.recommendations = recommendations;
  }

  /**
   * Get specific recommendation
   */
  getRecommendation(requirement, test) {
    const recommendations = {
      'Functionality Match': 'Update server description to accurately reflect implemented functionality',
      'No Prompt Injections': 'Implement input validation and prompt sanitization',
      'Clear Tool Names': 'Rename tools to be more descriptive and follow naming conventions',
      'Working Examples': 'Add comprehensive examples to documentation',
      'Error Handling': 'Implement proper error handling and graceful failure modes'
    };

    return recommendations[requirement] || 'Review and fix identified issues';
  }

  /**
   * Set final status
   */
  setFinalStatus() {
    const score = this.results.combined.score;
    
    if (score >= this.config.passThreshold) {
      this.results.combined.status = 'passed';
    } else if (score >= this.config.failThreshold) {
      this.results.combined.status = 'partial';
    } else {
      this.results.combined.status = 'failed';
    }

    // Add certification level
    if (score >= 90) {
      this.results.combined.certification = 'gold';
    } else if (score >= 75) {
      this.results.combined.certification = 'silver';
    } else if (score >= 60) {
      this.results.combined.certification = 'bronze';
    } else {
      this.results.combined.certification = 'none';
    }
  }

  /**
   * Generate static summary
   */
  generateStaticSummary() {
    const tests = Object.values(this.results.static.tests || {});
    
    return {
      total: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      partial: tests.filter(t => t.status === 'partial').length,
      failed: tests.filter(t => t.status === 'fail').length,
      errors: tests.filter(t => t.status === 'error').length
    };
  }

  /**
   * Generate runtime summary
   */
  generateRuntimeSummary(results) {
    const summary = {
      capabilities: results.capabilities?.discovered || false,
      tools: {
        total: results.tools?.length || 0,
        passed: results.tools?.filter(t => t.status === 'passed').length || 0
      },
      resources: {
        total: results.resources?.length || 0,
        passed: results.resources?.filter(r => r.status === 'passed').length || 0
      },
      security: {
        total: results.security?.length || 0,
        passed: results.security?.filter(s => s.status === 'passed').length || 0
      },
      errors: {
        total: results.errors?.length || 0,
        handled: results.errors?.filter(e => e.status === 'passed').length || 0
      }
    };

    // Add performance metrics
    if (results.performance) {
      summary.performance = {};
      for (const [test, metrics] of Object.entries(results.performance)) {
        summary.performance[test] = {
          avg: Math.round(metrics.avg),
          min: metrics.min,
          max: metrics.max
        };
      }
    }

    return summary;
  }

  /**
   * Send results to observability system
   */
  async sendToObservability() {
    try {
      const response = await fetch(`${this.config.observabilityUrl}/api/mcp-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'MCP_EVALUATION_COMPLETED',
          data: this.results,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Observability API error: ${response.status}`);
      }

      this.emit('observability:sent');
    } catch (error) {
      this.emit('observability:error', { error: error.message });
      // Don't throw - observability is optional
    }
  }

  /**
   * Generate formatted report
   */
  async generateReport() {
    switch (this.config.outputFormat) {
      case 'markdown':
        return this.generateMarkdownReport();
      case 'html':
        return this.generateHtmlReport();
      case 'json':
      default:
        return this.results;
    }
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport() {
    const { combined, static: staticResults, runtime, metadata } = this.results;
    
    let report = `# MCP Server Evaluation Report\n\n`;
    report += `**Server:** ${metadata.serverPath}\n`;
    report += `**Date:** ${new Date(metadata.timestamp).toLocaleString()}\n`;
    report += `**Duration:** ${metadata.duration}ms\n\n`;
    
    report += `## Overall Score: ${combined.score}/100 (${combined.status.toUpperCase()})\n\n`;
    report += `**Certification Level:** ${combined.certification.toUpperCase()}\n\n`;
    
    report += `### Score Breakdown\n`;
    report += `- Static Analysis: ${staticResults.score}/100 (${Math.round(combined.breakdown.static.contribution)}% of total)\n`;
    report += `- Runtime Testing: ${runtime.score}/100 (${Math.round(combined.breakdown.runtime.contribution)}% of total)\n\n`;
    
    report += `## Static Analysis Results\n\n`;
    for (const [requirement, test] of Object.entries(staticResults.tests || {})) {
      const icon = test.status === 'pass' ? '✅' : 
                   test.status === 'partial' ? '⚠️' : '❌';
      report += `### ${icon} ${requirement}\n`;
      report += `- **Status:** ${test.status}\n`;
      report += `- **Score:** ${test.score}/100\n`;
      if (test.issues?.length > 0) {
        report += `- **Issues:** ${test.issues.join(', ')}\n`;
      }
      report += `\n`;
    }
    
    report += `## Runtime Testing Results\n\n`;
    report += `### Summary\n`;
    const summary = runtime.summary || {};
    report += `- **Tools:** ${summary.tools?.passed || 0}/${summary.tools?.total || 0} passed\n`;
    report += `- **Resources:** ${summary.resources?.passed || 0}/${summary.resources?.total || 0} passed\n`;
    report += `- **Security:** ${summary.security?.passed || 0}/${summary.security?.total || 0} passed\n`;
    report += `- **Error Handling:** ${summary.errors?.handled || 0}/${summary.errors?.total || 0} handled\n\n`;
    
    if (combined.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const sorted = combined.recommendations.sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );
      
      for (const rec of sorted) {
        const icon = rec.priority === 'critical' ? '🚨' :
                    rec.priority === 'high' ? '❗' :
                    rec.priority === 'medium' ? '⚠️' : 'ℹ️';
        report += `${icon} **[${rec.priority.toUpperCase()}] ${rec.requirement}**\n`;
        report += `- Issue: ${rec.issue}\n`;
        report += `- Recommendation: ${rec.recommendation}\n\n`;
      }
    }
    
    return report;
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport() {
    // Simple HTML report generation
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>MCP Evaluation Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .score { font-size: 48px; font-weight: bold; }
    .passed { color: #4CAF50; }
    .partial { color: #FF9800; }
    .failed { color: #F44336; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .recommendation { padding: 10px; margin: 10px 0; border-left: 4px solid #2196F3; background: #f5f5f5; }
    .critical { border-left-color: #F44336; }
    .high { border-left-color: #FF9800; }
    .medium { border-left-color: #2196F3; }
  </style>
</head>
<body>
  <h1>MCP Server Evaluation Report</h1>
  <div class="score ${this.results.combined.status}">${this.results.combined.score}/100</div>
  <p>Status: ${this.results.combined.status.toUpperCase()}</p>
  <p>Certification: ${this.results.combined.certification.toUpperCase()}</p>
  
  <h2>Static Analysis</h2>
  <table>
    <tr><th>Requirement</th><th>Status</th><th>Score</th></tr>
    ${Object.entries(this.results.static.tests || {}).map(([req, test]) => `
      <tr>
        <td>${req}</td>
        <td class="${test.status}">${test.status}</td>
        <td>${test.score}/100</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>Runtime Testing</h2>
  <pre>${JSON.stringify(this.results.runtime.summary, null, 2)}</pre>
  
  <h2>Recommendations</h2>
  ${this.results.combined.recommendations.map(rec => `
    <div class="recommendation ${rec.priority}">
      <strong>[${rec.priority.toUpperCase()}] ${rec.requirement}</strong><br>
      Issue: ${rec.issue}<br>
      Recommendation: ${rec.recommendation}
    </div>
  `).join('')}
</body>
</html>`;
    
    return html;
  }
}

export default UnifiedEvaluator;