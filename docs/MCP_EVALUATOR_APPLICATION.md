# MCP Server Evaluator Application

**Comprehensive evaluation platform combining static analysis with runtime testing for MCP servers**

## Overview

The MCP Server Evaluator is a complete application that combines static code analysis (using existing evaluation hooks) with runtime testing (using MCP Inspector) to validate MCP servers against Anthropic's 5 core requirements for MCP Directory submission. It provides both command-line and web dashboard interfaces for thorough evaluation.

## Architecture Overview

The application consists of several integrated components working together to provide comprehensive MCP server validation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Evaluator Dashboard                      │
│            (Real-time Vue.js Interface + WebSocket)            │
└─────────────────┬─────────────────────────────────────────────┘
                  │ WebSocket Events
         ┌────────┴────────┐
         │                 │
   ┌─────▼─────┐    ┌─────▼─────┐
   │  Static   │    │  Runtime  │
   │ Analysis  │    │  Testing  │
   │ (Hooks)   │    │(Inspector)│
   └─────┬─────┘    └─────┬─────┘
         │                │
         └────────┬───────┘
                  │
         ┌────────▼────────┐
         │   Orchestrator  │
         │   (Evaluator)   │
         └─────────────────┘
                  │
         ┌────────▼────────┐
         │  MCP Server     │
         │ Under Testing   │
         └─────────────────┘
```

### Core Components

#### 1. **Main Evaluator** (`src/evaluator.js`)
- **Purpose**: Orchestrates both static and runtime testing phases
- **Responsibilities**:
  - Coordinates execution of 5 evaluation hooks (static analysis)
  - Manages MCP Inspector for runtime testing
  - Combines results into unified scoring system
  - Generates comprehensive reports
  - Integrates with observability system
- **Key Features**:
  - Event-driven architecture with real-time progress updates
  - Configurable test execution (static-only, runtime-only, or combined)
  - Automatic server configuration detection
  - Detailed scoring and recommendation system

#### 2. **Inspector Bridge** (`src/inspector-bridge.js`)
- **Purpose**: Provides programmatic control of MCP Inspector
- **Responsibilities**:
  - Manages MCP Inspector process lifecycle
  - Facilitates communication with running MCP servers
  - Executes tool calls and resource requests
  - Tests error handling capabilities
  - Performs performance benchmarking
- **Key Features**:
  - Multi-transport support (STDIO, SSE, HTTP)
  - Automated test sequence execution
  - Response validation and error detection
  - Configurable timeouts and retry logic

#### 3. **CLI Tool** (`bin/mcp-evaluate`)
- **Purpose**: Command-line interface for automated evaluation
- **Responsibilities**:
  - Provides terminal-based evaluation execution
  - Supports CI/CD integration
  - Generates reports in multiple formats
  - Offers interactive tool testing
- **Key Features**:
  - Multiple output formats (text, JSON)
  - Configurable fail thresholds
  - Verbose logging options
  - Individual tool testing capabilities

#### 4. **Dashboard Server** (`src/dashboard/server.js`)
- **Purpose**: Real-time web interface for evaluation monitoring
- **Responsibilities**:
  - Serves web-based evaluation interface
  - Provides WebSocket updates for real-time progress
  - Manages multiple concurrent evaluations
  - Displays results and recommendations
- **Key Features**:
  - Live progress tracking
  - Interactive evaluation control
  - Visual test results display
  - Export capabilities

#### 5. **Installation System** (`install.sh`)
- **Purpose**: Automated setup and configuration
- **Responsibilities**:
  - Installs all dependencies
  - Configures global CLI access
  - Sets up evaluation hooks
  - Validates system requirements

## Installation and Setup

### Prerequisites

- **Node.js** v18 or higher
- **Python 3** (3.8 or higher)
- **MCP Inspector**: `npm install -g @modelcontextprotocol/inspector`

### Quick Installation

1. **Clone and Install**:
   ```bash
   git clone https://github.com/your-repo/multi-agent-observability-system
   cd multi-agent-observability-system/apps/mcp-evaluator
   
   # Run automated installation
   ./install.sh
   ```

2. **Follow Installation Prompts**:
   - Choose global CLI installation (recommended)
   - Install evaluation hooks to `~/.claude/mcp-hooks`
   - Verify all dependencies are installed

3. **Test Installation**:
   ```bash
   mcp-evaluate requirements  # Show evaluation criteria
   mcp-evaluate --help        # Display usage options
   ```

### Manual Installation

If automated installation fails or you prefer manual setup:

1. **Install Node Dependencies**:
   ```bash
   npm install
   chmod +x bin/mcp-evaluate
   ```

2. **Install Python Dependencies**:
   ```bash
   pip3 install requests pyyaml tabulate
   ```

3. **Install MCP Inspector**:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

4. **Setup Global CLI** (optional):
   ```bash
   sudo ln -sf $(pwd)/bin/mcp-evaluate /usr/local/bin/mcp-evaluate
   ```

## Usage Guide

### Command-Line Interface

#### Basic Evaluation
```bash
# Evaluate current directory
mcp-evaluate

