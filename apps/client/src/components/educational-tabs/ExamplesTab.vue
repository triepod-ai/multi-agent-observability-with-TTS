<template>
  <div data-tab-content="examples">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-white mb-2">Interactive Code Examples</h2>
      <p class="text-sm text-gray-400 mb-4">
        Copy, run, and learn from production-quality hook implementations with real-world patterns.
      </p>
    </div>

    <!-- Quick Start Guide - MOVED TO TOP -->
    <div class="mb-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-5 shadow-lg">
      <h3 class="text-base font-semibold text-white mb-4 flex items-center">
        <span class="mr-2 text-xl">🚀</span>
        Quick Start Guide
      </h3>
      <div class="space-y-2.5 text-sm text-gray-300">
        <div class="flex items-start">
          <span class="text-green-400 mr-3 flex-shrink-0 mt-0.5 font-bold">1.</span>
          <span>Copy a hook example and save it to <code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">.claude/hooks/</code></span>
        </div>
        <div class="flex items-start">
          <span class="text-green-400 mr-3 flex-shrink-0 mt-0.5 font-bold">2.</span>
          <span>Update <code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">.claude/settings.json</code> with <strong>absolute paths</strong> and <code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">uv run</code> wrapper</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-400 mr-3 flex-shrink-0 mt-0.5 font-bold">3.</span>
          <span>Make the script executable: <code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">chmod +x .claude/hooks/script.py</code></span>
        </div>
        <div class="flex items-start">
          <span class="text-green-400 mr-3 flex-shrink-0 mt-0.5 font-bold">4.</span>
          <span>Test with Claude Code and watch the observability dashboard!</span>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-blue-700/30 text-xs text-yellow-300 bg-yellow-900/10 rounded p-3">
        <strong>⚠️ Important:</strong> Use absolute paths (e.g., <code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">/home/user/project/.claude/hooks/script.py</code>) to prevent "No such file or directory" errors.
      </div>
    </div>

    <!-- Hook Examples by Type - VERTICAL STACKED -->
    <div class="mb-6">
      <h3 class="text-md font-semibold text-blue-400 mb-4 flex items-center">
        <span class="mr-2">🔧</span>
        Hook Examples by Type
      </h3>

      <div class="space-y-3">
        <ExpandableSection
          v-for="hookExampleSet in hookExampleSets"
          :key="hookExampleSet.hookId"
          :title="hookExampleSet.hookName"
          :icon="getHookIcon(hookExampleSet.hookId)"
          :badge="`${hookExampleSet.examples.length} example${hookExampleSet.examples.length > 1 ? 's' : ''}`"
          :defaultExpanded="false"
          variant="bordered"
          size="md"
        >
          <div class="space-y-3 mt-2">
            <InteractiveCodeExample
              v-for="example in hookExampleSet.examples"
              :key="example.id"
              :example="example"
              @run="$emit('run-example', $event)"
              @open-docs="$emit('open-docs', $event)"
            />
          </div>
        </ExpandableSection>
      </div>
    </div>

    <!-- Configuration Examples - VERTICAL STACKED -->
    <div>
      <h3 class="text-md font-semibold text-green-400 mb-4 flex items-center">
        <span class="mr-2">⚙️</span>
        Configuration Examples
      </h3>

      <div class="space-y-3">
        <ExpandableSection
          v-for="configExample in configExamples"
          :key="configExample.id"
          :title="configExample.title"
          :subtitle="configExample.description"
          icon="⚙️"
          :defaultExpanded="false"
          variant="bordered"
          size="md"
        >
          <div class="mt-2">
            <InteractiveCodeExample
              :example="configExample"
              @run="$emit('run-example', $event)"
              @open-docs="$emit('open-docs', $event)"
            />
          </div>
        </ExpandableSection>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InteractiveCodeExample from '../InteractiveCodeExample.vue';
import ExpandableSection from '../ExpandableSection.vue';
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
    'stop': '💾',
    'session_end': '🚪'
  };
  return iconMap[hookId] || '🔧';
};

defineEmits<{
  'run-example': [example: any];
  'open-docs': [url: string];
}>();
</script>