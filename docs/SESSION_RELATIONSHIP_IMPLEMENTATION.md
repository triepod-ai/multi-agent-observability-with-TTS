# Session Relationship Implementation - Complete System Documentation

**Complete documentation for the session relationships system implementation and fixes in the multi-agent observability platform** ⭐⭐⭐ (Created: 2025-08-22)

## Overview

The Session Relationship Implementation provides comprehensive tracking and visualization of parent-child relationships between Claude Code sessions, enabling real-time monitoring of agent delegation hierarchies and session spawning patterns.

### Key Features

- **Automatic Session Management**: Auto-creation of sessions from SubagentStart/Stop events
- **Hierarchical Relationship Tracking**: Parent-child session relationships with depth tracking
- **Real-time WebSocket Updates**: Live updates for session spawn and completion events
- **Session Tree Building**: Recursive tree structure building with cycle detection
- **Agent Name Enhancement**: LLM-powered agent naming with caching for better visualization
- **API Response Format Standardization**: Consistent API responses with proper data wrapping

## System Architecture

### Core Components

1. **Database Layer** (`db.ts`): Session and relationship data persistence
2. **Relationship Service** (`relationshipService.ts`): Business logic for relationship operations
3. **API Layer** (`index.ts`): REST endpoints and WebSocket integration
4. **Frontend Types** (`types.ts`): TypeScript interfaces for client-server communication
5. **Timeline Correlation System** (`TimelineView.vue`): Session-first grouping and tool event pairing

### Database Schema

#### Sessions Table
```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  source_app TEXT NOT NULL,
  session_type TEXT DEFAULT 'main' CHECK (session_type IN ('main', 'subagent', 'wave', 'continuation', 'isolated')),
  parent_session_id TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration_ms INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'timeout', 'cancelled')),
  agent_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  session_metadata TEXT, -- JSON containing agent_name and other metadata
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (parent_session_id) REFERENCES sessions (session_id) ON DELETE SET NULL
);
```

#### Session Relationships Table
```sql
CREATE TABLE session_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_session_id TEXT NOT NULL,
  child_session_id TEXT NOT NULL,
  relationship_type TEXT DEFAULT 'parent/child' CHECK (relationship_type IN ('parent/child', 'sibling', 'continuation', 'wave_member')),
  spawn_reason TEXT CHECK (spawn_reason IN ('subagent_delegation', 'wave_orchestration', 'task_tool', 'continuation', 'manual')),
  delegation_type TEXT CHECK (delegation_type IN ('parallel', 'sequential', 'isolated')),
  spawn_metadata TEXT, -- JSON containing spawn context
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  completed_at INTEGER,
  depth_level INTEGER DEFAULT 1 CHECK (depth_level >= 0),
  session_path TEXT, -- Dot-separated path: "parent.child.grandchild"
  UNIQUE(parent_session_id, child_session_id),
  CHECK(parent_session_id != child_session_id)
);
```

## Implementation Details

### Automatic Session Management

The system automatically creates sessions and relationships based on hook events:

#### Session Creation Process
```typescript
function ensureSessionExists(event: HookEvent, timestamp: number): void {
  const existingSession = db.prepare('SELECT session_id FROM sessions WHERE session_id = ?').get(event.session_id);
  
  if (!existingSession) {
    let sessionType = 'main';
    if (event.parent_session_id) {
      sessionType = 'subagent';
    }
    
    // Insert session with auto-detection of type
    insertSessionStmt.run(
      event.session_id,
      event.source_app,
      sessionType,
      event.parent_session_id || null,
      timestamp,
      'active',
      0,
      0,
      null
    );
  }
}
```

#### SubagentStart Event Processing
```typescript
function handleSubagentStart(event: HookEvent, timestamp: number): void {
  // Extract and enhance agent name
  let agentName = payload.agent_name || payload.subagent_type || 'Unknown Agent';
  
  // Map delegation types to valid schema values
  let delegationType = payload.delegation_type || 'sequential';
  if (delegationType === 'specialized') {
    delegationType = 'sequential'; // Fixed constraint violation
  }
  
  // Create relationship if child session
  if (event.parent_session_id) {
    createSessionRelationship(
      event.parent_session_id,
      event.session_id,
      'parent/child',
      'subagent_delegation',
      delegationType,
      { agent_name: agentName, spawn_payload: payload },
      timestamp
    );
    
    // Broadcast WebSocket event
    broadcastRelationshipEvent({
      type: 'session_spawn',
      session_id: event.session_id,
      parent_session_id: event.parent_session_id,
      agent_name: agentName,
      timestamp: timestamp
    });
  }
}
```

