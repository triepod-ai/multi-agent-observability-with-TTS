# MCP Evaluator Quick Reference

**Fast reference for MCP Server evaluation commands and criteria**

## Quick Commands

### Basic Evaluation
```bash
# Evaluate current directory
mcp-evaluate

# Evaluate with custom transport
mcp-evaluate /path/to/server --transport stdio

# Generate report file
mcp-evaluate /path/to/server --report evaluation.md
```

### CI/CD Integration
```bash
# Fail build if score < 80%
mcp-evaluate . --ci --fail-threshold 80

# JSON output for processing
mcp-evaluate . --json > results.json

# Static analysis only (faster)
mcp-evaluate . --static-only --ci
```

### Interactive Tools
```bash
# Start dashboard
mcp-evaluate interactive

# Test specific tool
mcp-evaluate test-tool /path/to/server tool_name

# Show requirements
mcp-evaluate requirements
```

## Evaluation Criteria Checklist

### 1. ✅ Functionality Match
**Requirement**: Implementation matches documentation exactly

**Quick Check**:
- [ ] All documented features are implemented
- [ ] No undocumented features exist
- [ ] Tool names match configuration
- [ ] Examples work as described

**Common Issues**:
- Missing features from documentation
- Extra tools not mentioned in README
- Configuration mismatch

### 2. ✅ No Prompt Injections  
**Requirement**: No social media prompts or malicious content

**Quick Check**:
- [ ] No "post to social media" prompts
- [ ] No unexpected message generation
- [ ] No prompt manipulation attempts
- [ ] Clean, business-focused functionality

**Common Issues**:
- Hidden social media posting
- Prompt injection vectors
- Unexpected message generation

### 3. ✅ Clear Tool Names
**Requirement**: Unique, descriptive tool names

**Quick Check**:
- [ ] Names describe tool function
- [ ] No generic names (tool1, execute)
- [ ] No naming conflicts
- [ ] Consistent naming convention

**Examples**:
- ✅ Good: `search_documents`, `create_report`, `analyze_data`
- ❌ Bad: `tool1`, `execute`, `process`, `handle`

### 4. ✅ Working Examples
**Requirement**: At least 3 functional examples

**Quick Check**:
- [ ] README has 3+ examples
- [ ] Examples include actual code/prompts
- [ ] Examples cover main features
- [ ] Examples work when tested

**Common Issues**:
- Too few examples (need minimum 3)
- Non-functional example code
- Missing example arguments

### 5. ✅ Error Handling
**Requirement**: Graceful error responses

**Quick Check**:
- [ ] Try-catch blocks around operations
- [ ] Helpful error messages
- [ ] No crashes on invalid input
- [ ] Proper error logging

**Examples**:
- ✅ Good: "File 'data.json' not found. Please check the path."
- ❌ Bad: "Error", "Something went wrong"

## Score Interpretation

### Score Ranges
| Score | Status | Action |
|-------|--------|---------|
| 80-100% | ✅ **Ready** | Submit to MCP Directory |
| 60-79% | ⚠️ **Minor Issues** | Fix recommendations first |
| 0-59% | ❌ **Major Issues** | Significant work needed |

### Score Breakdown
```
Total Score = (Sum of 5 requirements) / 5 * 100

Each requirement scored as:
- Static Analysis (0-0.5 points)
- Runtime Testing (0-0.5 points)  
- Combined Score (0-1.0 points)
```

## Common Commands by Use Case

### Development Workflow
```bash
# Quick check during development
mcp-evaluate . --static-only

# Full evaluation before commit
mcp-evaluate . --report pre-commit.md

# Test specific functionality
mcp-evaluate test-tool . my_tool --args '{"param": "value"}'
```

### CI/CD Pipeline
```bash
# GitHub Actions / GitLab CI
mcp-evaluate . --ci --json --fail-threshold 80

# Generate artifacts
mcp-evaluate . --report evaluation.json --json
```

### Pre-Submission Checklist
```bash
# 1. Full evaluation
mcp-evaluate . --verbose

# 2. Check all requirements
mcp-evaluate requirements

# 3. Generate submission report  
mcp-evaluate . --report submission-report.md
```

## Troubleshooting Quick Fixes

### Setup Issues
```bash
# Install missing dependencies
npm install -g @modelcontextprotocol/inspector
pip3 install requests pyyaml tabulate

# Make executable
chmod +x bin/mcp-evaluate

# Global install
sudo ln -sf $(pwd)/bin/mcp-evaluate /usr/local/bin/
```

### Configuration Issues  
```bash
# Create MCP config
echo '{"name": "my-server", "command": "node", "args": ["index.js"]}' > mcp.json

# Install hooks
cp -r /path/to/multi-agent-observability-system/.claude/mcp-hooks .claude/hooks
```

### Runtime Issues
```bash
# Debug mode
mcp-evaluate . --verbose

# Check server starts
node your-server.js

# Test manually with Inspector
npx @modelcontextprotocol/inspector
```

## Dashboard Quick Guide

### Starting Dashboard
```bash
mcp-evaluate interactive
# Open http://localhost:3457
```

### Dashboard Features
1. **Add Evaluation**: Enter path → Start
2. **Live Progress**: Watch tests execute
3. **Results View**: See scores and recommendations
4. **Export**: Download reports

### WebSocket Events
```javascript
ws = new WebSocket('ws://localhost:3457/ws');
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  // data.type: 'hook:completed', 'tool:passed', etc.
};
```

## Configuration Templates

### Basic Config (`mcp-evaluator.config.json`)
```json
{
  "inspector": {
    "transport": "stdio",
    "timeout": 30000
  },
  "scoring": {
    "thresholds": {
      "pass": 0.8
    }
  }
}
```

### CI Config
```json
{
  "inspector": {
    "timeout": 60000,
    "retries": 3
  },
  "hooks": {
    "enableAll": true
  },
  "reporting": {
    "format": "json",
    "includeEvidence": false
  }
}
```

## API Quick Reference

### REST Endpoints
```bash
# Start evaluation
curl -X POST http://localhost:3457/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"serverPath": "/path/to/server"}'

# Get status  
curl http://localhost:3457/api/evaluation/123456789

# List all
curl http://localhost:3457/api/evaluations
```

### Event Types
- `evaluation:started` → Evaluation began
- `hook:running` → Static test running
- `hook:completed` → Static test done
- `tool:testing` → Runtime test running  
- `tool:passed/failed` → Runtime result
- `evaluation:completed` → Full evaluation done

## Best Practices Summary

### Before Evaluation
1. **Clean Documentation**: README with clear features and examples
2. **Working Server**: Ensure server starts without errors
3. **Test Manually**: Verify tools work as expected

### During Development
1. **Descriptive Names**: Use clear, specific tool names
2. **Error Handling**: Add try-catch with helpful messages
3. **Regular Testing**: Run `mcp-evaluate . --static-only` frequently

### Before Submission
1. **Full Evaluation**: Run complete test suite
2. **Fix All Issues**: Address recommendations
3. **Generate Report**: Create submission documentation

### CI/CD Integration
1. **Fail Fast**: Use `--ci --fail-threshold 80`
2. **Cache Results**: Save evaluation reports as artifacts
3. **Multiple Checks**: Test on different Node.js versions

---

**Need detailed help?** See [MCP_EVALUATOR_APPLICATION.md](./MCP_EVALUATOR_APPLICATION.md) for comprehensive documentation.