<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="$emit('close')"
        ></div>
        
        <!-- Modal Content -->
        <div class="relative bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
          <!-- Header -->
          <div class="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Agent Icon -->
                <div 
                  class="w-12 h-12 rounded-lg flex items-center justify-center border-2"
                  :style="{ backgroundColor: sessionColor + '20', borderColor: sessionColor }"
                >
                  <span class="text-xl">{{ getAgentIcon(agentSession.agentType) }}</span>
                </div>
                
                <div>
                  <h2 class="text-xl font-bold text-white">{{ agentSession.agentName }}</h2>
                  <div class="flex items-center space-x-2 text-sm text-gray-400">
                    <span>{{ agentSession.sourceApp }}</span>
                    <span>•</span>
                    <span class="capitalize">{{ agentSession.agentType }}</span>
                    <span>•</span>
                    <span>{{ formatSessionId(agentSession.sessionId) }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Close Button -->
              <button
                @click="$emit('close')"
                class="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Content -->
          <div class="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div class="p-6 space-y-6">
              <!-- Status and Metrics Overview -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-gray-900 rounded-lg p-4 text-center">
                  <div 
                    class="text-2xl font-bold mb-1"
                    :class="getStatusColor(agentSession.status)"
                  >
                    {{ getStatusText(agentSession.status) }}
                  </div>
                  <div class="text-xs text-gray-400">Status</div>
                </div>
                
                <div class="bg-gray-900 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-white mb-1">
                    {{ formatDuration(agentSession.duration) }}
                  </div>
                  <div class="text-xs text-gray-400">Duration</div>
                </div>
                
                <div class="bg-gray-900 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-white mb-1">
                    {{ agentSession.toolsUsed.length }}
                  </div>
                  <div class="text-xs text-gray-400">Tools Used</div>
                </div>
                
                <div class="bg-gray-900 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-white mb-1">
                    {{ agentSession.events.length }}
                  </div>
                  <div class="text-xs text-gray-400">Total Events</div>
                </div>
              </div>
              
              <!-- Timeline -->
              <div>
                <h3 class="text-lg font-semibold text-white mb-4">Execution Timeline</h3>
                <div class="bg-gray-900 rounded-lg p-4">
                  <div class="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>Started: {{ formatFullTime(agentSession.startTime) }}</span>
                    <span v-if="agentSession.endTime">Ended: {{ formatFullTime(agentSession.endTime) }}</span>
                  </div>
                  
                  <!-- Agent Execution Flow -->
                  <div class="space-y-3">
                    <div
                      v-for="(event, index) in agentSession.events"
                      :key="event.id"
                      class="flex items-start space-x-3"
                    >
                      <!-- Timeline Line -->
                      <div class="flex flex-col items-center">
                        <div 
                          class="w-3 h-3 rounded-full border-2 border-gray-600"
                          :class="getEventTypeColor(event.hook_event_type)"
                        ></div>
                        <div 
                          v-if="index < agentSession.events.length - 1"
                          class="w-0.5 h-8 bg-gray-600 mt-1"
                        ></div>
                      </div>
                      
                      <!-- Event Content -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 mb-1">
                          <span class="text-sm font-medium text-white">
                            {{ event.hook_event_type }}
                          </span>
                          <span v-if="event.payload.tool_name" class="text-xs text-gray-400">
                            → {{ getToolIcon(event.payload.tool_name) }} {{ event.payload.tool_name }}
                          </span>
                          <span class="text-xs text-gray-500">
                            {{ formatTime(event.timestamp) }}
                          </span>
                        </div>
                        
                        <!-- Tool Parameters or Response -->
                        <div 
                          v-if="event.payload.tool_input || event.payload.tool_output"
                          class="bg-gray-800 rounded p-2 text-xs text-gray-300 mt-2"
                        >
                          <pre v-if="event.payload.tool_input" class="whitespace-pre-wrap">{{ formatEventData(event.payload.tool_input) }}</pre>
                          <pre v-else-if="event.payload.tool_output" class="whitespace-pre-wrap">{{ formatEventData(event.payload.tool_output) }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Tools Used Detail -->
              <div>
                <h3 class="text-lg font-semibold text-white mb-4">Tools Used</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    v-for="tool in agentSession.toolsUsed"
                    :key="tool"
                    class="bg-gray-900 rounded-lg p-4"
                  >
                    <div class="flex items-center space-x-2 mb-2">
                      <span class="text-lg">{{ getToolIcon(tool) }}</span>
                      <span class="font-medium text-white">{{ tool }}</span>
                    </div>
                    <div class="text-sm text-gray-400">
                      Used {{ getToolUsageCount(tool) }} time{{ getToolUsageCount(tool) !== 1 ? 's' : '' }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Return Data -->
              <div v-if="agentSession.returnData">
                <h3 class="text-lg font-semibold text-white mb-4">Return Data</h3>
                <div class="bg-gray-900 rounded-lg p-4">
                  <pre class="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">{{ formatReturnData(agentSession.returnData) }}</pre>
                </div>
              </div>
              
              <!-- Error Details -->
              <div v-if="agentSession.errorMessage">
                <h3 class="text-lg font-semibold text-red-400 mb-4">Error Details</h3>
                <div class="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <p class="text-red-300">{{ agentSession.errorMessage }}</p>
                </div>
              </div>
              
              <!-- Raw Event Data -->
              <div>
                <h3 class="text-lg font-semibold text-white mb-4">Raw Event Data</h3>
                <div class="bg-gray-900 rounded-lg p-4">
                  <details class="text-sm">
                    <summary class="cursor-pointer text-gray-400 hover:text-white">
                      Show raw event data ({{ agentSession.events.length }} events)
                    </summary>
                    <pre class="mt-4 text-gray-300 whitespace-pre-wrap overflow-x-auto">{{ JSON.stringify(agentSession.events, null, 2) }}</pre>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// Props
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
  events: any[];
  errorMessage?: string;
}

interface Props {
  isOpen: boolean;
  agentSession: AgentSessionData;
  sessionColor: string;
}

defineProps<Props>();

// Emits
defineEmits<{
  'close': [];
}>();

// Helper functions
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-400';
    case 'failed': return 'text-red-400';
    case 'running': return 'text-yellow-400';
    default: return 'text-gray-400';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'running': return 'Running';
    default: return 'Unknown';
  }
}

