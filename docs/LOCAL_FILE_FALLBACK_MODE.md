# Local File Fallback Mode

## Overview

The Local File Fallback Mode enables the multi-agent-observability-system to operate offline when Redis or network connectivity is unavailable. This ensures that core functionality continues to work seamlessly in disconnected environments, with automatic synchronization when connectivity is restored.

## Key Features

- ✅ **Offline Operation**: Complete functionality without Redis dependency
- ✅ **Automatic Fallback**: Seamless switching when Redis becomes unavailable  
- ✅ **Sync-Back Capability**: Automatic synchronization when Redis comes back online
- ✅ **Data Integrity**: Local SQLite database with WAL mode for consistency
- ✅ **Session Continuity**: Session handoffs stored locally and in Redis
- ✅ **Agent Tracking**: Full agent lifecycle tracking with metrics
- ✅ **Terminal Status**: Real-time agent status display even offline
- ✅ **Configuration**: Comprehensive environment variable configuration

## Architecture

### Storage Strategy

```
~/.claude/fallback/
├── storage.db              # SQLite database (agent executions, metrics, sync queue)
├── handoffs/              # Session handoff files
│   ├── project-name_YYYYMMDD_HHMMSS.json
│   └── latest_project-name.json
├── metrics/               # Local metrics cache (future enhancement)
├── terminal/             # Terminal status files (future enhancement)  
└── sync/                 # Sync state tracking
```

### Core Components

1. **FallbackStorageService** - Local SQLite storage with Redis compatibility
2. **RedisConnectivityService** - Connection monitoring and health checks
3. **FallbackSyncService** - Sync-back operations and queue management
4. **AgentsService** - Enhanced agents service with fallback support

## Quick Start

### 1. Enable Fallback Mode

Fallback mode is enabled by default. To explicitly control:

```bash
# Enable fallback mode
export CLAUDE_FALLBACK_ENABLED=true

# Set custom storage directory
export CLAUDE_FALLBACK_DIR=/path/to/storage

# Configure retention
export CLAUDE_FALLBACK_RETENTION_DAYS=30
```

### 2. Configure Redis Settings

```bash
# Redis connection settings
export REDIS_URL=redis://localhost:6379
export CLAUDE_REDIS_TIMEOUT=2000
export CLAUDE_REDIS_RETRY_INTERVAL=30000
```

### 3. Configure Sync Settings

```bash
# Sync service settings
export CLAUDE_SYNC_ENABLED=true
export CLAUDE_SYNC_INTERVAL=30000
export CLAUDE_SYNC_BATCH_SIZE=100
```

### 4. Test the System

```bash
# Check fallback status
curl http://localhost:4000/api/fallback/status

# Test Redis connectivity
curl -X POST http://localhost:4000/api/fallback/test-redis

# Check health
curl http://localhost:4000/api/fallback/health
```

## Core Functionality

### Session Handoffs

Session handoffs work seamlessly in both Redis and fallback modes:

```bash
# Save handoff (automatically saved to both Redis and local storage)
curl -X POST http://localhost:4000/api/fallback/handoffs/my-project \
  -H "Content-Type: application/json" \
  -d '{
    "handoff_content": "Previous session context...",
    "session_id": "sess_123",
    "metadata": {"git_hash": "abc123"}
  }'

# Get latest handoff
curl http://localhost:4000/api/fallback/handoffs/my-project
```

### Agent Tracking

Agents are tracked locally and synced to Redis when available:

```python
# Python hooks automatically use fallback storage
from utils.fallback_storage import get_fallback_storage
fallback = get_fallback_storage()

# Store agent execution
agent_data = {
    "agent_name": "code-reviewer",
    "agent_type": "reviewer", 
    "task_description": "Review code changes",
    "session_id": "sess_123"
}
fallback.store_agent_execution("agent_456", agent_data)

# Update agent status
fallback.update_agent_execution("agent_456", {
    "status": "complete",
    "duration_ms": 5000,
    "token_usage": {"total_tokens": 1500}
})
```

### Sync Operations

The sync service automatically queues operations and syncs when Redis is available:

```bash
# Force sync all pending operations
curl -X POST http://localhost:4000/api/fallback/sync

# Check sync queue status
curl http://localhost:4000/api/fallback/sync-queue

# Test sync functionality
curl -X POST http://localhost:4000/api/fallback/test-sync
```

## API Endpoints

### Status and Health

- `GET /api/fallback/status` - Complete fallback system status
- `GET /api/fallback/health` - Health check endpoint
- `POST /api/fallback/test-redis` - Test Redis connectivity
- `POST /api/fallback/test-sync` - Test sync functionality

### Session Management

- `GET /api/fallback/handoffs/:projectName` - Get latest session handoff
- `POST /api/fallback/handoffs/:projectName` - Save session handoff

### Sync Management

- `POST /api/fallback/sync` - Force sync to Redis
- `GET /api/fallback/sync-queue` - Get sync queue status
- `DELETE /api/fallback/sync-queue` - Clear old sync operations

## Configuration

### Environment Variables

