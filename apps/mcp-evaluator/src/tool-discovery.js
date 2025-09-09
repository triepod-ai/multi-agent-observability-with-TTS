/**
 * MCP Tool Discovery Utility
 * Directly connects to MCP server to list tools and get descriptions
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

class MCPToolDiscovery {
  constructor(serverPath) {
    this.serverPath = serverPath;
  }

  /**
   * Discover tools by connecting directly to MCP server
   */
  async discoverTools() {
    try {
      // Start MCP server process
      const serverProcess = this.startMCPServer();
      
      // Send MCP protocol messages to discover tools
      const tools = await this.queryTools(serverProcess);
      
      // Clean up
      serverProcess.kill();
      
      return tools;
    } catch (error) {
      console.error('Tool discovery failed:', error.message);
      return [];
    }
  }

  /**
   * Start MCP server process
   */
  startMCPServer() {
    let command, args;
    
    if (this.serverPath.endsWith('.sh')) {
      // Shell script
      command = 'bash';
      args = [this.serverPath];
    } else if (this.serverPath.includes('python') || this.serverPath.endsWith('.py')) {
      // Python server
      command = 'python3';
      args = [this.serverPath];
    } else {
      // Try to execute directly
      command = this.serverPath;
      args = [];
    }
    
    const process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return process;
  }

  /**
   * Query tools using MCP protocol
   */
  async queryTools(serverProcess) {
    return new Promise((resolve, reject) => {
      let response = '';
      let tools = [];
      
      // MCP initialize request
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'mcp-evaluator',
            version: '1.0.0'
          }
        }
      };
      
      // Tools list request
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };
      
      serverProcess.stdout.on('data', (data) => {
        response += data.toString();
        
        // Parse JSON-RPC responses
        const lines = response.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            try {
              const msg = JSON.parse(line);
              if (msg.result && msg.result.tools) {
                tools = msg.result.tools;
              }
            } catch (e) {
              // Not JSON or incomplete
            }
          }
        });
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.log('MCP Server stderr:', data.toString());
      });
      
      serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start MCP server: ${error.message}`));
      });
      
      // Send requests
      setTimeout(() => {
        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
        setTimeout(() => {
          serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
          
          // Give server time to respond
          setTimeout(() => {
            resolve(tools);
          }, 2000);
        }, 1000);
      }, 500);
    });
  }

  /**
   * Format tools for display
   */
  formatTools(tools) {
    if (!tools || tools.length === 0) {
      return 'No tools found';
    }
    
    let output = `Found ${tools.length} tools:\n\n`;
    
    tools.forEach((tool, index) => {
      output += `${index + 1}. **${tool.name}**\n`;
      
      if (tool.description) {
        output += `   Description: ${tool.description}\n`;
      }
      
      if (tool.inputSchema) {
        output += `   Parameters:\n`;
        const properties = tool.inputSchema.properties || {};
        Object.entries(properties).forEach(([param, schema]) => {
          const required = tool.inputSchema.required?.includes(param) ? ' (required)' : '';
          output += `     - ${param}: ${schema.type || 'unknown'}${required}\n`;
          if (schema.description) {
            output += `       ${schema.description}\n`;
          }
        });
      }
      
      output += '\n';
    });
    
    return output;
  }
}

export default MCPToolDiscovery;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const serverPath = process.argv[2];
  if (!serverPath) {
    console.log('Usage: node tool-discovery.js <server-path>');
    process.exit(1);
  }
  
  const discovery = new MCPToolDiscovery(serverPath);
  discovery.discoverTools().then(tools => {
    console.log(discovery.formatTools(tools));
  }).catch(error => {
    console.error('Discovery failed:', error.message);
  });
}