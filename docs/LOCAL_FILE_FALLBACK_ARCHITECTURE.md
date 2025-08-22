# Local File Fallback Mode Architecture

## Overview

The Local File Fallback Mode provides offline operation for the multi-agent-observability-system when Redis/network is unavailable. This ensures core functionality continues to work even in disconnected environments.

## Architecture Components

### 1. Storage Strategy

#### Primary Storage: SQLite + JSON Files
- **SQLite Database**: Structured data (agent executions, metrics, relationships)
- **JSON Files**: Session handoffs, temporary data, configuration
- **File System**: Session logs, chat transcripts, local cache

#### Storage Locations
```
~/.claude/fallback/
├── storage.db              # SQLite database
├── handoffs/              # Session handoff files
│   ├── project-name_YYYYMMDD_HHMMSS.json
│   └── latest_project-name.json
├── metrics/               # Local metrics cache
│   ├── hourly/           # Hourly metrics by date-hour
│   ├── daily/            # Daily rollups
│   └── agents/           # Agent performance data
├── terminal/             # Terminal status files
│   ├── active/           # Currently active agents
│   └── completed/        # Recently completed agents
└── sync/                 # Sync state tracking
    ├── pending.json      # Items to sync back to Redis
    └── last_sync.json    # Last successful sync timestamp
```

### 2. Core Functionality Support

#### Essential Operations (Offline Capable)
- ✅ Agent event tracking (start/stop)
- ✅ Session handoff storage/retrieval
- ✅ Terminal status display
- ✅ Basic metrics collection
- ✅ Hook execution logging
- ✅ Session relationship tracking

#### Enhanced Operations (Online Only)
- ❌ Real-time WebSocket updates
- ❌ Cross-session metrics aggregation
- ❌ Advanced analytics queries
- ❌ Distributed agent coordination

### 3. Fallback Detection

#### Connection Testing
```python
def test_redis_connection() -> bool:
    """Test if Redis is available and responsive"""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0, 
                       decode_responses=True, socket_timeout=2)
        r.ping()
        return True
    except:
        return False
```

#### Automatic Switching
- Connection test on every operation
- Graceful degradation when Redis fails
- Automatic recovery when Redis comes back online
- Configurable retry intervals

### 4. Data Synchronization

#### Sync-Back Strategy
1. **Queue Operations**: Store all write operations in pending queue
2. **Batch Sync**: Sync in batches when Redis available
3. **Conflict Resolution**: Last-write-wins for most data
4. **Delta Sync**: Only sync changes since last successful sync

#### Sync Data Types
- Session handoffs
- Agent execution records
- Metrics aggregates
- Terminal status updates
- Tool usage statistics

## Implementation Plan

### Phase 1: Core Fallback Service
- Local storage service with SQLite backend
- Basic Redis compatibility layer
- Fallback detection and switching logic

### Phase 2: Data Synchronization
- Sync queue implementation
- Batch sync operations
- Conflict resolution strategies

### Phase 3: Integration
- Update hooks to use fallback service
- Modify server backend for fallback support
- Add configuration and monitoring

## Technical Specifications

### SQLite Schema
```sql
-- Agent executions (replaces Redis agent:active:*, agents:active)
CREATE TABLE agent_executions (
    agent_id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_ms INTEGER,
    session_id TEXT,
    task_description TEXT,
    tools_granted TEXT, -- JSON array
    token_usage TEXT,   -- JSON object
    performance_metrics TEXT, -- JSON object
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Metrics aggregation (replaces Redis metrics:hourly:*, metrics:daily:*)
CREATE TABLE metrics_hourly (
    hour_key TEXT PRIMARY KEY,          -- YYYY-MM-DD-HH:agent_type
    agent_type TEXT NOT NULL,
    hour_timestamp INTEGER NOT NULL,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE metrics_daily (
    day_key TEXT PRIMARY KEY,           -- YYYY-MM-DD
    day_timestamp INTEGER NOT NULL,
    total_executions INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Tool usage tracking (replaces Redis tools:usage:*, tool:*:agents)
CREATE TABLE tool_usage (
    tool_name TEXT NOT NULL,
    date_key TEXT NOT NULL,             -- YYYY-MM-DD
    usage_count INTEGER DEFAULT 0,
    agents_using TEXT,                  -- JSON array of agent names
    PRIMARY KEY (tool_name, date_key)
);

-- Terminal status (replaces Redis terminal:status:*, terminal:completed:*)
CREATE TABLE terminal_status (
    agent_id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL,               -- active, complete
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_ms INTEGER,
    session_id TEXT,
    source_app TEXT,
    progress INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Sync queue for Redis synchronization
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,       -- set, hset, zadd, sadd, etc.
    redis_key TEXT NOT NULL,
    redis_value TEXT,                   -- JSON or string value
    redis_score REAL,                   -- For sorted sets
    hash_field TEXT,                    -- For hash operations
    ttl_seconds INTEGER,                -- TTL if applicable
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    sync_status TEXT DEFAULT 'pending', -- pending, synced, failed
    sync_attempts INTEGER DEFAULT 0,
    last_sync_attempt INTEGER
);
```

