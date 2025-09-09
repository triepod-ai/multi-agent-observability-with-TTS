# MCP Evaluator - Usage Instructions

## Quick Start

### 1. Setup
```bash
# Run the setup script to install dependencies and configure the environment
./bin/setup-evaluator.sh
```

### 2. Start the Dashboard
```bash
# Start the web dashboard
npm run dashboard
# Or use the convenience script
./start-evaluator.sh
```

The dashboard will be available at: http://localhost:3457

### 3. Evaluate an MCP Server

#### Option A: Using the Web Dashboard
1. Open http://localhost:3457 in your browser
2. Enter the full path to your MCP server directory (e.g., `/home/bryan/mcp-servers/my-server`)
3. Click "Start Evaluation"
4. View real-time results and recommendations

#### Option B: Using the CLI
```bash
# Evaluate a specific server
./evaluate-server.sh /path/to/mcp-server

# Or use npm directly
npm run start -- evaluate /path/to/mcp-server
```

#### Option C: Using the API
```bash
curl -X POST http://localhost:3457/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "serverPath": "/path/to/mcp-server",
    "options": {
      "runStatic": true,
      "runRuntime": true
    }
  }'
```

## Understanding the Results

### Score Breakdown
The evaluator tests 5 core requirements from Anthropic's MCP directory standards:

1. **Functionality Match** (20% weight)
   - Does the server implement what it claims?
   - Are all advertised features working?

2. **No Prompt Injections** (20% weight)
   - Security check for prompt injection vulnerabilities
   - Validates safe handling of user input

3. **Clear Tool Names** (20% weight)
   - Are tool names descriptive and clear?
   - Do they follow naming conventions?

4. **Working Examples** (20% weight)
   - Does the server provide working examples?
   - Are examples documented and functional?

5. **Error Handling** (20% weight)
   - Does the server handle errors gracefully?
   - Are error messages helpful?

### Score Interpretation
- **80-100%**: ✅ Ready for MCP directory submission
- **60-79%**: ⚠️ Minor improvements needed
- **40-59%**: ⚠️ Significant improvements required
- **0-39%**: ❌ Major work needed before submission

## Testing with the Sample Server

A simple test server is included for validation:

```bash
# Test the evaluator with the sample server
./evaluate-server.sh test-servers/

# The test server includes:
# - Echo tool (basic functionality)
# - Calculate tool (arithmetic operations)
# - Get time tool (temporal operations)
# - Test resources (README and config)
```

## Troubleshooting

### Common Issues

#### 1. Evaluations showing 0% scores
**Cause**: Runtime tests may be failing if the Inspector can't start the server properly.

**Solutions**:
- Ensure your MCP server has a proper `package.json` with a `start` script
- For Python servers, ensure the virtual environment is activated
- Check that all dependencies are installed
- The evaluator now includes fallback testing if Inspector fails

#### 2. "Inspector not running" errors
**Cause**: The MCP Inspector may not be installed or accessible.

**Solution**:
```bash
# Install Inspector globally (optional)
npm install -g @modelcontextprotocol/inspector

# Or ensure it's in the local dependencies
npm install
```

#### 3. Python server not starting
**Cause**: Python environment or dependencies missing.

**Solution**:
```bash
# Ensure Python is available
python3 --version

# Install server dependencies
cd /path/to/your/mcp-server
pip install -r requirements.txt
```

#### 4. Dashboard not accessible
**Cause**: Port 3457 may be in use or firewall blocking.

**Solution**:
```bash
# Check if port is in use
lsof -i:3457

# Use a different port
PORT=3458 npm run dashboard
```

## Configuration

### Default Configuration
The evaluator uses these default settings (in `mcp-evaluator.config.json`):

```json
{
  "evaluator": {
    "runStatic": true,        // Run static analysis hooks
    "runRuntime": true,       // Run runtime tests with Inspector
    "weights": {
      "static": 0.4,          // 40% weight for static analysis
      "runtime": 0.6          // 60% weight for runtime tests
    },
    "passThreshold": 70,      // Score needed to pass
    "failThreshold": 40       // Score below this is failure
  },
  "inspector": {
    "serverPort": 3000,       // Inspector server port
    "clientPort": 5173,       // Inspector UI port
    "startupDelay": 3000      // Wait time for server startup
  }
}
```

### Custom Configuration
You can override settings when running evaluations:

```javascript
// Via API
{
  "serverPath": "/path/to/server",
  "options": {
    "runStatic": true,
    "runRuntime": false,  // Skip runtime tests
    "passThreshold": 80   // Higher pass threshold
  }
}
```

## Advanced Usage

### Writing Custom Hooks
Create Python scripts in `.claude/hooks/` directory:

```python
#!/usr/bin/env python3
import json
import sys

def evaluate():
    # Your evaluation logic here
    result = {
        "score": "pass",  # or "partial", "fail"
        "evidence": ["Evidence of success"],
        "issues": ["Any issues found"]
    }
    return result

if __name__ == "__main__":
    try:
        result = evaluate()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "score": "fail",
            "error": str(e)
        }))
        sys.exit(1)
```

### Batch Evaluation
Evaluate multiple servers:

```bash
#!/bin/bash
for server in /home/bryan/mcp-servers/*; do
  if [ -d "$server" ]; then
    echo "Evaluating: $server"
    ./evaluate-server.sh "$server"
  fi
done
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Evaluate MCP Server
  run: |
    npm install
    npm run dashboard &
    sleep 5
    npm run start -- evaluate . --ci
```

## Support

For issues or questions:
1. Check the logs in the `logs/` directory
2. Review the dashboard console for error messages
3. Ensure all dependencies are properly installed
4. Verify your MCP server follows the standard structure

## Next Steps

1. **Improve Your Server**: Use the evaluation results to identify areas for improvement
2. **Add Examples**: Include working examples in your server's `examples/` directory
3. **Document Tools**: Ensure all tools have clear, descriptive names and documentation
4. **Test Error Handling**: Verify your server handles edge cases gracefully
5. **Security Review**: Check for prompt injection vulnerabilities

Once your server scores 80% or higher, it's ready for submission to the MCP directory!