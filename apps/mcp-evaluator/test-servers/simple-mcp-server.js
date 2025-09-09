#!/usr/bin/env node

/**
 * Simple MCP Test Server
 * A minimal MCP server implementation for testing the evaluator
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create server instance
const server = new Server(
  {
    name: 'simple-test-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool: echo
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back the input message',
        inputSchema: {
          type: 'object',
          properties: {
            message: { 
              type: 'string',
              description: 'Message to echo'
            }
          },
          required: ['message']
        }
      },
      {
        name: 'calculate',
        description: 'Perform basic arithmetic calculation',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string',
              enum: ['add', 'subtract', 'multiply', 'divide'],
              description: 'Mathematical operation'
            },
            a: { 
              type: 'number',
              description: 'First number'
            },
            b: { 
              type: 'number',
              description: 'Second number'
            }
          },
          required: ['operation', 'a', 'b']
        }
      },
      {
        name: 'get_time',
        description: 'Get the current time',
        inputSchema: {
          type: 'object',
          properties: {
            format: { 
              type: 'string',
              enum: ['iso', 'unix', 'locale'],
              description: 'Time format',
              default: 'iso'
            }
          }
        }
      }
    ]
  };
});

// Tool handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'echo':
      if (!args.message) {
        throw new Error('Message is required for echo tool');
      }
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${args.message}`
          }
        ]
      };
    
    case 'calculate':
      if (!args.operation || args.a === undefined || args.b === undefined) {
        throw new Error('Operation, a, and b are required for calculate tool');
      }
      
      let result;
      switch (args.operation) {
        case 'add':
          result = args.a + args.b;
          break;
        case 'subtract':
          result = args.a - args.b;
          break;
        case 'multiply':
          result = args.a * args.b;
          break;
        case 'divide':
          if (args.b === 0) {
            throw new Error('Division by zero');
          }
          result = args.a / args.b;
          break;
        default:
          throw new Error(`Unknown operation: ${args.operation}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Result: ${result}`
          }
        ]
      };
    
    case 'get_time':
      const format = args.format || 'iso';
      let time;
      
      switch (format) {
        case 'iso':
          time = new Date().toISOString();
          break;
        case 'unix':
          time = Date.now();
          break;
        case 'locale':
          time = new Date().toLocaleString();
          break;
        default:
          time = new Date().toISOString();
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Current time: ${time}`
          }
        ]
      };
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Resources
server.setRequestHandler('resources/list', async () => {
  return {
    resources: [
      {
        uri: 'test://readme',
        name: 'Test README',
        description: 'A test resource for the evaluator',
        mimeType: 'text/plain'
      },
      {
        uri: 'test://config',
        name: 'Test Configuration',
        description: 'Server configuration information',
        mimeType: 'application/json'
      }
    ]
  };
});

server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case 'test://readme':
      return {
        contents: [
          {
            uri: 'test://readme',
            mimeType: 'text/plain',
            text: `# Simple MCP Test Server

This is a simple test server for validating the MCP Evaluator.

## Features
- Echo tool for testing basic functionality
- Calculate tool for arithmetic operations
- Get time tool for temporal operations
- Test resources for resource handling

## Usage
Run with: node simple-mcp-server.js`
          }
        ]
      };
    
    case 'test://config':
      return {
        contents: [
          {
            uri: 'test://config',
            mimeType: 'application/json',
            text: JSON.stringify({
              name: 'simple-test-server',
              version: '1.0.0',
              capabilities: ['tools', 'resources'],
              transport: 'stdio'
            }, null, 2)
          }
        ]
      };
    
    default:
      throw new Error(`Resource not found: ${uri}`);
  }
});

// Prompts (if needed)
server.setRequestHandler('prompts/list', async () => {
  return {
    prompts: [
      {
        name: 'greeting',
        description: 'Generate a greeting message',
        arguments: [
          {
            name: 'name',
            description: 'Name to greet',
            required: false
          }
        ]
      }
    ]
  };
});

server.setRequestHandler('prompts/get', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'greeting') {
    const userName = args?.name || 'User';
    return {
      description: 'Greeting prompt',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate a friendly greeting for ${userName}`
          }
        }
      ]
    };
  }
  
  throw new Error(`Unknown prompt: ${name}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Simple MCP Test Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});