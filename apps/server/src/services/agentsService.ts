import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import type { AgentStatus } from '../types';
import { redisConnectivity } from './redisConnectivityService';
import { fallbackStorage, type AgentExecution } from './fallbackStorageService';

// Agent metrics interfaces
export interface AgentMetrics {
  active_agents: number;
  executions_today: number;
  success_rate: number;
  avg_duration_ms: number;
  tokens_used_today: number;
  estimated_cost_today: number;
  active_agent_details: ActiveAgent[];
  fallback_mode: boolean;
}

export interface ActiveAgent {
  agent_id: string;
  agent_name: string;
  status: 'running' | 'completing';
  duration_so_far_ms: number;
  progress?: number;
}

export interface AgentTypeDistribution {
  type: string;
  count: number;
  percentage: number;
  avg_duration_ms: number;
  success_rate: number;
  common_tools: string[];
}

export interface AgentPerformance {
  agent_name: string;
  total_executions: number;
  success_rate: number;
  performance: {
    p50_duration_ms: number;
    p95_duration_ms: number;
    p99_duration_ms: number;
    min_duration_ms: number;
    max_duration_ms: number;
  };
  token_usage: {
    avg_tokens: number;
    total_tokens: number;
    estimated_cost: number;
  };
  daily_trend: Array<{
    date: string;
    executions: number;
    avg_duration_ms: number;
    success_rate: number;
  }>;
}

export interface ToolUsage {
  name: string;
  usage_count: number;
  percentage: number;
  avg_per_execution: number;
  agents_using: string[];
}

class AgentsService {
  private wsClients: Set<any> = new Set();

  constructor() {
    // Initialize fallback storage
    fallbackStorage.initialize().catch(err => {
      console.error('Failed to initialize fallback storage:', err);
    });
  }

  setWebSocketClients(clients: Set<any>) {
    this.wsClients = clients;
  }

  private broadcastTerminalStatus(message: any) {
    const messageStr = JSON.stringify(message);
    this.wsClients.forEach(client => {
      try {
        client.send(messageStr);
      } catch (err) {
        this.wsClients.delete(client);
      }
    });
  }

  // Get current agent metrics with fallback support
  async getCurrentMetrics(): Promise<AgentMetrics> {
    return await redisConnectivity.executeWithFallback(
      async () => this.getCurrentMetricsFromRedis(),
      async () => this.getCurrentMetricsFromFallback()
    );
  }

  private async getCurrentMetricsFromRedis(): Promise<AgentMetrics> {
    const redis = redisConnectivity.getClient();
    if (!redis) throw new Error('Redis client not available');

    const now = new Date();
    const todayKey = `metrics:daily:${now.toISOString().split('T')[0]}`;
    
    // Get active agents
    const activeAgentIds = await redis.sMembers('agents:active');
    const activeAgentDetails: ActiveAgent[] = [];
    
    for (const agentId of activeAgentIds) {
      const agentData = await redis.get(`agent:active:${agentId}`);
      if (agentData) {
        const agent = JSON.parse(agentData);
        const startTime = new Date(agent.start_time).getTime();
        const duration = Date.now() - startTime;
        
        activeAgentDetails.push({
          agent_id: agentId,
          agent_name: agent.agent_name,
          status: 'running',
          duration_so_far_ms: duration,
          progress: agent.progress
        });
      }
    }
    
    // Get today's metrics
    const dailyMetrics = await redis.hGetAll(todayKey);
    
    // Calculate aggregates
    const executions = parseInt(dailyMetrics.total_executions || '0');
    const successes = parseInt(dailyMetrics.success_count || '0');
    const totalDuration = parseInt(dailyMetrics.total_duration_ms || '0');
    const totalTokens = parseInt(dailyMetrics.total_tokens || '0');
    const totalCost = parseFloat(dailyMetrics.total_cost || '0');
    
    return {
      active_agents: activeAgentDetails.length,
      executions_today: executions,
      success_rate: executions > 0 ? successes / executions : 0,
      avg_duration_ms: executions > 0 ? Math.round(totalDuration / executions) : 0,
      tokens_used_today: totalTokens,
      estimated_cost_today: totalCost,
      active_agent_details: activeAgentDetails,
      fallback_mode: false
    };
  }

  private async getCurrentMetricsFromFallback(): Promise<AgentMetrics> {
    const activeExecutions = await fallbackStorage.getActiveAgentExecutions();
    
    // Convert to ActiveAgent format
    const activeAgentDetails: ActiveAgent[] = activeExecutions.map(exec => ({
      agent_id: exec.agent_id,
      agent_name: exec.agent_name,
      status: 'running' as const,
      duration_so_far_ms: Date.now() - exec.start_time,
      progress: exec.progress
    }));

    // Get today's aggregated metrics from fallback storage
    // For now, return basic metrics - could be enhanced with more complex queries
    return {
      active_agents: activeAgentDetails.length,
      executions_today: 0, // Would need to implement daily aggregation query
      success_rate: 0,
      avg_duration_ms: 0,
      tokens_used_today: 0,
      estimated_cost_today: 0,
      active_agent_details: activeAgentDetails,
      fallback_mode: true
    };
  }

