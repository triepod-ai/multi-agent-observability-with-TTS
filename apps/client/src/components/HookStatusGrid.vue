<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
    <!-- Compact Header -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-white flex items-center">
        <span class="mr-2">🔧</span>
        Hook Coverage Status
      </h2>
      <div class="flex items-center space-x-2 text-sm">
        <span class="text-gray-400">{{ lastUpdated }}</span>
        <div class="flex items-center space-x-1">
          <span class="w-2 h-2 bg-green-500 rounded-full"></span>
          <span class="text-green-400 font-medium text-xs">{{ activeHooksCount }}</span>
          <span class="w-2 h-2 bg-gray-500 rounded-full ml-2"></span>
          <span class="text-gray-400 text-xs">{{ inactiveHooksCount }}</span>
          <span v-if="errorHooksCount > 0" class="w-2 h-2 bg-red-500 rounded-full ml-2"></span>
          <span v-if="errorHooksCount > 0" class="text-red-400 font-medium text-xs">{{ errorHooksCount }}</span>
        </div>
        <!-- Collapse Button -->
        <button
          @click="toggleCollapse"
          class="text-gray-400 hover:text-white transition-colors p-1 ml-2"
          :title="isCollapsed ? 'Expand Hook Coverage' : 'Collapse Hook Coverage'"
        >
          <svg 
            class="w-4 h-4 transform transition-transform duration-200"
            :class="{ 'rotate-180': isCollapsed }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Collapsed Summary View -->
    <Transition name="fade">
      <div v-if="isCollapsed" class="mt-2">
        <div class="flex items-center justify-between p-3 bg-gray-900/30 border border-gray-700/50 rounded">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-green-500 rounded-full"></span>
              <span class="text-sm text-green-400 font-medium">{{ activeHooksCount }} Active</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-gray-500 rounded-full"></span>
              <span class="text-sm text-gray-400">{{ inactiveHooksCount }} Inactive</span>
            </div>
            <div v-if="errorHooksCount > 0" class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-red-500 rounded-full"></span>
              <span class="text-sm text-red-400 font-medium">{{ errorHooksCount }} Errors</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-400">Total Executions Today</div>
            <div class="text-lg font-bold text-white">{{ totalExecutionsToday }}</div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Streamlined Hook Status List -->
    <Transition name="collapse">
      <div v-show="!isCollapsed" class="space-y-2">
      <div
        v-for="hook in hookStatuses"
        :key="hook.type"
        class="flex items-center justify-between p-2 bg-gray-900/50 border border-gray-700 rounded hover:border-gray-600 transition-all duration-200 cursor-pointer group"
        :class="getHookStatusClass(hook)"
        @click="toggleHookDetails(hook.type)"
      >
        <!-- Hook Info -->
        <div class="flex items-center space-x-3 flex-1">
          <div class="flex items-center space-x-2">
            <span class="text-base">{{ hook.icon }}</span>
            <span :class="getStatusIndicatorClass(hook.status)" class="w-2 h-2 rounded-full"></span>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <span class="text-sm font-medium text-white truncate">{{ hook.displayName }}</span>
              <span :class="getStatusTextClass(hook.status)" class="text-xs font-medium px-1.5 py-0.5 rounded">
                {{ hook.status }}
              </span>
            </div>
            <div class="text-xs text-gray-400 flex items-center space-x-2">
              <span v-if="hook.lastExecution">{{ formatTimestamp(hook.lastExecution) }}</span>
              <span v-else>Never</span>
              <span class="text-gray-600">•</span>
              <span class="text-green-400">{{ hook.successRate }}%</span>
            </div>
          </div>
        </div>

        <!-- Execution Rate -->
        <div class="text-right text-xs text-gray-400 mr-2 hidden sm:block">
          <div class="font-medium">{{ hook.executionRate }}</div>
        </div>

        <!-- Expand Indicator -->
        <div class="text-gray-500 group-hover:text-gray-300 transition-colors">
          <svg 
            class="w-4 h-4 transform transition-transform duration-200"
            :class="{ 'rotate-180': expandedHooks.includes(hook.type) }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Expanded Details -->
      <TransitionGroup name="expand" tag="div">
        <div
          v-for="hook in hookStatuses"
          :key="`${hook.type}-details`"
          v-show="expandedHooks.includes(hook.type)"
          class="ml-6 p-3 bg-gray-900/30 border border-gray-700/50 rounded text-xs space-y-2"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span class="text-gray-400">Description:</span>
              <div class="text-gray-300 mt-1">{{ hook.description }}</div>
            </div>
            <div>
              <span class="text-gray-400">Statistics:</span>
              <div class="text-gray-300 mt-1 space-y-1">
                <div>Executions: {{ hook.executionCount }}</div>
                <div>Rate: {{ hook.executionRate }}</div>
              </div>
            </div>
          </div>
          
          <!-- Error Details -->
          <div v-if="hook.status === 'error' && hook.lastError" class="p-2 bg-red-900/20 border border-red-700/30 rounded">
            <div class="text-red-300 font-medium">Latest Error:</div>
            <div class="text-red-200 mt-1">{{ hook.lastError }}</div>
          </div>
        </div>
      </TransitionGroup>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, TransitionGroup } from 'vue';
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
}

