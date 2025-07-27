<template>
  <div class="bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] rounded-xl border border-[var(--theme-border-primary)] shadow-lg overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-[var(--theme-border-primary)]">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-[var(--theme-primary)] flex items-center">
          <span class="mr-2 text-xl">📊</span>
          Activity Monitor
        </h3>
        
        <!-- Controls -->
        <div class="flex items-center space-x-3">
          <!-- View Mode Toggle -->
          <div class="flex items-center bg-[var(--theme-bg-tertiary)] rounded-lg p-1">
            <button
              v-for="mode in viewModes"
              :key="mode.id"
              @click="currentViewMode = mode.id"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200"
              :class="currentViewMode === mode.id 
                ? 'bg-[var(--theme-primary)] text-white shadow-md' 
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'"
            >
              {{ mode.label }}
            </button>
          </div>
          
          <!-- Time Range Selector -->
          <div class="flex gap-1">
            <button
              v-for="range in timeRanges"
              :key="range.value"
              @click="selectedTimeRange = range.value"
              class="px-3 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 shadow-sm"
              :class="selectedTimeRange === range.value
                ? 'bg-[var(--theme-primary)] text-white shadow-md'
                : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-quaternary)]'"
            >
              {{ range.label }}
            </button>
          </div>
          
          <!-- Auto-refresh Toggle -->
          <button
            @click="autoRefresh = !autoRefresh"
            class="p-2 rounded-lg transition-all duration-200"
            :class="autoRefresh 
              ? 'bg-green-500/20 text-green-600 border border-green-500/30' 
              : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'"
            :title="autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': autoRefresh }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="relative p-4">
      <!-- Loading State -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-[var(--theme-bg-primary)]/80 z-10">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)] mx-auto mb-2"></div>
          <p class="text-sm text-[var(--theme-text-secondary)]">Loading activity data...</p>
        </div>
      </div>

      <!-- Main Chart Area -->
      <div class="relative" style="height: 300px;">
        <!-- Canvas for Chart -->
        <canvas
          ref="chartCanvas"
          class="w-full h-full cursor-crosshair"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseLeave"
          @click="handleChartClick"
        ></canvas>

        <!-- Tooltip -->
        <Transition name="tooltip">
          <div
            v-if="tooltip.visible"
            class="absolute bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded-lg shadow-xl p-3 pointer-events-none z-20"
            :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
          >
            <div class="text-sm space-y-1">
              <div class="font-bold text-[var(--theme-text-primary)]">{{ tooltip.time }}</div>
              <div v-for="item in tooltip.data" :key="item.label" class="flex items-center justify-between space-x-3">
                <span class="flex items-center">
                  <span class="mr-1">{{ item.emoji }}</span>
                  <span class="text-[var(--theme-text-secondary)]">{{ item.label }}:</span>
                </span>
                <span class="font-semibold text-[var(--theme-text-primary)]">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Mini Map -->
        <div v-if="showMiniMap" class="absolute bottom-0 right-0 w-48 h-12 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-lg overflow-hidden">
          <canvas ref="miniMapCanvas" class="w-full h-full"></canvas>
          <div 
            class="absolute inset-0 border-2 border-[var(--theme-primary)] rounded pointer-events-none"
            :style="{ 
              left: miniMapViewport.left + '%', 
              width: miniMapViewport.width + '%' 
            }"
          ></div>
        </div>
      </div>

      <!-- Statistics Bar -->
      <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          v-for="stat in statistics" 
          :key="stat.label"
          class="bg-[var(--theme-bg-tertiary)] rounded-lg p-3 border border-[var(--theme-border-primary)]"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-[var(--theme-text-secondary)]">{{ stat.label }}</p>
              <p class="text-lg font-bold text-[var(--theme-text-primary)]">{{ stat.value }}</p>
            </div>
            <div 
              class="text-2xl" 
              :class="stat.trend === 'up' ? 'text-green-500' : stat.trend === 'down' ? 'text-red-500' : 'text-[var(--theme-text-tertiary)]'"
            >
              {{ stat.icon }}
            </div>
          </div>
        </div>
      </div>

      <!-- Session Lanes Preview (for timeline view) -->
      <div v-if="currentViewMode === 'timeline'" class="mt-4 space-y-2">
        <h4 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-2">Active Sessions</h4>
        <div class="space-y-1">
          <div 
            v-for="session in activeSessions.slice(0, 5)" 
            :key="session.id"
            class="flex items-center justify-between p-2 bg-[var(--theme-bg-tertiary)] rounded-lg hover:bg-[var(--theme-bg-quaternary)] cursor-pointer transition-colors"
            @click="$emit('selectSession', session.id)"
          >
            <div class="flex items-center space-x-2">
              <div 
                class="w-3 h-3 rounded-full"
                :class="session.colorClass"
              ></div>
              <span class="text-sm text-[var(--theme-text-primary)]">{{ session.display }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs text-[var(--theme-text-tertiary)]">{{ session.eventCount }} events</span>
              <div class="w-16 h-4 bg-[var(--theme-bg-primary)] rounded-full overflow-hidden">
                <div 
                  class="h-full transition-all duration-300"
                  :class="session.activityColorClass"
                  :style="{ width: session.activityLevel + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { HookEvent } from '../types';
import { useEventEmojis } from '../composables/useEventEmojis';
import { useEventColors } from '../composables/useEventColors';

const props = defineProps<{
  events: HookEvent[];
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
  };
}>();

