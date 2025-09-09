<template>
  <div data-tab-content="reference">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-white mb-2">Quick Reference Cards</h2>
      <p class="text-sm text-gray-400 mb-4">
        Scannable reference cards for all 8 Claude Code hooks. Search, filter, and click for quick access to hook information.
      </p>
    </div>

    <!-- Critical Concept: Hook Categories -->
    <CriticalConceptCallout
      title="Hook Categories: Understanding the System Architecture"
      severity="info"
      icon="📂"
      show-badge
      content="Hooks are organized into 4 categories: Essential (session lifecycle), Security (validation), Monitoring (tracking), and Advanced (analysis). Understanding these categories helps you implement the right hooks for your needs."
      :actions="[
        { label: 'View Flow', action: () => $emit('navigate-tab', 'flow'), primary: true },
        { label: 'See Examples', action: () => $emit('navigate-tab', 'examples') }
      ]"
    />
    
    <QuickReferenceCards 
      @hook-select="$emit('hook-select', $event)"
      @show-in-flow="$emit('show-in-flow', $event)"
    />
    
    <!-- Quick Action Summary -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
      <h3 class="text-sm font-semibold text-white mb-3 flex items-center">
        <span class="mr-2">⚡</span>
        Quick Actions
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          @click="$emit('navigate-tab', 'flow')"
          class="flex items-center justify-center px-3 py-2 bg-blue-900/30 border border-blue-600 text-blue-400 rounded-md text-xs hover:bg-blue-900/50 transition-colors"
        >
          <span class="mr-2">🔄</span>
          <span>View Hook Flow</span>
        </button>
        <button
          @click="$emit('navigate-tab', 'examples')"
          class="flex items-center justify-center px-3 py-2 bg-green-900/30 border border-green-600 text-green-400 rounded-md text-xs hover:bg-green-900/50 transition-colors"
        >
          <span class="mr-2">💻</span>
          <span>Copy Examples</span>
        </button>
        <button
          @click="$emit('navigate-tab', 'guide')"
          class="flex items-center justify-center px-3 py-2 bg-purple-900/30 border border-purple-600 text-purple-400 rounded-md text-xs hover:bg-purple-900/50 transition-colors"
        >
          <span class="mr-2">📚</span>
          <span>Read Full Guide</span>
        </button>
        <button
          @click="$emit('start-assessment', 'session_start')"
          class="flex items-center justify-center px-3 py-2 bg-yellow-900/30 border border-yellow-600 text-yellow-400 rounded-md text-xs hover:bg-yellow-900/50 transition-colors"
        >
          <span class="mr-2">🎯</span>
          <span>Take Assessment</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CriticalConceptCallout from '../CriticalConceptCallout.vue';
import QuickReferenceCards from '../QuickReferenceCards.vue';

defineEmits<{
  'hook-select': [hook: any];
  'show-in-flow': [hookId: string];
  'navigate-tab': [tabId: string];
  'start-assessment': [hookId: string];
}>();
</script>