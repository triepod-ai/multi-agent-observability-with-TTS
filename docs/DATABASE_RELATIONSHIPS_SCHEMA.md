# Database Relationships Schema

## Overview

This document describes the database schema for session relationship tracking in the multi-agent observability system. The schema supports hierarchical session tracking, wave orchestration, and complex parent-child relationships between Claude Code sessions and their spawned subagents.

## Entity Relationship Diagram (Text-based)

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    sessions     │────▶│  session_relationships │◀────│     events      │
│                 │     │                      │     │                 │
│ session_id (PK) │     │ parent_session_id    │     │ session_id      │
│ source_app      │     │ child_session_id     │     │ parent_session  │
│ session_type    │     │ relationship_type    │     │ session_depth   │
│ parent_session  │     │ spawn_reason         │     │ wave_id         │
│ start_time      │     │ delegation_type      │     │ delegation_ctx  │
│ end_time        │     │ depth_level          │     │ hook_event_type │
│ status          │     │ session_path         │     │ payload         │
│ agent_count     │     │ spawn_metadata       │     │ timestamp       │
│ total_tokens    │     │ created_at           │     │                 │
│ metadata        │     │ completed_at         │     │                 │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

## Table Schemas

### 1. session_relationships

Tracks parent-child relationships between sessions.

```sql
CREATE TABLE session_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_session_id TEXT NOT NULL,
    child_session_id TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'parent/child',
    spawn_reason TEXT,
    delegation_type TEXT,
    spawn_metadata TEXT, -- JSON
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    depth_level INTEGER DEFAULT 1,
    session_path TEXT,
    
    UNIQUE(parent_session_id, child_session_id)
);
```

**Field Descriptions:**
- `relationship_type`: `parent/child`, `sibling`, `continuation`, `wave_member`
- `spawn_reason`: `subagent_delegation`, `wave_orchestration`, `task_tool`, `continuation`
- `delegation_type`: `parallel`, `sequential`, `isolated`
- `session_path`: Dot-separated hierarchy like `"root.child1.grandchild"`
- `spawn_metadata`: JSON blob with delegation context, strategies, dependencies

### 2. Enhanced events table

Extended the existing events table with relationship fields.

```sql
-- New columns added to existing events table:
ALTER TABLE events ADD COLUMN parent_session_id TEXT;
ALTER TABLE events ADD COLUMN session_depth INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN wave_id TEXT;
ALTER TABLE events ADD COLUMN delegation_context TEXT; -- JSON
```

**Field Descriptions:**
- `parent_session_id`: References the parent session if this event came from a subagent
- `session_depth`: Nesting level (0=main, 1=direct child, 2=grandchild, etc.)
- `wave_id`: Groups events that belong to the same wave orchestration
- `delegation_context`: JSON metadata about delegation strategy and context

### 3. sessions table

Comprehensive session lifecycle tracking.

```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    source_app TEXT NOT NULL,
    session_type TEXT DEFAULT 'main',
    parent_session_id TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_ms INTEGER,
    status TEXT DEFAULT 'active',
    agent_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    session_metadata TEXT, -- JSON
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

**Field Descriptions:**
- `session_type`: `main`, `subagent`, `wave`, `continuation`, `isolated`
- `status`: `active`, `completed`, `failed`, `timeout`, `cancelled`
- `agent_count`: Number of child subagents spawned by this session
- `session_metadata`: JSON with project info, user context, complexity metrics

## Common Query Patterns

### 1. Find All Children of a Session

```sql
-- Direct children only
SELECT sr.child_session_id, sr.relationship_type, sr.spawn_reason, s.status
FROM session_relationships sr
JOIN sessions s ON sr.child_session_id = s.session_id
WHERE sr.parent_session_id = 'main-session-001';

-- All descendants (recursive)
WITH RECURSIVE session_hierarchy AS (
    -- Base case: direct children
    SELECT child_session_id, parent_session_id, depth_level, session_path
    FROM session_relationships 
    WHERE parent_session_id = 'main-session-001'
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT sr.child_session_id, sr.parent_session_id, sr.depth_level, sr.session_path
    FROM session_relationships sr
    JOIN session_hierarchy sh ON sr.parent_session_id = sh.child_session_id
)
SELECT * FROM session_hierarchy;
```

### 2. Session Timeline with Relationships

```sql
SELECT 
    e.timestamp,
    e.session_id,
    e.parent_session_id,
    e.session_depth,
    e.hook_event_type,
    s.session_type,
    sr.relationship_type,
    sr.spawn_reason
FROM events e
LEFT JOIN sessions s ON e.session_id = s.session_id
LEFT JOIN session_relationships sr ON e.session_id = sr.child_session_id
WHERE e.timestamp BETWEEN ? AND ?
ORDER BY e.timestamp;
```

### 3. Wave Orchestration Analysis

```sql
SELECT 
    e.wave_id,
    COUNT(DISTINCT e.session_id) as wave_sessions,
    MIN(e.timestamp) as wave_start,
    MAX(e.timestamp) as wave_end,
    COUNT(*) as total_events
FROM events e
WHERE e.wave_id IS NOT NULL
GROUP BY e.wave_id
ORDER BY wave_start DESC;
```

### 4. Session Performance Metrics

```sql
SELECT 
    s.session_id,
    s.session_type,
    s.duration_ms,
    s.agent_count,
    s.total_tokens,
    COUNT(e.id) as event_count,
    sr.depth_level
