<template>
  <div class="refresh-controls flex items-center space-x-2">
    <!-- Manual Refresh Button -->
    <button
      @click="handleRefresh"
      :disabled="isRefreshing"
      class="refresh-btn flex items-center space-x-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
      :title="isRefreshing ? 'Refreshing...' : 'Refresh hook data'"
    >
      <svg 
        class="w-3 h-3 transition-transform duration-200" 
        :class="{ 'animate-spin': isRefreshing }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span>{{ isRefreshing ? 'Refreshing' : 'Refresh' }}</span>
    </button>

    <!-- Auto-refresh Toggle -->
    <label class="auto-refresh-toggle flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
      <input 
        type="checkbox" 
        v-model="autoRefreshEnabled"
        @change="toggleAutoRefresh"
        class="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
      >
      <span>Auto</span>
    </label>

    <!-- Cache Status Indicator -->
    <div class="cache-status flex items-center space-x-1 text-xs text-gray-400" :title="cacheStatusTooltip">
      <span class="w-1.5 h-1.5 rounded-full" :class="cacheStatusColor"></span>
      <span>{{ cacheStats.size }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { hookCoverageService } from '../services/hookCoverageService';

const emit = defineEmits<{
  refresh: [];
}>();

// State
const isRefreshing = ref(false);
const autoRefreshEnabled = ref(false);
const autoRefreshInterval = ref<number | null>(null);
const cacheStats = ref({ size: 0, keys: [] as string[] });

// Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

/**
 * Handle manual refresh
 */
async function handleRefresh() {
  if (isRefreshing.value) return;
  
  isRefreshing.value = true;
  
  try {
    // Clear service cache to force fresh data
    hookCoverageService.clearCache();
    
    // Emit refresh event to parent
    emit('refresh');
    
    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update cache stats
    updateCacheStats();
  } catch (error) {
    console.error('Error during manual refresh:', error);
  } finally {
    isRefreshing.value = false;
  }
}

/**
 * Toggle auto-refresh functionality
 */
function toggleAutoRefresh() {
  if (autoRefreshEnabled.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

/**
 * Start auto-refresh timer
 */
function startAutoRefresh() {
  if (autoRefreshInterval.value) return; // Already running
  
  autoRefreshInterval.value = window.setInterval(async () => {
    if (!isRefreshing.value) {
      await handleRefresh();
    }
  }, AUTO_REFRESH_INTERVAL);
}

/**
 * Stop auto-refresh timer
 */
function stopAutoRefresh() {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value);
    autoRefreshInterval.value = null;
  }
}

/**
 * Update cache statistics
 */
function updateCacheStats() {
  cacheStats.value = hookCoverageService.getCacheStats();
}

// Computed properties
const cacheStatusColor = ref('bg-gray-500');
const cacheStatusTooltip = ref('Cache status');

// Update cache status indicators
function updateCacheStatus() {
  const stats = cacheStats.value;
  
  if (stats.size === 0) {
    cacheStatusColor.value = 'bg-red-500';
    cacheStatusTooltip.value = 'Cache empty - fresh data on next request';
  } else if (stats.size < 4) {
    cacheStatusColor.value = 'bg-yellow-500';
    cacheStatusTooltip.value = `Partial cache: ${stats.size} entries`;
  } else {
    cacheStatusColor.value = 'bg-green-500';
    cacheStatusTooltip.value = `Cache active: ${stats.size} entries`;
  }
}

// Lifecycle
onMounted(() => {
  updateCacheStats();
  updateCacheStatus();
  
  // Update cache stats periodically
  const statsInterval = setInterval(() => {
    updateCacheStats();
    updateCacheStatus();
  }, 5000);
  
  // Cleanup interval on unmount
  onUnmounted(() => {
    clearInterval(statsInterval);
  });
});

onUnmounted(() => {
  stopAutoRefresh();
});

// Watch cache stats for status updates
import { watch } from 'vue';
watch(() => cacheStats.value.size, updateCacheStatus);
</script>

<style scoped>
.refresh-btn {
  @apply transition-all duration-200;
}

.refresh-btn:hover:not(:disabled) {
  @apply shadow-lg;
}

.auto-refresh-toggle input:checked {
  @apply bg-blue-600 border-blue-600;
}

.cache-status {
  @apply transition-colors duration-200;
}
</style>