const emit = defineEmits<{
  selectSession: [sessionId: string];
  selectTimeRange: [start: number, end: number];
}>();

// Refs
const chartCanvas = ref<HTMLCanvasElement>();
const miniMapCanvas = ref<HTMLCanvasElement>();
const ctx = ref<CanvasRenderingContext2D | null>(null);
const miniMapCtx = ref<CanvasRenderingContext2D | null>(null);

// State
const currentViewMode = ref<'stacked' | 'timeline' | 'heatmap'>('stacked');
const selectedTimeRange = ref('5m');
const autoRefresh = ref(true);
const isLoading = ref(false);
const showMiniMap = ref(true);

// Tooltip state
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  time: '',
  data: [] as Array<{ label: string; value: string; emoji: string }>
});

// Mini map viewport
const miniMapViewport = ref({
  left: 0,
  width: 100
});

// Animation frame
let animationFrameId: number | null = null;
let lastRenderTime = 0;

// View modes
const viewModes = [
  { id: 'stacked', label: 'Stacked' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'heatmap', label: 'Heatmap' }
];

// Time ranges
const timeRanges = [
  { value: '1m', label: '1m', seconds: 60 },
  { value: '5m', label: '5m', seconds: 300 },
  { value: '15m', label: '15m', seconds: 900 },
  { value: '1h', label: '1h', seconds: 3600 }
];

const { getEmojiForEventType } = useEventEmojis();
const { getColorForSession, getHexColorForSession } = useEventColors();

// Computed
const filteredEvents = computed(() => {
  let filtered = [...props.events];
  
  if (props.filters.sourceApp) {
    filtered = filtered.filter(e => e.source_app === props.filters.sourceApp);
  }
  if (props.filters.sessionId) {
    filtered = filtered.filter(e => e.session_id === props.filters.sessionId);
  }
  if (props.filters.eventType) {
    filtered = filtered.filter(e => e.hook_event_type === props.filters.eventType);
  }
  
  // Filter by time range
  const range = timeRanges.find(r => r.value === selectedTimeRange.value);
  if (range) {
    const cutoff = Date.now() - (range.seconds * 1000);
    filtered = filtered.filter(e => (e.timestamp || 0) > cutoff);
  }
  
  return filtered;
});

const statistics = computed(() => {
  const total = filteredEvents.value.length;
  const uniqueSessions = new Set(filteredEvents.value.map(e => e.session_id)).size;
  const uniqueApps = new Set(filteredEvents.value.map(e => e.source_app)).size;
  
  // Calculate events per minute
  const range = timeRanges.find(r => r.value === selectedTimeRange.value);
  const minutes = range ? range.seconds / 60 : 1;
  const eventsPerMinute = Math.round(total / minutes);
  
  return [
    { label: 'Total Events', value: total.toString(), icon: '📊', trend: 'up' },
    { label: 'Active Sessions', value: uniqueSessions.toString(), icon: '🔗', trend: 'neutral' },
    { label: 'Apps', value: uniqueApps.toString(), icon: '📱', trend: 'neutral' },
    { label: 'Events/min', value: eventsPerMinute.toString(), icon: '⚡', trend: eventsPerMinute > 10 ? 'up' : 'down' }
  ];
});

