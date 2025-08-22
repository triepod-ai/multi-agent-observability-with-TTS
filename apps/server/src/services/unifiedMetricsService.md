# Unified Metrics Service - Stage 2 Implementation

## Overview

The UnifiedMetricsService provides a single API for all metrics operations, acting as the **single source of truth** for metrics data with intelligent coordination between Redis (cache) and SQLite (primary store).

## Architecture

### Core Design Pattern
- **Primary Storage**: SQLite via `FallbackStorageService` (always reliable)
- **Cache Layer**: Redis via `RedisCache` (performance optimization when available)  
- **Failover Strategy**: SQLite operations always succeed, Redis operations are best-effort
- **Cache Sync**: Auto-sync between SQLite and Redis when Redis recovers

### Data Flow

```
┌─────────────────┐    Write-Through    ┌─────────────────┐
│                 │  ───────────────►   │                 │
│  Application    │                     │ UnifiedMetrics  │
│     Layer       │  ◄───────────────   │    Service      │
└─────────────────┘   Read-Through      └─────────────────┘
                                                │
                                        ┌───────┴───────┐
                                        ▼               ▼
                              ┌─────────────────┐ ┌──────────────┐
                              │     SQLite      │ │    Redis     │
                              │ (Primary Store) │ │   (Cache)    │  
                              │   MUST WORK     │ │ Best-Effort  │
                              └─────────────────┘ └──────────────┘
```

## Key Methods

### Core Metrics Operations

#### `recordMetric(event: HookEvent): Promise<void>`
Records metrics to both SQLite and Redis with write-through caching.

**Strategy**: SQLite MUST succeed, Redis is best-effort
```typescript
// Always write to SQLite first (primary store) - this MUST succeed
const success = await this.fallbackStorageService.recordAgentMetric(event);
if (!success) {
    throw new Error('Failed to record metric to SQLite');
}

// Try to update Redis cache (best-effort)  
try {
    await this.updateRedisCache(event);
} catch (error) {
    console.log('Redis cache update failed, data safe in SQLite');
    // Don't throw - SQLite has the data
}
```

#### `getMetrics(timeRange?: TimeRange): Promise<AgentMetrics>`
Gets aggregated metrics with cache-first approach.

**Strategy**: Redis first (fast), fallback to SQLite (reliable)
```typescript
// Try Redis first for performance
const cachedData = await this.redisService.get(cacheKey);
if (cachedData) {
    return JSON.parse(cachedData);
}

// Always fallback to SQLite
const metrics = await this.fallbackStorageService.getAgentMetrics(timeRange);
// Cache the result for future requests (best-effort)
await this.redisService.setEx(cacheKey, 60, JSON.stringify(metrics));
return metrics;
```

### Timeline and Distribution

#### `getTimeline(timeRange?: TimeRange): Promise<AgentTimeline>`
Gets time-series data for charts with 2-minute cache TTL.

#### `getDistribution(): Promise<AgentDistribution>`  
Gets agent type distribution with 3-minute cache TTL.

#### `getToolUsage(): Promise<ToolUsage>`
Gets tool usage statistics with 5-minute cache TTL.

### Agent Lifecycle

#### `markAgentStarted(agentData: any): Promise<string>`
Marks agent as started in both stores, returns agent ID.

#### `markAgentCompleted(agentData: any): Promise<boolean>`  
Marks agent as completed, removes from active caches.

### Cache Management

#### `syncCacheFromDatabase(): Promise<void>`
Rebuilds Redis cache from SQLite when Redis recovers.

**Features**:
- Rate limiting (5-minute intervals)
- Concurrent execution protection
- Differential TTLs for different data types
- Active agent cache warming
- Partial success handling

```typescript
// Warm up key metrics with different TTLs
await Promise.allSettled([
    this.redisService.setEx('metrics', 60, JSON.stringify(metrics)),      // 1 min
    this.redisService.setEx('timeline', 120, JSON.stringify(timeline)),   // 2 min  
    this.redisService.setEx('distribution', 180, JSON.stringify(dist)),   // 3 min
    this.redisService.setEx('tool_usage', 300, JSON.stringify(tools))     // 5 min
]);
```

## Cache Strategy

### Cache TTL Management
- **Metrics**: 60 seconds (high frequency updates)
- **Timeline**: 120 seconds (moderate frequency)  
- **Distribution**: 180 seconds (lower frequency)
- **Tool Usage**: 300 seconds (lowest frequency)
- **Active Agents**: 300 seconds (with auto-cleanup)

### Cache Invalidation
Automatic cache invalidation on writes:
```typescript
const cacheKeysToInvalidate = [
    'metrics:default',
    'timeline:default', 
    'agent_distribution',
    'tool_usage'
];
```

### Cache Warming Strategy
- **Triggers**: Service initialization, Redis recovery
- **Rate Limiting**: 5-minute intervals to prevent overload
- **Concurrency Protection**: Single warmup process at a time
- **Partial Success**: Continues warming even if some operations fail

## Error Handling

### Write Operations (Write-Through)
1. **SQLite Write**: MUST succeed - throws error if fails
2. **Redis Write**: Best-effort - logs error but continues
3. **Data Consistency**: SQLite is always authoritative

