<template>
  <div class="space-y-4">
    <div
      v-for="hook in hookExplanations"
      :key="hook.id"
      class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all duration-200"
    >
      <div class="flex items-center justify-between mb-3" @click="toggleExpanded(hook.id)">
        <div class="flex items-center cursor-pointer">
          <span class="text-xl mr-3">{{ hook.icon }}</span>
          <div>
            <h3 class="text-lg font-semibold text-white">{{ hook.name }}</h3>
            <p class="text-sm text-gray-400">{{ hook.simpleDescription }}</p>
          </div>
        </div>
        <button
          class="text-gray-400 hover:text-white transition-colors p-1"
          :class="{ 'rotate-180': expandedHooks.includes(hook.id) }"
        >
          <svg class="w-5 h-5 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- Expanded Content -->
      <Transition name="expand">
        <div v-if="expandedHooks.includes(hook.id)" class="space-y-4 border-t border-gray-700 pt-4">
          <!-- Detailed Description -->
          <div>
            <h4 class="text-sm font-medium text-blue-400 mb-2 flex items-center">
              <span class="mr-1">📋</span>
              Detailed Description
            </h4>
            <p class="text-sm text-gray-300 leading-relaxed">{{ hook.detailedDescription }}</p>
          </div>

          <!-- When it runs & Why it matters - Side by side -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="text-sm font-medium text-green-400 mb-2 flex items-center">
                <span class="mr-1">⏰</span>
                When It Runs
              </h4>
              <p class="text-sm text-gray-300">{{ hook.whenItRuns }}</p>
            </div>
            <div>
              <h4 class="text-sm font-medium text-yellow-400 mb-2 flex items-center">
                <span class="mr-1">💡</span>
                Why It Matters
              </h4>
              <p class="text-sm text-gray-300">{{ hook.whyItMatters }}</p>
            </div>
          </div>

          <!-- Real World Example -->
          <div>
            <h4 class="text-sm font-medium text-purple-400 mb-2 flex items-center">
              <span class="mr-1">🌟</span>
              Real World Example
            </h4>
            <div class="bg-gray-900 rounded-md p-3 border border-gray-600">
              <p class="text-sm text-gray-300 italic">{{ hook.realWorldExample }}</p>
            </div>
          </div>

          <!-- Code Example -->
          <div>
            <h4 class="text-sm font-medium text-cyan-400 mb-2 flex items-center">
              <span class="mr-1">💻</span>
              Code Example
              <button
                @click="copyToClipboard(hook.codeExample)"
                class="ml-2 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </h4>
            <pre class="bg-gray-900 rounded-md p-3 border border-gray-600 text-xs text-gray-300 overflow-x-auto"><code>{{ hook.codeExample }}</code></pre>
          </div>

          <!-- Best Practices & Common Issues - Side by side -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="text-sm font-medium text-green-400 mb-2 flex items-center">
                <span class="mr-1">✅</span>
                Best Practices
              </h4>
              <ul class="space-y-1">
                <li v-for="practice in hook.bestPractices" :key="practice" class="text-xs text-gray-300 flex items-start">
                  <span class="text-green-400 mr-2 flex-shrink-0">•</span>
                  <span>{{ practice }}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-sm font-medium text-red-400 mb-2 flex items-center">
                <span class="mr-1">⚠️</span>
                Common Issues
              </h4>
              <ul class="space-y-1">
                <li v-for="issue in hook.commonIssues" :key="issue" class="text-xs text-gray-300 flex items-start">
                  <span class="text-red-400 mr-2 flex-shrink-0">•</span>
                  <span>{{ issue }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center justify-between pt-2 border-t border-gray-700">
            <div class="flex items-center space-x-2 text-xs text-gray-400">
              <span>Hook #{hook.flowPosition}</span>
              <span>•</span>
              <span>{{ hook.connections.length }} connections</span>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="showInFlow(hook.id)"
                class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              >
                Show in Flow
              </button>
              <button
                @click="simulateHook(hook.id)"
                class="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
              >
                Simulate
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useEducationalMode } from '../composables/useEducationalMode';

const { hookExplanations } = useEducationalMode();

const expandedHooks = ref<string[]>([]);

const emit = defineEmits<{
  showInFlow: [hookId: string];
  simulateHook: [hookId: string];
  topicLearned: [hookId: string];
}>();

const toggleExpanded = (hookId: string) => {
  const index = expandedHooks.value.indexOf(hookId);
  if (index > -1) {
    expandedHooks.value.splice(index, 1);
  } else {
    expandedHooks.value.push(hookId);
    // Mark as learned when expanded for the first time
    emit('topicLearned', hookId);
  }
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // Could add a toast notification here
    console.log('Copied to clipboard');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

const showInFlow = (hookId: string) => {
  emit('showInFlow', hookId);
};

const simulateHook = (hookId: string) => {
  emit('simulateHook', hookId);
  // Could trigger a simulation or demo of the hook
  console.log('Simulating hook:', hookId);
};
</script>

<style scoped>
.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
}

.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 1000px;
  padding-top: 1rem;
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>