<template>
  <div class="h-full overflow-y-auto p-4 bg-gray-950">
    <!-- Agent Dashboard Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">Agent Operations</h1>
            <p class="text-sm text-gray-400">Monitor AI agent executions and performance in realtime</p>
          </div>
        </div>
        
        <!-- Dashboard Controls -->
        <div class="flex items-center space-x-3">
          <!-- Time Range Selector -->
          <div class="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
            <button
              v-for="option in timeRangeOptions"
              :key="option.value"
              @click="agentMetrics.selectedTimeRange.value = option.value"
              class="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              :class="agentMetrics.selectedTimeRange.value === option.value 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'"
            >
              {{ option.label }}
            </button>
          </div>
          
          <!-- Action Buttons -->
          <button
            @click="handleRefreshData"
            :disabled="agentMetrics.isLoadingData.value"
            class="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-gray-300 transition-colors flex items-center space-x-2"
          >
            <svg 
              class="w-4 h-4" 
              :class="agentMetrics.isLoadingData.value ? 'animate-spin' : ''"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
          
          <button
            @click="agentMetrics.exportMetrics"
            class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white transition-colors flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export</span>
          </button>
        </div>
      </div>
      
      <!-- Last Update Indicator -->
      <div class="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>Last updated: {{ formatLastUpdate(agentMetrics.lastUpdate.value) }}</span>
        <div class="flex items-center space-x-2">
          <div 
            class="w-2 h-2 rounded-full"
            :class="agentMetrics.isRealtimeConnected.value ? 'bg-green-400 animate-pulse' : 'bg-red-400'"
          ></div>
          <span>{{ agentMetrics.isRealtimeConnected.value ? 'Live' : 'Disconnected' }}</span>
        </div>
      </div>
    </div>

    <!-- Notification Area -->
    <div v-if="errorMessage || successMessage" class="mb-6">
      <!-- Error Message -->
      <div 
        v-if="errorMessage"
        class="bg-red-900/50 border border-red-500/50 rounded-lg p-4 mb-4 flex items-center justify-between animate-fade-in"
      >
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 class="text-red-300 font-medium">Error</h4>
            <p class="text-red-200 text-sm">{{ errorMessage }}</p>
          </div>
        </div>
        <button
          @click="errorMessage = null"
          class="text-red-400 hover:text-red-300 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Success Message -->
      <div 
        v-if="successMessage"
        class="bg-green-900/50 border border-green-500/50 rounded-lg p-4 mb-4 flex items-center justify-between animate-fade-in"
      >
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h4 class="text-green-300 font-medium">Success</h4>
            <p class="text-green-200 text-sm">{{ successMessage }}</p>
          </div>
        </div>
        <button
          @click="successMessage = null"
          class="text-green-400 hover:text-green-300 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Real-time Metrics Overview -->
    <div class="mb-6">
      <AgentMetricsChart
        title="Performance Metrics"
        subtitle="Key performance indicators with trends"
        chart-type="metrics"
        :metrics-data="metricsCardsData"
        :is-loading="agentMetrics.isLoadingData.value"
        @metric-click="handleMetricClick"
      />
    </div>

    <!-- Interactive Visualizations Grid -->
    <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Execution Timeline Chart -->
      <AgentMetricsChart
        title="Execution Timeline"
        subtitle="Agent execution patterns over time"
        chart-type="timeline"
        :timeline-data="agentMetrics.timelineData.value"
        :selected-time-range="agentMetrics.selectedTimeRange.value"
        :time-range-options="timeRangeOptions"
        :is-loading="agentMetrics.isLoadingData.value"
        show-time-range
        show-export
        @time-range-change="handleTimeRangeChange"
        @point-hover="(data: any) => handleTimelineHover(data, 0)"
        @point-click="(data: any) => handleTimelineClick(data, 0)"
        @export="exportTimelineData"
      />

      <!-- Agent Types Distribution -->
      <AgentMetricsChart
        title="Agent Type Performance"
        subtitle="Success rates and usage by agent type"
        chart-type="agent-types"
        :agent-type-data="agentMetrics.agentTypeDistribution.value"
        :is-loading="agentMetrics.isLoadingData.value"
        show-export
        @type-filter="handleTypeFilter"
        @type-hover="handleTypeHover"
        @export="exportAgentTypeData"
      />
    </div>

    <!-- Tool Usage and Performance Analysis -->
    <div class="mb-6">
      <AgentMetricsChart
        title="Tool Usage Distribution"
        subtitle="Most frequently used tools and their success rates"
        chart-type="tool-usage"
        :tool-usage-data="agentMetrics.toolUsage.value"
        :is-loading="agentMetrics.isLoadingData.value"
        show-export
        @tool-click="handleToolClick"
        @tool-hover="handleToolHover"
        @export="exportToolUsageData"
      />
    </div>

    <!-- Session Relationships and Tree View -->
    <div class="mb-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Relationship Statistics -->
      <div class="xl:col-span-1">
        <RelationshipStats
          :auto-refresh="true"
          :refresh-interval="30000"
          @stats-updated="handleStatsUpdated"
          @error="handleRelationshipError"
        />
      </div>
      
      <!-- Session Tree -->
      <div class="xl:col-span-2">
        <div class="bg-gray-950 rounded-lg border border-gray-800 h-96">
          <SessionTree
            :recent-session-ids="recentSessionIds"
            @session-select="handleSessionSelect"
            @session-navigate="handleSessionNavigate"
          />
        </div>
      </div>
    </div>

    <!-- Agent Executions Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <TransitionGroup name="agent-card">
        <AgentExecutionCard
          v-for="agentSession in agentSessions"
          :key="agentSession.sessionId"
          :agent-session="agentSession"
          :session-color="getSessionColor(agentSession.sessionId)"
          :app-color="getAppColor(agentSession.sourceApp)"
          @view-details="handleViewDetails"
          @expand-tools="handleExpandTools"
        />
      </TransitionGroup>
    </div>

    <!-- Enhanced Empty State -->
    <div v-if="agentMetrics.metrics.value.totalExecutions === 0" class="text-center py-16">
      <div class="text-8xl mb-6">🤖</div>
      <h3 class="text-xl font-semibold text-white mb-2">No Agent Activity</h3>
      <p class="text-gray-400 mb-6">Start monitoring your AI agents with realtime performance insights</p>
      
      <!-- Run Test Agent Button -->
      <button
        @click="handleRunTestAgent"
        :disabled="agentMetrics.isLoadingData.value"
        class="mb-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto"
      >
        <svg 
          v-if="!agentMetrics.isLoadingData.value"
          class="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M6 20l4-16 4 16H6z" />
        </svg>
        <svg 
          v-else
          class="w-5 h-5 animate-spin" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ agentMetrics.isLoadingData.value ? 'Running...' : 'Run Test Agent' }}</span>
      </button>
      
      <div class="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
        <h4 class="text-sm font-medium text-white mb-4">What are Agent Operations?</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
          <div class="text-center">
            <div class="text-2xl mb-2">⚡</div>
            <div class="font-medium text-white mb-1">Real-time Monitoring</div>
            <div>Track agent executions, success rates, and performance metrics live</div>
          </div>
          <div class="text-center">
            <div class="text-2xl mb-2">📊</div>
            <div class="font-medium text-white mb-1">Interactive Analytics</div>
            <div>Visualize execution timelines, tool usage, and agent type performance</div>
          </div>
          <div class="text-center">
            <div class="text-2xl mb-2">🎯</div>
            <div class="font-medium text-white mb-1">Actionable Insights</div>
            <div>Export data, filter by metrics, and optimize agent workflows</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent Session Cards (for backward compatibility) -->
    <div v-if="agentMetrics.metrics.value.totalExecutions > 0 && agentSessions.length > 0" class="mb-6">
      <h3 class="text-lg font-semibold text-white mb-4">Recent Agent Executions</h3>
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <TransitionGroup name="agent-card">
          <AgentExecutionCard
            v-for="agentSession in agentSessions.slice(0, 6)"
            :key="agentSession.sessionId"
            :agent-session="agentSession"
            :session-color="getSessionColor(agentSession.sessionId)"
            :app-color="getAppColor(agentSession.sourceApp)"
            @view-details="handleViewDetails"
            @expand-tools="handleExpandTools"
          />
        </TransitionGroup>
      </div>
    </div>

    <!-- Agent Execution Detail Modal -->
    <AgentDetailModal
      v-if="selectedAgentSession"
      :is-open="showAgentDetail"
      :agent-session="selectedAgentSession"
      :session-color="getSessionColor(selectedAgentSession.sessionId)"
      @close="showAgentDetail = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue';
