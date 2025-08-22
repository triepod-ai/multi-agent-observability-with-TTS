import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue';
import type { HookEvent, AgentMetrics, AgentTimelineDataPoint, AgentTypeDistribution, ToolUsageData, RealtimeAgentUpdate } from '../types';

// Enhanced error handling and resilience types
interface ErrorDetails {
  type: 'network' | 'server' | 'timeout' | 'parse' | 'websocket' | 'unknown';
  message: string;
  timestamp: number;
  retryCount?: number;
  fatal?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version: string;
}

interface ConnectionHealth {
  isHealthy: boolean;
  lastSuccessfulRequest: number;
  consecutiveFailures: number;
  lastError?: ErrorDetails;
}

interface LoadingStates {
  metrics: boolean;
  timeline: boolean;
  agentTypes: boolean;
  toolUsage: boolean;
  overall: boolean;
}

export function useAgentMetrics(events: Ref<HookEvent[]>) {
  // Enhanced State Management
  const metrics = ref<AgentMetrics>({
    totalExecutions: 0,
    successRate: 0,
    avgDuration: 0,
    agentTypes: 0,
    activeAgents: 0,
    totalTokensUsed: 0,
    avgTokensPerAgent: 0,
    toolsUsed: 0
  });

  const timelineData = ref<AgentTimelineDataPoint[]>([]);
  const agentTypeDistribution = ref<AgentTypeDistribution[]>([]);
  const toolUsage = ref<ToolUsageData[]>([]);
  const selectedTimeRange = ref<'1h' | '6h' | '24h' | '7d'>('24h');

  // Enhanced Loading States
  const loadingStates = ref<LoadingStates>({
    metrics: false,
    timeline: false,
    agentTypes: false,
    toolUsage: false,
    overall: false
  });

  const isLoadingData = computed(() => loadingStates.value.overall);
  const lastUpdate = ref<number>(Date.now());

  // Error Handling & Resilience State
  const connectionHealth = ref<ConnectionHealth>({
    isHealthy: true,
    lastSuccessfulRequest: Date.now(),
    consecutiveFailures: 0
  });

  const currentError = ref<ErrorDetails | null>(null);
  const errorHistory = ref<ErrorDetails[]>([]);
  const isOfflineMode = ref(false);
  const isDegradedMode = ref(false);
  const cacheAge = ref<Record<string, number>>({});
  const retryTimeouts = ref<Map<string, number>>(new Map());

  // Cache version for invalidation
  const CACHE_VERSION = '1.0.0';
  const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const STALE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for stale data

  // User feedback messages
  const statusMessage = ref<string>('');
  const showRetryButton = ref(false);

  // Enhanced WebSocket Management
  let metricsWs: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10; // Increased for better resilience
  let reconnectTimeout: number | null = null;
  let wsHeartbeatInterval: number | null = null;
  let wsLastPong = Date.now();
  const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const WS_PONG_TIMEOUT = 10000; // 10 seconds

  // API Base URL
  const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
  
  // Enhanced connection state
  const isRealtimeConnected = ref(false);
  const wsConnectionState = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsReconnectDelay = ref(1000); // Initial reconnect delay
  
  // === UTILITY FUNCTIONS ===
  
  // Cache Management
  function getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `agent-metrics:${endpoint}:${paramString}:${selectedTimeRange.value}`;
  }

  function setCache<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: CACHE_VERSION
      };
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      cacheAge.value[key] = Date.now();
    } catch (error) {
      console.warn('Failed to set cache:', error);
    }
  }

  function getCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Version check
      if (entry.version !== CACHE_VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      const age = Date.now() - entry.timestamp;
      
      // Hard TTL - remove expired cache
      if (age > entry.ttl) {
        localStorage.removeItem(key);
        delete cacheAge.value[key];
        return null;
      }

      cacheAge.value[key] = entry.timestamp;
      return entry.data;
    } catch (error) {
      console.warn('Failed to get cache:', error);
      return null;
    }
  }

  function getStaleCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Version check
      if (entry.version !== CACHE_VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      const age = Date.now() - entry.timestamp;
      
      // Allow stale data up to STALE_CACHE_TTL
      if (age > STALE_CACHE_TTL) {
        localStorage.removeItem(key);
        delete cacheAge.value[key];
        return null;
      }

      cacheAge.value[key] = entry.timestamp;
      return entry.data;
    } catch (error) {
      console.warn('Failed to get stale cache:', error);
      return null;
    }
  }

  function clearCache(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('agent-metrics:'));
      keys.forEach(key => localStorage.removeItem(key));
      cacheAge.value = {};
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Retry Logic with Exponential Backoff
  async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Success - update connection health
        connectionHealth.value.isHealthy = true;
        connectionHealth.value.lastSuccessfulRequest = Date.now();
        connectionHealth.value.consecutiveFailures = 0;
        currentError.value = null;
        statusMessage.value = '';
        showRetryButton.value = false;
        
        return result;
      } catch (error) {
        const errorDetails: ErrorDetails = {
          type: classifyError(error),
          message: getErrorMessage(error),
          timestamp: Date.now(),
          retryCount: attempt,
          fatal: attempt === maxRetries
        };
        
        // Track error
        errorHistory.value.unshift(errorDetails);
        if (errorHistory.value.length > 10) {
          errorHistory.value = errorHistory.value.slice(0, 10);
        }
        
        // Update connection health
        connectionHealth.value.consecutiveFailures++;
        connectionHealth.value.lastError = errorDetails;
        connectionHealth.value.isHealthy = connectionHealth.value.consecutiveFailures < 3;
        
        if (attempt === maxRetries) {
          currentError.value = errorDetails;
          statusMessage.value = `Failed to ${operationName} after ${maxRetries} attempts`;
          showRetryButton.value = true;
          throw error;
        }
        
        // Calculate delay with jitter
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
        const jitter = Math.random() * 0.3 * delay;
        const finalDelay = delay + jitter;
        
        console.warn(`${operationName} attempt ${attempt} failed, retrying in ${Math.round(finalDelay)}ms:`, errorDetails.message);
        
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, finalDelay);
          retryTimeouts.value.set(operationName, timeoutId);
        });
        
        retryTimeouts.value.delete(operationName);
      }
    }
    
    throw new Error(`Retry logic failed for ${operationName}`);
  }

  // Error Classification
  function classifyError(error: any): ErrorDetails['type'] {
    if (!error) return 'unknown';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'network';
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return 'network';
    }
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return 'timeout';
    }
    
    if (error.status >= 500) {
      return 'server';
    }
    
    if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      return 'parse';
    }
    
    if (error.message?.includes('WebSocket')) {
      return 'websocket';
    }
    
    return 'unknown';
  }

  function getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.statusText) return error.statusText;
    return 'An unknown error occurred';
  }

  // Network Detection
  function isOnline(): boolean {
    return navigator.onLine;
  }

  // Timeout with AbortController
  function createTimeoutController(timeoutMs: number = 10000): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller;
  }

  // === CONFIGURATION ===
  
  // Time range configurations
  const timeRangeConfig = {
    '1h': { duration: 60 * 60 * 1000, intervals: 12, label: '1 Hour' },
    '6h': { duration: 6 * 60 * 60 * 1000, intervals: 24, label: '6 Hours' },
    '24h': { duration: 24 * 60 * 60 * 1000, intervals: 24, label: '24 Hours' },
    '7d': { duration: 7 * 24 * 60 * 60 * 1000, intervals: 28, label: '7 Days' }
  };

  // Agent session detection and analysis
  function detectAndAnalyzeAgentSessions() {
    const sessionGroups = new Map<string, HookEvent[]>();
    const cutoffTime = Date.now() - timeRangeConfig[selectedTimeRange.value].duration;

    // Filter events by time range
    const relevantEvents = events.value.filter(event => 
      (event.timestamp || 0) >= cutoffTime
    );

    // Group by session
    relevantEvents.forEach(event => {
      if (!sessionGroups.has(event.session_id)) {
        sessionGroups.set(event.session_id, []);
      }
      sessionGroups.get(event.session_id)!.push(event);
    });

    const agentSessions: any[] = [];
    
    sessionGroups.forEach((sessionEvents, sessionId) => {
      if (isAgentSession(sessionEvents)) {
        const analysis = analyzeAgentSession(sessionId, sessionEvents);
        agentSessions.push(analysis);
      }
    });

    return agentSessions;
  }

  function isAgentSession(events: HookEvent[]): boolean {
    // Enhanced agent detection strategies
    const hasSubagentStop = events.some(event => 
      event.hook_event_type === 'SubagentStop'
    );
    
    const hasSubagentStart = events.some(event => 
      event.hook_event_type === 'SubagentStart'
    );
    
    const hasTaskTool = events.some(event => 
      event.hook_event_type === 'PreToolUse' && 
      event.payload.tool_name === 'Task'
    );
    
    const hasAgentFileOps = events.some(event => {
      if (event.hook_event_type !== 'PreToolUse') return false;
      const toolInput = event.payload.tool_input;
      if (!toolInput) return false;
      
      const pathFields = [toolInput.file_path, toolInput.path, toolInput.directory];
      return pathFields.some(path => 
        path && typeof path === 'string' && path.includes('.claude/agents')
      );
    });
    
    const hasAgentMentions = events.some(event => {
      const content = JSON.stringify(event.payload).toLowerCase();
      return content.includes('@agent-') || 
             content.includes('@screenshot-analyzer') ||
             content.includes('@debugger') ||
             content.includes('@code-reviewer');
    });
    
    const hasAgentKeywords = events.some(event => {
      const content = JSON.stringify(event.payload).toLowerCase();
      return content.includes('subagent') || 
             content.includes('claude/agents') ||
             content.includes('agent execution') ||
             event.payload.metadata?.agent_type;
    });

    const toolsUsed = new Set(
      events
        .filter(event => event.hook_event_type === 'PreToolUse')
        .map(event => event.payload.tool_name)
        .filter(tool => tool)
    );
    
    const hasMultipleTools = toolsUsed.size >= 3;
    const hasAgentPatterns = Array.from(toolsUsed).some((tool: string | undefined) => 
      tool && ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob'].includes(tool)
    );

    return hasSubagentStop || 
           hasSubagentStart ||
           hasTaskTool || 
           hasAgentFileOps || 
           hasAgentMentions || 
           (hasAgentKeywords && hasMultipleTools) ||
           (hasMultipleTools && hasAgentPatterns && hasAgentKeywords);
  }

  function analyzeAgentSession(sessionId: string, events: HookEvent[]) {
    const sortedEvents = events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    
    // Extract agent details
    const agentName = extractAgentName(events);
    const agentType = classifyAgentType(agentName, events);
    
    // Timing analysis
    const startTime = firstEvent.timestamp || Date.now();
    const endTime = lastEvent.timestamp || startTime;
    const duration = (endTime - startTime) / 1000;
    
    // Status determination
    const hasError = events.some(event => 
      event.hook_event_type === 'PostToolUse' && (
        event.payload.tool_output?.error ||
        event.payload.error ||
        event.error
      )
    );
    
    const hasCompletion = events.some(event => 
      event.hook_event_type === 'SubagentStop'
    );
    
    let status: 'running' | 'completed' | 'failed' = 'running';
    if (hasError) {
      status = 'failed';
    } else if (hasCompletion || duration > 1) {
      status = 'completed';
    }
    
    // Tool usage analysis
    const toolsUsed = Array.from(new Set(
      events
        .filter(event => event.hook_event_type === 'PreToolUse')
        .map(event => event.payload.tool_name)
        .filter(tool => tool)
    ));
    
    // Token usage calculation
    let tokenUsage = 0;
    events.forEach(event => {
      if (event.payload.token_count) tokenUsage += event.payload.token_count;
      if (event.payload.tokens) tokenUsage += event.payload.tokens;
    });
    
    return {
      sessionId,
      agentName,
      agentType,
      startTime,
      endTime,
      duration,
      status,
      toolsUsed,
      tokenUsage,
      events: sortedEvents,
      sourceApp: firstEvent.source_app
    };
  }

  function extractAgentName(events: HookEvent[]): string {
    // Look for agent names in various event payloads
    for (const event of events) {
      if (event.hook_event_type === 'UserPromptSubmit' && event.payload.message) {
        const message = event.payload.message;
        
        // @-mention patterns
        const mentionMatch = message.match(/@(agent-[a-zA-Z0-9-_]+|screenshot-analyzer|debugger|code-reviewer)/i);
        if (mentionMatch) {
          return mentionMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
        
        // Agent patterns
        const agentMatch = message.match(/(?:agent|subagent)[:\s]+([a-zA-Z0-9-_]+)/i);
        if (agentMatch) {
          return agentMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
      }
    }
    
    return 'Agent Task';
  }

  function classifyAgentType(agentName: string, events: HookEvent[]): string {
    const lowerName = agentName.toLowerCase();
    
    // Classify by name patterns
    if (lowerName.includes('screenshot') || lowerName.includes('analyzer')) return 'analyzer';
    if (lowerName.includes('debug') || lowerName.includes('troubleshoot')) return 'debugger';
    if (lowerName.includes('review') || lowerName.includes('quality')) return 'reviewer';
    if (lowerName.includes('test') || lowerName.includes('validate')) return 'tester';
    if (lowerName.includes('document') || lowerName.includes('write')) return 'writer';
    if (lowerName.includes('performance') || lowerName.includes('optimize')) return 'optimizer';
    if (lowerName.includes('security') || lowerName.includes('scanner')) return 'security';
    if (lowerName.includes('lesson') || lowerName.includes('generator')) return 'generator';
    
    // Classify by tool usage patterns
    const toolsUsed = events
      .filter(event => event.hook_event_type === 'PreToolUse')
      .map(event => event.payload.tool_name)
      .filter((tool): tool is string => tool !== undefined);
    
    const hasRead = toolsUsed.includes('Read');
    const hasWrite = toolsUsed.some(tool => ['Write', 'Edit', 'MultiEdit'].includes(tool));
    const hasSearch = toolsUsed.some(tool => ['Grep', 'Glob'].includes(tool));
    const hasBash = toolsUsed.includes('Bash');
    
    if (hasRead && hasWrite && hasSearch) return 'developer';
    if (hasRead && hasSearch && !hasWrite) return 'analyzer';
    if (hasWrite && !hasRead) return 'generator';
    if (hasBash) return 'system';
    
    return 'generic';
  }

  // Calculate metrics from agent sessions
  function calculateMetrics() {
    const agentSessions = detectAndAnalyzeAgentSessions();
    
    // Basic metrics
    const totalExecutions = agentSessions.length;
    const completedSessions = agentSessions.filter(s => s.status === 'completed');
    const successRate = totalExecutions > 0 ? 
      Math.round((completedSessions.length / totalExecutions) * 100) : 0;
    
    // Duration metrics
    const sessionsWithDuration = agentSessions.filter(s => s.duration > 0);
    const avgDuration = sessionsWithDuration.length > 0 ? 
      Math.round((sessionsWithDuration.reduce((sum, s) => sum + s.duration, 0) / 
                 sessionsWithDuration.length) * 100) / 100 : 0;
    
    // Agent type metrics
    const agentTypes = new Set(agentSessions.map(s => s.agentType)).size;
    const activeAgents = agentSessions.filter(s => s.status === 'running').length;
    
    // Token metrics
    const totalTokensUsed = agentSessions.reduce((sum, s) => sum + (s.tokenUsage || 0), 0);
    const sessionsWithTokens = agentSessions.filter(s => s.tokenUsage && s.tokenUsage > 0);
    const avgTokensPerAgent = sessionsWithTokens.length > 0 ? 
      Math.round(totalTokensUsed / sessionsWithTokens.length) : 0;
    
    // Tool metrics
    const allTools = new Set<string>();
    agentSessions.forEach(session => {
      session.toolsUsed.forEach((tool: string) => allTools.add(tool));
    });
    const toolsUsed = allTools.size;
    
    metrics.value = {
      totalExecutions,
      successRate,
      avgDuration,
      agentTypes,
      activeAgents,
      totalTokensUsed,
      avgTokensPerAgent,
      toolsUsed
    };
    
    return agentSessions;
  }

  // Generate timeline data
  function generateTimelineData() {
    const agentSessions = detectAndAnalyzeAgentSessions();
    const config = timeRangeConfig[selectedTimeRange.value];
    const intervalMs = config.duration / config.intervals;
    const now = Date.now();
    
    const timeline: AgentTimelineDataPoint[] = [];
    
    for (let i = 0; i < config.intervals; i++) {
      const startTime = now - config.duration + (i * intervalMs);
      const endTime = startTime + intervalMs;
      
      const intervalSessions = agentSessions.filter(session => 
        session.startTime >= startTime && session.startTime < endTime
      );
      
      const executions = intervalSessions.length;
      const successes = intervalSessions.filter(s => s.status === 'completed').length;
      const failures = intervalSessions.filter(s => s.status === 'failed').length;
      
      const sessionsWithDuration = intervalSessions.filter(s => s.duration > 0);
      const avgDuration = sessionsWithDuration.length > 0 ? 
        sessionsWithDuration.reduce((sum, s) => sum + s.duration, 0) / sessionsWithDuration.length : 0;
      
      const tokens = intervalSessions.reduce((sum, s) => sum + (s.tokenUsage || 0), 0);
      
      timeline.push({
        timestamp: startTime,
        executions,
        successes,
        failures,
        avgDuration: Math.round(avgDuration * 100) / 100,
        tokens
      });
    }
    
    timelineData.value = timeline;
  }

  // Generate agent type distribution
  function generateAgentTypeDistribution() {
    const agentSessions = detectAndAnalyzeAgentSessions();
    const typeMap = new Map<string, {
      count: number;
      successes: number;
      totalDuration: number;
      durationsCount: number;
      totalTokens: number;
    }>();
    
    agentSessions.forEach(session => {
      const existing = typeMap.get(session.agentType) || {
        count: 0,
        successes: 0,
        totalDuration: 0,
        durationsCount: 0,
        totalTokens: 0
      };
      
      typeMap.set(session.agentType, {
        count: existing.count + 1,
        successes: existing.successes + (session.status === 'completed' ? 1 : 0),
        totalDuration: existing.totalDuration + (session.duration || 0),
        durationsCount: existing.durationsCount + (session.duration > 0 ? 1 : 0),
        totalTokens: existing.totalTokens + (session.tokenUsage || 0)
      });
    });
    
    const agentIcons: Record<string, string> = {
      'analyzer': '🔍',
      'debugger': '🐛',
      'reviewer': '👀',
      'tester': '✅',
      'writer': '📝',
      'optimizer': '⚡',
      'security': '🛡️',
      'generator': '🎯',
      'developer': '💻',
      'system': '⚙️',
      'generic': '🤖'
    };
    
    agentTypeDistribution.value = Array.from(typeMap.entries())
      .map(([type, stats]) => ({
        type,
        displayName: type.charAt(0).toUpperCase() + type.slice(1),
        count: stats.count,
        successRate: stats.count > 0 ? Math.round((stats.successes / stats.count) * 100) : 0,
        avgDuration: stats.durationsCount > 0 ? 
          Math.round((stats.totalDuration / stats.durationsCount) * 100) / 100 : 0,
        totalTokens: stats.totalTokens,
        icon: agentIcons[type] || '🤖'
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Generate tool usage data
  function generateToolUsageData() {
    const agentSessions = detectAndAnalyzeAgentSessions();
    const toolMap = new Map<string, {
      usageCount: number;
      agentCount: number;
      successes: number;
      totalDuration: number;
      durationsCount: number;
    }>();
    
    agentSessions.forEach(session => {
      session.toolsUsed.forEach((tool: string) => {
        const existing = toolMap.get(tool) || {
          usageCount: 0,
          agentCount: 0,
          successes: 0,
          totalDuration: 0,
          durationsCount: 0
        };
        
        // Count unique agents using this tool
        existing.agentCount = new Set([...Array.from({length: existing.agentCount}), session.sessionId]).size;
        
        toolMap.set(tool, {
          usageCount: existing.usageCount + 1,
          agentCount: existing.agentCount,
          successes: existing.successes + (session.status === 'completed' ? 1 : 0),
          totalDuration: existing.totalDuration + (session.duration || 0),
          durationsCount: existing.durationsCount + (session.duration > 0 ? 1 : 0)
        });
      });
    });
    
    const toolIcons: Record<string, string> = {
      'Read': '📖',
      'Write': '✏️',
      'Edit': '📝',
      'MultiEdit': '📄',
      'Bash': '💻',
      'Grep': '🔍',
      'Glob': '🌐',
      'Task': '🎯',
      'WebFetch': '🌐',
      'TodoWrite': '📋',
      'LS': '📁',
      'NotebookRead': '📓',
      'NotebookEdit': '📝',
      'WebSearch': '🔍'
    };
    
    toolUsage.value = Array.from(toolMap.entries())
      .map(([toolName, stats]) => ({
        toolName,
        usageCount: stats.usageCount,
        agentCount: stats.agentCount,
        successRate: stats.usageCount > 0 ? Math.round((stats.successes / stats.usageCount) * 100) : 0,
        avgDuration: stats.durationsCount > 0 ? 
          Math.round((stats.totalDuration / stats.durationsCount) * 100) / 100 : 0,
        icon: toolIcons[toolName] || '🔧'
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 12); // Top 12 tools
  }

  // === ENHANCED API METHODS ===
  
  // Enhanced API fetch methods with caching and error handling
  async function fetchCurrentMetrics(): Promise<void> {
    const cacheKey = getCacheKey('metrics');
    
    // Try cache first
    const cached = getCache<AgentMetrics>(cacheKey);
    if (cached && !isDegradedMode.value) {
      metrics.value = cached;
      return;
    }

    loadingStates.value.metrics = true;
    
    try {
      await retryWithBackoff(async () => {
        const controller = createTimeoutController();
        const response = await fetch(
          `${API_BASE}/api/agents/metrics/current?timeRange=${selectedTimeRange.value}`,
          { signal: controller.signal }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Map backend response to frontend metrics structure
        const metricsData: AgentMetrics = {
          totalExecutions: data.executions_today || 0,
          successRate: Math.round((data.success_rate || 0) * 100),
          avgDuration: Math.round((data.avg_duration_ms || 0) / 1000 * 100) / 100,
          agentTypes: 0, // Will be updated by fetchAgentTypeDistribution
          activeAgents: data.active_agents || 0,
          totalTokensUsed: data.tokens_used_today || 0,
          avgTokensPerAgent: data.executions_today > 0 ? Math.round(data.tokens_used_today / data.executions_today) : 0,
          toolsUsed: 0 // Will be updated by fetchToolUsage
        };
        
        metrics.value = metricsData;
        setCache(cacheKey, metricsData);
      }, 'fetch current metrics');
    } catch (error) {
      // Try stale cache as fallback
      const staleData = getStaleCache<AgentMetrics>(cacheKey);
      if (staleData) {
        metrics.value = staleData;
        isDegradedMode.value = true;
        statusMessage.value = 'Using cached data (limited connectivity)';
      } else {
        // Final fallback to local analysis
        console.warn('Falling back to local metrics calculation');
        calculateMetrics();
        statusMessage.value = 'Using local analysis (backend unavailable)';
      }
    } finally {
      loadingStates.value.metrics = false;
    }
  }

  async function fetchTimelineData(): Promise<void> {
    const timeRangeHours = {
      '1h': 1,
      '6h': 6, 
      '24h': 24,
      '7d': 168
    }[selectedTimeRange.value];
    
    const cacheKey = getCacheKey('timeline', { hours: timeRangeHours });
    
    // Try cache first
    const cached = getCache<AgentTimelineDataPoint[]>(cacheKey);
    if (cached && !isDegradedMode.value) {
      timelineData.value = cached;
      return;
    }

    loadingStates.value.timeline = true;
    
    try {
      await retryWithBackoff(async () => {
        const controller = createTimeoutController();
        const response = await fetch(
          `${API_BASE}/api/agents/metrics/timeline?hours=${timeRangeHours}`,
          { signal: controller.signal }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.timeline && Array.isArray(data.timeline)) {
          const timelineDataResult = data.timeline.map((item: any) => ({
            timestamp: new Date(item.timestamp).getTime(),
            executions: item.executions || 0,
            successes: Math.round(item.executions * (item.success_rate || 0)),
            failures: item.executions - Math.round(item.executions * (item.success_rate || 0)),
            avgDuration: Math.round((item.avg_duration_ms || 0) / 1000 * 100) / 100,
            tokens: 0
          }));
          
          timelineData.value = timelineDataResult;
          setCache(cacheKey, timelineDataResult);
        }
      }, 'fetch timeline data');
    } catch (error) {
      // Try stale cache as fallback
      const staleData = getStaleCache<AgentTimelineDataPoint[]>(cacheKey);
      if (staleData) {
        timelineData.value = staleData;
        isDegradedMode.value = true;
      } else {
        // Final fallback to local analysis
        console.warn('Falling back to local timeline generation');
        generateTimelineData();
      }
    } finally {
      loadingStates.value.timeline = false;
    }
  }

  async function fetchAgentTypeDistribution(): Promise<void> {
    const cacheKey = getCacheKey('agent-types');
    
    // Try cache first
    const cached = getCache<AgentTypeDistribution[]>(cacheKey);
    if (cached && !isDegradedMode.value) {
      agentTypeDistribution.value = cached;
      // Update metrics count
      metrics.value.agentTypes = cached.length;
      return;
    }

    loadingStates.value.agentTypes = true;
    
    try {
      await retryWithBackoff(async () => {
        const controller = createTimeoutController();
        const response = await fetch(
          `${API_BASE}/api/agents/types/distribution?timeRange=${selectedTimeRange.value}`,
          { signal: controller.signal }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.distribution && Array.isArray(data.distribution)) {
          const agentIcons: Record<string, string> = {
            'analyzer': '🔍',
            'debugger': '🐛',
            'reviewer': '👀',
            'tester': '✅',
            'writer': '📝',
            'optimizer': '⚡',
            'security': '🛡️',
            'generator': '🎯',
            'developer': '💻',
            'system': '⚙️',
            'generic': '🤖'
          };
          
          const distributionData = data.distribution.map((item: any) => ({
            type: item.type,
            displayName: item.type.charAt(0).toUpperCase() + item.type.slice(1),
            count: item.count,
            successRate: Math.round((item.success_rate || 0) * 100),
            avgDuration: Math.round((item.avg_duration_ms || 0) / 1000 * 100) / 100,
            totalTokens: 0,
            icon: agentIcons[item.type] || '🤖'
          }));
          
          agentTypeDistribution.value = distributionData;
          metrics.value.agentTypes = distributionData.length;
          setCache(cacheKey, distributionData);
        }
      }, 'fetch agent type distribution');
    } catch (error) {
      // Try stale cache as fallback
      const staleData = getStaleCache<AgentTypeDistribution[]>(cacheKey);
      if (staleData) {
        agentTypeDistribution.value = staleData;
        metrics.value.agentTypes = staleData.length;
        isDegradedMode.value = true;
      } else {
        // Final fallback to local analysis
        console.warn('Falling back to local agent type analysis');
        generateAgentTypeDistribution();
      }
    } finally {
      loadingStates.value.agentTypes = false;
    }
  }

  async function fetchToolUsage(): Promise<void> {
    const period = selectedTimeRange.value === '24h' || selectedTimeRange.value === '1h' || selectedTimeRange.value === '6h' ? 'day' : 'week';
    const cacheKey = getCacheKey('tool-usage', { period });
    
    // Try cache first
    const cached = getCache<ToolUsageData[]>(cacheKey);
    if (cached && !isDegradedMode.value) {
      toolUsage.value = cached;
      metrics.value.toolsUsed = cached.length;
      return;
    }

    loadingStates.value.toolUsage = true;
    
    try {
      await retryWithBackoff(async () => {
        const controller = createTimeoutController();
        const response = await fetch(
          `${API_BASE}/api/agents/tools/usage?period=${period}`,
          { signal: controller.signal }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.tools && Array.isArray(data.tools)) {
          const toolIcons: Record<string, string> = {
            'Read': '📖',
            'Write': '✏️',
            'Edit': '📝',
            'MultiEdit': '📄',
            'Bash': '💻',
            'Grep': '🔍',
            'Glob': '🌐',
            'Task': '🎯',
            'WebFetch': '🌐',
            'TodoWrite': '📋',
            'LS': '📁',
            'NotebookRead': '📓',
            'NotebookEdit': '📝',
            'WebSearch': '🔍'
          };
          
          const toolData = data.tools.map((item: any) => ({
            toolName: item.name,
            usageCount: item.usage_count,
            agentCount: item.agents_using.length,
            successRate: 100,
            avgDuration: 0,
            icon: toolIcons[item.name] || '🔧'
          }));
          
          toolUsage.value = toolData;
          metrics.value.toolsUsed = toolData.length;
          setCache(cacheKey, toolData);
        }
      }, 'fetch tool usage');
    } catch (error) {
      // Try stale cache as fallback
      const staleData = getStaleCache<ToolUsageData[]>(cacheKey);
      if (staleData) {
        toolUsage.value = staleData;
        metrics.value.toolsUsed = staleData.length;
        isDegradedMode.value = true;
      } else {
        // Final fallback to local analysis
        console.warn('Falling back to local tool usage analysis');
        generateToolUsageData();
      }
    } finally {
      loadingStates.value.toolUsage = false;
    }
  }

  async function fetchAgentPerformance(agentName: string): Promise<any> {
    const cacheKey = getCacheKey('agent-performance', { agent: agentName });
    
    // Try cache first (shorter TTL for performance data)
    const cached = getCache(cacheKey);
    if (cached && !isDegradedMode.value) {
      return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const controller = createTimeoutController();
        const response = await fetch(
          `${API_BASE}/api/agents/performance/${encodeURIComponent(agentName)}?timeRange=${selectedTimeRange.value}`,
          { signal: controller.signal }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCache(cacheKey, data, 2 * 60 * 1000); // 2 minute TTL for performance data
        return data;
      }, 'fetch agent performance');
    } catch (error) {
      // Try stale cache as fallback
      const staleData = getStaleCache(cacheKey);
      if (staleData) {
        return staleData;
      }
      
      console.error('Failed to fetch agent performance:', error);
      return null;
    }
  }

  // Enhanced data fetching with resilience (updated implementation)
  async function fetchFromBackend(): Promise<void> {
    if (loadingStates.value.overall) return;
    
    loadingStates.value.overall = true;
    
    // Check online status
    if (!isOnline()) {
      isOfflineMode.value = true;
      statusMessage.value = 'You are offline - showing cached data';
      loadingStates.value.overall = false;
      return;
    } else {
      isOfflineMode.value = false;
    }
    
    try {
      // Fetch data with partial failure tolerance
      const results = await Promise.allSettled([
        fetchCurrentMetrics(),
        fetchTimelineData(),
        fetchAgentTypeDistribution(),
        fetchToolUsage()
      ]);
      
      // Check for partial failures
      const failures = results.filter(r => r.status === 'rejected');
      const successes = results.filter(r => r.status === 'fulfilled');
      
      if (failures.length > 0 && successes.length === 0) {
        // All failed - complete fallback
        throw new Error('All backend requests failed');
      } else if (failures.length > 0) {
        // Partial failure - show warning but continue
        statusMessage.value = `Limited data available (${failures.length} of 4 sources failed)`;
        isDegradedMode.value = true;
      } else {
        // All succeeded
        isDegradedMode.value = false;
        statusMessage.value = '';
      }
      
      lastUpdate.value = Date.now();
    } catch (error) {
      console.error('Backend data fetch failed:', error);
      statusMessage.value = 'Backend unavailable - using local analysis';
      throw error; // Re-throw to trigger fallback in refreshData
    } finally {
      loadingStates.value.overall = false;
    }
  }

  // Enhanced WebSocket Management with Resilience (updated implementation)
  function initializeWebSocket() {
    if (metricsWs && metricsWs.readyState === WebSocket.CONNECTING) {
      return; // Already connecting
    }
    
    const wsUrl = `ws://${new URL(API_BASE).host}/stream`;
    wsConnectionState.value = 'connecting';
    
    try {
      // Clean up existing connection
      if (metricsWs) {
        metricsWs.close();
      }
      
      metricsWs = new WebSocket(wsUrl);
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (metricsWs && metricsWs.readyState === WebSocket.CONNECTING) {
          metricsWs.close();
          wsConnectionState.value = 'error';
        }
      }, 5000);
      
      metricsWs.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('Agent metrics WebSocket connected');
        isRealtimeConnected.value = true;
        wsConnectionState.value = 'connected';
        reconnectAttempts = 0;
        wsReconnectDelay.value = 1000; // Reset delay
        
        // Start heartbeat
        startHeartbeat();
        
        // Send ping to verify connection
        if (metricsWs?.readyState === WebSocket.OPEN) {
          metricsWs.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      };
      
      metricsWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle pong responses
          if (message.type === 'pong') {
            wsLastPong = Date.now();
            return;
          }
          
          // Handle regular updates
          if (message.type && message.data) {
            handleRealtimeUpdate(message as RealtimeAgentUpdate);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          const error: ErrorDetails = {
            type: 'parse',
            message: 'Failed to parse WebSocket message',
            timestamp: Date.now()
          };
          errorHistory.value.unshift(error);
        }
      };
      
      metricsWs.onclose = (event) => {
        clearTimeout(connectionTimeout);
        stopHeartbeat();
        console.log('Agent metrics WebSocket disconnected:', event.code, event.reason);
        isRealtimeConnected.value = false;
        wsConnectionState.value = 'disconnected';
        
        // Don't reconnect if closed intentionally (code 1000)
        if (event.code === 1000) {
          return;
        }
        
        // Implement exponential backoff for reconnection
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(wsReconnectDelay.value * Math.pow(1.5, reconnectAttempts), 30000);
          
          console.log(`Attempting WebSocket reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            wsReconnectDelay.value = delay;
            initializeWebSocket();
          }, delay);
        } else {
          console.error('Max WebSocket reconnection attempts reached');
          wsConnectionState.value = 'error';
          statusMessage.value = 'Real-time updates unavailable (connection failed)';
        }
      };
      
      metricsWs.onerror = (err) => {
        clearTimeout(connectionTimeout);
        console.error('Agent metrics WebSocket error:', err);
        isRealtimeConnected.value = false;
        wsConnectionState.value = 'error';
        
        const error: ErrorDetails = {
          type: 'websocket',
          message: 'WebSocket connection error',
          timestamp: Date.now()
        };
        errorHistory.value.unshift(error);
      };
    } catch (err) {
      console.error('Failed to initialize agent metrics WebSocket:', err);
      isRealtimeConnected.value = false;
      wsConnectionState.value = 'error';
      
      const error: ErrorDetails = {
        type: 'websocket',
        message: 'Failed to initialize WebSocket',
        timestamp: Date.now()
      };
      errorHistory.value.unshift(error);
    }
  }
  
  // WebSocket Heartbeat Management
  function startHeartbeat() {
    wsHeartbeatInterval = setInterval(() => {
      if (metricsWs?.readyState === WebSocket.OPEN) {
        // Check if we received a pong recently
        if (Date.now() - wsLastPong > WS_PONG_TIMEOUT + WS_HEARTBEAT_INTERVAL) {
          console.warn('WebSocket heartbeat timeout - reconnecting');
          metricsWs.close(4000, 'Heartbeat timeout');
          return;
        }
        
        // Send ping
        metricsWs.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, WS_HEARTBEAT_INTERVAL);
  }
  
  function stopHeartbeat() {
    if (wsHeartbeatInterval) {
      clearInterval(wsHeartbeatInterval);
      wsHeartbeatInterval = null;
    }
  }
  
  // Manual WebSocket reconnection
  function reconnectWebSocket() {
    reconnectAttempts = 0;
    wsReconnectDelay.value = 1000;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    initializeWebSocket();
  }

  // Handle realtime updates
  function handleRealtimeUpdate(update: RealtimeAgentUpdate) {
    lastUpdate.value = Date.now();
    
    switch (update.type) {
      case 'metrics':
        // Update metrics
        if (update.data) {
          Object.assign(metrics.value, update.data);
        }
        break;
        
      case 'timeline':
        // Update timeline data
        if (Array.isArray(update.data)) {
          timelineData.value = update.data;
        }
        break;
        
      case 'types':
        // Update agent type distribution
        if (Array.isArray(update.data)) {
          agentTypeDistribution.value = update.data;
        }
        break;
        
      case 'tools':
        // Update tool usage
        if (Array.isArray(update.data)) {
          toolUsage.value = update.data;
        }
        break;
    }
  }

  // Enhanced data refresh with graceful degradation (updated implementation)
  async function refreshData() {
    if (loadingStates.value.overall) return;
    
    try {
      // First, try to fetch from backend endpoints
      await fetchFromBackend();
      isDegradedMode.value = false;
    } catch (error) {
      console.log('Backend fetch failed, falling back to local analysis:', error);
      
      // Fallback to local analysis of events
      loadingStates.value.overall = true;
      isDegradedMode.value = true;
      
      try {
        calculateMetrics();
        generateTimelineData();
        generateAgentTypeDistribution();
        generateToolUsageData();
        lastUpdate.value = Date.now();
        
        statusMessage.value = 'Using local analysis (backend unavailable)';
      } finally {
        loadingStates.value.overall = false;
      }
    }
  }
  
  // Manual retry for failed operations
  async function retryFailedOperations() {
    currentError.value = null;
    showRetryButton.value = false;
    statusMessage.value = 'Retrying...';
    
    // Clear retry timeouts
    retryTimeouts.value.forEach(timeoutId => clearTimeout(timeoutId));
    retryTimeouts.value.clear();
    
    // Reset connection health for fresh attempt
    connectionHealth.value.consecutiveFailures = 0;
    connectionHealth.value.isHealthy = true;
    
    // Retry data refresh
    await refreshData();
    
    // Retry WebSocket if needed
    if (!isRealtimeConnected.value && wsConnectionState.value === 'error') {
      reconnectWebSocket();
    }
  }
  
  // Force refresh (bypasses cache)
  async function forceRefresh() {
    clearCache();
    isDegradedMode.value = false;
    await refreshData();
  }

  // Enhanced export with diagnostics (updated implementation)
  function exportMetrics() {
    const data = {
      metrics: metrics.value,
      timeline: timelineData.value,
      agentTypes: agentTypeDistribution.value,
      tools: toolUsage.value,
      exportedAt: new Date().toISOString(),
      timeRange: selectedTimeRange.value,
      // Diagnostic information
      diagnostics: {
        connectionHealth: connectionHealth.value,
        isOfflineMode: isOfflineMode.value,
        isDegradedMode: isDegradedMode.value,
        wsConnectionState: wsConnectionState.value,
        cacheAge: cacheAge.value,
        recentErrors: errorHistory.value.slice(0, 5),
        lastUpdate: lastUpdate.value
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-metrics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Test agent runner
  async function runTestAgent(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/api/agents/test/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'demo',
          duration: 5000, // 5 seconds
          tools: ['Read', 'Write', 'Bash'],
          scenario: 'performance-test'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Test agent executed successfully:', result);
        
        // Refresh data to show new execution
        setTimeout(() => {
          refreshData();
        }, 1000);
      } else {
        console.error('Failed to run test agent:', response.statusText);
      }
    } catch (error) {
      console.error('Error running test agent:', error);
      
      // Fallback: Create a mock agent session for demo purposes
      console.log('Creating mock agent session for demo...');
      createMockAgentEvents();
      
      // Simulate adding events to the system
      setTimeout(() => {
        refreshData();
      }, 2000);
    }
  }
  
  // Create mock agent events for demo purposes
  function createMockAgentEvents(): HookEvent[] {
    const sessionId = `mock-agent-${Date.now()}`;
    const now = Date.now();
    
    return [
      {
        source_app: 'claude-code',
        session_id: sessionId,
        hook_event_type: 'UserPromptSubmit',
        payload: {
          message: '@debugger analyze performance issues in the application',
          metadata: {
            user: 'demo-user',
            agent_type: 'debugger'
          }
        },
        timestamp: now
      },
      {
        source_app: 'claude-code',
        session_id: sessionId,
        hook_event_type: 'PreToolUse',
        payload: {
          tool_name: 'Read',
          tool_input: { file_path: '/app/src/performance.js' },
          metadata: { agent_type: 'debugger' }
        },
        timestamp: now + 1000
      },
      {
        source_app: 'claude-code',
        session_id: sessionId,
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Read',
          tool_output: { result: 'File contents analyzed' },
          tokens: 150
        },
        timestamp: now + 1500
      },
      {
        source_app: 'claude-code',
        session_id: sessionId,
        hook_event_type: 'PreToolUse',
        payload: {
          tool_name: 'Bash',
          tool_input: { command: 'grep -r "performance" src/' },
          metadata: { agent_type: 'debugger' }
        },
        timestamp: now + 2000
      },
      {
        source_app: 'claude-code',
        session_id: sessionId,
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Bash',
          tool_output: { result: 'Performance issues found in 3 files' },
          tokens: 85
        },
        timestamp: now + 3000
      },
      {
        source_app: 'claude-code',
        session_id: sessionId,
        hook_event_type: 'SubagentStop',
        payload: {
          result: 'Analysis complete: 3 performance bottlenecks identified',
          success: true,
          tokens: 235,
          duration: 4.5,
          metadata: { agent_type: 'debugger' }
        },
        timestamp: now + 4500
      }
    ];
  }

  // Watch for time range changes
  watch(selectedTimeRange, () => {
    refreshData();
  });

  // Watch for events changes
  watch(() => events.value.length, () => {
    refreshData();
  }, { immediate: false });

  // Computed properties for trend indicators
  const executionTrend = computed(() => {
    // Calculate trend based on recent vs previous period
    // This is a simplified calculation - in practice you'd compare time periods
    const recentSessions = timelineData.value.slice(-6);
    const previousSessions = timelineData.value.slice(-12, -6);
    
    if (previousSessions.length === 0) return 0;
    
    const recentAvg = recentSessions.reduce((sum, d) => sum + d.executions, 0) / recentSessions.length;
    const previousAvg = previousSessions.reduce((sum, d) => sum + d.executions, 0) / previousSessions.length;
    
    if (previousAvg === 0) return recentAvg > 0 ? 100 : 0;
    
    return Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
  });

  const successRateTrend = computed(() => {
    const recentSessions = timelineData.value.slice(-6);
    const previousSessions = timelineData.value.slice(-12, -6);
    
    if (previousSessions.length === 0) return 0;
    
    const recentSuccessRate = recentSessions.length > 0 ?
      recentSessions.reduce((sum, d) => sum + (d.executions > 0 ? d.successes / d.executions : 0), 0) / 
      recentSessions.filter(d => d.executions > 0).length : 0;
    
    const previousSuccessRate = previousSessions.length > 0 ?
      previousSessions.reduce((sum, d) => sum + (d.executions > 0 ? d.successes / d.executions : 0), 0) / 
      previousSessions.filter(d => d.executions > 0).length : 0;
    
    if (previousSuccessRate === 0) return recentSuccessRate > 0 ? 100 : 0;
    
    return Math.round(((recentSuccessRate - previousSuccessRate) / previousSuccessRate) * 100);
  });

  // === LIFECYCLE & EVENT HANDLERS ===
  
  // Online/offline event handlers
  function handleOnline() {
    isOfflineMode.value = false;
    statusMessage.value = 'Back online - refreshing data';
    refreshData();
    if (!isRealtimeConnected.value) {
      initializeWebSocket();
    }
  }
  
  function handleOffline() {
    isOfflineMode.value = true;
    statusMessage.value = 'You are offline - showing cached data';
  }
  
  // Lifecycle management (updated implementation)
  onMounted(() => {
    // Add online/offline event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial data load and WebSocket connection
    refreshData();
    initializeWebSocket();
  });

  onUnmounted(() => {
    // Clean up event listeners
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    
    // Clean up WebSocket
    stopHeartbeat();
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (metricsWs) {
      metricsWs.close(1000, 'Component unmounted');
      metricsWs = null;
    }
    
    // Clean up retry timeouts
    retryTimeouts.value.forEach(timeoutId => clearTimeout(timeoutId));
    retryTimeouts.value.clear();
  });

  // === COMPUTED PROPERTIES ===
  
  const connectionStatus = computed(() => {
    if (isOfflineMode.value) return 'offline';
    if (!connectionHealth.value.isHealthy) return 'unhealthy';
    if (isDegradedMode.value) return 'degraded';
    if (isRealtimeConnected.value) return 'excellent';
    return 'good';
  });
  
  const cacheStatus = computed(() => {
    const keys = Object.keys(cacheAge.value);
    if (keys.length === 0) return 'empty';
    
    const oldestCache = Math.min(...Object.values(cacheAge.value));
    const age = Date.now() - oldestCache;
    
    if (age < 2 * 60 * 1000) return 'fresh';
    if (age < 10 * 60 * 1000) return 'good';
    if (age < 30 * 60 * 1000) return 'stale';
    return 'very-stale';
  });
  
  const loadingProgress = computed(() => {
    const states = loadingStates.value;
    const total = 4; // metrics, timeline, agentTypes, toolUsage
    const loading = [states.metrics, states.timeline, states.agentTypes, states.toolUsage].filter(Boolean).length;
    return Math.round(((total - loading) / total) * 100);
  });

  // === RETURN INTERFACE ===
  
  return {
    // Core Data
    metrics,
    timelineData,
    agentTypeDistribution, 
    toolUsage,
    selectedTimeRange,
    lastUpdate,
    
    // Loading States
    isLoadingData,
    loadingStates,
    loadingProgress,
    
    // Connection & Health
    isRealtimeConnected,
    wsConnectionState,
    connectionHealth,
    connectionStatus,
    
    // Error Handling
    currentError,
    errorHistory,
    isOfflineMode,
    isDegradedMode,
    statusMessage,
    showRetryButton,
    
    // Cache Management
    cacheAge,
    cacheStatus,
    
    // Computed Analytics
    executionTrend,
    successRateTrend,
    
    // Methods - Data Management
    refreshData,
    forceRefresh,
    retryFailedOperations,
    exportMetrics,
    fetchAgentPerformance,
    
    // Methods - Connection Management
    reconnectWebSocket,
    clearCache,
    
    // Methods - Testing
    runTestAgent,
    
    // Configuration
    timeRangeOptions: Object.entries(timeRangeConfig).map(([value, config]) => ({
      value: value as '1h' | '6h' | '24h' | '7d',
      label: config.label
    }))
  };
}