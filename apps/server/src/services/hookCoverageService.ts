import { Database } from 'bun:sqlite';
import type { HookEvent } from '../types';

interface HookStatus {
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

interface HookCoverageData {
  hooks: HookStatus[];
  lastUpdated: number;
  totalActiveHooks: number;
  totalInactiveHooks: number;
  totalErrorHooks: number;
  overallSuccessRate: number;
}

// Hook definitions based on Claude Code hook types
const hookDefinitions = [
  {
    type: 'session_start',
    displayName: 'SessionStart',
    description: 'Session initialization and context loading',
    icon: '🚀',
    eventTypes: ['SessionStart']
  },
  {
    type: 'user_prompt_submit', 
    displayName: 'UserPrompt',
    description: 'User input processing',
    icon: '💬',
    eventTypes: ['UserPromptSubmit']
  },
  {
    type: 'pre_tool_use',
    displayName: 'PreToolUse', 
    description: 'Before tool execution validation',
    icon: '⚡',
    eventTypes: ['PreToolUse']
  },
  {
    type: 'post_tool_use',
    displayName: 'PostToolUse',
    description: 'After tool execution processing', 
    icon: '✅',
    eventTypes: ['PostToolUse']
  },
  {
    type: 'subagent_stop',
    displayName: 'SubagentStop',
    description: 'Agent completion and cleanup',
    icon: '🤖',
    eventTypes: ['SubagentStop']
  },
  {
    type: 'stop',
    displayName: 'Stop',
    description: 'Session termination',
    icon: '🛑',
    eventTypes: ['Stop']
  },
  {
    type: 'notification',
    displayName: 'Notification', 
    description: 'System notifications and alerts',
    icon: '🔔',
    eventTypes: ['Notification']
  },
  {
    type: 'precompact',
    displayName: 'PreCompact',
    description: 'Pre-compression analysis',
    icon: '📦',
    eventTypes: ['PreCompact']
  }
];

let wsClients: Set<any> = new Set();

export function setWebSocketClients(clients: Set<any>) {
  wsClients = clients;
}

export function calculateHookCoverage(db: Database): HookCoverageData {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  // Get all events from the database
  const allEventsQuery = db.prepare('SELECT * FROM events ORDER BY timestamp DESC');
  const allEvents = allEventsQuery.all() as HookEvent[];
  
  // Get recent events for rate calculation
  const recentEventsQuery = db.prepare('SELECT * FROM events WHERE timestamp > ? ORDER BY timestamp DESC');
  const recentEvents = recentEventsQuery.all(oneDayAgo) as HookEvent[];
  
  const hooks: HookStatus[] = hookDefinitions.map(def => {
    // Find events matching this hook type
    const hookEvents = allEvents.filter(e => 
      def.eventTypes.includes(e.hook_event_type)
    );
    
    const recentHookEvents = recentEvents.filter(e => 
      def.eventTypes.includes(e.hook_event_type)
    );
    
    // Calculate statistics
    const executionCount = hookEvents.length;
    const recentExecutionCount = recentHookEvents.length;
    const lastExecution = hookEvents.length > 0 ? 
      Math.max(...hookEvents.map(e => e.timestamp || 0)) : undefined;
    
    // Calculate success rate (based on absence of error field)
    const successfulEvents = hookEvents.filter(e => !e.error || e.error === false);
    const successRate = hookEvents.length > 0 ? 
      Math.round((successfulEvents.length / hookEvents.length) * 100) : 100;
    
    // Calculate average execution time
    const eventsWithDuration = hookEvents.filter(e => e.duration && e.duration > 0);
    const averageExecutionTime = eventsWithDuration.length > 0 ? 
      eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / eventsWithDuration.length : 0;
    
    // Determine status
    let status: 'active' | 'inactive' | 'error';
    let lastError: string | undefined;
    
    if (executionCount === 0) {
      status = 'inactive';
    } else {
      // Check for recent errors
      const errorEvents = hookEvents.filter(e => e.error && e.error !== false);
      const recentErrors = errorEvents.filter(e => (e.timestamp || 0) > oneDayAgo);
      
      if (recentErrors.length > 0) {
        status = 'error';
        const latestError = recentErrors.reduce((latest, current) => 
          (current.timestamp || 0) > (latest.timestamp || 0) ? current : latest
        );
        lastError = typeof latestError.error === 'string' ? 
          latestError.error : 'Unknown error occurred';
      } else {
        status = 'active';
      }
    }
    
    // Format execution rate
    const executionRate = recentExecutionCount === 0 ? '0/day' : 
      recentExecutionCount === 1 ? '1/day' : `${recentExecutionCount}/day`;
    
    return {
      type: def.type,
      displayName: def.displayName,
      description: def.description,
      icon: def.icon,
      status,
      lastExecution,
      executionCount,
      executionRate,
      successRate,
      lastError,
      averageExecutionTime: Math.round(averageExecutionTime)
    };
  });
  
  // Calculate overall statistics
  const totalActiveHooks = hooks.filter(h => h.status === 'active').length;
  const totalInactiveHooks = hooks.filter(h => h.status === 'inactive').length;
  const totalErrorHooks = hooks.filter(h => h.status === 'error').length;
  
  const overallSuccessRate = hooks.length > 0 ? 
    Math.round(hooks.reduce((sum, h) => sum + h.successRate, 0) / hooks.length) : 100;
  
  return {
    hooks,
    lastUpdated: now,
    totalActiveHooks,
    totalInactiveHooks,
    totalErrorHooks,
    overallSuccessRate
  };
}

export function broadcastHookCoverage(db: Database) {
  const hookCoverage = calculateHookCoverage(db);
  
  const message = JSON.stringify({
    type: 'hook_status_update',
    data: hookCoverage
  });
  
  wsClients.forEach(client => {
    try {
      client.send(message);
    } catch (err) {
      // Client disconnected, remove from set
      wsClients.delete(client);
    }
  });
}

export function getHookCoverageAPI(db: Database): HookCoverageData {
  return calculateHookCoverage(db);
}