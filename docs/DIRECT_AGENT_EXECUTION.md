# Direct Agent Execution System

## Overview

The Direct Agent Execution System provides a KISS-compliant solution for executing Claude Code agents without Task tool dependencies. It enables hooks and standalone scripts to invoke agents directly through the file system and Codex CLI, maintaining the same JSON input/output interface as the Task tool.

## Architecture Philosophy

### KISS Principle Implementation
- **Single Responsibility**: Each component has one clear purpose
- **No Network Layer**: File system and subprocess communication only
- **Minimal Dependencies**: Python stdlib + existing Codex CLI installation
- **Drop-in Replacement**: Identical interface to Task tool for seamless migration

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Calling       │───▶│  Agent Runner   │───▶│  Codex CLI      │
│   Script        │    │     Engine      │    │   Execution     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ JSON Response   │◄───│ Agent Discovery │◄───│ Structured      │
│ Processing      │    │ & YAML Parsing  │    │ Analysis        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Agent Runner Engine

### File: `claude_agent_runner.py`

**Location**: `.claude/hooks/utils/claude_agent_runner.py`

### Core Functions

#### 1. Agent Discovery
```python
def find_agent_file(agent_name: str) -> Optional[Path]:
    # Searches for agent definitions in .claude/agents/ directories
    # Walks up directory tree from current working directory
    # Also checks relative to script location for flexibility
```

**Search Paths**:
- Current working directory: `./claude/agents/{agent_name}.md`
- Parent directories: `../.claude/agents/{agent_name}.md` (recursive)
- Script location: `{script_dir}/.claude/agents/{agent_name}.md`

#### 2. Agent Definition Parsing
```python
def parse_agent_definition(agent_file: Path) -> Dict[str, Any]:
    # Extracts YAML frontmatter and agent content
    # Handles both standard and minimal agent definition formats
```

**Supported Agent Format**:
```markdown
---
name: agent-name
description: Agent description
tools: [Bash, Read, Write]
color: cyan
---
# Agent Instructions

Agent behavior and task description here...
```

#### 3. Prompt Construction
```python
def build_codex_prompt(agent_definition: Dict[str, Any], user_input: Dict[str, Any]) -> str:
    # Builds comprehensive prompt for Codex execution
    # Includes agent context, user input, and expected output format
```

**Prompt Structure**:
- Agent metadata (name, description, tools)
- Complete agent instructions
- User input JSON
- Expected response format specification
- Task execution guidance

#### 4. Codex Integration
```python
def execute_with_codex(prompt: str, timeout: int = 45) -> Dict[str, Any]:
    # Executes prompt using Codex CLI with error handling
    # Parses JSON from markdown output with multiple extraction methods
```

**Execution Flow**:
1. Check Codex CLI availability
2. Execute: `codex exec --full-auto {prompt}`
3. Parse output for JSON blocks or patterns
4. Return structured response or error

### JSON Extraction Methods

The system uses multiple methods to extract JSON from Codex output:

#### 1. Direct JSON Parsing
Attempts to parse entire output as JSON (for clean responses).

#### 2. Markdown Code Block Extraction
```python
# Looks for ```json blocks in output
json_blocks = []
in_json_block = False
for line in output.split('\n'):
    if line.strip() == '```json':
        in_json_block = True
    elif line.strip() == '```' and in_json_block:
        # Process accumulated JSON
```

#### 3. Pattern-Based Extraction
Searches for JSON-like patterns using `{` and `}` delimiters as fallback.

#### 4. Structured Error Response
When all parsing fails, returns consistent error format:
```json
{
  "error": "Failed to parse JSON response from codex",
  "raw_output": "...",
  "achievements": ["Agent execution completed"],
  "next_steps": ["Review raw output for insights"],
  "blockers": ["JSON parsing failed"],
  "insights": ["Codex returned non-JSON response"],
  "session_metrics": {"status": "parsing_failed"}
}
```

## Usage Patterns

### 1. Direct Command Line
```bash
echo '{"key": "value"}' | python3 claude_agent_runner.py agent-name
```

### 2. From Python Scripts
```python
import subprocess
import json

