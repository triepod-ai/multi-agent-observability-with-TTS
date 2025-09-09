<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-white flex items-center">
        <span class="mr-2">🔄</span>
        Interactive Hook Flow
      </h2>
      <div class="flex items-center space-x-2">
        <!-- Zoom Controls -->
        <div class="flex items-center bg-gray-700 rounded-md p-1">
          <button
            @click="zoomOut"
            :disabled="zoom <= minZoom"
            class="p-1 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            title="Zoom Out"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <span class="text-xs text-gray-300 px-2">{{ Math.round(zoom * 100) }}%</span>
          <button
            @click="zoomIn"
            :disabled="zoom >= maxZoom"
            class="p-1 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            title="Zoom In"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <!-- Filter Controls -->
        <select
          v-model="categoryFilter"
          class="px-2 py-1 text-xs bg-gray-700 text-white border border-gray-600 rounded"
        >
          <option value="all">All Categories</option>
          <option value="essential">Essential</option>
          <option value="security">Security</option>
          <option value="monitoring">Monitoring</option>
          <option value="advanced">Advanced</option>
        </select>
        
        <!-- Simulation Controls -->
        <button
          @click="toggleSimulation"
          :disabled="isSimulating && !canPauseSimulation"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-all duration-200',
            isSimulating
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          ]"
        >
          {{ isSimulating ? 'Stop Simulation' : 'Start Simulation' }}
        </button>
        
        <button
          @click="resetView"
          class="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-all duration-200"
        >
          Reset View
        </button>
      </div>
    </div>

    <!-- Interactive Flow Container -->
    <div 
      ref="flowContainer"
      class="relative bg-gray-900 rounded-lg overflow-hidden select-none"
      style="height: 600px;"
      @wheel="handleWheel"
      @mousedown="startPanning"
      @mousemove="handlePanning" 
      @mouseup="stopPanning"
      @mouseleave="stopPanning"
    >
      <!-- SVG Canvas -->
      <svg
        ref="svgCanvas"
        class="absolute inset-0 w-full h-full"
        :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`"
        @click="handleCanvasClick"
      >
        <!-- Background Grid -->
        <defs>
          <pattern
            id="grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#374151"
              stroke-width="1"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#grid)"
        />

        <!-- Flow Connections -->
        <g class="connections">
          <FlowConnection
            v-for="connection in visibleConnections"
            :key="`${connection.from}-${connection.to}`"
            :connection="connection"
            :nodes="visibleNodes"
            :is-animating="isSimulating"
            :current-step="currentSimulationStep"
          />
        </g>

        <!-- Flow Nodes -->
        <g class="nodes">
          <FlowNode
            v-for="node in visibleNodes"
            :key="node.id"
            :node="node"
            :competency="competencyOverlays[node.id]"
            :is-selected="selectedNodeId === node.id"
            :is-active="isNodeActive(node.id)"
            :zoom="zoom"
            @click="selectNode"
            @hover="handleNodeHover"
          />
        </g>
        
        <!-- Competency Overlays -->
        <g v-if="showCompetencyOverlays" class="competency-overlays">
          <circle
            v-for="node in visibleNodes"
            :key="`competency-${node.id}`"
            :cx="node.position.x + 60"
            :cy="node.position.y - 10"
            :r="8"
            :fill="getCompetencyColor(competencyOverlays[node.id]?.level || 0)"
            class="opacity-80"
          />
          <text
            v-for="node in visibleNodes"
            :key="`competency-text-${node.id}`"
            :x="node.position.x + 60"
            :y="node.position.y - 6"
            text-anchor="middle"
            class="fill-white text-xs font-bold"
          >
            {{ Math.round(competencyOverlays[node.id]?.level || 0) }}
          </text>
        </g>
      </svg>

      <!-- Loading Overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-gray-900/80 flex items-center justify-center"
      >
        <div class="text-white text-sm">Loading diagram...</div>
      </div>

      <!-- Performance Monitor -->
      <div
        v-if="showPerformanceMonitor"
        class="absolute top-2 right-2 bg-black/50 text-white text-xs p-2 rounded"
      >
        FPS: {{ currentFps }}<br>
        Nodes: {{ visibleNodes.length }}<br>
        Zoom: {{ Math.round(zoom * 100) }}%
      </div>
    </div>

    <!-- Node Details Panel -->
    <Transition name="slide-up">
      <div
        v-if="selectedNode"
        class="mt-6 bg-gray-900 rounded-lg p-4 border border-gray-600"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <span class="mr-2 text-xl">{{ selectedNode.icon }}</span>
            {{ selectedNode.name }} Hook
          </h3>
          <button
            @click="deselectNode"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Basic Information -->
          <div class="space-y-3">
            <div>
              <h4 class="text-sm font-medium text-blue-400 mb-1">Description:</h4>
              <p class="text-sm text-gray-300">{{ selectedNode.description }}</p>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-green-400 mb-1">When it runs:</h4>
              <p class="text-sm text-gray-300">{{ getHookExplanation(selectedNode.id)?.whenItRuns }}</p>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-yellow-400 mb-1">Why it matters:</h4>
              <p class="text-sm text-gray-300">{{ getHookExplanation(selectedNode.id)?.whyItMatters }}</p>
            </div>
          </div>

          <!-- Competency & Progress -->
          <div class="space-y-3">
            <div v-if="competencyOverlays[selectedNode.id]">
              <h4 class="text-sm font-medium text-purple-400 mb-2">Your Mastery Level:</h4>
              <div class="flex items-center space-x-3">
                <div class="flex-1">
                  <div class="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full transition-all duration-500 rounded-full"
                      :class="getCompetencyBarClass(competencyOverlays[selectedNode.id].level)"
                      :style="{ width: competencyOverlays[selectedNode.id].level + '%' }"
                    ></div>
                  </div>
                </div>
                <span class="text-sm font-medium text-white">
                  {{ Math.round(competencyOverlays[selectedNode.id].level) }}%
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Level: {{ getCompetencyLevelName(competencyOverlays[selectedNode.id].level) }}
              </p>
            </div>

            <div>
              <h4 class="text-sm font-medium text-orange-400 mb-2">Quick Actions:</h4>
              <div class="flex flex-wrap gap-2">
                <button
                  @click="simulateHook(selectedNode.id)"
                  class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Simulate Hook
                </button>
                <button
                  @click="viewCodeExample(selectedNode.id)"
                  class="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  View Example
                </button>
                <button
                  @click="startPractice(selectedNode.id)"
                  class="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  Practice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Controls Legend -->
    <div class="mt-4 text-center">
      <p class="text-xs text-gray-400">
        <span class="inline-flex items-center mr-4">
          <span class="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
          Click to select
        </span>
        <span class="inline-flex items-center mr-4">
          <span class="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
          Drag to pan
        </span>
        <span class="inline-flex items-center mr-4">
          <span class="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
          Scroll to zoom
        </span>
        <span class="inline-flex items-center">
          <span class="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
          Competency indicators
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useFlowDiagram } from '../composables/useFlowDiagram';
import { useEducationalMode } from '../composables/useEducationalMode';
import FlowNode from './FlowNode.vue';
import FlowConnection from './FlowConnection.vue';
import type { HookFlowStep } from '../types';

interface CompetencyLevel {
  level: number;
  masteryType: 'knowledge' | 'application' | 'analysis' | 'synthesis';
}

interface Props {
  competencyData?: Record<string, CompetencyLevel>;
  showPerformanceMonitor?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  competencyData: () => ({}),
  showPerformanceMonitor: false
});

const emit = defineEmits<{
  nodeSelected: [nodeId: string];
  simulateHook: [nodeId: string];
  viewExample: [nodeId: string];
  startPractice: [nodeId: string];
}>();

// Composables
const { getHookExplanation } = useEducationalMode();
const {
  nodes,
  connections,
  zoom,
  viewBox,
  selectedNodeId,
  isSimulating,
  currentSimulationStep,
  zoomIn,
  zoomOut,
  resetView,
  startSimulation,
  stopSimulation,
  updateViewBox
} = useFlowDiagram();

// Refs
const flowContainer = ref<HTMLElement | null>(null);
const svgCanvas = ref<SVGElement | null>(null);

// State
const isLoading = ref(true);
const categoryFilter = ref('all');
const showCompetencyOverlays = ref(true);
const competencyOverlays = computed(() => props.competencyData);
const selectedNode = ref<HookFlowStep | null>(null);
const hoveredNodeId = ref<string | null>(null);
const isMouseDown = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });
const currentFps = ref(60);
const canPauseSimulation = ref(true);

// Constants
const minZoom = 0.3;
const maxZoom = 3.0;
const zoomSensitivity = 0.1;

// Computed
const visibleNodes = computed(() => {
  return nodes.value.filter(node => {
    if (categoryFilter.value === 'all') return true;
    return getNodeCategory(node.id) === categoryFilter.value;
  });
});

const visibleConnections = computed(() => {
  const visibleNodeIds = new Set(visibleNodes.value.map(n => n.id));
  return connections.value.filter(conn => 
    visibleNodeIds.has(conn.from) && visibleNodeIds.has(conn.to)
  );
});

// Methods
const getNodeCategory = (nodeId: string): string => {
  const categoryMap: Record<string, string> = {
    'session_start': 'essential',
    'user_prompt_submit': 'essential', 
    'pre_tool_use': 'security',
    'post_tool_use': 'monitoring',
    'subagent_stop': 'monitoring',
    'stop': 'essential',
    'notification': 'monitoring',
    'precompact': 'advanced'
  };
  return categoryMap[nodeId] || 'essential';
};

const getCompetencyColor = (level: number): string => {
  if (level < 30) return '#EF4444'; // red
  if (level < 60) return '#F59E0B'; // amber
  if (level < 80) return '#10B981'; // green
  return '#8B5CF6'; // purple
};

const getCompetencyBarClass = (level: number): string => {
  if (level < 30) return 'bg-red-500';
  if (level < 60) return 'bg-yellow-500';
  if (level < 80) return 'bg-green-500';
  return 'bg-purple-500';
};

const getCompetencyLevelName = (level: number): string => {
  if (level < 30) return 'Beginner';
  if (level < 60) return 'Learning';
  if (level < 80) return 'Intermediate';
  return 'Advanced';
};

const isNodeActive = (nodeId: string): boolean => {
  if (!isSimulating.value) return false;
  return nodes.value.findIndex(n => n.id === nodeId) === currentSimulationStep.value;
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  
  const rect = flowContainer.value?.getBoundingClientRect();
  if (!rect) return;
  
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  
  const zoomDelta = event.deltaY > 0 ? -zoomSensitivity : zoomSensitivity;
  const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom.value + zoomDelta));
  
  if (newZoom !== zoom.value) {
    const zoomPoint = {
      x: mouseX / rect.width,
      y: mouseY / rect.height
    };
    
    updateViewBox(newZoom, zoomPoint);
  }
};

const startPanning = (event: MouseEvent) => {
  if (event.button !== 0) return; // Only left mouse button
  
  isMouseDown.value = true;
  lastMousePos.value = { x: event.clientX, y: event.clientY };
  event.preventDefault();
};

const handlePanning = (event: MouseEvent) => {
  if (!isMouseDown.value) return;
  
  const deltaX = event.clientX - lastMousePos.value.x;
  const deltaY = event.clientY - lastMousePos.value.y;
  
  viewBox.x -= deltaX / zoom.value;
  viewBox.y -= deltaY / zoom.value;
  
  lastMousePos.value = { x: event.clientX, y: event.clientY };
};

const stopPanning = () => {
  isMouseDown.value = false;
};

const handleCanvasClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    deselectNode();
  }
};

const selectNode = (nodeId: string) => {
  selectedNodeId.value = nodeId;
  selectedNode.value = nodes.value.find(n => n.id === nodeId) || null;
  emit('nodeSelected', nodeId);
};

const deselectNode = () => {
  selectedNodeId.value = null;
  selectedNode.value = null;
};

const handleNodeHover = (nodeId: string | null) => {
  hoveredNodeId.value = nodeId;
};

const toggleSimulation = () => {
  if (isSimulating.value) {
    stopSimulation();
  } else {
    startSimulation();
  }
};

const simulateHook = (nodeId: string) => {
  emit('simulateHook', nodeId);
};

const viewCodeExample = (nodeId: string) => {
  emit('viewExample', nodeId);
};

const startPractice = (nodeId: string) => {
  emit('startPractice', nodeId);
};

// FPS monitoring
let fpsCounter = 0;
let lastFpsTime = performance.now();

const updateFps = () => {
  fpsCounter++;
  const now = performance.now();
  
  if (now - lastFpsTime >= 1000) {
    currentFps.value = Math.round((fpsCounter * 1000) / (now - lastFpsTime));
    fpsCounter = 0;
    lastFpsTime = now;
  }
  
  requestAnimationFrame(updateFps);
};

// Lifecycle
onMounted(async () => {
  await nextTick();
  isLoading.value = false;
  
  if (props.showPerformanceMonitor) {
    requestAnimationFrame(updateFps);
  }
  
  // Add keyboard shortcuts
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'Escape':
      deselectNode();
      break;
    case 'Space':
      event.preventDefault();
      toggleSimulation();
      break;
    case 'KeyR':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        resetView();
      }
      break;
  }
};

// Watch for category filter changes
watch(categoryFilter, () => {
  if (selectedNode.value && !visibleNodes.value.some(n => n.id === selectedNode.value?.id)) {
    deselectNode();
  }
});
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Custom scrollbar for better UX */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #1f2937;
}
::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>