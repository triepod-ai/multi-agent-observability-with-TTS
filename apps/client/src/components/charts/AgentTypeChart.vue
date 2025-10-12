<template>
  <div class="relative h-full">
    <!-- Chart content -->
    <div class="h-full overflow-y-auto pr-2 custom-scrollbar">
      <div class="space-y-2">
        <div
          v-for="(agentType, index) in chartData"
          :key="agentType.type"
          class="group bg-gray-800/50 hover:bg-gray-800/70 rounded-lg p-3 cursor-pointer transition-all duration-200 animate-slide-in"
          :style="{ animationDelay: `${index * 100}ms` }"
          @mouseenter="handleTypeHover(agentType)"
          @mouseleave="clearHover"
          @click="handleTypeClick(agentType)"
        >
          <div class="flex items-center justify-between">
            <!-- Agent Type Info -->
            <div class="flex items-center space-x-3 flex-1 min-w-0">
              <div class="text-2xl group-hover:scale-110 transition-transform duration-200">
                {{ agentType.icon }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <h4 class="font-medium text-white truncate">{{ agentType.displayName }}</h4>
                  <span class="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                    {{ agentType.count }}
                  </span>
                </div>
                <div class="text-xs text-gray-400 mt-1 flex items-center space-x-4">
                  <span v-if="agentType.avgDuration > 0">{{ agentType.avgDuration }}s avg</span>
                  <span v-if="agentType.totalTokens > 0">{{ formatTokens(agentType.totalTokens) }} tokens</span>
                </div>
              </div>
            </div>
            
            <!-- Progress Bars -->
            <div class="flex flex-col items-end space-y-2 ml-4">
              <!-- Usage bar -->
              <div class="flex items-center space-x-2">
                <span class="text-xs text-gray-400 w-12 text-right">Usage</span>
                <div class="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500 group-hover:from-purple-400 group-hover:to-purple-300"
                    :style="{ width: `${(agentType.count / maxCount) * 100}%` }"
                  ></div>
                </div>
                <span class="text-xs text-white font-medium w-8">{{ agentType.count }}</span>
              </div>

              <!-- Performance indicator -->
              <div class="flex items-center space-x-2">
                <span class="text-xs text-gray-400 w-12 text-right">Speed</span>
                <div class="flex items-center space-x-1">
                  <div
                    v-for="dot in 5"
                    :key="dot"
                    class="w-1.5 h-1.5 rounded-full transition-colors duration-200"
                    :class="getSpeedIndicatorColor(agentType.avgDuration, dot)"
                  ></div>
                </div>
                <span class="text-xs text-blue-400 font-medium w-8">
                  {{ agentType.avgDuration > 0 ? `${agentType.avgDuration}s` : '-' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Click indicator -->
          <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-if="chartData.length === 0" class="h-full flex items-center justify-center">
      <div class="text-center text-gray-500">
        <div class="text-4xl mb-2">🤖</div>
        <p class="text-sm">No agent types</p>
      </div>
    </div>
    
    <!-- Summary stats -->
    <div v-if="chartData.length > 0" class="mt-4 pt-4 border-t border-gray-700">
      <div class="flex justify-between items-center text-xs text-gray-400">
        <span>{{ chartData.length }} agent types</span>
        <span>{{ totalExecutions }} total executions</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AgentTypeDistribution } from '../../types';

interface Props {
  typeData: AgentTypeDistribution[];
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'type-filter': [type: string];
  'type-hover': [type: string];
}>();

// State
const hoveredType = ref<string | null>(null);

// Computed properties
const chartData = computed(() => {
  if (!props.typeData || props.typeData.length === 0) {
    return [];
  }
  
  return props.typeData
    .filter(type => type.count > 0)
    .sort((a, b) => b.count - a.count);
});

const maxCount = computed(() => {
  if (chartData.value.length === 0) return 1;
  return Math.max(...chartData.value.map(type => type.count));
});

const totalExecutions = computed(() => {
  return chartData.value.reduce((sum, type) => sum + type.count, 0);
});

const avgSuccessRate = computed(() => {
  if (chartData.value.length === 0) return 0;
  const totalSuccessRate = chartData.value.reduce((sum, type) => sum + type.successRate, 0);
  return Math.round(totalSuccessRate / chartData.value.length);
});

// Methods
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function getSpeedIndicatorColor(avgDuration: number, position: number): string {
  if (avgDuration === 0) return 'bg-gray-600';
  
  // Convert duration to speed rating (1-5 dots)
  // Faster execution = more green dots
  let speedRating = 5;
  if (avgDuration > 30) speedRating = 1;
  else if (avgDuration > 20) speedRating = 2;
  else if (avgDuration > 10) speedRating = 3;
  else if (avgDuration > 5) speedRating = 4;
  
  if (position <= speedRating) {
    if (speedRating >= 4) return 'bg-green-400';
    if (speedRating >= 3) return 'bg-yellow-400';
    if (speedRating >= 2) return 'bg-orange-400';
    return 'bg-red-400';
  }
  
  return 'bg-gray-600';
}

function handleTypeHover(agentType: AgentTypeDistribution) {
  hoveredType.value = agentType.type;
  emit('type-hover', agentType.type);
}

function clearHover() {
  hoveredType.value = null;
}

function handleTypeClick(agentType: AgentTypeDistribution) {
  emit('type-filter', agentType.type);
}
</script>

<style scoped>
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.5s ease-out both;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4B5563 #1F2937;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1F2937;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}

/* Hover animations */
.group:hover .w-20 {
  transform: scaleX(1.02);
}

.group:hover .text-2xl {
  filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.3));
}
</style>