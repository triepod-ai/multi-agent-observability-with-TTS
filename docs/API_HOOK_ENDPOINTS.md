# Hook API Endpoints Documentation

## Overview

This document provides comprehensive documentation for all hook-related API endpoints in the Multi-Agent Observability System, including the recent fix for naming convention handling.

## Base URL

```
http://localhost:3456/api
```

## Hook Types Supported

The system supports 9 Claude Code hook types with dual naming convention compatibility:

| Hook Type | CamelCase | snake_case | Description |
|-----------|-----------|------------|-------------|
| session_start | SessionStart | session_start | Session initialization |
| user_prompt_submit | UserPromptSubmit | user_prompt_submit | User input processing |
| pre_tool_use | PreToolUse | pre_tool_use | Pre-tool validation |
| post_tool_use | PostToolUse | post_tool_use | Post-tool processing |
| subagent_start | SubagentStart | subagent_start | Agent initialization |
| subagent_stop | SubagentStop | subagent_stop | Agent completion |
| stop | Stop | stop | Session termination |
| notification | Notification | notification | System notifications |
| precompact | PreCompact | precompact | Pre-compression analysis |

## Endpoints

### 1. Hook Coverage Status

Get overall hook coverage statistics and status for all hooks.

**Endpoint:** `GET /api/hook-coverage`

**Response:**
```json
{
  "hooks": [
    {
      "type": "session_start",
      "displayName": "SessionStart",
      "description": "Session initialization and context loading",
      "icon": "🚀",
      "status": "active",
      "lastExecution": 1703789234567,
      "executionCount": 8534,
      "executionRate": "425/day",
      "successRate": 98,
      "averageExecutionTime": 247
    }
  ],
  "lastUpdated": 1703789234567,
  "totalActiveHooks": 7,
  "totalInactiveHooks": 1,
  "totalErrorHooks": 1,
  "overallSuccessRate": 94
}
```

**Status Values:**
- `active`: Hook is functioning normally
- `inactive`: No recent executions
- `error`: Recent errors detected

### 2. Enhanced Hook Context

Get comprehensive context analysis for a specific hook type.

**Endpoint:** `GET /api/hooks/{hookType}/enhanced-context`

**Parameters:**
- `hookType`: One of the supported hook types (e.g., `session_start`)
- `timeWindow` (optional): Time window in milliseconds (default: 24 hours)

**Example:** `GET /api/hooks/session_start/enhanced-context?timeWindow=86400000`

**Response:**
```json
{
  "sourceApps": ["multi-agent-system", "demo-agent"],
  "activeSessions": ["session_123", "session_456"],
  "sessionDepthRange": {
    "min": 1,
    "max": 3
  },
  "totalExecutions": 8534,
  "avgDuration": 247.5,
  "medianDuration": 203.0,
  "p95Duration": 450.2,
  "totalTokens": 1250000,
  "avgTokensPerExecution": 146.4,
  "totalCost": 25.0,
  "executionEnvironments": ["production", "development"],
  "userContext": ["user_123", "user_456"],
  "toolUsage": [
    {
      "name": "Read",
      "count": 2341,
      "successRate": 98,
      "commonParams": ["file_path", "limit", "offset"],
      "avgDuration": 45.2
    }
  ],
  "agentActivity": [
    {
      "id": "session-analyzer_analyzer",
      "name": "Session Analyzer",
      "type": "analyzer",
      "executions": 156,
      "avgDuration": 324.1,
      "totalTokens": 45000
    }
  ],
  "patterns": [
    {
      "id": "high-frequency",
      "icon": "🔥",
      "description": "High activity volume detected",
      "frequency": "8534 executions in 24h"
    }
  ],
  "recentErrors": [
    {
      "id": "error-0",
      "timestamp": 1703789234567,
      "source": "multi-agent-system",
      "message": "Connection timeout"
    }
  ],
  "sessionContext": {
    "parentSessions": 23,
    "childSessions": 156,
    "delegationPatterns": [
      {
        "type": "task_delegation",
        "count": 89
      }
    ]
  },
  "systemContext": {
    "hostname": "observability-server",
    "platform": "linux",
    "nodeVersion": "v18.17.0",
    "uptime": 2345678
  }
}
```

### 3. Hook Performance Metrics

Get performance-focused metrics for a specific hook type.

**Endpoint:** `GET /api/hooks/{hookType}/performance`

**Parameters:**
- `hookType`: Hook type identifier
- `timeWindow` (optional): Time window in milliseconds

**Example:** `GET /api/hooks/pre_tool_use/performance`

**Response:**
```json
{
  "totalExecutions": 12756,
  "avgDuration": 123.4,
  "medianDuration": 98.2,
  "p95Duration": 287.9,
  "totalTokens": 890000,
  "avgTokensPerExecution": 69.8,
  "totalCost": 17.8,
  "memoryUsage": {
    "avg": 45.2,
    "peak": 89.7
  },
  "topConsumers": [
    {
      "id": "multi-agent-system",
      "name": "multi-agent-system",
      "type": "application",
      "usage": "456,789 tokens",
      "percentage": 51
    }
  ]
}
```

### 4. Recent Hook Events