### Agent Name Enhancement System

The system includes an intelligent agent naming service that generates memorable names:

#### Agent Classification
```typescript
function classifyAgentType(agentName: string, payload: any): string {
  const lowerName = agentName.toLowerCase();
  
  // Pattern-based classification
  if (lowerName.includes('screenshot') || lowerName.includes('analyze')) return 'analyzer';
  if (lowerName.includes('debug') || lowerName.includes('troubleshoot')) return 'debugger';
  if (lowerName.includes('review') || lowerName.includes('code')) return 'reviewer';
  // ... additional classification logic
  
  return 'generic';
}
```

#### Name Generation
```typescript
function generateDisplayAgentName(agentName: string, agentType: string, payload: any): string {
  const baseNames = {
    analyzer: ['DataDetective', 'InsightFinder', 'PatternHunter', 'SystemScout'],
    debugger: ['BugHunter', 'ErrorTracker', 'IssueResolver', 'DiagnosticAgent'],
    // ... type-specific name pools
  };
  
  const names = baseNames[agentType] || baseNames.generic;
  const variants = ['Alpha', 'Beta', 'Prime', 'Pro', 'Plus', 'Max', 'Core', 'Elite'];
  
  return `${names[randomIndex]}-${variants[variantIndex]}`;
}
```

### Session Tree Building

#### Tree Structure Interface
```typescript
export interface SessionTreeNode {
  session_id: string;
  session_type: string;
  relationship_type?: string;
  spawn_reason?: string;
  agent_name?: string;
  start_time: number;
  end_time?: number;
  status: string;
  children: SessionTreeNode[];
  depth: number;
  path: string;
}
```

#### Recursive Tree Builder with Cycle Detection
```typescript
export function buildSessionTree(rootSessionId: string, maxDepth: number = 5): SessionTreeNode | null {
  const session = getSession(rootSessionId);
  if (!session) return null;

  // Prevent infinite recursion
  if (detectCycles(rootSessionId)) {
    console.warn(`Cycle detected starting from session ${rootSessionId}`);
    return null;
  }

  const children: SessionTreeNode[] = [];
  
  if (maxDepth > 0) {
    const childRelationships = getDirectChildren(rootSessionId);
    
    for (const relationship of childRelationships) {
      const childTree = buildSessionTree(relationship.child_session_id, maxDepth - 1);
      if (childTree) {
        childTree.relationship_type = relationship.relationship_type;
        childTree.spawn_reason = relationship.spawn_reason;
        children.push(childTree);
      }
    }
  }

  // Extract agent name from metadata
  let agentName = 'Unknown Agent';
  if (session.session_metadata) {
    try {
      const metadata = JSON.parse(session.session_metadata);
      agentName = metadata.agent_name || agentName;
    } catch (e) {
      // Graceful fallback
    }
  }

  return {
    session_id: session.session_id,
    session_type: session.session_type,
    agent_name: agentName,
    children,
    depth: calculateDepth(rootSessionId),
    path: generateSessionPath(rootSessionId)
  };
}
```

### Timeline Correlation Integration (Updated 2025)

#### Session-First Grouping Strategy

The Timeline View now implements a session-first grouping strategy that aligns with the session relationship system:

```typescript
// Consistent with session relationship tracking
const groupKey = event.session_id; // Primary grouping by session

// Correlation ID preserved for tool event pairing
const correlationId = event.correlation_id; // Metadata for specialized operations
```

**Benefits for Session Relationships**:
- **Consistent Visualization**: Timeline grouping matches session hierarchy
- **Clear Parent-Child Display**: Child sessions appear as distinct timeline groups
- **Preserved Correlation Data**: correlation_id available for cross-session tool tracking
- **Enhanced Debugging**: Easy identification of session relationship boundaries

#### Tool Event Correlation Within Sessions

Tool events (PreToolUse/PostToolUse) are now paired within their session context:

```typescript
// Tool pairing respects session boundaries
if (event.hook_event_type === 'PreToolUse' &&
    nextEvent?.hook_event_type === 'PostToolUse' &&
    event.correlation_id === nextEvent.correlation_id &&
    event.session_id === nextEvent.session_id) { // Session boundary check
  // Create tool pair within session context
  createToolPair(event, nextEvent, session);
}
```

**Integration with Session Relationships**:
- Tool pairs only form within the same session
- Cross-session correlations preserved as metadata
- Parent-child session tool usage clearly separated
- Agent sessions maintain tool pairing within their context

