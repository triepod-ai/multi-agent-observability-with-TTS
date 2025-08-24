import { Database } from 'bun:sqlite';
import type { HookEvent } from '../types';

export interface EnhancedHookContext {
  sourceApps: string[];
  activeSessions: string[];
  sessionDepthRange: { min: number; max: number };
  totalExecutions: number;
  avgDuration: number;
  medianDuration: number;
  p95Duration: number;
  totalTokens: number;
  avgTokensPerExecution: number;
  totalCost: number;
  executionEnvironments?: string[];
  userContext?: string[];
  toolUsage: Array<{
    name: string;
    count: number;
    successRate: number;
    commonParams: string[];
    avgDuration: number;
  }>;
  agentActivity: Array<{
    id: string;
    name: string;
    type: string;
    executions: number;
    avgDuration: number;
    totalTokens: number;
  }>;
  patterns: Array<{
    id: string;
    icon: string;
    description: string;
    frequency: string;
  }>;
  recentErrors: Array<{
    id: string;
    timestamp: number;
    source: string;
    message: string;
  }>;
  sessionContext?: {
    parentSessions?: number;
    childSessions?: number;
    delegationPatterns?: Array<{
      type: string;
      count: number;
    }>;
  };
  systemContext?: {
    hostname?: string;
    platform?: string;
    nodeVersion?: string;
    uptime?: number;
  };
}

export interface PerformanceMetrics {
  totalExecutions: number;
  avgDuration: number;
  medianDuration: number;
  p95Duration: number;
  totalTokens: number;
  avgTokensPerExecution: number;
  totalCost?: number;
  memoryUsage?: {
    avg: number;
    peak: number;
  };
  topConsumers?: Array<{
    id: string;
    name: string;
    type: string;
    usage: string;
    percentage: number;
  }>;
}

// Get event types that correspond to a specific hook type
function getEventTypesForHook(hookType: string): string[] {
  const hookMappings: Record<string, string[]> = {
    'session_start': ['SessionStart'],
    'user_prompt_submit': ['UserPromptSubmit'],
    'pre_tool_use': ['PreToolUse'],
    'post_tool_use': ['PostToolUse'],
    'subagent_stop': ['SubagentStop'],
    'stop': ['Stop'],
    'notification': ['Notification'],
    'precompact': ['PreCompact']
  };
  
  return hookMappings[hookType] || [];
}

// Calculate enhanced context for a specific hook
export function calculateEnhancedHookContext(
  db: Database, 
  hookType: string, 
  timeWindow: number = 24 * 60 * 60 * 1000
): EnhancedHookContext {
  const now = Date.now();
  const since = now - timeWindow;
  const eventTypes = getEventTypesForHook(hookType);
  
  // Get hook-specific events
  const hookEvents = db.prepare(`
    SELECT * FROM events 
    WHERE hook_event_type IN (${eventTypes.map(() => '?').join(',')}) 
    AND timestamp > ?
    ORDER BY timestamp DESC
  `).all(...eventTypes, since) as HookEvent[];
  
  const sourceApps = [...new Set(hookEvents.map(e => e.source_app))];
  const activeSessions = [...new Set(hookEvents.map(e => e.session_id))];
  
  // Calculate session depth range
  const depths = hookEvents
    .map(e => e.session_depth)
    .filter(d => d !== undefined && d !== null) as number[];
  const sessionDepthRange = depths.length > 0 ? {
    min: Math.min(...depths),
    max: Math.max(...depths)
  } : { min: 0, max: 0 };
  
  // Calculate duration statistics
  const durations = hookEvents
    .map(e => e.duration)
    .filter(d => d !== undefined && d !== null) as number[];
  durations.sort((a, b) => a - b);
  
  const avgDuration = durations.length > 0 ? 
    durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  const medianDuration = durations.length > 0 ? 
    durations[Math.floor(durations.length / 2)] : 0;
  const p95Duration = durations.length > 0 ? 
    durations[Math.floor(durations.length * 0.95)] : 0;
  
  // Calculate token statistics
  const tokens = hookEvents.map(e => 
    (e.payload?.tokens || e.payload?.token_count || 0) as number
  );
  const totalTokens = tokens.reduce((sum, t) => sum + t, 0);
  const avgTokensPerExecution = hookEvents.length > 0 ? totalTokens / hookEvents.length : 0;
  
  // Estimate cost (rough calculation)
  const totalCost = totalTokens * 0.00002; // Approximate cost per token
  
  // Extract execution environments and user context
  const executionEnvironments = [...new Set(hookEvents
    .map(e => e.payload?.metadata?.environment)
    .filter(Boolean) as string[])];
  const userContext = [...new Set(hookEvents
    .map(e => e.payload?.metadata?.user)
    .filter(Boolean) as string[])];
  
  // Analyze tool usage
  const toolUsage = analyzeToolUsage(hookEvents);
  
  // Analyze agent activity
  const agentActivity = analyzeAgentActivity(hookEvents);
  
  // Identify patterns
  const patterns = identifyPatterns(hookEvents);
  
  // Extract recent errors
  const recentErrors = extractRecentErrors(hookEvents);
  
  // Session context analysis
  const sessionContext = analyzeSessionContext(hookEvents);
  
  // System context (basic information)
  const systemContext = {
    hostname: process.env.HOSTNAME,
    platform: process.platform,
    nodeVersion: process.version,
    uptime: process.uptime()
  };
  
  return {
    sourceApps,
    activeSessions,
    sessionDepthRange,
    totalExecutions: hookEvents.length,
    avgDuration,
    medianDuration,
    p95Duration,
    totalTokens,
    avgTokensPerExecution,
    totalCost,
    executionEnvironments,
    userContext,
    toolUsage,
    agentActivity,
    patterns,
    recentErrors,
    sessionContext,
    systemContext
  };
}

