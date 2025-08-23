<template>
  <g 
    class="flow-node cursor-pointer" 
    :class="{ 'node-selected': isSelected, 'node-active': isActive }"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Node Shadow -->
    <ellipse
      :cx="node.position.x + 60"
      :cy="node.position.y + 35"
      rx="65"
      ry="40"
      fill="rgba(0, 0, 0, 0.3)"
      class="node-shadow"
    />

    <!-- Main Node Background -->
    <rect
      :x="node.position.x"
      :y="node.position.y"
      width="120"
      height="60"
      :rx="nodeRadius"
      :ry="nodeRadius"
      :fill="nodeFill"
      :stroke="nodeStroke"
      :stroke-width="strokeWidth"
      class="node-background transition-all duration-300"
    />

    <!-- Node Icon -->
    <text
      :x="node.position.x + 60"
      :y="node.position.y + 25"
      text-anchor="middle"
      dominant-baseline="middle"
      class="node-icon text-2xl select-none"
    >
      {{ node.icon }}
    </text>

    <!-- Node Name -->
    <text
      :x="node.position.x + 60"
      :y="node.position.y + 45"
      text-anchor="middle"
      dominant-baseline="middle"
      :class="textClass"
      class="node-name text-xs font-semibold select-none"
    >
      {{ displayName }}
    </text>

    <!-- Active Pulse Ring -->
    <circle
      v-if="isActive"
      :cx="node.position.x + 60"
      :cy="node.position.y + 30"
      r="50"
      fill="none"
      :stroke="node.color"
      stroke-width="3"
      opacity="0.6"
      class="active-pulse"
    >
      <animate
        attributeName="r"
        values="40;60;40"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.8;0.2;0.8"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Selection Ring -->
    <circle
      v-if="isSelected"
      :cx="node.position.x + 60"
      :cy="node.position.y + 30"
      r="45"
      fill="none"
      stroke="#3B82F6"
      stroke-width="2"
      opacity="0.8"
      class="selection-ring"
    />

    <!-- Hover Glow -->
    <rect
      v-if="isHovered && !isSelected"
      :x="node.position.x - 5"
      :y="node.position.y - 5"
      width="130"
      height="70"
      :rx="nodeRadius + 5"
      :ry="nodeRadius + 5"
      fill="none"
      stroke="rgba(59, 130, 246, 0.4)"
      stroke-width="2"
      class="hover-glow"
    />

    <!-- Status Indicator -->
    <circle
      :cx="node.position.x + 105"
      :cy="node.position.y + 15"
      :r="statusIndicatorRadius"
      :fill="statusIndicatorColor"
      class="status-indicator"
    />

    <!-- Competency Badge -->
    <g v-if="competency && showCompetencyBadge">
      <circle
        :cx="node.position.x + 105"
        :cy="node.position.y + 45"
        r="12"
        :fill="competencyColor"
        class="competency-badge"
      />
      <text
        :x="node.position.x + 105"
        :y="node.position.y + 49"
        text-anchor="middle"
        dominant-baseline="middle"
        class="fill-white text-xs font-bold"
      >
        {{ competencyDisplay }}
      </text>
    </g>

    <!-- Performance Metrics -->
    <g v-if="showMetrics" class="performance-metrics">
      <rect
        :x="node.position.x - 10"
        :y="node.position.y - 20"
        width="140"
        height="15"
        rx="7"
        fill="rgba(0, 0, 0, 0.7)"
        class="metrics-background"
      />
      <text
        :x="node.position.x + 60"
        :y="node.position.y - 10"
        text-anchor="middle"
        dominant-baseline="middle"
        class="fill-white text-xs"
      >
        {{ metricsText }}
      </text>
    </g>

    <!-- Interactive Areas -->
    <rect
      :x="node.position.x"
      :y="node.position.y"
      width="120"
      height="60"
      fill="transparent"
      class="interaction-area"
    />
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { HookFlowStep } from '../types';

interface CompetencyData {
  level: number;
  masteryType: 'knowledge' | 'application' | 'analysis' | 'synthesis';
}