### Real-time WebSocket Integration

#### WebSocket Event Broadcasting
```typescript
function broadcastRelationshipEvent(event: any): void {
  try {
    const message = JSON.stringify(event);
    wsClients.forEach(client => {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      } catch (error) {
        console.error('Error sending WebSocket message to client:', error);
      }
    });
  } catch (error) {
    console.error('Error broadcasting relationship event:', error);
  }
}
```

#### Event Types
- `session_spawn`: New child session created
- `child_session_completed`: Child session finished
- `relationship_created`: New relationship established
- `relationship_updated`: Relationship status changed

## API Endpoints

### Session Relationships API

#### Get Session Tree
```typescript
GET /api/sessions/:id/tree?maxDepth=5

Response:
{
  "tree": {
    "session_id": "session_123",
    "session_type": "main",
    "agent_name": "DataDetective-Alpha",
    "children": [
      {
        "session_id": "session_124",
        "session_type": "subagent",
        "relationship_type": "parent/child",
        "spawn_reason": "subagent_delegation",
        "agent_name": "BugHunter-Pro",
        "children": []
      }
    ],
    "depth": 0,
    "path": "session_123"
  }
}
```

#### Get Session Children
```typescript
GET /api/sessions/:id/children

Response: SessionTreeNode[]
```

#### Get Session Relationships
```typescript
GET /api/sessions/:id/relationships?includeParent=true&includeChildren=true&maxDepth=5

Response: {
  session: Session,
  parent: Session | null,
  children: Session[],
  siblings: Session[],
  depth: number,
  path: string
}
```

#### Register Session Spawn
```typescript
POST /api/sessions/spawn

Request Body:
{
  "parent_session_id": "session_123",
  "spawn_context": {
    "spawn_method": "subagent_delegation",
    "delegation_type": "sequential",
    "agent_type": "analyzer",
    "task_description": "Analyze system performance"
  }
}

Response:
{
  "child_session_id": "session_124",
  "relationship": SessionRelationship
}
```

#### Mark Child Completed
```typescript
POST /api/sessions/:parentId/child_completed

Request Body:
{
  "child_session_id": "session_124",
  "completion_data": {
    "duration_ms": 5000,
    "status": "completed",
    "result_summary": "Analysis complete"
  }
}
```

### Relationship Statistics API

#### Get Relationship Stats
```typescript
GET /api/relationships/stats?start=1640995200000&end=1641081600000

Response:
{
  "totalRelationships": 150,
  "relationshipTypes": {
    "parent/child": 140,
    "wave_member": 10
  },
  "spawnReasons": {
    "subagent_delegation": 120,
    "wave_orchestration": 20,
    "task_tool": 10
  },
  "delegationTypes": {
    "sequential": 100,
    "parallel": 30,
    "isolated": 20
  },
  "averageDepth": 2.3,
  "maxDepth": 5,
  "completionRate": 0.95
}
```

## Key Implementation Fixes

### 1. Database Constraint Violations
**Problem**: `specialized` delegation type not in schema constraints
**Solution**: Map `specialized` → `sequential` during processing

```typescript
let delegationType = payload.delegation_type || 'sequential';
if (delegationType === 'specialized') {
  delegationType = 'sequential'; // Map to valid schema value
}
```

### 2. API Response Format Mismatch
**Problem**: Frontend expected wrapped data in `/tree` endpoint
**Solution**: Standardized API response format

```typescript
// Before: return tree directly
return new Response(JSON.stringify(tree), { headers });

// After: wrap in consistent format
return new Response(JSON.stringify({ tree }), { headers });
```

### 3. Missing Session Population
**Problem**: Sessions table not populated from events
**Solution**: Added automatic session creation

```typescript
function processEventForSessionManagement(event: HookEvent, timestamp: number): void {
  // Ensure session exists for any event
  ensureSessionExists(event, timestamp);
  
  // Handle specific event types
  if (event.hook_event_type === 'SubagentStart') {
    handleSubagentStart(event, timestamp);
  }
  
  if (event.hook_event_type === 'SubagentStop') {
    handleSubagentStop(event, timestamp);
  }
}
```

### 4. Missing Agent Names in Tree
**Problem**: Session trees lacked agent names for visualization
**Solution**: Enhanced metadata extraction with LLM-powered naming

```typescript
// Extract and enhance agent name from session metadata
let agentName = 'Unknown Agent';
if (session.session_metadata) {
  try {
    const metadata = JSON.parse(session.session_metadata);
    agentName = metadata.agent_name || agentName;
  } catch (e) {
    // Graceful fallback
  }
}
```

