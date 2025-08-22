import type { AgentStatus } from './types';
import { redisCache } from './services/redisCache';

// Observability logging for Redis operations
function logRedisOperation(operation: string, success: boolean, error?: Error): void {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    success,
    error: error?.message,
    service: 'agents-metrics'
  };
  
  if (!success) {
    console.error('Redis operation failed:', logData);
  } else {
    console.log('Redis operation succeeded:', { operation, service: 'agents-metrics' });
  }
}

// Health check wrapper that propagates errors instead of silently failing
async function executeRedisOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackValue?: T
): Promise<T> {
  try {
    const result = await operation();
    logRedisOperation(operationName, true);
    return result;
  } catch (error) {
    logRedisOperation(operationName, false, error instanceof Error ? error : new Error(`${error}`));
    
    // If fallback provided, use it; otherwise propagate error
    if (fallbackValue !== undefined) {
      console.warn(`Using fallback value for ${operationName}:`, fallbackValue);
      return fallbackValue;
    }
    
    throw error;
  }
}

// Agent metrics interfaces
export interface AgentMetrics {
  active_agents: number;
  executions_today: number;
  success_rate: number;
  avg_duration_ms: number;
  tokens_used_today: number;
  estimated_cost_today: number;
  active_agent_details: ActiveAgent[];
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

// Get current agent metrics
export async function getCurrentMetrics(): Promise<AgentMetrics> {
  const now = new Date();
  const todayKey = `metrics:daily:${now.toISOString().split('T')[0]}`;
  const hourKey = `metrics:hourly:${now.toISOString().slice(0, 13)}`;
  
  try {
    // Get active agents with proper error handling
    const activeAgentIds = await executeRedisOperation(
      () => redisCache.sMembers('agents:active'),
      'sMembers:agents:active',
      [] // Fallback to empty array if Redis fails
    );
    
    const activeAgentDetails: ActiveAgent[] = [];
    
    for (const agentId of activeAgentIds) {
      try {
        const agentData = await executeRedisOperation(
          () => redisCache.get(`agent:active:${agentId}`),
          `get:agent:active:${agentId}`,
          null // Fallback to null if specific agent data fails
        );
        
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
      } catch (error) {
        console.warn(`Failed to get data for agent ${agentId}:`, error instanceof Error ? error.message : error);
        // Continue processing other agents
      }
    }
    
    // Get today's metrics with fallbacks
    const dailyMetrics = await executeRedisOperation(
      () => redisCache.hGetAll(todayKey),
      `hGetAll:${todayKey}`,
      {} // Fallback to empty object
    );
    
    const hourlyMetrics = await executeRedisOperation(
      () => redisCache.hGetAll(hourKey),
      `hGetAll:${hourKey}`,
      {} // Fallback to empty object
    );
    
    // Calculate aggregates with safe parsing
    const executions = parseInt(dailyMetrics.total_executions || '0');
    const successes = parseInt(dailyMetrics.success_count || '0');
    const totalDuration = parseInt(dailyMetrics.total_duration_ms || '0');
    const totalTokens = parseInt(dailyMetrics.total_tokens || '0');
    // Convert cost from centi-cents back to dollars
    const totalCostCents = parseInt(dailyMetrics.total_cost_cents || '0');
    const totalCost = totalCostCents / 10000;
    
    return {
      active_agents: activeAgentDetails.length,
      executions_today: executions,
      success_rate: executions > 0 ? successes / executions : 0,
      avg_duration_ms: executions > 0 ? Math.round(totalDuration / executions) : 0,
      tokens_used_today: totalTokens,
      estimated_cost_today: totalCost,
      active_agent_details: activeAgentDetails
    };
  } catch (error) {
    console.error('Failed to get current metrics from Redis:', error);
    
    // Return default metrics if Redis is completely unavailable
    return {
      active_agents: 0,
      executions_today: 0,
      success_rate: 0,
      avg_duration_ms: 0,
      tokens_used_today: 0,
      estimated_cost_today: 0,
      active_agent_details: []
    };
  }
}

// Get agent timeline data
export async function getAgentTimeline(hours: number = 24): Promise<any> {
  const timeline = [];
  const now = new Date();
  
  try {
    for (let i = 0; i < hours; i++) {
      const hourDate = new Date(now.getTime() - i * 3600000);
      const hourKey = `metrics:hourly:${hourDate.toISOString().slice(0, 13)}`;
      
      try {
        // Aggregate metrics for all agent types in this hour
        const pattern = `${hourKey}:*`;
        const keys = await executeRedisOperation(
          () => redisCache.keys(pattern),
          `keys:${pattern}`,
          [] // Fallback to empty array
        );
        
        let totalExecutions = 0;
        let totalSuccesses = 0;
        let totalDuration = 0;
        let dominantType = '';
        let maxTypeCount = 0;
        
        for (const key of keys) {
          try {
            const metrics = await executeRedisOperation(
              () => redisCache.hGetAll(key),
              `hGetAll:${key}`,
              {} // Fallback to empty object
            );
            
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
          } catch (error) {
            console.warn(`Failed to get metrics for key ${key}:`, error instanceof Error ? error.message : error);
            // Continue processing other keys
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
      } catch (error) {
        console.warn(`Failed to process hour ${i}:`, error instanceof Error ? error.message : error);
        // Continue with next hour
      }
    }
    
    return { timeline: timeline.reverse() };
  } catch (error) {
    console.error('Failed to get agent timeline:', error);
    return { timeline: [] };
  }
}

// Get agent type distribution
export async function getAgentTypeDistribution(): Promise<{ distribution: AgentTypeDistribution[] }> {
  const now = new Date();
  const todayPattern = `metrics:hourly:${now.toISOString().slice(0, 10)}*`;
  
  try {
    const keys = await executeRedisOperation(
      () => redisCache.keys(todayPattern),
      `keys:${todayPattern}`,
      [] // Fallback to empty array
    );
    
    const typeMetrics: Map<string, any> = new Map();
    let totalCount = 0;
    
    // Aggregate by agent type
    for (const key of keys) {
      const agentType = key.split(':').pop();
      if (!agentType) continue;
      
      try {
        const metrics = await executeRedisOperation(
          () => redisCache.hGetAll(key),
          `hGetAll:${key}`,
          {} // Fallback to empty object
        );
        
        const existing = typeMetrics.get(agentType) || {
          count: 0,
          successes: 0,
          duration: 0,
          tools: new Set()
        };
        
        existing.count += parseInt(metrics.execution_count || '0');
        existing.successes += parseInt(metrics.success_count || '0');
        existing.duration += parseInt(metrics.total_duration_ms || '0');
        
        // Get tool usage for this type with error handling
        try {
          const toolsKey = `agent:${agentType}:tools`;
          const tools = await executeRedisOperation(
            () => redisCache.sMembers(toolsKey),
            `sMembers:${toolsKey}`,
            [] // Fallback to empty array
          );
          tools.forEach(tool => existing.tools.add(tool));
        } catch (error) {
          console.warn(`Failed to get tools for agent type ${agentType}:`, error instanceof Error ? error.message : error);
          // Continue without tools data
        }
        
        typeMetrics.set(agentType, existing);
        totalCount += existing.count;
      } catch (error) {
        console.warn(`Failed to process metrics for key ${key}:`, error instanceof Error ? error.message : error);
        // Continue with next key
      }
    }
    
    // Convert to distribution array
    const distribution: AgentTypeDistribution[] = [];
    
    for (const [type, metrics] of typeMetrics.entries()) {
      distribution.push({
        type,
        count: metrics.count,
        percentage: totalCount > 0 ? metrics.count / totalCount : 0,
        avg_duration_ms: metrics.count > 0 ? Math.round(metrics.duration / metrics.count) : 0,
        success_rate: metrics.count > 0 ? metrics.successes / metrics.count : 0,
        common_tools: Array.from(metrics.tools).slice(0, 5)
      });
    }
    
    // Sort by count descending
    distribution.sort((a, b) => b.count - a.count);
    
    return { distribution };
  } catch (error) {
    console.error('Failed to get agent type distribution:', error);
    return { distribution: [] };
  }
}

// Get agent performance history
export async function getAgentPerformance(
  agentName: string,
  days: number = 7
): Promise<AgentPerformance> {
  try {
    // Get performance history with error handling
    const historyKey = `agent:history:${agentName}`;
    const historyData = await executeRedisOperation(
      () => redisCache.lRange(historyKey, 0, -1),
      `lRange:${historyKey}`,
      [] // Fallback to empty array
    );
    
    let executions: any[] = [];
    try {
      executions = historyData.map(data => JSON.parse(data));
    } catch (error) {
      console.warn(`Failed to parse history data for ${agentName}:`, error instanceof Error ? error.message : error);
      executions = []; // Fallback to empty array
    }
    
    const totalExecutions = executions.length;
    const successCount = executions.filter(e => e.status === 'success').length;
    
    // Calculate performance percentiles
    const durations = executions
      .map(e => e.duration_ms)
      .filter(d => typeof d === 'number' && !isNaN(d))
      .sort((a, b) => a - b);
      
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    
    // Calculate token usage with safety checks
    const totalTokens = executions.reduce((sum, e) => {
      const tokens = e.token_usage?.total_tokens || 0;
      return sum + (typeof tokens === 'number' ? tokens : 0);
    }, 0);
    
    const totalCost = executions.reduce((sum, e) => {
      const cost = e.token_usage?.estimated_cost || 0;
      return sum + (typeof cost === 'number' ? cost : 0);
    }, 0);
    
    // Get daily trend
    const dailyTrend = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExecutions = executions.filter(e => 
        e.enhanced_timestamp && e.enhanced_timestamp.startsWith(dateStr)
      );
      
      if (dayExecutions.length > 0) {
        const daySuccesses = dayExecutions.filter(e => e.status === 'success').length;
        const dayDuration = dayExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0);
        
        dailyTrend.push({
          date: dateStr,
          executions: dayExecutions.length,
          avg_duration_ms: Math.round(dayDuration / dayExecutions.length),
          success_rate: daySuccesses / dayExecutions.length
        });
      }
    }
    
    return {
      agent_name: agentName,
      total_executions: totalExecutions,
      success_rate: totalExecutions > 0 ? successCount / totalExecutions : 0,
      performance: {
        p50_duration_ms: durations[p50Index] || 0,
        p95_duration_ms: durations[p95Index] || 0,
        p99_duration_ms: durations[p99Index] || 0,
        min_duration_ms: durations[0] || 0,
        max_duration_ms: durations[durations.length - 1] || 0
      },
      token_usage: {
        avg_tokens: totalExecutions > 0 ? Math.round(totalTokens / totalExecutions) : 0,
        total_tokens: totalTokens,
        estimated_cost: totalCost
      },
      daily_trend: dailyTrend.reverse()
    };
  } catch (error) {
    console.error(`Failed to get performance for agent ${agentName}:`, error);
    
    // Return default performance data
    return {
      agent_name: agentName,
      total_executions: 0,
      success_rate: 0,
      performance: {
        p50_duration_ms: 0,
        p95_duration_ms: 0,
        p99_duration_ms: 0,
        min_duration_ms: 0,
        max_duration_ms: 0
      },
      token_usage: {
        avg_tokens: 0,
        total_tokens: 0,
        estimated_cost: 0
      },
      daily_trend: []
    };
  }
}

// Get tool usage analytics
export async function getToolUsage(period: 'day' | 'week' = 'day'): Promise<any> {
  const now = new Date();
  
  try {
    let toolsKey: string;
    if (period === 'day') {
      toolsKey = `tools:usage:${now.toISOString().split('T')[0]}`;
    } else {
      // Week aggregation would need multiple day keys
      toolsKey = `tools:usage:week:${now.toISOString().split('T')[0]}`;
    }
    
    // Get tool usage sorted set with error handling
    const toolUsage = await executeRedisOperation(
      () => redisCache.zRangeWithScores(toolsKey, 0, -1, { REV: true }),
      `zRangeWithScores:${toolsKey}`,
      [] // Fallback to empty array
    );
    
    const totalUsage = toolUsage.reduce((sum, item) => sum + item.score, 0);
    const tools: ToolUsage[] = [];
    
    for (const item of toolUsage) {
      try {
        // Get agents using this tool with error handling
        const agentsKey = `tool:${item.value}:agents`;
        const agentsUsing = await executeRedisOperation(
          () => redisCache.sMembers(agentsKey),
          `sMembers:${agentsKey}`,
          [] // Fallback to empty array
        );
        
        tools.push({
          name: item.value,
          usage_count: item.score,
          percentage: totalUsage > 0 ? item.score / totalUsage : 0,
          avg_per_execution: 0, // Would need execution count to calculate
          agents_using: agentsUsing.slice(0, 5)
        });
      } catch (error) {
        console.warn(`Failed to get agents for tool ${item.value}:`, error instanceof Error ? error.message : error);
        // Add tool without agents data
        tools.push({
          name: item.value,
          usage_count: item.score,
          percentage: totalUsage > 0 ? item.score / totalUsage : 0,
          avg_per_execution: 0,
          agents_using: []
        });
      }
    }
    
    // Identify high correlation tool pairs
    const correlations: Array<[string, string]> = [];
    // This would need more sophisticated tracking of tool co-occurrence
    
    return {
      period: period === 'day' ? now.toISOString().split('T')[0] : `week of ${now.toISOString().split('T')[0]}`,
      tools,
      insights: {
        most_used_tool: tools[0]?.name || 'None',
        least_used_tool: tools[tools.length - 1]?.name || 'None',
        high_correlation: correlations
      }
    };
  } catch (error) {
    console.error('Failed to get tool usage:', error);
    
    // Return default tool usage data
    return {
      period: period === 'day' ? now.toISOString().split('T')[0] : `week of ${now.toISOString().split('T')[0]}`,
      tools: [],
      insights: {
        most_used_tool: 'None',
        least_used_tool: 'None',
        high_correlation: []
      }
    };
  }
}

// Update agent metrics (called from hooks) - THIS IS THE CRITICAL FUNCTION FOR METRICS
export async function updateAgentMetrics(agentData: any): Promise<void> {
  const now = new Date();
  const hourKey = `metrics:hourly:${now.toISOString().slice(0, 13)}:${agentData.agent_type}`;
  const dailyKey = `metrics:daily:${now.toISOString().split('T')[0]}`;
  
  try {
    // Create and execute multi transaction for atomic operations
    const multi = await redisCache.multi();
    
    // Update hourly metrics - ensure integers for hIncrBy operations
    multi.hIncrBy(hourKey, 'execution_count', 1);
    multi.hIncrBy(hourKey, `${agentData.status}_count`, 1);
    multi.hIncrBy(hourKey, 'total_duration_ms', Math.floor(agentData.duration_ms || 0));
    multi.hIncrBy(hourKey, 'total_tokens', Math.floor(agentData.token_usage?.total_tokens || 0));
    // Use hSet for floating-point values since hIncrBy only works with integers
    multi.hIncrBy(hourKey, 'total_cost_cents', Math.floor((agentData.token_usage?.estimated_cost || 0) * 10000)); // Store as centi-cents
    multi.expire(hourKey, 7 * 24 * 3600); // 7 days TTL
    
    // Update daily rollup - ensure integers for hIncrBy operations
    multi.hIncrBy(dailyKey, 'total_executions', 1);
    multi.hIncrBy(dailyKey, `${agentData.status}_count`, 1);
    multi.hIncrBy(dailyKey, 'total_duration_ms', Math.floor(agentData.duration_ms || 0));
    multi.hIncrBy(dailyKey, 'total_tokens', Math.floor(agentData.token_usage?.total_tokens || 0));
    // Use hSet for floating-point values
    multi.hIncrBy(dailyKey, 'total_cost_cents', Math.floor((agentData.token_usage?.estimated_cost || 0) * 10000)); // Store as centi-cents
    multi.expire(dailyKey, 90 * 24 * 3600); // 90 days TTL
    
    // Execute multi transaction with retry logic
    await executeRedisOperation(
      () => multi.exec(),
      'multi.exec:updateAgentMetrics'
      // No fallback - if metrics update fails, we need to know
    );
    
    console.log(`Successfully updated metrics for agent ${agentData.agent_name} (${agentData.agent_type})`);
    
    // Update tool usage with individual error handling
    if (agentData.tools_used && Array.isArray(agentData.tools_used)) {
      const toolsKey = `tools:usage:${now.toISOString().split('T')[0]}`;
      
      for (const tool of agentData.tools_used) {
        try {
          await executeRedisOperation(
            () => redisCache.zIncrBy(toolsKey, 1, tool),
            `zIncrBy:${toolsKey}:${tool}`
            // No fallback - tool usage is important
          );
          
          // Track which agents use this tool
          await executeRedisOperation(
            () => redisCache.sAdd(`tool:${tool}:agents`, agentData.agent_name),
            `sAdd:tool:${tool}:agents`
            // No fallback - agent tracking is important
          );
          
          await executeRedisOperation(
            () => redisCache.expire(`tool:${tool}:agents`, 7 * 24 * 3600),
            `expire:tool:${tool}:agents`
            // No fallback - TTL is important
          );
        } catch (error) {
          console.warn(`Failed to update tool usage for ${tool}:`, error instanceof Error ? error.message : error);
          // Continue with other tools
        }
      }
    }
    
    // Store in agent history with error handling
    try {
      const historyKey = `agent:history:${agentData.agent_name}`;
      await executeRedisOperation(
        () => redisCache.lPush(historyKey, JSON.stringify(agentData)),
        `lPush:${historyKey}`
      );
      
      await executeRedisOperation(
        () => redisCache.lTrim(historyKey, 0, 99), // Keep last 100
        `lTrim:${historyKey}`
      );
    } catch (error) {
      console.warn(`Failed to store agent history for ${agentData.agent_name}:`, error instanceof Error ? error.message : error);
      // History is nice-to-have, don't fail the whole operation
    }
    
    // Update performance sorted set with error handling
    if (agentData.duration_ms) {
      try {
        const perfKey = `agent:performance:${agentData.agent_name}:duration`;
        await executeRedisOperation(
          () => redisCache.zAdd(perfKey, { score: agentData.duration_ms, value: agentData.agent_id }),
          `zAdd:${perfKey}`
        );
        
        // Keep only last 1000 for percentile calculations
        await executeRedisOperation(
          () => redisCache.zRemRangeByRank(perfKey, 0, -1001),
          `zRemRangeByRank:${perfKey}`
        );
      } catch (error) {
        console.warn(`Failed to update performance data for ${agentData.agent_name}:`, error instanceof Error ? error.message : error);
        // Performance data is nice-to-have, don't fail the whole operation
      }
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`CRITICAL: Failed to update agent metrics for ${agentData.agent_name}:`, errorMsg);
    
    // Log the failure to observability system
    logRedisOperation(`updateAgentMetrics:${agentData.agent_name}`, false, error instanceof Error ? error : new Error(errorMsg));
    
    // Re-throw the error so hooks know the operation failed
    throw error;
  }
}

// Store WebSocket clients reference (will be injected from main server)
let wsClients: Set<any> = new Set();

export function setWebSocketClients(clients: Set<any>) {
  wsClients = clients;
}

// Broadcast terminal status to all WebSocket clients
function broadcastTerminalStatus(message: any) {
  const messageStr = JSON.stringify(message);
  wsClients.forEach(client => {
    try {
      client.send(messageStr);
    } catch (err) {
      wsClients.delete(client);
    }
  });
}

// Get agent type color for consistent styling
export function getAgentTypeColor(agentType: string): string {
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

// Mark agent as started
export async function markAgentStarted(agentData: any): Promise<string> {
  const agentId = `ag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const startData = {
    agent_id: agentId,
    agent_name: agentData.agent_name || 'unknown',
    start_time: new Date().toISOString(),
    task_description: agentData.task_description || '',
    tools_granted: agentData.tools || [],
    context_size: agentData.context_size || 0
  };
  
  try {
    // Store in Redis with TTL using centralized cache
    await executeRedisOperation(
      () => redisCache.setEx(
        `agent:active:${agentId}`,
        300, // 5 minute TTL for active agents
        JSON.stringify(startData)
      ),
      `setEx:agent:active:${agentId}`
    );
    
    // Add to active agents set
    await executeRedisOperation(
      () => redisCache.sAdd('agents:active', agentId),
      `sAdd:agents:active:${agentId}`
    );
    
    // Store in timeline
    await executeRedisOperation(
      () => redisCache.zAdd('agents:timeline', {
        score: Date.now(),
        value: agentId
      }),
      `zAdd:agents:timeline:${agentId}`
    );
    
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
    
    // Store status for terminal display
    await executeRedisOperation(
      () => redisCache.setEx(
        `terminal:status:${agentId}`,
        300, // 5 minute TTL
        JSON.stringify(agentStatus)
      ),
      `setEx:terminal:status:${agentId}`
    );
    
    // Broadcast terminal status update (this doesn't require Redis)
    broadcastTerminalStatus({
      type: 'agent_status_update',
      data: agentStatus
    });
    
    console.log(`Successfully started agent ${agentId} (${agentData.agent_name})`);
    return agentId;
  } catch (error) {
    console.error(`Failed to mark agent ${agentId} as started:`, error instanceof Error ? error.message : error);
    throw error; // Propagate error so hooks know the operation failed
  }
}

// Mark agent as completed
export async function markAgentCompleted(agentId: string, completionData?: any): Promise<void> {
  try {
    // Get current status for final update
    const statusData = await executeRedisOperation(
      () => redisCache.get(`terminal:status:${agentId}`),
      `get:terminal:status:${agentId}`,
      null // No fallback - if we can't get status, skip the update
    );
    
    if (statusData) {
      try {
        const agentStatus: AgentStatus = JSON.parse(statusData);
        
        // Update with completion info
        agentStatus.status = 'complete';
        agentStatus.duration_ms = Date.now() - agentStatus.start_time;
        
        if (completionData) {
          agentStatus.progress = 100;
        }
        
        // Store in recent completions (shorter TTL)
        await executeRedisOperation(
          () => redisCache.setEx(
            `terminal:completed:${agentId}`,
            60, // 1 minute TTL for completed agents
            JSON.stringify(agentStatus)
          ),
          `setEx:terminal:completed:${agentId}`
        );
        
        // Broadcast final status (this doesn't require Redis)
        broadcastTerminalStatus({
          type: 'agent_status_update',
          data: agentStatus
        });
      } catch (parseError) {
        console.warn(`Failed to parse status data for agent ${agentId}:`, parseError instanceof Error ? parseError.message : parseError);
        // Continue with cleanup even if status update fails
      }
    }
    
    // Remove from active agents - use individual operations with error handling
    try {
      await executeRedisOperation(
        () => redisCache.sRem('agents:active', agentId),
        `sRem:agents:active:${agentId}`
      );
    } catch (error) {
      console.warn(`Failed to remove agent ${agentId} from active set:`, error instanceof Error ? error.message : error);
    }
    
    try {
      await executeRedisOperation(
        () => redisCache.del(`agent:active:${agentId}`),
        `del:agent:active:${agentId}`
      );
    } catch (error) {
      console.warn(`Failed to delete active agent data for ${agentId}:`, error instanceof Error ? error.message : error);
    }
    
    try {
      await executeRedisOperation(
        () => redisCache.del(`terminal:status:${agentId}`),
        `del:terminal:status:${agentId}`
      );
    } catch (error) {
      console.warn(`Failed to delete terminal status for ${agentId}:`, error instanceof Error ? error.message : error);
    }
    
    console.log(`Successfully completed agent ${agentId}`);
  } catch (error) {
    console.error(`Failed to mark agent ${agentId} as completed:`, error instanceof Error ? error.message : error);
    // Don't throw here - completion cleanup should be best-effort
  }
}

// Get current terminal status snapshot
export async function getTerminalStatus(): Promise<{
  active_agents: AgentStatus[];
  recent_completions: AgentStatus[];
  timestamp: number;
}> {
  try {
    // Get active agents
    const activeKeys = await executeRedisOperation(
      () => redisCache.keys('terminal:status:*'),
      'keys:terminal:status:*',
      [] // Fallback to empty array
    );
    
    const activeAgents: AgentStatus[] = [];
    
    for (const key of activeKeys) {
      try {
        const data = await executeRedisOperation(
          () => redisCache.get(key),
          `get:${key}`,
          null // Fallback to null
        );
        
        if (data) {
          try {
            activeAgents.push(JSON.parse(data));
          } catch (parseError) {
            console.warn(`Failed to parse active agent data for key ${key}:`, parseError instanceof Error ? parseError.message : parseError);
          }
        }
      } catch (error) {
        console.warn(`Failed to get active agent data for key ${key}:`, error instanceof Error ? error.message : error);
        // Continue with other keys
      }
    }
    
    // Get recent completions
    const completedKeys = await executeRedisOperation(
      () => redisCache.keys('terminal:completed:*'),
      'keys:terminal:completed:*',
      [] // Fallback to empty array
    );
    
    const recentCompletions: AgentStatus[] = [];
    
    for (const key of completedKeys) {
      try {
        const data = await executeRedisOperation(
          () => redisCache.get(key),
          `get:${key}`,
          null // Fallback to null
        );
        
        if (data) {
          try {
            recentCompletions.push(JSON.parse(data));
          } catch (parseError) {
            console.warn(`Failed to parse completed agent data for key ${key}:`, parseError instanceof Error ? parseError.message : parseError);
          }
        }
      } catch (error) {
        console.warn(`Failed to get completed agent data for key ${key}:`, error instanceof Error ? error.message : error);
        // Continue with other keys
      }
    }
    
    // Sort by start time
    activeAgents.sort((a, b) => b.start_time - a.start_time);
    recentCompletions.sort((a, b) => b.start_time - a.start_time);
    
    return {
      active_agents: activeAgents,
      recent_completions: recentCompletions.slice(0, 5), // Keep only last 5
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to get terminal status:', error);
    
    // Return default status if Redis is completely unavailable
    return {
      active_agents: [],
      recent_completions: [],
      timestamp: Date.now()
    };
  }
}