# MCP Testing Evaluation Framework - API Reference

**Complete API reference guide for developers integrating with the MCP Testing Evaluation Framework**

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [REST API Endpoints](#rest-api-endpoints)
4. [WebSocket API](#websocket-api)
5. [Request/Response Formats](#requestresponse-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [SDK Usage Examples](#sdk-usage-examples)
9. [Version Compatibility](#version-compatibility)

## API Overview

The MCP Testing Evaluation Framework provides both REST API and WebSocket interfaces for programmatic access to evaluation capabilities. The API is designed for integration with CI/CD pipelines, development tools, and custom applications.

### Base URLs

- **REST API**: `http://localhost:3457/api/v1`
- **WebSocket**: `ws://localhost:3457/ws`
- **Dashboard**: `http://localhost:3457`

### API Versioning

The API uses URL-based versioning with the following support matrix:

| Version | Status | Support Level | Sunset Date |
|---------|---------|---------------|-------------|
| v1 | Current | Full Support | N/A |
| v0 | Deprecated | Security Only | 2025-06-01 |

### Content Types

- **Request**: `application/json`
- **Response**: `application/json`
- **WebSocket**: `text/plain` (JSON strings)

## Authentication & Authorization

### API Key Authentication

For production deployments, API key authentication is required:

```http
Authorization: Bearer <api-key>
```

### Public Access Mode

For local development and testing, authentication can be disabled:

```json
{
  "security": {
    "requireAuth": false,
    "allowedOrigins": ["http://localhost:3000"]
  }
}
```

### Permission Scopes

| Scope | Description | Endpoints |
|-------|-------------|-----------|
| `evaluate:read` | View evaluations | GET endpoints |
| `evaluate:write` | Start/stop evaluations | POST, DELETE endpoints |
| `evaluate:admin` | System administration | Config endpoints |
| `evaluate:export` | Export capabilities | Export endpoints |

### JWT Token Structure

```json
{
  "iss": "mcp-evaluator",
  "sub": "user-id",
  "aud": "api",
  "exp": 1640995200,
  "iat": 1640908800,
  "scopes": ["evaluate:read", "evaluate:write"]
}
```

## REST API Endpoints

### Evaluations

#### Start New Evaluation

```http
POST /api/v1/evaluations
Content-Type: application/json
Authorization: Bearer <token>

{
  "serverPath": "/path/to/mcp-server",
  "options": {
    "transport": "stdio",
    "runStatic": true,
    "runRuntime": true,
    "timeout": 30000,
    "retries": 3,
    "tags": ["development", "ci"]
  }
}
```

**Response** (201 Created):
```json
{
  "id": "eval_1704284400000",
  "status": "queued",
  "serverPath": "/path/to/mcp-server",
  "options": {
    "transport": "stdio",
    "runStatic": true,
    "runRuntime": true,
    "timeout": 30000,
    "retries": 3
  },
  "createdAt": "2024-01-03T10:00:00Z",
  "estimatedDuration": 45000,
  "queuePosition": 1
}
```

#### Get Evaluation Status

```http
GET /api/v1/evaluations/{id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "eval_1704284400000",
  "status": "running",
  "serverPath": "/path/to/mcp-server",
  "progress": {
    "phase": "runtime",
    "static": {
      "total": 5,
      "completed": 5,
      "passed": 4,
      "failed": 1
    },
    "runtime": {
      "total": 12,
      "completed": 8,
      "passed": 7,
      "failed": 1
    }
  },
  "currentTask": "Testing tool: search_documents",
  "startedAt": "2024-01-03T10:00:00Z",
  "updatedAt": "2024-01-03T10:02:30Z",
  "estimatedCompletion": "2024-01-03T10:03:45Z",
  "results": {
    "static": {
      "Functionality Match": {
        "score": 0.9,
        "status": "pass",
        "evidence": ["All documented features implemented"],
        "recommendations": []
      }
    },
    "runtime": {
      "toolTests": [
        {
          "name": "search_documents",
          "status": "passed",
          "responseTime": 245,
          "result": {
            "success": true,
            "data": "Tool executed successfully"
          }
        }
      ]
    }
  }
}
```

#### List Evaluations

```http
GET /api/v1/evaluations
Authorization: Bearer <token>

Query Parameters:
- status: queued|running|completed|failed
- limit: number (default: 50, max: 200)
- offset: number (default: 0)
- sortBy: createdAt|updatedAt|score
- sortOrder: asc|desc
- tags: comma-separated list
- serverPath: filter by server path
- dateFrom: ISO 8601 date
- dateTo: ISO 8601 date
```

**Response** (200 OK):
```json
{
  "evaluations": [
    {
      "id": "eval_1704284400000",
      "status": "completed",
      "serverPath": "/path/to/server",
      "score": 85.5,
      "createdAt": "2024-01-03T10:00:00Z",
      "completedAt": "2024-01-03T10:03:45Z",
      "duration": 225000,
      "tags": ["development"]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "status": "completed",
    "dateRange": "2024-01-01T00:00:00Z to 2024-01-03T23:59:59Z"
  }
}
```

#### Cancel Evaluation

```http
DELETE /api/v1/evaluations/{id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "eval_1704284400000",
  "status": "cancelled",
  "message": "Evaluation cancelled successfully",
  "cancelledAt": "2024-01-03T10:02:00Z"
}
```

### Reports

#### Generate Evaluation Report

```http
POST /api/v1/evaluations/{id}/reports
Content-Type: application/json
Authorization: Bearer <token>

{
  "format": "markdown",
  "includeEvidence": true,
  "includeRecommendations": true,
  "template": "submission"
}
```

**Response** (200 OK):
```json
{
  "reportId": "rpt_1704284500000",
  "format": "markdown",
  "downloadUrl": "/api/v1/reports/rpt_1704284500000/download",
  "expiresAt": "2024-01-10T10:00:00Z",
  "size": 15420,
  "createdAt": "2024-01-03T10:05:00Z"
}
```

#### Download Report

```http
GET /api/v1/reports/{reportId}/download
Authorization: Bearer <token>
```

**Response** (200 OK):
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="evaluation-report.md"

# MCP Server Evaluation Report
...report content...
```

### Tool Testing

#### Test Individual Tool

```http
POST /api/v1/tools/test
Content-Type: application/json
Authorization: Bearer <token>

{
  "serverPath": "/path/to/server",
  "toolName": "search_documents",
  "arguments": {
    "query": "test query",
    "limit": 10
  },
  "transport": "stdio",
  "timeout": 15000
}
```

**Response** (200 OK):
```json
{
  "testId": "test_1704284600000",
  "toolName": "search_documents",
  "status": "passed",
  "executionTime": 245,
  "result": {
    "success": true,
    "data": {
      "documents": [
        {"id": 1, "title": "Test Document", "score": 0.95}
      ]
    }
  },
  "validation": {
    "responseTime": "excellent",
    "errorHandling": "good",
    "dataFormat": "valid"
  },
  "testedAt": "2024-01-03T10:10:00Z"
}
```

### System Configuration

#### Get System Configuration

```http
GET /api/v1/config
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "version": "1.0.0",
  "capabilities": {
    "staticAnalysis": true,
    "runtimeTesting": true,
    "observabilityIntegration": true,
    "multiFormat": true
  },
  "limits": {
    "maxConcurrentEvaluations": 5,
    "maxFileSize": 104857600,
    "evaluationTimeout": 300000
  },
  "supportedTransports": ["stdio", "sse", "http"],
  "supportedFormats": ["json", "markdown", "html", "xml"],
  "hooks": {
    "available": [
      "functionality-match",
      "prompt-injection",
      "tool-naming",
      "working-examples",
      "error-handling"
    ],
    "custom": []
  }
}
```

#### Update Configuration

```http
PUT /api/v1/config
Content-Type: application/json
Authorization: Bearer <token>

{
  "limits": {
    "maxConcurrentEvaluations": 3,
    "evaluationTimeout": 180000
  },
  "observability": {
    "enabled": true,
    "endpoint": "http://localhost:3456"
  }
}
```

**Response** (200 OK):
```json
{
  "updated": true,
  "changes": [
    "limits.maxConcurrentEvaluations: 5 → 3",
    "limits.evaluationTimeout: 300000 → 180000"
  ],
  "appliedAt": "2024-01-03T10:15:00Z"
}
```

### Health & Metrics

#### Health Check

```http
GET /api/v1/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3661.23,
  "memory": {
    "used": 67108864,
    "total": 134217728,
    "percentage": 50.0
  },
  "services": {
    "database": "healthy",
    "inspector": "healthy",
    "hooks": "healthy",
    "observability": "degraded"
  },
  "lastCheck": "2024-01-03T10:20:00Z"
}
```

#### System Metrics

```http
GET /api/v1/metrics
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "evaluations": {
    "total": 1247,
    "completed": 1156,
    "failed": 91,
    "averageScore": 78.3,
    "averageDuration": 42500
  },
  "performance": {
    "requestsPerMinute": 15.2,
    "responseTime": {
      "p50": 125,
      "p95": 450,
      "p99": 1200
    },
    "errorRate": 0.02
  },
  "resources": {
    "cpuUsage": 23.5,
    "memoryUsage": 45.8,
    "diskUsage": 12.3
  },
  "period": "24h",
  "generatedAt": "2024-01-03T10:25:00Z"
}
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3457/ws');

// Authentication (if required)
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
};
```

### Event Types

#### Evaluation Events

**evaluation:started**
```json
{
  "type": "evaluation:started",
  "data": {
    "id": "eval_1704284400000",
    "serverPath": "/path/to/server",
    "timestamp": "2024-01-03T10:00:00Z"
  }
}
```

**evaluation:progress**
```json
{
  "type": "evaluation:progress",
  "data": {
    "id": "eval_1704284400000",
    "phase": "runtime",
    "progress": {
      "current": 8,
      "total": 12,
      "percentage": 66.7
    },
    "currentTask": "Testing tool: analyze_data",
    "estimatedCompletion": "2024-01-03T10:03:45Z"
  }
}
```

**evaluation:completed**
```json
{
  "type": "evaluation:completed",
  "data": {
    "id": "eval_1704284400000",
    "score": 85.5,
    "status": "completed",
    "duration": 225000,
    "completedAt": "2024-01-03T10:03:45Z",
    "summary": {
      "passed": 4,
      "warned": 1,
      "failed": 0
    }
  }
}
```

#### Hook Events

**hook:running**
```json
{
  "type": "hook:running",
  "data": {
    "evaluationId": "eval_1704284400000",
    "hook": "functionality-match",
    "requirement": "Functionality Match",
    "startedAt": "2024-01-03T10:01:00Z"
  }
}
```

**hook:completed**
```json
{
  "type": "hook:completed",
  "data": {
    "evaluationId": "eval_1704284400000",
    "hook": "functionality-match",
    "score": 0.9,
    "status": "pass",
    "duration": 1500,
    "evidence": ["All documented features implemented"],
    "recommendations": []
  }
}
```

#### Runtime Testing Events

**tool:testing**
```json
{
  "type": "tool:testing",
  "data": {
    "evaluationId": "eval_1704284400000",
    "toolName": "search_documents",
    "arguments": {"query": "test", "limit": 5},
    "startedAt": "2024-01-03T10:02:15Z"
  }
}
```

**tool:result**
```json
{
  "type": "tool:result",
  "data": {
    "evaluationId": "eval_1704284400000",
    "toolName": "search_documents",
    "status": "passed",
    "responseTime": 245,
    "result": {
      "success": true,
      "data": {...}
    }
  }
}
```

#### System Events

**system:status**
```json
{
  "type": "system:status",
  "data": {
    "activeEvaluations": 3,
    "queueLength": 2,
    "systemLoad": 45.2,
    "timestamp": "2024-01-03T10:30:00Z"
  }
}
```

**error:occurred**
```json
{
  "type": "error:occurred",
  "data": {
    "evaluationId": "eval_1704284400000",
    "error": {
      "code": "HOOK_EXECUTION_FAILED",
      "message": "Hook functionality-match.py failed with exit code 1",
      "details": "Python traceback here..."
    },
    "timestamp": "2024-01-03T10:01:30Z"
  }
}
```

### Client Commands

#### Subscribe to Evaluation

```json
{
  "type": "subscribe",
  "data": {
    "evaluationId": "eval_1704284400000",
    "events": ["progress", "completed", "error"]
  }
}
```

#### Unsubscribe

```json
{
  "type": "unsubscribe",
  "data": {
    "evaluationId": "eval_1704284400000"
  }
}
```

#### Get Live Status

```json
{
  "type": "getStatus",
  "data": {
    "evaluationId": "eval_1704284400000"
  }
}
```

## Request/Response Formats

### Standard Response Envelope

All API responses follow this structure:

```json
{
  "success": true,
  "data": {...},
  "meta": {
    "requestId": "req_1704284700000",
    "timestamp": "2024-01-03T10:35:00Z",
    "version": "1.0.0",
    "rateLimit": {
      "limit": 1000,
      "remaining": 987,
      "resetAt": "2024-01-03T11:00:00Z"
    }
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid server path provided",
    "details": {
      "field": "serverPath",
      "value": "/invalid/path",
      "constraint": "must be an existing directory"
    },
    "documentation": "https://docs.mcp-evaluator.com/errors/VALIDATION_ERROR"
  },
  "meta": {
    "requestId": "req_1704284800000",
    "timestamp": "2024-01-03T10:40:00Z",
    "version": "1.0.0"
  }
}
```

### Validation Schema

Request validation follows JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.mcp-evaluator.com/schemas/evaluation-request",
  "type": "object",
  "required": ["serverPath"],
  "properties": {
    "serverPath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "pattern": "^[^\\0]+$"
    },
    "options": {
      "type": "object",
      "properties": {
        "transport": {
          "type": "string",
          "enum": ["stdio", "sse", "http"]
        },
        "timeout": {
          "type": "integer",
          "minimum": 1000,
          "maximum": 300000
        },
        "retries": {
          "type": "integer",
          "minimum": 0,
          "maximum": 10
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## Error Handling

### Error Codes

| Code | HTTP Status | Description | Retry Safe |
|------|-------------|-------------|------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters | No |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid authentication | No |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient scopes | No |
| `RESOURCE_NOT_FOUND` | 404 | Evaluation/resource not found | No |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Yes |
| `SERVER_UNREACHABLE` | 422 | Cannot connect to MCP server | Yes |
| `EVALUATION_TIMEOUT` | 422 | Evaluation exceeded timeout | Yes |
| `CONCURRENT_LIMIT` | 503 | Max concurrent evaluations reached | Yes |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error | Yes |

### Error Recovery Strategies

```javascript
class APIClient {
  async makeRequest(endpoint, options) {
    const maxRetries = 3;
    const backoffBase = 1000;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, options);
        