### 5. Missing WebSocket Integration
**Problem**: No real-time updates for relationship changes
**Solution**: Added comprehensive WebSocket broadcasting

```typescript
// Broadcast session spawn events
broadcastRelationshipEvent({
  type: 'session_spawn',
  session_id: event.session_id,
  parent_session_id: event.parent_session_id,
  relationship_type: 'parent/child',
  agent_name: agentName,
  timestamp: timestamp
});
```

## Usage Examples

### Creating a Session Relationship
```typescript
// Automatic creation from SubagentStart event
const event: HookEvent = {
  source_app: 'claude-code',
  session_id: 'child_session_456',
  parent_session_id: 'parent_session_123',
  hook_event_type: 'SubagentStart',
  payload: {
    agent_name: 'screenshot-analyzer',
    agent_type: 'analyzer',
    delegation_type: 'sequential',
    task: 'Analyze UI mockup'
  },
  timestamp: Date.now()
};

// System automatically creates session and relationship
```

### Building a Session Tree
```typescript
// Get complete hierarchy for a session
const tree = buildSessionTree('root_session_123', 5);

console.log(JSON.stringify(tree, null, 2));
// Output:
{
  "session_id": "root_session_123",
  "session_type": "main",
  "agent_name": "DataDetective-Alpha",
  "children": [
    {
      "session_id": "child_session_124",
      "session_type": "subagent",
      "agent_name": "BugHunter-Pro",
      "relationship_type": "parent/child",
      "spawn_reason": "subagent_delegation"
    }
  ],
  "depth": 0,
  "path": "root_session_123"
}
```

### Real-time Monitoring
```javascript
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:4000/stream');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'session_spawn') {
    console.log('New agent spawned:', message.data.agent_name);
    updateSessionTree(message.data);
  }
  
  if (message.type === 'child_session_completed') {
    console.log('Agent completed:', message.data);
    markSessionCompleted(message.data.session_id);
  }
};
```

## Performance Optimizations

### 1. Prepared Statements
```typescript
// Pre-compiled statements for frequent queries
const getChildrenStmt = db.prepare(`
  SELECT sr.*, s.session_type, s.status, s.start_time, s.end_time
  FROM session_relationships sr
  LEFT JOIN sessions s ON sr.child_session_id = s.session_id
  WHERE sr.parent_session_id = ?
  ORDER BY sr.created_at
`);
```

### 2. Database Indexes
```sql
-- Optimized indexes for relationship queries
CREATE INDEX idx_session_rel_parent ON session_relationships(parent_session_id);
CREATE INDEX idx_session_rel_child ON session_relationships(child_session_id);
CREATE INDEX idx_session_rel_parent_type ON session_relationships(parent_session_id, relationship_type);
```

### 3. Cycle Detection
```typescript
function detectCycles(sessionId: string, visited: Set<string> = new Set()): boolean {
  if (visited.has(sessionId)) {
    return true; // Cycle detected
  }
  
  visited.add(sessionId);
  
  const children = getDirectChildren(sessionId);
  for (const child of children) {
    if (detectCycles(child.child_session_id, new Set(visited))) {
      return true;
    }
  }
  
  return false;
}
```

### 4. Agent Name Caching
```typescript
// LLM-generated names cached for performance
const cachedName = getAgentName(cacheKey);
if (cachedName) {
  agentName = cachedName.name;
  updateAgentNameUsage(cacheKey);
} else {
  // Generate new name only if not cached
  const generatedName = generateDisplayAgentName(agentName, agentType, payload);
  insertAgentName(generatedNameData);
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Relationships Not Created
**Symptoms**: Parent-child relationships missing despite SubagentStart events
**Diagnosis**: Check event payload for `parent_session_id`
**Solution**: Ensure events include proper session hierarchy data

```typescript
// Verify event structure
console.log('Event payload:', JSON.stringify(event, null, 2));
if (!event.parent_session_id) {
  console.warn('Missing parent_session_id in event');
}
```

#### 2. API Response Format Errors
**Symptoms**: Frontend errors when parsing tree data
**Diagnosis**: Check API response format consistency
**Solution**: Verify all endpoints return wrapped data format

```typescript
// Correct format
return new Response(JSON.stringify({ tree }), { headers });

