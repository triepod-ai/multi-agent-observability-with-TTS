<template>
  <div class="relative h-full">
    <!-- Pie Chart Container -->
    <div class="flex items-center h-full">
      <!-- Pie Chart -->
      <div class="w-1/2 h-full flex items-center justify-center">
        <div class="relative">
          <svg
            class="w-40 h-40 transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <!-- Background circle -->
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#374151"
              stroke-width="2"
              opacity="0.3"
            />
            
            <!-- Pie segments -->
            <circle
              v-for="(tool, index) in pieData"
              :key="tool.toolName"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              :stroke="tool.color"
              stroke-width="8"
              :stroke-dasharray="tool.circumference"
              :stroke-dashoffset="tool.offset"
              class="cursor-pointer transition-all duration-300 hover:stroke-width-10 animate-draw-pie"
              :style="{ 
                animationDelay: `${index * 200}ms`,
                filter: hoveredTool === tool.toolName ? 'drop-shadow(0 0 8px currentColor)' : 'none'
              }"
              @mouseenter="handleToolHover(tool)"
              @mouseleave="clearHover"
              @click="handleToolClick(tool)"
            />
            
            <!-- Center info -->
            <text
              x="50"
              y="45"
              text-anchor="middle"
              class="text-xs fill-white font-bold"
              transform="rotate(90 50 50)"
            >
              {{ totalUsage }}
            </text>
            <text
              x="50"
              y="55"
              text-anchor="middle"
              class="text-xs fill-gray-400"
              transform="rotate(90 50 50)"
            >
              Total Uses
            </text>
          </svg>
          
          <!-- Center hover info -->
          <div
            v-if="hoveredTool"
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div class="text-center bg-gray-800/90 rounded-lg p-2 text-xs">
              <div class="font-medium text-white">{{ hoveredToolData?.toolName }}</div>
              <div class="text-purple-400">{{ hoveredToolData?.usageCount }} uses</div>
              <div class="text-gray-400">{{ hoveredToolData?.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Legend and Stats -->
      <div class="w-1/2 h-full pl-4">
        <div class="h-full overflow-y-auto custom-scrollbar">
          <div class="space-y-2">
            <div
              v-for="(tool, index) in chartData"
              :key="tool.toolName"
              class="group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 animate-slide-in"
              :class="hoveredTool === tool.toolName ? 'bg-gray-700/50' : 'hover:bg-gray-800/30'"
              :style="{ animationDelay: `${index * 100}ms` }"
              @mouseenter="handleToolHover(tool)"
              @mouseleave="clearHover"
              @click="handleToolClick(tool)"
            >
              <!-- Tool info -->
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="text-lg group-hover:scale-110 transition-transform duration-200">
                  {{ tool.icon }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2">
                    <div
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: getToolColor(tool.toolName) }"
                    ></div>
                    <span class="text-sm font-medium text-white truncate">{{ tool.toolName }}</span>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {{ tool.agentCount }} agents • {{ tool.successRate }}% success
                  </div>
                </div>
              </div>
              
              <!-- Usage stats -->
              <div class="text-right">
                <div class="text-sm font-bold text-purple-400">{{ tool.usageCount }}</div>
                <div class="text-xs text-gray-400">uses</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Summary stats -->
        <div class="mt-4 pt-4 border-t border-gray-700">
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <div class="text-lg font-bold text-blue-400">{{ totalTools }}</div>
              <div class="text-xs text-gray-400">Unique Tools</div>
            </div>
            <div>
              <div class="text-lg font-bold text-green-400">{{ avgSuccessRate }}%</div>
              <div class="text-xs text-gray-400">Avg Success</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-if="chartData.length === 0" class="h-full flex items-center justify-center">
      <div class="text-center text-gray-500">
        <div class="text-4xl mb-2">🔧</div>
        <p class="text-sm">No tool usage data</p>
      </div>
    </div>
    
    <!-- Tooltip for detailed info -->
    <div
      v-if="tooltip.visible"
      class="absolute z-10 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg border border-gray-600 transition-all duration-200 pointer-events-none"
      :style="tooltipStyle"
    >
      <div class="font-medium text-purple-400 mb-2">{{ tooltip.toolName }}</div>
      <div class="space-y-1">
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Usage Count:</span>
          <span class="text-white font-medium">{{ tooltip.usageCount }}</span>
        </div>
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Agents Using:</span>
          <span class="text-blue-400 font-medium">{{ tooltip.agentCount }}</span>
        </div>
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Success Rate:</span>
          <span class="text-green-400 font-medium">{{ tooltip.successRate }}%</span>
        </div>
        <div v-if="tooltip.avgDuration > 0" class="flex justify-between space-x-4">
          <span class="text-gray-300">Avg Duration:</span>
          <span class="text-yellow-400 font-medium">{{ tooltip.avgDuration }}s</span>
        </div>
        <div class="flex justify-between space-x-4">
          <span class="text-gray-300">Percentage:</span>
          <span class="text-purple-400 font-medium">{{ tooltip.percentage }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue';
import type { ToolUsageData } from '../../types';

interface Props {
  toolData: ToolUsageData[];
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'tool-click': [tool: string];
  'tool-hover': [tool: string];
}>();

// State
const hoveredTool = ref<string | null>(null);
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  toolName: '',
  usageCount: 0,
  agentCount: 0,
  successRate: 0,
  avgDuration: 0,
  percentage: 0
});

// Tool colors for consistent visualization
const toolColors = [
  '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
  '#8B5A2B', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
  '#84CC16', '#F472B6'
];

// Computed properties
const chartData = computed(() => {
  if (!props.toolData || props.toolData.length === 0) {
    return [];
  }
  
  return props.toolData
    .filter(tool => tool.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount);
});

const totalUsage = computed(() => {
  return chartData.value.reduce((sum, tool) => sum + tool.usageCount, 0);
});

const totalTools = computed(() => {
  return chartData.value.length;
});

const avgSuccessRate = computed(() => {
  if (chartData.value.length === 0) return 0;
  const totalSuccessRate = chartData.value.reduce((sum, tool) => sum + tool.successRate, 0);
  return Math.round(totalSuccessRate / chartData.value.length);
});

const hoveredToolData = computed(() => {
  return chartData.value.find(tool => tool.toolName === hoveredTool.value);
});

const pieData = computed(() => {
  if (chartData.value.length === 0 || totalUsage.value === 0) {
    return [];
  }
  
  const circumference = 2 * Math.PI * 40; // radius = 40
  let currentOffset = 0;
  
  return chartData.value.map((tool, index) => {
    const percentage = (tool.usageCount / totalUsage.value) * 100;
    const strokeDasharray = (percentage / 100) * circumference;
    const strokeDashoffset = currentOffset;
    
    currentOffset -= strokeDasharray;
    
    return {
      ...tool,
      percentage: Math.round(percentage * 10) / 10,
      circumference: `${strokeDasharray} ${circumference}`,
      offset: strokeDashoffset,
      color: getToolColor(tool.toolName)
    };
  });
});

const tooltipStyle = computed(() => {
  return {
    left: `${tooltip.x}px`,
    top: `${tooltip.y}px`,
    transform: 'translate(-50%, -100%)'
  };
});

// Methods
function getToolColor(toolName: string): string {
  const index = chartData.value.findIndex(tool => tool.toolName === toolName);
  return toolColors[index % toolColors.length];
}

function handleToolHover(tool: ToolUsageData & { percentage?: number }, event?: MouseEvent) {
  hoveredTool.value = tool.toolName;
  
  if (event) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (event.currentTarget as HTMLElement).closest('.relative')!.getBoundingClientRect();
    
    tooltip.visible = true;
    tooltip.x = rect.left - containerRect.left + rect.width / 2;
    tooltip.y = rect.top - containerRect.top;
    tooltip.toolName = tool.toolName;
    tooltip.usageCount = tool.usageCount;
    tooltip.agentCount = tool.agentCount;
    tooltip.successRate = tool.successRate;
    tooltip.avgDuration = tool.avgDuration;
    tooltip.percentage = tool.percentage || 
      Math.round((tool.usageCount / totalUsage.value) * 100 * 10) / 10;
  }
  
  emit('tool-hover', tool.toolName);
}

function clearHover() {
  hoveredTool.value = null;
  tooltip.visible = false;
}

function handleToolClick(tool: ToolUsageData) {
  emit('tool-click', tool.toolName);
}
</script>

<style scoped>
@keyframes draw-pie {
  from {
    stroke-dasharray: 0 251.32; /* 2 * PI * 40 */
  }
  to {
    stroke-dasharray: var(--stroke-dasharray);
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-draw-pie {
  animation: draw-pie 1s ease-out both;
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

/* SVG text styling */
text {
  font-family: system-ui, -apple-system, sans-serif;
}

/* Hover effects */
circle:hover {
  filter: drop-shadow(0 0 8px currentColor) brightness(1.1);
}
</style>