import type { HookEvent } from '../types';
import AgentExecutionCard from './AgentExecutionCard.vue';
import AgentDetailModal from './AgentDetailModal.vue';
import AgentMetricsChart from './AgentMetricsChart.vue';
import SessionTree from './SessionTree.vue';
import RelationshipStats from './RelationshipStats.vue';
import { useAgentMetrics } from '../composables/useAgentMetrics';

// Props
interface Props {
  events: HookEvent[];
  getSessionColor: (sessionId: string) => string;
  getAppColor: (appName: string) => string;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'session-select': [sessionId: string];
  'event-click': [event: HookEvent];
}>();

// Component state
const showAgentDetail = ref(false);
const selectedAgentSession = ref<AgentSessionData | null>(null);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Recent session IDs for tree component
const recentSessionIds = computed(() => {
  return Array.from(new Set(
    props.events
      .slice(-50) // Last 50 events
      .map(event => event.session_id)
  )).slice(0, 10); // Top 10 unique sessions
});

// Agent session data structure (for backward compatibility)
interface AgentSessionData {
  sessionId: string;
  sourceApp: string;
  agentName?: string;
  agentType?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  toolsUsed: string[];
  tokenUsage?: number;
  returnData?: any;
  events: HookEvent[];
  errorMessage?: string;
}

