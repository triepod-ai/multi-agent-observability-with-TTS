<template>
  <div data-tab-content="flow">
    <div class="mb-3 md:mb-4">
      <h2 class="text-base md:text-lg font-semibold text-white mb-2">Interactive Hook Flow</h2>
      <p class="text-xs md:text-sm text-gray-400 mb-3 md:mb-4">
        This diagram shows how the 8 Claude Code hooks work together. <span class="hidden sm:inline">Click any hook to learn more, or click "Start Flow" to see the execution sequence.</span><span class="sm:hidden">Tap hooks to learn more.</span>
      </p>
    </div>

    <!-- Critical Concept: Hook Execution Order -->
    <CriticalConceptCallout
      title="Critical Concept: Hook Execution Order Matters!"
      severity="critical"
      icon="🔄"
      show-badge
      content="Hooks execute in a specific sequence that cannot be changed. Understanding this order is crucial for debugging issues and designing effective monitoring workflows."
      :actions="[
        { label: 'Learn More', action: () => $emit('navigate-tab', 'guide'), primary: true },
        { label: 'See Examples', action: () => $emit('navigate-tab', 'scenarios') }
      ]"
    />
    
    <!-- Tab Selector for Flow Views -->
    <div class="mb-3 md:mb-4 flex gap-1 bg-gray-700 p-1 rounded-lg">
      <button
        @click="viewMode = 'basic'"
        :class="[
          'px-2 md:px-3 py-2 text-xs font-medium rounded transition-all flex-1 touch-target',
          viewMode === 'basic'
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:text-white hover:bg-gray-600'
        ]"
      >
        Basic Flow
      </button>
      <button
        @click="viewMode = 'advanced'"
        :class="[
          'px-2 md:px-3 py-2 text-xs font-medium rounded transition-all flex-1 touch-target',
          viewMode === 'advanced'
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:text-white hover:bg-gray-600'
        ]"
      >
        <span class="hidden sm:inline">Interactive Flow</span>
        <span class="sm:hidden">Interactive</span>
      </button>
    </div>

    <!-- Basic Flow Diagram -->
    <div v-if="viewMode === 'basic'">
      <HookFlowDiagram 
        @show-in-flow="$emit('show-in-flow', $event)" 
        @simulate-hook="$emit('simulate-hook', $event)" 
      />
      
      <!-- Flow Legend -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4 mt-3 md:mt-4">
        <h3 class="text-xs md:text-sm font-semibold text-white mb-3 flex items-center">
          <span class="mr-2">📖</span>
          Flow Legend
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div class="flex items-center text-xs text-gray-300">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
            <span>Session Setup</span>
          </div>
          <div class="flex items-center text-xs text-gray-300">
            <div class="w-3 h-3 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
            <span>User Interaction</span>
          </div>
          <div class="flex items-center text-xs text-gray-300">
            <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2 flex-shrink-0"></div>
            <span>Tool Validation</span>
          </div>
          <div class="flex items-center text-xs text-gray-300">
            <div class="w-3 h-3 bg-purple-500 rounded-full mr-2 flex-shrink-0"></div>
            <span>Completion</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Interactive Flow -->
    <div v-else-if="viewMode === 'advanced'">
      <AdvancedFlowDiagram
        :competency-data="competencyData"
        :show-performance-monitor="true"
        @node-selected="$emit('node-selected', $event)"
        @simulate-hook="$emit('simulate-hook', $event)"
        @view-example="$emit('view-example', $event)"
        @start-practice="$emit('start-practice', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import HookFlowDiagram from '../HookFlowDiagram.vue';
import AdvancedFlowDiagram from '../AdvancedFlowDiagram.vue';
import CriticalConceptCallout from '../CriticalConceptCallout.vue';

interface Props {
  competencyData: Record<string, { level: number; masteryType: 'knowledge' | 'application' | 'analysis' | 'synthesis' }>;
}

defineProps<Props>();

defineEmits<{
  'show-in-flow': [hookId: string];
  'simulate-hook': [hookId: string];
  'node-selected': [nodeId: string];
  'view-example': [nodeId: string];
  'start-practice': [nodeId: string];
  'navigate-tab': [tabId: string];
}>();

const viewMode = ref<'basic' | 'advanced'>('basic');
</script>