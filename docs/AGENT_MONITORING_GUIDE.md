# Agent Monitoring Guide - Core System Functionality

## Overview

The Multi-Agent Observability System is fundamentally designed to **create AI agents with built-in monitoring and observability**. Every agent created through our system automatically includes comprehensive tracking, TTS notifications, and performance monitoring.

## Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Agent Creation Layer                   │
│  (/agent create → Structured, Observable Subagents)      │
├─────────────────────────────────────────────────────────┤
│                    Hook System Layer                     │
│  (TTS Notifications + Event Tracking + Performance)      │
├─────────────────────────────────────────────────────────┤
│                 Observability Dashboard                  │
│  (Real-time Visualization + Timeline + Metrics)          │
├─────────────────────────────────────────────────────────┤
│                   Data Storage Layer                     │
│  (Redis Events + Performance Metrics + Agent History)    │
└─────────────────────────────────────────────────────────┘
```

## Creating Observable Agents

### Standard Agent Creation with Monitoring

When you create an agent using our system:

```bash
/agent create memory-store "Stores data in appropriate memory system. Returns storage confirmation with ID."
```

The system automatically:
1. **Generates agent with monitoring hooks**
2. **Enables TTS notifications** for agent start/completion
3. **Tracks performance metrics** (tokens, execution time)
4. **Logs to observability dashboard**
5. **Returns structured data** for agent chaining

### Agent Template with Built-in Observability

```yaml
---
name: example-agent
description: Example agent with full observability. Returns structured results.
tools: Read, Write
---

# Example Agent

You are a [role] with built-in monitoring. All your actions are tracked for observability.

## Task
[Single focused task]

## Monitoring Integration
- Your start/completion is announced via TTS
- Performance metrics are automatically tracked
- All tool usage is logged to the dashboard
- Errors are captured and reported

## Instructions
1. [Step 1]
2. [Step 2]
3. Return structured result: {field1, field2, status}

## Success Criteria
- Task completed successfully
- Structured data returned
- Monitoring events logged
```

## Hook System Integration

### Automatic Hook Installation

```bash
# Install hooks with agent monitoring support
cd /home/bryan/multi-agent-observability-system
./bin/install-hooks.sh
```

This installs:
- **pre_tool_use.py**: Tracks agent tool usage
- **post_tool_use.py**: Logs results and performance
- **stop.py**: Enhanced with TTS notifications
- **subagent_stop.py**: Specialized agent completion tracking

### TTS Integration for Agents

Every agent operation includes TTS notifications powered by the enterprise Speak System (see [SPEAK_SYSTEM_OVERVIEW.md](./SPEAK_SYSTEM_OVERVIEW.md) for complete details):

```python
# Automatic notifications for:
- Agent start: "Starting memory-store agent"
- Agent completion: "Agent completed: stored with ID doc_123"
- Agent errors: "Agent failed: connection timeout"
```

**Key TTS Features for Agents**:
- **95% cost reduction** with OpenAI as primary provider
- **Automatic fallback chain**: OpenAI → ElevenLabs → pyttsx3
- **Context-aware voice selection** based on agent type
- **Anti-spam controls** preventing audio flooding
- **Queue coordination** for overlapping agent operations

### Event Flow for Agent Operations

1. **Agent Invocation**
   ```
   /spawn @.claude/agents/memory-store.md "data to store"
   ```

2. **Pre-execution Hook**
   - Logs agent start event
   - TTS: "Starting memory-store agent"
   - Records timestamp and context

3. **Agent Execution**
   - Tool usage tracked
   - Performance metrics collected
   - Real-time dashboard updates

4. **Post-execution Hook**
   - Logs completion event
   - TTS: "Agent completed successfully"
   - Stores performance data

5. **Dashboard Update**
   - Timeline shows agent execution
   - Metrics updated
   - Results available for analysis

## Observability Dashboard Features

### Agent-Specific Views

1. **Agent Timeline**
   - Visual representation of agent executions
   - Start/stop times
   - Tool usage patterns
   - Success/failure rates

2. **Performance Metrics**
   - Token usage per agent
   - Execution time trends
   - Resource utilization
   - Cost analysis

3. **Agent Chain Visualization**
   - See how agents call other agents
   - Data flow between agents
   - Bottleneck identification

### Real-time Monitoring

```javascript
// Dashboard automatically shows:
- Active agents (currently executing)
- Recent completions
- Error rates
- Performance anomalies
```

## Converting Slash Commands for Observability

### Why Convert to Agents?

1. **Built-in Monitoring**: Agents automatically tracked
2. **Structured Returns**: Enable agent chaining
3. **Performance Tracking**: Token usage and execution time
4. **TTS Integration**: Automatic notifications
5. **Dashboard Visibility**: All operations visible

### Conversion Example with Monitoring

```bash
# Old slash command (no monitoring)
/memory-simple-store "data"