const activeSessions = computed(() => {
  const sessionMap = new Map<string, any>();
  
  filteredEvents.value.forEach(event => {
    if (!sessionMap.has(event.session_id)) {
      const parts = event.session_id.split('_');
      let display = event.session_id.slice(0, 8) + '...';
      if (parts.length >= 3) {
        display = `${parts[0].slice(0, 6)}:${parts[1]}`;
      }
      
      sessionMap.set(event.session_id, {
        id: event.session_id,
        display,
        colorClass: getColorForSession(event.session_id),
        eventCount: 0,
        lastActivity: 0
      });
    }
    
    const session = sessionMap.get(event.session_id)!;
    session.eventCount++;
    session.lastActivity = Math.max(session.lastActivity, event.timestamp || 0);
  });
  
  // Calculate activity levels
  const now = Date.now();
  return Array.from(sessionMap.values())
    .map(session => {
      const timeSinceLastActivity = now - session.lastActivity;
      const activityLevel = Math.max(0, Math.min(100, 100 - (timeSinceLastActivity / 60000) * 100));
      const activityColorClass = activityLevel > 50 ? 'bg-green-500' : activityLevel > 20 ? 'bg-yellow-500' : 'bg-red-500';
      
      return { ...session, activityLevel, activityColorClass };
    })
    .sort((a, b) => b.activityLevel - a.activityLevel);
});

// Methods
const initCanvas = () => {
  if (!chartCanvas.value || !miniMapCanvas.value) return;
  
  ctx.value = chartCanvas.value.getContext('2d');
  miniMapCtx.value = miniMapCanvas.value.getContext('2d');
  
  // Set canvas size
  const rect = chartCanvas.value.getBoundingClientRect();
  chartCanvas.value.width = rect.width * window.devicePixelRatio;
  chartCanvas.value.height = rect.height * window.devicePixelRatio;
  ctx.value?.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  // Mini map size
  miniMapCanvas.value.width = 192 * window.devicePixelRatio;
  miniMapCanvas.value.height = 48 * window.devicePixelRatio;
  miniMapCtx.value?.scale(window.devicePixelRatio, window.devicePixelRatio);
};

const renderChart = (timestamp: number) => {
  if (!ctx.value || !chartCanvas.value) return;
  
  const deltaTime = timestamp - lastRenderTime;
  if (deltaTime < 16) { // 60 FPS cap
    animationFrameId = requestAnimationFrame(renderChart);
    return;
  }
  
  lastRenderTime = timestamp;
  
  // Clear canvas
  ctx.value.clearRect(0, 0, chartCanvas.value.width, chartCanvas.value.height);
  
  // Render based on view mode
  switch (currentViewMode.value) {
    case 'stacked':
      renderStackedChart();
      break;
    case 'timeline':
      renderTimelineChart();
      break;
    case 'heatmap':
      renderHeatmapChart();
      break;
  }
  
  // Render mini map
  if (showMiniMap.value) {
    renderMiniMap();
  }
  
  if (autoRefresh.value) {
    animationFrameId = requestAnimationFrame(renderChart);
  }
};

