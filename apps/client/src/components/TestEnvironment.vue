<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
    <!-- Environment Status Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <div class="flex items-center mr-4">
          <div 
            class="w-3 h-3 rounded-full mr-2 transition-all duration-300"
            :class="getStatusColor()"
          ></div>
          <span class="text-sm font-medium text-gray-300">
            {{ getStatusText() }}
          </span>
        </div>
        
        <div class="text-xs text-gray-400">
          ID: {{ environmentId }}
        </div>
      </div>
      
      <!-- Emergency Controls -->
      <div class="flex items-center space-x-2">
        <button
          v-if="canTerminate"
          @click="emergencyStop"
          class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs flex items-center transition-colors"
          title="Emergency stop execution"
        >
          <span class="mr-1">🚨</span>
          Kill
        </button>
        
        <button
          @click="showDetails = !showDetails"
          class="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs flex items-center transition-colors"
        >
          <span class="mr-1">{{ showDetails ? '🔼' : '🔽' }}</span>
          {{ showDetails ? 'Hide' : 'Details' }}
        </button>
      </div>
    </div>

    <!-- Security Status Indicators -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      <div class="flex items-center text-xs">
        <span class="mr-1">🛡️</span>
        <span class="text-gray-400">Sandbox:</span>
        <span class="ml-1 text-green-400">Active</span>
      </div>
      
      <div class="flex items-center text-xs">
        <span class="mr-1">🌐</span>
        <span class="text-gray-400">Network:</span>
        <span class="ml-1" :class="config.enableNetworkAccess ? 'text-yellow-400' : 'text-gray-500'">
          {{ config.enableNetworkAccess ? 'Allowed' : 'Blocked' }}
        </span>
      </div>
      
      <div class="flex items-center text-xs">
        <span class="mr-1">📁</span>
        <span class="text-gray-400">FileSystem:</span>
        <span class="ml-1" :class="config.enableFileSystemAccess ? 'text-yellow-400' : 'text-gray-500'">
          {{ config.enableFileSystemAccess ? 'Allowed' : 'Blocked' }}
        </span>
      </div>
      
      <div class="flex items-center text-xs">
        <span class="mr-1">⏱️</span>
        <span class="text-gray-400">Timeout:</span>
        <span class="ml-1 text-blue-400">{{ config.timeout / 1000 }}s</span>
      </div>
    </div>

    <!-- Resource Usage Monitoring -->
    <div v-if="showDetails" class="mb-4 bg-gray-900 rounded p-3">
      <h4 class="text-xs font-medium text-gray-300 mb-2">Resource Monitoring</h4>
      
      <div class="space-y-2">
        <!-- Memory Usage Bar -->
        <div>
          <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span>Memory Usage</span>
            <span>{{ formatBytes(estimatedMemoryUsage) }} / {{ formatBytes(config.maxMemory) }}</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              :class="getMemoryUsageColor()"
              :style="{ width: memoryUsagePercentage + '%' }"
            ></div>
          </div>
        </div>
        
        <!-- Execution Time -->
        <div>
          <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span>Execution Time</span>
            <span>{{ formatDuration(executionTime) }}</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              :class="getExecutionTimeColor()"
              :style="{ width: executionTimePercentage + '%' }"
            ></div>
          </div>
        </div>
        
        <!-- CSP Status -->
        <div class="mt-3 p-2 bg-gray-800 rounded border border-gray-600">
          <div class="text-xs font-medium text-green-400 mb-1">Content Security Policy</div>
          <div class="text-xs text-gray-400 font-mono">
            {{ cspPolicy }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sandbox iframe (hidden) -->
    <div class="hidden">
      <div ref="sandboxContainer"></div>
    </div>

    <!-- Error Display -->
    <Transition name="slide-down">
      <div v-if="error" class="bg-red-900/30 border border-red-600 rounded p-3 mb-4">
        <div class="flex items-start">
          <span class="text-red-400 mr-2 flex-shrink-0">🚨</span>
          <div>
            <div class="text-sm font-medium text-red-400 mb-1">Sandbox Error</div>
            <div class="text-xs text-red-300">{{ error }}</div>
            <button
              @click="clearError"
              class="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Clear Error
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Debug Information -->
    <div v-if="showDetails && debugInfo" class="mt-4 bg-gray-900 rounded p-3">
      <h4 class="text-xs font-medium text-gray-300 mb-2">Debug Information</h4>
      <pre class="text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto">{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import type { ExecutionConfig, SandboxEnvironment } from '../services/hookTestRunner';

interface Props {
  environmentId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'terminated';
  config: ExecutionConfig;
  executionTime?: number;
  memoryUsage?: number;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  executionTime: 0,
  memoryUsage: 0
});

const emit = defineEmits<{
  terminate: [environmentId: string];
  statusChange: [environmentId: string, status: string];
}>();

// Component state
const showDetails = ref(false);
const estimatedMemoryUsage = ref(0);
const debugInfo = ref('');

// CSP Policy for sandbox
const cspPolicy = computed(() => [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  props.config.enableNetworkAccess ? "connect-src 'self'" : "connect-src 'none'"
].join('; '));

// Computed properties for monitoring
const memoryUsagePercentage = computed(() => {
  return Math.min(100, (estimatedMemoryUsage.value / props.config.maxMemory) * 100);
});

const executionTimePercentage = computed(() => {
  return Math.min(100, (props.executionTime / props.config.timeout) * 100);
});

const canTerminate = computed(() => {
  return ['running', 'idle'].includes(props.status);
});

// Status methods
const getStatusText = () => {
  const statusMap = {
    idle: '⏳ Ready',
    running: '🔄 Executing',
    completed: '✅ Completed',
    failed: '❌ Failed',
    terminated: '🛑 Terminated'
  };
  return statusMap[props.status] || 'Unknown';
};

const getStatusColor = () => {
  const colorMap = {
    idle: 'bg-gray-400',
    running: 'bg-blue-400 animate-pulse',
    completed: 'bg-green-400',
    failed: 'bg-red-400',
    terminated: 'bg-gray-600'
  };
  return colorMap[props.status] || 'bg-gray-400';
};

const getMemoryUsageColor = () => {
  const percentage = memoryUsagePercentage.value;
  if (percentage < 50) return 'bg-green-400';
  if (percentage < 75) return 'bg-yellow-400';
  return 'bg-red-400';
};

const getExecutionTimeColor = () => {
  const percentage = executionTimePercentage.value;
  if (percentage < 50) return 'bg-green-400';
  if (percentage < 75) return 'bg-yellow-400';
  return 'bg-red-400';
};

// Utility methods
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

// Event handlers
const emergencyStop = () => {
  emit('terminate', props.environmentId);
  emit('statusChange', props.environmentId, 'terminated');
};

const clearError = () => {
  // Error clearing would be handled by parent component
  emit('statusChange', props.environmentId, 'idle');
};

// Resource monitoring simulation
const updateResourceUsage = () => {
  if (props.status === 'running') {
    // Simulate memory usage growth during execution
    estimatedMemoryUsage.value = Math.min(
      props.config.maxMemory,
      estimatedMemoryUsage.value + Math.random() * 1024 * 1024 // +1MB random
    );
    
    // Update debug info
    debugInfo.value = `Sandbox Environment Debug Info:
Environment ID: ${props.environmentId}
Status: ${props.status}
Execution Time: ${formatDuration(props.executionTime)}
Memory Usage: ${formatBytes(estimatedMemoryUsage.value)}
CSP Policy: ${cspPolicy.value}
Network Access: ${props.config.enableNetworkAccess ? 'Enabled' : 'Disabled'}
File System Access: ${props.config.enableFileSystemAccess ? 'Enabled' : 'Disabled'}
Timeout: ${formatDuration(props.config.timeout)}
Created: ${new Date().toISOString()}`;
  }
};

// Watchers
watch(() => props.status, (newStatus) => {
  if (newStatus === 'running') {
    // Start resource monitoring
    const interval = setInterval(updateResourceUsage, 500);
    onBeforeUnmount(() => clearInterval(interval));
  } else if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'terminated') {
    // Reset memory usage
    estimatedMemoryUsage.value = 0;
  }
});

// Lifecycle
onMounted(() => {
  updateResourceUsage();
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* Animation for running status */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>