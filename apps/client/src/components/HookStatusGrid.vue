<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
    <!-- Compact Header -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-white flex items-center">
        <span class="mr-2">🔧</span>
        Hook Coverage Status
      </h2>
      <div class="flex items-center space-x-3 text-sm">
        <span class="text-gray-400">{{ lastUpdated }}</span>
        <div class="flex items-center space-x-1">
          <span class="w-2 h-2 bg-green-500 rounded-full"></span>
          <span class="text-green-400 font-medium text-xs">{{ activeHooksCount }}</span>
          <span class="w-2 h-2 bg-gray-500 rounded-full ml-2"></span>
          <span class="text-gray-400 text-xs">{{ inactiveHooksCount }}</span>
          <span v-if="errorHooksCount > 0" class="w-2 h-2 bg-red-500 rounded-full ml-2"></span>
          <span v-if="errorHooksCount > 0" class="text-red-400 font-medium text-xs">{{ errorHooksCount }}</span>
        </div>
        
        <!-- Enhancement Status Indicator -->
        <div v-if="isEnhancing" class="flex items-center space-x-1">
          <div class="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
          <span class="text-xs text-blue-400">Enhancing</span>
        </div>
        
        <!-- Refresh Controls -->
        <HookStatusRefreshButton @refresh="handleManualRefresh" />
        
        <!-- Collapse Button -->
        <button
          @click="toggleCollapse"
          class="text-gray-400 hover:text-white transition-colors p-1"
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

    <!-- Enhanced Hook Status List with Rich Context -->
    <Transition name="collapse">
      <div v-show="!isCollapsed" class="space-y-3">
        <!-- Loading state for enhancements -->
        <div v-if="isEnhancing" class="flex items-center justify-center py-4">
          <div class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          <span class="text-sm text-gray-400">Loading contextual data...</span>
        </div>
        
        <!-- Enhanced Hook Cards -->
        <div
          v-for="(hook, index) in (enhancedHookStatuses.length > 0 ? enhancedHookStatuses : hookStatuses)"
          :key="hook.type"
          class="enhanced-hook-card bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all duration-200 cursor-pointer group"
          :class="getHookStatusClass(hook)"
          @click="toggleHookDetails(hook.type)"
        >
          <!-- Header with Icon, Name, and Status -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-2">
                <span class="text-lg">{{ hook.icon }}</span>
                <span :class="getStatusIndicatorClass(hook.status)" class="w-2 h-2 rounded-full"></span>
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-semibold text-white">{{ hook.displayName }}</span>
                  <span :class="getStatusTextClass(hook.status)" class="text-xs font-medium px-2 py-0.5 rounded-full bg-opacity-20">
                    {{ hook.status.toUpperCase() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Health Indicators (Enhanced hooks only) -->
            <div v-if="'healthIndicators' in hook" class="flex items-center space-x-2">
              <div class="flex items-center space-x-1 text-xs">
                <span :class="formatUtils.getHealthColorClass(hook.healthIndicators.performance)">⚡</span>
                <span :class="formatUtils.getHealthColorClass(hook.healthIndicators.reliability)">🛡️</span>
                <span :class="getErrorRateColorClass(hook.healthIndicators.errorRate)">📊</span>
              </div>
              <div class="text-gray-500 group-hover:text-gray-300 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <!-- Fallback for basic hooks -->
            <div v-else class="text-gray-500 group-hover:text-gray-300 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <!-- Rich Contextual Description -->
          <div class="mb-3">
            <p class="text-xs text-gray-300 leading-relaxed">
              {{ 'contextualDescription' in hook ? hook.contextualDescription : hook.description }}
            </p>
          </div>

          <!-- Key Metrics Grid (Enhanced hooks only) -->
          <div v-if="'keyMetrics' in hook" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div class="metric-item">
              <div class="text-xs text-gray-500">Executions</div>
              <div class="text-sm font-semibold text-white">{{ formatUtils.formatNumber(hook.keyMetrics.totalExecutions) }}</div>
            </div>
            <div class="metric-item">
              <div class="text-xs text-gray-500">Avg Time</div>
              <div class="text-sm font-semibold text-blue-400">{{ formatUtils.formatDuration(hook.keyMetrics.avgDuration) }}</div>
            </div>
            <div class="metric-item" v-if="hook.keyMetrics.totalTokens > 0">
              <div class="text-xs text-gray-500">Tokens</div>
              <div class="text-sm font-semibold text-yellow-400">{{ formatUtils.formatNumber(hook.keyMetrics.totalTokens) }}</div>
            </div>
            <div class="metric-item">
              <div class="text-xs text-gray-500">Apps</div>
              <div class="text-sm font-semibold text-green-400">{{ hook.keyMetrics.activeApps }}</div>
            </div>
          </div>

          <!-- Fallback metrics for basic hooks -->
          <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div class="metric-item">
              <div class="text-xs text-gray-500">Executions</div>
              <div class="text-sm font-semibold text-white">{{ hook.executionCount }}</div>
            </div>
            <div class="metric-item">
              <div class="text-xs text-gray-500">Success Rate</div>
              <div class="text-sm font-semibold text-green-400">{{ hook.successRate }}%</div>
            </div>
            <div class="metric-item">
              <div class="text-xs text-gray-500">Rate</div>
              <div class="text-sm font-semibold text-gray-400">{{ hook.executionRate }}</div>
            </div>
          </div>

          <!-- Activity Patterns (Enhanced hooks only) -->
          <div v-if="'activityPatterns' in hook && hook.activityPatterns.length > 0" class="mb-3">
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="pattern in hook.activityPatterns.slice(0, 2)"
                :key="pattern.pattern"
                class="pattern-badge flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-gray-800 border border-gray-600"
              >
                <span :class="formatUtils.getImpactColorClass(pattern.impact)" class="w-1.5 h-1.5 rounded-full"></span>
                <span class="text-gray-300">{{ pattern.pattern }}</span>
                <span class="text-gray-500">{{ pattern.frequency }}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Status Bar -->
          <div class="flex items-center justify-between pt-2 border-t border-gray-700/50">
            <div class="flex items-center space-x-3 text-xs">
              <span v-if="hook.lastExecution" class="text-gray-400">
                {{ formatTimestamp(hook.lastExecution) }}
              </span>
              <span v-else class="text-gray-500">Never executed</span>
              
              <!-- Trend indicator for enhanced hooks -->
              <span v-if="'recentActivity' in hook" class="flex items-center space-x-1">
                <span class="text-gray-600">•</span>
                <span :class="getTrendColorClass(hook.recentActivity.trendDirection)" class="font-medium">
                  {{ getTrendIcon(hook.recentActivity.trendDirection) }} {{ hook.recentActivity.trendDirection }}
                </span>
              </span>
            </div>

            <!-- Resource usage summary for enhanced hooks -->
            <div v-if="'resourceUsage' in hook && hook.resourceUsage.estimatedCost > 0" class="text-xs text-gray-400">
              <span>{{ formatUtils.formatCost(hook.resourceUsage.estimatedCost) }}</span>
            </div>
            
            <!-- Error indicator -->
            <div v-else-if="hook.lastError" class="text-xs text-red-400 truncate max-w-32" :title="hook.lastError">
              ⚠️ {{ hook.lastError }}
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Enhanced Hook Modal -->
    <EnhancedHookModal
      :hook="selectedHook"
      :is-open="isModalOpen"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, TransitionGroup } from 'vue';
import type { HookEvent } from '../types';
import EnhancedHookModal from './EnhancedHookModal.vue';
import HookStatusRefreshButton from './HookStatusRefreshButton.vue';
import { hookCoverageService, formatUtils, type EnhancedHookStatus } from '../services/hookCoverageService';

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
  averageExecutionTime?: number;
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
const enhancedHookStatuses = ref<EnhancedHookStatus[]>([]);
const isCollapsed = ref<boolean>(false);
const isEnhancing = ref<boolean>(false);

// Enhanced modal state
const selectedHook = ref<HookStatus | null>(null);
const isModalOpen = ref(false);

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
const calculateHookStatistics = async () => {
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
    
    // Calculate average execution time
    const durations = hookEvents
      .map(e => e.duration)
      .filter(d => d !== undefined && d !== null) as number[];
    const averageExecutionTime = durations.length > 0 ? 
      durations.reduce((sum, d) => sum + d, 0) / durations.length : undefined;
    
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
      lastError,
      averageExecutionTime
    };
  });
  
  lastUpdated.value = new Date().toLocaleTimeString();

  // Enhance hook statuses with rich contextual data
  await enhanceHookStatuses();
};