interface Props {
  node: HookFlowStep;
  competency?: CompetencyData;
  isSelected?: boolean;
  isActive?: boolean;
  isHovered?: boolean;
  zoom: number;
  showMetrics?: boolean;
  executionCount?: number;
  successRate?: number;
  avgDuration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isActive: false,
  isHovered: false,
  zoom: 1,
  showMetrics: false,
  executionCount: 0,
  successRate: 100,
  avgDuration: 0
});

const emit = defineEmits<{
  click: [nodeId: string];
  hover: [nodeId: string | null];
}>();

// State
const isHovered = ref(false);

// Computed Properties
const nodeRadius = computed(() => 8);

const strokeWidth = computed(() => {
  if (props.isSelected) return 3;
  if (props.isActive) return 2;
  return 1;
});

const nodeFill = computed(() => {
  if (props.isActive) {
    return `${props.node.color}40`; // 25% opacity
  }
  if (props.isSelected) {
    return '#1F2937';
  }
  if (isHovered.value) {
    return '#374151';
  }
  return '#1F2937';
});

const nodeStroke = computed(() => {
  if (props.isActive) return props.node.color;
  if (props.isSelected) return '#3B82F6';
  if (isHovered.value) return '#6B7280';
  return '#4B5563';
});

const textClass = computed(() => {
  return props.isSelected || props.isActive ? 'fill-white' : 'fill-gray-300';
});

const displayName = computed(() => {
  // Truncate long names based on zoom level
  const maxLength = Math.max(8, Math.floor(12 * props.zoom));
  return props.node.name.length > maxLength 
    ? props.node.name.slice(0, maxLength) + '...'
    : props.node.name;
});

const statusIndicatorRadius = computed(() => {
  return props.isActive ? 6 : 4;
});

const statusIndicatorColor = computed(() => {
  if (props.isActive) return '#10B981'; // green
  if (props.successRate < 80) return '#EF4444'; // red
  if (props.successRate < 95) return '#F59E0B'; // amber
  return '#10B981'; // green
});

const showCompetencyBadge = computed(() => {
  return props.competency && props.zoom >= 0.7;
});

const competencyColor = computed(() => {
  if (!props.competency) return '#6B7280';
  
  const level = props.competency.level;
  if (level < 30) return '#EF4444'; // red
  if (level < 60) return '#F59E0B'; // amber
  if (level < 80) return '#10B981'; // green
  return '#8B5CF6'; // purple
});

const competencyDisplay = computed(() => {
  if (!props.competency) return '?';
  
  const level = props.competency.level;
  if (level < 30) return 'B';
  if (level < 60) return 'L';
  if (level < 80) return 'I';
  return 'A';
});

const metricsText = computed(() => {
  if (props.executionCount === 0) return 'No executions';
  return `${props.executionCount} runs • ${props.successRate}% • ${props.avgDuration}ms`;
});

// Methods
const handleClick = (event: MouseEvent) => {
  event.stopPropagation();
  emit('click', props.node.id);
};

const handleMouseEnter = () => {
  isHovered.value = true;
  emit('hover', props.node.id);
};

const handleMouseLeave = () => {
  isHovered.value = false;
  emit('hover', null);
};
</script>

<style scoped>
.flow-node {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.flow-node:hover {
  filter: brightness(1.1);
}

.node-selected {
  filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
}

.node-active {
  filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.6));
}

.node-shadow {
  filter: blur(3px);
}

.active-pulse {
  animation: pulse-glow 2s ease-in-out infinite;
}

.selection-ring {
  animation: selection-pulse 1s ease-in-out infinite alternate;
}

.hover-glow {
  animation: hover-shimmer 2s ease-in-out infinite;
}

.competency-badge {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.performance-metrics {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.flow-node:hover .performance-metrics {
  opacity: 1;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.4; }
}

@keyframes selection-pulse {
  0% { opacity: 0.8; }
  100% { opacity: 1; }
}

@keyframes hover-shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.6; }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .active-pulse,
  .selection-ring,
  .hover-glow {
    animation: none;
  }
  
  .flow-node {
    transition: none;
  }
}
</style>