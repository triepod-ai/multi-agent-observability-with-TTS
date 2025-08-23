<template>
  <g class="flow-connection">
    <!-- Connection Path Background -->
    <path
      :d="pathData"
      :stroke="backgroundStroke"
      :stroke-width="backgroundStrokeWidth"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="connection-background"
    />

    <!-- Main Connection Path -->
    <path
      :d="pathData"
      :stroke="connectionStroke"
      :stroke-width="connectionStrokeWidth"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke-dasharray="strokeDashArray"
      :opacity="connectionOpacity"
      class="connection-path transition-all duration-300"
    >
      <!-- Animated Flow -->
      <animate
        v-if="isAnimating && isActiveConnection"
        attributeName="stroke-dashoffset"
        :values="animationValues"
        :dur="animationDuration"
        repeatCount="indefinite"
      />
    </path>

    <!-- Direction Arrow -->
    <polygon
      :points="arrowPoints"
      :fill="arrowFill"
      :opacity="connectionOpacity"
      class="connection-arrow transition-all duration-300"
    />

    <!-- Data Flow Particles -->
    <g v-if="showDataFlow && isActiveConnection" class="data-flow">
      <circle
        v-for="(particle, index) in dataParticles"
        :key="`particle-${index}`"
        :cx="particle.x"
        :cy="particle.y"
        :r="particle.size"
        :fill="particle.color"
        :opacity="particle.opacity"
        class="data-particle"
      >
        <animateMotion
          :dur="particleAnimationDuration"
          repeatCount="indefinite"
          rotate="auto"
          :begin="`${index * 0.2}s`"
        >
          <mpath :href="`#path-${connection.from}-${connection.to}`" />
        </animateMotion>
        <animate
          attributeName="opacity"
          :values="particleOpacityAnimation"
          :dur="particleAnimationDuration"
          repeatCount="indefinite"
          :begin="`${index * 0.2}s`"
        />
      </circle>
    </g>

    <!-- Connection Label -->
    <g v-if="showLabel && connection.label" class="connection-label">
      <rect
        :x="labelPosition.x - labelWidth / 2"
        :y="labelPosition.y - 8"
        :width="labelWidth"
        height="16"
        rx="8"
        fill="rgba(0, 0, 0, 0.7)"
        class="label-background"
      />
      <text
        :x="labelPosition.x"
        :y="labelPosition.y"
        text-anchor="middle"
        dominant-baseline="middle"
        class="fill-white text-xs font-medium"
      >
        {{ connection.label }}
      </text>
    </g>

    <!-- Performance Metrics -->
    <g v-if="showMetrics && connectionMetrics" class="connection-metrics">
      <circle
        :cx="metricsPosition.x"
        :cy="metricsPosition.y"
        r="12"
        fill="rgba(0, 0, 0, 0.8)"
        class="metrics-background"
      />
      <text
        :x="metricsPosition.x"
        :y="metricsPosition.y"
        text-anchor="middle"
        dominant-baseline="middle"
        class="fill-white text-xs font-bold"
      >
        {{ metricsDisplay }}
      </text>
    </g>

    <!-- Invisible Path for Particle Animation -->
    <path
      :id="`path-${connection.from}-${connection.to}`"
      :d="pathData"
      fill="none"
      stroke="none"
      opacity="0"
    />
  </g>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import type { HookFlowStep } from '../types';

interface FlowConnection {
  from: string;
  to: string;
  type?: 'sequential' | 'conditional' | 'parallel';
  label?: string;
  strength?: number; // 0-1, affects visual prominence
  data?: any;
}

interface ConnectionMetrics {
  executionCount: number;
  averageLatency: number;
  successRate: number;
}

interface DataParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}

interface Props {
  connection: FlowConnection;
  nodes: HookFlowStep[];
  isAnimating?: boolean;
  currentStep?: number;
  isHighlighted?: boolean;
  showDataFlow?: boolean;
  showLabel?: boolean;
  showMetrics?: boolean;
  connectionMetrics?: ConnectionMetrics;
}

const props = withDefaults(defineProps<Props>(), {
  isAnimating: false,
  currentStep: -1,
  isHighlighted: false,
  showDataFlow: false,
  showLabel: false,
  showMetrics: false
});

// State
const dataParticles = ref<DataParticle[]>([]);

// Computed Properties
const fromNode = computed(() => 
  props.nodes.find(n => n.id === props.connection.from)
);

const toNode = computed(() => 
  props.nodes.find(n => n.id === props.connection.to)
);

const isActiveConnection = computed(() => {
  if (!props.isAnimating) return false;
  
  const fromIndex = props.nodes.findIndex(n => n.id === props.connection.from);
  const toIndex = props.nodes.findIndex(n => n.id === props.connection.to);
  
  return fromIndex === props.currentStep && toIndex === props.currentStep + 1;
});

