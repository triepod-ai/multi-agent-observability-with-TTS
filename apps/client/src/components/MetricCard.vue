<template>
  <div 
    class="group bg-gray-900/50 hover:bg-gray-900/70 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
    @click="$emit('click')"
  >
    <div class="flex items-center justify-between mb-2">
      <!-- Icon -->
      <div class="text-2xl group-hover:scale-110 transition-transform duration-200">
        {{ icon }}
      </div>
      
      <!-- Trend indicator -->
      <div 
        v-if="trend !== undefined && trend !== null && trend !== 0" 
        class="flex items-center space-x-1 text-xs font-medium"
        :class="trendColor"
      >
        <svg 
          class="w-3 h-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          :class="trend > 0 ? '' : 'rotate-180'"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
        <span>{{ Math.abs(trend) }}{{ trendSuffix }}</span>
      </div>
    </div>
    
    <!-- Value -->
    <div class="mb-1">
      <div 
        class="text-xl font-bold transition-colors duration-200 group-hover:text-white"
        :class="valueColor"
      >
        {{ formattedValue }}
      </div>
    </div>
    
    <!-- Title -->
    <div class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
      {{ title }}
    </div>
    
    <!-- Trend description -->
    <div 
      v-if="trend !== undefined && trend !== null && trend !== 0" 
      class="text-xs text-gray-500 mt-1"
    >
      {{ trendDescription }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  value: string | number;
  trend?: number;
  icon: string;
  color: string;
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
}

const props = withDefaults(defineProps<Props>(), {
  format: 'number'
});

// Emits
defineEmits<{
  'click': [];
}>();

// Computed properties
const formattedValue = computed(() => {
  if (typeof props.value === 'string') {
    return props.value;
  }
  
  switch (props.format) {
    case 'percentage':
      return `${props.value}%`;
    
    case 'duration':
      if (props.value < 60) {
        return `${props.value}s`;
      } else if (props.value < 3600) {
        return `${Math.round(props.value / 60 * 10) / 10}m`;
      } else {
        return `${Math.round(props.value / 3600 * 10) / 10}h`;
      }
    
    case 'bytes':
      if (props.value >= 1000000000) {
        return `${(props.value / 1000000000).toFixed(1)}GB`;
      } else if (props.value >= 1000000) {
        return `${(props.value / 1000000).toFixed(1)}MB`;
      } else if (props.value >= 1000) {
        return `${(props.value / 1000).toFixed(1)}KB`;
      } else {
        return `${props.value}B`;
      }
    
    case 'number':
    default:
      if (props.value >= 1000000) {
        return `${(props.value / 1000000).toFixed(1)}M`;
      } else if (props.value >= 1000) {
        return `${(props.value / 1000).toFixed(1)}K`;
      } else {
        return props.value.toLocaleString();
      }
  }
});

const valueColor = computed(() => {
  return `text-${props.color}-400`;
});

const trendColor = computed(() => {
  if (props.trend === undefined || props.trend === null || props.trend === 0) {
    return 'text-gray-400';
  }
  
  return props.trend > 0 ? 'text-green-400' : 'text-red-400';
});

const trendSuffix = computed(() => {
  switch (props.format) {
    case 'percentage':
      return '%';
    case 'duration':
      return 's';
    case 'bytes':
      return 'B';
    case 'number':
    default:
      return '';
  }
});

const trendDescription = computed(() => {
  if (props.trend === undefined || props.trend === null || props.trend === 0) {
    return '';
  }
  
  const direction = props.trend > 0 ? 'increase' : 'decrease';
  const magnitude = Math.abs(props.trend);
  
  // Different descriptions based on the metric type
  if (props.title.toLowerCase().includes('success')) {
    return `${direction} from last period`;
  } else if (props.title.toLowerCase().includes('duration') || props.title.toLowerCase().includes('time')) {
    return props.trend > 0 ? 'slower than before' : 'faster than before';
  } else {
    return `${direction} from last period`;
  }
});
</script>

<style scoped>
/* Hover glow effect */
.group:hover {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
}

/* Trend indicator animation */
.group:hover svg {
  animation: bounce 0.5s ease-in-out;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-3px);
  }
  60% {
    transform: translateY(-1px);
  }
}
</style>