// Initialize agent metrics composable
const agentMetrics = useAgentMetrics(toRef(props, 'events'));

// Time range options for the dashboard
const timeRangeOptions = computed(() => agentMetrics.timeRangeOptions);

// Metrics cards data for the performance overview
const metricsCardsData = computed(() => [
  {
    key: 'total-executions',
    title: 'Total Executions',
    value: agentMetrics.metrics.value.totalExecutions,
    trend: agentMetrics.executionTrend.value,
    icon: '⚡',
    color: 'purple',
    format: 'number' as const
  },
  {
    key: 'success-rate',
    title: 'Success Rate',
    value: agentMetrics.metrics.value.successRate,
    trend: agentMetrics.successRateTrend.value,
    icon: '✅',
    color: 'green',
    format: 'percentage' as const
  },
  {
    key: 'avg-duration',
    title: 'Avg Duration',
    value: agentMetrics.metrics.value.avgDuration,
    icon: '⏱️',
    color: 'blue',
    format: 'duration' as const
  },
  {
    key: 'agent-types',
    title: 'Agent Types',
    value: agentMetrics.metrics.value.agentTypes,
    icon: '🤖',
    color: 'cyan',
    format: 'number' as const
  },
  {
    key: 'active-agents',
    title: 'Active Agents',
    value: agentMetrics.metrics.value.activeAgents,
    icon: '🔄',
    color: 'yellow',
    format: 'number' as const
  },
  {
    key: 'total-tokens',
    title: 'Total Tokens',
    value: agentMetrics.metrics.value.totalTokensUsed,
    icon: '🔤',
    color: 'indigo',
    format: 'number' as const
  },
  {
    key: 'avg-tokens',
    title: 'Avg Tokens',
    value: agentMetrics.metrics.value.avgTokensPerAgent,
    icon: '💬',
    color: 'pink',
    format: 'number' as const
  },
  {
    key: 'tools-used',
    title: 'Tools Used',
    value: agentMetrics.metrics.value.toolsUsed,
    icon: '🔧',
    color: 'orange',
    format: 'number' as const
  }
]);

