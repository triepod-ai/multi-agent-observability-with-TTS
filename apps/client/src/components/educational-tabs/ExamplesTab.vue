<template>
  <div data-tab-content="examples">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-white mb-2">Interactive Code Examples</h2>
      <p class="text-sm text-gray-400 mb-4">
        Copy, run, and learn from production-quality hook implementations with real-world patterns.
      </p>
    </div>

    <!-- Example Categories -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Hook Examples -->
      <div>
        <h3 class="text-md font-semibold text-blue-400 mb-3 flex items-center">
          <span class="mr-2">🔧</span>
          Hook Examples by Type
        </h3>
        
        <div v-for="hookExampleSet in hookExampleSets" :key="hookExampleSet.hookId" class="mb-6">
          <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <span class="mr-2">{{ getHookIcon(hookExampleSet.hookId) }}</span>
            {{ hookExampleSet.hookName }}
          </h4>
          
          <div class="space-y-3">
            <InteractiveCodeExample
              v-for="example in hookExampleSet.examples"
              :key="example.id"
              :example="example"
              @run="$emit('run-example', $event)"
              @open-docs="$emit('open-docs', $event)"
            />
          </div>
        </div>
      </div>

      <!-- Configuration Examples -->
      <div>
        <h3 class="text-md font-semibold text-green-400 mb-3 flex items-center">
          <span class="mr-2">⚙️</span>
          Configuration Examples
        </h3>
        
        <div class="space-y-3">
          <InteractiveCodeExample
            v-for="configExample in configExamples"
            :key="configExample.id"
            :example="configExample"
            @run="$emit('run-example', $event)"
            @open-docs="$emit('open-docs', $event)"
          />
        </div>

        <!-- Quick Start Guide -->
        <div class="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
            <span class="mr-2">🚀</span>
            Quick Start Guide
          </h4>
          <div class="space-y-2 text-xs text-gray-300">
            <div class="flex items-start">
              <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">1.</span>
              <span>Copy a hook example and save it to <code class="bg-gray-700 px-1 rounded">.claude/hooks/</code></span>
            </div>
            <div class="flex items-start">
              <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">2.</span>
              <span>Update your <code class="bg-gray-700 px-1 rounded">.claude/settings.local.json</code> configuration</span>
            </div>
            <div class="flex items-start">
              <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">3.</span>
              <span>Make the script executable: <code class="bg-gray-700 px-1 rounded">chmod +x .claude/hooks/script.py</code></span>
            </div>
            <div class="flex items-start">
              <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">4.</span>
              <span>Test with Claude Code and watch the observability dashboard!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InteractiveCodeExample from '../InteractiveCodeExample.vue';
import { hookExamples, configurationExamples } from '../../data/hookExamples';
import { computed } from 'vue';

const hookExampleSets = computed(() => hookExamples);
const configExamples = computed(() => configurationExamples);

const getHookIcon = (hookId: string) => {
  const iconMap: Record<string, string> = {
    'pre_tool_use': '🛡️',
    'post_tool_use': '📝',
    'session_start': '🏗️',
    'user_prompt_submit': '📝',
    'subagent_start': '🤖',
    'subagent_stop': '🤖',
    'notification': '🔔',
    'precompact': '📄',
    'stop': '💾'
  };
  return iconMap[hookId] || '🔧';
};

defineEmits<{
  'run-example': [example: any];
  'open-docs': [url: string];
}>();
</script>