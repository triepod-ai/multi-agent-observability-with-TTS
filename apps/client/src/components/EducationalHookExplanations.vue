<template>
  <div class="help-page bg-gray-900 text-gray-100 min-h-screen">
    <!-- Search Header -->
    <div class="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-10">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-white mb-2">Claude Code Hook System</h1>
          <p class="text-gray-400">Interactive reference for all 8 Claude Code hooks</p>
        </div>

        <!-- Search Bar -->
        <div class="relative max-w-2xl mx-auto">
          <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search hooks, examples, or use cases..."
            class="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="handleSearch"
          />
          <div v-if="searchQuery" class="absolute inset-y-0 right-0 flex items-center pr-4">
            <button
              @click="clearSearch"
              class="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Filter Tags -->
        <div v-if="searchQuery || selectedCategory" class="flex flex-wrap gap-2 mt-4 justify-center">
          <span v-if="searchQuery" class="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-600 text-blue-100">
            Search: {{ searchQuery }}
            <button @click="clearSearch" class="ml-2 hover:text-white">×</button>
          </span>
          <span v-if="selectedCategory" class="inline-flex items-center px-3 py-1 rounded-full text-xs bg-purple-600 text-purple-100">
            Category: {{ selectedCategory }}
            <button @click="selectedCategory = null" class="ml-2 hover:text-white">×</button>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <div class="text-2xl font-bold text-blue-400">{{ filteredHooks.length }}</div>
          <div class="text-gray-400 text-sm">Available Hooks</div>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <div class="text-2xl font-bold text-green-400">{{ totalExamples }}</div>
          <div class="text-gray-400 text-sm">Code Examples</div>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <div class="text-2xl font-bold text-purple-400">{{ categories.length }}</div>
          <div class="text-gray-400 text-sm">Categories</div>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <div class="text-2xl font-bold text-yellow-400">{{ selectedHook ? selectedHook.bestPractices.length : 0 }}</div>
          <div class="text-gray-400 text-sm">Best Practices</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Hook Cards Grid -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Category Filter -->
          <div class="flex flex-wrap gap-2 mb-6">
            <button
              @click="selectedCategory = null"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              ]"
            >
              All Hooks
            </button>
            <button
              v-for="category in categories"
              :key="category"
              @click="selectedCategory = category"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === category ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              ]"
            >
              {{ category }}
            </button>
          </div>

          <!-- Hook Cards -->
          <div class="grid gap-6">
            <div
              v-for="hook in filteredHooks"
              :key="hook.id"
              @click="selectHook(hook)"
              :class="[
                'cursor-pointer transition-all duration-200 rounded-lg border p-6',
                selectedHook?.id === hook.id
                  ? 'bg-blue-900/20 border-blue-500 shadow-lg'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-md'
              ]"
            >
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                    {{ hook.icon }}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-lg font-semibold text-white">{{ hook.name }}</h3>
                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                      #{{ hook.flowPosition }}
                    </span>
                  </div>
                  <p class="text-gray-300 text-sm mb-3">{{ hook.simpleDescription }}</p>
                  <div class="flex items-center space-x-4 text-xs text-gray-500">
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                      </svg>
                      {{ getHookCategory(hook) }}
                    </span>
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      {{ getExamplesForHook(hook.id).length }} examples
                    </span>
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                      </svg>
                      {{ hook.connections.length }} connections
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Results Message -->
          <div v-if="filteredHooks.length === 0" class="text-center py-12">
            <div class="text-gray-500 mb-4">
              <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-300 mb-2">No hooks found</h3>
            <p class="text-gray-500">Try adjusting your search or category filter.</p>
            <button
              @click="clearFilters"
              class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Detail Panel -->
        <div class="lg:col-span-1">
          <div class="sticky top-32">
            <div v-if="selectedHook" class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <!-- Header -->
              <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <div class="flex items-center space-x-3">
                  <div class="text-3xl">{{ selectedHook.icon }}</div>
                  <div>
                    <h2 class="text-xl font-bold text-white">{{ selectedHook.name }}</h2>
                    <p class="text-blue-100 text-sm">Hook #{{ selectedHook.flowPosition }}</p>
                  </div>
                </div>
              </div>

              <!-- Content -->
              <div class="p-6 space-y-6">
                <!-- Description -->
                <div>
                  <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                  <p class="text-gray-300 text-sm leading-relaxed">{{ selectedHook.detailedDescription }}</p>
                </div>

                <!-- When & Why -->
                <div class="grid grid-cols-1 gap-4">
                  <div class="bg-gray-900 rounded-lg p-4">
                    <h4 class="text-xs font-semibold text-green-400 mb-2 flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      When It Runs
                    </h4>
                    <p class="text-gray-300 text-xs">{{ selectedHook.whenItRuns }}</p>
                  </div>
                  <div class="bg-gray-900 rounded-lg p-4">
                    <h4 class="text-xs font-semibold text-yellow-400 mb-2 flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                      </svg>
                      Why It Matters
                    </h4>
                    <p class="text-gray-300 text-xs">{{ selectedHook.whyItMatters }}</p>
                  </div>
                </div>

                <!-- Real World Example -->
                <div>
                  <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Real World Example</h3>
                  <div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <p class="text-gray-300 text-xs italic">{{ selectedHook.realWorldExample }}</p>
                  </div>
                </div>

                <!-- Best Practices & Issues -->
                <div class="grid grid-cols-1 gap-4">
                  <div>
                    <h4 class="text-xs font-semibold text-green-400 mb-2 flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      Best Practices
                    </h4>
                    <ul class="space-y-1">
                      <li v-for="practice in selectedHook.bestPractices" :key="practice" class="text-xs text-gray-300 flex items-start">
                        <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">•</span>
                        <span>{{ practice }}</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 class="text-xs font-semibold text-red-400 mb-2 flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"/>
                      </svg>
                      Common Issues
                    </h4>
                    <ul class="space-y-1">
                      <li v-for="issue in selectedHook.commonIssues" :key="issue" class="text-xs text-gray-300 flex items-start">
                        <span class="text-red-400 mr-2 flex-shrink-0 mt-0.5">•</span>
                        <span>{{ issue }}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Code Examples -->
                <div v-if="getExamplesForHook(selectedHook.id).length > 0">
                  <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Code Examples</h3>
                  <div class="space-y-2">
                    <div
                      v-for="example in getExamplesForHook(selectedHook.id).slice(0, 2)"
                      :key="example.id"
                      class="bg-gray-900 rounded-lg p-3 border border-gray-700"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-medium text-cyan-400">{{ example.title }}</span>
                        <div class="flex items-center space-x-1">
                          <button
                            @click="runExample(example)"
                            class="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                          >
                            Run
                          </button>
                          <button
                            @click="copyCode(example.code)"
                            class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <p class="text-xs text-gray-400 mb-2">{{ example.description }}</p>
                      <div class="text-xs text-gray-500">
                        <span class="bg-gray-800 px-2 py-1 rounded">{{ example.language }}</span>
                        <span v-if="example.difficulty" class="ml-2 bg-gray-800 px-2 py-1 rounded">{{ example.difficulty }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex space-x-2 pt-4 border-t border-gray-700">
                  <button
                    @click="showInFlow(selectedHook.id)"
                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Show in Flow
                  </button>
                  <button
                    @click="simulateHook(selectedHook.id)"
                    class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Simulate
                  </button>
                </div>
              </div>
            </div>

            <!-- No Selection State -->
            <div v-else class="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
              <div class="text-gray-500 mb-4">
                <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-300 mb-2">Select a Hook</h3>
              <p class="text-gray-500 text-sm">Click on any hook card to view detailed information, code examples, and best practices.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEducationalMode } from '../composables/useEducationalMode'