#### Core Settings
```bash
CLAUDE_FALLBACK_ENABLED=true          # Enable fallback mode
CLAUDE_FALLBACK_DIR=~/.claude/fallback # Storage directory
CLAUDE_FALLBACK_RETENTION_DAYS=30      # Data retention period
CLAUDE_FALLBACK_MAX_SIZE_MB=500        # Maximum storage size
```

#### Redis Settings
```bash
REDIS_URL=redis://localhost:6379      # Redis connection URL
CLAUDE_REDIS_TIMEOUT=2000             # Connection timeout (ms)
CLAUDE_REDIS_RETRY_INTERVAL=30000     # Retry interval (ms)
CLAUDE_REDIS_MAX_RETRIES=3            # Maximum retries
```

#### Sync Settings
```bash
CLAUDE_SYNC_ENABLED=true              # Enable sync service
CLAUDE_SYNC_INTERVAL=30000            # Sync interval (ms)
CLAUDE_SYNC_BATCH_SIZE=100            # Operations per batch
CLAUDE_SYNC_MAX_RETRIES=3             # Max sync retries
CLAUDE_SYNC_BACKOFF=exponential       # Backoff strategy
```

#### Performance Settings
```bash
CLAUDE_FALLBACK_CACHE_SIZE=64000      # SQLite cache size (KB)
CLAUDE_FALLBACK_BATCH_INSERT_SIZE=1000 # Batch insert size
CLAUDE_FALLBACK_WAL_MODE=true         # Enable WAL mode
```

#### Development Settings
```bash
CLAUDE_FORCE_FALLBACK=true            # Force fallback mode
CLAUDE_MOCK_REDIS_FAILURES=true      # Mock Redis failures
CLAUDE_FALLBACK_DEBUG=true            # Enable debug logging
CLAUDE_FALLBACK_VERBOSE=true          # Verbose logging
```

### Configuration File

Create `/config/fallback.config.js` for centralized configuration:

```javascript
module.exports = {
  fallback: {
    enabled: true,
    storage_dir: '~/.claude/fallback',
    retention_days: 30,
    max_size_mb: 500
  },
  redis: {
    url: 'redis://localhost:6379',
    timeout: 2000,
    retry_interval: 30000
  },
  sync: {
    enabled: true,
    sync_interval: 30000,
    batch_size: 100
  }
};
```

## Monitoring and Diagnostics

### System Status

Get comprehensive system status:

```bash
curl http://localhost:4000/api/fallback/status
```

Response includes:
- Redis connection status and health metrics
- Fallback storage statistics
- Sync service status and statistics
- Overall operational mode

### Health Checks

Monitor system health:

```bash
curl http://localhost:4000/api/fallback/health
```

Returns:
- `200 OK` - System healthy
- `503 Service Unavailable` - System unhealthy

### Storage Statistics

Monitor storage usage:

```javascript
const stats = await fallbackStorage.getStorageStats();
console.log(stats);
// {
//   total_size_mb: 15.2,
//   record_counts: {
//     agent_executions: 150,
//     session_handoffs: 25,
//     sync_queue: 10
//   },
//   pending_sync_operations: 5
// }
```

### Performance Metrics

Track sync performance:

```javascript
const syncStats = await fallbackSync.getSyncStats();
console.log(syncStats);
// {
//   total_operations: 1000,
//   synced_operations: 950,
//   failed_operations: 5,
//   pending_operations: 45,
//   sync_rate_per_minute: 120,
//   error_rate_percentage: 0.5
// }
```

## Operational Modes

### Redis Mode (Normal Operation)

When Redis is available:
- All operations go directly to Redis
- Local storage acts as backup and sync queue
- Real-time updates and advanced analytics available
- WebSocket updates work normally

### Fallback Mode (Offline Operation)

When Redis is unavailable:
- All operations use local SQLite storage
- Session handoffs saved to local JSON files
- Agent tracking continues locally
- Basic metrics and terminal status available
- Operations queued for sync when Redis returns

### Hybrid Mode (Intermittent Connectivity)

When Redis comes and goes:
- Automatic detection and switching
- Queued operations sync when Redis available
- Graceful degradation and recovery
- No data loss during transitions

## Troubleshooting

### Common Issues

#### Storage Initialization Errors
```bash
# Check storage directory permissions
ls -la ~/.claude/fallback/

# Check disk space
df -h ~/.claude/

# Verify SQLite installation
sqlite3 --version
```

#### Redis Connection Issues
```bash
# Test Redis connectivity
redis-cli ping

# Check Redis logs
redis-cli monitor

# Test from application
curl -X POST http://localhost:4000/api/fallback/test-redis
```

#### Sync Problems
```bash
# Check sync queue
curl http://localhost:4000/api/fallback/sync-queue

# Force sync
curl -X POST http://localhost:4000/api/fallback/sync

# Check sync service logs
# Look for "Sync completed" or "Sync failed" messages
```

### Debug Mode

Enable detailed logging:

```bash
export CLAUDE_FALLBACK_DEBUG=true
export CLAUDE_FALLBACK_VERBOSE=true
export NODE_ENV=development

# Restart the server to apply settings
```

### Recovery Procedures

