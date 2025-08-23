<template>
  <div class="expandable-section">
    <button
      @click="toggleExpansion"
      @keydown.enter="toggleExpansion"
      @keydown.space.prevent="toggleExpansion"
      class="flex items-center justify-between w-full p-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      :class="[
        isExpanded ? expandedButtonClass : collapsedButtonClass,
        interactive ? 'hover:' + hoverClass : '',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
      :disabled="disabled"
      :aria-expanded="isExpanded"
      :aria-controls="contentId"
    >
      <!-- Header Content -->
      <div class="flex items-center flex-1">
        <span v-if="icon" class="text-lg mr-3" :class="iconClass">{{ icon }}</span>
        <div class="flex-1">
          <h3 class="font-medium" :class="titleClass">
            {{ title }}
            <span v-if="badge" class="ml-2 px-2 py-1 text-xs rounded-full" :class="badgeClass">
              {{ badge }}
            </span>
          </h3>
          <p v-if="subtitle" class="text-sm mt-1" :class="subtitleClass">{{ subtitle }}</p>
        </div>
      </div>

      <!-- Expansion Indicator -->
      <div class="flex items-center ml-3">
        <slot name="actions" v-if="!isExpanded && $slots.actions"></slot>
        <ChevronIcon 
          :class="[
            'w-5 h-5 transition-transform duration-200 flex-shrink-0',
            isExpanded ? 'rotate-180' : '',
            chevronClass
          ]"
        />
      </div>
    </button>

    <!-- Expandable Content -->
    <Transition
      name="expand"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @leave="onLeave"
      @after-leave="onAfterLeave"
    >
      <div
        v-show="isExpanded"
        :id="contentId"
        class="expandable-content overflow-hidden"
        :class="contentClass"
        role="region"
        :aria-labelledby="headerId"
      >
        <div class="p-4" :class="innerContentClass">
          <slot :isExpanded="isExpanded" :toggle="toggleExpansion"></slot>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import { useExpandableState } from '../composables/useExpandableState';

interface Props {
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
  interactive?: boolean;
  defaultExpanded?: boolean;
  persistState?: boolean;
  stateKey?: string;
  level?: 'primary' | 'secondary' | 'tertiary';
  variant?: 'default' | 'bordered' | 'filled' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  interactive: true,
  defaultExpanded: false,
  persistState: false,
  level: 'primary',
  variant: 'default',
  size: 'md'
});

const emit = defineEmits<{
  toggle: [expanded: boolean];
  expand: [];
  collapse: [];
}>();

// Use expandable state composable for persistence
const { isExpanded, toggleExpansion: baseToggle, setValue } = useExpandableState(
  props.stateKey || `expandable-${props.title}`,
  props.defaultExpanded,
  props.persistState
);

// Generate unique IDs for accessibility
const contentId = computed(() => `expandable-content-${props.stateKey || props.title.replace(/\s+/g, '-').toLowerCase()}`);
const headerId = computed(() => `expandable-header-${props.stateKey || props.title.replace(/\s+/g, '-').toLowerCase()}`);

// Custom toggle function with events
const toggleExpansion = () => {
  if (props.disabled) return;
  
  baseToggle();
  emit('toggle', isExpanded.value);
  
  if (isExpanded.value) {
    emit('expand');
  } else {
    emit('collapse');
  }
};

// Watch for external changes
watch(
  () => props.defaultExpanded,
  (newVal) => {
    if (newVal !== isExpanded.value) {
      // Use the setValue function instead of direct assignment
      setValue(newVal);
    }
  }
);

// Computed classes based on props
const buttonBaseClass = computed(() => {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };
  
  const variantClasses = {
    default: 'bg-gray-800 border border-gray-700 rounded-lg',
    bordered: 'border border-gray-600 rounded-lg',
    filled: 'bg-gray-900 rounded-lg',
    minimal: ''
  };
  
  return `${sizeClasses[props.size]} ${variantClasses[props.variant]}`;
});

const collapsedButtonClass = computed(() => {
  return `${buttonBaseClass.value} hover:border-gray-600`;
});

const expandedButtonClass = computed(() => {
  const expandedStyles = {
    default: 'bg-gray-700 border-gray-600',
    bordered: 'border-gray-500 bg-gray-800/50',
    filled: 'bg-gray-800',
    minimal: 'bg-gray-800/30'
  };
  
  return `${buttonBaseClass.value} ${expandedStyles[props.variant]}`;
});

const hoverClass = computed(() => {
  const hoverStyles = {
    default: 'bg-gray-700',
    bordered: 'bg-gray-800/50',
    filled: 'bg-gray-800',
    minimal: 'bg-gray-800/20'
  };
  
  return hoverStyles[props.variant];
});

const titleClass = computed(() => {
  const levelClasses = {
    primary: 'text-white text-base',
    secondary: 'text-gray-200 text-sm',
    tertiary: 'text-gray-300 text-sm'
  };
  
  return levelClasses[props.level];
});

const subtitleClass = computed(() => {
  const levelClasses = {
    primary: 'text-gray-400',
    secondary: 'text-gray-500',
    tertiary: 'text-gray-600'
  };
  
  return levelClasses[props.level];
});

const iconClass = computed(() => 'flex-shrink-0');
const chevronClass = computed(() => 'text-gray-400');
const badgeClass = computed(() => 'bg-blue-600 text-blue-100 text-xs');

const contentClass = computed(() => {
  const variantClasses = {
    default: 'border-t border-gray-700',
    bordered: 'border-t border-gray-600',
    filled: 'border-t border-gray-700',
    minimal: 'border-t border-gray-600'
  };
  
  return variantClasses[props.variant];
});

const innerContentClass = computed(() => {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };
  
  return sizeClasses[props.size];
});

// Transition event handlers for smooth animations
const onEnter = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '0';
  nextTick(() => {
    htmlEl.style.height = htmlEl.scrollHeight + 'px';
  });
};

const onAfterEnter = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = 'auto';
};

const onLeave = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = htmlEl.scrollHeight + 'px';
  nextTick(() => {
    htmlEl.style.height = '0';
  });
};

const onAfterLeave = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '';
};

// Chevron Icon Component
const ChevronIcon = {
  name: 'ChevronIcon',
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
    </svg>
  `
};
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
}

/* Focus styles for accessibility */
.expandable-section button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

/* Smooth transitions for all interactive elements */
.expandable-section * {
  transition: all 0.2s ease;
}
</style>