# New observable agent
/agent create memory-store "Stores data with full observability. Returns confirmation with tracking ID."

# Usage with automatic monitoring
/spawn @.claude/agents/memory-store.md "data"
# → TTS: "Starting memory-store agent"
# → Dashboard: Shows execution in real-time
# → Returns: {"id": "doc_123", "status": "success"}
# → TTS: "Agent completed: stored with ID doc_123"
```

## Best Practices for Observable Agents

### 1. Always Return Structured Data
```json
{
  "status": "success|failed",
  "result": "actual data or error",
  "metadata": {
    "agent": "agent-name",
    "timestamp": "ISO-8601",
    "duration_ms": 1234
  }
}
```

### 2. Use Descriptive Agent Names
- Good: `tech-stack-analyzer`, `readme-updater`
- Bad: `agent1`, `helper`

### 3. Single Responsibility
- One agent = One observable operation
- Makes monitoring and debugging easier

### 4. Error Handling
```yaml
## Error Handling
- Return {"status": "failed", "error": "description"}
- Errors are automatically logged and announced
```

### 5. Chain Agents Properly
```bash
# Agent 1 output feeds Agent 2
result1=$(/spawn @.claude/agents/analyzer.md "input")
result2=$(/spawn @.claude/agents/processor.md "$result1")
# Both executions fully tracked and visible
```

## Monitoring Configuration

### Dashboard Access
```bash
# Start the observability dashboard
cd apps/client
npm run dev
# Access at http://localhost:8543
```

### TTS Configuration
```bash
# Configure TTS preferences
export TTS_PROVIDER=openai  # or elevenlabs, pyttsx3
export ENGINEER_NAME="Your Name"  # Personalized notifications
```

### Performance Thresholds
```javascript
// Configure in dashboard settings
{
  "alertThresholds": {
    "executionTime": 5000,  // Alert if agent takes >5s
    "tokenUsage": 10000,    // Alert if >10k tokens
    "errorRate": 0.1        // Alert if >10% errors
  }
}
```

## Integration with Existing Systems

### 1. Memory Systems
All memory operations through agents are automatically tracked:
- Chroma stores
- Qdrant queries
- Redis caching

### 2. External APIs
Agent calls to external services include:
- Request/response logging
- Latency tracking
- Error monitoring

### 3. Multi-Agent Workflows
Complex workflows with multiple agents show:
- Full execution graph
- Data flow visualization
- Bottleneck identification

## Troubleshooting Agent Monitoring

### Common Issues

1. **No TTS Notifications**
   - Check: `speak --status`
   - Verify hooks installed: `ls .claude/hooks/`
   - Test: `speak "test message"`

2. **Dashboard Not Updating**
   - Check Redis: `redis-cli ping`
   - Verify server running: `cd apps/server && npm run dev`
   - Check browser console for errors

3. **Agent Not Appearing**
   - Ensure agent created in `.claude/agents/`
   - Check agent has proper YAML header
   - Verify monitoring hooks active

### Debug Commands

```bash
# Check agent execution logs
redis-cli --scan --pattern "agent:*"

# View recent agent events
redis-cli LRANGE agent:events 0 10

# Test agent monitoring
/spawn @.claude/agents/test-agent.md "test"
```

## Future Enhancements

1. **Agent Performance Optimization**
   - ML-based execution time prediction
   - Automatic resource allocation
   - Smart agent caching

2. **Advanced Visualizations**
   - 3D agent interaction graphs
   - Heatmaps of agent usage
   - Predictive failure analysis

3. **Agent Marketplace**
   - Share observable agents
   - Community monitoring templates
   - Performance benchmarks

## Summary

The Multi-Agent Observability System transforms how we create and monitor AI agents:

- **Every agent is observable** from creation
- **Automatic TTS notifications** keep you informed
- **Real-time dashboard** shows all activity
- **Structured data returns** enable agent composition
- **Performance tracking** identifies optimization opportunities

This is not just about creating agents—it's about creating **observable, measurable, and improvable** AI systems.