import type { HookEvent, AgentStatus } from '../types';
import { fallbackStorage } from './fallbackStorageService';
import { redisCache } from './redisCache';

export interface TimeRange {
  start: number;
  end: number;
}

export interface AgentMetrics {
  active_agents: number;
  executions_today: number;
  success_rate: number;
  avg_duration_ms: number;
  tokens_used_today: number;
  estimated_cost_today: number;
  agent_type_breakdown: Array<{
    type: string;
    executions: number;
    success_rate: number;
    avg_duration_ms: number;
    unique_agents: number;
    total_tokens: number;
    estimated_cost: number;
  }>;
}

export interface AgentTimeline {
  timeline: Array<{
    timestamp: string;
    executions: number;
    tokens: number;
    cost: number;
    avg_duration_ms: number;
    agent_types_count: number;
    dominant_agent_type: string;
  }>;
}

export interface AgentDistribution {
  distribution: Array<{
    type: string;
    count: number;
    percentage: number;
    avg_duration_ms: number;
    success_rate: number;
    common_tools: string[];
  }>;
}

export interface ToolUsage {
  period: string;
  tools: Array<{
    name: string;
    usage_count: number;
    percentage: number;
    agent_types_using: number;
    avg_per_execution: number;
  }>;
  insights: {
    most_used_tool: string;
    least_used_tool: string;
    total_unique_tools: number;
  };
}

/**
 * Unified Metrics Service - Single Source of Truth for All Metrics Operations
 * 
 * Architecture:
 * - Primary Storage: SQLite via FallbackStorageService (always reliable)
 * - Cache Layer: Redis via RedisCache (performance optimization when available)
 * - Failover Strategy: SQLite operations always succeed, Redis operations are best-effort
 * - Cache Sync: Auto-sync between SQLite and Redis when Redis recovers
 */
