# Session Relationship Tracking System

## Overview

The Session Relationship Tracking System provides comprehensive parent/child session monitoring for the multi-agent observability platform. This system automatically detects, tracks, and manages relationships between Claude sessions when subagents are spawned, enabling full hierarchical observability and metrics aggregation.

## Architecture

### Core Components

1. **Relationship Tracker Utility** (`.claude/hooks/utils/relationship_tracker.py`)
   - Parent session detection using multiple strategies
   - Spawn marker creation and management
   - Relationship registration with observability server
   - Session hierarchy calculations

2. **Enhanced Subagent Start Hook** (`.claude/hooks/subagent_start.py`)
   - Detects parent sessions on subagent spawn
   - Creates spawn markers for child session discovery
   - Registers relationships with the server
   - Tracks agent context and spawn metadata

3. **Enhanced Session Context Loader** (`.claude/hooks/session_context_loader.py`)
   - Displays parent/child relationships in session context
   - Shows session hierarchy and depth information
   - Integrates relationship context into Claude sessions

4. **Enhanced Subagent Stop Hook** (`.claude/hooks/subagent_stop.py`)
   - Updates relationship completion status
   - Notifies parent sessions of child completion
   - Cleans up spawn markers
   - Records final session metrics

### Database Schema

The system uses the `session_relationships` table with the following structure:

```sql
CREATE TABLE session_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_session_id TEXT NOT NULL,
    child_session_id TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'parent/child',
    spawn_reason TEXT,
    delegation_type TEXT,
    spawn_metadata TEXT, -- JSON blob
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    depth_level INTEGER DEFAULT 1,
    session_path TEXT
);
```

## Features

### Parent Session Detection

The system uses a multi-strategy approach to detect parent sessions:

1. **Environment Variables** (Primary)
   - `CLAUDE_PARENT_SESSION_ID` - Most reliable method
   - `CLAUDE_SESSION_ID` - Current session context

2. **Spawn Markers** (Secondary)
   - Temporary files in `/tmp/claude_spawn_markers/`
   - Redis-based marker storage (if available)

3. **Process Tree Analysis** (Tertiary)
   - Walks up the process tree looking for Claude sessions
   - Examines environment variables of parent processes

4. **Redis Session Tracking** (Fallback)
   - Uses active session sets to infer relationships
   - Works when there are exactly 2 active sessions

### Spawn Method Detection

The system automatically detects how subagents were spawned:

- **task_tool**: Via Task tool delegation
- **at_mention**: Via @-mention syntax
- **wave_orchestration**: Via wave system
- **auto_activation**: Automatically triggered
- **continuation**: Session continuation
- **manual**: Manual invocation (default)

### Session Hierarchy

Sessions are organized in a hierarchical structure:

- **Root Sessions**: No parent, depth level 0
- **Child Sessions**: Single parent, depth level 1+
- **Session Path**: Dot-separated hierarchy (e.g., "root.child.grandchild")

### Relationship Context

Each relationship includes comprehensive metadata:

```json
{
  "parent_session_id": "parent-uuid",
  "child_session_id": "child-uuid",
  "relationship_type": "parent/child",
  "spawn_reason": "task_delegation",
  "spawn_context": {
    "agent_name": "code-reviewer",
    "task_description": "Review PR #123",
    "spawn_method": "task_tool",
    "tools_granted": ["Read", "Grep"],
    "wave_context": {...}
  },
  "depth_level": 1,
  "session_path": "parent.child"
}
```

## Usage

### Environment Setup

Hooks automatically handle relationship tracking. For manual control:

```bash
# Set parent session for child spawning
export CLAUDE_PARENT_SESSION_ID="parent-session-id"

# Skip relationship tracking
export CLAUDE_SKIP_RELATIONSHIPS="true"

# Set wave context
export CLAUDE_WAVE_ID="wave-123"
export CLAUDE_WAVE_NUMBER="2"
```

### Hook Configuration

Relationships are tracked automatically via:

```json
{
  "hooks": {
    "subagent_start": [{
      "command": "uv run --with redis,requests,psutil .claude/hooks/subagent_start.py"
    }],
    "subagent_stop": [{
      "command": "uv run --with redis,requests,psutil .claude/hooks/subagent_stop.py"
    }],
    "session_start": [{
      "command": "uv run --with redis,psutil .claude/hooks/session_context_loader.py"
    }]
  }
}
```

### Command Line Options

All relationship hooks support these flags:

- `--no-relationships`: Disable relationship tracking
- `--no-redis`: Skip Redis operations
- `--no-server`: Skip server notifications

## API Endpoints

### Create Relationship