const renderStackedChart = () => {
  if (!ctx.value || !chartCanvas.value) return;
  
  const width = chartCanvas.value.width / window.devicePixelRatio;
  const height = chartCanvas.value.height / window.devicePixelRatio;
  
  // Group events by time buckets and event type
  const bucketSize = 10000; // 10 seconds
  const range = timeRanges.find(r => r.value === selectedTimeRange.value);
  const startTime = Date.now() - (range?.seconds || 300) * 1000;
  
  const buckets = new Map<number, Map<string, number>>();
  
  filteredEvents.value.forEach(event => {
    const bucketTime = Math.floor((event.timestamp || 0) / bucketSize) * bucketSize;
    if (bucketTime < startTime) return;
    
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, new Map());
    }
    
    const typeCounts = buckets.get(bucketTime)!;
    const count = typeCounts.get(event.hook_event_type) || 0;
    typeCounts.set(event.hook_event_type, count + 1);
  });
  
  // Draw stacked areas
  const eventTypes = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop', 'PreCompact', 'UserPromptSubmit'];
  const colors = {
    'PreToolUse': '#3B82F6',
    'PostToolUse': '#10B981',
    'Notification': '#F59E0B',
    'Stop': '#EF4444',
    'SubagentStop': '#8B5CF6',
    'PreCompact': '#F97316',
    'UserPromptSubmit': '#06B6D4'
  };
  
  // Calculate max height
  let maxHeight = 0;
  buckets.forEach(typeCounts => {
    let total = 0;
    typeCounts.forEach(count => total += count);
    maxHeight = Math.max(maxHeight, total);
  });
  
  // Draw grid lines
  ctx.value.strokeStyle = 'rgba(128, 128, 128, 0.1)';
  ctx.value.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i;
    ctx.value.beginPath();
    ctx.value.moveTo(0, y);
    ctx.value.lineTo(width, y);
    ctx.value.stroke();
  }
  
  // Draw stacked areas
  const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  
  eventTypes.forEach(type => {
    ctx.value.fillStyle = colors[type as keyof typeof colors] || '#666';
    ctx.value.globalAlpha = 0.8;
    ctx.value.beginPath();
    
    let prevY = height;
    sortedBuckets.forEach(([time, typeCounts], index) => {
      const x = (index / (sortedBuckets.length - 1)) * width;
      
      // Calculate y position for this type
      let y = height;
      let stackHeight = 0;
      
      eventTypes.forEach(t => {
        if (t === type) {
          const count = typeCounts.get(t) || 0;
          y = height - ((stackHeight + count) / maxHeight) * height * 0.9;
        }
        stackHeight += typeCounts.get(t) || 0;
      });
      
      if (index === 0) {
        ctx.value.moveTo(x, y);
      } else {
        // Smooth curve
        const prevX = ((index - 1) / (sortedBuckets.length - 1)) * width;
        const cpx = (prevX + x) / 2;
        ctx.value.quadraticCurveTo(cpx, prevY, x, y);
      }
      
      prevY = y;
    });
    
    // Complete the area
    ctx.value.lineTo(width, height);
    ctx.value.lineTo(0, height);
    ctx.value.closePath();
    ctx.value.fill();
  });
  
  ctx.value.globalAlpha = 1;
};

const renderTimelineChart = () => {
  // Implementation for timeline view
  // This would show events along horizontal time axis with session lanes
};

const renderHeatmapChart = () => {
  // Implementation for heatmap view
  // This would show event density as a heatmap
};

const renderMiniMap = () => {
  if (!miniMapCtx.value || !miniMapCanvas.value) return;
  
  // Simplified version of main chart for mini map
  miniMapCtx.value.clearRect(0, 0, miniMapCanvas.value.width, miniMapCanvas.value.height);
  
  // Draw simplified chart
  miniMapCtx.value.fillStyle = 'var(--theme-primary)';
  miniMapCtx.value.globalAlpha = 0.3;
  miniMapCtx.value.fillRect(0, 0, miniMapCanvas.value.width / window.devicePixelRatio, miniMapCanvas.value.height / window.devicePixelRatio);
  miniMapCtx.value.globalAlpha = 1;
};

const handleMouseMove = (event: MouseEvent) => {
  if (!chartCanvas.value) return;
  
  const rect = chartCanvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Update tooltip based on position
  // This would calculate what data point is under the cursor
  tooltip.value = {
    visible: true,
    x: Math.min(x + 10, rect.width - 200),
    y: Math.min(y + 10, rect.height - 100),
    time: new Date().toLocaleTimeString(),
    data: [
      { label: 'PreToolUse', value: '5', emoji: '🔧' },
      { label: 'PostToolUse', value: '3', emoji: '✅' }
    ]
  };
};

const handleMouseLeave = () => {
  tooltip.value.visible = false;
};

const handleChartClick = (event: MouseEvent) => {
  // Handle click events for drilling down into data
};

// Lifecycle
onMounted(() => {
  initCanvas();
  animationFrameId = requestAnimationFrame(renderChart);
  
  // Handle resize
  window.addEventListener('resize', initCanvas);
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', initCanvas);
});

// Watchers
watch([currentViewMode, selectedTimeRange, () => props.events.length], () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(renderChart);
});
</script>

<style scoped>
/* Tooltip animation */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}
</style>