# Evaluate specific server
mcp-evaluate /path/to/mcp-server

# Specify transport type
mcp-evaluate /path/to/server --transport stdio
```

#### Advanced Options
```bash
# Static analysis only
mcp-evaluate /path/to/server --static-only

# Runtime testing only
mcp-evaluate /path/to/server --runtime-only

# Generate JSON report
mcp-evaluate /path/to/server --json --report evaluation.json

# CI/CD mode with custom threshold
mcp-evaluate . --ci --fail-threshold 85
```

#### Interactive Testing
```bash
# Test specific tool
mcp-evaluate test-tool /path/to/server tool_name --args '{"param": "value"}'

# Start dashboard
mcp-evaluate interactive --port 3457
```

### Dashboard Interface

1. **Start Dashboard**:
   ```bash
   mcp-evaluate interactive
   # Open http://localhost:3457 in browser
   ```

2. **Dashboard Features**:
   - **Add Evaluations**: Enter server path and start evaluation
   - **Real-time Progress**: Watch tests execute with live updates
   - **Results Display**: View comprehensive scoring and recommendations
   - **Multiple Sessions**: Run multiple evaluations simultaneously
   - **Export Reports**: Generate submission-ready documentation

### Programmatic Usage

#### JavaScript/Node.js Integration
```javascript
import { MCPEvaluator } from 'mcp-evaluator';

const evaluator = new MCPEvaluator({
  serverPath: '/path/to/mcp-server',
  transport: 'stdio',
  runStatic: true,
  runRuntime: true
});

// Setup event listeners
evaluator.on('hook:completed', (data) => {
  console.log(`Hook ${data.hook}: ${data.status}`);
});

evaluator.on('tool:testing', (data) => {
  console.log(`Testing tool: ${data.tool}`);
});

// Run evaluation
const results = await evaluator.evaluate();
console.log(`Score: ${results.score}%`);
console.log('Recommendations:', results.recommendations);
```

#### WebSocket Events
```javascript
const ws = new WebSocket('ws://localhost:3457/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'hook:running':
      console.log(`Running hook: ${data.hook}`);
      break;
    case 'tool:passed':
      console.log(`✓ Tool ${data.tool} passed`);
      break;
    case 'evaluation:completed':
      console.log(`Evaluation complete: ${data.results.score}%`);
      break;
  }
};
```

## API Documentation

### REST Endpoints

#### Start Evaluation
```http
POST /api/evaluate
Content-Type: application/json

{
  "serverPath": "/path/to/server",
  "options": {
    "transport": "stdio",
    "runStatic": true,
    "runRuntime": true
  }
}

Response:
{
  "evaluationId": "1704284400000",
  "status": "started"
}
```

#### Get Evaluation Status
```http
GET /api/evaluation/{id}

Response:
{
  "id": "1704284400000",
  "serverPath": "/path/to/server",
  "status": "running",
  "progress": {
    "static": { "total": 5, "completed": 3 },
    "runtime": { "total": 10, "completed": 7 }
  },
  "results": { ... }
}
```

#### List All Evaluations
```http
GET /api/evaluations