// Simplified agent sessions for backward compatibility (limited to recent sessions)
const agentSessions = computed((): AgentSessionData[] => {
  // This is a simplified version that works with existing components
  // The main analytics are now handled by the useAgentMetrics composable
  const sessionGroups = new Map<string, HookEvent[]>();
  
  // Only process recent events for display
  const recentEvents = props.events.slice(-100); // Last 100 events
  
  recentEvents.forEach(event => {
    if (!sessionGroups.has(event.session_id)) {
      sessionGroups.set(event.session_id, []);
    }
    sessionGroups.get(event.session_id)!.push(event);
  });
  
  const agentSessions: AgentSessionData[] = [];
  
  sessionGroups.forEach((sessionEvents, sessionId) => {
    sessionEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    if (detectAgentSession(sessionEvents)) {
      const agentData = analyzeAgentSession(sessionId, sessionEvents);
      agentSessions.push(agentData);
    }
  });
  
  return agentSessions.sort((a, b) => b.startTime - a.startTime).slice(0, 12); // Limit to 12 recent sessions
});

// Helper functions
function detectAgentSession(events: HookEvent[]): boolean {
  // Enhanced agent detection - multiple detection strategies:
  
  // Strategy 1: Direct SubagentStop events (highest confidence)
  const hasSubagentStop = events.some(event => 
    event.hook_event_type === 'SubagentStop'
  );
  
  // Strategy 1b: Direct SubagentStart events (high confidence)
  const hasSubagentStart = events.some(event => 
    event.hook_event_type === 'SubagentStart'
  );
  
  // Strategy 2: Task tool usage (high confidence)
  const hasTaskTool = events.some(event => 
    event.hook_event_type === 'PreToolUse' && 
    event.payload.tool_name === 'Task'
  );
  
  // Strategy 3: Agent file operations (medium confidence)
  const hasAgentFileOps = events.some(event => {
    if (event.hook_event_type !== 'PreToolUse') return false;
    const toolInput = event.payload.tool_input;
    if (!toolInput) return false;
    
    // Check for operations on .claude/agents/ files
    const pathFields = [toolInput.file_path, toolInput.path, toolInput.directory];
    return pathFields.some(path => 
      path && typeof path === 'string' && path.includes('.claude/agents')
    );
  });
  
  // Strategy 4: @-mention patterns (medium confidence)
  const hasAgentMentions = events.some(event => {
    const content = JSON.stringify(event.payload).toLowerCase();
    return content.includes('@agent-') || 
           content.includes('@screenshot-analyzer') ||
           content.includes('@debugger') ||
           content.includes('@code-reviewer');
  });
  
  // Strategy 5: Agent keywords with tool usage (lower confidence)
  const hasAgentKeywords = events.some(event => {
    const content = JSON.stringify(event.payload).toLowerCase();
    return content.includes('subagent') || 
           content.includes('claude/agents') ||
           content.includes('agent execution') ||
           content.includes('agent task') ||
           event.payload.metadata?.agent_type;
  });
  
  // Strategy 6: Multiple tool pattern analysis (contextual)
  const toolsUsed = new Set(
    events
      .filter(event => event.hook_event_type === 'PreToolUse')
      .map(event => event.payload.tool_name)
      .filter(tool => tool)
  );
  
  const hasMultipleTools = toolsUsed.size >= 3;
  const hasAgentPatterns = Array.from(toolsUsed).some(tool => 
    ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob'].includes(tool)
  );
  
  // Return true if any high/medium confidence strategy matches
  return hasSubagentStop || 
         hasSubagentStart ||
         hasTaskTool || 
         hasAgentFileOps || 
         hasAgentMentions || 
         (hasAgentKeywords && hasMultipleTools) ||
         (hasMultipleTools && hasAgentPatterns && hasAgentKeywords);
}

