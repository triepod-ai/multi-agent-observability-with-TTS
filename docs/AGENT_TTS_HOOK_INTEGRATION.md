# Agent, TTS, and Hook Integration Guide

## Overview

This document explains how subagents, TTS notifications, and hooks work together to create a fully observable AI agent system.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Creation                            │
│              /agent create → Observable Subagent                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Hook System Layer                            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ pre_tool_use│  │post_tool_use │  │ subagent_stop          │ │
│  │ (agent start)│  │(tool results)│  │ (agent completion)     │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TTS Notification Layer                      │
│         speak "Starting agent"    speak "Agent completed"        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Observability Dashboard                        │
│          Real-time visualization of all agent activities         │
└─────────────────────────────────────────────────────────────────┘
```

## How Components Work Together

### 1. Agent Creation Phase

When you create an agent:
```bash
/agent create memory-store "Stores data in memory systems. Returns storage ID."
```

The system:
- Generates agent with monitoring-aware structure
- Includes hooks for lifecycle events
- Configures for structured data returns

### 2. Agent Execution Phase

When you run an agent:
```bash
/spawn @.claude/agents/memory-store.md "important data"
```

#### A. Pre-execution (pre_tool_use.py)
```python
# Hook triggered when agent starts
- Event logged: {"type": "PreToolUse", "tool": "Task", "agent": "memory-store"}
- TTS notification: speak "Starting memory-store agent"
- Dashboard update: Shows agent starting in real-time
```

#### B. During Execution
```python
# Each tool the agent uses is tracked
- Tool usage logged via pre/post tool hooks
- Performance metrics collected
- Real-time dashboard updates
```

#### C. Post-execution (subagent_stop.py)
```python
# Hook triggered when agent completes
- Event logged: {"type": "SubagentStop", "agent": "memory-store", "result": {...}}
- TTS notification: speak "Agent completed: stored with ID doc_123"
- Dashboard update: Shows completion status and results
```

## TTS Integration Details

For comprehensive TTS system documentation, see [SPEAK_SYSTEM_OVERVIEW.md](./SPEAK_SYSTEM_OVERVIEW.md).

### Configuration
```bash
# Set up TTS preferences
export TTS_PROVIDER=openai  # Fast, cost-effective (95% cost reduction)
export ENGINEER_NAME="Bryan"  # Personalized messages
```

### Hook-TTS Coordination

Each hook integrates with TTS via the `speak` command:

```python
# In pre_tool_use.py
if event_data.get("tool") == "Task":
    agent_name = extract_agent_name(event_data)
    subprocess.run(["speak", f"Starting {agent_name} agent"], capture_output=True)

# In subagent_stop.py
result = event_data.get("result", {})
if result.get("status") == "success":
    message = f"Agent completed: {result.get('message', 'success')}"
else:
    message = f"Agent failed: {result.get('error', 'unknown error')}"
subprocess.run(["speak", message], capture_output=True)
```

### TTS Queue Coordination

To prevent audio overlap when multiple agents run:
- Centralized queue coordinator (`coordinated_speak.py`)
- Unix domain socket for inter-process communication
- Priority-based playback (errors > completions > starts)

## Hook System Configuration

### Installing Hooks for Agent Monitoring

```bash
# Use the install-hooks.sh script
cd /home/bryan/multi-agent-observability-system
./bin/install-hooks.sh

# This installs:
- pre_tool_use.py    # Tracks agent starts
- post_tool_use.py   # Logs tool results
- subagent_stop.py   # Monitors completions
- stop.py            # Enhanced with summaries
- notification.py    # User interactions
```

### Hook Configuration in settings.json

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "uv run /absolute/path/.claude/hooks/pre_tool_use.py"
        }
      ]
    }],
    "SubagentStop": [{
      "hooks": [
        {
          "type": "command",
          "command": "uv run /absolute/path/.claude/hooks/subagent_stop.py"
        }
      ]
    }]
  }
}
```

## Observable Agent Patterns