Response: [
  {
    "id": "1704284400000",
    "serverPath": "/path/to/server",
    "status": "completed",
    "score": 85.5
  }
]
```

### WebSocket Events

#### Connection
```javascript
const ws = new WebSocket('ws://localhost:3457/ws');
```

#### Event Types
- `evaluation:started` - New evaluation begun
- `static:started` - Static analysis phase started
- `hook:running` - Specific hook executing
- `hook:completed` - Hook finished with status
- `runtime:started` - Runtime testing phase started  
- `tool:testing` - Tool being tested
- `tool:passed/failed` - Tool test result
- `evaluation:completed` - Full evaluation finished
- `inspector:output` - MCP Inspector output

## Integration with Observability System

The MCP Evaluator seamlessly integrates with the Multi-Agent Observability System for enhanced monitoring and tracking.

### Features

1. **Real-time Event Tracking**: All evaluation events sent to observability dashboard
2. **Historical Analysis**: Track evaluation trends over time
3. **Alert System**: Get notified of critical evaluation failures
4. **Metrics Dashboard**: View aggregate statistics across evaluations
5. **Session Relationships**: Link evaluations to development sessions

### Configuration

1. **Enable Observability**:
   ```bash
   # Automatic if observability server is running on localhost:3456
   mcp-evaluate /path/to/server
   
   # Disable observability
   mcp-evaluate /path/to/server --no-observability
   ```

2. **Custom Observability URL**:
   ```javascript
   const evaluator = new MCPEvaluator({
     serverPath: '/path/to/server',
     observabilityUrl: 'http://custom-host:3456'
   });
   ```

### Data Sent to Observability System

```json
{
  "serverPath": "/path/to/mcp-server",
  "results": {
    "static": {
      "Functionality Match": { "status": "pass", "evidence": [...] },
      "No Prompt Injections": { "status": "pass", "evidence": [...] }
    },
    "runtime": {
      "tools": [...],
      "resources": [...],
      "performance": [...]
    },
    "score": 85.5,
    "recommendations": [...]
  },
  "timestamp": "2025-01-04T10:30:00Z"
}
```

## Testing Methodology and Scoring

### Evaluation Framework

The evaluator uses a dual-phase approach combining static code analysis with runtime behavioral testing.

#### Phase 1: Static Analysis
Uses evaluation hooks to analyze code structure and documentation:
- **Functionality Match**: Verifies implementation matches documentation
- **Prompt Injection**: Scans for malicious prompt manipulation
- **Tool Naming**: Validates clear, unique tool names
- **Working Examples**: Counts and validates documented examples
- **Error Handling**: Checks error handling patterns

#### Phase 2: Runtime Testing  
Uses MCP Inspector to test actual server behavior:
- **Tool Execution**: Tests each tool with various inputs
- **Resource Access**: Validates resource retrieval
- **Error Scenarios**: Tests graceful error handling
- **Performance**: Measures response times and resource usage

### Scoring System

#### Individual Requirement Scoring
Each of the 5 requirements receives a score from 0-1:
- **Static Component** (0.5 points): Based on code analysis
- **Runtime Component** (0.5 points): Based on behavior testing
- **Combined Score**: Average of static + runtime scores

#### Overall Score Calculation
```
Overall Score = (Sum of all requirement scores / 5) * 100
```

#### Score Interpretation
- **80-100%**: ✅ Ready for MCP Directory submission
- **60-79%**: ⚠️ Needs minor improvements before submission
- **0-59%**: ❌ Requires significant work before submission

### Example Scoring
```
Requirement              Static  Runtime  Combined
Functionality Match        1.0     0.8      0.9
No Prompt Injections       1.0     1.0      1.0
Clear Tool Names           0.8     1.0      0.9
Working Examples           0.6     0.4      0.5
Error Handling             1.0     0.9      0.95

Total Score: (0.9 + 1.0 + 0.9 + 0.5 + 0.95) / 5 * 100 = 85%
```

## Troubleshooting Guide

### Common Issues

#### 1. **MCP Inspector Not Found**
```bash
Error: npx @modelcontextprotocol/inspector not found
```
**Solution**:
```bash
npm install -g @modelcontextprotocol/inspector
# Or update PATH to include node_modules/.bin
```

#### 2. **Server Configuration Not Found**
```bash
Error: No MCP configuration found
```
**Solution**:
Create one of these config files:
- `mcp.json`
- `claude_mcp.json`  
- `.mcp/config.json`
- Ensure `package.json` has proper `bin` and `main` fields

#### 3. **Python Dependencies Missing**
```bash
Error: ModuleNotFoundError: No module named 'requests'
```
**Solution**:
```bash
pip3 install requests pyyaml tabulate
# Or use virtual environment
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

#### 4. **Hooks Not Executing**
```bash
Hook functionality-match.py not found
```
**Solution**:
```bash
# Install hooks from the main repository
cp -r /path/to/multi-agent-observability-system/.claude/mcp-hooks .claude/hooks
chmod +x .claude/hooks/*.py
```

