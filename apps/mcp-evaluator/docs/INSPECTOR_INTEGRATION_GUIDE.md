# MCP Inspector Integration Guide

## Overview

The MCP Evaluator now includes comprehensive integration with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for runtime testing. This combines static analysis (via hooks) with dynamic runtime testing for complete server evaluation.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Evaluator                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────┐    ┌────────────────────────┐  │
│  │  Static Analysis  │    │   Runtime Testing      │  │
│  │  (Python Hooks)   │    │   (MCP Inspector)      │  │
│  └───────────────────┘    └────────────────────────┘  │
│           │                         │                   │
│           └─────────┬───────────────┘                  │
│                     ▼                                   │
│           ┌──────────────────┐                        │
│           │ Unified Scoring  │                        │
│           └──────────────────┘                        │
│                     │                                   │
│                     ▼                                   │
│           ┌──────────────────┐                        │
│           │  Report & Observ │                        │
│           └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Inspector Bridge (`src/inspector-bridge.js`)
- Programmatic control of MCP Inspector
- Handles server lifecycle management
- Sends test commands and collects responses
- Event-driven architecture for real-time updates

### 2. Runtime Tester (`src/runtime-tester.js`)
- Comprehensive runtime testing module
- Tests tools, resources, prompts, errors, performance, and security
- Automatic test generation from server capabilities
- Detailed scoring and reporting

### 3. Unified Evaluator (`src/unified-evaluator.js`)
- Combines static and runtime results
- Weighted scoring system (default: 40% static, 60% runtime)
- Generates recommendations based on findings
- Multiple output formats (JSON, Markdown, HTML)

## Installation

```bash
# Install dependencies
npm install

# Or if using the wrapper script
./mcp-evaluate-wrapper.sh install
```

## Usage

### Basic Evaluation

```bash
# Evaluate a local MCP server
node bin/mcp-evaluate /path/to/mcp-server

# With specific configuration
node bin/mcp-evaluate /path/to/mcp-server --config evaluation-config.json

# Output as Markdown report
node bin/mcp-evaluate /path/to/mcp-server --format markdown --output report.md
```

### Programmatic Usage

```javascript
import UnifiedEvaluator from './src/unified-evaluator.js';

const evaluator = new UnifiedEvaluator('/path/to/server', {
  runStatic: true,
  runRuntime: true,
  weights: {
    static: 0.4,
    runtime: 0.6
  },
  outputFormat: 'markdown'
});

// Listen to events
evaluator.on('evaluation:started', (data) => {
  console.log('Evaluation started:', data);
});

evaluator.on('tool:tested', (result) => {
  console.log(`Tool ${result.name}: ${result.status}`);
});

// Run evaluation
const report = await evaluator.evaluate();
console.log('Final score:', report.combined.score);
```

## Configuration

### Evaluation Configuration

Create an `evaluation-config.json`:

```json
{
  "evaluation": {
    "runStatic": true,
    "runRuntime": true,
    "weights": {
      "static": 0.4,
      "runtime": 0.6
    },
    "passThreshold": 70,
    "failThreshold": 40
  },
  "runtime": {
    "timeout": 30000,
    "transport": "stdio",
    "testCategories": {
      "tools": true,
      "resources": true,
      "prompts": true,
      "errors": true,
      "performance": true,
      "security": true
    }
  }
}
```

### Server Configuration

MCP servers should include a configuration file (`mcp.json`):

```json
{
  "name": "my-mcp-server",
  "command": "node",
  "args": ["server.js"],
  "transport": "stdio",
  "tools": [
    {
      "name": "search",
      "description": "Search for information",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        }
      }
    }
  ]
}
```

## Runtime Tests

### 1. Capability Discovery
- Server information
- Available tools listing
- Resource discovery
- Prompt handlers

### 2. Tool Testing
- Basic invocation with test arguments
- Schema validation
- Error handling
- Response validation

### 3. Resource Testing
- Resource accessibility
- Data retrieval
- Error conditions

### 4. Prompt Testing
- Command understanding
- Help requests
- Invalid command handling

### 5. Error Handling
- Invalid tool names
- Malformed requests
- Resource not found
- Timeout scenarios

### 6. Performance Testing
- Response time measurement
- Throughput testing
- Resource usage (if available)

### 7. Security Testing
- Prompt injection resistance
- Path traversal prevention
- Command injection blocking

## Scoring System

### Static Analysis (40% default weight)
- Functionality Match (25%)
- No Prompt Injections (25%)
- Clear Tool Names (15%)
- Working Examples (20%)
- Error Handling (15%)

### Runtime Testing (60% default weight)
- Tool functionality
- Resource accessibility
- Error handling
- Security measures
- Performance metrics

### Combined Score
```
Final Score = (Static Score × Static Weight) + (Runtime Score × Runtime Weight)
```

### Certification Levels
- **Gold**: 90-100 points
- **Silver**: 75-89 points
- **Bronze**: 60-74 points
- **None**: < 60 points

## Output Formats

### JSON Report
Default format with complete details:
```json
{
  "static": { ... },
  "runtime": { ... },
  "combined": {
    "score": 85,
    "status": "passed",
    "certification": "silver",
    "recommendations": [ ... ]
  }
}
```

### Markdown Report
Human-readable format:
```markdown
# MCP Server Evaluation Report

## Overall Score: 85/100 (PASSED)
**Certification Level:** SILVER

### Score Breakdown
- Static Analysis: 80/100 (32% of total)
- Runtime Testing: 88/100 (53% of total)
...
```

