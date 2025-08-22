<template>
  <div class="relative inline-block">
    <!-- Help Trigger -->
    <button
      @click="toggleHelp"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      class="flex items-center text-blue-400 hover:text-blue-300 transition-colors cursor-help"
      :class="size === 'sm' ? 'text-xs' : 'text-sm'"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
      </svg>
      <span v-if="label" class="ml-1">{{ label }}</span>
    </button>

    <!-- Tooltip (Quick Help) -->
    <Transition name="tooltip">
      <div
        v-if="showTooltip && !showPanel && tooltip"
        class="absolute z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg border border-gray-600 whitespace-nowrap"
        :class="tooltipPositionClass"
        style="max-width: 250px; white-space: normal;"
      >
        {{ tooltip }}
        <div class="absolute w-2 h-2 bg-gray-900 border-gray-600 transform rotate-45" :class="tooltipArrowClass"></div>
      </div>
    </Transition>

    <!-- Detailed Help Panel -->
    <Transition name="help-panel">
      <div
        v-if="showPanel"
        class="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 min-w-80 max-w-md"
        :class="panelPositionClass"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-white flex items-center">
            <span class="mr-2">💡</span>
            {{ title || 'Help' }}
          </h3>
          <button
            @click="showPanel = false"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content Sections -->
        <div class="space-y-3">
          <!-- Basic Description -->
          <div v-if="description">
            <p class="text-sm text-gray-300">{{ description }}</p>
          </div>

          <!-- Steps/Instructions -->
          <div v-if="steps && steps.length > 0">
            <h4 class="text-xs font-medium text-blue-400 mb-2">Steps:</h4>
            <ol class="space-y-1">
              <li
                v-for="(step, index) in steps"
                :key="index"
                class="text-xs text-gray-300 flex items-start"
              >
                <span class="inline-flex items-center justify-center w-4 h-4 bg-blue-600 text-white rounded-full text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                  {{ index + 1 }}
                </span>
                <span>{{ step }}</span>
              </li>
            </ol>
          </div>

          <!-- Tips -->
          <div v-if="tips && tips.length > 0">
            <h4 class="text-xs font-medium text-green-400 mb-2">Tips:</h4>
            <ul class="space-y-1">
              <li
                v-for="tip in tips"
                :key="tip"
                class="text-xs text-gray-300 flex items-start"
              >
                <span class="text-green-400 mr-2 flex-shrink-0">💡</span>
                <span>{{ tip }}</span>
              </li>
            </ul>
          </div>

          <!-- Common Issues -->
          <div v-if="commonIssues && commonIssues.length > 0">
            <h4 class="text-xs font-medium text-yellow-400 mb-2">Common Issues:</h4>
            <ul class="space-y-1">
              <li
                v-for="issue in commonIssues"
                :key="issue"
                class="text-xs text-gray-300 flex items-start"
              >
                <span class="text-yellow-400 mr-2 flex-shrink-0">⚠️</span>
                <span>{{ issue }}</span>
              </li>
            </ul>
          </div>

          <!-- Related Topics -->
          <div v-if="relatedTopics && relatedTopics.length > 0">
            <h4 class="text-xs font-medium text-purple-400 mb-2">Related:</h4>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="topic in relatedTopics"
                :key="topic"
                @click="$emit('navigate-to', topic)"
                class="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-colors"
              >
                {{ topic }}
              </button>
            </div>
          </div>

          <!-- Example/Demo -->
          <div v-if="example">
            <h4 class="text-xs font-medium text-cyan-400 mb-2">Example:</h4>
            <div class="bg-gray-900 rounded-md p-2 border border-gray-700">
              <pre class="text-xs text-gray-300 whitespace-pre-wrap">{{ example }}</pre>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="actions && actions.length > 0" class="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-gray-700">
          <button
            v-for="action in actions"
            :key="action.label"
            @click="handleAction(action)"
            class="text-xs px-3 py-1 rounded transition-colors"
            :class="action.primary
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Click Outside Overlay -->
    <div
      v-if="showPanel"
      class="fixed inset-0 z-40"
      @click="showPanel = false"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface HelpAction {
  label: string;
  action: string;
  primary?: boolean;
}

interface Props {
  title?: string;
  tooltip?: string;
  description?: string;
  steps?: string[];
  tips?: string[];
  commonIssues?: string[];
  relatedTopics?: string[];
  example?: string;
  actions?: HelpAction[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom',
  size: 'md'
});

const emit = defineEmits<{
  action: [action: string];
  'navigate-to': [topic: string];
}>();

const showTooltip = ref(false);
const showPanel = ref(false);

const toggleHelp = () => {
  if (props.tooltip && !showPanel.value) {
    showPanel.value = true;
    showTooltip.value = false;
  } else {
    showPanel.value = !showPanel.value;
  }
};

const tooltipPositionClass = computed(() => {
  const positions = {
    top: 'bottom-full mb-2 left-1/2 transform -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 transform -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 transform -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 transform -translate-y-1/2'
  };
  return positions[props.position];
});

const tooltipArrowClass = computed(() => {
  const arrows = {
    top: 'top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-t border-l',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2 border-b border-r',
    left: 'left-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 border-l border-t',
    right: 'right-full top-1/2 transform -translate-y-1/2 translate-x-1/2 border-r border-b'
  };
  return arrows[props.position];
});

const panelPositionClass = computed(() => {
  const positions = {
    top: 'bottom-full mb-2 left-0',
    bottom: 'top-full mt-2 left-0',
    left: 'right-full mr-2 top-0',
    right: 'left-full ml-2 top-0'
  };
  return positions[props.position];
});

const handleAction = (action: HelpAction) => {
  emit('action', action.action);
  if (action.action === 'close') {
    showPanel.value = false;
  }
};
</script>

<style scoped>
.tooltip-enter-active, .tooltip-leave-active {
  transition: all 0.2s ease;
}

.tooltip-enter-from, .tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.help-panel-enter-active, .help-panel-leave-active {
  transition: all 0.3s ease;
}

.help-panel-enter-from, .help-panel-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>