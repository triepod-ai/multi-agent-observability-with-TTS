export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  parent_session_id?: string;
  session_depth?: number;
  wave_id?: string;
  delegation_context?: Record<string, any>;
  correlation_id?: string;
  hook_event_type: string;
  payload: Record<string, any> & {
    tool_name?: string;
    tool_input?: Record<string, any>;
    tool_output?: Record<string, any>;
    metadata?: {
      user?: string;
      environment?: string;
      hostname?: string;
      agent_type?: string;
      [key: string]: any;
    };
    token_count?: number;
    tokens?: number;
    memory_usage?: number;
    agent_type?: string;
    agent_name?: string;
    subagent_type?: string;
    delegation_type?: string;
    [key: string]: any;
  };
  chat?: any[];
  summary?: string;
  timestamp?: number;
  error?: string | boolean;
  duration?: number;
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}

export interface ActiveFilter {
  id: string;
  type: 'sourceApps' | 'sessionIds' | 'eventTypes' | 'toolNames' | 'search';
  values: string[];
  label: string;
  icon: string;
  count?: number;
}

export interface FilterState {
  sourceApps: string[];
  sessionIds: string[];
  eventTypes: string[];
  toolNames: string[];
  search?: string;
}

export interface FilterNotification {
  isVisible: boolean;
  totalEvents: number;
  filteredEvents: number;
  totalApplications: number;
  filteredApplications: number;
  totalSessions: number;
  filteredSessions: number;
  activeFilters: ActiveFilter[];
}

export interface WebSocketMessage {
  type: 'initial' | 'event' | 'terminal_status' | 'agent_status_update' | 'hook_status_update' | 'ping' | 'pong' | 'metrics' | 'timeline' | 'types' | 'tools';
  data: HookEvent | HookEvent[] | TerminalStatusData | AgentStatus | HookCoverageData | any;
  timestamp?: number;
}

// Terminal Status interfaces
export interface AgentStatus {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  status: 'pending' | 'active' | 'completing' | 'complete' | 'failed';
  task_description?: string;
  progress?: number;
  start_time: number;
  duration_ms?: number;
  session_id: string;
  source_app: string;
}

export interface TerminalStatusData {
  active_agents: AgentStatus[];
  recent_completions: AgentStatus[];
  timestamp: number;
}

export type TimeRange = '1m' | '3m' | '5m';

export interface ChartDataPoint {
  timestamp: number;
  count: number;
  eventTypes: Record<string, number>; // event type -> count
  sessions: Record<string, number>; // session id -> count
}

export interface ChartConfig {
  maxDataPoints: number;
  animationDuration: number;
  barWidth: number;
  barGap: number;
  colors: {
    primary: string;
    glow: string;
    axis: string;
    text: string;
  };
}

// Agent Metrics Interfaces
export interface AgentMetrics {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  agentTypes: number;
  activeAgents: number;
  totalTokensUsed: number;
  avgTokensPerAgent: number;
  toolsUsed: number;
}

export interface AgentTimelineDataPoint {
  timestamp: number;
  executions: number;
  successes: number;
  failures: number;
  avgDuration: number;
  tokens: number;
}

export interface AgentTypeDistribution {
  type: string;
  displayName: string;
  count: number;
  successRate: number;
  avgDuration: number;
  totalTokens: number;
  icon: string;
}

export interface ToolUsageData {
  toolName: string;
  usageCount: number;
  agentCount: number;
  successRate: number;
  avgDuration: number;
  icon: string;
  percentage?: number; // Optional for backward compatibility
}

export interface RealtimeAgentUpdate {
  type: 'metrics' | 'timeline' | 'performance' | 'tools' | 'types' | 'pong';
  data: any;
  timestamp: number;
}

// Enhanced Error Handling Types for Agent Metrics
export interface ErrorDetails {
  type: 'network' | 'server' | 'timeout' | 'parse' | 'websocket' | 'unknown';
  message: string;
  timestamp: number;
  retryCount?: number;
  fatal?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version: string;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  lastSuccessfulRequest: number;
  consecutiveFailures: number;
  lastError?: ErrorDetails;
}

export interface LoadingStates {
  metrics: boolean;
  timeline: boolean;
  agentTypes: boolean;
  toolUsage: boolean;
  overall: boolean;
}

export type ConnectionStatus = 'offline' | 'unhealthy' | 'degraded' | 'good' | 'excellent';
export type CacheStatus = 'empty' | 'fresh' | 'good' | 'stale' | 'very-stale';
export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Session Relationship Types
export interface SessionRelationship {
  parent_session_id: string;
  child_session_id: string;
  relationship_type: string;
  spawn_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SessionTreeNode {
  session_id: string;
  session_type: 'main' | 'subagent' | 'wave' | 'continuation';
  relationship_type?: string;
  spawn_reason?: string;
  agent_name?: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  status: 'active' | 'completed' | 'failed' | 'timeout';
  depth: number;
  path: string;
  children: SessionTreeNode[];
  expanded?: boolean; // UI state
  token_usage?: number;
  tool_count?: number;
  error_count?: number;
}

export interface SessionRelationshipStats {
  total_sessions: number;
  sessions_by_type: Record<string, number>;
  average_depth: number;
  max_depth: number;
  common_spawn_reasons: Array<{ reason: string; count: number }>;
  parent_child_ratio: number;
  completion_rate: number;
}

export interface RelationshipWebSocketEvent {
  type: 'session_spawn' | 'child_session_completed' | 'session_failed' | 'session_timeout';
  session_id: string;
  parent_session_id?: string;
  relationship_type?: string;
  spawn_reason?: string;
  timestamp: number;
  data?: Record<string, any>;
}

// Hook Status interfaces for Enhanced Hook Coverage Display
export interface HookStatus {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive' | 'error';
  lastExecution?: number;
  executionCount: number;
  executionRate: string;
  successRate: number;
  lastError?: string;
  averageExecutionTime?: number;
}

export interface HookCoverageData {
  hooks: HookStatus[];
  lastUpdated: number;
  totalActiveHooks: number;
  totalInactiveHooks: number;
  totalErrorHooks: number;
  overallSuccessRate: number;
}

// Educational Dashboard Mode interfaces
export interface EducationalMode {
  isEducational: boolean;
}

export interface HookExplanation {
  id: string;
  name: string;
  icon: string;
  simpleDescription: string;
  detailedDescription: string;
  realWorldExample: string;
  codeExample: string;
  bestPractices: string[];
  commonIssues: string[];
  whenItRuns: string;
  whyItMatters: string;
  flowPosition: number;
  connections: string[];
}

export interface HookFlowStep {
  id: string;
  name: string;
  icon: string;
  description: string;
  position: { x: number; y: number };
  connections: string[];
  isActive: boolean;
  color: string;
}

// Sorting Types for Type Safety
export type SortableField = 'timestamp' | 'name' | 'source_app' | 'event_type';
export type SortOrder = 'asc' | 'desc';

export interface SortConfiguration {
  sortBy: SortableField;
  sortOrder: SortOrder;
}