#### Corrupted Local Storage
```bash
# Backup existing data
cp ~/.claude/fallback/storage.db ~/.claude/fallback/storage.db.backup

# Remove corrupted database (will be recreated)
rm ~/.claude/fallback/storage.db

# Restart service (will reinitialize)
```

#### Lost Sync Queue
```bash
# Clear sync queue if corrupted
curl -X DELETE "http://localhost:4000/api/fallback/sync-queue?olderThanHours=0"

# Force full re-sync (if Redis is available)
curl -X POST http://localhost:4000/api/fallback/sync
```

#### Redis Recovery
```bash
# When Redis comes back online, sync should happen automatically
# Monitor sync progress
curl http://localhost:4000/api/fallback/status

# Force immediate sync if needed
curl -X POST http://localhost:4000/api/fallback/sync
```

## Performance Considerations

### Optimization Tips

1. **Storage Location**: Use SSD for better performance
2. **Memory**: Increase SQLite cache size for better performance
3. **Batch Operations**: Use larger batch sizes for bulk operations
4. **Cleanup**: Regular cleanup prevents storage bloat
5. **Monitoring**: Monitor storage size and sync queue

### Performance Targets

- **Storage Operations**: <10ms for typical operations
- **Sync Throughput**: 100+ operations per batch
- **Memory Usage**: <100MB for local storage
- **Disk Usage**: <500MB default limit
- **Recovery Time**: <30 seconds for Redis reconnection

### Scaling Considerations

- **Single Instance**: Designed for single-node operation
- **Storage Limits**: 500MB default, configurable up to 5GB
- **Retention**: 30-day default, configurable
- **Concurrency**: SQLite WAL mode for concurrent access
- **Backup**: Regular automated cleanup and backup

## Integration with Existing System

### Hook Integration

The fallback system integrates seamlessly with existing Claude Code hooks:

```python
# session_context_loader.py - automatic fallback
from utils.fallback_storage import get_fallback_storage
fallback = get_fallback_storage()
return fallback.get_latest_session_handoff(project_name)

# subagent_start.py - automatic fallback  
fallback.store_agent_execution(agent_id, agent_data)

# subagent_stop.py - automatic fallback
fallback.update_agent_execution(agent_id, updates)
```

### Server Integration

The server automatically uses the enhanced agents service:

```typescript
// Automatically uses fallback when Redis unavailable
import { agentsService } from './services/agentsService';

const metrics = await agentsService.getCurrentMetrics();
// Returns metrics with fallback_mode: true when offline
```

### WebSocket Integration

WebSocket updates work in both modes:

```typescript
// Terminal status updates work offline
const terminalStatus = await agentsService.getTerminalStatus();
wsClients.forEach(client => {
  client.send(JSON.stringify({
    type: 'terminal_status',
    data: terminalStatus
  }));
});
```

## Migration and Deployment

### Existing Systems

For existing deployments:

1. **No Breaking Changes**: Fallback mode is backward compatible
2. **Gradual Rollout**: Enable fallback mode without affecting Redis
3. **Data Migration**: Existing Redis data remains untouched
4. **Configuration**: Add environment variables as needed

### New Deployments

For new deployments:

1. **Default Enabled**: Fallback mode enabled by default
2. **Zero Configuration**: Works out of the box
3. **Redis Optional**: Can run without Redis for development
4. **Production Ready**: Full monitoring and alerting support

## Security Considerations

### Data Protection

- **Local Storage**: SQLite database with file permissions
- **No Network Exposure**: Local files not accessible over network
- **Encryption**: Consider file-level encryption for sensitive data
- **Access Control**: Standard file system permissions apply

### Sync Security

- **Redis Authentication**: Supports Redis AUTH when configured
- **TLS Support**: Redis TLS connections supported
- **Validation**: All synced data validated before Redis operations
- **Rate Limiting**: Sync operations rate limited to prevent abuse

## Future Enhancements

### Planned Features

1. **Compression**: Data compression for larger storage efficiency
2. **Encryption**: Optional encryption for sensitive data
3. **Replication**: Multi-node synchronization capabilities
4. **Analytics**: Enhanced offline analytics and reporting
5. **Export/Import**: Bulk data export/import capabilities

### Integration Opportunities

1. **Cloud Storage**: Sync to cloud storage services
2. **Database Backends**: Support for PostgreSQL, MySQL
3. **Monitoring**: Integration with Prometheus, Grafana
4. **Backup Services**: Automated backup to external services
5. **Mobile Support**: Mobile-friendly APIs and storage

## Conclusion

The Local File Fallback Mode provides robust offline operation capabilities for the multi-agent-observability-system. It ensures continuous operation even in disconnected environments while maintaining data integrity and providing automatic synchronization when connectivity is restored.

Key benefits:
- **Reliability**: No dependency on network connectivity
- **Performance**: Local operations with sub-10ms response times
- **Simplicity**: Zero-configuration operation with intelligent defaults
- **Monitoring**: Comprehensive monitoring and diagnostics
- **Scalability**: Designed for production use with safety limits

For questions or issues, refer to the troubleshooting section or check the API endpoints for system status and diagnostics.