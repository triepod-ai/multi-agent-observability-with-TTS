/**
 * MCP Inspector Bridge
 * Provides programmatic control of MCP Inspector for automated testing
 * Uses HTTP API to communicate with Inspector server
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';

class InspectorBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      inspectorCommand: options.inspectorCommand || 'npx',
      inspectorPackage: options.inspectorPackage || '@modelcontextprotocol/inspector',
      proxyPort: options.proxyPort || 6277,  // New Inspector v0.16.6 proxy port
      clientPort: options.clientPort || 6274, // New Inspector v0.16.6 client port
      serverPort: options.serverPort || 6277, // Use proxy port for API communication
      timeout: options.timeout || 30000,
      startupDelay: options.startupDelay || 5000, // Increased for new version
      ...options
    };
    this.process = null;
    this.serverReady = false;
    this.results = [];
    this.authToken = null; // Auth token for new Inspector
  }

  /**
   * Connect to existing MCP Inspector (assumes it's already running)
   */
  async startInspector(serverConfig) {
    try {
      console.log('Connecting to existing Inspector at port', this.config.serverPort);
      
      // Don't start a new process - use existing Inspector
      this.emit('inspector:started', { config: serverConfig, existing: true });

      // Wait for server to be ready
      await this.waitForServer();
      
      return true;
    } catch (error) {
      this.emit('inspector:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Wait for Inspector server to be ready
   */
  async waitForServer() {
    const maxAttempts = 30;
    const delay = 1000;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.makeRequest('GET', '', '/health'); // Direct path, no /api prefix
        if (response && response.status === 'ok') {
          this.serverReady = true;
          this.emit('inspector:ready');
          return true;
        }
      } catch (error) {
        // Server not ready yet
        if (i === maxAttempts - 1) {
          throw new Error('Inspector server failed to start');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Inspector server startup timeout');
  }

  /**
   * Make HTTP request to Inspector server
   */
  async makeRequest(method, apiPrefix = '/api', path, data = null) {
    // Handle backward compatibility - if apiPrefix is the actual path
    if (typeof apiPrefix === 'string' && path === undefined) {
      path = apiPrefix;
      apiPrefix = '/api';
    }
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: this.config.serverPort,
        path: `${apiPrefix}${path}`,
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
            }
          } catch (error) {
            // If not JSON, return raw response
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(responseData);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
            }
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

  /**
   * Execute a test sequence on the MCP server
   */
  async runTestSequence(tests) {
    const results = [];
    
    for (const test of tests) {
      try {
        const result = await this.executeTest(test);
        results.push({
          test: test.name,
          status: 'passed',
          data: result,
          timestamp: new Date().toISOString()
        });
        this.emit('test:passed', { test: test.name, result });
      } catch (error) {
        results.push({
          test: test.name,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.emit('test:failed', { test: test.name, error: error.message });
      }
    }

    return results;
  }

  /**
   * Execute a single test
   */
  async executeTest(test) {
    try {
      let response;
      
      switch (test.command) {
        case 'tools.list':
          response = await this.listTools();
          break;
        case 'tool.call':
          response = await this.callTool(test.params.name, test.params.arguments);
          break;
        case 'resources.list':
          response = await this.listResources();
          break;
        case 'resource.read':
          response = await this.readResource(test.params.uri);
          break;
        case 'prompts.list':
          response = await this.listPrompts();
          break;
        case 'prompt.send':
          response = await this.sendPrompt(test.params.prompt);
          break;
        default:
          throw new Error(`Unknown command: ${test.command}`);
      }
      
      // Validate response if validation function provided
      if (test.validate && !test.validate(response)) {
        throw new Error(`Validation failed for ${test.name}`);
      }
      
      return response;
    } catch (error) {
      this.emit('test:error', { test: test.name, error: error.message });
      throw error;
    }
  }

  /**
   * List available tools
   */
  async listTools() {
    try {
      const response = await this.makeRequest('GET', '/tools');
      return { tools: response.tools || [] };
    } catch (error) {
      return { tools: [], error: error.message };
    }
  }

  /**
   * Call a tool
   */
  async callTool(name, args = {}) {
    try {
      const response = await this.makeRequest('POST', '/tools/call', {
        name,
        arguments: args
      });
      return response;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * List available resources
   */
  async listResources() {
    try {
      const response = await this.makeRequest('GET', '/resources');
      return { resources: response.resources || [] };
    } catch (error) {
      return { resources: [], error: error.message };
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri) {
    try {
      const response = await this.makeRequest('POST', '/resources/read', { uri });
      return response;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * List available prompts
   */
  async listPrompts() {
    try {
      const response = await this.makeRequest('GET', '/prompts');
      return { prompts: response.prompts || [] };
    } catch (error) {
      return { prompts: [], error: error.message };
    }
  }

  /**
   * Send a prompt
   */
  async sendPrompt(prompt) {
    try {
      const response = await this.makeRequest('POST', '/prompts/send', { prompt });
      return response;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get server info
   */
  async getServerInfo() {
    try {
      const response = await this.makeRequest('GET', '/info');
      return response;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Test specific MCP tools
   */
  async testTools(tools) {
    const results = [];
    
    for (const tool of tools) {
      this.emit('tool:testing', { tool: tool.name });
      
      try {
        const response = await this.callTool(tool.name, tool.testArgs || {});
        const passed = this.validateToolResponse(tool, response);
        
        results.push({
          tool: tool.name,
          status: passed ? 'passed' : 'failed',
          response,
          timestamp: new Date().toISOString()
        });

        this.emit(passed ? 'tool:passed' : 'tool:failed', { 
          tool: tool.name, 
          response 
        });
      } catch (error) {
        results.push({
          tool: tool.name,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        this.emit('tool:error', { 
          tool: tool.name, 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Test MCP resources
   */
  async testResources(resources) {
    const results = [];
    
    for (const resource of resources) {
      this.emit('resource:testing', { resource: resource.uri });
      
      try {
        const response = await this.readResource(resource.uri);
        const passed = resource.validate ? 
          resource.validate(response) : 
          !response.error;
        
        results.push({
          resource: resource.uri,
          status: passed ? 'passed' : 'failed',
          response,
          timestamp: new Date().toISOString()
        });

        this.emit(passed ? 'resource:passed' : 'resource:failed', { 
          resource: resource.uri, 
          response 
        });
      } catch (error) {
        results.push({
          resource: resource.uri,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        this.emit('resource:error', { 
          resource: resource.uri, 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    const errorTests = [
      {
        name: 'Invalid tool name',
        test: () => this.callTool('nonexistent_tool_xyz'),
        expectError: true
      },
      {
        name: 'Invalid arguments',
        test: () => this.callTool('valid_tool', { invalid: 'params' }),
        expectError: true
      },
      {
        name: 'Resource not found',
        test: () => this.readResource('invalid://resource'),
        expectError: true
      }
    ];

    const results = [];
    
    for (const test of errorTests) {
      try {
        const response = await test.test();
        
        // Check if error was handled gracefully
        const handled = response.error !== undefined;
        
        results.push({
          test: test.name,
          status: (test.expectError && handled) ? 'passed' : 'failed',
          errorHandled: handled,
          response,
          timestamp: new Date().toISOString()
        });

        this.emit('error:tested', { test: test.name, handled });
      } catch (error) {
        // Network error - different from handled error
        results.push({
          test: test.name,
          status: 'failed',
          errorHandled: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        this.emit('error:unhandled', { test: test.name, error: error.message });
      }
    }

    return results;
  }

  /**
   * Validate tool response
   */
  validateToolResponse(tool, response) {
    // Check for required fields
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Custom validation
    if (tool.validate) {
      return tool.validate(response);
    }

    // Default validation - check for error-free response
    return !response.error;
  }

  /**
   * Setup event handlers for Inspector process
   */
  setupEventHandlers() {
    if (!this.process) return;

    this.process.stdout.on('data', (data) => {
      const message = data.toString();
      this.emit('inspector:output', { message });
      
      // Look for startup confirmation
      if (message.includes('MCP Inspector is up and running')) {
        this.emit('inspector:ui-ready', { 
          url: `http://localhost:${this.config.clientPort}` 
        });
      }
    });

    this.process.stderr.on('data', (data) => {
      const error = data.toString();
      
      // Some stderr output is informational
      if (!error.includes('Error') && !error.includes('error')) {
        this.emit('inspector:info', { message: error });
      } else {
        this.emit('inspector:error', { error });
      }
    });

    this.process.on('close', (code) => {
      this.emit('inspector:closed', { code });
      this.process = null;
      this.serverReady = false;
    });

    this.process.on('error', (error) => {
      this.emit('inspector:error', { error: error.message });
      this.process = null;
      this.serverReady = false;
    });
  }

  /**
   * Stop Inspector
   */
  async stop() {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Give it time to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force kill if still running
      if (this.process) {
        this.process.kill('SIGKILL');
      }
      
      this.process = null;
      this.serverReady = false;
    }
    this.emit('inspector:stopped');
  }

  /**
   * Get test results
   */
  getResults() {
    return this.results;
  }

  /**
   * Check if Inspector is running
   */
  isRunning() {
    return this.process !== null && this.serverReady;
  }
}

export default InspectorBridge;