// Enhance hook statuses with contextual information
const enhanceHookStatuses = async () => {
  if (isEnhancing.value) return; // Prevent concurrent enhancements
  
  isEnhancing.value = true;
  
  try {
    const enhanced = await Promise.all(
      hookStatuses.value.map(async (status) => {
        try {
          return await hookCoverageService.enhanceHookStatus(status);
        } catch (error) {
          console.warn(`Failed to enhance status for ${status.type}:`, error);
          // Return basic status as fallback
          return {
            ...status,
            contextualDescription: status.description,
            keyMetrics: {
              totalExecutions: status.executionCount,
              avgDuration: status.averageExecutionTime || 0,
              activeApps: 1,
              totalTokens: 0,
              recentErrors: 0
            },
            activityPatterns: [],
            resourceUsage: {
              tokenConsumption: 0,
              estimatedCost: 0,
              executionTime: status.averageExecutionTime || 0
            },
            healthIndicators: {
              performance: 'good' as const,
              reliability: status.successRate >= 95 ? 'excellent' as const : 'good' as const,
              errorRate: 'low' as const
            },
            recentActivity: {
              lastExecution: status.lastExecution,
              recentExecutionCount: status.executionCount,
              trendDirection: 'stable' as const
            }
          };
        }
      })
    );
    
    enhancedHookStatuses.value = enhanced;
  } catch (error) {
    console.error('Error enhancing hook statuses:', error);
    // Fallback to basic statuses
    enhancedHookStatuses.value = hookStatuses.value.map(status => ({
      ...status,
      contextualDescription: status.description,
      keyMetrics: {
        totalExecutions: status.executionCount,
        avgDuration: status.averageExecutionTime || 0,
        activeApps: 1,
        totalTokens: 0,
        recentErrors: 0
      },
      activityPatterns: [],
      resourceUsage: {
        tokenConsumption: 0,
        estimatedCost: 0,
        executionTime: status.averageExecutionTime || 0
      },
      healthIndicators: {
        performance: 'good' as const,
        reliability: status.successRate >= 95 ? 'excellent' as const : 'good' as const,
        errorRate: 'low' as const
      },
      recentActivity: {
        lastExecution: status.lastExecution,
        recentExecutionCount: status.executionCount,
        trendDirection: 'stable' as const
      }
    }));
  } finally {
    isEnhancing.value = false;
  }
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

// Enhanced UI utility functions
const getTrendIcon = (trend: 'increasing' | 'stable' | 'decreasing'): string => {
  switch (trend) {
    case 'increasing': return '📈';
    case 'decreasing': return '📉';
    default: return '📊';
  }
};

const getTrendColorClass = (trend: 'increasing' | 'stable' | 'decreasing'): string => {
  switch (trend) {
    case 'increasing': return 'text-green-400';
    case 'decreasing': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

const getErrorRateColorClass = (errorRate: 'low' | 'medium' | 'high'): string => {
  switch (errorRate) {
    case 'low': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'high': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

// Watch for event changes and recalculate statistics
watch(() => props.events, async () => {
  await calculateHookStatistics();
}, { deep: true });

// Toggle hook details expansion
const toggleHookDetails = (hookType: string) => {
  // Open enhanced modal instead of inline expansion
  const hook = hookStatuses.value.find(h => h.type === hookType);
  if (hook) {
    selectedHook.value = hook;
    isModalOpen.value = true;
  }
};

// Toggle main component collapse
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Modal handlers
const closeModal = () => {
  isModalOpen.value = false;
  selectedHook.value = null;
};

// Manual refresh handler
const handleManualRefresh = async () => {
  await calculateHookStatistics();
};

// Initialize on mount
onMounted(async () => {
  initializeHookStatuses();
  await calculateHookStatistics();
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

/* Enhanced hook card styles */
.enhanced-hook-card {
  transition: all 0.2s ease-in-out;
}

.enhanced-hook-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.metric-item {
  @apply text-center;
}

.pattern-badge {
  @apply transition-colors duration-200;
}

.pattern-badge:hover {
  @apply bg-gray-700 border-gray-500;
}

/* Health indicator animations */
@keyframes pulse-health {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.health-indicator {
  animation: pulse-health 2s infinite;
}

/* Loading animation for enhancement */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Responsive adjustments for enhanced cards */
@media (max-width: 768px) {
  .enhanced-hook-card {
    @apply p-3;
  }
  
  .metric-item {
    @apply text-left;
  }
}

@media (max-width: 640px) {
  .pattern-badge {
    @apply text-xs px-1.5 py-0.5;
  }
  
  .enhanced-hook-card .grid {
    @apply grid-cols-2;
  }
}
</style>