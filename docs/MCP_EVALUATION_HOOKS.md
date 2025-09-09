# MCP Directory Evaluation Hooks

## Overview

The MCP Evaluation Hooks system provides automated testing and validation of MCP (Model Context Protocol) servers against Anthropic's 5 core requirements for MCP Directory submission. These hooks ensure that MCP servers meet quality standards before being submitted to the official directory.

## Requirements Tested

Based on Anthropic's MCP Directory Review standards, the system evaluates:

### 1. **Functionality Match**
- **Requirement**: Implementation does exactly what it claims, no extra/missing features
- **Hook**: `functionality-match.py`
- **Tests**: 
  - Verifies documented features exist in code
  - Checks for undocumented functionality
  - Validates tool implementations match configuration

### 2. **No Prompt Injections**
- **Requirement**: No unexpected messages or prompts to publish to social media beyond core business value
- **Hook**: `prompt-injection.py`
- **Tests**:
  - Scans for social media hijacking patterns
  - Detects prompt injection attempts
  - Identifies system prompt manipulation

### 3. **Clear Tool Names**
- **Requirement**: Unique, non-conflicting names that clearly indicate function
- **Hook**: `tool-naming.py`
- **Tests**:
  - Checks for duplicate tool names
  - Validates naming conventions
  - Ensures names are descriptive and clear

### 4. **Working Examples**
- **Requirement**: At least 3 functional example prompts demonstrating core features provided by developer in documentation
- **Hook**: `working-examples.py`
- **Tests**:
  - Counts documented examples
  - Validates example code blocks
  - Checks for test files with examples

### 5. **Error Handling**
- **Requirement**: Graceful error responses with helpful feedback
- **Hook**: `error-handling.py`
- **Tests**:
  - Verifies try-catch implementations
  - Checks for proper error messages
  - Validates error logging

## Installation

### Global Installation (One-Time Setup)

Install the command globally to use from anywhere:

```bash
# Install globally with symlink (requires sudo)
sudo /home/bryan/multi-agent-observability-system/bin/install-mcp-hooks.sh --global

# After global installation, use from anywhere:
install-mcp-hooks                    # Install to current directory
install-mcp-hooks /path/to/project   # Install to specific project
install-mcp-hooks -l                 # List available hooks
install-mcp-hooks -h                 # Show help

# To uninstall global symlink
sudo /home/bryan/multi-agent-observability-system/bin/install-mcp-hooks.sh --uninstall-global
```

### Quick Install (Without Global Setup)

```bash
# Install to current project
/home/bryan/multi-agent-observability-system/bin/install-mcp-hooks.sh

# Install to specific project
/home/bryan/multi-agent-observability-system/bin/install-mcp-hooks.sh /path/to/mcp-project

# Install specific hooks only
/home/bryan/multi-agent-observability-system/bin/install-mcp-hooks.sh -s functionality,security /path/to/project
```

### Manual Installation

1. Copy hooks to your project:
```bash
cp -r /home/bryan/multi-agent-observability-system/.claude/mcp-hooks /your/project/.claude/hooks
```

2. Update your `.claude/settings.json`:
```json
{
  "mcpHooks": {
    "toolUse": [
      ".claude/hooks/functionality-match.py",
      ".claude/hooks/tool-naming.py"
    ],
    "onStart": [
      ".claude/hooks/prompt-injection.py",
      ".claude/hooks/error-handling.py"
    ],
    "onTest": [
      ".claude/hooks/working-examples.py"
    ],
    "onReport": [
      ".claude/hooks/mcp-evaluation-report.py"
    ]
  }
}
```

## Usage

### Run Full Evaluation

```bash
# Navigate to your MCP server project
cd /path/to/mcp-server

# Run complete evaluation
python3 .claude/hooks/mcp-evaluation-report.py
```

### Run Individual Tests

```bash
# Test functionality match
python3 .claude/hooks/functionality-match.py

# Check for prompt injections
python3 .claude/hooks/prompt-injection.py

# Validate tool naming
python3 .claude/hooks/tool-naming.py

# Verify examples
python3 .claude/hooks/working-examples.py

# Test error handling
python3 .claude/hooks/error-handling.py
```

### Automated Test Runner

```bash
# Run all tests programmatically
python3 .claude/hooks/utils/mcp_test_runner.py
```

## Evaluation Report

The system generates a comprehensive evaluation report with:

- **Score Summary**: Pass/Fail/Need More Info for each requirement
- **Evidence**: 2-3 sentences of justification for each score
- **Recommendations**: Specific actions to address failures
- **Overall Assessment**: Ready for submission or needs work

