<template>
  <div data-tab-content="scenarios">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-white mb-2">Real-World Scenarios</h2>
      <p class="text-sm text-gray-400 mb-4">
        See how hooks work together in common development scenarios.
      </p>
    </div>

    <!-- Critical Concept: Security Validation -->
    <CriticalConceptCallout
      title="Security Validation: PreToolUse Guards Your System"
      severity="warning"
      icon="🛡️"
      show-badge
    >
      <p class="mb-2">
        <strong>PreToolUse hooks act as security gates</strong> - they can block dangerous commands before execution. 
        If a PreToolUse hook returns a non-zero exit code, the tool execution is <em>completely prevented</em>.
      </p>
      <p class="text-xs opacity-90">
        Example: A PreToolUse hook detecting "rm -rf /" would block the command and save your system.
      </p>
    </CriticalConceptCallout>
    
    <div class="space-y-4">
      <div
        v-for="scenario in scenarios"
        :key="scenario.id"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-sm font-semibold text-white flex items-center">
              <span class="mr-2">{{ scenario.icon }}</span>
              {{ scenario.title }}
            </h3>
            <p class="text-xs text-gray-400 mt-1">{{ scenario.description }}</p>
          </div>
          <button
            @click="$emit('play-scenario', scenario.id)"
            class="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
          >
            Play Scenario
          </button>
        </div>
        
        <div class="space-y-2">
          <div class="text-xs font-medium text-blue-400">Hook Sequence:</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="hookId in scenario.hookSequence"
              :key="hookId"
              class="inline-flex items-center px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded border"
            >
              {{ getHookName(hookId) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CriticalConceptCallout from '../CriticalConceptCallout.vue';

interface Scenario {
  id: string;
  title: string;
  icon: string;
  description: string;
  hookSequence: string[];
}

interface Props {
  scenarios: Scenario[];
  getHookName: (hookId: string) => string;
}

defineProps<Props>();

defineEmits<{
  'play-scenario': [scenarioId: string];
}>();
</script>