```http
POST /api/sessions/relationships
{
  "parent_session_id": "parent-uuid",
  "child_session_id": "child-uuid",
  "relationship_type": "parent/child",
  "spawn_reason": "task_delegation",
  "spawn_metadata": {...}
}
```

### Update Completion

```http
PATCH /api/sessions/relationships/{child_id}/complete
{
  "completed_at": 1641234567890,
  "completion_status": "completed",
  "final_metrics": {...}
}
```

### Get Session Hierarchy

```http
GET /api/sessions/{session_id}/hierarchy
```

### Get Relationship Analytics

```http
GET /api/analytics/relationships?start=timestamp&end=timestamp
```

## Event Structure

Relationship events sent to the observability server:

```json
{
  "event_type": "session_relationship",
  "parent_session_id": "parent-uuid",
  "child_session_id": "child-uuid", 
  "relationship_type": "parent/child",
  "spawn_reason": "subagent_delegation",
  "spawn_context": {
    "agent_name": "analyzer",
    "task_description": "Analyze codebase structure",
    "spawn_method": "task_tool",
    "tools_granted": ["Read", "Grep", "Glob"],
    "timestamp": "2025-01-08T10:30:00Z"
  }
}
```

## Monitoring & Analytics

### Session Hierarchy Visualization

The observability dashboard displays:

- Parent/child relationship trees
- Session depth and path visualization
- Spawn reason analytics
- Delegation type distributions

### Performance Metrics

Tracked metrics include:

- Session hierarchy depth distribution
- Average delegation time by type
- Parent/child communication patterns
- Resource usage by hierarchy level

### Relationship Analytics

Analytics queries support:

- Most common spawn patterns
- Session hierarchy performance
- Parent/child success rates
- Wave orchestration effectiveness

## Troubleshooting

### Common Issues

1. **Parent Not Detected**
   - Check environment variables are set
   - Verify spawn markers exist
   - Review process tree permissions

2. **Relationship Not Registered**
   - Confirm server connectivity
   - Check authentication/permissions
   - Verify hook execution order

3. **Missing Completion Updates**
   - Ensure subagent_stop hook runs
   - Check parent session availability
   - Verify notification channels

### Debug Commands

```bash
# Test parent detection
python3 -c "from utils.relationship_tracker import get_parent_session_id; print(get_parent_session_id())"

# Check spawn markers
ls -la /tmp/claude_spawn_markers/

# Test relationship registration
echo '{"session_id": "test", "agent_name": "test-agent"}' | python3 .claude/hooks/subagent_start.py --no-redis --no-server

# Validate hierarchy calculation
python3 test_relationship_tracking.py
```

### Log Analysis

Key log messages to monitor:

```
Session relationship registered: parent-123 -> child-456
Updated relationship completion for session child-456
Notified parent session parent-123 of completion
Context loaded with relationship context: parent-123.child-456
```

## Performance Considerations

### Optimization Strategies

1. **Redis Caching**: Session depths and paths cached for performance
2. **Marker Cleanup**: Automatic cleanup of expired spawn markers
3. **Batch Operations**: Multiple relationships processed efficiently
4. **Async Notifications**: Non-blocking parent notifications

### Resource Management

- Spawn markers auto-expire after 1 hour
- Redis keys have appropriate TTL settings
- Process tree analysis has timeout limits
- Server requests use reasonable timeouts

### Scalability

The system is designed to handle:

- Hundreds of concurrent sessions
- Deep hierarchies (10+ levels)
- High-frequency spawning patterns
- Wave orchestration with many members

## Security Considerations

### Data Protection

- Sensitive information filtered from spawn context
- Environment variables properly sanitized
- Process permissions respected for tree analysis
- Server communications use proper authentication

### Access Control

- Relationship data restricted to authorized sessions
- Parent/child notifications use secure channels
- Spawn markers have limited lifetime
- API endpoints require proper authorization

## Future Enhancements

### Planned Features

1. **Cross-Session Communication**: Direct parent/child messaging
2. **Resource Inheritance**: Child sessions inherit parent resources
3. **Cascade Operations**: Operations propagated through hierarchy
4. **Advanced Analytics**: ML-based relationship pattern analysis

### API Extensions

- WebSocket-based real-time relationship updates
- GraphQL interface for complex hierarchy queries
- Bulk relationship operations
- Relationship-based session grouping

---

## Installation

The relationship tracking system is automatically installed via:

```bash
./bin/install-hooks.sh /path/to/target/project
```

This configures all necessary hooks, dependencies, and server endpoints for comprehensive session relationship tracking.

## Testing

Run the comprehensive test suite:

```bash
python3 test_relationship_tracking.py
```

This validates all relationship tracking functionality including parent detection, spawn markers, hierarchy calculation, and completion notifications.