### Pattern 1: Simple Data Operation
```yaml
---
name: data-store
description: Stores data with monitoring. Returns confirmation.
tools: mcp__redis__store_memory
---

# Automatically tracked:
- Start announcement via TTS
- Tool usage monitoring
- Performance metrics
- Completion notification
```

### Pattern 2: Analysis Agent
```yaml
---
name: code-analyzer
description: Analyzes code quality. Returns metrics and issues.
tools: Read, Grep
---

# Monitoring includes:
- Files accessed
- Search patterns used
- Analysis duration
- Results summary via TTS
```

### Pattern 3: Multi-Step Agent
```yaml
---
name: test-runner
description: Runs tests with reporting. Returns test results.
tools: Bash, Read
---

# Full observability:
- Each command tracked
- Output captured
- Errors highlighted
- Summary announced
```

## Dashboard Integration

### Real-time Agent View

The dashboard shows:
```javascript
{
  "agent": "memory-store",
  "status": "running",
  "started": "2025-07-27T10:30:00Z",
  "tools_used": ["mcp__redis__store_memory"],
  "progress": 75,
  "events": [
    {"type": "PreToolUse", "tool": "Task", "timestamp": "..."},
    {"type": "PreToolUse", "tool": "mcp__redis__store_memory", "timestamp": "..."},
    {"type": "PostToolUse", "tool": "mcp__redis__store_memory", "result": "..."}
  ]
}
```

### Agent Performance Metrics

Automatically collected:
- Execution time
- Token usage
- Tool call count
- Success/failure rate
- Resource utilization

## Best Practices

### 1. Agent Design for Observability
- Always return structured data
- Use descriptive agent names
- Include status in returns
- Handle errors gracefully

### 2. TTS Integration
- Keep notifications concise
- Use priority levels appropriately
- Test with `speak --off` flag in loops
- Configure personalization

### 3. Hook Configuration
- Use absolute paths in settings.json
- Test hooks individually
- Monitor hook performance
- Handle hook failures gracefully

### 4. Dashboard Usage
- Set appropriate event limits
- Use filters for focused analysis
- Monitor performance trends
- Export data for analysis

## Troubleshooting

### No TTS Notifications
```bash
# Check speak command
speak --status

# Test directly
speak "test message"

# Check TTS_ENABLED
echo $TTS_ENABLED
```

### Hooks Not Triggering
```bash
# Verify hook installation
cat .claude/settings.json | grep -A5 "PreToolUse"

# Check hook permissions
ls -la .claude/hooks/*.py

# Test hook directly
uv run .claude/hooks/pre_tool_use.py
```

### Dashboard Not Showing Agents
```bash
# Check server logs
tail -f apps/server/server.log

# Verify WebSocket connection
# Check browser console for errors

# Test event sending
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"type": "test", "data": {}}'
```

## Advanced Integration

### Custom Agent Hooks

Create agent-specific hooks:
```python
# In custom_agent_hook.py
def on_agent_start(agent_name, params):
    # Custom logic for specific agents
    if agent_name == "critical-processor":
        speak(f"High priority: {agent_name} starting", priority="high")
        # Additional monitoring setup
```

### Performance Optimization

For high-frequency agents:
```python
# Batch TTS notifications
notifications = []
for result in agent_results:
    notifications.append(result.summary)

# Single TTS call
if notifications:
    speak(f"Completed {len(notifications)} operations")
```

### Integration with External Systems

Export agent metrics:
```javascript
// Connect to dashboard API
const metrics = await fetch('/api/agent-metrics/daily');
// Send to monitoring system
await sendToDatadog(metrics);
```

## Summary

The integration of agents, TTS, and hooks creates a comprehensive observability system where:
- Every agent action is tracked automatically
- Voice notifications keep users informed
- Real-time dashboard provides visual insights
- Performance metrics enable optimization
- Structured data enables agent composition

This integrated approach transforms AI agents from black boxes into fully observable, measurable, and improvable systems.