import { getExamplesForHook } from '../data/hookExamples'
import type { HookExplanation } from '../types'
import type { CodeExample } from './InteractiveCodeExample.vue'

const { hookExplanations } = useEducationalMode()

const emit = defineEmits<{
  showInFlow: [hookId: string]
  simulateHook: [hookId: string]
  topicLearned: [hookId: string]
  runExample: [example: CodeExample]
  openDocs: [url: string]
}>()

// State
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const selectedHook = ref<HookExplanation | null>(null)

// Auto-select first hook on mount
onMounted(() => {
  if (hookExplanations.value.length > 0) {
    selectedHook.value = hookExplanations.value[0]
  }
})

// Categories
const categories = computed(() => {
  const categoryMap: Record<string, string> = {
    'session_start': 'Session',
    'user_prompt_submit': 'User Input',
    'pre_tool_use': 'Security',
    'post_tool_use': 'Monitoring',
    'subagent_stop': 'Agents',
    'stop': 'Session',
    'notification': 'System',
    'precompact': 'Optimization'
  }

  const uniqueCategories = new Set(
    hookExplanations.value.map(hook => categoryMap[hook.id] || 'Other')
  )

  return Array.from(uniqueCategories).sort()
})

// Computed
const filteredHooks = computed(() => {
  let hooks = hookExplanations.value

  // Filter by category
  if (selectedCategory.value) {
    hooks = hooks.filter(hook => getHookCategory(hook) === selectedCategory.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    hooks = hooks.filter(hook =>
      hook.name.toLowerCase().includes(query) ||
      hook.simpleDescription.toLowerCase().includes(query) ||
      hook.detailedDescription.toLowerCase().includes(query) ||
      hook.whenItRuns.toLowerCase().includes(query) ||
      hook.whyItMatters.toLowerCase().includes(query) ||
      hook.bestPractices.some(practice => practice.toLowerCase().includes(query)) ||
      hook.commonIssues.some(issue => issue.toLowerCase().includes(query))
    )
  }

  return hooks.sort((a, b) => a.flowPosition - b.flowPosition)
})

const totalExamples = computed(() => {
  return hookExplanations.value.reduce((total, hook) => {
    return total + getExamplesForHook(hook.id).length
  }, 0)
})

// Methods
const getHookCategory = (hook: HookExplanation): string => {
  const categoryMap: Record<string, string> = {
    'session_start': 'Session',
    'user_prompt_submit': 'User Input',
    'pre_tool_use': 'Security',
    'post_tool_use': 'Monitoring',
    'subagent_stop': 'Agents',
    'stop': 'Session',
    'notification': 'System',
    'precompact': 'Optimization'
  }

  return categoryMap[hook.id] || 'Other'
}

const selectHook = (hook: HookExplanation) => {
  selectedHook.value = hook
  emit('topicLearned', hook.id)
}

const handleSearch = () => {
  // Search is handled by computed property
}

const clearSearch = () => {
  searchQuery.value = ''
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = null
}

const showInFlow = (hookId: string) => {
  emit('showInFlow', hookId)
}

const simulateHook = (hookId: string) => {
  emit('simulateHook', hookId)
}

const runExample = (example: CodeExample) => {
  emit('runExample', example)
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    // You could add a toast notification here
    console.log('Code copied to clipboard')
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}
</script>

<style scoped>
.help-page {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Smooth scrolling for the sticky sidebar */
.sticky {
  transition: all 0.2s ease-in-out;
}

/* Custom scrollbar for better aesthetics */
.help-page ::-webkit-scrollbar {
  width: 6px;
}

.help-page ::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 3px;
}

.help-page ::-webkit-scrollbar-thumb {
  background: #6B7280;
  border-radius: 3px;
}

.help-page ::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

/* Hover animations */
.cursor-pointer {
  transition: transform 0.2s ease-in-out;
}

.cursor-pointer:hover {
  transform: translateY(-1px);
}

/* Search input focus state */
.focus\:ring-2:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>