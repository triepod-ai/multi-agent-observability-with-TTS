<template>
  <div class="bg-gray-950 rounded-lg border border-gray-800 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-6z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white">Session Relationships</h3>
          <p class="text-sm text-gray-400">Hierarchy and spawn statistics</p>
        </div>
      </div>
      
      <!-- Refresh Button -->
      <button
        @click="handleRefresh"
        :disabled="loading"
        class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        title="Refresh Statistics"
      >
        <svg 
          class="w-5 h-5"
          :class="{ 'animate-spin': loading }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-48">
      <div class="text-center">
        <svg class="mx-auto h-8 w-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <p class="mt-2 text-sm text-gray-400">Loading statistics...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
      <div class="flex items-center space-x-2 text-red-300">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-medium">Failed to load statistics</span>
      </div>
      <p class="text-red-200 text-sm mt-1">{{ error }}</p>
    </div>

    <!-- Statistics Content -->
    <div v-else class="space-y-6">
      <!-- Key Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Sessions -->
        <div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-white">{{ formatNumber(stats.total_sessions) }}</p>
              <p class="text-xs text-gray-400">Total Sessions</p>
            </div>
          </div>
        </div>

        <!-- Average Depth -->
        <div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-white">{{ formatDecimal(stats.average_depth) }}</p>
              <p class="text-xs text-gray-400">Avg Depth</p>
            </div>
          </div>
        </div>

        <!-- Max Depth -->
        <div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-white">{{ stats.max_depth }}</p>
              <p class="text-xs text-gray-400">Max Depth</p>
            </div>
          </div>
        </div>

        <!-- Completion Rate -->
        <div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-white">{{ formatPercentage(stats.completion_rate) }}</p>
              <p class="text-xs text-gray-400">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Session Types Distribution -->
      <div class="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <h4 class="text-sm font-semibold text-white mb-4">Session Types</h4>
        <div class="space-y-3">
          <div
            v-for="(count, type) in stats.sessions_by_type"
            :key="type"
            class="flex items-center justify-between"
          >
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 rounded flex items-center justify-center" :class="getTypeIconContainer(type)">
                <span class="text-sm">{{ getTypeIcon(type) }}</span>
              </div>
              <span class="text-sm text-gray-300 capitalize">{{ type }}</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-24 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="getTypeColor(type)"
                  :style="{ width: `${getTypePercentage(count)}%` }"
                ></div>
              </div>
              <span class="text-sm font-medium text-white w-8 text-right">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Most Common Spawn Reasons -->
      <div v-if="stats.common_spawn_reasons.length > 0" class="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <h4 class="text-sm font-semibold text-white mb-4">Common Spawn Reasons</h4>
        <div class="space-y-2">
          <div
            v-for="(reason, index) in stats.common_spawn_reasons.slice(0, 5)"
            :key="reason.reason"
            class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                {{ index + 1 }}
              </div>
              <span class="text-sm text-gray-300 truncate max-w-48">{{ reason.reason }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-16 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  :style="{ width: `${getReasonPercentage(reason.count)}%` }"
                ></div>
              </div>
              <span class="text-sm font-medium text-white w-6 text-right">{{ reason.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Parent-Child Ratio -->
      <div class="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <h4 class="text-sm font-semibold text-white mb-4">Hierarchy Analysis</h4>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-white mb-1">{{ formatDecimal(stats.parent_child_ratio) }}</div>
            <div class="text-xs text-gray-400">Parent/Child Ratio</div>
            <div class="text-xs text-gray-500 mt-1">
              {{ stats.parent_child_ratio > 1 ? 'More parents than children' : 'More children than parents' }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white mb-1">{{ Math.floor((stats.max_depth - stats.average_depth) * 100) }}%</div>
            <div class="text-xs text-gray-400">Depth Variance</div>
            <div class="text-xs text-gray-500 mt-1">
              {{ stats.max_depth > stats.average_depth * 1.5 ? 'High variance' : 'Low variance' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Indicator -->
      <div class="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-800">
        <span>Last updated: {{ formatLastUpdate() }}</span>
        <div class="flex items-center space-x-2">
          <div 
            class="w-2 h-2 rounded-full"
            :class="isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'"
          ></div>
          <span>{{ isLive ? 'Live updates' : 'Static' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSessionRelationships } from '../composables/useSessionRelationships';
import type { SessionRelationshipStats } from '../types';

// Props
interface Props {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 30000 // 30 seconds
});

// Emits
const emit = defineEmits<{
  'stats-updated': [stats: SessionRelationshipStats];
  'error': [error: string];
}>();

// Composables
const sessionRelationships = useSessionRelationships();

// Component state
const loading = ref(false);
const error = ref<string | null>(null);
const lastUpdate = ref(Date.now());
const isLive = ref(true);

// Auto-refresh timer
let refreshTimer: number | null = null;

// Computed properties
const stats = computed(() => sessionRelationships.relationshipStats.value);

// Session type configurations
const typeIcons: Record<string, string> = {
  main: '🎯',
  subagent: '🤖',
  wave: '🌊',
  continuation: '🔗'
};

const typeColors: Record<string, string> = {
  main: 'bg-blue-500',
  subagent: 'bg-purple-500',
  wave: 'bg-cyan-500',
  continuation: 'bg-green-500'
};

const typeIconContainers: Record<string, string> = {
  main: 'bg-blue-500/20',
  subagent: 'bg-purple-500/20',
  wave: 'bg-cyan-500/20',
  continuation: 'bg-green-500/20'
};

// Helper functions
function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

function formatDecimal(num: number): string {
  return num.toFixed(1);
}

function formatPercentage(num: number): string {
  return `${Math.round(num * 100)}%`;
}

function getTypeIcon(type: string): string {
  return typeIcons[type] || '📄';
}

function getTypeColor(type: string): string {
  return typeColors[type] || 'bg-gray-500';
}

function getTypeIconContainer(type: string): string {
  return typeIconContainers[type] || 'bg-gray-500/20';
}

function getTypePercentage(count: number): number {
  if (stats.value.total_sessions === 0) return 0;
  return (count / stats.value.total_sessions) * 100;
}

function getReasonPercentage(count: number): number {
  const maxCount = Math.max(...stats.value.common_spawn_reasons.map(r => r.count));
  return maxCount > 0 ? (count / maxCount) * 100 : 0;
}

function formatLastUpdate(): string {
  const now = Date.now();
  const diff = now - lastUpdate.value;
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  
  return new Date(lastUpdate.value).toLocaleTimeString();
}

// Methods
async function loadStats(): Promise<void> {
  loading.value = true;
  error.value = null;
  
  try {
    await sessionRelationships.fetchRelationshipStats();
    lastUpdate.value = Date.now();
    emit('stats-updated', stats.value);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load statistics';
    error.value = message;
    emit('error', message);
    console.error('Error loading relationship stats:', err);
  } finally {
    loading.value = false;
  }
}

async function handleRefresh(): Promise<void> {
  await loadStats();
}

function startAutoRefresh(): void {
  if (!props.autoRefresh) return;
  
  refreshTimer = window.setInterval(() => {
    if (!loading.value) {
      loadStats();
    }
  }, props.refreshInterval);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// Lifecycle
onMounted(() => {
  loadStats();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});

// Watch for WebSocket connection status
// Note: This could be enhanced to watch actual WebSocket status from the composable
let connectionTimer: number | null = null;

onMounted(() => {
  connectionTimer = window.setInterval(() => {
    // Mock connection status - in real implementation, this would check WebSocket
    isLive.value = Math.random() > 0.1; // 90% live
  }, 5000);
});

onUnmounted(() => {
  if (connectionTimer) {
    clearInterval(connectionTimer);
  }
});
</script>

<style scoped>
/* Smooth animations for progress bars */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Pulse animation for live indicator */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

/* Hover effects for interactive elements */
.hover\:bg-gray-700\/50:hover {
  background-color: rgba(55, 65, 81, 0.5);
}

.hover\:bg-gray-800:hover {
  background-color: rgba(31, 41, 55, 1);
}

/* Loading spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>