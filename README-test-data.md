# Test Data Generation Scripts

This directory contains scripts to populate the Multi-Agent Observability System with realistic test data for demonstration and testing purposes.

## Scripts Overview

### 1. `send-test-agent-events.js` ⚡
Creates 5 different agent session types using various detection strategies:

- **SubagentStop sessions** (highest confidence detection)
- **Task tool sessions** (high confidence detection) 
- **@-mention sessions** (medium confidence detection)
- **Agent file operations** (medium confidence detection)
- **Combined pattern sessions** (multiple strategies)

**Usage:**
```bash
node send-test-agent-events.js
```

### 2. `populate-agent-metrics.js` 📊
Populates Redis with 7 days of agent execution metrics:

- **Historical data**: 400+ agent executions over 7 days
- **Active agents**: 3 currently running agents
- **Tool usage statistics** 
- **Performance metrics** and success rates

**Usage:**
```bash
node populate-agent-metrics.js
```

**Requirements:** Requires Redis running and `redis` npm package

### 3. `create-comprehensive-test-data.js` 🎯
Creates comprehensive multi-agent session with:

- **Multiple agent types**: @code-reviewer, @debugger, @performance-optimizer
- **Mixed detection patterns**: Task delegation, @-mentions, SubagentStop events
- **Realistic chat conversation** flow
- **Individual agent executions** via API endpoints

**Usage:**
```bash
node create-comprehensive-test-data.js
```

### 4. `verify-test-data.js` 🔍
Verifies all test data and provides summary:

- **Event count and analysis**
- **Agent metrics verification**
- **Session detection summary** 
- **Backend API health check**

**Usage:**
```bash
node verify-test-data.js
```

## Quick Setup

1. **Install dependencies:**
```bash
npm install redis
```

2. **Ensure services are running:**
```bash
# Backend server (from apps/server)
bun run dev

# Redis server
redis-server
```

3. **Run all scripts:**
```bash
# Basic agent sessions
node send-test-agent-events.js

# Historical metrics (optional)
node populate-agent-metrics.js

# Comprehensive data
node create-comprehensive-test-data.js

# Verify everything worked
node verify-test-data.js
```

## Expected Results

After running the scripts, the frontend should show:

### Agent Operations Modal
✅ **Detectable agent sessions** - Multiple session types using different detection strategies  
✅ **Agent analytics** - Real-time metrics, success rates, performance data  
✅ **Active agents** - Currently running agent executions  
✅ **Timeline data** - Historical execution patterns  

### Detection Strategies Tested
- **Strategy 1**: SubagentStop events (highest confidence) ✅
- **Strategy 2**: Task tool usage (high confidence) ✅
- **Strategy 3**: Agent file operations (medium confidence) ✅
- **Strategy 4**: @-mention patterns (medium confidence) ✅
- **Strategy 5**: Agent keywords (lower confidence) ✅
- **Strategy 6**: Multiple tool patterns (contextual) ✅

### Sample Data Created
- **5+ agent sessions** with different detection patterns
- **7 days** of historical metrics (400+ executions)
- **3-4 active agents** currently running
- **Realistic chat conversations** with multi-agent workflows
- **Tool usage analytics** across different agent types
- **Performance metrics** with success rates and token usage

## Troubleshooting

### Backend Connection Issues
```bash
# Check if backend is running
curl http://localhost:4000

# Start backend if needed
cd apps/server && bun run dev
```

### Redis Connection Issues  
```bash
# Check Redis is running
redis-cli ping

# Start Redis if needed
redis-server
```

### No Agent Sessions Detected
- Run `node verify-test-data.js` to check data
- Refresh the frontend application
- Check browser console for errors
- Ensure WebSocket connection is working

### Missing Dependencies
```bash
# Install Redis package
npm install redis

# Or run in project directory
cd apps/server && npm install
```

## Data Generated Summary

| Script | Sessions Created | Metrics Generated | Detection Strategies |
|--------|-----------------|------------------|-------------------|
| send-test-agent-events.js | 5 sessions | Event data | All 6 strategies |
| populate-agent-metrics.js | Historical data | 400+ executions | N/A |
| create-comprehensive-test-data.js | 1 complex + 5 API | Mixed data | Combined |

**Total:** ~11 agent sessions, 400+ historical executions, comprehensive test coverage

The frontend Agent Operations modal should now display rich, realistic data demonstrating all agent detection and analytics capabilities! 🎉