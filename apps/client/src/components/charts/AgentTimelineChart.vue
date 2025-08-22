<template>
  <div class="relative h-full">
    <!-- Y-axis labels -->
    <div class="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 pr-2">
      <span>{{ maxExecutions }}</span>
      <span>{{ Math.floor(maxExecutions / 2) }}</span>
      <span>0</span>
    </div>
    
    <!-- Chart area -->
    <div class="ml-8 mr-4 h-full relative">
      <!-- Grid lines -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none" style="bottom: 2rem;">
        <!-- Horizontal grid lines -->
        <defs>
          <pattern id="grid" width="100%" height="33.333%" patternUnits="userSpaceOnUse">
            <path d="M 0 100% L 100% 100%" fill="none" stroke="#374151" stroke-width="1" opacity="0.2"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- Vertical grid lines -->
        <g v-if="chartData.length > 0">
          <line
            v-for="(dataPoint, index) in chartData"
            :key="index"
            :x1="`${(index / (chartData.length - 1)) * 100}%`"
            :x2="`${(index / (chartData.length - 1)) * 100}%`"
            y1="0%"
            y2="100%"
            stroke="#374151"
            stroke-width="1"
            opacity="0.1"
          />
        </g>
      </svg>
      
      <!-- Chart content -->
      <div class="relative h-full pb-8 flex items-end">
        <!-- Line chart -->
        <svg v-if="chartData.length > 0" class="w-full h-full absolute inset-0" style="bottom: 2rem;">
          <!-- Execution line -->
          <polyline
            :points="executionLinePoints"
            fill="none"
            stroke="url(#executionGradient)"
            stroke-width="2"
            class="animate-draw"
          />
          
          <!-- Success line -->
          <polyline
            :points="successLinePoints"
            fill="none"
            stroke="url(#successGradient)"
            stroke-width="2"
            class="animate-draw"
            opacity="0.8"
          />
          
          <!-- Area under execution line -->
          <polygon
            :points="executionAreaPoints"
            fill="url(#executionAreaGradient)"
            opacity="0.2"
            class="animate-fill"
          />
          
          <!-- Data points -->
          <g>
            <circle
              v-for="(dataPoint, index) in chartData"
              :key="`exec-${index}`"
              :cx="`${(index / (chartData.length - 1)) * 100}%`"
              :cy="`${100 - (dataPoint.executions / maxExecutions) * 100}%`"
              r="4"
              fill="#8B5CF6"
              class="cursor-pointer hover:r-6 transition-all duration-200 animate-point"
              :style="{ animationDelay: `${index * 50}ms` }"
              @mouseenter="handlePointHover(dataPoint, index, $event)"
              @mouseleave="hideTooltip"
              @click="handlePointClick(dataPoint, index)"
            />
            <circle
              v-for="(dataPoint, index) in chartData"
              :key="`success-${index}`"
              :cx="`${(index / (chartData.length - 1)) * 100}%`"
              :cy="`${100 - (dataPoint.successes / maxExecutions) * 100}%`"
              r="3"
              fill="#10B981"
              class="cursor-pointer hover:r-5 transition-all duration-200 animate-point"
              :style="{ animationDelay: `${index * 50 + 25}ms` }"
              @mouseenter="handlePointHover(dataPoint, index, $event, 'success')"
              @mouseleave="hideTooltip"
              @click="handlePointClick(dataPoint, index, 'success')"
            />
          </g>
          
          <!-- Gradients -->
          <defs>
            <linearGradient id="executionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#C084FC;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#34D399;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="executionAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:0" />
            </linearGradient>
          </defs>
        </svg>
        
        <!-- Empty state -->
        <div v-else class="w-full h-full flex items-center justify-center">
          <div class="text-center text-gray-500">
            <div class="text-2xl mb-2">📈</div>
            <p class="text-sm">No timeline data</p>
          </div>
        </div>
      </div>
      
      <!-- X-axis labels -->
      <div class="absolute bottom-0 left-0 right-0 h-8 flex justify-between items-center text-xs text-gray-500">
        <span
          v-for="(dataPoint, index) in chartData"
          :key="index"
          v-show="index % Math.ceil(chartData.length / 5) === 0 || index === chartData.length - 1"
          class="transform origin-left"
          :class="selectedTimeRange === '7d' ? '' : '-rotate-45'"
        >
          {{ formatTimeLabel(dataPoint.timestamp) }}
        </span>
      </div>
    </div>
    
    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      ref="tooltipRef"
      class="absolute z-10 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg border border-gray-600 transition-all duration-200 pointer-events-none"
      :style="tooltipStyle"
    >
      <div class="font-medium text-purple-400 mb-1">{{ tooltip.title }}</div>
      <div class="space-y-1">
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Executions:</span>
          <span class="text-white font-medium">{{ tooltip.executions }}</span>
        </div>
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Successes:</span>
          <span class="text-green-400 font-medium">{{ tooltip.successes }}</span>
        </div>
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Failures:</span>
          <span class="text-red-400 font-medium">{{ tooltip.failures }}</span>
        </div>
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Success Rate:</span>
          <span class="text-blue-400 font-medium">{{ tooltip.successRate }}%</span>
        </div>
        <div v-if="tooltip.avgDuration > 0" class="flex justify-between space-x-4">
          <span class="text-gray-300">Avg Duration:</span>
          <span class="text-yellow-400 font-medium">{{ tooltip.avgDuration }}s</span>
        </div>
        <div v-if="tooltip.tokens > 0" class="flex justify-between space-x-4">
          <span class="text-gray-300">Tokens:</span>
          <span class="text-cyan-400 font-medium">{{ tooltip.tokens.toLocaleString() }}</span>
        </div>
      </div>
    </div>
    
    <!-- Legend -->
    <div class="absolute top-4 right-4 flex items-center space-x-4 bg-gray-900/80 rounded-lg p-2">
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 rounded-full bg-purple-400"></div>
        <span class="text-xs text-gray-300">Executions</span>
      </div>
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 rounded-full bg-green-400"></div>
        <span class="text-xs text-gray-300">Successes</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue';
