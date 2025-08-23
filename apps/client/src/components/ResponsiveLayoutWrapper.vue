<template>
  <div class="responsive-layout-wrapper">
    <!-- Mobile-first responsive container -->
    <div class="container mx-auto px-4 py-6">
      <!-- Adaptive header -->
      <div class="mb-6">
        <slot name="header">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-white">{{ title }}</h1>
              <p v-if="subtitle" class="text-sm text-gray-400 mt-1">{{ subtitle }}</p>
            </div>
            <div class="flex items-center space-x-2">
              <slot name="header-actions"></slot>
            </div>
          </div>
        </slot>
      </div>

      <!-- Main content area with responsive grid -->
      <div :class="mainGridClasses">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title?: string;
  subtitle?: string;
  layout?: 'single' | 'two-column' | 'three-column' | 'adaptive';
  spacing?: 'compact' | 'normal' | 'spacious';
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'adaptive',
  spacing: 'normal'
});

const mainGridClasses = computed(() => {
  const spacingClasses = {
    compact: 'gap-3',
    normal: 'gap-4',
    spacious: 'gap-6'
  };

  const layoutClasses = {
    single: 'grid grid-cols-1',
    'two-column': 'grid grid-cols-1 lg:grid-cols-2',
    'three-column': 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    adaptive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12'
  };

  return `${layoutClasses[props.layout]} ${spacingClasses[props.spacing]}`;
});
</script>

<style scoped>
.responsive-layout-wrapper {
  min-height: 100vh;
  background: theme('colors.gray.950');
}

.container {
  max-width: 1400px;
}

/* Responsive breakpoints */
@media (max-width: 640px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (min-width: 1200px) {
  .container {
    max-width: 1400px;
  }
}

/* Smooth transitions for layout changes */
.grid > * {
  transition: all 0.2s ease-in-out;
}

/* Progressive disclosure utilities */
.progressive-disclosure {
  @apply overflow-hidden transition-all duration-300 ease-in-out;
}

.progressive-disclosure.collapsed {
  @apply max-h-0 opacity-0;
}

.progressive-disclosure.expanded {
  @apply max-h-screen opacity-100;
}
</style>