def invoke_agent(agent_name: str, input_data: dict) -> dict:
    result = subprocess.run(
        ["python3", "claude_agent_runner.py", agent_name],
        input=json.dumps(input_data),
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)
```

### 3. From Hooks (PreCompact Example)
```python
# Direct agent execution in pre_compact.py
script_dir = os.path.dirname(os.path.abspath(__file__))
agent_runner_path = os.path.join(script_dir, "utils", "claude_agent_runner.py")

result = subprocess.run(
    ["python3", agent_runner_path, "codex-session-analyzer"],
    input=json.dumps(agent_input),
    capture_output=True,
    text=True,
    timeout=60
)

agent_response = json.loads(result.stdout)
```

## Error Handling

### Error Categories

#### 1. Agent Discovery Errors
- Agent file not found
- Invalid agent definition format
- YAML parsing failures

#### 2. Codex Execution Errors
- Codex CLI not available
- Execution timeout
- Non-zero exit codes

#### 3. Response Processing Errors
- JSON parsing failures  
- Invalid response structure
- Missing expected fields

### Error Response Format
All errors return consistent JSON structure:
```json
{
  "error": "Descriptive error message",
  "details": "Additional context when available",
  "achievements": ["Fallback achievements"],
  "next_steps": ["Recommended actions"],
  "blockers": ["Issues preventing success"],
  "insights": ["What was learned"],
  "session_metrics": {"status": "error_type"}
}
```

## Integration Examples

### PreCompact Hook Integration
The PreCompact hook demonstrates full integration:

1. **Input Preparation**: Converts conversation data to agent input format
2. **Agent Execution**: Calls agent runner with subprocess
3. **Response Processing**: Handles JSON response and errors
4. **Fallback Handling**: Falls back to legacy systems on failure
5. **Output Generation**: Creates summary files and TTS notifications

### Benefits Over Task Tool Approach

#### 1. Simplicity
- No complex import management
- Direct subprocess execution
- Standard JSON I/O interface

#### 2. Reliability  
- No dependency on Claude Code internal APIs
- Works in any Python environment
- Predictable error handling

#### 3. Debugging
- Easy to test independently
- Clear input/output visibility
- Comprehensive logging support

#### 4. Portability
- Works outside Claude Code environment
- Can be used in any Python script
- No special runtime requirements

## Performance Characteristics

### Execution Time
- Agent discovery: <1ms (file system lookup)
- YAML parsing: <5ms (small agent files)
- Codex execution: 10-45s (depends on analysis complexity)
- JSON extraction: <10ms (parsing response)

### Resource Usage
- Memory: <10MB (Python + subprocess overhead)
- Disk: Minimal (temporary files cleaned up)
- CPU: Low (mostly waiting for Codex)

### Scalability
- Concurrent execution: Supported (independent processes)
- Agent reuse: Efficient (agent definitions cached by file system)
- Large inputs: Handled (streaming JSON through stdin/stdout)

## Best Practices

### 1. Agent Design
- Keep agent instructions clear and specific
- Use structured YAML frontmatter
- Specify expected response format in agent definition

### 2. Error Handling
- Always check subprocess return codes
- Parse stderr for debugging information
- Implement appropriate timeouts

### 3. Input Validation
- Validate JSON input before passing to agent
- Sanitize file paths and user data
- Check agent names against allowed list

### 4. Testing
- Test agents independently with sample inputs
- Verify JSON response structure
- Test error conditions and fallbacks

## Migration from Task Tool

### Before (Task Tool)
```python
from Task import Task

result = Task(
    description="Analyze session",
    prompt=json.dumps(input_data),
    subagent_type="agent-name"
)
```

### After (Direct Execution)
```python
import subprocess

result = subprocess.run(
    ["python3", "claude_agent_runner.py", "agent-name"],
    input=json.dumps(input_data),
    capture_output=True,
    text=True
)
response = json.loads(result.stdout)
```

### Migration Checklist
- [ ] Replace Task tool imports with subprocess calls
- [ ] Update agent invocation to use claude_agent_runner.py
- [ ] Verify JSON input/output format compatibility
- [ ] Test error handling and fallback paths
- [ ] Update documentation and examples

---

*Created: 2025-07-28*  
*Component: Multi-Agent Observability System*  
*Type: Technical Documentation*