// Not: return new Response(JSON.stringify(tree), { headers });
```

#### 3. Database Constraint Violations
**Symptoms**: Database insertion errors for relationships
**Diagnosis**: Check delegation_type values against schema constraints
**Solution**: Implement value mapping for non-standard types

```typescript
// Map non-standard values to schema-compliant ones
if (!['parallel', 'sequential', 'isolated'].includes(delegationType)) {
  delegationType = 'sequential'; // Safe default
}
```

#### 4. WebSocket Connection Issues
**Symptoms**: No real-time updates in frontend
**Diagnosis**: Check WebSocket client management
**Solution**: Verify client cleanup and error handling

```typescript
// Clean up disconnected clients
wsClients.forEach(client => {
  try {
    if (client.readyState === 1) {
      client.send(message);
    }
  } catch (error) {
    wsClients.delete(client); // Remove dead connections
  }
});
```

#### 5. Infinite Loops in Tree Building
**Symptoms**: Stack overflow or hanging requests
**Diagnosis**: Circular references in session hierarchy
**Solution**: Enable cycle detection and set max depth limits

```typescript
// Always use cycle detection
if (detectCycles(rootSessionId)) {
  console.warn(`Cycle detected starting from session ${rootSessionId}`);
  return null;
}

// Limit recursion depth
const maxDepth = Math.min(requestedDepth || 5, 10); // Cap at 10 levels
```

## Testing and Validation

### Unit Tests
```typescript
describe('Session Relationships', () => {
  test('creates relationship from SubagentStart event', () => {
    const event = createTestSubagentStartEvent();
    processEventForSessionManagement(event, Date.now());
    
    const relationships = getSessionRelationships(event.session_id);
    expect(relationships.parent).toBeDefined();
  });
  
  test('builds session tree with proper hierarchy', () => {
    const tree = buildSessionTree('root_session');
    expect(tree.children.length).toBeGreaterThan(0);
    expect(tree.depth).toBe(0);
  });
});
```

### Integration Tests
```typescript
describe('API Integration', () => {
  test('returns properly formatted tree response', async () => {
    const response = await fetch('/api/sessions/test_session/tree');
    const data = await response.json();
    
    expect(data).toHaveProperty('tree');
    expect(data.tree).toHaveProperty('session_id');
    expect(data.tree).toHaveProperty('children');
  });
});
```

### Performance Tests
```typescript
describe('Performance', () => {
  test('handles large session hierarchies efficiently', () => {
    const startTime = Date.now();
    const tree = buildSessionTree('large_hierarchy_root', 5);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(tree.children.length).toBeGreaterThan(50);
  });
});
```

## Future Enhancements

### 1. Advanced Relationship Types
- **Sibling Relationships**: Sessions spawned in parallel
- **Continuation Relationships**: Session restarts or handoffs
- **Wave Relationships**: Multi-stage orchestration tracking

### 2. Enhanced Analytics
- **Performance Correlation**: Relationship impact on execution time
- **Resource Usage Tracking**: Token and memory usage per relationship
- **Success Rate Analysis**: Relationship patterns vs success rates

### 3. Visual Improvements
- **Interactive Tree Visualization**: Collapsible/expandable nodes
- **Real-time Animation**: Live updates with smooth transitions
- **Relationship Metrics Overlay**: Performance data on tree nodes

### 4. Advanced Querying
- **Path-based Queries**: Find sessions by hierarchical path
- **Pattern Matching**: Identify common delegation patterns
- **Temporal Analysis**: Relationship changes over time

## Summary

The Session Relationship Implementation provides a robust foundation for tracking and visualizing agent delegation hierarchies in the multi-agent observability system. The implementation successfully resolves key technical challenges including database constraint handling, API response format standardization, real-time WebSocket integration, and intelligent agent naming.

**Key Achievements**:
- ✅ Automatic session and relationship creation from hook events  
- ✅ Hierarchical tree building with cycle detection and depth limits
- ✅ Real-time WebSocket updates for live monitoring
- ✅ Enhanced agent naming with LLM-powered generation and caching
- ✅ Comprehensive API endpoints for frontend integration
- ✅ Performance optimizations with prepared statements and indexing
- ✅ Robust error handling and graceful fallbacks

**System Benefits**:
- **Complete Visibility**: Track all agent relationships and delegation patterns
- **Real-time Monitoring**: Live updates without page refreshes  
- **Performance Insights**: Understand relationship impact on system performance
- **Troubleshooting Support**: Identify relationship issues and bottlenecks
- **Developer Experience**: Clear APIs and comprehensive documentation

The system now provides complete observability into agent relationships, enabling developers and operations teams to understand, monitor, and optimize complex multi-agent workflows with confidence.