Get recent events for a specific hook type with detailed event data.

**Endpoint:** `GET /api/hooks/{hookType}/recent-events`

**Parameters:**
- `hookType`: Hook type identifier
- `limit` (optional): Number of events to return (default: 50)
- `timeWindow` (optional): Time window in milliseconds (default: 24 hours)

**Example:** `GET /api/hooks/post_tool_use/recent-events?limit=25`

**Response:**
```json
[
  {
    "id": "event_123456789",
    "timestamp": 1703789234567,
    "session_id": "session_abc123",
    "parent_session_id": "session_xyz789",
    "session_depth": 2,
    "hook_event_type": "PostToolUse",
    "source_app": "multi-agent-system",
    "duration": 156,
    "error": null,
    "payload": {
      "tool_name": "Read",
      "tool_input": {
        "file_path": "/home/user/document.txt",
        "limit": 100
      },
      "tool_result": {
        "content": "File content...",
        "lines_read": 87
      },
      "tokens": 145,
      "metadata": {
        "environment": "production",
        "user": "user_123"
      }
    }
  }
]
```

## Naming Convention Handling

### Dual Convention Support

All endpoints automatically handle both CamelCase and snake_case event types in the database:

```typescript
// API call for session_start hook
GET /api/hooks/session_start/enhanced-context

// Internally queries for BOTH:
// - SessionStart events (CamelCase)  
// - session_start events (snake_case)
```

### Event Type Mapping

The API uses the following mapping strategy:

```typescript
function getEventTypesForHook(hookType: string): string[] {
  const hookMappings: Record<string, string[]> = {
    'session_start': ['SessionStart', 'session_start'],
    'pre_tool_use': ['PreToolUse', 'pre_tool_use'],
    'post_tool_use': ['PostToolUse', 'post_tool_use'],
    // ... additional mappings
  };
  return hookMappings[hookType] || [];
}
```

### Database Query Pattern

All hook endpoints use this enhanced query pattern:

```sql
SELECT * FROM events 
WHERE hook_event_type IN ('HookName', 'hook_name')
AND timestamp > ?
ORDER BY timestamp DESC
```

## Error Responses

### Standard Error Format

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": 1703789234567,
  "details": {
    "hookType": "invalid_hook",
    "validHookTypes": ["session_start", "pre_tool_use", ...]
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_HOOK_TYPE | 400 | Hook type not recognized |
| INVALID_TIME_WINDOW | 400 | Time window parameter invalid |
| DATABASE_ERROR | 500 | Database query failed |
| NO_DATA_FOUND | 404 | No events found for hook type |

## Usage Examples

### cURL Examples

```bash
# Get hook coverage overview
curl "http://localhost:3456/api/hook-coverage"

# Get session_start hook context  
curl "http://localhost:3456/api/hooks/session_start/enhanced-context"

# Get performance metrics with custom time window (7 days)
curl "http://localhost:3456/api/hooks/pre_tool_use/performance?timeWindow=604800000"

# Get recent events with limit
curl "http://localhost:3456/api/hooks/subagent_stop/recent-events?limit=10"
```

### JavaScript Examples

```javascript
// Fetch hook coverage data
const response = await fetch('/api/hook-coverage');
const coverage = await response.json();

// Get enhanced context for a specific hook
const context = await fetch('/api/hooks/session_start/enhanced-context')
  .then(res => res.json());

// Get performance metrics with error handling
try {
  const metrics = await fetch('/api/hooks/pre_tool_use/performance');
  if (!metrics.ok) throw new Error('API request failed');
  const data = await metrics.json();
} catch (error) {
  console.error('Failed to fetch metrics:', error);
}
```

## Integration Notes

### Frontend Integration

The Hook Coverage Modal uses these endpoints:

- **Overview Tab**: Uses `/api/hook-coverage`
- **Recent Activity Tab**: Uses `/api/hooks/{type}/recent-events`
- **Performance Tab**: Uses `/api/hooks/{type}/performance`  
- **Execution Context Tab**: Uses `/api/hooks/{type}/enhanced-context`

### WebSocket Updates

Hook coverage data is also broadcast via WebSocket:

```json
{
  "type": "hook_status_update",
  "data": {
    // Same structure as /api/hook-coverage response
  }
}
```

## Performance Considerations

### Query Optimization

- Database queries use indexes on `hook_event_type` and `timestamp`
- Event type filtering happens at the database level
- Results are cached for frequently accessed data

### Rate Limiting

- No explicit rate limiting implemented
- Consider implementing rate limiting for production deployments
- Monitor query performance with high event volumes

### Memory Usage

- Large result sets may impact memory usage
- Use `limit` parameter for recent events queries
- Consider pagination for very large datasets

## Migration and Compatibility

### Legacy Support

The dual naming convention support ensures:
- **Backward compatibility** with existing CamelCase events
- **Forward compatibility** with snake_case events
- **No data loss** during naming convention transitions
- **Seamless API behavior** regardless of database content

### Future Considerations

- Consider standardizing to single naming convention
- Implement data migration tools if needed
- Monitor performance impact of dual convention queries
- Plan deprecation strategy for legacy naming patterns