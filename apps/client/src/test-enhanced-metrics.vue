<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Enhanced Agent Metrics Test</h2>
    
    <!-- Connection Status -->
    <div class="mb-4 p-3 rounded" :class="connectionStatusClasses">
      <div class="flex items-center gap-2">
        <span>{{ connectionStatusIcon }}</span>
        <span class="font-medium">{{ connectionStatusText }}</span>
      </div>
      <div v-if="statusMessage" class="text-sm mt-1">{{ statusMessage }}</div>
    </div>
    
    <!-- Error Display -->
    <div v-if="currentError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
      <div class="flex items-center gap-2 text-red-700">
        <span>⚠️</span>
        <span class="font-medium">Error: {{ currentError.type }}</span>
      </div>
      <div class="text-sm text-red-600 mt-1">{{ currentError.message }}</div>
      <button 
        v-if="showRetryButton" 
        @click="retryFailedOperations"
        class="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
      >
        Retry
      </button>
    </div>
    
    <!-- Loading Progress -->
    <div v-if="loadingStates.overall" class="mb-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span class="text-sm">Loading data... {{ loadingProgress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" :style="{ width: loadingProgress + '%' }"></div>
      </div>
    </div>
    
    <!-- Cache Status -->
    <div class="mb-4 p-3 bg-gray-50 rounded">
      <div class="flex items-center gap-2">
        <span>💾</span>
        <span class="font-medium">Cache Status: {{ cacheStatus }}</span>
        <button @click="clearCache" class="ml-2 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">
          Clear Cache
        </button>
      </div>
    </div>
    
    <!-- Metrics Display -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div class="p-3 bg-blue-50 rounded">
        <div class="text-2xl font-bold text-blue-600">{{ metrics.totalExecutions }}</div>
        <div class="text-sm text-blue-800">Total Executions</div>
      </div>
      <div class="p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-600">{{ metrics.successRate }}%</div>
        <div class="text-sm text-green-800">Success Rate</div>
      </div>
      <div class="p-3 bg-purple-50 rounded">
        <div class="text-2xl font-bold text-purple-600">{{ metrics.avgDuration }}s</div>
        <div class="text-sm text-purple-800">Avg Duration</div>
      </div>
      <div class="p-3 bg-orange-50 rounded">
        <div class="text-2xl font-bold text-orange-600">{{ metrics.agentTypes }}</div>
        <div class="text-sm text-orange-800">Agent Types</div>
      </div>
    </div>
    
    <!-- Controls -->
    <div class="flex gap-2 mb-4">
      <button @click="refreshData" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Refresh Data
      </button>
      <button @click="forceRefresh" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
        Force Refresh
      </button>
      <button @click="exportMetrics" class="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
        Export Metrics
      </button>
      <button @click="runTestAgent" class="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
        Run Test Agent
      </button>
    </div>
    
    <!-- Recent Errors -->
    <div v-if="errorHistory.length > 0" class="p-3 bg-red-50 rounded">
      <div class="font-medium text-red-700 mb-2">Recent Errors ({{ errorHistory.length }})</div>
      <div v-for="error in errorHistory.slice(0, 3)" :key="error.timestamp" class="text-sm text-red-600 mb-1">
        <span class="font-medium">{{ new Date(error.timestamp).toLocaleTimeString() }}:</span>
        {{ error.type }} - {{ error.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentMetrics } from './composables/useAgentMetrics'
import type { HookEvent } from './types'

// Mock events for testing
const mockEvents = ref<HookEvent[]>([
  {
    source_app: 'claude-code',
    session_id: 'test-session-1',
    hook_event_type: 'UserPromptSubmit',
    payload: { message: '@debugger analyze performance issues' },
    timestamp: Date.now() - 300000
  },
  {
    source_app: 'claude-code', 
    session_id: 'test-session-1',
    hook_event_type: 'SubagentStop',
    payload: { result: 'Analysis complete', success: true },
    timestamp: Date.now() - 240000
  }
])

// Initialize the enhanced metrics composable
const {
  // Core data
  metrics,
  timelineData,
  agentTypeDistribution,
  toolUsage,
  lastUpdate,
  
  // Loading states
  loadingStates,
  loadingProgress,
  
  // Connection & health
  connectionStatus,
  wsConnectionState,
  connectionHealth,
  
  // Error handling
  currentError,
  errorHistory,
  isOfflineMode,
  isDegradedMode,
  statusMessage,
  showRetryButton,
  
  // Cache management
  cacheStatus,
  
  // Methods
  refreshData,
  forceRefresh,
  retryFailedOperations,
  exportMetrics,
  runTestAgent,
  clearCache,
  reconnectWebSocket
} = useAgentMetrics(mockEvents)

// Computed properties for UI
const connectionStatusClasses = computed(() => {
  switch (connectionStatus.value) {
    case 'excellent': return 'bg-green-50 border border-green-200 text-green-800'
    case 'good': return 'bg-blue-50 border border-blue-200 text-blue-800'
    case 'degraded': return 'bg-yellow-50 border border-yellow-200 text-yellow-800'
    case 'unhealthy': return 'bg-orange-50 border border-orange-200 text-orange-800'
    case 'offline': return 'bg-red-50 border border-red-200 text-red-800'
    default: return 'bg-gray-50 border border-gray-200 text-gray-800'
  }
})

const connectionStatusIcon = computed(() => {
  switch (connectionStatus.value) {
    case 'excellent': return '🟢'
    case 'good': return '🔵'
    case 'degraded': return '🟡'
    case 'unhealthy': return '🟠'
    case 'offline': return '🔴'
    default: return '⚪'
  }
})

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'excellent': return 'Excellent - Real-time updates active'
    case 'good': return 'Good - Backend connected'
    case 'degraded': return 'Degraded - Using cached data'
    case 'unhealthy': return 'Unhealthy - Connection issues'
    case 'offline': return 'Offline - No connection'
    default: return 'Unknown'
  }
})
</script>