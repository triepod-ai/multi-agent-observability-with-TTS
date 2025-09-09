<template>
  <div data-tab-content="glossary">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-white mb-2">Hook System Glossary</h2>
      <p class="text-sm text-gray-400 mb-4">
        Key terms and concepts in the Claude Code hook system.
      </p>
    </div>

    <!-- Critical Concept: Exit Code Significance -->
    <CriticalConceptCallout
      title="Exit Codes Control Everything"
      severity="info"
      icon="🔢"
      show-badge
    >
      <p class="mb-2">
        <strong>Exit Code 0 = Success, Non-zero = Failure/Block</strong>
      </p>
      <ul class="text-xs space-y-1 opacity-90">
        <li>• <code class="bg-gray-800 px-1 rounded">exit 0</code> - Hook succeeded, continue normal flow</li>
        <li>• <code class="bg-gray-800 px-1 rounded">exit 1</code> - Hook failed or wants to block action</li>
        <li>• PreToolUse non-zero exit = Tool execution blocked</li>
        <li>• PostToolUse non-zero exit = Error detected in tool result</li>
      </ul>
    </CriticalConceptCallout>
    
    <div class="space-y-3">
      <div
        v-for="term in glossaryTerms"
        :key="term.term"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4"
      >
        <h3 class="text-sm font-semibold text-white mb-2">{{ term.term }}</h3>
        <p class="text-xs text-gray-300">{{ term.definition }}</p>
        <div v-if="term.example" class="mt-2">
          <div class="text-xs font-medium text-blue-400 mb-1">Example:</div>
          <div class="text-xs text-gray-400 italic">{{ term.example }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CriticalConceptCallout from '../CriticalConceptCallout.vue';

interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
}

interface Props {
  glossaryTerms: GlossaryTerm[];
}

defineProps<Props>();
</script>