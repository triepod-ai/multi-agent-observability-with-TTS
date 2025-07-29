<template>
  <div class="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 overflow-hidden">
    <!-- Agent Header -->
    <div class="p-4 border-b border-gray-700">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-3">
          <!-- Agent Status Indicator -->
          <div class="relative">
            <div 
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :style="{ backgroundColor: agentColor + '20', borderColor: agentColor }"
              :class="[
                'border-2',
                agentSession.status === 'running' ? 'animate-pulse' : ''
              ]"
            >
              <span class="text-lg">{{ getAgentIcon(agentSession.agentType) }}</span>
            </div>
            <!-- Status Dot -->
            <div 
              class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 flex items-center justify-center"
              :class="getStatusColor(agentSession.status)"
            >
              <div class="w-2 h-2 rounded-full bg-current"></div>
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-white truncate">{{ agentSession.agentName }}</h3>
            <div class="flex items-center space-x-2 text-sm text-gray-400">
              <span>{{ agentSession.sourceApp }}</span>
              <span>•</span>
              <span class="capitalize">{{ agentSession.agentType }}</span>
            </div>
          </div>
        </div>
        
        <!-- Execution Time -->
        <div class="text-right">
          <div class="text-sm font-medium text-white">
            {{ formatDuration(agentSession.duration) }}
          </div>
          <div class="text-xs text-gray-400">
            {{ formatTime(agentSession.startTime) }}
          </div>
        </div>
      </div>
      
      <!-- Status Message -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span 
            class="px-2 py-1 rounded-full text-xs font-medium"
            :class="getStatusBadgeClass(agentSession.status)"
          >
            {{ getStatusText(agentSession.status) }}
          </span>
          <span v-if="agentSession.tokenUsage" class="text-xs text-gray-400">
            ~{{ agentSession.tokenUsage }}k tokens
          </span>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center space-x-1">
          <button
            @click="$emit('expand-tools', agentSession)"
            class="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="View all events"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            @click="$emit('view-details', agentSession)"
            class="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="View details"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Agent Body -->
    <div class="p-4">
      <!-- Tools Used -->
      <div class="mb-4">
        <div class="text-xs font-medium text-gray-400 mb-2">Tools Used</div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="tool in agentSession.toolsUsed.slice(0, 6)"
            :key="tool"
            class="inline-flex items-center space-x-1 px-2 py-1 bg-gray-700 text-xs rounded-full"
          >
            <span>{{ getToolIcon(tool) }}</span>
            <span class="text-gray-300">{{ tool }}</span>
          </span>
          <span
            v-if="agentSession.toolsUsed.length > 6"
            class="inline-flex items-center px-2 py-1 bg-gray-600 text-xs rounded-full text-gray-300"
          >
            +{{ agentSession.toolsUsed.length - 6 }} more
          </span>
        </div>
      </div>
      
      <!-- Return Data Preview -->
      <div v-if="agentSession.returnData" class="mb-4">
        <div class="text-xs font-medium text-gray-400 mb-2">Return Data</div>
        <div class="bg-gray-900 rounded p-3 text-sm">
          <pre class="text-gray-300 text-xs overflow-hidden">{{ formatReturnData(agentSession.returnData) }}</pre>
        </div>
      </div>
      
      <!-- Error Message -->
      <div v-if="agentSession.errorMessage" class="mb-4">
        <div class="text-xs font-medium text-red-400 mb-2">Error</div>
        <div class="bg-red-900/20 border border-red-700 rounded p-3 text-sm text-red-300">
          {{ agentSession.errorMessage }}
        </div>
      </div>
      
      <!-- Agent Metrics -->
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-lg font-semibold text-white">{{ agentSession.events.length }}</div>
          <div class="text-xs text-gray-400">Events</div>
        </div>
        <div>
          <div class="text-lg font-semibold text-white">{{ agentSession.toolsUsed.length }}</div>
          <div class="text-xs text-gray-400">Tools</div>
        </div>
        <div>
          <div 
            class="text-lg font-semibold"
            :class="agentSession.status === 'completed' ? 'text-green-400' : 
                   agentSession.status === 'failed' ? 'text-red-400' : 'text-yellow-400'"
          >
            {{ agentSession.status === 'completed' ? '✓' : 
               agentSession.status === 'failed' ? '✗' : '⏳' }}
          </div>
          <div class="text-xs text-gray-400">Status</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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
  agentSession: AgentSessionData;
  sessionColor: string;
  appColor: string;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  'view-details': [agentSession: AgentSessionData];
  'expand-tools': [agentSession: AgentSessionData];
}>();

// Computed
const agentColor = computed(() => props.sessionColor);

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

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-900/30 text-green-400 border border-green-700';
    case 'failed': return 'bg-red-900/30 text-red-400 border border-red-700';
    case 'running': return 'bg-yellow-900/30 text-yellow-400 border border-yellow-700';
    default: return 'bg-gray-900/30 text-gray-400 border border-gray-700';
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

function formatDuration(duration?: number): string {
  if (!duration) return '⏳';
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

function formatReturnData(data: any): string {
  if (typeof data === 'string') {
    return data.length > 150 ? data.substring(0, 150) + '...' : data;
  }
  
  if (typeof data === 'object' && data !== null) {
    const formatted = JSON.stringify(data, null, 2);
    return formatted.length > 200 ? formatted.substring(0, 200) + '...' : formatted;
  }
  
  return String(data);
}
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>