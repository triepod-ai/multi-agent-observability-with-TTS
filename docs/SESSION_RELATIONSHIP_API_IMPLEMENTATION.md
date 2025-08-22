# Session Relationship API Implementation

## Overview

This document describes the implementation of API endpoints for session relationship tracking in the multi-agent observability system. The implementation provides REST and WebSocket endpoints for querying and broadcasting session relationships.

## Features Implemented

### 1. Relationship Service (`apps/server/src/services/relationshipService.ts`)

Core relationship management functionality:

- **Database Operations**:
  - `insertSessionRelationship()` - Create new relationships
  - `updateRelationshipCompletion()` - Mark child sessions as completed
  - `getSessionRelationships()` - Get relationships with configurable options

- **Tree Building**:
  - `buildSessionTree()` - Build hierarchical session trees
  - `getSessionLineage()` - Get ancestor chain for a session
  - `calculateDepth()` - Calculate session depth in hierarchy
  - `detectCycles()` - Prevent infinite recursion in relationships

- **Analytics**:
  - `getSessionChildren()` - Get direct child sessions
  - `getSessionSiblings()` - Get sibling sessions
  - `getRelationshipStats()` - Generate comprehensive analytics

### 2. Enhanced Server (`apps/server/src/index.ts`)

New API endpoints added:

#### GET `/api/sessions/:id/relationships`
Get all relationships for a session with configurable options:
- Query parameters: `includeParent`, `includeChildren`, `includeSiblings`, `maxDepth`
- Returns: Session data with parent, children, siblings, depth, and path information

#### GET `/api/sessions/:id/children`
Get direct child sessions:
- Returns: Array of child Session objects

#### GET `/api/sessions/:id/tree`
Get full hierarchy tree:
- Query parameter: `maxDepth` (default: 5)
- Returns: Hierarchical SessionTreeNode structure with recursive children

#### POST `/api/sessions/spawn`
Register spawn attempt:
- Body: `{ parent_session_id, spawn_context }`
- Returns: Generated child session ID and relationship data
- Broadcasts: `session_spawn` WebSocket event

#### POST `/api/sessions/:id/child_completed`
Notify parent of child completion:
- Body: `{ child_session_id, completion_data }`
- Updates: Relationship completion timestamp
- Broadcasts: `child_session_completed` WebSocket event

#### GET `/api/relationships/stats`
Get relationship statistics:
- Query parameters: `start`, `end` (optional time range)
- Returns: Comprehensive analytics including types, reasons, completion rates

### 3. Enhanced Types (`apps/server/src/types.ts`)

New interfaces added:
- `SessionTreeNode` - Hierarchical tree representation
- `RelationshipStats` - Analytics data structure
- `SpawnContext` - Context for session spawning

### 4. Database Enhancements (`apps/server/src/db.ts`)

- **Schema Migration**: Automatic addition of relationship columns to events table
- **Indexes**: Performance indexes for relationship queries
- **Prepared Statements**: Optimized queries for frequent operations

### 5. Automatic Relationship Creation

Enhanced event processing to automatically create relationships:
- **SessionStart events** with `parent_session_id` → Creates parent/child relationship
- **SessionEnd events** with `parent_session_id` → Updates completion timestamp
- **Wave members** identified by `wave_id` → Creates wave_member relationships

## API Response Formats

### Session Relationships Response
```json
{
  "session": { 
    "session_id": "parent-id",
    "session_type": "main",
    "status": "active"
  },
  "parent": null,
  "children": [
    {
      "session_id": "child-id",
      "session_type": "subagent",
      "parent_session_id": "parent-id"
    }
  ],
  "siblings": [],
  "depth": 0,
  "path": "parent-id"
}
```

### Session Tree Response
```json
{
  "session_id": "root-id",
  "session_type": "main",
  "start_time": 1754587935015,
  "status": "active",
  "agent_count": 3,
  "children": [
    {
      "session_id": "child-1",
      "session_type": "subagent",
      "relationship_type": "parent/child",
      "spawn_reason": "task_delegation",
      "children": [],
      "depth": 1,
      "path": "root-id.child-1"
    }
  ],
  "depth": 0,
  "path": "root-id"
}
```

### Relationship Statistics Response
```json
{
  "totalRelationships": 10,
  "relationshipTypes": {
    "parent/child": 8,
    "wave_member": 2
  },
  "spawnReasons": {
    "task_tool": 5,
    "subagent_delegation": 3,
    "wave_orchestration": 2
  },
  "delegationTypes": {
    "parallel": 6,
    "sequential": 3,
    "isolated": 1
  },
  "averageDepth": 1.2,
  "maxDepth": 3,
  "completionRate": 0.8
}
```

## WebSocket Events

New WebSocket event types for real-time updates:

### `session_spawn`
```json
{
  "type": "session_spawn",
  "data": {
    "parent_session_id": "parent-id",
    "child_session_id": "child-id",
    "relationship": { /* relationship object */ },
    "spawn_context": { /* spawn context */ }
  }
}
```

### `child_session_completed`
```json
{
  "type": "child_session_completed",
  "data": {
    "parent_session_id": "parent-id",
    "child_session_id": "child-id",
    "completion_data": { /* completion details */ },
    "completed_at": 1754587935015
  }
}
```

### `relationship_created` / `relationship_updated`
Automatically broadcast when relationships are created or updated from hook events.

## Performance Features

1. **Prepared Statements**: Pre-compiled SQL queries for frequent operations
2. **Optimized Indexes**: Database indexes on relationship columns
3. **Cycle Detection**: Prevents infinite recursion in tree building
4. **Configurable Depth**: Limits tree depth to prevent performance issues
5. **Batch Operations**: Efficient handling of multiple relationships

## Usage Examples

### Basic Usage
```bash
# Get relationship statistics
curl http://localhost:4000/api/relationships/stats

# Spawn a new session
curl -X POST -H "Content-Type: application/json" \
  -d '{"parent_session_id":"parent-123","spawn_context":{"agent_name":"test-agent","spawn_method":"task_tool"}}' \
  http://localhost:4000/api/sessions/spawn

# Get session tree
curl http://localhost:4000/api/sessions/parent-123/tree?maxDepth=3

# Mark child completed
curl -X POST -H "Content-Type: application/json" \
  -d '{"child_session_id":"child-456","completion_data":{"status":"success"}}' \
  http://localhost:4000/api/sessions/parent-123/child_completed
```

### WebSocket Integration
```javascript
const ws = new WebSocket('ws://localhost:4000/stream');

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    
    if (message.type === 'session_spawn') {
        console.log('New session spawned:', message.data.child_session_id);
    } else if (message.type === 'child_session_completed') {
        console.log('Child completed:', message.data.child_session_id);
    }
};
```

## Testing

A comprehensive HTML demo is available at `relationship-api-demo.html` that demonstrates:
- All API endpoints with interactive forms
- WebSocket event monitoring
- Real-time relationship updates
- Error handling and response display

## Integration with Hooks

The system automatically processes hook events to create relationships:

1. **Python hooks** send events with `parent_session_id` and `delegation_context`
2. **Server processes** these events and creates appropriate relationships
3. **WebSocket clients** receive real-time updates about relationship changes
4. **Analytics** are automatically updated with new relationship data

## Future Enhancements

Potential improvements identified:
1. **Session Management**: Full CRUD operations for sessions table
2. **Wave Orchestration**: Enhanced support for multi-wave relationships  
3. **Performance Metrics**: Per-relationship performance tracking
4. **Visualization**: Graph-based relationship visualization endpoints
5. **Search**: Advanced querying capabilities for complex relationship patterns