#### 5. **Inspector Connection Timeout**
```bash
Error: Inspector connection timeout
```
**Solution**:
- Check if MCP server starts correctly: `node your-server.js`
- Verify transport configuration matches server setup
- Increase timeout: `--timeout 60000`

### Debug Mode

#### Enable Verbose Logging
```bash
# CLI verbose mode
mcp-evaluate /path/to/server --verbose

# Programmatic debug
const evaluator = new MCPEvaluator({
  serverPath: '/path/to/server',
  debug: true
});
```

#### Debug WebSocket Connection
```javascript
// Client-side debugging
ws.onopen = () => console.log('Connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
ws.onclose = (event) => console.log('Disconnected:', event.code);
```

#### Check Log Files
```bash
# Hook execution logs
tail -f /tmp/mcp-evaluation-*.log

# Inspector output
tail -f ~/.mcp-inspector/logs/inspector.log
```

### Performance Optimization

#### 1. **Reduce Evaluation Time**
```bash
# Skip runtime tests for faster evaluation
mcp-evaluate /path/to/server --static-only

# Test specific components only
mcp-evaluate test-tool /path/to/server specific_tool
```

#### 2. **Optimize Hook Execution**
```python
# In hook files, add early returns
if not os.path.exists('relevant_file.py'):
    return {"score": "unknown", "evidence": ["File not found"]}
```

#### 3. **Dashboard Performance**
```javascript
// Limit concurrent evaluations
const MAX_CONCURRENT = 3;
if (evaluations.size >= MAX_CONCURRENT) {
  return res.status(429).json({ error: 'Too many concurrent evaluations' });
}
```

## Best Practices for MCP Server Developers

### Pre-Evaluation Checklist

1. **Documentation Quality**:
   - [ ] Clear README with feature descriptions
   - [ ] At least 3 working examples in documentation
   - [ ] Installation and usage instructions
   - [ ] Tool and resource documentation

2. **Code Quality**:
   - [ ] Descriptive, unique tool names
   - [ ] Comprehensive error handling with helpful messages
   - [ ] No social media prompts or injection vectors
   - [ ] Clean, well-structured code

3. **Testing Preparation**:
   - [ ] Server starts without errors
   - [ ] All documented features are implemented
   - [ ] Tools work with provided example arguments
   - [ ] Error scenarios handled gracefully

### Optimization Strategies

1. **Improve Static Analysis Scores**:
   ```python
   # Good: Descriptive tool names
   tools = ["search_documents", "create_report", "analyze_data"]
   
   # Bad: Generic names
   tools = ["tool1", "execute", "process"]
   ```

2. **Enhance Runtime Performance**:
   ```javascript
   // Add input validation
   if (!args.required_param) {
     throw new Error("required_param is missing");
   }
   
   // Implement timeouts
   const timeout = setTimeout(() => {
     throw new Error("Operation timeout");
   }, 30000);
   ```

3. **Better Error Messages**:
   ```javascript
   // Good: Specific error with solution
   throw new Error("File 'data.json' not found. Please ensure the file exists in the current directory.");
   
   // Bad: Generic error
   throw new Error("Error occurred");
   ```

### CI/CD Integration

#### GitHub Actions
```yaml
name: MCP Server Evaluation

on: [push, pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install MCP Evaluator
        run: |
          git clone https://github.com/your-org/multi-agent-observability-system
          cd multi-agent-observability-system/apps/mcp-evaluator
          npm install
          sudo ln -sf $(pwd)/bin/mcp-evaluate /usr/local/bin/
          
      - name: Run Evaluation
        run: |
          mcp-evaluate . --ci --fail-threshold 80 --report evaluation.json
          
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: evaluation-report
          path: evaluation.json
```

#### GitLab CI
```yaml
mcp_evaluation:
  stage: test
  image: node:18
  script:
    - npm install -g @modelcontextprotocol/inspector
    - git clone https://github.com/your-org/multi-agent-observability-system
    - cd multi-agent-observability-system/apps/mcp-evaluator && npm install
    - cd $CI_PROJECT_DIR
    - ../multi-agent-observability-system/apps/mcp-evaluator/bin/mcp-evaluate . --ci --json
  artifacts:
    reports:
      junit: evaluation-results.xml
    paths:
      - evaluation-results.json
```

### Monitoring and Maintenance