function analyzeAgentSession(sessionId: string, events: HookEvent[]): AgentSessionData {
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  
  // Enhanced agent name and type extraction
  let agentName = 'Unknown Agent';
  let agentType = 'generic';
  
  // Strategy 1: Check SubagentStop events first (most reliable)
  const subagentStopEvents = events.filter(event => event.hook_event_type === 'SubagentStop');
  if (subagentStopEvents.length > 0) {
    const stopEvent = subagentStopEvents[0];
    if (stopEvent.payload.agent_name && typeof stopEvent.payload.agent_name === 'string') {
      agentName = stopEvent.payload.agent_name;
      agentType = classifyAgentType(agentName, events);
    }
  }
  
  // Strategy 1b: Check SubagentStart events (also reliable)
  if (agentName === 'Unknown Agent') {
    const subagentStartEvents = events.filter(event => event.hook_event_type === 'SubagentStart');
    if (subagentStartEvents.length > 0) {
      const startEvent = subagentStartEvents[0];
      if ((startEvent.payload.agent_name && typeof startEvent.payload.agent_name === 'string') || 
          (startEvent.payload.subagent_type && typeof startEvent.payload.subagent_type === 'string')) {
        agentName = (typeof startEvent.payload.agent_name === 'string' ? startEvent.payload.agent_name : 
                    typeof startEvent.payload.subagent_type === 'string' ? startEvent.payload.subagent_type : 'Unknown Agent');
        agentType = classifyAgentType(agentName, events);
      }
    }
  }
  
  // Strategy 2: Look for agent name in Task tool usage
  if (agentName === 'Unknown Agent') {
    const taskEvents = events.filter(event => 
      event.hook_event_type === 'PreToolUse' && event.payload.tool_name === 'Task'
    );
    
    // Strategy 3: Look in all events for agent patterns
    let bestDescription = '';
    for (const event of events) {
      if (event.hook_event_type === 'UserPromptSubmit' && event.payload.message) {
        bestDescription = event.payload.message;
        break;
      }
      if (taskEvents.length > 0 && taskEvents[0].payload.tool_input?.description) {
        bestDescription = taskEvents[0].payload.tool_input.description;
      }
    }
    
    // Extract agent name from best available description
    if (bestDescription) {
      agentName = extractAgentName(bestDescription);
      agentType = classifyAgentType(agentName, events);
    }
  }
  
  // Calculate enhanced timing metrics
  const startTime = firstEvent.timestamp || Date.now();
  const endTime = lastEvent.timestamp;
  const duration = endTime ? (endTime - startTime) / 1000 : undefined;
  
  // Enhanced status determination
  let status: 'running' | 'completed' | 'failed' = 'running';
  
  // Check for errors in PostToolUse events
  const hasError = events.some(event => 
    event.hook_event_type === 'PostToolUse' && (
      event.payload.tool_output?.error ||
      event.payload.error ||
      event.error
    )
  );
  
  // Check if session has SubagentStop (indicates completion)
  const hasCompletion = subagentStopEvents.length > 0;
  
  if (hasError) {
    status = 'failed';
  } else if (hasCompletion || (endTime && duration !== undefined && duration > 1)) {
    status = 'completed';
  }
  
  // Extract comprehensive tool usage
  const toolsUsed = Array.from(new Set(
    events
      .filter(event => event.hook_event_type === 'PreToolUse')
      .map(event => event.payload.tool_name)
      .filter(tool => tool !== undefined)
  ));
  
  // Calculate token usage if available
  let tokenUsage = 0;
  events.forEach(event => {
    if (event.payload.token_count) tokenUsage += event.payload.token_count;
    if (event.payload.tokens) tokenUsage += event.payload.tokens;
  });
  
  // Extract return data from final events
  const returnData = extractReturnData(events);
  
  // Generate error message if needed
  let errorMessage: string | undefined;
  if (hasError) {
    const errorEvent = events.find(event => 
      event.hook_event_type === 'PostToolUse' && (
        event.payload.tool_output?.error || event.payload.error || event.error
      )
    );
    if (errorEvent) {
      errorMessage = errorEvent.payload.tool_output?.error || 
                    errorEvent.payload.error || 
                    errorEvent.error || 
                    'Agent execution encountered errors';
    } else {
      errorMessage = 'Agent execution encountered errors';
    }
  }
  
  return {
    sessionId,
    sourceApp: firstEvent.source_app,
    agentName,
    agentType,
    startTime,
    endTime,
    duration,
    status,
    toolsUsed,
    tokenUsage: tokenUsage > 0 ? tokenUsage : undefined,
    returnData,
    events,
    errorMessage
  };
}