import type { AgentTimelineDataPoint } from '../../types';

interface Props {
  timelineData: AgentTimelineDataPoint[];
  selectedTimeRange: string;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'point-hover': [data: AgentTimelineDataPoint, index: number, type?: string];
  'point-click': [data: AgentTimelineDataPoint, index: number, type?: string];
}>();

// Tooltip state
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  executions: 0,
  successes: 0,
  failures: 0,
  successRate: 0,
  avgDuration: 0,
  tokens: 0
});

const tooltipRef = ref<HTMLElement>();

// Computed properties
const chartData = computed(() => {
  if (!props.timelineData || props.timelineData.length === 0) {
    return [];
  }
  
  return props.timelineData.filter(d => d !== null && d !== undefined);
});

const maxExecutions = computed(() => {
  if (chartData.value.length === 0) return 1;
  
  const max = Math.max(
    ...chartData.value.map(d => Math.max(d.executions, d.successes + d.failures))
  );
  
  // Round up to next nice number
  if (max <= 5) return 5;
  if (max <= 10) return 10;
  if (max <= 20) return 20;
  if (max <= 50) return 50;
  if (max <= 100) return 100;
  
  return Math.ceil(max / 10) * 10;
});

const executionLinePoints = computed(() => {
  if (chartData.value.length === 0) return '';
  
  return chartData.value
    .map((dataPoint, index) => {
      const x = (index / (chartData.value.length - 1)) * 100;
      const y = 100 - (dataPoint.executions / maxExecutions.value) * 100;
      return `${x},${y}`;
    })
    .join(' ');
});

const successLinePoints = computed(() => {
  if (chartData.value.length === 0) return '';
  
  return chartData.value
    .map((dataPoint, index) => {
      const x = (index / (chartData.value.length - 1)) * 100;
      const y = 100 - (dataPoint.successes / maxExecutions.value) * 100;
      return `${x},${y}`;
    })
    .join(' ');
});

const executionAreaPoints = computed(() => {
  if (chartData.value.length === 0) return '';
  
  const linePoints = chartData.value
    .map((dataPoint, index) => {
      const x = (index / (chartData.value.length - 1)) * 100;
      const y = 100 - (dataPoint.executions / maxExecutions.value) * 100;
      return `${x},${y}`;
    });
  
  // Add bottom corners to create closed area
  const lastIndex = chartData.value.length - 1;
  const bottomRight = `${100},100`;
  const bottomLeft = `0,100`;
  
  return [...linePoints, bottomRight, bottomLeft].join(' ');
});

const tooltipStyle = computed(() => {
  return {
    left: `${tooltip.x}px`,
    top: `${tooltip.y}px`,
    transform: 'translate(-50%, -100%)'
  };
});

// Methods
function formatTimeLabel(timestamp: number): string {
  const date = new Date(timestamp);
  
  if (props.selectedTimeRange === '7d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (props.selectedTimeRange === '24h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

function handlePointHover(dataPoint: AgentTimelineDataPoint, index: number, event: MouseEvent, type: string = 'execution') {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const containerRect = (event.currentTarget as HTMLElement).closest('.relative')!.getBoundingClientRect();
  
  tooltip.visible = true;
  tooltip.x = rect.left - containerRect.left + rect.width / 2;
  tooltip.y = rect.top - containerRect.top;
  tooltip.title = formatTimeLabel(dataPoint.timestamp);
  tooltip.executions = dataPoint.executions;
  tooltip.successes = dataPoint.successes;
  tooltip.failures = dataPoint.failures;
  tooltip.successRate = dataPoint.executions > 0 ? 
    Math.round((dataPoint.successes / dataPoint.executions) * 100) : 0;
  tooltip.avgDuration = dataPoint.avgDuration;
  tooltip.tokens = dataPoint.tokens;
  
  emit('point-hover', dataPoint, index, type);
}

function hideTooltip() {
  tooltip.visible = false;
}

function handlePointClick(dataPoint: AgentTimelineDataPoint, index: number, type: string = 'execution') {
  emit('point-click', dataPoint, index, type);
}
</script>

<style scoped>
@keyframes draw {
  from {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dasharray: 1000;
    stroke-dashoffset: 0;
  }
}

@keyframes fill {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.2;
  }
}

@keyframes point {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-draw {
  animation: draw 1.5s ease-in-out;
}

.animate-fill {
  animation: fill 1.5s ease-in-out 0.5s both;
}

.animate-point {
  animation: point 0.3s ease-out both;
}

/* Hover effects for SVG elements */
circle:hover {
  filter: drop-shadow(0 0 8px currentColor);
  transition: all 0.2s ease;
}

polyline {
  transition: all 0.3s ease;
}

polyline:hover {
  stroke-width: 3;
}
</style>