### Example Report Output

```
====================================================================
MCP DIRECTORY EVALUATION REPORT
====================================================================
Timestamp: 2025-01-03T10:30:00
Project: /path/to/mcp-server
--------------------------------------------------------------------

+----------------------+-------------+--------------------------------+
| Requirement          | Score       | Evidence                       |
+----------------------+-------------+--------------------------------+
| Functionality Match  | ✅ Pass     | Documentation matches...       |
| No Prompt Injections | ✅ Pass     | No injection patterns found... |
| Clear Tool Names     | ✅ Pass     | All 5 tools have unique...    |
| Working Examples     | ⚠️ Need Info| Found 2 examples (need 3)...  |
| Error Handling       | ✅ Pass     | Comprehensive error...         |
+----------------------+-------------+--------------------------------+

SUMMARY:
  Passed: 4/5
  Failed: 0/5
  Need More Info: 1/5

⚠️ RECOMMENDATION: Gather more information and re-evaluate
====================================================================
```

## Integration with Observability System

When installed alongside the Multi-Agent Observability System, the MCP hooks:

1. **Send Results to Dashboard**: Evaluation results appear in real-time
2. **Track Testing History**: Monitor improvements over time
3. **Generate Alerts**: Get notified of critical failures
4. **Provide Metrics**: Track pass rates and common issues

### API Integration

Results are automatically posted to:
```
POST http://localhost:3456/api/mcp-evaluation
{
  "requirement": "Functionality Match",
  "score": "Pass",
  "evidence": ["..."],
  "timestamp": "2025-01-03T10:30:00Z"
}
```

## Troubleshooting

### Common Issues

1. **No MCP configuration found**
   - Ensure your project has `mcp.json`, `claude_mcp.json`, or `.mcp/config.json`
   
2. **Tests not running**
   - Check Python dependencies: `pip install requests pyyaml tabulate`
   - Ensure hooks have execute permissions: `chmod +x .claude/hooks/*.py`

3. **UV not found**
   - Install UV: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Or use standard Python: Remove `uv run` from shebang lines

### Debug Mode

Run with verbose output:
```bash
python3 -v .claude/hooks/functionality-match.py
```

Check hook logs:
```bash
tail -f /tmp/mcp-evaluation-*.log
```

## Best Practices

### For MCP Server Developers

1. **Document Everything**: Clear README with features and examples
2. **Use Descriptive Names**: Tool names should indicate their function
3. **Include Examples**: Provide at least 3 working examples
4. **Handle Errors Gracefully**: Always return helpful error messages
5. **Test Before Submission**: Run full evaluation before directory submission

### For Evaluators

1. **Run Full Suite**: Always run complete evaluation, not just individual tests
2. **Review Evidence**: Don't just rely on scores, read the evidence
3. **Test Manually**: Verify critical functionality manually
4. **Document Issues**: Provide clear feedback for "Need More Info" scores
5. **Re-test After Fixes**: Run evaluation again after addressing issues

## Advanced Configuration

### Custom Scoring Thresholds

Create `.mcp-evaluation.json` in your project:
```json
{
  "thresholds": {
    "min_examples": 5,
    "max_generic_names": 0,
    "require_error_logging": true
  },
  "skip_tests": [],
  "custom_patterns": {
    "injection_patterns": ["custom_pattern_1", "custom_pattern_2"]
  }
}
```

### CI/CD Integration

Add to your GitHub Actions workflow:
```yaml
- name: Run MCP Evaluation
  run: |
    /path/to/install-mcp-hooks.sh
    python3 .claude/hooks/mcp-evaluation-report.py
```

### Batch Testing

Test multiple MCP servers:
```bash
for dir in /path/to/mcp-servers/*; do
  echo "Testing $dir"
  /path/to/install-mcp-hooks.sh "$dir"
  cd "$dir" && python3 .claude/hooks/mcp-evaluation-report.py
done
```

## Contributing

To add new evaluation criteria or improve existing tests:

1. Fork the repository
2. Add new hook in `.claude/mcp-hooks/`
3. Update `install-mcp-hooks.sh` to include new hook
4. Submit pull request with test cases

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: [multi-agent-observability-system/issues](https://github.com/your-repo/issues)
- Documentation: This file and inline hook documentation
- MCP Directory: [Official MCP Directory](https://github.com/modelcontextprotocol/directory)

## Version History

- **1.0.0** (2025-01-03): Initial release with 5 core requirements
- Future versions will add more sophisticated testing capabilities