function getEventTypeColor(eventType: string): string {
  switch (eventType) {
    case 'PreToolUse': return 'bg-blue-500';
    case 'PostToolUse': return 'bg-green-500';
    case 'UserPromptSubmit': return 'bg-purple-500';
    case 'Error': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function formatDuration(duration?: number): string {
  if (!duration) return 'N/A';
  if (duration < 1) return '<1s';
  if (duration < 60) return `${Math.round(duration)}s`;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60);
  return `${minutes}m ${seconds}s`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function formatFullTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatSessionId(sessionId: string): string {
  return sessionId.length > 12 ? sessionId.substring(0, 12) + '...' : sessionId;
}

function formatEventData(data: any): string {
  if (typeof data === 'string') {
    return data.length > 500 ? data.substring(0, 500) + '...' : data;
  }
  
  if (typeof data === 'object' && data !== null) {
    const formatted = JSON.stringify(data, null, 2);
    return formatted.length > 500 ? formatted.substring(0, 500) + '...' : formatted;
  }
  
  return String(data);
}

function formatReturnData(data: any): string {
  if (typeof data === 'string') {
    return data;
  }
  
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data, null, 2);
  }
  
  return String(data);
}

function getToolUsageCount(toolName: string): number {
  // This is a placeholder - in a real implementation, you'd count actual usage
  return 1;
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95) translateY(-20px);
}
</style>