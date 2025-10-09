<template>
  <div class="space-y-4">
    <!-- Compact Header with Controls -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Agent Operations</h1>
        <p class="text-sm text-gray-400">Performance monitoring and analytics</p>
      </div>
      <div class="flex items-center space-x-2">
        <!-- Time Range Selector -->
        <select 
          v-model="selectedTimeRange"
          class="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
        
        <!-- Live Status -->
        <div class="flex items-center space-x-1">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-xs text-green-400 font-medium">Live</span>
        </div>
      </div>
    </div>

    <!-- Streamlined Metrics Grid (3x2 instead of 4x2) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Total Executions -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
        <div class="flex items-center justify-between mb-2">
          <div class="text-purple-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="flex items-center text-xs">
            <svg class="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l10-10M17 7l-10 10" />
            </svg>
            <span class="text-green-500 font-medium">+12.5%</span>
          </div>
        </div>
        <div class="text-2xl font-bold text-white mb-1">{{ formatNumber(metrics.totalExecutions) }}</div>
        <div class="text-xs text-gray-400">Total Executions</div>
      </div>

      <!-- Success Rate -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
        <div class="flex items-center justify-between mb-2">
          <div class="text-green-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex items-center text-xs">
            <svg class="w-3 h-3 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span class="text-red-500 font-medium">-2.1%</span>
          </div>
        </div>
        <div class="text-2xl font-bold text-white mb-1">{{ metrics.successRate }}%</div>
        <div class="text-xs text-gray-400">Success Rate</div>
      </div>

      <!-- Average Response Time -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
        <div class="flex items-center justify-between mb-2">
          <div class="text-blue-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex items-center text-xs">
            <svg class="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l10-10M17 7l-10 10" />
            </svg>
            <span class="text-green-500 font-medium">-15.3%</span>
          </div>
        </div>
        <div class="text-2xl font-bold text-white mb-1">{{ metrics.avgResponseTime }}ms</div>
        <div class="text-xs text-gray-400">Avg Response Time</div>
      </div>
    </div>

    <!-- Quick Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div class="bg-gray-800/50 border border-gray-700 rounded p-3 text-center">
        <div class="text-lg font-bold text-cyan-400">{{ metrics.recentSessions }}</div>
        <div class="text-xs text-gray-400">Recent Sessions</div>
      </div>
      <div class="bg-gray-800/50 border border-gray-700 rounded p-3 text-center">
        <div class="text-lg font-bold text-red-400">{{ metrics.errorRate }}%</div>
        <div class="text-xs text-gray-400">Error Rate</div>
      </div>
      <div class="bg-gray-800/50 border border-gray-700 rounded p-3 text-center">
        <div class="text-lg font-bold text-orange-400">{{ metrics.toolsUsed }}</div>
        <div class="text-xs text-gray-400">Tools Used</div>
      </div>
    </div>

    <!-- Expandable Detailed Analytics -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg">
      <div class="p-4 border-b border-gray-700">
        <button
          @click="showDetailedAnalytics = !showDetailedAnalytics"
          class="flex items-center justify-between w-full text-left"
        >
          <h3 class="text-lg font-semibold text-white">Detailed Analytics</h3>
          <svg 
            class="w-5 h-5 text-gray-400 transform transition-transform duration-200"
            :class="{ 'rotate-180': showDetailedAnalytics }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      <Transition name="expand">
        <div v-show="showDetailedAnalytics" class="p-4 space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Performance Trends -->
            <div>
              <h4 class="text-sm font-medium text-white mb-3">Performance Trends</h4>
              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">Success Rate</span>
                    <span class="text-green-400">{{ metrics.successRate }}%</span>
                  </div>
                  <div class="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      class="bg-green-500 h-2 rounded-full transition-all duration-500"
                      :style="{ width: metrics.successRate + '%' }"
                    ></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">Response Time</span>
                    <span class="text-blue-400">{{ metrics.avgResponseTime }}ms</span>
                  </div>
                  <div class="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      :style="{ width: Math.min((1000 - metrics.avgResponseTime) / 10, 100) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Agent Type Distribution -->
            <div>
              <h4 class="text-sm font-medium text-white mb-3">Agent Types</h4>
              <div class="space-y-2">
                <div 
                  v-for="type in agentTypes"
                  :key="type.name"
                  class="flex items-center justify-between p-2 bg-gray-900/50 rounded"
                >
                  <div class="flex items-center space-x-2">
                    <span class="text-sm">{{ type.icon }}</span>
                    <span class="text-sm text-gray-300">{{ type.name }}</span>
                  </div>
                  <div class="text-sm font-medium text-white">{{ type.count }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- System Health -->
          <div class="pt-4 border-t border-gray-700">
            <h4 class="text-sm font-medium text-white mb-3">System Health</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl mb-1">💚</div>
                <div class="text-sm text-green-400 font-medium">Healthy</div>
                <div class="text-xs text-gray-400">All systems operational</div>
              </div>
              <div class="text-center">
                <div class="text-2xl mb-1">⚡</div>
                <div class="text-sm text-blue-400 font-medium">Fast</div>
                <div class="text-xs text-gray-400">Sub-second response</div>
              </div>
              <div class="text-center">
                <div class="text-2xl mb-1">🔄</div>
                <div class="text-sm text-purple-400 font-medium">Active</div>
                <div class="text-xs text-gray-400">{{ metrics.recentSessions }} recent sessions</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Props (would typically come from parent component)
interface Props {
  events?: any[];
}

const props = defineProps<Props>();

// State
const selectedTimeRange = ref('24h');
const showDetailedAnalytics = ref(false);

// Mock metrics (would be computed from real data)
const metrics = computed(() => ({
  totalExecutions: 1247,
  successRate: 94.2,
  avgResponseTime: 245,
  recentSessions: 8,
  errorRate: 2.3,
  toolsUsed: 12
}));

const agentTypes = computed(() => [
  { name: 'Analyzer', icon: '🔍', count: 3 },
  { name: 'Generator', icon: '⚡', count: 2 },
  { name: 'Reviewer', icon: '✅', count: 2 },
  { name: 'Debugger', icon: '🐛', count: 1 }
]);

// Helper functions
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};
</script>

<style scoped>
/* Expand transition */
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
  max-height: 500px;
}
</style>