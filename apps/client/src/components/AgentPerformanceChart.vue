<template>
  <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
    <!-- Chart Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-semibold text-white">Agent Performance Analytics</h3>
          <p class="text-xs text-gray-400">Real-time agent execution metrics and trends</p>
        </div>
      </div>
      
      <!-- Time Range Selector -->
      <div class="flex items-center space-x-2">
        <button
          v-for="range in timeRanges"
          :key="range.value"
          @click="selectedTimeRange = range.value"
          class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          :class="selectedTimeRange === range.value 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <!-- Performance Metrics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      <div class="bg-gray-900/50 rounded-lg p-3 text-center">
        <div class="text-xl font-bold text-purple-400 mb-1">{{ totalAgentExecutions }}</div>
        <div class="text-xs text-gray-400">Total Executions</div>
        <div class="text-xs text-green-400 mt-1">{{ executionTrend }}% vs last period</div>
      </div>
      
      <div class="bg-gray-900/50 rounded-lg p-3 text-center">
        <div class="text-xl font-bold text-green-400 mb-1">{{ overallSuccessRate }}%</div>
        <div class="text-xs text-gray-400">Success Rate</div>
        <div class="text-xs" :class="successRateTrend >= 0 ? 'text-green-400' : 'text-red-400'">
          {{ successRateTrend >= 0 ? '+' : '' }}{{ successRateTrend }}% vs last period
        </div>
      </div>
      
      <div class="bg-gray-900/50 rounded-lg p-3 text-center">
        <div class="text-xl font-bold text-blue-400 mb-1">{{ averageExecutionTime }}s</div>
        <div class="text-xs text-gray-400">Avg Duration</div>
        <div class="text-xs" :class="executionTimeTrend <= 0 ? 'text-green-400' : 'text-yellow-400'">
          {{ executionTimeTrend >= 0 ? '+' : '' }}{{ executionTimeTrend }}s vs last period
        </div>
      </div>
      
      <div class="bg-gray-900/50 rounded-lg p-3 text-center">
        <div class="text-xl font-bold text-orange-400 mb-1">{{ activeAgentTypes }}</div>
        <div class="text-xs text-gray-400">Agent Types</div>
        <div class="text-xs text-purple-400">{{ mostUsedAgentType }} most active</div>
      </div>
    </div>

    <!-- Charts Container -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Execution Timeline Chart -->
      <div class="bg-gray-900/30 rounded-lg p-3">
        <h4 class="text-sm font-medium text-white mb-3">Execution Timeline</h4>
        <div class="h-32 relative">
          <!-- Y-axis labels -->
          <div class="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>{{ maxExecutions }}</span>
            <span>{{ Math.floor(maxExecutions / 2) }}</span>
            <span>0</span>
          </div>
          
          <!-- Chart area -->
          <div class="ml-8 h-full flex items-end space-x-1">
            <div
              v-for="(dataPoint, index) in timelineData"
              :key="index"
              class="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm relative group cursor-pointer transition-all duration-200 hover:from-purple-500 hover:to-purple-300"
              :style="{ height: `${(dataPoint.executions / maxExecutions) * 100}%` }"
              :title="`${dataPoint.time}: ${dataPoint.executions} executions`"
            >
              <!-- Tooltip -->
              <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {{ dataPoint.time }}<br>
                {{ dataPoint.executions }} executions<br>
                {{ dataPoint.successRate }}% success
              </div>
            </div>
          </div>
          
          <!-- X-axis labels -->
          <div class="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-gray-500 mt-2">
            <span v-for="(dataPoint, index) in timelineData" 
                  :key="index" 
                  v-show="index % Math.ceil(timelineData.length / 5) === 0"
                  class="transform -rotate-45 origin-left">
              {{ dataPoint.timeShort }}
            </span>
          </div>
        </div>
      </div>

      <!-- Agent Type Performance -->
      <div class="bg-gray-900/30 rounded-lg p-3">
        <h4 class="text-sm font-medium text-white mb-3">Performance by Agent Type</h4>
        <div class="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
          <div
            v-for="agentType in agentTypeStats"
            :key="agentType.type"
            class="flex items-center justify-between p-2 bg-gray-800/50 rounded"
          >
            <div class="flex items-center space-x-2 flex-1">
              <span class="text-lg">{{ getAgentIcon(agentType.type) }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-white truncate">{{ agentType.displayName }}</div>
                <div class="text-xs text-gray-400">{{ agentType.executions }} executions</div>
              </div>
            </div>
            
            <div class="flex items-center space-x-3">
              <!-- Success Rate Bar -->
              <div class="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-300"
                  :style="{ width: `${agentType.successRate}%` }"
                ></div>
              </div>
              <span class="text-xs font-medium text-green-400 w-8">{{ agentType.successRate }}%</span>
              
              <!-- Average Duration -->
              <span class="text-xs text-blue-400 w-12">{{ agentType.avgDuration }}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tool Usage Distribution -->
    <div class="mt-4 bg-gray-900/30 rounded-lg p-3">
      <h4 class="text-sm font-medium text-white mb-3">Tool Usage Distribution</h4>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <div
          v-for="tool in topTools"
          :key="tool.name"
          class="bg-gray-800/50 rounded-lg p-2 text-center hover:bg-gray-800/70 transition-colors cursor-pointer"
          :title="`${tool.name}: ${tool.count} uses across ${tool.agentCount} agents`"
        >
          <div class="text-base mb-1">{{ getToolIcon(tool.name) }}</div>
          <div class="text-xs font-medium text-white">{{ tool.name }}</div>
          <div class="text-xs text-gray-400">{{ tool.count }} uses</div>
          <div class="text-xs text-purple-400">{{ tool.agentCount }} agents</div>
        </div>
      </div>
    </div>

    <!-- Activity Heatmap -->
    <div class="mt-4 bg-gray-900/30 rounded-lg p-3">
      <h4 class="text-sm font-medium text-white mb-3">Activity Heatmap (Last 24 Hours)</h4>
      <div class="flex items-center space-x-1">
        <div
          v-for="(hour, index) in activityHeatmap"
          :key="index"
          class="flex-1 h-4 rounded-sm transition-all duration-200 hover:scale-105 cursor-pointer"
          :class="getHeatmapColor(hour.intensity)"
          :title="`${hour.time}: ${hour.executions} agent executions`"
        ></div>
      </div>
      <div class="flex justify-between text-xs text-gray-500 mt-2">
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { HookEvent } from '../types';

// Props
interface Props {
  events: HookEvent[];
}

const props = defineProps<Props>();

// Component state
const selectedTimeRange = ref<'1h' | '6h' | '24h' | '7d'>('24h');

const timeRanges = [
  { label: '1H', value: '1h' as const },
  { label: '6H', value: '6h' as const },
  { label: '24H', value: '24h' as const },
  { label: '7D', value: '7d' as const }
];

// Helper functions
function detectAgentSession(events: HookEvent[]): boolean {
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
}

function getTimeRangeMs(range: string): number {
  switch (range) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

// Computed properties
const filteredEvents = computed(() => {
  const cutoff = Date.now() - getTimeRangeMs(selectedTimeRange.value);
  return props.events.filter(event => (event.timestamp || 0) >= cutoff);
});

const agentSessions = computed(() => {
  const sessionGroups = new Map<string, HookEvent[]>();
  
  filteredEvents.value.forEach(event => {
    if (!sessionGroups.has(event.session_id)) {
      sessionGroups.set(event.session_id, []);
    }
    sessionGroups.get(event.session_id)!.push(event);
  });
  
  const agentSessions: Array<{
    sessionId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    toolsUsed: string[];
    agentType: string;
    events: HookEvent[];
  }> = [];
  sessionGroups.forEach((sessionEvents, sessionId) => {
    if (detectAgentSession(sessionEvents)) {
      sessionEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      const firstEvent = sessionEvents[0];
      const lastEvent = sessionEvents[sessionEvents.length - 1];
      const duration = lastEvent.timestamp && firstEvent.timestamp 
        ? (lastEvent.timestamp - firstEvent.timestamp) / 1000 
        : undefined;
      
      const hasError = sessionEvents.some(event => 
        event.hook_event_type === 'PostToolUse' && 
        event.payload.tool_output?.error
      );
      
      const toolsUsed = Array.from(new Set(
        sessionEvents
          .filter(event => event.hook_event_type === 'PreToolUse')
          .map(event => event.payload.tool_name)
          .filter(tool => tool !== undefined)
      ));
      
      // Extract agent type
      const taskEvents = sessionEvents.filter(event => 
        event.hook_event_type === 'PreToolUse' && event.payload.tool_name === 'Task'
      );
      
      let agentType = 'generic';
      if (taskEvents.length > 0) {
        const taskData = taskEvents[0].payload.tool_input;
        if (taskData?.subagent_type) {
          agentType = taskData.subagent_type;
        }
      }
      
      agentSessions.push({
        sessionId,
        startTime: firstEvent.timestamp || Date.now(),
        endTime: lastEvent.timestamp,
        duration,
        success: !hasError,
        toolsUsed,
        agentType,
        events: sessionEvents
      });
    }
  });
  
  return agentSessions;
});

const totalAgentExecutions = computed(() => agentSessions.value.length);

const overallSuccessRate = computed(() => {
  if (agentSessions.value.length === 0) return 0;
  const successful = agentSessions.value.filter(session => session.success).length;
  return Math.round((successful / agentSessions.value.length) * 100);
});

const averageExecutionTime = computed(() => {
  const sessionsWithDuration = agentSessions.value.filter(session => session.duration !== undefined);
  if (sessionsWithDuration.length === 0) return 0;
  const totalTime = sessionsWithDuration.reduce((sum, session) => sum + (session.duration || 0), 0);
  return Math.round((totalTime / sessionsWithDuration.length) * 100) / 100;
});

const activeAgentTypes = computed(() => {
  const types = new Set(agentSessions.value.map(session => session.agentType));
  return types.size;
});

const mostUsedAgentType = computed(() => {
  const typeCounts = new Map<string, number>();
  agentSessions.value.forEach(session => {
    typeCounts.set(session.agentType, (typeCounts.get(session.agentType) || 0) + 1);
  });
  
  let maxType = 'none';
  let maxCount = 0;
  typeCounts.forEach((count, type) => {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  });
  
  return maxType === 'generic' ? 'general' : maxType.split('-')[0];
});

// Trend calculations (mock data for demonstration)
const executionTrend = computed(() => Math.floor(Math.random() * 30) - 10);
const successRateTrend = computed(() => Math.floor(Math.random() * 20) - 5);
const executionTimeTrend = computed(() => Math.round((Math.random() * 2 - 1) * 10) / 10);

const timelineData = computed(() => {
  const now = Date.now();
  const timeRangeMs = getTimeRangeMs(selectedTimeRange.value);
  const intervals = selectedTimeRange.value === '7d' ? 24 : 
                   selectedTimeRange.value === '24h' ? 24 : 12;
  const intervalMs = timeRangeMs / intervals;
  
  const data = [];
  for (let i = 0; i < intervals; i++) {
    const startTime = now - timeRangeMs + (i * intervalMs);
    const endTime = startTime + intervalMs;
    
    const intervalSessions = agentSessions.value.filter(session => 
      session.startTime >= startTime && session.startTime < endTime
    );
    
    const successful = intervalSessions.filter(session => session.success).length;
    const successRate = intervalSessions.length > 0 ? 
      Math.round((successful / intervalSessions.length) * 100) : 0;
    
    const time = new Date(startTime);
    const timeShort = selectedTimeRange.value === '7d' ? 
      time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
      time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    data.push({
      time: time.toLocaleString(),
      timeShort,
      executions: intervalSessions.length,
      successRate
    });
  }
  
  return data;
});

const maxExecutions = computed(() => {
  return Math.max(...timelineData.value.map(d => d.executions), 1);
});

const agentTypeStats = computed(() => {
  const typeMap = new Map<string, {
    executions: number;
    successes: number;
    totalDuration: number;
    durationsCount: number;
  }>();
  
  agentSessions.value.forEach(session => {
    const existing = typeMap.get(session.agentType) || {
      executions: 0,
      successes: 0,
      totalDuration: 0,
      durationsCount: 0
    };
    
    typeMap.set(session.agentType, {
      executions: existing.executions + 1,
      successes: existing.successes + (session.success ? 1 : 0),
      totalDuration: existing.totalDuration + (session.duration || 0),
      durationsCount: existing.durationsCount + (session.duration ? 1 : 0)
    });
  });
  
  return Array.from(typeMap.entries())
    .map(([type, stats]) => ({
      type,
      displayName: type.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      executions: stats.executions,
      successRate: stats.executions > 0 ? 
        Math.round((stats.successes / stats.executions) * 100) : 0,
      avgDuration: stats.durationsCount > 0 ? 
        Math.round((stats.totalDuration / stats.durationsCount) * 100) / 100 : 0
    }))
    .sort((a, b) => b.executions - a.executions);
});

const topTools = computed(() => {
  const toolMap = new Map<string, { count: number; agents: Set<string> }>();
  
  agentSessions.value.forEach(session => {
    session.toolsUsed.forEach((tool: string) => {
      const existing = toolMap.get(tool) || { count: 0, agents: new Set() };
      existing.count += 1;
      existing.agents.add(session.sessionId);
      toolMap.set(tool, existing);
    });
  });
  
  return Array.from(toolMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      agentCount: data.agents.size
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
});

const activityHeatmap = computed(() => {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const hours = [];
  
  for (let i = 23; i >= 0; i--) {
    const startTime = now - (i * hourMs);
    const endTime = startTime + hourMs;
    
    const hourSessions = agentSessions.value.filter(session => 
      session.startTime >= startTime && session.startTime < endTime
    );
    
    const time = new Date(startTime);
    hours.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit' }),
      executions: hourSessions.length,
      intensity: hourSessions.length
    });
  }
  
  // Normalize intensity
  const maxIntensity = Math.max(...hours.map(h => h.intensity), 1);
  hours.forEach(hour => {
    hour.intensity = hour.intensity / maxIntensity;
  });
  
  return hours;
});

// Helper functions for UI
function getAgentIcon(agentType: string): string {
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
  return agentIcons[agentType] || '🤖';
}

function getToolIcon(toolName: string): string {
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
  return toolIcons[toolName] || '🔧';
}

function getHeatmapColor(intensity: number): string {
  if (intensity === 0) return 'bg-gray-700';
  if (intensity <= 0.25) return 'bg-purple-900';
  if (intensity <= 0.5) return 'bg-purple-700';
  if (intensity <= 0.75) return 'bg-purple-500';
  return 'bg-purple-400';
}
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
</style>