        if (response.ok) {
          return await response.json();
        }
        
        const error = await response.json();
        
        // Don't retry client errors (4xx) except rate limiting
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new APIError(error.error.code, error.error.message);
        }
        
        // Server errors and rate limiting are retryable
        if (attempt === maxRetries) {
          throw new APIError(error.error.code, error.error.message);
        }
        
        // Exponential backoff with jitter
        const delay = backoffBase * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        if (attempt === maxRetries) throw error;
      }
    }
  }
}
```

### WebSocket Error Handling

```javascript
const ws = new WebSocket('ws://localhost:3457/ws');

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  if (event.code !== 1000) {
    console.warn('WebSocket closed unexpectedly:', event.code, event.reason);
    
    // Reconnect with exponential backoff
    setTimeout(() => {
      reconnectWebSocket();
    }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
  }
};

function reconnectWebSocket() {
  // Implement reconnection logic with backoff
  reconnectAttempts++;
  // ... reconnection code
}
```

## Rate Limiting

### Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint

| Endpoint | Limit | Window | Scope |
|----------|-------|---------|-------|
| `POST /evaluations` | 50 | 1 hour | Per API key |
| `GET /evaluations` | 1000 | 1 hour | Per API key |
| `GET /evaluations/{id}` | 2000 | 1 hour | Per API key |
| `POST /tools/test` | 100 | 1 hour | Per API key |
| WebSocket connections | 10 | Concurrent | Per API key |

### Rate Limit Handling

```javascript
async function handleRateLimit(response) {
  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const waitTime = (resetTime * 1000) - Date.now();
    
    console.log(`Rate limited. Waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Retry the request
    return makeRequest();
  }
  
  return response;
}
```

## SDK Usage Examples

### Node.js SDK

```javascript
const { MCPEvaluatorClient } = require('mcp-evaluator-sdk');

const client = new MCPEvaluatorClient({
  baseUrl: 'http://localhost:3457',
  apiKey: 'your-api-key',
  timeout: 30000,
  retries: 3
});

// Start evaluation
const evaluation = await client.evaluations.create({
  serverPath: '/path/to/server',
  options: {
    transport: 'stdio',
    runStatic: true,
    runRuntime: true
  }
});

console.log('Evaluation started:', evaluation.id);

// Monitor progress with events
client.on('evaluation:progress', (data) => {
  console.log(`Progress: ${data.progress.percentage}%`);
});

client.on('evaluation:completed', async (data) => {
  console.log('Completed with score:', data.score);
  
  // Generate report
  const report = await client.reports.create(data.id, {
    format: 'markdown',
    includeEvidence: true
  });
  
  console.log('Report URL:', report.downloadUrl);
});

// Subscribe to specific evaluation
await client.subscribe(evaluation.id);
```

### Python SDK

```python
from mcp_evaluator import MCPEvaluatorClient

client = MCPEvaluatorClient(
    base_url='http://localhost:3457',
    api_key='your-api-key',
    timeout=30
)

# Start evaluation
evaluation = client.evaluations.create(
    server_path='/path/to/server',
    options={
        'transport': 'stdio',
        'run_static': True,
        'run_runtime': True
    }
)

print(f"Evaluation started: {evaluation['id']}")

# Wait for completion
result = client.evaluations.wait_for_completion(
    evaluation['id'],
    timeout=300
)

print(f"Score: {result['score']}")

# Generate and download report
report = client.reports.create(
    evaluation['id'],
    format='markdown'
)

with open('evaluation-report.md', 'w') as f:
    f.write(client.reports.download(report['reportId']))
```

### CLI Integration

```bash
# Start evaluation and get JSON response
RESULT=$(mcp-evaluate /path/to/server --json --ci)
SCORE=$(echo "$RESULT" | jq '.score')

if (( $(echo "$SCORE >= 80" | bc -l) )); then
    echo "✅ Evaluation passed with score: $SCORE"
    exit 0
else
    echo "❌ Evaluation failed with score: $SCORE"
    exit 1
fi
```

### cURL Examples

```bash
# Start evaluation
curl -X POST http://localhost:3457/api/v1/evaluations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "serverPath": "/path/to/server",
    "options": {
      "transport": "stdio",
      "runStatic": true,
      "runRuntime": true
    }
  }'

# Monitor with polling
while true; do
  STATUS=$(curl -s -H "Authorization: Bearer $API_KEY" \
    http://localhost:3457/api/v1/evaluations/$EVAL_ID | jq -r '.status')
  
  if [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]]; then
    break
  fi
  
  sleep 5
done

# Get final results
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3457/api/v1/evaluations/$EVAL_ID
```

## Version Compatibility

### API Version Matrix

| SDK Version | API Version | Node.js | Python |
|-------------|-------------|---------|---------|
| 1.0.x | v1 | ≥14.0 | ≥3.7 |
| 0.9.x | v1, v0 | ≥14.0 | ≥3.7 |
| 0.8.x | v0 | ≥12.0 | ≥3.6 |

### Breaking Changes

#### v1.0.0 (Current)

- **Added**: WebSocket authentication support
- **Changed**: Response envelope format
- **Deprecated**: v0 API endpoints
- **Removed**: Legacy callback-style events

#### Migration Guide v0 → v1

```javascript
// v0 (deprecated)
const result = await client.evaluate('/path/to/server');
console.log(result.score);

// v1 (current)
const evaluation = await client.evaluations.create({
  serverPath: '/path/to/server'
});
const result = await client.evaluations.waitForCompletion(evaluation.id);
console.log(result.data.score);
```

### Backward Compatibility

The API maintains backward compatibility for:
- Core evaluation functionality
- Basic WebSocket events
- Report generation formats
- Authentication mechanisms

This comprehensive API reference provides all the information needed to integrate with the MCP Testing Evaluation Framework programmatically.