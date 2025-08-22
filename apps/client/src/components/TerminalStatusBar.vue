<template>
  <div class="terminal-status-bar bg-gray-800 border-t border-gray-700 px-4 py-2">
    <div class="flex items-center justify-between">
      <!-- Active Agents Section -->
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-2">
          <span class="text-gray-400 text-sm font-medium">Active:</span>
          <div class="flex items-center space-x-3">
            <div 
              v-if="activeAgents.length === 0" 
              class="flex items-center space-x-2 text-gray-500 text-sm"
            >
              <span class="w-2 h-2 rounded-full bg-gray-500"></span>
              <span>No active agents</span>
            </div>
            <div
              v-for="agent in displayActiveAgents"
              :key="agent.agent_id"
              class="flex items-center space-x-2 bg-gray-700/50 px-3 py-1.5 rounded-full border transition-all duration-200 hover:bg-gray-600/50"
              :style="{ borderColor: getAgentTypeColor(agent.agent_type) }"
            >
              <!-- Agent Status Icon -->
              <div class="flex items-center space-x-1.5">
                <div 
                  class="w-2 h-2 rounded-full animate-pulse"
                  :style="{ backgroundColor: getAgentTypeColor(agent.agent_type) }"
                  :title="`${agent.agent_type} agent`"
                ></div>
                <span class="text-white text-sm font-medium">{{ formatAgentName(agent.agent_name) }}</span>
              </div>
              
              <!-- Task Info -->
              <div class="flex items-center space-x-2">
                <span class="text-gray-300 text-xs">{{ getStatusIcon(agent.status) }}</span>
                <span 
                  class="text-gray-300 text-xs max-w-32 truncate" 
                  :title="agent.task_description || 'No description'"
                >
                  {{ formatTaskDescription(agent.task_description) }}
                </span>
              </div>
              
              <!-- Duration -->
              <span class="text-gray-400 text-xs">
                {{ formatDuration(Date.now() - agent.start_time) }}
              </span>
              
              <!-- Progress (if available) -->
              <div v-if="agent.progress !== undefined" class="flex items-center space-x-1">
                <div class="w-12 bg-gray-600 rounded-full h-1.5">
                  <div 
                    class="h-1.5 rounded-full transition-all duration-300"
                    :style="{ 
                      width: `${agent.progress}%`, 
                      backgroundColor: getAgentTypeColor(agent.agent_type) 
                    }"
                  ></div>
                </div>
                <span class="text-xs text-gray-400">{{ agent.progress }}%</span>
              </div>
            </div>
            
            <!-- Show more indicator -->
            <div 
              v-if="activeAgents.length > maxDisplayed"
              class="text-gray-400 text-sm cursor-pointer hover:text-white transition-colors"
              @click="showMore = !showMore"
              :title="showMore ? 'Show less' : `Show ${activeAgents.length - maxDisplayed} more active agents`"
            >
              {{ showMore ? '−' : `+${activeAgents.length - maxDisplayed}` }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recent Completions Section -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <span class="text-gray-400 text-sm font-medium">Recent:</span>
          <div class="flex items-center space-x-2">
            <div
              v-for="agent in recentCompletions.slice(0, 3)"
              :key="`completed-${agent.agent_id}`"
              class="flex items-center space-x-1.5 bg-gray-700/30 px-2 py-1 rounded text-xs transition-all duration-200 hover:bg-gray-600/30"
              :style="{ borderLeft: `2px solid ${getAgentTypeColor(agent.agent_type)}` }"
            >
              <span class="text-green-400">✓</span>
              <span class="text-gray-300">{{ formatAgentName(agent.agent_name) }}</span>
              <span class="text-gray-500">{{ formatDuration(agent.duration_ms || 0) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Stats Summary -->
        <div class="flex items-center space-x-4 text-xs text-gray-400">
          <div class="flex items-center space-x-1">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{{ totalActiveAgents }} active</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            <span>{{ totalCompletions }} completed today</span>
          </div>
          <div class="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
            <span class="w-2 h-2 rounded-full bg-gray-500"></span>
            <span>{{ formatTime(lastUpdate) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { AgentStatus, TerminalStatusData } from '../types';

interface Props {
  terminalStatus?: TerminalStatusData | null;
}

const props = withDefaults(defineProps<Props>(), {
  terminalStatus: null
});

// Reactive state
const showMore = ref(false);
const maxDisplayed = ref(4); // Maximum agents to display without expansion
const agentColorMap = ref<Record<string, string>>({});
const lastUpdate = ref(Date.now());

// Computed properties
const activeAgents = computed(() => 
  props.terminalStatus?.active_agents || []
);

const recentCompletions = computed(() => 
  props.terminalStatus?.recent_completions || []
);

const displayActiveAgents = computed(() => {
  if (showMore.value) {
    return activeAgents.value;
  }
  return activeAgents.value.slice(0, maxDisplayed.value);
});

const totalActiveAgents = computed(() => activeAgents.value.length);

const totalCompletions = computed(() => recentCompletions.value.length);

// Methods
const formatAgentName = (name: string): string => {
  // Extract meaningful part from agent names like "screenshot-analyzer", "data-processor"
  const parts = name.split('-');
  if (parts.length > 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return name.length > 12 ? name.substring(0, 12) + '...' : name;
};

const formatTaskDescription = (description?: string): string => {
  if (!description) return 'Working...';
  return description.length > 20 ? description.substring(0, 20) + '...' : description;
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  } else {
    return new Date(timestamp).toLocaleTimeString();
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'pending': return '📋';
    case 'active': return '🔄';
    case 'completing': return '⏳';
    case 'complete': return '✅';
    case 'failed': return '❌';
    default: return '🔄';
  }
};

const getAgentTypeColor = (agentType: string): string => {
  // Use cached color mapping or fallback colors
  if (agentColorMap.value[agentType]) {
    return agentColorMap.value[agentType];
  }
  
  // Fallback color mapping for immediate display
  const fallbackColors: Record<string, string> = {
    'analyzer': '#3B82F6',      // blue
    'debugger': '#EF4444',      // red
    'builder': '#22C55E',       // green
    'tester': '#A855F7',        // purple
    'reviewer': '#F59E0B',      // amber
    'optimizer': '#EC4899',     // pink
    'security': '#DC2626',      // red-600
    'writer': '#10B981',        // emerald
    'deployer': '#8B5CF6',      // violet
    'data-processor': '#06B6D4', // cyan
    'monitor': '#84CC16',       // lime
    'configurator': '#F97316',  // orange
    'generic': '#6B7280'        // gray-500 - fallback
  };
  
  return fallbackColors[agentType] || fallbackColors['generic'];
};

// Load agent color mapping from server
const loadAgentColors = async () => {
  try {
    const response = await fetch('/api/terminal/agent-colors');
    if (response.ok) {
      agentColorMap.value = await response.json();
    }
  } catch (error) {
    console.warn('Failed to load agent color mapping:', error);
  }
};

// Update last update timestamp when props change
const updateLastUpdate = () => {
  if (props.terminalStatus?.timestamp) {
    lastUpdate.value = props.terminalStatus.timestamp;
  }
};

// Lifecycle
onMounted(() => {
  loadAgentColors();
  updateLastUpdate();
  
  // Update timestamp periodically for relative time display
  const interval = setInterval(() => {
    // Just trigger reactivity for time display
  }, 30000); // Update every 30 seconds
  
  onUnmounted(() => {
    clearInterval(interval);
  });
});

// Watch for prop changes
import { watch } from 'vue';
watch(() => props.terminalStatus, () => {
  updateLastUpdate();
});
</script>

<style scoped>
.terminal-status-bar {
  min-height: 48px;
  max-height: 80px;
  overflow: hidden;
}

@media (max-width: 768px) {
  .terminal-status-bar {
    padding: 8px 12px;
  }
  
  .terminal-status-bar .flex {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .terminal-status-bar .space-x-6 > :not([hidden]) ~ :not([hidden]) {
    --tw-space-x-reverse: 0;
    margin-right: calc(12px * var(--tw-space-x-reverse));
    margin-left: calc(12px * calc(1 - var(--tw-space-x-reverse)));
  }
}
</style>