FROM sessions s
LEFT JOIN events e ON s.session_id = e.session_id
LEFT JOIN session_relationships sr ON s.session_id = sr.child_session_id
WHERE s.start_time >= ?
GROUP BY s.session_id
ORDER BY s.start_time DESC;
```

### 5. Parent-Child Activity Correlation

```sql
SELECT 
    parent.session_id as parent_id,
    parent.session_type as parent_type,
    child.session_id as child_id,
    child.session_type as child_type,
    sr.spawn_reason,
    sr.delegation_type,
    (child.start_time - parent.start_time) as spawn_delay_ms,
    child.duration_ms as child_duration
FROM sessions parent
JOIN session_relationships sr ON parent.session_id = sr.parent_session_id
JOIN sessions child ON sr.child_session_id = child.session_id
WHERE parent.start_time >= ?
ORDER BY parent.start_time, child.start_time;
```

## Performance Considerations

### Indexing Strategy

**Primary Indexes (Created):**
- `session_relationships`: parent_session_id, child_session_id, relationship_type, created_at
- `events`: parent_session_id, wave_id, session_depth
- `sessions`: source_app, session_type, parent_session_id, status, start_time

**Composite Indexes for Common Patterns:**
- `(parent_session_id, relationship_type)` - Finding specific relationship types
- `(wave_id, timestamp)` - Wave orchestration timeline queries
- `(session_depth, hook_event_type)` - Event analysis by hierarchy level

### Query Optimization Tips

1. **Use Depth Limits**: When querying recursive hierarchies, add depth limits to prevent runaway queries
2. **Time-bound Queries**: Always include timestamp ranges for large datasets
3. **Index-friendly Filters**: Use indexed columns in WHERE clauses first
4. **Batch Operations**: Use batch inserts for relationship creation during high-activity periods

### Storage Estimates

**Expected Growth Rates:**
- Sessions: ~100-500 new sessions per day (main + subagents)
- Relationships: ~200-1000 new relationships per day
- Enhanced Events: Existing growth + relationship metadata

**Storage Requirements:**
- session_relationships: ~150 bytes per row
- Enhanced events: +50 bytes per existing row for new columns
- sessions: ~200 bytes per row

## Migration Rollback Procedures

### Emergency Rollback Steps

1. **Backup Current Data:**
   ```sql
   -- Create backup tables
   CREATE TABLE events_backup AS SELECT * FROM events;
   CREATE TABLE sessions_backup AS SELECT * FROM sessions;
   CREATE TABLE session_relationships_backup AS SELECT * FROM session_relationships;
   ```

2. **Rollback Migration 005 (sessions table):**
   ```sql
   -- Run the rollback script in 005_sessions.sql
   DROP TRIGGER IF EXISTS sessions_calculate_duration;
   DROP TRIGGER IF EXISTS sessions_updated_at;
   -- ... (full rollback script in migration file)
   DROP TABLE IF EXISTS sessions;
   ```

3. **Rollback Migration 004 (events enhancement):**
   ```sql
   -- SQLite doesn't support DROP COLUMN, so recreate table
   CREATE TABLE events_new AS SELECT 
       id, source_app, session_id, hook_event_type, 
       payload, chat, summary, timestamp 
   FROM events;
   DROP TABLE events;
   ALTER TABLE events_new RENAME TO events;
   -- Recreate original indexes
   ```

4. **Rollback Migration 003 (relationships table):**
   ```sql
   -- Run the rollback script in 003_session_relationships.sql
   DROP TABLE IF EXISTS session_relationships;
   ```

### Validation After Rollback

```sql
-- Verify table structure matches original
PRAGMA table_info(events);
SELECT COUNT(*) FROM events; -- Should match pre-migration count

-- Verify no relationship columns exist
SELECT sql FROM sqlite_master WHERE name = 'events';
```

## Testing and Validation

### Schema Validation Queries

```sql
-- Verify relationship constraints
SELECT COUNT(*) as self_references 
FROM session_relationships 
WHERE parent_session_id = child_session_id; -- Should be 0

-- Check referential integrity
SELECT COUNT(*) as orphaned_children
FROM session_relationships sr
LEFT JOIN sessions s ON sr.child_session_id = s.session_id
WHERE s.session_id IS NULL;

-- Validate session paths
SELECT session_path, COUNT(*) 
FROM session_relationships 
WHERE session_path IS NOT NULL
GROUP BY session_path
HAVING COUNT(*) > 1; -- Should show any duplicate paths
```

### Performance Benchmarks

```sql
-- Test relationship query performance
EXPLAIN QUERY PLAN 
SELECT * FROM session_relationships 
WHERE parent_session_id = 'test-session';

-- Test wave query performance  
EXPLAIN QUERY PLAN
SELECT * FROM events 
WHERE wave_id = 'wave-001' 
ORDER BY timestamp;
```

## Future Enhancements

### Planned Schema Evolution

1. **Session Health Metrics**: Add performance and error tracking fields
2. **Resource Usage**: Track memory, CPU, and token consumption patterns  
3. **Dependency Graphs**: Enhanced metadata for complex delegation patterns
4. **Session Templates**: Reusable session configuration patterns

### Monitoring Integration

The schema is designed to support real-time monitoring dashboards showing:
- Live session hierarchies
- Wave orchestration progress
- Performance metrics across session relationships
- Alert generation for failed or timeout sessions

This schema provides a solid foundation for comprehensive multi-agent session observability while maintaining backward compatibility and optimal query performance.