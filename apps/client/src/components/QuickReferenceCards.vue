<template>
  <div class="space-y-4">
    <!-- Search and Filter Controls -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Search -->
        <div class="lg:col-span-2">
          <label class="block text-xs font-medium text-gray-400 mb-2">
            🔍 Search Hooks
          </label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Type hook name, purpose, or use case..."
            class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        
        <!-- Category Filter -->
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-2">
            📂 Category Filter
          </label>
          <select
            v-model="selectedCategory"
            class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="essential">Essential Hooks</option>
            <option value="security">Security Hooks</option>
            <option value="monitoring">Monitoring Hooks</option>
            <option value="advanced">Advanced Hooks</option>
          </select>
        </div>
      </div>
      
      <!-- Results count -->
      <div v-if="searchQuery || selectedCategory" class="mt-3 text-xs text-gray-400">
        {{ filteredHooks.length }} hook{{ filteredHooks.length !== 1 ? 's' : '' }} found
      </div>
    </div>

    <!-- Quick Reference Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="hook in filteredHooks"
        :key="hook.name"
        class="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-all duration-200 cursor-pointer group relative"
        @click="handleHookClick(hook)"
        @mouseenter="handleHoverStart(hook)"
        @mouseleave="handleHoverEnd"
      >
        <!-- Category Badge -->
        <div class="absolute top-2 right-2">
          <span
            class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
            :class="getCategoryBadgeClass(hook.category)"
          >
            {{ getCategoryLabel(hook.category) }}
          </span>
        </div>

        <!-- Hook Header -->
        <div class="flex items-center mb-2">
          <span class="text-lg mr-2">{{ hook.emoji }}</span>
          <span class="text-white font-semibold text-sm">{{ hook.name }}</span>
        </div>

        <!-- Purpose -->
        <div class="text-xs text-gray-400 mb-2 leading-relaxed">
          {{ hook.purpose }}
        </div>

        <!-- Use Case -->
        <div class="text-xs text-blue-400 mb-2">
          <span class="font-medium">Use:</span> {{ hook.useCase }}
        </div>

        <!-- Timing & Complexity -->
        <div class="flex items-center justify-between text-xs">
          <div class="text-green-400">
            <span class="opacity-75">{{ hook.timing }}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span
              class="inline-flex items-center px-1 py-0.5 rounded text-xs"
              :class="getComplexityClass(hook.complexity)"
            >
              {{ hook.complexity }}
            </span>
            <span
              class="inline-flex items-center px-1 py-0.5 rounded text-xs"
              :class="getPayloadSizeClass(hook.payloadSize)"
            >
              {{ hook.payloadSize }}
            </span>
          </div>
        </div>

        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-gray-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg pointer-events-none"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredHooks.length === 0"
      class="text-center py-12 text-gray-400"
    >
      <div class="text-4xl mb-4">🔍</div>
      <div class="text-sm">No hooks found matching your search criteria</div>
      <button
        @click="clearFilters"
        class="mt-2 text-xs text-blue-400 hover:text-blue-300"
      >
        Clear filters
      </button>
    </div>

    <!-- Detailed Tooltip -->
    <Teleport to="body">
      <div
        v-if="hoveredHook && showTooltip"
        ref="tooltipEl"
        class="fixed z-50 bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-4 max-w-sm pointer-events-none"
        :style="tooltipStyles"
      >
        <div class="flex items-center mb-2">
          <span class="text-lg mr-2">{{ hoveredHook.emoji }}</span>
          <span class="text-white font-semibold">{{ hoveredHook.name }}</span>
        </div>
        
        <div class="space-y-2 text-xs">
          <div>
            <span class="text-gray-400">Purpose:</span>
            <span class="text-white ml-1">{{ hoveredHook.purpose }}</span>
          </div>
          
          <div>
            <span class="text-gray-400">Exit Codes:</span>
            <div class="mt-1 space-x-1">
              <span
                v-for="code in hoveredHook.exitCodes"
                :key="code"
                class="inline-block bg-gray-700 text-gray-300 px-1 py-0.5 rounded text-xs"
              >
                {{ code }}
              </span>
            </div>
          </div>
          
          <div v-if="hoveredHook.relatedHooks.length > 0">
            <span class="text-gray-400">Related Hooks:</span>
            <div class="mt-1">
              <span class="text-blue-400">{{ hoveredHook.relatedHooks.join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

interface HookReference {
  name: string;
  emoji: string;
  purpose: string;
  useCase: string;
  category: 'essential' | 'security' | 'monitoring' | 'advanced';
  timing: string;
  payloadSize: 'small' | 'medium' | 'large';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  exitCodes: string[];
  relatedHooks: string[];
}

// No props needed - component uses emits for communication

const emit = defineEmits<{
  hookSelect: [hook: HookReference];
  showInFlow: [hookName: string];
}>();

// State
const searchQuery = ref('');
const selectedCategory = ref('');
const hoveredHook = ref<HookReference | null>(null);
const showTooltip = ref(false);
const tooltipEl = ref<HTMLElement | null>(null);
const tooltipStyles = ref({});

// Hook reference data
const hookReferences: HookReference[] = [
  {
    name: 'SessionStart',
    emoji: '🚀',
    purpose: 'Session initialization and context loading',
    useCase: 'Project setup, context injection',
    category: 'essential',
    timing: 'Start of session',
    payloadSize: 'medium',
    complexity: 'beginner',
    exitCodes: ['0 (success)', '1 (setup failed)'],
    relatedHooks: ['Stop', 'UserPromptSubmit']
  },
  {
    name: 'UserPromptSubmit',
    emoji: '📝',
    purpose: 'Capture and log user prompts',
    useCase: 'Conversation tracking, analysis',
    category: 'monitoring',
    timing: 'Before AI response',
    payloadSize: 'small',
    complexity: 'beginner',
    exitCodes: ['0 (logged)', '1 (log failed)'],
    relatedHooks: ['SessionStart', 'PreToolUse']
  },
  {
    name: 'PreToolUse',
    emoji: '🛡️',
    purpose: 'Security validation before tool execution',
    useCase: 'Command filtering, safety checks',
    category: 'security',
    timing: 'Before each tool',
    payloadSize: 'medium',
    complexity: 'intermediate',
    exitCodes: ['0 (allow)', '1+ (block)'],
    relatedHooks: ['PostToolUse', 'UserPromptSubmit']
  },
  {
    name: 'PostToolUse',
    emoji: '📊',
    purpose: 'Tool result processing and analysis',
    useCase: 'Error detection, metrics collection',
    category: 'monitoring',
    timing: 'After each tool',
    payloadSize: 'large',
    complexity: 'intermediate',
    exitCodes: ['0 (success)', '1 (error detected)'],
    relatedHooks: ['PreToolUse', 'Notification']
  },
  {
    name: 'SubagentStart',
    emoji: '🤖',
    purpose: 'AI sub-agent initialization tracking',
    useCase: 'Agent monitoring, resource allocation',
    category: 'monitoring',
    timing: 'Agent creation',
    payloadSize: 'small',
    complexity: 'advanced',
    exitCodes: ['0 (started)', '1 (start failed)'],
    relatedHooks: ['SubagentStop', 'SessionStart']
  },
  {
    name: 'SubagentStop',
    emoji: '🔄',
    purpose: 'AI sub-agent completion and cleanup',
    useCase: 'Performance tracking, cleanup',
    category: 'monitoring',
    timing: 'Agent completion',
    payloadSize: 'medium',
    complexity: 'advanced',
    exitCodes: ['0 (completed)', '1 (error)'],
    relatedHooks: ['SubagentStart', 'Stop']
  },
  {
    name: 'Notification',
    emoji: '🔔',
    purpose: 'System-wide event notifications',
    useCase: 'Alerts, status updates, TTS',
    category: 'monitoring',
    timing: 'Event-driven',
    payloadSize: 'small',
    complexity: 'beginner',
    exitCodes: ['0 (sent)', '1 (failed)'],
    relatedHooks: ['PostToolUse', 'Stop']
  },
  {
    name: 'PreCompact',
    emoji: '📄',
    purpose: 'Session analysis and summarization',
    useCase: 'Context compression, insights',
    category: 'advanced',
    timing: 'Before context limit',
    payloadSize: 'large',
    complexity: 'advanced',
    exitCodes: ['0 (analyzed)', '1 (analysis failed)'],
    relatedHooks: ['SessionStart', 'Stop']
  },
  {
    name: 'Stop',
    emoji: '💾',
    purpose: 'Session cleanup and state persistence',
    useCase: 'Final processing, handoff creation',
    category: 'essential',
    timing: 'End of session',
    payloadSize: 'medium',
    complexity: 'beginner',
    exitCodes: ['0 (saved)', '1 (save failed)'],
    relatedHooks: ['SessionStart', 'PreCompact']
  }
];

// Computed properties
const filteredHooks = computed(() => {
  let filtered = hookReferences;

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(hook =>
      hook.name.toLowerCase().includes(query) ||
      hook.purpose.toLowerCase().includes(query) ||
      hook.useCase.toLowerCase().includes(query) ||
      hook.category.toLowerCase().includes(query)
    );
  }

  // Apply category filter
  if (selectedCategory.value) {
    filtered = filtered.filter(hook => hook.category === selectedCategory.value);
  }

  return filtered;
});

// Event handlers
const handleHookClick = (hook: HookReference) => {
  emit('hookSelect', hook);
  emit('showInFlow', hook.name.toLowerCase());
};

const handleHoverStart = async (hook: HookReference) => {
  hoveredHook.value = hook;
  showTooltip.value = true;
  
  await nextTick();
  updateTooltipPosition();
};

const handleHoverEnd = () => {
  showTooltip.value = false;
  hoveredHook.value = null;
};

const updateTooltipPosition = () => {
  // Simple positioning - could be enhanced with more sophisticated logic
  tooltipStyles.value = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = '';
};

// Utility functions
const getCategoryBadgeClass = (category: string) => {
  const classes = {
    essential: 'bg-green-900/30 text-green-400 border border-green-600',
    security: 'bg-red-900/30 text-red-400 border border-red-600',
    monitoring: 'bg-blue-900/30 text-blue-400 border border-blue-600',
    advanced: 'bg-purple-900/30 text-purple-400 border border-purple-600'
  };
  return classes[category as keyof typeof classes] || 'bg-gray-900/30 text-gray-400';
};

const getCategoryLabel = (category: string) => {
  const labels = {
    essential: 'Core',
    security: 'Security',
    monitoring: 'Monitor',
    advanced: 'Advanced'
  };
  return labels[category as keyof typeof labels] || category;
};

const getComplexityClass = (complexity: string) => {
  const classes = {
    beginner: 'bg-green-900/30 text-green-400',
    intermediate: 'bg-yellow-900/30 text-yellow-400',
    advanced: 'bg-red-900/30 text-red-400'
  };
  return classes[complexity as keyof typeof classes] || 'bg-gray-900/30 text-gray-400';
};

const getPayloadSizeClass = (size: string) => {
  const classes = {
    small: 'bg-green-900/30 text-green-400',
    medium: 'bg-yellow-900/30 text-yellow-400',
    large: 'bg-red-900/30 text-red-400'
  };
  return classes[size as keyof typeof classes] || 'bg-gray-900/30 text-gray-400';
};
</script>