1. **Regular Evaluation**:
   ```bash
   # Weekly evaluation check
   crontab -e
   0 9 * * 1 cd /path/to/mcp-server && mcp-evaluate . --report weekly-report.json
   ```

2. **Performance Tracking**:
   ```javascript
   // Track evaluation metrics
   const startTime = Date.now();
   const results = await evaluator.evaluate();
   const duration = Date.now() - startTime;
   
   console.log(`Evaluation completed in ${duration}ms with score ${results.score}%`);
   ```

3. **Quality Gates**:
   ```bash
   # Pre-commit hook
   #!/bin/bash
   score=$(mcp-evaluate . --json | jq '.score')
   if (( $(echo "$score < 80" | bc -l) )); then
     echo "Evaluation score too low: $score%"
     exit 1
   fi
   ```

## Configuration Options

### Evaluator Configuration

Create `mcp-evaluator.config.json` in your project:

```json
{
  "inspector": {
    "transport": "stdio",
    "timeout": 30000,
    "retries": 3,
    "port": 5173
  },
  "hooks": {
    "enableAll": true,
    "customPatterns": [],
    "hooksPath": ".claude/hooks"
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
  },
  "observability": {
    "enabled": true,
    "url": "http://localhost:3456",
    "apiKey": null
  },
  "reporting": {
    "format": "text",
    "includeEvidence": true,
    "includeRecommendations": true
  }
}
```

### Environment Variables

```bash
# Inspector configuration
export MCP_INSPECTOR_TIMEOUT=30000
export MCP_INSPECTOR_PORT=5173

# Observability integration
export MCP_OBSERVABILITY_URL=http://localhost:3456
export MCP_OBSERVABILITY_ENABLED=true

# Debug settings
export MCP_DEBUG=true
export MCP_LOG_LEVEL=verbose
```

### Hook Configuration

Customize hook behavior with `.mcp-evaluation.json`:

```json
{
  "thresholds": {
    "min_examples": 3,
    "max_generic_names": 0,
    "require_error_logging": true,
    "min_error_handlers": 5
  },
  "skip_tests": ["prompt-injection"],
  "custom_patterns": {
    "injection_patterns": [
      "post to twitter",
      "share on social media",
      "publish to facebook"
    ],
    "error_patterns": [
      "try.*except",
      "catch.*error",
      "error.*handler"
    ]
  },
  "file_extensions": [".py", ".js", ".ts"],
  "exclude_paths": ["node_modules", "venv", "dist"]
}
```

## Version History and Roadmap

### Current Version: 1.0.0

**Features**:
- Complete static analysis integration
- MCP Inspector runtime testing
- CLI and dashboard interfaces  
- Observability system integration
- Comprehensive reporting

### Planned Features (v1.1.0)

1. **Enhanced Testing**:
   - Multi-server comparison
   - Load testing capabilities
   - Security vulnerability scanning
   - Performance benchmarking suite

2. **Improved UX**:
   - Visual test result graphs
   - Interactive recommendation system
   - Custom evaluation templates
   - Batch evaluation support

3. **Advanced Integration**:
   - GitHub/GitLab integration
   - Slack/Discord notifications
   - Custom webhook support
   - API key management

### Long-term Roadmap (v2.0+)

- AI-powered recommendation system
- Automated fix suggestions
- Community evaluation marketplace
- Advanced analytics dashboard
- Plugin architecture for custom tests

## Support and Contributing

### Getting Help

1. **Documentation**: Start with this guide and the MCP Evaluation Hooks documentation
2. **GitHub Issues**: Report bugs and request features
3. **Community**: Join MCP developer discussions
4. **Examples**: Check the `examples/` directory for sample evaluations

### Contributing

1. **Fork Repository**: Create your own fork of the project
2. **Create Branch**: `git checkout -b feature/your-feature`
3. **Add Tests**: Include tests for new functionality
4. **Update Docs**: Document any new features or changes
5. **Submit PR**: Create pull request with clear description

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/multi-agent-observability-system
cd multi-agent-observability-system/apps/mcp-evaluator

# Install dependencies
npm install
pip3 install -r requirements.txt

# Run tests
npm test
python3 -m pytest tests/

# Start development server
npm run dev
```

## License

MIT License - See LICENSE file in the repository root for full details.

---

This comprehensive evaluation platform ensures your MCP server meets Anthropic's directory standards through automated testing and detailed feedback. Use it to validate your implementation before submission and continuously monitor quality as your server evolves.