  // Mark agent as started with fallback support
  async markAgentStarted(agentData: any): Promise<string> {
    const agentId = `ag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const agentExecution: AgentExecution = {
      agent_id: agentId,
      agent_name: agentData.agent_name || 'unknown',
      agent_type: agentData.agent_type || 'generic',
      status: 'active',
      start_time: Date.now(),
      session_id: agentData.session_id || '',
      task_description: agentData.task_description || '',
      tools_granted: agentData.tools || [],
      source_app: agentData.source_app || '',
      progress: 0
    };

    // Use fallback storage (which handles Redis sync internally)
    await fallbackStorage.insertAgentExecution(agentExecution);

    // Create terminal status entry
    const agentStatus: AgentStatus = {
      agent_id: agentId,
      agent_name: agentData.agent_name || 'unknown',
      agent_type: agentData.agent_type || 'generic',
      status: 'active',
      task_description: agentData.task_description || '',
      start_time: Date.now(),
      session_id: agentData.session_id || '',
      source_app: agentData.source_app || ''
    };

    // Store terminal status
    await fallbackStorage.setTerminalStatus(agentStatus);

    // Broadcast terminal status update
    this.broadcastTerminalStatus({
      type: 'agent_status_update',
      data: agentStatus
    });

    return agentId;
  }

  // Mark agent as completed with fallback support
  async markAgentCompleted(agentId: string, completionData?: any): Promise<void> {
    const execution = await fallbackStorage.getAgentExecution(agentId);
    if (!execution) {
      console.warn(`Agent execution ${agentId} not found for completion`);
      return;
    }

    const endTime = Date.now();
    const updates: Partial<AgentExecution> = {
      status: 'complete',
      end_time: endTime,
      duration_ms: endTime - execution.start_time,
      progress: 100
    };

    if (completionData) {
      updates.token_usage = completionData.token_usage;
      updates.performance_metrics = completionData.performance_metrics;
    }

    await fallbackStorage.updateAgentExecution(agentId, updates);

    // Update terminal status
    const agentStatus: AgentStatus = {
      agent_id: agentId,
      agent_name: execution.agent_name,
      agent_type: execution.agent_type,
      status: 'complete',
      task_description: execution.task_description || '',
      start_time: execution.start_time,
      duration_ms: updates.duration_ms,
      session_id: execution.session_id || '',
      source_app: execution.source_app || '',
      progress: 100
    };

    await fallbackStorage.setTerminalStatus(agentStatus);

    // Broadcast final status
    this.broadcastTerminalStatus({
      type: 'agent_status_update',
      data: agentStatus
    });
  }

  // Get current terminal status with fallback support
  async getTerminalStatus(): Promise<{
    active_agents: AgentStatus[];
    recent_completions: AgentStatus[];
    timestamp: number;
  }> {
    return await redisConnectivity.executeWithFallback(
      async () => this.getTerminalStatusFromRedis(),
      async () => this.getTerminalStatusFromFallback()
    );
  }

  private async getTerminalStatusFromRedis(): Promise<{
    active_agents: AgentStatus[];
    recent_completions: AgentStatus[];
    timestamp: number;
  }> {
    const redis = redisConnectivity.getClient();
    if (!redis) throw new Error('Redis client not available');
    
    // Get active agents
    const activeKeys = await redis.keys('terminal:status:*');
    const activeAgents: AgentStatus[] = [];
    
    for (const key of activeKeys) {
      const data = await redis.get(key);
      if (data) {
        activeAgents.push(JSON.parse(data));
      }
    }
    
    // Get recent completions
    const completedKeys = await redis.keys('terminal:completed:*');
    const recentCompletions: AgentStatus[] = [];
    
    for (const key of completedKeys) {
      const data = await redis.get(key);
      if (data) {
        recentCompletions.push(JSON.parse(data));
      }
    }
    
    // Sort by start time
    activeAgents.sort((a, b) => b.start_time - a.start_time);
    recentCompletions.sort((a, b) => b.start_time - a.start_time);
    
    return {
      active_agents: activeAgents,
      recent_completions: recentCompletions.slice(0, 5),
      timestamp: Date.now()
    };
  }

  private async getTerminalStatusFromFallback(): Promise<{
    active_agents: AgentStatus[];
    recent_completions: AgentStatus[];
    timestamp: number;
  }> {
    return await fallbackStorage.getTerminalStatus();
  }

  // Update agent metrics with fallback support
  async updateAgentMetrics(agentData: any): Promise<void> {
    // Always update fallback storage (which handles Redis sync)
    await fallbackStorage.updateMetrics(agentData);
  }

  // Get agent type color for consistent styling
  getAgentTypeColor(agentType: string): string {
    const colorMap: Record<string, string> = {
      'analyzer': '#3B82F6',      // blue
      'debugger': '#EF4444',      // red
      'builder': '#22C55E',       // green
      'tester': '#A855F7',        // purple
      'reviewer': '#F59E0B',      // amber
      'optimizer': '#EC4899',     // pink
      'security': '#DC2626',      // red-600
      'writer': '#10B981',        // emerald
      'deployer': '#8B5CF6',      // violet
      'data-processor': '#06B6D4', // cyan
      'monitor': '#84CC16',       // lime
      'configurator': '#F97316',  // orange
      'context': '#6366F1',       // indigo
      'collector': '#14B8A6',     // teal
      'storage': '#059669',       // emerald-600
      'searcher': '#7C3AED',      // violet-600
      'api-handler': '#0891B2',   // cyan-600
      'integrator': '#DB2777',    // pink-600
      'ui-developer': '#2563EB',  // blue-600
      'designer': '#BE185D',      // pink-700
      'ml-engineer': '#7C2D12',   // orange-900
      'predictor': '#5B21B6',     // violet-800
      'database-admin': '#0F766E', // teal-700
      'data-manager': '#166534',  // green-800
      'translator': '#92400E',    // amber-700
      'generator': '#1E40AF',     // blue-700
      'linter': '#9333EA',        // purple-600
      'generic': '#6B7280'        // gray-500 - fallback
    };
    return colorMap[agentType] || colorMap['generic'];
  }

  // Additional methods would be implemented similarly with fallback support...
  
  // Get agent timeline data with fallback support
  async getAgentTimeline(hours: number = 24): Promise<any> {
    return await redisConnectivity.executeWithFallback(
      async () => this.getAgentTimelineFromRedis(hours),
      async () => this.getAgentTimelineFromFallback(hours)
    );
  }

  private async getAgentTimelineFromRedis(hours: number): Promise<any> {
    const redis = redisConnectivity.getClient();
    if (!redis) throw new Error('Redis client not available');

    const timeline = [];
    const now = new Date();
    
    for (let i = 0; i < hours; i++) {
      const hourDate = new Date(now.getTime() - i * 3600000);
      const hourKey = `metrics:hourly:${hourDate.toISOString().slice(0, 13)}`;
      
      // Aggregate metrics for all agent types in this hour
      const pattern = `${hourKey}:*`;
      const keys = await redis.keys(pattern);
      
      let totalExecutions = 0;
      let totalSuccesses = 0;
      let totalDuration = 0;
      let dominantType = '';
      let maxTypeCount = 0;
      
      for (const key of keys) {
        const metrics = await redis.hGetAll(key);
        const executions = parseInt(metrics.execution_count || '0');
        const successes = parseInt(metrics.success_count || '0');
        const duration = parseInt(metrics.total_duration_ms || '0');
        
        totalExecutions += executions;
        totalSuccesses += successes;
        totalDuration += duration;
        
        // Track dominant agent type
        const agentType = key.split(':').pop();
        if (executions > maxTypeCount) {
          maxTypeCount = executions;
          dominantType = agentType || '';
        }
      }
      
      if (totalExecutions > 0) {
        timeline.push({
          timestamp: hourDate.toISOString(),
          executions: totalExecutions,
          avg_duration_ms: Math.round(totalDuration / totalExecutions),
          success_rate: totalSuccesses / totalExecutions,
          dominant_agent_type: dominantType
        });
      }
    }
    
    return { timeline: timeline.reverse() };
  }

  private async getAgentTimelineFromFallback(hours: number): Promise<any> {
    // For fallback mode, return empty timeline for now
    // Could be enhanced with local aggregation queries
    return { timeline: [] };
  }

  // Check if service is running in fallback mode
  async isFallbackMode(): Promise<boolean> {
    return !redisConnectivity.isConnected();
  }

  // Get service status
  async getServiceStatus(): Promise<{
    redis_connected: boolean;
    fallback_enabled: boolean;
    fallback_storage_stats?: any;
    redis_status?: any;
  }> {
    const redisConnected = redisConnectivity.isConnected();
    const fallbackEnabled = fallbackStorage.isEnabled();
    
    const status: any = {
      redis_connected: redisConnected,
      fallback_enabled: fallbackEnabled
    };

    if (fallbackEnabled) {
      status.fallback_storage_stats = await fallbackStorage.getStorageStats();
    }

    if (redisConnected) {
      status.redis_status = await redisConnectivity.getConnectionInfo();
    }

    return status;
  }
}

// Create singleton instance
export const agentsService = new AgentsService();

export default AgentsService;