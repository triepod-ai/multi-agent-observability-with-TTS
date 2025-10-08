<template>
  <div class="h-full overflow-y-auto p-4 bg-gray-950">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">📱</div>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-xl font-bold text-white">Applications Overview</h2>
              <span v-if="hasActiveFilters" class="inline-flex items-center px-2 py-1 bg-blue-900/30 border border-blue-700/50 rounded-full text-xs text-blue-300">
                🔍 Filtered
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <p class="text-sm text-gray-400">Multi-application monitoring with session grouping</p>
              <span v-if="hasActiveFilters" class="text-xs text-blue-400">
                • Showing {{ Object.keys(groupedByApplication).length }} of {{ totalApplicationCount }} applications
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-4 text-sm text-gray-400">
          <div class="flex items-center space-x-1">
            <span>📊</span>
            <span>{{ Object.keys(groupedByApplication).length }} applications</span>
            <span v-if="hasActiveFilters && totalApplicationCount > Object.keys(groupedByApplication).length" 
                  class="text-blue-400">
              / {{ totalApplicationCount }}
            </span>
          </div>
          <div class="flex items-center space-x-1">
            <span>🤖</span>
            <span>{{ totalAgentExecutions }} agents</span>
          </div>
          <div class="flex items-center space-x-1">
            <span>🔄</span>
            <span>{{ uniqueSessions.length }} sessions</span>
          </div>
          <div class="flex items-center space-x-1">
            <span>⚡</span>
            <span>{{ totalEvents }} events</span>
          </div>
        </div>
      </div>
      
      <!-- Quick Filter Actions (when filters are active) -->
      <div v-if="hasActiveFilters" class="mt-4 p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <!-- Filter Count Indicator -->
        <div class="mb-2">
          <span class="text-xs text-blue-400">
            Showing {{ Object.keys(groupedByApplication).length }} of {{ totalApplicationCount }} applications
          </span>
        </div>

        <!-- Active Filter Chips -->
        <div class="mb-3">
          <div class="text-xs text-gray-300 mb-2">Active Filters:</div>
          <div class="flex items-center flex-wrap gap-2">
            <!-- App Filter Chip -->
            <div v-if="activeFilters?.sourceApp" class="flex items-center bg-blue-900/40 border border-blue-600/50 rounded-full px-3 py-1">
              <span class="text-xs text-blue-300">{{ activeFilters.sourceApp }}</span>
              <button 
                @click="clearAppFilter"
                data-testid="clear-app-filter"
                class="ml-2 text-blue-400 hover:text-blue-200 text-xs"
              >
                ×
              </button>
            </div>

            <!-- Tool Filter Chip -->
            <div v-if="activeFilters?.toolName" class="flex items-center bg-green-900/40 border border-green-600/50 rounded-full px-3 py-1">
              <span class="text-xs mr-1">{{ getToolIcon(activeFilters.toolName) }}</span>
              <span class="text-xs text-green-300">{{ activeFilters.toolName }}</span>
              <button 
                @click="clearToolFilter"
                class="ml-2 text-green-400 hover:text-green-200 text-xs"
              >
                ×
              </button>
            </div>

            <!-- Session Filter Chip -->
            <div v-if="activeFilters?.sessionId" class="flex items-center bg-purple-900/40 border border-purple-600/50 rounded-full px-3 py-1">
              <span class="text-xs text-purple-300">{{ formatSessionId(activeFilters.sessionId) }}</span>
              <button 
                @click="clearSessionFilter"
                class="ml-2 text-purple-400 hover:text-purple-200 text-xs"
              >
                ×
              </button>
            </div>

            <!-- Clear All Button -->
            <button 
              @click="clearAllFilters"
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors bg-gray-800/50 px-3 py-1 rounded-full border border-gray-600/50"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs text-gray-400">Use the filter bar above to adjust filters</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Applications Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <TransitionGroup name="application-card">
        <div
          v-for="[appName, appEvents] in sortedApplications"
          :key="appName"
          class="bg-gray-800/50 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200 flex flex-col h-[500px] overflow-hidden"
        >
          <!-- Application Header -->
          <div class="flex items-center justify-between mb-4 flex-shrink-0">
            <div class="flex items-center space-x-3">
              <div 
                class="w-4 h-4 rounded-full flex-shrink-0"
                :style="{ backgroundColor: getAppColor(appName) }"
              ></div>
              <div>
                <h3 class="font-semibold text-white text-lg">{{ appName }}</h3>
                <p class="text-xs text-gray-400">{{ getAppDescription(appName) }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                {{ appEvents.length }} events
              </span>
              <div
                class="w-2 h-2 rounded-full"
                :class="getAppStatus(appEvents) === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'"
              ></div>
            </div>
          </div>

          <!-- Scrollable Content Area -->
          <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <!-- Application Metrics -->
            <div class="grid grid-cols-4 gap-3 mb-4">
            <div class="text-center p-2 bg-gray-900/50 rounded">
              <div class="text-lg font-bold text-purple-400">{{ getAppAgentCount(appEvents) }}</div>
              <div class="text-xs text-gray-400">Agents</div>
            </div>
            <div class="text-center p-2 bg-gray-900/50 rounded">
              <div class="text-lg font-bold text-white">{{ getAppSessions(appEvents).length }}</div>
              <div class="text-xs text-gray-400">Sessions</div>
            </div>
            <div class="text-center p-2 bg-gray-900/50 rounded">
              <div class="text-lg font-bold text-green-400">{{ getSuccessRate(appEvents) }}%</div>
              <div class="text-xs text-gray-400">Success</div>
            </div>
            <div class="text-center p-2 bg-gray-900/50 rounded">
              <div class="text-lg font-bold text-blue-400">{{ getAvgResponseTime(appEvents) }}ms</div>
              <div class="text-xs text-gray-400">Avg Time</div>
            </div>
          </div>

          <!-- Agent Activity & Tools -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <!-- Active Agents -->
            <div class="flex flex-col min-h-0">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-300">Active Agents</h4>
                <span class="text-xs text-purple-400">{{ getAppAgents(appEvents).length }} total</span>
              </div>
              <div class="flex-grow overflow-y-auto custom-scrollbar space-y-1">
                <div
                  v-for="agent in getAppAgents(appEvents).slice(0, 3)"
                  :key="agent.name"
                  class="flex items-center justify-between p-2 bg-purple-900/20 border border-purple-700/30 rounded text-xs cursor-pointer hover:bg-purple-900/30 transition-colors"
                  @click="filterByAgent(appName, agent.name)"
                  :title="`${agent.name}: ${agent.executions} executions, ${agent.successRate}% success rate`"
                >
                  <div class="flex items-center space-x-2">
                    <span class="text-sm">{{ agent.icon }}</span>
                    <span class="text-purple-300 font-medium">{{ agent.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-purple-400">{{ agent.executions }}x</span>
                    <span class="text-green-400">{{ agent.successRate }}%</span>
                  </div>
                </div>
                <div v-if="getAppAgents(appEvents).length === 0" class="text-xs text-gray-500 italic p-2">
                  No agent activity
                </div>
              </div>
            </div>
            
            <!-- Recent Tool Usage -->
            <div class="flex flex-col min-h-0">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-300">Recent Tool Usage</h4>
                <button
                  @click="viewAllSessions(appName)"
                  class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View All →
                </button>
              </div>
              <div class="flex-grow overflow-y-auto custom-scrollbar space-y-1">
                <div
                  v-for="tool in getRecentToolUsage(appEvents).slice(0, 5)"
                  :key="tool.name"
                  class="flex items-center justify-between p-2 bg-gray-900/30 rounded text-xs cursor-pointer hover:bg-gray-900/50 transition-colors"
                  @click="filterByTool(appName, tool.name)"
                  :title="`${tool.name}: ${tool.count} uses, last used ${tool.timeAgo}`"
                >
                  <div class="flex items-center space-x-2">
                    <div class="flex items-center space-x-1">
                      <span class="text-sm">{{ tool.icon }}</span>
                      <div 
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :class="tool.isActive ? 'bg-green-500 animate-pulse' : 
                               tool.isRecent ? 'bg-yellow-500' : 'bg-gray-500'"
                      ></div>
                    </div>
                    <span class="text-gray-300 font-medium">{{ tool.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-gray-500">{{ tool.count }} uses</span>
                    <span class="text-gray-600">{{ tool.timeAgo }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <!-- Recent Activity Timeline -->
            <div class="border-t border-gray-700 pt-3 mt-auto">
              <h5 class="text-xs font-medium text-gray-400 mb-2">Activity Timeline</h5>
              <div class="flex items-center space-x-1">
                <div
                  v-for="(activity, index) in getActivityTimeline(appEvents)"
                  :key="index"
                  class="w-2 h-6 rounded-sm transition-all duration-200"
                  :class="activity.intensity > 0.7 ? 'bg-green-500' :
                         activity.intensity > 0.4 ? 'bg-yellow-500' :
                         activity.intensity > 0 ? 'bg-blue-500' : 'bg-gray-700'"
                  :title="`${activity.count} events at ${activity.time}`"
                ></div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-between mt-4 flex-shrink-0">
            <button
              @click="filterByApplication(appName)"
              class="flex-1 mr-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
            >
              Filter Events
            </button>
            <button
              @click="analyzeApplication(appName)"
              class="flex-1 ml-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors"
            >
              Analyze
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Empty State -->
    <div v-if="Object.keys(groupedByApplication).length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📱</div>
      <h3 class="text-xl font-semibold text-white mb-2">No Applications Detected</h3>
      <p class="text-gray-400 mb-4">Start using Claude Code tools to see applications appear here</p>
      <div class="text-sm text-gray-500">
        Applications will be automatically detected from hook events
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HookEvent } from '../types';

interface Props {
  events: HookEvent[];
  getAppColor: (appName: string) => string;
  getSessionColor: (sessionId: string) => string;
  allEvents?: HookEvent[]; // Unfiltered events for total count
  activeFilters?: {
    sourceApp?: string;
    sessionId?: string;
    eventType?: string;
    toolName?: string;
    search?: string;
  };
}

interface Emits {
  (e: 'selectSession', sessionId: string): void;
  (e: 'filterByApp', appName: string): void;
  (e: 'viewAllSessions', appName: string): void;
  (e: 'filterByTool', appName: string, toolName: string): void;
  (e: 'clearFilter', filterType: 'sourceApp' | 'sessionId' | 'eventType' | 'toolName'): void;
  (e: 'clearAllFilters'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Group events by application
const groupedByApplication = computed(() => {
  const groups: Record<string, HookEvent[]> = {};
  
  props.events.forEach(event => {
    const appName = event.source_app || 'Unknown';
    if (!groups[appName]) {
      groups[appName] = [];
    }
    groups[appName].push(event);
  });
  
  return groups;
});

// Sort applications by activity (most recent first)
const sortedApplications = computed(() => {
  return Object.entries(groupedByApplication.value).sort((a, b) => {
    const aLatest = Math.max(...a[1].map(e => e.timestamp || 0));
    const bLatest = Math.max(...b[1].map(e => e.timestamp || 0));
    return bLatest - aLatest;
  });
});

// Statistics
const totalEvents = computed(() => props.events.length);
const uniqueSessions = computed(() => {
  const sessions = new Set(props.events.map(e => e.session_id));
  return Array.from(sessions);
});

// Filter-related computed properties
const hasActiveFilters = computed(() => {
  const filters = props.activeFilters;
  return !!(
    filters?.sourceApp || 
    filters?.sessionId || 
    filters?.eventType || 
    filters?.toolName ||
    filters?.search
  );
});

const totalApplicationCount = computed(() => {
  if (!props.allEvents) return Object.keys(groupedByApplication.value).length;
  
  const allGroups: Record<string, HookEvent[]> = {};
  props.allEvents.forEach(event => {
    const appName = event.source_app || 'Unknown';
    if (!allGroups[appName]) {
      allGroups[appName] = [];
    }
    allGroups[appName].push(event);
  });
  
  return Object.keys(allGroups).length;
});

// Helper functions
const getAppDescription = (appName: string): string => {
  const descriptions: Record<string, string> = {
    'claude-code': 'Claude Code Assistant',
    'mcp-server': 'MCP Server Tools',
    'multi-agent': 'Multi-Agent System',
    'hook-monitor': 'Hook Monitoring System'
  };
  return descriptions[appName] || 'Application';
};

const getAppStatus = (events: HookEvent[]): 'active' | 'idle' => {
  if (events.length === 0) return 'idle';
  const latestEvent = Math.max(...events.map(e => e.timestamp || 0));
  const now = Date.now();
  // Consider active if last event was within 5 minutes
  return (now - latestEvent) < 5 * 60 * 1000 ? 'active' : 'idle';
};

const getAppSessions = (events: HookEvent[]): string[] => {
  const sessions = new Set(events.map(e => e.session_id));
  return Array.from(sessions);
};

const getSuccessRate = (events: HookEvent[]): number => {
  if (events.length === 0) return 0;
  const successEvents = events.filter(e => !e.error && !e.hook_event_type.includes('error'));
  return Math.round((successEvents.length / events.length) * 100);
};

const getAvgResponseTime = (events: HookEvent[]): number => {
  const eventsWithDuration = events.filter(e => e.duration);
  if (eventsWithDuration.length === 0) return 0;
  const totalDuration = eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0);
  return Math.round(totalDuration / eventsWithDuration.length);
};

const getSessionEventCount = (events: HookEvent[], sessionId: string): number => {
  return events.filter(e => e.session_id === sessionId).length;
};

const getSessionTimeAgo = (events: HookEvent[], sessionId: string): string => {
  const sessionEvents = events.filter(e => e.session_id === sessionId);
  if (sessionEvents.length === 0) return '';
  
  const latestTimestamp = Math.max(...sessionEvents.map(e => e.timestamp || 0));
  const now = Date.now();
  const diffMinutes = Math.floor((now - latestTimestamp) / (1000 * 60));
  
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};


const getActivityTimeline = (events: HookEvent[]): Array<{time: string, count: number, intensity: number}> => {
  const now = Date.now();
  const timeSlots = 20; // 20 time slots
  const slotDuration = 5 * 60 * 1000; // 5 minutes per slot
  const timeline = [];
  
  for (let i = timeSlots - 1; i >= 0; i--) {
    const slotStart = now - (i + 1) * slotDuration;
    const slotEnd = now - i * slotDuration;
    const slotEvents = events.filter(e => 
      e.timestamp && e.timestamp >= slotStart && e.timestamp < slotEnd
    );
    
    const count = slotEvents.length;
    const maxCount = Math.max(...Array.from({length: timeSlots}, (_, j) => {
      const start = now - (j + 1) * slotDuration;
      const end = now - j * slotDuration;
      return events.filter(e => e.timestamp && e.timestamp >= start && e.timestamp < end).length;
    }));
    
    timeline.push({
      time: new Date(slotEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      count,
      intensity: maxCount > 0 ? count / maxCount : 0
    });
  }
  
  return timeline;
};

// Filter helper functions
const getToolIcon = (toolName: string): string => {
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
    'User Input': '💬',
    'System Notification': '🔔',
    'Session End': '🛑',
    'Sub-agent Complete': '✅',
    'NotebookRead': '📓',
    'NotebookEdit': '📝',
    'WebSearch': '🔍'
  };
  return toolIcons[toolName] || '🔧';
};

const formatSessionId = (sessionId: string): string => {
  const parts = sessionId.split('_');
  if (parts.length >= 3) {
    return `${parts[0].slice(0, 4)}:${parts[1]}`;
  }
  return sessionId.slice(0, 8) + '...';
};

const getRecentToolUsage = (events: HookEvent[]): Array<{
  name: string;
  count: number;
  timeAgo: string;
  icon: string;
  isActive: boolean;
  isRecent: boolean;
  lastUsed: number;
}> => {
  const now = Date.now();
  const toolUsage = new Map<string, {
    count: number;
    lastUsed: number;
    firstUsed: number;
  }>();
  
  // Extract tool names from events
  events.forEach(event => {
    let toolName = '';
    
    // Extract tool name from different sources
    if (event.payload?.tool_name) {
      toolName = event.payload.tool_name;
    } else if (event.hook_event_type === 'PostToolUse' && event.payload?.name) {
      toolName = event.payload.name;
    } else if (event.hook_event_type === 'PreToolUse' && event.payload?.name) {
      toolName = event.payload.name;
    } else {
      // Map hook event types to tool names
      const hookTypeToTool: Record<string, string> = {
        'UserPromptSubmit': 'User Input',
        'Notification': 'System Notification',
        'Stop': 'Session End',
        'SubagentStop': 'Sub-agent Complete'
      };
      toolName = hookTypeToTool[event.hook_event_type] || event.hook_event_type;
    }
    
    if (toolName) {
      const existing = toolUsage.get(toolName) || { count: 0, lastUsed: 0, firstUsed: event.timestamp || 0 };
      toolUsage.set(toolName, {
        count: existing.count + 1,
        lastUsed: Math.max(existing.lastUsed, event.timestamp || 0),
        firstUsed: Math.min(existing.firstUsed, event.timestamp || 0)
      });
    }
  });
  
  // Tool icons mapping
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
    'User Input': '💬',
    'System Notification': '🔔',
    'Session End': '🛑',
    'Sub-agent Complete': '✅',
    'NotebookRead': '📓',
    'NotebookEdit': '📝',
    'WebSearch': '🔍'
  };
  
  // Convert to array and sort by last used time
  return Array.from(toolUsage.entries())
    .map(([name, usage]) => {
      const timeDiff = now - usage.lastUsed;
      const isActive = timeDiff < 30000; // Active if used in last 30 seconds
      const isRecent = timeDiff < 300000; // Recent if used in last 5 minutes
      
      let timeAgo = 'now';
      if (timeDiff >= 1000) {
        const seconds = Math.floor(timeDiff / 1000);
        if (seconds < 60) timeAgo = `${seconds}s ago`;
        else if (seconds < 3600) timeAgo = `${Math.floor(seconds / 60)}m ago`;
        else timeAgo = `${Math.floor(seconds / 3600)}h ago`;
      }
      
      return {
        name,
        count: usage.count,
        timeAgo,
        icon: toolIcons[name] || '🔧',
        isActive,
        isRecent,
        lastUsed: usage.lastUsed
      };
    })
    .sort((a, b) => b.lastUsed - a.lastUsed);
};

// Event handlers
const selectSession = (sessionId: string) => {
  emit('selectSession', sessionId);
};

const filterByApplication = (appName: string) => {
  emit('filterByApp', appName);
};

const viewAllSessions = (appName: string) => {
  emit('viewAllSessions', appName);
};

// Agent-specific computed properties and functions
const totalAgentExecutions = computed(() => {
  let agentCount = 0;
  Object.values(groupedByApplication.value).forEach(appEvents => {
    agentCount += getAppAgentCount(appEvents);
  });
  return agentCount;
});

// Agent detection logic (same as AgentDashboard)
const detectAgentSession = (events: HookEvent[]): boolean => {
  const hasTaskTool = events.some(event => 
    event.hook_event_type === 'PreToolUse' && 
    event.payload.tool_name === 'Task'
  );
  
  const hasMultipleTools = new Set(
    events
      .filter(event => event.hook_event_type === 'PreToolUse')
      .map(event => event.payload.tool_name)
  ).size >= 2;
  
  const hasAgentKeywords = events.some(event => {
    const content = JSON.stringify(event.payload).toLowerCase();
    return content.includes('agent') || 
           content.includes('subagent') || 
           content.includes('spawn') ||
           content.includes('claude/agents') ||
           event.payload.metadata?.agent_type;
  });
  
  return hasTaskTool || (hasMultipleTools && hasAgentKeywords);
};

const extractAgentName = (description: string): string => {
  const patterns = [
    /agent[:\s]+([a-zA-Z0-9-_]+)/i,
    /subagent[:\s]+([a-zA-Z0-9-_]+)/i,
    /([a-zA-Z0-9-_]+)\.md/i,
    /([a-zA-Z0-9-_]+)\s+agent/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  
  return 'Agent Task';
};

const getAgentIcon = (agentType?: string): string => {
  const agentIcons: Record<string, string> = {
    'general-purpose': '🤖',
    'project-file-reader': '📁',
    'lesson-generator': '📚',
    'redis-context-loader': '💾',
    'codex-session-analyzer': '🔍',
    'screenshot-analyzer': '📸',
    'redis-cache-manager': '⚡',
    'session-archive-manager': '📦',
    'file-size-optimizer': '📏',
    'mcp-parallel-store': '🔄',
    'context-aggregator': '🧩',
    'export-file-writer': '📄',
    'redis-session-store': '💿',
    'handoff-doc-finder': '🔗',
    'redis-conversation-store': '💬',
    'lesson-complexity-analyzer': '📊',
    'base64-data-decoder': '🔓',
    'git-context-collector': '🌿'
  };
  return agentIcons[agentType || 'generic'] || '🤖';
};

// Helper functions for agent metrics per application
const getAppAgentCount = (events: HookEvent[]): number => {
  const sessionGroups = new Map<string, HookEvent[]>();
  
  events.forEach(event => {
    if (!sessionGroups.has(event.session_id)) {
      sessionGroups.set(event.session_id, []);
    }
    sessionGroups.get(event.session_id)!.push(event);
  });
  
  let agentCount = 0;
  sessionGroups.forEach((sessionEvents) => {
    if (detectAgentSession(sessionEvents)) {
      agentCount++;
    }
  });
  
  return agentCount;
};

const getAppAgents = (events: HookEvent[]): Array<{
  name: string;
  type: string;
  icon: string;
  executions: number;
  successRate: number;
}> => {
  const sessionGroups = new Map<string, HookEvent[]>();
  
  events.forEach(event => {
    if (!sessionGroups.has(event.session_id)) {
      sessionGroups.set(event.session_id, []);
    }
    sessionGroups.get(event.session_id)!.push(event);
  });
  
  const agentMap = new Map<string, {
    type: string;
    executions: number;
    successes: number;
  }>();
  
  sessionGroups.forEach((sessionEvents) => {
    if (detectAgentSession(sessionEvents)) {
      let agentName = 'Investigation Session';
      let agentType = 'generic';
      
      const taskEvents = sessionEvents.filter(event => 
        event.hook_event_type === 'PreToolUse' && event.payload.tool_name === 'Task'
      );
      
      if (taskEvents.length > 0) {
        const taskData = taskEvents[0].payload.tool_input;
        if (taskData?.description) {
          agentName = extractAgentName(taskData.description);
        }
        if (taskData?.subagent_type) {
          agentType = taskData.subagent_type;
        }
      }
      
      const hasError = sessionEvents.some(event => 
        event.hook_event_type === 'PostToolUse' && 
        event.payload.tool_output?.error
      );
      
      const existing = agentMap.get(agentName) || { type: agentType, executions: 0, successes: 0 };
      agentMap.set(agentName, {
        type: agentType,
        executions: existing.executions + 1,
        successes: existing.successes + (hasError ? 0 : 1)
      });
    }
  });
  
  return Array.from(agentMap.entries())
    .map(([name, data]) => ({
      name,
      type: data.type,
      icon: getAgentIcon(data.type),
      executions: data.executions,
      successRate: data.executions > 0 ? Math.round((data.successes / data.executions) * 100) : 0
    }))
    .sort((a, b) => b.executions - a.executions);
};

const analyzeApplication = (appName: string) => {
  console.log('Analyzing application:', appName);
  // Future: implement application analysis
};

const filterByTool = (appName: string, toolName: string) => {
  emit('filterByTool', appName, toolName);
};

const filterByAgent = (appName: string, agentName: string) => {
  // For now, filter by session to show agent-related events
  // In a future enhancement, we could add a specific agent filter
  console.log('Filter by agent:', appName, agentName);
  emit('filterByApp', appName);
};

// Filter management event handlers
const clearAppFilter = () => {
  emit('clearFilter', 'sourceApp');
};

const clearToolFilter = () => {
  emit('clearFilter', 'toolName');
};

const clearSessionFilter = () => {
  emit('clearFilter', 'sessionId');
};

const clearAllFilters = () => {
  emit('clearAllFilters');
};
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4B5563 #1F2937;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1F2937;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}

.application-card-enter-active,
.application-card-leave-active {
  transition: all 0.3s ease;
}

.application-card-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.application-card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>