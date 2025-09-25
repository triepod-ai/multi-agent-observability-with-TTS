<template>
  <div data-tab-content="guide">
    <div class="mb-2">
      <h2 class="text-base font-semibold text-white mb-1">Complete Hook Guide</h2>
      <p class="text-xs text-gray-400 mb-2">
        Detailed explanations of all 8 Claude Code hooks with examples, best practices, and common issues.
      </p>
    </div>
    
    <EducationalHookExplanations 
      @show-in-flow="$emit('show-in-flow', $event)" 
      @simulate-hook="$emit('simulate-hook', $event)"
      @topic-learned="$emit('topic-learned', $event)"
      @run-example="$emit('run-example', $event)"
      @open-docs="$emit('open-docs', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import EducationalHookExplanations from '../EducationalHookExplanations.vue';

defineEmits<{
  'show-in-flow': [hookId: string];
  'simulate-hook': [hookId: string];
  'topic-learned': [hookId: string];
  'run-example': [example: any];
  'open-docs': [url: string];
}>();
</script>