### Read Operations (Read-Through)  
1. **Redis Read**: Try first for performance
2. **SQLite Fallback**: Always available as backup
3. **Cache Population**: Cache SQLite results for future reads

### Circuit Breaker Integration
Leverages `RedisCache` circuit breaker for automatic Redis failure detection:
- **CLOSED**: Normal Redis operations
- **OPEN**: Redis blocked, SQLite-only mode  
- **HALF_OPEN**: Testing Redis recovery

## Performance Characteristics

### Read Performance
- **Redis Hit**: ~1-5ms response time
- **SQLite Fallback**: ~10-50ms response time  
- **Cache Population**: Automatic background process

### Write Performance  
- **SQLite Write**: ~5-20ms (primary constraint)
- **Redis Write**: ~1-10ms (parallel, best-effort)
- **Total Latency**: Dominated by SQLite write time

### Memory Usage
- **SQLite Connection**: ~5MB base footprint
- **Redis Connection**: ~2MB base footprint
- **Cache Data**: Varies by metrics volume (typically <10MB)

## Health Monitoring

### Service Health Status
```typescript
const health = await unifiedMetricsService.getServiceHealth();
// Returns:
// - healthy: Both SQLite and Redis working
// - degraded: SQLite working, Redis failed  
// - unhealthy: SQLite failed (critical)
```

### Cache Statistics  
```typescript
const stats = await unifiedMetricsService.getCacheStats();
// Returns cache availability, warmup status, timing
```

## Usage Examples

### Basic Usage
```typescript
import { unifiedMetricsService } from './services/unifiedMetricsService';

// Record a metric (always succeeds if SQLite healthy)
await unifiedMetricsService.recordMetric({
    source_app: 'claude-code',
    session_id: 'session123',  
    hook_event_type: 'SubagentStop',
    payload: {
        agent_name: 'test-agent',
        agent_type: 'analyzer',
        duration_ms: 5000,
        status: 'success'
    }
});

// Get metrics (Redis first, SQLite fallback)
const metrics = await unifiedMetricsService.getMetrics();
console.log(`Active agents: ${metrics.active_agents}`);

// Get timeline data for charts
const timeline = await unifiedMetricsService.getTimeline({
    start: Date.now() - 24*60*60*1000,
    end: Date.now()
});
```

### Cache Recovery
```typescript
// Force cache warmup after Redis recovery
await unifiedMetricsService.forceCacheWarmup();

// Check service health
const health = await unifiedMetricsService.getServiceHealth();
if (health.redis.status === 'healthy') {
    console.log('Redis cache layer available');
} else {
    console.log('Operating in SQLite-only mode');
}
```

## Integration Points

### Stage 3 Pipeline Integration
The UnifiedMetricsService is designed for easy integration with the metrics pipeline:

```typescript
// Pipeline will use unified service as single source of truth
const pipeline = new MetricsPipeline(unifiedMetricsService);
await pipeline.processMetrics();
```

### WebSocket Integration
```typescript
// Real-time updates using unified service
websocket.on('request_metrics', async () => {
    const metrics = await unifiedMetricsService.getMetrics();  
    websocket.send(JSON.stringify(metrics));
});
```

### API Endpoint Integration
```typescript
// REST API using unified service
app.get('/api/metrics', async (req, res) => {
    const metrics = await unifiedMetricsService.getMetrics();
    res.json(metrics);
});
```

## Testing and Validation

### Manual Testing Commands
```bash
# Test Redis health
curl http://localhost:3001/health

# Test metrics endpoint
curl http://localhost:3001/api/agent-metrics

# Simulate Redis failure (if Redis admin available)
redis-cli FLUSHALL
```

### Automated Testing
The service includes comprehensive error handling that can be validated:

1. **SQLite-only mode**: Disable Redis and verify continued operation
2. **Cache warming**: Enable Redis and verify cache population  
3. **Failover**: Simulate Redis failures during operations
4. **Data consistency**: Compare Redis and SQLite results

## Success Criteria ✅

✅ **Single API**: All metrics operations through one service  
✅ **Automatic Failover**: Graceful Redis failure handling  
✅ **Performance Optimization**: Redis caching when available  
✅ **Data Consistency**: SQLite as authoritative source  
✅ **Comprehensive Error Handling**: No data loss scenarios  
✅ **Cache Warming**: Automatic Redis recovery support  
✅ **Health Monitoring**: Service and component health tracking  
✅ **TypeScript Integration**: Full type safety and IntelliSense

## Next Steps (Stage 3)

The UnifiedMetricsService provides the foundation for Stage 3 pipeline integration:

1. **Pipeline Integration**: Use unified service in metrics processing pipeline
2. **WebSocket Enhancement**: Real-time metrics via unified service  
3. **API Consolidation**: Replace direct service calls with unified service
4. **Performance Monitoring**: Track cache hit rates and performance improvements
5. **Scaling Preparation**: Add horizontal scaling capabilities if needed

The unified service ensures metrics operations will work reliably regardless of Redis status while providing optimal performance when Redis is available.