# MCP Server Evaluator

A comprehensive evaluation application that combines static analysis hooks with runtime testing via MCP Inspector to validate MCP servers against Anthropic's directory requirements.

## Features

### Static Analysis (Hooks)
- **Functionality Match**: Verifies implementation matches documentation
- **Prompt Injection Detection**: Scans for security vulnerabilities
- **Tool Naming Validation**: Ensures clear, unique tool names
- **Example Verification**: Validates working examples exist
- **Error Handling Review**: Checks graceful error management

### Runtime Testing (Inspector)
- **Live Server Testing**: Interactive tool execution
- **Resource Exploration**: Validate resources work as documented
- **Prompt Testing**: Execute and verify prompt responses
- **Transport Validation**: Test STDIO, SSE, and HTTP transports
- **Performance Monitoring**: Response time and resource usage

### Unified Dashboard
- **Real-time Results**: Live updates as tests run
- **Comprehensive Scoring**: Combined static + runtime analysis
- **Visual Test Progress**: See tests executing in real-time
- **Export Reports**: Generate submission-ready reports
- **Historical Tracking**: Monitor improvements over time

## Architecture

```
┌─────────────────────────────────────────┐
│         MCP Evaluator Dashboard         │
│  (Vue.js + Real-time WebSocket Updates) │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────┐  ┌──────▼──────┐
│  Static  │  │   Runtime   │
│ Analysis │  │   Testing   │
│  (Hooks) │  │ (Inspector) │
└──────────┘  └─────────────┘
     │              │
     └──────┬───────┘
            │
    ┌───────▼────────┐
    │  MCP Server    │
    │ Under Testing  │
    └────────────────┘
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-evaluator
cd mcp-evaluator

# Install dependencies
npm install

# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Setup evaluation hooks
./bin/setup-evaluator.sh
```

## Usage

### Quick Evaluation
```bash
# Evaluate a local MCP server
mcp-evaluate /path/to/mcp-server

# Evaluate with specific transport
mcp-evaluate /path/to/server --transport stdio

# Generate submission report
mcp-evaluate /path/to/server --report
```

### Dashboard Mode
```bash
# Start the evaluation dashboard
npm run dashboard

# Navigate to http://localhost:3457
# Add MCP servers for evaluation
```

### CI/CD Integration
```yaml
- name: MCP Server Validation
  run: |
    npx mcp-evaluate . --ci --fail-on-error
    npx mcp-evaluate . --report > evaluation.md
```

## Components

### 1. Inspector Controller (`src/inspector/`)
- Programmatic control of MCP Inspector
- Transport abstraction layer
- Response capture and analysis

### 2. Hook Engine (`src/hooks/`)
- Static code analysis
- Pattern detection
- Documentation validation

### 3. Test Orchestrator (`src/orchestrator/`)
- Coordinates static and runtime tests
- Manages test sequencing
- Aggregates results

### 4. Dashboard (`src/dashboard/`)
- Real-time test visualization
- Interactive test control
- Report generation

## Configuration

Create `mcp-evaluator.config.json`:
```json
{
  "inspector": {
    "transport": "stdio",
    "timeout": 30000,
    "retries": 3
  },
  "hooks": {
    "enableAll": true,
    "customPatterns": []
  },
  "scoring": {
    "weights": {
      "static": 0.4,
      "runtime": 0.6
    },
    "thresholds": {
      "pass": 0.8,
      "warning": 0.6
    }
  }
}
```

## API

### Programmatic Usage
```javascript
import { MCPEvaluator } from 'mcp-evaluator';

const evaluator = new MCPEvaluator({
  serverPath: '/path/to/server',
  transport: 'stdio'
});

const results = await evaluator.evaluate();
console.log(results.score, results.recommendations);
```

### WebSocket Events
```javascript
// Connect to evaluation updates
const ws = new WebSocket('ws://localhost:3457/events');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  // test.started, test.completed, test.failed
  console.log(event.type, event.data);
});
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

MIT