### HTML Report
Web-viewable format with styling and interactive elements.

## Integration with CI/CD

### GitHub Actions

```yaml
name: MCP Server Evaluation

on: [push, pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install MCP Evaluator
        run: npm install -g mcp-evaluator
      
      - name: Run Evaluation
        run: |
          mcp-evaluate . \
            --format markdown \
            --output evaluation-report.md \
            --fail-under 70
      
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: evaluation-report
          path: evaluation-report.md
```

### Jenkins Pipeline

```groovy
pipeline {
  agent any
  
  stages {
    stage('Evaluate MCP Server') {
      steps {
        sh 'npm install'
        sh 'node bin/mcp-evaluate . --format json --output report.json'
        
        script {
          def report = readJSON file: 'report.json'
          if (report.combined.score < 70) {
            error("MCP evaluation failed with score: ${report.combined.score}")
          }
        }
      }
    }
  }
  
  post {
    always {
      archiveArtifacts artifacts: 'report.json'
    }
  }
}
```

## Advanced Usage

### Custom Test Scenarios

```javascript
// Add custom test scenarios
const customTests = [
  {
    name: 'custom_workflow',
    description: 'Test specific workflow',
    test: async (inspector) => {
      // Step 1: Initialize
      await inspector.sendCommand('tool.call', {
        name: 'init',
        arguments: {}
      });
      
      // Step 2: Process data
      const result = await inspector.sendCommand('tool.call', {
        name: 'process',
        arguments: { data: 'test' }
      });
      
      // Step 3: Validate
      return result.status === 'success';
    }
  }
];

evaluator.addCustomTests(customTests);
```

### Event Monitoring

```javascript
// Monitor all evaluation events
evaluator.on('static:started', () => console.log('Static analysis started'));
evaluator.on('runtime:started', () => console.log('Runtime testing started'));
evaluator.on('tool:testing', (data) => console.log(`Testing tool: ${data.name}`));
evaluator.on('evaluation:completed', (data) => {
  console.log(`Evaluation completed with score: ${data.score}`);
});
```

### Parallel Testing

```javascript
// Test multiple servers in parallel
const servers = [
  '/path/to/server1',
  '/path/to/server2',
  '/path/to/server3'
];

const results = await Promise.all(
  servers.map(async (path) => {
    const evaluator = new UnifiedEvaluator(path);
    return await evaluator.evaluate();
  })
);
```

## Troubleshooting

### Common Issues

1. **Inspector not starting**
   - Check Node.js version (requires 16+)
   - Verify MCP server configuration
   - Check transport type compatibility

2. **Tests timing out**
   - Increase timeout in configuration
   - Check server startup time
   - Verify network connectivity (for network transport)

3. **Static hooks not found**
   - Install hooks using `install-mcp-hooks.sh`
   - Check Python installation
   - Verify hooks path in configuration

4. **Low scores**
   - Review recommendations in report
   - Check server implementation against MCP spec
   - Verify examples and documentation

### Debug Mode

```bash
# Enable debug output
DEBUG=mcp:* node bin/mcp-evaluate /path/to/server

# Verbose logging
node bin/mcp-evaluate /path/to/server --verbose
```

## Best Practices

1. **Complete Configuration**: Include comprehensive `mcp.json` with tools, resources, and examples
2. **Error Handling**: Implement proper error handling in all tools
3. **Documentation**: Provide clear descriptions and examples for all capabilities
4. **Security**: Implement input validation and security measures
5. **Performance**: Optimize for sub-second response times
6. **Testing**: Include test data and examples in your server

## API Reference

### UnifiedEvaluator Class

```javascript
class UnifiedEvaluator {
  constructor(serverPath: string, options?: EvaluatorOptions)
  
  // Main evaluation method
  async evaluate(): Promise<EvaluationReport>
  
  // Event emitter methods
  on(event: string, handler: Function): void
  off(event: string, handler: Function): void
  
  // Configuration methods
  setWeights(static: number, runtime: number): void
  setThresholds(pass: number, fail: number): void
}
```

### RuntimeTester Class

```javascript
class RuntimeTester {
  constructor(serverPath: string, options?: RuntimeOptions)
  
  // Run all tests
  async runTests(serverConfig: ServerConfig): Promise<TestResults>
  
  // Individual test methods
  async testAllTools(): Promise<ToolTestResults>
  async testAllResources(): Promise<ResourceTestResults>
  async testErrorScenarios(): Promise<ErrorTestResults>
  async testPerformance(): Promise<PerformanceResults>
  async testSecurity(): Promise<SecurityResults>
}
```

### InspectorBridge Class

```javascript
class InspectorBridge {
  constructor(options?: InspectorOptions)
  
  // Server lifecycle
  async startInspector(config: ServerConfig): Promise<void>
  async stop(): Promise<void>
  
  // Command execution
  async sendCommand(command: string, params: any): Promise<any>
  
  // Test execution
  async runTestSequence(tests: Test[]): Promise<TestResults>
}
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [mcp-evaluator/issues](https://github.com/yourusername/mcp-evaluator/issues)
- Documentation: [docs.mcp-evaluator.dev](https://docs.mcp-evaluator.dev)
- Discord: [MCP Community](https://discord.gg/mcp)