### JSON File Formats

#### Session Handoff Files
```json
{
    "project_name": "multi-agent-observability-system",
    "timestamp": "2025-01-21T10:30:00Z",
    "session_id": "sess_123456",
    "handoff_content": "Previous session context...",
    "metadata": {
        "source": "get-up-to-speed-export",
        "git_hash": "abc123def",
        "modified_files": 5
    }
}
```

#### Sync State Tracking
```json
{
    "last_sync_timestamp": 1706789400,
    "last_successful_sync": 1706789300,
    "pending_operations": 15,
    "failed_operations": 2,
    "redis_status": "offline",
    "next_retry": 1706789500
}
```

## Performance Considerations

### Optimization Strategies
- **SQLite WAL Mode**: Improved concurrent access
- **Prepared Statements**: Faster repeated queries
- **Batch Operations**: Reduce I/O overhead
- **Lazy Loading**: Load data only when needed
- **Index Optimization**: Strategic indexing for common queries

### Resource Management
- **Disk Space**: Automatic cleanup of old data
- **Memory Usage**: Streaming for large datasets
- **File Handles**: Connection pooling and proper cleanup
- **Lock Management**: Avoid deadlocks during sync operations

## Configuration Options

### Environment Variables
```bash
# Fallback behavior
CLAUDE_FALLBACK_ENABLED=true
CLAUDE_FALLBACK_DIR=~/.claude/fallback
CLAUDE_REDIS_TIMEOUT=2
CLAUDE_SYNC_INTERVAL=30

# Data retention
CLAUDE_FALLBACK_RETENTION_DAYS=30
CLAUDE_FALLBACK_MAX_SIZE_MB=500

# Sync behavior
CLAUDE_SYNC_BATCH_SIZE=100
CLAUDE_SYNC_MAX_RETRIES=3
CLAUDE_SYNC_BACKOFF=exponential
```

### Configuration File
```json
{
    "fallback": {
        "enabled": true,
        "storage_dir": "~/.claude/fallback",
        "retention_days": 30,
        "max_size_mb": 500
    },
    "redis": {
        "connection_timeout": 2,
        "retry_interval": 30,
        "max_retries": 3
    },
    "sync": {
        "enabled": true,
        "batch_size": 100,
        "sync_interval": 30,
        "backoff_strategy": "exponential"
    }
}
```

## Error Handling & Recovery

### Failure Scenarios
1. **Redis Connection Lost**: Seamless switch to local storage
2. **Disk Space Full**: Cleanup old data, alert user
3. **File Corruption**: Rebuild from available data
4. **Sync Conflicts**: Configurable resolution strategies
5. **Network Intermittent**: Queue operations for retry

### Recovery Strategies
- **Graceful Degradation**: Core functionality continues
- **Automatic Retry**: Exponential backoff for transient failures
- **Manual Recovery**: Tools for data repair and sync
- **Monitoring**: Health checks and status reporting

## Benefits

### Offline Operation
- ✅ No dependency on network connectivity
- ✅ Local development environment support
- ✅ Improved reliability in unstable networks
- ✅ Faster response times for local operations

### Data Consistency
- ✅ Eventual consistency with Redis
- ✅ Local data integrity
- ✅ Conflict resolution mechanisms
- ✅ Audit trail for all operations

### Performance
- ✅ Reduced network latency
- ✅ Local caching improves responsiveness
- ✅ Batch synchronization efficiency
- ✅ Optimized local queries

This architecture ensures the multi-agent-observability-system remains functional even when Redis is unavailable, while providing automatic synchronization when connectivity is restored.