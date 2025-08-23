<template>
  <div 
    class="border-l-4 p-4 mb-4 rounded-r-md transition-all duration-300 hover:shadow-lg"
    :class="severityClasses"
    role="alert"
    :aria-labelledby="'callout-title-' + id"
    :aria-describedby="'callout-content-' + id"
  >
    <div class="flex items-start">
      <span 
        class="text-lg mr-3 flex-shrink-0 animate-pulse"
        :class="iconClasses"
        aria-hidden="true"
      >
        {{ displayIcon }}
      </span>
      <div class="flex-1 min-w-0">
        <h4 
          :id="'callout-title-' + id"
          class="font-semibold mb-2 text-sm flex items-center"
          :class="titleClasses"
        >
          {{ title }}
          <span 
            v-if="showBadge"
            class="ml-2 px-2 py-1 text-xs rounded-full"
            :class="badgeClasses"
          >
            {{ severityLabel }}
          </span>
        </h4>
        <div 
          :id="'callout-content-' + id"
          class="text-sm leading-relaxed"
          :class="contentClasses"
        >
          <slot>
            <p>{{ content }}</p>
          </slot>
        </div>
        
        <!-- Action buttons if provided -->
        <div v-if="actions && actions.length > 0" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="action in actions"
            :key="action.label"
            @click="handleActionClick(action)"
            class="text-xs px-3 py-1 rounded-md transition-colors font-medium"
            :class="actionButtonClasses"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface CalloutAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

interface Props {
  title: string;
  content?: string;
  icon?: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
  showBadge?: boolean;
  actions?: CalloutAction[];
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'warning',
  showBadge: false,
  icon: '⚠️'
});

// Generate unique ID for accessibility
const id = computed(() => generateId());

// Severity-based styling
const severityClasses = computed(() => {
  const classes = {
    critical: 'bg-red-900/20 border-red-500',
    warning: 'bg-yellow-900/20 border-yellow-500',
    info: 'bg-blue-900/20 border-blue-500',
    success: 'bg-green-900/20 border-green-500'
  };
  return classes[props.severity];
});

const iconClasses = computed(() => {
  const classes = {
    critical: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
    success: 'text-green-400'
  };
  return classes[props.severity];
});

const titleClasses = computed(() => {
  const classes = {
    critical: 'text-red-300',
    warning: 'text-yellow-300',
    info: 'text-blue-300',
    success: 'text-green-300'
  };
  return classes[props.severity];
});

const contentClasses = computed(() => {
  const classes = {
    critical: 'text-red-100',
    warning: 'text-yellow-100',
    info: 'text-blue-100',
    success: 'text-green-100'
  };
  return classes[props.severity];
});

const badgeClasses = computed(() => {
  const classes = {
    critical: 'bg-red-600 text-red-100',
    warning: 'bg-yellow-600 text-yellow-100',
    info: 'bg-blue-600 text-blue-100',
    success: 'bg-green-600 text-green-100'
  };
  return classes[props.severity];
});

const actionButtonClasses = computed(() => {
  const classes = {
    critical: 'bg-red-600 hover:bg-red-700 text-red-100',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-yellow-100',
    info: 'bg-blue-600 hover:bg-blue-700 text-blue-100',
    success: 'bg-green-600 hover:bg-green-700 text-green-100'
  };
  return classes[props.severity];
});

const severityLabel = computed(() => {
  const labels = {
    critical: 'Critical',
    warning: 'Important',
    info: 'Info',
    success: 'Tip'
  };
  return labels[props.severity];
});

const displayIcon = computed(() => {
  if (props.icon) return props.icon;
  
  const defaultIcons = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  };
  return defaultIcons[props.severity];
});

// Generate unique ID helper (simple implementation)
function generateId(): string {
  return 'callout-' + Math.random().toString(36).substr(2, 9);
}

const handleActionClick = (action: CalloutAction) => {
  action.action();
};
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>