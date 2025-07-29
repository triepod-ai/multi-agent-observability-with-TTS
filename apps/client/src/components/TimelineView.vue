<template>
  <div class="h-full overflow-y-auto p-4 bg-gray-950">
    <!-- Timeline Header -->
    <div class="mb-6 text-center">
      <h2 class="text-xl font-bold text-white mb-2">Event Timeline</h2>
      <div class="flex items-center justify-center space-x-4 text-sm text-gray-400">
        <span>{{ events.length }} events</span>
        <span>•</span>
        <span>{{ agentGroups.length }} agent operations</span>
        <button
          @click="showAgentGroupsOnly = !showAgentGroupsOnly"
          class="px-3 py-1 rounded-full bg-purple-900/30 border border-purple-700 text-purple-300 hover:bg-purple-800/50 transition-colors"
        >
          {{ showAgentGroupsOnly ? 'Show All Events' : 'Agents Only' }}
        </button>
      </div>
    </div>

    <!-- Timeline Container -->
    <div class="relative max-w-6xl mx-auto">
      <!-- Vertical Timeline Line -->
      <div class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-pink-500/50"></div>
      
      <!-- Timeline Events with Agent Grouping -->
      <div class="space-y-8">
        <TransitionGroup name="timeline-event">
          <!-- Agent Group Container -->
          <div
            v-for="(group, groupIndex) in filteredGroups"
            :key="group.isAgent ? `agent-${group.sessionId}` : `event-${group.events[0].id}`"
            class="relative"
          >
            <!-- Agent Group Header -->
            <div v-if="group.isAgent" class="relative mb-4">
              <!-- Agent Marker -->
              <div class="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 z-20">
                <div class="w-6 h-6 rounded-full bg-purple-500 border-2 border-gray-800 shadow-lg flex items-center justify-center">
                  <span class="text-xs text-white font-bold">🤖</span>
                </div>
              </div>
              
              <!-- Agent Header Card -->
              <div class="flex items-center justify-center">
                <div class="bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <div class="flex items-center space-x-3">
                    <span class="text-lg">{{ getAgentIcon(group.agentType) }}</span>
                    <div>
                      <div class="text-sm font-semibold text-white">{{ group.agentName }}</div>
                      <div class="text-xs text-purple-300">{{ group.agentType }} • {{ group.events.length }} events • {{ formatDuration(group.duration) }}</div>
                    </div>
                    <button
                      @click="toggleAgentGroup(group.sessionId)"
                      class="p-1 rounded hover:bg-purple-800/50 transition-colors"
                    >
                      <svg class="w-4 h-4 text-purple-300 transition-transform" :class="{ 'rotate-180': !collapsedAgents.has(group.sessionId) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Agent Events Container -->
            <div v-if="!group.isAgent || !collapsedAgents.has(group.sessionId)" :class="group.isAgent ? 'ml-8 mr-8 border-l-2 border-purple-500/30 pl-4' : ''">
              <div
                v-for="(event, eventIndex) in group.events"
                :key="`${event.id}-${event.timestamp}`"
                class="relative mb-8"
              >
                <!-- Time Marker -->
                <div 
                  class="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 z-10"
                  :class="getTimeMarkerPosition(getGlobalEventIndex(groupIndex, eventIndex))"
                >
                  <div 
                    class="w-4 h-4 rounded-full border-2 border-gray-800 shadow-lg animate-pulse"
                    :class="group.isAgent ? 'bg-purple-400' : getEventColorClass(event.hook_event_type)"
                  ></div>
                </div>

                <!-- Event Card Container -->
                <div 
                  class="relative flex items-center"
                  :class="getGlobalEventIndex(groupIndex, eventIndex) % 2 === 0 ? 'justify-start' : 'justify-end'"
                >
                  <!-- Connection Line -->
                  <div 
                    class="absolute top-1/2 transform -translate-y-1/2 w-24 h-0.5"
                    :class="[
                      getGlobalEventIndex(groupIndex, eventIndex) % 2 === 0 ? 'left-1/2 bg-gradient-to-r' : 'right-1/2 bg-gradient-to-l',
                      group.isAgent ? 'from-transparent to-purple-500/50' : getConnectionGradient(event.hook_event_type)
                    ]"
                  ></div>

                  <!-- Event Card -->
                  <div 
                    class="relative w-5/12 group"
                    :class="getGlobalEventIndex(groupIndex, eventIndex) % 2 === 0 ? 'pr-8' : 'pl-8'"
                  >
                    <!-- Timestamp -->
                    <div 
                      class="absolute top-1/2 transform -translate-y-1/2 text-xs font-mono text-gray-500"
                      :class="getGlobalEventIndex(groupIndex, eventIndex) % 2 === 0 ? 'right-0' : 'left-0'"
                    >
                      {{ formatTimestamp(event.timestamp) }}
                    </div>

                    <!-- Card Content -->
                    <div 
                      class="bg-gray-800/80 backdrop-blur-sm border rounded-xl p-4 hover:bg-gray-800 hover:border-gray-600 transition-all duration-300 cursor-pointer group-hover:shadow-xl"
                      :class="group.isAgent ? 'border-purple-600/50 bg-purple-900/20' : 'border-gray-700'"
                      @click="$emit('event-click', event)"
                    >
                      <!-- Header -->
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                          <span class="text-lg">{{ group.isAgent ? '🤖' : getEventEmoji(event.hook_event_type) }}</span>
                          <span class="font-semibold text-sm text-white">{{ event.hook_event_type }}</span>
                          <span v-if="group.isAgent" class="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">Agent</span>
                        </div>
                        <div 
                          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          :style="{ backgroundColor: getAppColor(event.source_app) + '30', color: getAppColor(event.source_app) }"
                        >
                          {{ event.source_app.charAt(0).toUpperCase() }}
                        </div>
                      </div>

                      <!-- Tool/Command Info -->
                      <div v-if="getToolInfo(event)" class="mb-2">
                        <div class="text-xs" :class="group.isAgent ? 'text-purple-300' : 'text-gray-400'">
                          <span class="font-medium">{{ getToolInfo(event).tool }}</span>
                          <span v-if="getToolInfo(event).detail" class="ml-1" :class="group.isAgent ? 'text-purple-400' : 'text-gray-500'">
                            - {{ truncate(getToolInfo(event).detail, 50) }}
                          </span>
                        </div>
                      </div>

                      <!-- Summary -->
                      <div v-if="event.summary" class="text-xs italic" :class="group.isAgent ? 'text-purple-200' : 'text-gray-300'">
                        "{{ truncate(event.summary, 60) }}"
                      </div>

                      <!-- Session Badge -->
                      <div class="mt-2 flex items-center justify-between">
                        <div 
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                          :class="group.isAgent ? 'bg-purple-900/50 text-purple-300' : getSessionColorClass(event.session_id)"
                        >
                          <div class="w-1.5 h-1.5 rounded-full mr-1" :class="group.isAgent ? 'bg-purple-400' : getSessionDotClass(event.session_id)"></div>
                          {{ getSessionShort(event.session_id) }}
                        </div>
                        <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            @click.stop="$emit('copy-event', event)"
                            class="text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Time Group Separator -->
                <div 
                  v-if="shouldShowTimeSeparatorForEvent(event, getGlobalEventIndex(groupIndex, eventIndex))"
                  class="absolute left-0 right-0 flex items-center justify-center my-8"
                >
                  <div class="bg-gray-800 px-4 py-1 rounded-full text-xs text-gray-400 font-medium border border-gray-700">
                    {{ getTimeSeparatorTextForEvent(event, getGlobalEventIndex(groupIndex, eventIndex)) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Empty State -->
      <div v-if="filteredGroups.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">⏰</div>
        <p class="text-lg font-semibold text-gray-400 mb-2">{{ showAgentGroupsOnly ? 'No agent operations' : 'No events yet' }}</p>
        <p class="text-sm text-gray-500">{{ showAgentGroupsOnly ? 'Agent operations will appear here when agents run' : 'Events will appear here as they occur' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { HookEvent } from '../types';

const props = defineProps<{
  events: HookEvent[];
  getSessionColor: (sessionId: string) => string;
  getAppColor: (appName: string) => string;
}>();

const emit = defineEmits<{
  'event-click': [event: HookEvent];
  'copy-event': [event: HookEvent];
}>();

// Component state
const collapsedAgents = ref(new Set<string>());
const showAgentGroupsOnly = ref(false);

// Agent session grouping logic (same as AgentDashboard)
interface EventGroup {
  isAgent: boolean;
  sessionId: string;
  agentName?: string;
  agentType?: string;
  duration?: number;
  events: HookEvent[];
}

// Computed: Group events by agent sessions
const groupedEvents = computed((): EventGroup[] => {
  const sessionGroups = new Map<string, HookEvent[]>();
  
  props.events.forEach(event => {
    if (!sessionGroups.has(event.session_id)) {
      sessionGroups.set(event.session_id, []);
    }
    sessionGroups.get(event.session_id)!.push(event);
  });
  
  const groups: EventGroup[] = [];
  
  sessionGroups.forEach((sessionEvents, sessionId) => {
    sessionEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    const isAgent = detectAgentSession(sessionEvents);
    
    if (isAgent) {
      const agentData = analyzeAgentGroup(sessionId, sessionEvents);
      groups.push({
        isAgent: true,
        sessionId,
        agentName: agentData.agentName,
        agentType: agentData.agentType,
        duration: agentData.duration,
        events: sessionEvents
      });
    } else {
      // Individual events for non-agent sessions
      sessionEvents.forEach(event => {
        groups.push({
          isAgent: false,
          sessionId: event.session_id,
          events: [event]
        });
      });
    }
  });
  
  // Sort by first event timestamp
  return groups.sort((a, b) => {
    const aTime = a.events[0]?.timestamp || 0;
    const bTime = b.events[0]?.timestamp || 0;
    return aTime - bTime;
  });
});

// Computed: Filter groups based on showAgentGroupsOnly
const filteredGroups = computed(() => {
  if (showAgentGroupsOnly.value) {
    return groupedEvents.value.filter(group => group.isAgent);
  }
  return groupedEvents.value;
});

// Computed: Get just agent groups for stats
const agentGroups = computed(() => {
  return groupedEvents.value.filter(group => group.isAgent);
});

// Helper functions (from AgentDashboard)
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

function analyzeAgentGroup(sessionId: string, events: HookEvent[]) {
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  
  let agentName = 'Unknown Agent';
  let agentType = 'generic';
  
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
  
  const startTime = firstEvent.timestamp || Date.now();
  const endTime = lastEvent.timestamp;
  const duration = endTime ? (endTime - startTime) / 1000 : undefined;
  
  return { agentName, agentType, duration };
}

function extractAgentName(description: string): string {
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

// Event handlers
function toggleAgentGroup(sessionId: string) {
  if (collapsedAgents.value.has(sessionId)) {
    collapsedAgents.value.delete(sessionId);
  } else {
    collapsedAgents.value.add(sessionId);
  }
}

function getGlobalEventIndex(groupIndex: number, eventIndex: number): number {
  let globalIndex = 0;
  for (let i = 0; i < groupIndex; i++) {
    globalIndex += filteredGroups.value[i].events.length;
  }
  return globalIndex + eventIndex;
}

// Existing helper functions
const eventEmojis: Record<string, string> = {
  'PreToolUse': '🔧',
  'PostToolUse': '✅',
  'Notification': '🔔',
  'Stop': '🛑',
  'SubagentStop': '👥',
  'PreCompact': '📦',
  'UserPromptSubmit': '💬'
};

const eventTypeColors: Record<string, string> = {
  'PreToolUse': 'bg-blue-500',
  'PostToolUse': 'bg-green-500',
  'Notification': 'bg-yellow-500',
  'Stop': 'bg-red-500',
  'SubagentStop': 'bg-purple-500',
  'PreCompact': 'bg-indigo-500',
  'UserPromptSubmit': 'bg-pink-500'
};

const connectionGradients: Record<string, string> = {
  'PreToolUse': 'from-transparent to-blue-500/50',
  'PostToolUse': 'from-transparent to-green-500/50',
  'Notification': 'from-transparent to-yellow-500/50',
  'Stop': 'from-transparent to-red-500/50',
  'SubagentStop': 'from-transparent to-purple-500/50',
  'PreCompact': 'from-transparent to-indigo-500/50',
  'UserPromptSubmit': 'from-transparent to-pink-500/50'
};

function getAgentIcon(agentType?: string): string {
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
}

function formatDuration(duration?: number): string {
  if (!duration) return '⏳';
  if (duration < 1) return '<1s';
  if (duration < 60) return `${Math.round(duration)}s`;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60);
  return `${minutes}m ${seconds}s`;
}

const getEventEmoji = (eventType: string) => eventEmojis[eventType] || '❓';
const getEventColorClass = (eventType: string) => eventTypeColors[eventType] || 'bg-gray-500';
const getConnectionGradient = (eventType: string) => connectionGradients[eventType] || 'from-transparent to-gray-500/50';

const getTimeMarkerPosition = (index: number) => {
  return index % 4 === 0 ? '-mt-1' : index % 4 === 2 ? 'mt-1' : '';
};

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
};

const getSessionShort = (sessionId: string) => {
  const parts = sessionId.split('_');
  if (parts.length >= 3) {
    return `${parts[0].slice(0, 6)}:${parts[1]}`;
  }
  return sessionId.slice(0, 8);
};

const getSessionColorClass = (sessionId: string) => {
  const colors = ['bg-blue-900/30', 'bg-green-900/30', 'bg-purple-900/30', 'bg-yellow-900/30', 'bg-pink-900/30'];
  const index = sessionId.charCodeAt(0) % colors.length;
  return colors[index];
};

const getSessionDotClass = (sessionId: string) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];
  const index = sessionId.charCodeAt(0) % colors.length;
  return colors[index];
};

function getToolInfo(event: HookEvent) {
  const payload = event.payload;
  
  if (event.hook_event_type === 'UserPromptSubmit' && payload.prompt) {
    return {
      tool: 'Prompt',
      detail: payload.prompt
    };
  }
  
  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: payload.tool_name };
    
    if (payload.tool_input) {
      if (payload.tool_input.command) {
        info.detail = payload.tool_input.command;
      } else if (payload.tool_input.file_path) {
        info.detail = payload.tool_input.file_path;
      } else if (payload.tool_input.pattern) {
        info.detail = payload.tool_input.pattern;
      }
    }
    
    return info;
  }
  
  return null;
}

const truncate = (str: string, length: number) => {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
};

function shouldShowTimeSeparatorForEvent(event: HookEvent, globalIndex: number): boolean {
  if (globalIndex === 0) return false;
  
  // Get all events from all groups in chronological order
  const allEvents = filteredGroups.value.flatMap(group => group.events);
  if (globalIndex >= allEvents.length) return false;
  
  const currentTime = new Date(event.timestamp || 0);
  const prevTime = new Date(allEvents[globalIndex - 1]?.timestamp || 0);
  
  const timeDiff = currentTime.getTime() - prevTime.getTime();
  return timeDiff > 5 * 60 * 1000; // 5 minutes
}

function getTimeSeparatorTextForEvent(event: HookEvent, globalIndex: number): string {
  const date = new Date(event.timestamp || 0);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style scoped>
.timeline-event-enter-active,
.timeline-event-leave-active {
  transition: all 0.5s ease;
}

.timeline-event-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(30px);
}

.timeline-event-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-30px);
}

.timeline-event-move {
  transition: transform 0.5s ease;
}
</style>