function extractAgentName(description: string): string {
  // Enhanced agent name extraction with multiple strategies
  
  // Strategy 1: @-mention patterns (highest priority)
  const mentionPatterns = [
    /@(agent-[a-zA-Z0-9-_]+)/i,
    /@(screenshot-analyzer|debugger|code-reviewer|document-writer|test-automator)/i,
    /@([a-zA-Z0-9-_]+)/i
  ];
  
  for (const pattern of mentionPatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  
  // Strategy 2: Traditional agent patterns
  const agentPatterns = [
    /(?:agent|subagent)[:\s]+([a-zA-Z0-9-_]+)/i,
    /([a-zA-Z0-9-_]+)\.md(?:\s+agent|\s+subagent)?/i,
    /([a-zA-Z0-9-_]+)\s+(?:agent|subagent)/i,
    /use\s+(?:the\s+)?([a-zA-Z0-9-_]+)\s+(?:agent|subagent)/i
  ];
  
  for (const pattern of agentPatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  
  // Strategy 3: Common agent name patterns
  const knownAgents = [
    'screenshot-analyzer', 'debugger', 'code-reviewer', 'document-writer',
    'test-automator', 'performance-optimizer', 'security-scanner',
    'lesson-generator', 'session-analyzer', 'git-context-collector'
  ];
  
  const lowerDesc = description.toLowerCase();
  for (const agent of knownAgents) {
    if (lowerDesc.includes(agent.replace(/-/g, ' ')) || lowerDesc.includes(agent)) {
      return agent.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  
  // Strategy 4: Tool-based inference
  if (lowerDesc.includes('screenshot') || lowerDesc.includes('image')) return 'Screenshot Analyzer';
  if (lowerDesc.includes('debug') || lowerDesc.includes('error')) return 'Debugger';
  if (lowerDesc.includes('review') || lowerDesc.includes('quality')) return 'Code Reviewer';
  if (lowerDesc.includes('test') || lowerDesc.includes('validate')) return 'Test Automator';
  if (lowerDesc.includes('document') || lowerDesc.includes('write')) return 'Document Writer';
  
  return 'Agent Task';
}

function classifyAgentType(agentName: string, events: HookEvent[]): string {
  // Classify agent type based on name and behavior patterns
  const lowerName = agentName.toLowerCase();
  
  // Specialized agent types
  if (lowerName.includes('screenshot') || lowerName.includes('analyzer')) return 'analyzer';
  if (lowerName.includes('debug') || lowerName.includes('troubleshoot')) return 'debugger';
  if (lowerName.includes('review') || lowerName.includes('quality')) return 'reviewer';
  if (lowerName.includes('test') || lowerName.includes('validate')) return 'tester';
  if (lowerName.includes('document') || lowerName.includes('write')) return 'writer';
  if (lowerName.includes('performance') || lowerName.includes('optimize')) return 'optimizer';
  if (lowerName.includes('security') || lowerName.includes('scanner')) return 'security';
  if (lowerName.includes('lesson') || lowerName.includes('generator')) return 'generator';
  if (lowerName.includes('session') || lowerName.includes('context')) return 'context';
  if (lowerName.includes('git') || lowerName.includes('collector')) return 'collector';
  
  // Classify by tool usage patterns
  const toolsUsed = events
    .filter(event => event.hook_event_type === 'PreToolUse')
    .map(event => event.payload.tool_name)
    .filter(tool => tool);
  
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

function extractReturnData(events: HookEvent[]): any {
  // Look for structured return data in PostToolUse events
  const postToolEvents = events.filter(event => event.hook_event_type === 'PostToolUse');
  
  if (postToolEvents.length === 0) return null;
  
  const lastPostTool = postToolEvents[postToolEvents.length - 1];
  const response = lastPostTool.payload.tool_output?.result || lastPostTool.payload.tool_output;
  
  if (!response) return null;
  
  // Try to parse as JSON if it's a string
  if (typeof response === 'string') {
    try {
      return JSON.parse(response);
    } catch {
      // If not JSON, return first 100 chars
      return response.length > 100 ? response.substring(0, 100) + '...' : response;
    }
  }
  
  return response;
}

// Utility functions
function formatLastUpdate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return new Date(timestamp).toLocaleString();
}

// Interactive event handlers
function handleMetricClick(key: string) {
  console.log('Metric clicked:', key);
  // Could implement drill-down functionality
}

function handleTimeRangeChange(range: string) {
  agentMetrics.selectedTimeRange.value = range as any;
}

function handleTimelineHover(data: any, index: number, type?: string) {
  console.log('Timeline hover:', data, index, type);
  // Could show detailed tooltip or highlight related data
}

function handleTimelineClick(data: any, index: number, type?: string) {
  console.log('Timeline click:', data, index, type);
  // Could filter data or show detailed view
}

function handleTypeFilter(type: string) {
  console.log('Type filter:', type);
  // Could implement filtering by agent type
  emit('event-click', {} as HookEvent); // Placeholder for now
}

function handleTypeHover(type: string) {
  console.log('Type hover:', type);
  // Could highlight related data
}

function handleToolClick(tool: string) {
  console.log('Tool click:', tool);
  // Could filter by tool usage
}

function handleToolHover(tool: string) {
  console.log('Tool hover:', tool);
  // Could show tool details
}

// Export functions
function exportTimelineData() {
  const data = {
    timeline: agentMetrics.timelineData.value,
    timeRange: agentMetrics.selectedTimeRange.value,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agent-timeline-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAgentTypeData() {
  const data = {
    agentTypes: agentMetrics.agentTypeDistribution.value,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agent-types-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToolUsageData() {
  const data = {
    tools: agentMetrics.toolUsage.value,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tool-usage-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Handler for refresh button
async function handleRefreshData() {
  try {
    errorMessage.value = null;
    await agentMetrics.refreshData();
    
    if (!agentMetrics.isRealtimeConnected.value) {
      successMessage.value = 'Data refreshed successfully!';
      setTimeout(() => {
        successMessage.value = null;
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to refresh data:', error);
    errorMessage.value = 'Failed to refresh data. Please check your connection and try again.';
    
    setTimeout(() => {
      errorMessage.value = null;
    }, 8000);
  }
}

// Handler for test agent button
async function handleRunTestAgent() {
  try {
    errorMessage.value = null;
    successMessage.value = null;
    
    await agentMetrics.runTestAgent();
    
    successMessage.value = 'Test agent executed successfully! Data will refresh shortly.';
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      successMessage.value = null;
    }, 5000);
    
  } catch (error) {
    console.error('Failed to run test agent:', error);
    errorMessage.value = 'Failed to run test agent. Please try again or check the console for details.';
    
    // Auto-hide error message after 8 seconds
    setTimeout(() => {
      errorMessage.value = null;
    }, 8000);
  }
}

// Backward compatibility event handlers
function handleViewDetails(agentSession: AgentSessionData) {
  selectedAgentSession.value = agentSession;
  showAgentDetail.value = true;
}

function handleExpandTools(agentSession: AgentSessionData) {
  emit('session-select', agentSession.sessionId);
}

// Session relationship event handlers
function handleSessionSelect(sessionId: string) {
  emit('session-select', sessionId);
}

function handleSessionNavigate(sessionId: string) {
  // Find and show the session details
  const session = agentSessions.value.find(s => s.sessionId === sessionId);
  if (session) {
    selectedAgentSession.value = session;
    showAgentDetail.value = true;
  }
}

function handleStatsUpdated(stats: any) {
  console.log('Relationship stats updated:', stats);
  // Could update other components or trigger notifications
}

function handleRelationshipError(error: string) {
  errorMessage.value = error;
  setTimeout(() => {
    errorMessage.value = null;
  }, 8000);
}
</script>

<style scoped>
.agent-card-enter-active,
.agent-card-leave-active {
  transition: all 0.3s ease;
}

.agent-card-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.agent-card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Notification animations */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>