// Calculate performance metrics for a specific hook
export function calculatePerformanceMetrics(
  db: Database, 
  hookType: string,
  timeWindow: number = 24 * 60 * 60 * 1000
): PerformanceMetrics {
  const now = Date.now();
  const since = now - timeWindow;
  const eventTypes = getEventTypesForHook(hookType);
  
  const hookEvents = db.prepare(`
    SELECT * FROM events 
    WHERE hook_event_type IN (${eventTypes.map(() => '?').join(',')}) 
    AND timestamp > ?
    ORDER BY timestamp DESC
  `).all(...eventTypes, since) as HookEvent[];
  
  // Duration analysis
  const durations = hookEvents
    .map(e => e.duration)
    .filter(d => d !== undefined && d !== null) as number[];
  durations.sort((a, b) => a - b);
  
  const avgDuration = durations.length > 0 ? 
    durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  const medianDuration = durations.length > 0 ? 
    durations[Math.floor(durations.length / 2)] : 0;
  const p95Duration = durations.length > 0 ? 
    durations[Math.floor(durations.length * 0.95)] : 0;
  
  // Token analysis
  const tokens = hookEvents.map(e => 
    (e.payload?.tokens || e.payload?.token_count || 0) as number
  );
  const totalTokens = tokens.reduce((sum, t) => sum + t, 0);
  const avgTokensPerExecution = hookEvents.length > 0 ? totalTokens / hookEvents.length : 0;
  
  // Memory analysis (if available)
  const memoryValues = hookEvents
    .map(e => e.payload?.memory_usage)
    .filter(m => m !== undefined && m !== null) as number[];
  
  const memoryUsage = memoryValues.length > 0 ? {
    avg: memoryValues.reduce((sum, m) => sum + m, 0) / memoryValues.length,
    peak: Math.max(...memoryValues)
  } : undefined;
  
  // Top consumers analysis
  const topConsumers = analyzeTopConsumers(hookEvents);
  
  return {
    totalExecutions: hookEvents.length,
    avgDuration,
    medianDuration,
    p95Duration,
    totalTokens,
    avgTokensPerExecution,
    totalCost: totalTokens * 0.00002,
    memoryUsage,
    topConsumers
  };
}

// Get recent events for a specific hook
export function getRecentHookEvents(
  db: Database,
  hookType: string,
  limit: number = 50,
  timeWindow: number = 24 * 60 * 60 * 1000
): HookEvent[] {
  const now = Date.now();
  const since = now - timeWindow;
  const eventTypes = getEventTypesForHook(hookType);
  
  return db.prepare(`
    SELECT * FROM events 
    WHERE hook_event_type IN (${eventTypes.map(() => '?').join(',')})
    AND timestamp > ?
    ORDER BY timestamp DESC 
    LIMIT ?
  `).all(...eventTypes, since, limit) as HookEvent[];
}

// Helper functions
function analyzeToolUsage(events: HookEvent[]) {
  const toolStats = new Map();
  
  events.forEach(event => {
    const toolName = event.payload?.tool_name;
    if (toolName) {
      const existing = toolStats.get(toolName) || {
        name: toolName,
        count: 0,
        successes: 0,
        durations: [],
        params: new Set()
      };
      
      existing.count++;
      if (!event.error) existing.successes++;
      if (event.duration) existing.durations.push(event.duration);
      
      // Collect common parameters
      if (event.payload?.tool_input && typeof event.payload.tool_input === 'object') {
        Object.keys(event.payload.tool_input).forEach(key => {
          existing.params.add(key);
        });
      }
      
      toolStats.set(toolName, existing);
    }
  });
  
  return Array.from(toolStats.values()).map(tool => ({
    name: tool.name,
    count: tool.count,
    successRate: tool.count > 0 ? Math.round((tool.successes / tool.count) * 100) : 0,
    commonParams: Array.from(tool.params).slice(0, 5),
    avgDuration: tool.durations.length > 0 ? 
      tool.durations.reduce((sum, d) => sum + d, 0) / tool.durations.length : 0
  })).sort((a, b) => b.count - a.count);
}