interface Props {
  events: HookEvent[];
}

const props = defineProps<Props>();

// Hook definitions based on the 8 main Claude Code hook types
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

const lastUpdated = ref<string>('');
const hookStatuses = ref<HookStatus[]>([]);
const expandedHooks = ref<string[]>([]);
const isCollapsed = ref<boolean>(false);

// Computed properties for summary
const activeHooksCount = computed(() => 
  hookStatuses.value.filter(h => h.status === 'active').length
);

const inactiveHooksCount = computed(() => 
  hookStatuses.value.filter(h => h.status === 'inactive').length
);

const errorHooksCount = computed(() => 
  hookStatuses.value.filter(h => h.status === 'error').length
);

const totalExecutionsToday = computed(() => {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  return props.events.filter(e => (e.timestamp || 0) > oneDayAgo).length;
});

// Initialize hook statuses
const initializeHookStatuses = () => {
  hookStatuses.value = hookDefinitions.map(def => ({
    type: def.type,
    displayName: def.displayName,
    description: def.description,
    icon: def.icon,
    status: 'inactive' as const,
    executionCount: 0,
    executionRate: '0/day',
    successRate: 100
  }));
};

// Calculate hook statistics from events
const calculateHookStatistics = () => {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const recentEvents = props.events.filter(e => (e.timestamp || 0) > oneDayAgo);
  
  hookStatuses.value = hookDefinitions.map(def => {
    // Find events matching this hook type
    const hookEvents = props.events.filter(e => 
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
    const successfulEvents = hookEvents.filter(e => !e.error);
    const successRate = hookEvents.length > 0 ? 
      Math.round((successfulEvents.length / hookEvents.length) * 100) : 100;
    
    // Determine status
    let status: 'active' | 'inactive' | 'error';
    let lastError: string | undefined;
    
    if (executionCount === 0) {
      status = 'inactive';
    } else {
      // Check for recent errors
      const errorEvents = hookEvents.filter(e => e.error);
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
      lastError
    };
  });
  
  lastUpdated.value = new Date().toLocaleTimeString();
};

// Styling functions
const getHookStatusClass = (hook: HookStatus) => {
  switch (hook.status) {
    case 'active':
      return 'border-green-600/50 bg-green-900/10';
    case 'error':
      return 'border-red-600/50 bg-red-900/10';
    default:
      return 'border-gray-600';
  }
};

const getStatusIndicatorClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusTextClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-green-400';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

// Utility functions
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Watch for event changes and recalculate statistics
watch(() => props.events, calculateHookStatistics, { deep: true });

// Toggle hook details expansion
const toggleHookDetails = (hookType: string) => {
  const index = expandedHooks.value.indexOf(hookType);
  if (index > -1) {
    expandedHooks.value.splice(index, 1);
  } else {
    expandedHooks.value.push(hookType);
  }
};

// Toggle main component collapse
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Initialize on mount
onMounted(() => {
  initializeHookStatuses();
  calculateHookStatistics();
});
</script>

<style scoped>
/* Expand transition for progressive disclosure */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  transform-origin: top;
}

.expand-enter-from {
  opacity: 0;
  transform: scaleY(0);
  max-height: 0;
}

.expand-leave-to {
  opacity: 0;
  transform: scaleY(0);
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  transform: scaleY(1);
  max-height: 200px;
}

/* Collapse transition for entire component */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.4s ease;
  transform-origin: top;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  transform: scaleY(0);
  max-height: 0;
  overflow: hidden;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  transform: scaleY(1);
  max-height: 1000px;
}

/* Fade transition for summary */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>