export class UnifiedMetricsService {
  private cacheWarmupInProgress = false;
  private lastCacheWarmup = 0;
  private readonly CACHE_WARMUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private fallbackStorageService = fallbackStorage,
    private redisService = redisCache
  ) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize fallback storage (primary store)
      await this.fallbackStorageService.initialize();
      console.log('✅ UnifiedMetricsService: SQLite initialized (primary store)');

      // Check Redis health and attempt cache warming if healthy
      await this.attemptCacheWarming();
    } catch (error) {
      console.error('UnifiedMetricsService initialization error:', error);
      // Continue with SQLite-only mode
    }
  }

  private async attemptCacheWarming(): Promise<void> {
    try {
      const healthCheck = await this.redisService.healthCheck();
      if (healthCheck.status === 'healthy') {
        console.log('✅ UnifiedMetricsService: Redis healthy, cache layer available');
        await this.syncCacheFromDatabase();
      } else {
        console.log('⚠️ UnifiedMetricsService: Redis unhealthy, operating in SQLite-only mode');
      }
    } catch (error) {
      console.log('⚠️ UnifiedMetricsService: Redis unavailable, operating in SQLite-only mode');
    }
  }

  /**
   * Record a metric event to both SQLite and Redis (write-through caching)
   */
  async recordMetric(event: HookEvent): Promise<void> {
    // Always write to SQLite first (primary store) - this MUST succeed
    try {
      const success = await this.fallbackStorageService.recordAgentMetric(event);
      if (!success) {
        throw new Error('Failed to record metric to SQLite');
      }
      console.log(`✅ Metric recorded to SQLite: ${event.hook_event_type}`);
    } catch (error) {
      console.error('❌ CRITICAL: Failed to record metric to SQLite:', error);
      throw error; // This is critical - we must have the data in SQLite
    }

    // Try to update Redis cache (best-effort)
    try {
      await this.updateRedisCache(event);
    } catch (error) {
      console.log('⚠️ Redis cache update failed, data safe in SQLite:', error.message);
      // Don't throw - SQLite has the data, this is just cache optimization
    }
  }

  /**
   * Get aggregated metrics with cache-first approach (read-through caching)
   */
  async getMetrics(timeRange?: TimeRange): Promise<AgentMetrics> {
    // Try Redis first for performance
    try {
      const cacheKey = this.generateCacheKey('metrics', timeRange);
      const cachedData = await this.redisService.get(cacheKey);
      
      if (cachedData) {
        const metrics = JSON.parse(cachedData);
        console.log(`✅ Metrics retrieved from Redis cache: ${cacheKey}`);
        return metrics;
      }
    } catch (error) {
      console.log('⚠️ Redis read failed, using SQLite fallback:', error.message);
    }

    // Always fallback to SQLite (reliable)
    try {
      const metrics = await this.fallbackStorageService.getAgentMetrics(timeRange);
      console.log('✅ Metrics retrieved from SQLite (fallback)');

      // Try to cache the result for future requests (best-effort)
      try {
        const cacheKey = this.generateCacheKey('metrics', timeRange);
        await this.redisService.setEx(cacheKey, 60, JSON.stringify(metrics)); // Cache for 1 minute
      } catch (cacheError) {
        // Ignore cache write failures
      }

      return metrics;
    } catch (error) {
      console.error('❌ CRITICAL: Failed to get metrics from SQLite:', error);
      // Return default metrics structure
      return {
        active_agents: 0,
        executions_today: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        tokens_used_today: 0,
        estimated_cost_today: 0,
        agent_type_breakdown: []
      };
    }
  }

  /**
   * Get time-series data for charts with cache-first approach
   */
  async getTimeline(timeRange?: TimeRange): Promise<AgentTimeline> {
    // Try Redis first
    try {
      const cacheKey = this.generateCacheKey('timeline', timeRange);
      const cachedData = await this.redisService.get(cacheKey);
      
      if (cachedData) {
        const timeline = JSON.parse(cachedData);
        console.log(`✅ Timeline retrieved from Redis cache: ${cacheKey}`);
        return timeline;
      }
    } catch (error) {
      console.log('⚠️ Redis timeline read failed, using SQLite fallback:', error.message);
    }

    // Fallback to SQLite
    try {
      const timeline = await this.fallbackStorageService.getAgentTimeline(timeRange);
      console.log('✅ Timeline retrieved from SQLite (fallback)');

      // Try to cache the result (best-effort)
      try {
        const cacheKey = this.generateCacheKey('timeline', timeRange);
        await this.redisService.setEx(cacheKey, 120, JSON.stringify(timeline)); // Cache for 2 minutes
      } catch (cacheError) {
        // Ignore cache write failures
      }

      return timeline;
    } catch (error) {
      console.error('❌ Failed to get timeline from SQLite:', error);
      return { timeline: [] };
    }
  }

  /**
   * Get agent type distribution with cache-first approach
   */
  async getDistribution(): Promise<AgentDistribution> {
    // Try Redis first
    try {
      const cacheKey = 'agent_distribution';
      const cachedData = await this.redisService.get(cacheKey);
      
      if (cachedData) {
        const distribution = JSON.parse(cachedData);
        console.log('✅ Distribution retrieved from Redis cache');
        return distribution;
      }
    } catch (error) {
      console.log('⚠️ Redis distribution read failed, using SQLite fallback:', error.message);
    }

    // Fallback to SQLite
    try {
      const distribution = await this.fallbackStorageService.getAgentDistribution();
      console.log('✅ Distribution retrieved from SQLite (fallback)');

      // Try to cache the result (best-effort)
      try {
        await this.redisService.setEx('agent_distribution', 180, JSON.stringify(distribution)); // Cache for 3 minutes
      } catch (cacheError) {
        // Ignore cache write failures
      }

      return distribution;
    } catch (error) {
      console.error('❌ Failed to get distribution from SQLite:', error);
      return { distribution: [] };
    }
  }

  /**
   * Get tool usage statistics with cache-first approach
   */
  async getToolUsage(): Promise<ToolUsage> {
    // Try Redis first
    try {
      const cacheKey = 'tool_usage';
      const cachedData = await this.redisService.get(cacheKey);
      
      if (cachedData) {
        const toolUsage = JSON.parse(cachedData);
        console.log('✅ Tool usage retrieved from Redis cache');
        return toolUsage;
      }
    } catch (error) {
      console.log('⚠️ Redis tool usage read failed, using SQLite fallback:', error.message);
    }

    // Fallback to SQLite
    try {
      const toolUsage = await this.fallbackStorageService.getToolUsage();
      console.log('✅ Tool usage retrieved from SQLite (fallback)');

      // Try to cache the result (best-effort)
      try {
        await this.redisService.setEx('tool_usage', 300, JSON.stringify(toolUsage)); // Cache for 5 minutes
      } catch (cacheError) {
        // Ignore cache write failures
      }

      return toolUsage;
    } catch (error) {
      console.error('❌ Failed to get tool usage from SQLite:', error);
      return {
        period: new Date().toISOString().split('T')[0],
        tools: [],
        insights: {
          most_used_tool: 'None',
          least_used_tool: 'None',
          total_unique_tools: 0
        }
      };
    }
  }

  /**
   * Mark agent as started (write-through caching)
   */
  async markAgentStarted(agentData: any): Promise<string> {
    // Always write to SQLite first (primary store)
    let agentId: string;
    try {
      agentId = await this.fallbackStorageService.markAgentStarted(agentData);
      console.log(`✅ Agent started in SQLite: ${agentId}`);
    } catch (error) {
      console.error('❌ CRITICAL: Failed to mark agent as started in SQLite:', error);
      throw error;
    }

    // Try to update Redis cache (best-effort)
    try {
      await this.redisService.hSet(`agent:active:${agentId}`, 'agent_id', agentId);
      await this.redisService.hSet(`agent:active:${agentId}`, 'agent_name', agentData.agent_name || 'unknown');
      await this.redisService.hSet(`agent:active:${agentId}`, 'start_time', new Date().toISOString());
      await this.redisService.sAdd('agents:active', agentId);
      await this.redisService.expire(`agent:active:${agentId}`, 300); // 5 minute TTL
    } catch (error) {
      console.log('⚠️ Redis agent started update failed, data safe in SQLite:', error.message);
    }

    return agentId;
  }

  /**
   * Mark agent as completed (write-through caching)
   */
  async markAgentCompleted(agentData: any): Promise<boolean> {
    // Always write to SQLite first (primary store)
    let success: boolean;
    try {
      success = await this.fallbackStorageService.markAgentCompleted(agentData);
      if (!success) {
        console.warn(`⚠️ Failed to mark agent as completed in SQLite: ${agentData.agent_id}`);
      } else {
        console.log(`✅ Agent completed in SQLite: ${agentData.agent_id}`);
      }
    } catch (error) {
      console.error('❌ Failed to mark agent as completed in SQLite:', error);
      success = false;
    }

    // Try to update Redis cache (best-effort)
    try {
      if (agentData.agent_id) {
        await this.redisService.sRem('agents:active', agentData.agent_id);
        await this.redisService.del(`agent:active:${agentData.agent_id}`);
      }
    } catch (error) {
      console.log('⚠️ Redis agent completed update failed, data safe in SQLite:', error.message);
    }

    return success;
  }

  /**
   * Rebuild Redis cache from SQLite when Redis recovers (cache warming)
   */
  async syncCacheFromDatabase(): Promise<void> {
    // Prevent concurrent cache warming
    if (this.cacheWarmupInProgress) {
      console.log('⚠️ Cache warmup already in progress, skipping...');
      return;
    }

    // Rate limit cache warming
    const now = Date.now();
    if (now - this.lastCacheWarmup < this.CACHE_WARMUP_INTERVAL) {
      console.log('⚠️ Cache warmup rate limited, skipping...');
      return;
    }

    this.cacheWarmupInProgress = true;
    this.lastCacheWarmup = now;

    console.log('🔄 Starting cache warmup from SQLite...');

    try {
      // Check Redis health first
      const healthCheck = await this.redisService.healthCheck();
      if (healthCheck.status !== 'healthy') {
        throw new Error(`Redis unhealthy: ${healthCheck.error}`);
      }

      // Warm up key metrics
      const [metrics, timeline, distribution, toolUsage] = await Promise.allSettled([
        this.fallbackStorageService.getAgentMetrics(),
        this.fallbackStorageService.getAgentTimeline(),
        this.fallbackStorageService.getAgentDistribution(),
        this.fallbackStorageService.getToolUsage()
      ]);

      let warmedCount = 0;

      // Cache metrics with different TTLs
      if (metrics.status === 'fulfilled') {
        await this.redisService.setEx(this.generateCacheKey('metrics'), 60, JSON.stringify(metrics.value));
        warmedCount++;
      }

      if (timeline.status === 'fulfilled') {
        await this.redisService.setEx(this.generateCacheKey('timeline'), 120, JSON.stringify(timeline.value));
        warmedCount++;
      }

      if (distribution.status === 'fulfilled') {
        await this.redisService.setEx('agent_distribution', 180, JSON.stringify(distribution.value));
        warmedCount++;
      }

      if (toolUsage.status === 'fulfilled') {
        await this.redisService.setEx('tool_usage', 300, JSON.stringify(toolUsage.value));
        warmedCount++;
      }

      // Warm up active agents
      try {
        const activeAgents = await this.fallbackStorageService.getActiveAgentExecutions();
        for (const agent of activeAgents) {
          await this.redisService.sAdd('agents:active', agent.agent_id);
          await this.redisService.hSet(`agent:active:${agent.agent_id}`, 'agent_name', agent.agent_name);
          await this.redisService.hSet(`agent:active:${agent.agent_id}`, 'start_time', new Date(agent.start_time).toISOString());
          await this.redisService.expire(`agent:active:${agent.agent_id}`, 300);
        }
        if (activeAgents.length > 0) {
          warmedCount++;
          console.log(`✅ Warmed ${activeAgents.length} active agents in cache`);
        }
      } catch (error) {
        console.log('⚠️ Failed to warm active agents cache:', error.message);
      }

      console.log(`✅ Cache warmup completed: ${warmedCount}/4 data types warmed`);

    } catch (error) {
      console.error('❌ Cache warmup failed:', error.message);
    } finally {
      this.cacheWarmupInProgress = false;
    }
  }

  /**
   * Private: Update Redis cache with new event data
   */
  private async updateRedisCache(event: HookEvent): Promise<void> {
    if (!event.payload) return;

    const timestamp = event.timestamp || Date.now();
    const agentType = event.payload.agent_type || 'unknown';
    const tokens = event.payload.token_usage?.total_tokens || 0;
    const duration = event.payload.duration_ms || 0;

    // Update hourly metrics
    const hourKey = new Date(timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    await this.redisService.hIncrBy(`metrics:hourly:${hourKey}:${agentType}`, 'execution_count', 1);

    if (event.payload.status === 'success') {
      await this.redisService.hIncrBy(`metrics:hourly:${hourKey}:${agentType}`, 'success_count', 1);
    } else if (event.payload.status === 'failure') {
      await this.redisService.hIncrBy(`metrics:hourly:${hourKey}:${agentType}`, 'failure_count', 1);
    }

    if (duration > 0) {
      await this.redisService.hIncrBy(`metrics:hourly:${hourKey}:${agentType}`, 'total_duration_ms', duration);
    }

    if (tokens > 0) {
      await this.redisService.hIncrBy(`metrics:hourly:${hourKey}:${agentType}`, 'total_tokens', tokens);
    }

    // Update daily aggregates
    const dayKey = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
    await this.redisService.hIncrBy(`metrics:daily:${dayKey}`, 'total_executions', 1);

    // Update tool usage if available
    if (event.payload.tools_used && Array.isArray(event.payload.tools_used)) {
      for (const tool of event.payload.tools_used) {
        await this.redisService.zIncrBy(`tools:usage:${dayKey}`, 1, tool);
      }
    }

    // Invalidate cache keys that need refresh
    const cacheKeysToInvalidate = [
      this.generateCacheKey('metrics'),
      this.generateCacheKey('timeline'),
      'agent_distribution',
      'tool_usage'
    ];

    for (const cacheKey of cacheKeysToInvalidate) {
      try {
        await this.redisService.del(cacheKey);
      } catch (error) {
        // Ignore cache invalidation errors
      }
    }
  }

  /**
   * Private: Generate cache keys for metrics and timeline
   */
  private generateCacheKey(type: string, timeRange?: TimeRange): string {
    if (!timeRange) {
      return `${type}:default`;
    }
    return `${type}:${timeRange.start}:${timeRange.end}`;
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    sqlite: { status: string; error?: string };
    redis: { status: string; error?: string };
    lastCacheWarmup: number;
  }> {
    const result = {
      status: 'healthy' as const,
      sqlite: { status: 'unknown' },
      redis: { status: 'unknown' },
      lastCacheWarmup: this.lastCacheWarmup
    };

    // Check SQLite health
    try {
      await this.fallbackStorageService.getStorageStats();
      result.sqlite.status = 'healthy';
    } catch (error) {
      result.sqlite.status = 'unhealthy';
      result.sqlite.error = error instanceof Error ? error.message : 'Unknown error';
      result.status = 'unhealthy'; // SQLite failure is critical
    }

    // Check Redis health
    try {
      const redisHealth = await this.redisService.healthCheck();
      result.redis.status = redisHealth.status;
      if (redisHealth.error) {
        result.redis.error = redisHealth.error;
      }
      if (redisHealth.status === 'unhealthy' && result.status === 'healthy') {
        result.status = 'degraded'; // Redis failure is degraded but not critical
      }
    } catch (error) {
      result.redis.status = 'unhealthy';
      result.redis.error = error instanceof Error ? error.message : 'Unknown error';
      if (result.status === 'healthy') {
        result.status = 'degraded';
      }
    }

    return result;
  }

  /**
   * Force cache warming (for testing/recovery)
   */
  async forceCacheWarmup(): Promise<void> {
    this.lastCacheWarmup = 0; // Reset rate limit
    await this.syncCacheFromDatabase();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisAvailable: boolean;
    cacheWarmupInProgress: boolean;
    lastCacheWarmup: number;
    timeSinceLastWarmup: number;
  }> {
    return {
      redisAvailable: this.redisService.isHealthy(),
      cacheWarmupInProgress: this.cacheWarmupInProgress,
      lastCacheWarmup: this.lastCacheWarmup,
      timeSinceLastWarmup: Date.now() - this.lastCacheWarmup
    };
  }
}

// Create and export singleton instance
export const unifiedMetricsService = new UnifiedMetricsService();

export default UnifiedMetricsService;