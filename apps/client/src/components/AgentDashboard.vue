<template>
  <div class="h-full overflow-y-auto p-4 bg-gray-950">
    <!-- Agent Dashboard Header -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white">Agent Operations</h1>
            <p class="text-sm text-gray-400">Monitor AI agent executions and performance</p>
          </div>
        </div>
        
        <!-- Agent Metrics Summary -->
        <div class="flex items-center space-x-4">
          <div class="text-center">
            <div class="text-xl font-bold text-purple-400">{{ agentSessions.length }}</div>
            <div class="text-xs text-gray-400">Active Agents</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-green-400">{{ agentSuccessRate }}%</div>
            <div class="text-xs text-gray-400">Success Rate</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-blue-400">{{ avgExecutionTime }}s</div>
            <div class="text-xs text-gray-400">Avg Duration</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent Performance Analytics -->
    <div class="mb-4">
      <AgentPerformanceChart 
        :events="events"
      />
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

    <!-- Empty State -->
    <div v-if="agentSessions.length === 0" class="text-center py-16">
      <div class="text-8xl mb-6">🤖</div>
      <h3 class="text-xl font-semibold text-white mb-2">No Agent Activity</h3>
      <p class="text-gray-400 mb-6">Agent executions will appear here as they run</p>
      <div class="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
        <h4 class="text-sm font-medium text-white mb-3">What are Agent Operations?</h4>
        <ul class="text-sm text-gray-300 space-y-2 text-left">
          <li class="flex items-start space-x-2">
            <span class="text-purple-400 mt-0.5">•</span>
            <span>AI agents created via Task tool or /spawn commands</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-purple-400 mt-0.5">•</span>
            <span>Automated workflows with tool usage and structured returns</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-purple-400 mt-0.5">•</span>
            <span>Performance monitoring with token usage and execution time</span>
          </li>
        </ul>
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
import { ref, computed } from 'vue';
import type { HookEvent } from '../types';
import AgentExecutionCard from './AgentExecutionCard.vue';
import AgentDetailModal from './AgentDetailModal.vue';
import AgentPerformanceChart from './AgentPerformanceChart.vue';

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

// Agent session data structure
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

// Computed properties
const agentSessions = computed((): AgentSessionData[] => {
  // Group events by session and identify agent sessions
  const sessionGroups = new Map<string, HookEvent[]>();
  
  props.events.forEach(event => {
    if (!sessionGroups.has(event.session_id)) {
      sessionGroups.set(event.session_id, []);
    }
    sessionGroups.get(event.session_id)!.push(event);
  });
  
  const agentSessions: AgentSessionData[] = [];
  
  sessionGroups.forEach((sessionEvents, sessionId) => {
    // Sort events by timestamp
    sessionEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Detect if this is an agent session
    const isAgentSession = detectAgentSession(sessionEvents);
    
    if (isAgentSession) {
      const agentData = analyzeAgentSession(sessionId, sessionEvents);
      agentSessions.push(agentData);
    }
  });
  
  // Sort by start time (most recent first)
  return agentSessions.sort((a, b) => b.startTime - a.startTime);
});

const agentSuccessRate = computed(() => {
  if (agentSessions.value.length === 0) return 0;
  const successful = agentSessions.value.filter(session => session.status === 'completed').length;
  return Math.round((successful / agentSessions.value.length) * 100);
});

const avgExecutionTime = computed(() => {
  const completedSessions = agentSessions.value.filter(session => session.duration !== undefined);
  if (completedSessions.length === 0) return 0;
  const totalTime = completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
  return Math.round((totalTime / completedSessions.length) * 100) / 100;
});

// Helper functions
function detectAgentSession(events: HookEvent[]): boolean {
  // Agent sessions typically have:
  // 1. Task tool usage (indicating sub-agent execution)
  // 2. Multiple tool calls in sequence
  // 3. Structured return data
  // 4. Specific naming patterns
  
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

function analyzeAgentSession(sessionId: string, events: HookEvent[]): AgentSessionData {
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  
  // Extract agent name and type from events
  let agentName = 'Unknown Agent';
  let agentType = 'generic';
  
  // Look for agent name in Task tool usage or event data
  const taskEvents = events.filter(event => 
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
  
  // Calculate timing
  const startTime = firstEvent.timestamp || Date.now();
  const endTime = lastEvent.timestamp;
  const duration = endTime ? (endTime - startTime) / 1000 : undefined;
  
  // Determine status
  let status: 'running' | 'completed' | 'failed' = 'running';
  const hasError = events.some(event => 
    event.hook_event_type === 'PostToolUse' && 
    event.payload.tool_output?.error
  );
  
  if (hasError) {
    status = 'failed';
  } else if (endTime && duration !== undefined) {
    status = 'completed';
  }
  
  // Extract tools used
  const toolsUsed = Array.from(new Set(
    events
      .filter(event => event.hook_event_type === 'PreToolUse')
      .map(event => event.payload.tool_name)
      .filter(tool => tool !== undefined)
  ));
  
  // Extract return data from final events
  const returnData = extractReturnData(events);
  
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
    returnData,
    events,
    errorMessage: hasError ? 'Agent execution encountered errors' : undefined
  };
}

function extractAgentName(description: string): string {
  // Try to extract agent name from description
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

// Event handlers
function handleViewDetails(agentSession: AgentSessionData) {
  selectedAgentSession.value = agentSession;
  showAgentDetail.value = true;
}

function handleExpandTools(agentSession: AgentSessionData) {
  // Emit session select to show all events for this agent session
  emit('session-select', agentSession.sessionId);
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
</style>