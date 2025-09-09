<template>
  <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
    <!-- Chart Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-semibold text-white">{{ title }}</h3>
          <p class="text-xs text-gray-400">{{ subtitle }}</p>
        </div>
      </div>
      
      <!-- Chart Controls -->
      <div class="flex items-center space-x-2">
        <button
          v-if="showTimeRange"
          v-for="range in timeRangeOptions"
          :key="range.value"
          @click="$emit('time-range-change', range.value)"
          class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          :class="selectedTimeRange === range.value 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        >
          {{ range.label }}
        </button>
        
        <button
          v-if="showExport"
          @click="$emit('export')"
          class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-xs text-gray-300 transition-colors"
          title="Export data"
        >
          📊
        </button>
      </div>
    </div>

    <!-- Chart Content -->
    <div class="relative">
      <!-- Line Chart for Timeline -->
      <div v-if="chartType === 'timeline'" class="h-48">
        <AgentTimelineChart
          :timeline-data="timelineData || []"
          :selected-time-range="selectedTimeRange || '1h'"
          @point-hover="handlePointHover"
          @point-click="handlePointClick"
        />
      </div>

      <!-- Bar Chart for Agent Types -->
      <div v-else-if="chartType === 'agent-types'" class="h-48">
        <AgentTypeChart
          :type-data="agentTypeData || []"
          @type-filter="handleTypeFilter"
          @type-hover="handleTypeHover"
        />
      </div>

      <!-- Pie Chart for Tool Usage -->
      <div v-else-if="chartType === 'tool-usage'" class="h-48">
        <ToolUsageChart
          :tool-data="toolUsageData || []"
          @tool-click="handleToolClick"
          @tool-hover="handleToolHover"
        />
      </div>

      <!-- Performance Metrics Grid -->
      <div v-else-if="chartType === 'metrics'" class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          v-for="metric in metricsData"
          :key="metric.key"
          :title="metric.title"
          :value="metric.value"
          :trend="metric.trend"
          :icon="metric.icon"
          :color="metric.color"
          :format="metric.format"
          @click="handleMetricClick(metric.key)"
        />
      </div>

      <!-- Empty State -->
      <div v-if="isEmpty" class="h-48 flex items-center justify-center">
        <div class="text-center text-gray-400">
          <div class="text-4xl mb-2">📊</div>
          <p class="text-sm">No data available</p>
          <button
            v-if="showRunTest"
            @click="$emit('run-test')"
            class="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
          >
            Run Test Agent
          </button>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div v-if="isLoading" class="absolute inset-0 bg-gray-800/50 rounded-lg flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p class="text-xs text-gray-400">Loading data...</p>
        </div>
      </div>
    </div>

    <!-- Chart Legend (if applicable) -->
    <div v-if="legend && legend.length > 0" class="mt-4 pt-4 border-t border-gray-700">
      <div class="flex flex-wrap items-center gap-4">
        <div
          v-for="item in legend"
          :key="item.label"
          class="flex items-center space-x-2 text-xs"
          :class="item.disabled ? 'opacity-50' : ''"
        >
          <div
            class="w-3 h-3 rounded-full cursor-pointer transition-opacity"
            :style="{ backgroundColor: item.color }"
            @click="handleLegendClick(item.key)"
          ></div>
          <span class="text-gray-300">{{ item.label }} ({{ item.count }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentTimelineDataPoint, AgentTypeDistribution, ToolUsageData } from '../types';
import AgentTimelineChart from './charts/AgentTimelineChart.vue';
import AgentTypeChart from './charts/AgentTypeChart.vue';
import ToolUsageChart from './charts/ToolUsageChart.vue';
import MetricCard from './MetricCard.vue';

interface Props {
  title: string;
  subtitle?: string;
  chartType: 'timeline' | 'agent-types' | 'tool-usage' | 'metrics';
  timelineData?: AgentTimelineDataPoint[];
  agentTypeData?: AgentTypeDistribution[];
  toolUsageData?: ToolUsageData[];
  metricsData?: Array<{
    key: string;
    title: string;
    value: string | number;
    trend?: number;
    icon: string;
    color: string;
    format?: 'number' | 'percentage' | 'duration' | 'bytes';
  }>;
  selectedTimeRange?: string;
  timeRangeOptions?: Array<{ value: string; label: string }>;
  showTimeRange?: boolean;
  showExport?: boolean;
  showRunTest?: boolean;
  isLoading?: boolean;
  legend?: Array<{
    key: string;
    label: string;
    color: string;
    count: number;
    disabled?: boolean;
  }>;
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  showTimeRange: false,
  showExport: false,
  showRunTest: false,
  isLoading: false,
  timeRangeOptions: () => []
});

// Emits
const emit = defineEmits<{
  'time-range-change': [range: string];
  'export': [];
  'run-test': [];
  'point-hover': [data: any];
  'point-click': [data: any];
  'type-filter': [type: string];
  'type-hover': [type: string];
  'tool-click': [tool: string];
  'tool-hover': [tool: string];
  'metric-click': [key: string];
  'legend-click': [key: string];
}>();

// Computed properties
const isEmpty = computed(() => {
  switch (props.chartType) {
    case 'timeline':
      return !props.timelineData || props.timelineData.length === 0 || 
             props.timelineData.every(d => d.executions === 0);
    case 'agent-types':
      return !props.agentTypeData || props.agentTypeData.length === 0;
    case 'tool-usage':
      return !props.toolUsageData || props.toolUsageData.length === 0;
    case 'metrics':
      return !props.metricsData || props.metricsData.length === 0;
    default:
      return true;
  }
});

// Event handlers
function handlePointHover(data: any) {
  emit('point-hover', data);
}

function handlePointClick(data: any) {
  emit('point-click', data);
}

function handleTypeFilter(type: string) {
  emit('type-filter', type);
}

function handleTypeHover(type: string) {
  emit('type-hover', type);
}

function handleToolClick(tool: string) {
  emit('tool-click', tool);
}

function handleToolHover(tool: string) {
  emit('tool-hover', tool);
}

function handleMetricClick(key: string) {
  emit('metric-click', key);
}

function handleLegendClick(key: string) {
  emit('legend-click', key);
}
</script>

<style scoped>
/* Chart-specific animations and styling */
.chart-enter-active,
.chart-leave-active {
  transition: all 0.3s ease;
}

.chart-enter-from,
.chart-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>