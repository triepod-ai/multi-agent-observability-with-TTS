<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
    <!-- Header with Result Status -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <span class="text-lg mr-2">{{ getResultIcon() }}</span>
        <h3 class="text-sm font-semibold text-gray-300">Execution Result</h3>
        <span 
          class="ml-3 px-2 py-1 rounded text-xs font-medium"
          :class="getResultStatusClass()"
        >
          {{ result.success ? 'Success' : 'Failed' }}
        </span>
      </div>
      
      <div class="flex items-center space-x-2">
        <div class="text-xs text-gray-400">
          {{ formatDuration(result.executionTime) }}
        </div>
        
        <button
          @click="showRawData = !showRawData"
          class="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs flex items-center transition-colors"
        >
          <span class="mr-1">🔍</span>
          {{ showRawData ? 'Hide Raw' : 'Raw Data' }}
        </button>
        
        <button
          @click="copyOutput"
          class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs flex items-center transition-colors"
          :class="{ 'text-green-400': showCopiedFeedback }"
        >
          <span class="mr-1">{{ showCopiedFeedback ? '✓' : '📋' }}</span>
          {{ showCopiedFeedback ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>

    <!-- Security Validation Results -->
    <div v-if="result.validationResult" class="mb-4">
      <div class="flex items-center mb-2">
        <span class="text-sm font-medium text-gray-300 mr-2">Security Validation</span>
        <span 
          class="px-2 py-1 rounded text-xs font-medium flex items-center"
          :class="getValidationStatusClass()"
        >
          {{ getValidationIcon() }}
          <span class="ml-1">{{ getValidationStatus() }}</span>
        </span>
      </div>
      
      <!-- Validation Details -->
      <div class="bg-gray-900 rounded p-3 space-y-2">
        <!-- Risk Level -->
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-400">Risk Level:</span>
          <span 
            class="font-medium flex items-center"
            :class="getRiskLevelColor()"
          >
            {{ getRiskLevelIcon() }}
            <span class="ml-1 capitalize">{{ result.validationResult.riskLevel }}</span>
          </span>
        </div>
        
        <!-- Errors (if any) -->
        <div v-if="result.validationResult.errors.length > 0">
          <div class="text-xs font-medium text-red-400 mb-1">Errors:</div>
          <div class="space-y-1">
            <div 
              v-for="error in result.validationResult.errors" 
              :key="error"
              class="text-xs text-red-300 bg-red-900/30 rounded px-2 py-1 border border-red-600"
            >
              ❌ {{ error }}
            </div>
          </div>
        </div>
        
        <!-- Warnings (if any) -->
        <div v-if="result.validationResult.warnings.length > 0">
          <div class="text-xs font-medium text-yellow-400 mb-1">Warnings:</div>
          <div class="space-y-1">
            <div 
              v-for="warning in result.validationResult.warnings" 
              :key="warning"
              class="text-xs text-yellow-300 bg-yellow-900/30 rounded px-2 py-1 border border-yellow-600"
            >
              ⚠️ {{ warning }}
            </div>
          </div>
        </div>
        
        <!-- Suggestions (if any) -->
        <div v-if="result.validationResult.suggestions && result.validationResult.suggestions.length > 0">
          <div class="text-xs font-medium text-blue-400 mb-1">Suggestions:</div>
          <div class="space-y-1">
            <div 
              v-for="suggestion in result.validationResult.suggestions" 
              :key="suggestion"
              class="text-xs text-blue-300 bg-blue-900/30 rounded px-2 py-1 border border-blue-600"
            >
              💡 {{ suggestion }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Output Display -->
    <div v-if="result.output || result.error" class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium text-gray-300">Output</h4>
        <div class="flex items-center space-x-2 text-xs text-gray-400">
          <span>Exit Code: {{ result.exitCode }}</span>
          <span v-if="result.memoryUsage">Memory: {{ formatBytes(result.memoryUsage) }}</span>
        </div>
      </div>
      
      <!-- Success Output -->
      <div v-if="result.success && result.output" class="bg-gray-950 rounded border border-green-600 p-3">
        <div class="flex items-center mb-2">
          <span class="text-green-400 mr-2">💻</span>
          <span class="text-xs font-medium text-green-400">Execution Output</span>
        </div>
        <pre 
          class="text-sm text-green-300 whitespace-pre-wrap overflow-x-auto"
          v-html="formatOutput(result.sanitizedOutput || result.output)"
        ></pre>
      </div>
      
      <!-- Error Output -->
      <div v-else-if="!result.success" class="bg-gray-950 rounded border border-red-600 p-3">
        <div class="flex items-center mb-2">
          <span class="text-red-400 mr-2">🚨</span>
          <span class="text-xs font-medium text-red-400">Error Output</span>
        </div>
        
        <!-- Error Message -->
        <div v-if="result.error" class="mb-2">
          <div class="text-xs font-medium text-red-400 mb-1">Error:</div>
          <pre class="text-sm text-red-300 whitespace-pre-wrap overflow-x-auto">{{ result.error }}</pre>
        </div>
        
        <!-- Partial Output (if any) -->
        <div v-if="result.output">
          <div class="text-xs font-medium text-yellow-400 mb-1">Partial Output:</div>
          <pre class="text-sm text-yellow-300 whitespace-pre-wrap overflow-x-auto">{{ result.output }}</pre>
        </div>
      </div>
    </div>

    <!-- Warnings Display -->
    <div v-if="result.warnings && result.warnings.length > 0" class="mb-4">
      <h4 class="text-sm font-medium text-yellow-400 mb-2">Execution Warnings</h4>
      <div class="space-y-1">
        <div 
          v-for="warning in result.warnings" 
          :key="warning"
          class="text-xs text-yellow-300 bg-yellow-900/20 rounded px-2 py-1 border border-yellow-700"
        >
          ⚠️ {{ warning }}
        </div>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="mb-4 bg-gray-900 rounded p-3">
      <h4 class="text-xs font-medium text-gray-300 mb-2">Performance Metrics</h4>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="text-center">
          <div class="text-xs text-gray-400">Execution Time</div>
          <div class="text-sm font-medium" :class="getExecutionTimeColor()">
            {{ formatDuration(result.executionTime) }}
          </div>
        </div>
        
        <div class="text-center">
          <div class="text-xs text-gray-400">Exit Code</div>
          <div class="text-sm font-medium" :class="result.exitCode === 0 ? 'text-green-400' : 'text-red-400'">
            {{ result.exitCode }}
          </div>
        </div>
        
        <div v-if="result.memoryUsage" class="text-center">
          <div class="text-xs text-gray-400">Memory Peak</div>
          <div class="text-sm font-medium text-blue-400">
            {{ formatBytes(result.memoryUsage) }}
          </div>
        </div>
        
        <div class="text-center">
          <div class="text-xs text-gray-400">Output Size</div>
          <div class="text-sm font-medium text-purple-400">
            {{ formatBytes(result.output?.length || 0) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Raw Data Display -->
    <Transition name="slide-down">
      <div v-if="showRawData" class="bg-gray-950 rounded border border-gray-600 p-3">
        <h4 class="text-xs font-medium text-gray-300 mb-2">Raw Execution Data</h4>
        <pre class="text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto">{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ExecutionResult } from '../services/hookTestRunner';

interface Props {
  result: ExecutionResult;
}

const props = defineProps<Props>();

// Component state
const showRawData = ref(false);
const showCopiedFeedback = ref(false);

// Result status methods
const getResultIcon = () => {
  return props.result.success ? '✅' : '❌';
};

const getResultStatusClass = () => {
  return props.result.success
    ? 'bg-green-900/30 text-green-400 border border-green-600'
    : 'bg-red-900/30 text-red-400 border border-red-600';
};

// Validation status methods
const getValidationStatus = () => {
  if (!props.result.validationResult) return 'N/A';
  return props.result.validationResult.valid ? 'Passed' : 'Failed';
};

const getValidationStatusClass = () => {
  if (!props.result.validationResult) return 'bg-gray-600 text-gray-300';
  
  return props.result.validationResult.valid
    ? 'bg-green-900/30 text-green-400 border border-green-600'
    : 'bg-red-900/30 text-red-400 border border-red-600';
};

const getValidationIcon = () => {
  if (!props.result.validationResult) return '❓';
  return props.result.validationResult.valid ? '✅' : '❌';
};

// Risk level methods
const getRiskLevelColor = () => {
  if (!props.result.validationResult) return 'text-gray-400';
  
  const colorMap = {
    safe: 'text-green-400',
    low: 'text-yellow-400',
    medium: 'text-orange-400',
    high: 'text-red-400',
    critical: 'text-red-600'
  };
  
  return colorMap[props.result.validationResult.riskLevel] || 'text-gray-400';
};

const getRiskLevelIcon = () => {
  if (!props.result.validationResult) return '❓';
  
  const iconMap = {
    safe: '✅',
    low: '⚠️',
    medium: '🟡',
    high: '🔴',
    critical: '🚨'
  };
  
  return iconMap[props.result.validationResult.riskLevel] || '❓';
};

// Performance methods
const getExecutionTimeColor = () => {
  const time = props.result.executionTime;
  if (time < 1000) return 'text-green-400'; // Fast
  if (time < 5000) return 'text-yellow-400'; // Medium
  return 'text-red-400'; // Slow
};

// Utility methods
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatOutput = (output: string): string => {
  // Simple XSS protection and formatting
  return output
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    // Add syntax highlighting for common patterns
    .replace(/^(✅|❌|⚠️|🔧|📊|🏗️|🛡️|📝|🤖)/gm, '<span class="text-yellow-400">$1</span>')
    .replace(/(\d+ms|\d+s|\d+\.\d+s)/g, '<span class="text-blue-300">$1</span>')
    .replace(/(ALLOWED|SUCCESS|✓)/g, '<span class="text-green-400">$1</span>')
    .replace(/(BLOCKED|FAILED|ERROR|❌)/g, '<span class="text-red-400">$1</span>');
};

// Event handlers
const copyOutput = async () => {
  try {
    const textToCopy = props.result.sanitizedOutput || props.result.output || props.result.error || '';
    await navigator.clipboard.writeText(textToCopy);
    showCopiedFeedback.value = true;
    setTimeout(() => {
      showCopiedFeedback.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy output:', err);
  }
};
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
  max-height: 500px;
}

/* Ensure code blocks are readable */
pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}

/* Highlight special output patterns */
.text-highlight {
  background-color: rgba(59, 130, 246, 0.1);
  padding: 0 4px;
  border-radius: 3px;
}
</style>