const pathData = computed(() => {
  if (!fromNode.value || !toNode.value) return '';
  
  const from = {
    x: fromNode.value.position.x + 120, // Right edge of from node
    y: fromNode.value.position.y + 30   // Center vertically
  };
  
  const to = {
    x: toNode.value.position.x,         // Left edge of to node
    y: toNode.value.position.y + 30     // Center vertically
  };
  
  // Calculate control points for smooth curves
  const distance = Math.abs(to.x - from.x);
  const controlOffset = Math.min(distance * 0.4, 80);
  
  const cp1 = { x: from.x + controlOffset, y: from.y };
  const cp2 = { x: to.x - controlOffset, y: to.y };
  
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
});

const connectionStroke = computed(() => {
  if (isActiveConnection.value) {
    return fromNode.value?.color || '#3B82F6';
  }
  if (props.isHighlighted) {
    return '#10B981';
  }
  return '#6B7280';
});

const backgroundStroke = computed(() => {
  return '#374151';
});

const connectionStrokeWidth = computed(() => {
  if (isActiveConnection.value) return 4;
  if (props.isHighlighted) return 3;
  return 2;
});

const backgroundStrokeWidth = computed(() => {
  return connectionStrokeWidth.value + 2;
});

const connectionOpacity = computed(() => {
  if (isActiveConnection.value) return 1;
  if (props.isHighlighted) return 0.8;
  return 0.6;
});

const strokeDashArray = computed(() => {
  if (props.connection.type === 'conditional') return '5,5';
  if (props.connection.type === 'parallel') return '10,2,2,2';
  return 'none';
});

const animationValues = computed(() => {
  const dashLength = strokeDashArray.value === 'none' ? 0 : 15;
  return `0;-${dashLength}`;
});

const animationDuration = computed(() => {
  return props.connection.type === 'parallel' ? '0.5s' : '1s';
});

const arrowPoints = computed(() => {
  if (!fromNode.value || !toNode.value) return '';
  
  const to = {
    x: toNode.value.position.x,
    y: toNode.value.position.y + 30
  };
  
  const arrowSize = 8;
  return `${to.x},${to.y} ${to.x - arrowSize},${to.y - arrowSize/2} ${to.x - arrowSize},${to.y + arrowSize/2}`;
});

const arrowFill = computed(() => connectionStroke.value);

const labelPosition = computed(() => {
  if (!fromNode.value || !toNode.value) return { x: 0, y: 0 };
  
  const from = {
    x: fromNode.value.position.x + 120,
    y: fromNode.value.position.y + 30
  };
  
  const to = {
    x: toNode.value.position.x,
    y: toNode.value.position.y + 30
  };
  
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - 10
  };
});

const labelWidth = computed(() => {
  return (props.connection.label?.length || 0) * 6 + 16;
});

const metricsPosition = computed(() => {
  if (!fromNode.value || !toNode.value) return { x: 0, y: 0 };
  
  const from = {
    x: fromNode.value.position.x + 120,
    y: fromNode.value.position.y + 30
  };
  
  const to = {
    x: toNode.value.position.x,
    y: toNode.value.position.y + 30
  };
  
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 + 15
  };
});

const metricsDisplay = computed(() => {
  if (!props.connectionMetrics) return '';
  
  const { executionCount, successRate } = props.connectionMetrics;
  if (executionCount === 0) return '0';
  return `${executionCount}`;
});

const particleAnimationDuration = computed(() => '2s');

const particleOpacityAnimation = computed(() => '0;1;1;0');

// Initialize data particles
watchEffect(() => {
  if (props.showDataFlow) {
    dataParticles.value = Array.from({ length: 3 }, (_, i) => ({
      x: 0,
      y: 0,
      size: 3 - i * 0.5,
      color: connectionStroke.value,
      opacity: 0.8 - i * 0.2
    }));
  } else {
    dataParticles.value = [];
  }
});
</script>

<style scoped>
.flow-connection {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.connection-path {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.connection-arrow {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.data-particle {
  filter: drop-shadow(0 0 4px currentColor);
}

.label-background {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.metrics-background {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

/* Hover effects */
.flow-connection:hover .connection-path {
  stroke-width: 3;
  opacity: 1;
}

.flow-connection:hover .connection-arrow {
  opacity: 1;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .connection-path animate,
  .data-particle animateMotion,
  .data-particle animate {
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .connection-path {
    stroke-width: 3;
  }
  
  .connection-background {
    stroke: #000;
    stroke-width: 5;
  }
}
</style>