function analyzeAgentActivity(events: HookEvent[]) {
  const agentStats = new Map();
  
  events.forEach(event => {
    const agentName = event.payload?.agent_name;
    const agentType = event.payload?.agent_type;
    
    if (agentName || agentType) {
      const key = `${agentName || 'unknown'}_${agentType || 'unknown'}`;
      const existing = agentStats.get(key) || {
        id: key,
        name: agentName || 'Unknown Agent',
        type: agentType || 'unknown',
        executions: 0,
        durations: [],
        tokens: []
      };
      
      existing.executions++;
      if (event.duration) existing.durations.push(event.duration);
      
      const tokenCount = event.payload?.tokens || event.payload?.token_count || 0;
      if (tokenCount) existing.tokens.push(tokenCount);
      
      agentStats.set(key, existing);
    }
  });
  
  return Array.from(agentStats.values()).map(agent => ({
    id: agent.id,
    name: agent.name,
    type: agent.type,
    executions: agent.executions,
    avgDuration: agent.durations.length > 0 ? 
      agent.durations.reduce((sum, d) => sum + d, 0) / agent.durations.length : 0,
    totalTokens: agent.tokens.reduce((sum, t) => sum + t, 0)
  })).sort((a, b) => b.executions - a.executions);
}

function identifyPatterns(events: HookEvent[]) {
  const patterns = [];
  
  // High frequency pattern
  if (events.length > 50) {
    patterns.push({
      id: 'high-frequency',
      icon: '🔥',
      description: 'High activity volume detected',
      frequency: `${events.length} executions in 24h`
    });
  }
  
  // Tool usage patterns
  const toolUsage = analyzeToolUsage(events);
  if (toolUsage.length > 0) {
    const topTool = toolUsage[0];
    patterns.push({
      id: 'top-tool',
      icon: '🔧',
      description: `Primary tool usage: ${topTool.name}`,
      frequency: `${topTool.count} uses (${topTool.successRate}% success)`
    });
  }
  
  // Agent patterns
  const agentActivity = analyzeAgentActivity(events);
  if (agentActivity.length > 0) {
    patterns.push({
      id: 'agent-activity',
      icon: '🤖',
      description: `Active agents: ${agentActivity.length} different types`,
      frequency: `${agentActivity[0].name} is most active`
    });
  }
  
  // Error patterns
  const errors = events.filter(e => e.error);
  if (errors.length > 0) {
    patterns.push({
      id: 'error-pattern',
      icon: '⚠️',
      description: 'Error occurrences detected',
      frequency: `${errors.length} errors (${Math.round((errors.length / events.length) * 100)}% rate)`
    });
  }
  
  return patterns;
}

function extractRecentErrors(events: HookEvent[]) {
  return events
    .filter(e => e.error && typeof e.error === 'string')
    .slice(0, 10)
    .map((e, index) => ({
      id: `error-${index}`,
      timestamp: e.timestamp || Date.now(),
      source: e.source_app,
      message: e.error as string
    }));
}

function analyzeSessionContext(events: HookEvent[]) {
  const parentSessions = events.filter(e => e.parent_session_id).length;
  const childSessions = events.filter(e => e.session_depth && e.session_depth > 1).length;
  
  const delegationTypes = new Map();
  events.forEach(e => {
    const delegationType = e.payload?.delegation_type;
    if (delegationType) {
      delegationTypes.set(delegationType, (delegationTypes.get(delegationType) || 0) + 1);
    }
  });
  
  const delegationPatterns = Array.from(delegationTypes.entries()).map(([type, count]) => ({
    type,
    count
  }));
  
  return {
    parentSessions,
    childSessions,
    delegationPatterns
  };
}

function analyzeTopConsumers(events: HookEvent[]) {
  const consumers = new Map();
  
  events.forEach(event => {
    const key = event.source_app;
    const existing = consumers.get(key) || {
      id: key,
      name: key,
      type: 'application',
      tokens: 0,
      duration: 0,
      count: 0
    };
    
    existing.tokens += (event.payload?.tokens || event.payload?.token_count || 0);
    existing.duration += (event.duration || 0);
    existing.count++;
    
    consumers.set(key, existing);
  });
  
  const totalTokens = Array.from(consumers.values()).reduce((sum, c) => sum + c.tokens, 0);
  
  return Array.from(consumers.values())
    .map(consumer => ({
      id: consumer.id,
      name: consumer.name,
      type: consumer.type,
      usage: `${Math.round(consumer.tokens).toLocaleString()} tokens`,
      percentage: totalTokens > 0 ? Math.round((consumer.tokens / totalTokens) * 100) : 0
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 10);
}