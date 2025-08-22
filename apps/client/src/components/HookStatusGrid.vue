<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-white flex items-center">
        <span class="mr-2">🔧</span>
        Hook Coverage Status
      </h2>
      <div class="text-sm text-gray-400">
        Last Updated: {{ lastUpdated }}
      </div>
    </div>
    
    <!-- Hook Status Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div
        v-for="hook in hookStatuses"
        :key="hook.type"
        class="bg-gray-900 border border-gray-600 rounded-lg p-3 hover:border-gray-500 transition-all duration-200"
        :class="getHookStatusClass(hook)"
      >
        <!-- Hook Header -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center">
            <span class="text-lg mr-2">{{ hook.icon }}</span>
            <span class="text-xs font-medium text-white">{{ hook.displayName }}</span>
          </div>
          <div class="flex items-center">
            <span :class="getStatusIndicatorClass(hook.status)" class="w-2 h-2 rounded-full"></span>
          </div>
        </div>
        
        <!-- Hook Status Details -->
        <div class="space-y-1">
          <div class="text-xs text-gray-400">
            Status: <span :class="getStatusTextClass(hook.status)" class="font-medium">{{ hook.status }}</span>
          </div>
          <div v-if="hook.lastExecution" class="text-xs text-gray-400">
            Last: <span class="text-gray-300">{{ formatTimestamp(hook.lastExecution) }}</span>
          </div>
          <div v-else class="text-xs text-gray-500">
            Last: Never
          </div>
          <div class="text-xs text-gray-400 flex justify-between">
            <span>Rate: {{ hook.executionRate }}</span>
            <span class="text-green-400">{{ hook.successRate }}%</span>
          </div>
        </div>
        
        <!-- Error indicator for failed hooks -->
        <div v-if="hook.status === 'error' && hook.lastError" class="mt-2 p-1 bg-red-900/30 border border-red-700/30 rounded text-xs text-red-300">
          {{ hook.lastError }}
        </div>
      </div>
    </div>
    
    <!-- Hook Coverage Summary -->
    <div class="mt-4 pt-3 border-t border-gray-700">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-400">Coverage Summary:</span>
        <div class="flex items-center space-x-4">
          <span class="flex items-center">
            <span class="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            <span class="text-green-400 font-medium">{{ activeHooksCount }} Active</span>
          </span>
          <span class="flex items-center">
            <span class="w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
            <span class="text-gray-400">{{ inactiveHooksCount }} Inactive</span>
          </span>
          <span v-if="errorHooksCount > 0" class="flex items-center">
            <span class="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
            <span class="text-red-400 font-medium">{{ errorHooksCount }} Error</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
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

// Initialize on mount
onMounted(() => {
  initializeHookStatuses();
  calculateHookStatistics();
});
</script>