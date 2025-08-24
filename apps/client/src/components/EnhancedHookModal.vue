<template>
  <div v-if="isOpen" class="enhanced-hook-modal-overlay" @click="closeModal">
    <div class="enhanced-hook-modal" @click.stop>
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="hook-identity">
          <span class="hook-icon text-2xl">{{ hook?.icon }}</span>
          <div class="hook-info">
            <h2 class="text-xl font-bold text-white">{{ hook?.displayName }} Hook</h2>
            <p class="text-sm text-gray-400">{{ hook?.type }}</p>
          </div>
          <div class="status-badges">
            <span :class="getStatusBadgeClass(hook?.status)" class="status-badge">
              {{ hook?.status?.toUpperCase() }}
            </span>
            <span v-if="hook?.successRate !== undefined" class="success-badge">
              {{ hook.successRate }}% Success
            </span>
          </div>
        </div>
        <button @click="closeModal" class="close-btn">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Modal Tabs -->
      <div class="modal-tabs">
        <button 
          v-for="tab in availableTabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ 
            active: activeTab === tab.id,
            disabled: tab.disabled 
          }"
          class="tab-button"
          :disabled="tab.disabled"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="tab-panel">
          <ContextualOverview 
            :hook="hook" 
            :context="context"
            :loading="contextLoading" 
          />
        </div>
        
        <!-- Recent Activity Tab -->
        <div v-if="activeTab === 'activity'" class="tab-panel">
          <RecentActivityView 
            :hook="hook" 
            :events="recentEvents"
            :loading="eventsLoading"
          />
        </div>
        
        <!-- Performance Tab -->
        <div v-if="activeTab === 'performance'" class="tab-panel">
          <PerformanceMetrics 
            :hook="hook" 
            :metrics="performanceMetrics"
            :loading="metricsLoading"
          />
        </div>
        
        <!-- Context Tab -->
        <div v-if="activeTab === 'context'" class="tab-panel">
          <ExecutionContext 
            :hook="hook" 
            :context="executionContext"
            :loading="contextLoading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { HookStatus } from '../types';
import ContextualOverview from './modal/ContextualOverview.vue';
import RecentActivityView from './modal/RecentActivityView.vue';
import PerformanceMetrics from './modal/PerformanceMetrics.vue';
import ExecutionContext from './modal/ExecutionContext.vue';

interface Props {
  hook: HookStatus | null;
  isOpen: boolean;
}

interface EnhancedHookContext {
  sourceApps: string[];
  activeSessions: string[];
  sessionDepthRange: { min: number; max: number };
  totalExecutions: number;
  avgDuration: number;
  medianDuration: number;
  p95Duration: number;
  totalTokens: number;
  avgTokensPerExecution: number;
  totalCost: number;
  toolUsage: Array<{
    name: string;
    count: number;
    successRate: number;
    commonParams: string[];
    avgDuration: number;
  }>;
  agentActivity: Array<{
    id: string;
    name: string;
    type: string;
    executions: number;
    avgDuration: number;
    totalTokens: number;
  }>;
  patterns: Array<{
    id: string;
    icon: string;
    description: string;
    frequency: string;
  }>;
  recentErrors: Array<{
    id: string;
    timestamp: number;
    source: string;
    message: string;
  }>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

// Tab management
const activeTab = ref('overview');
const availableTabs = computed(() => [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    disabled: false
  },
  {
    id: 'activity',
    label: 'Recent Activity',
    icon: '⏱️',
    count: recentEvents.value?.length || 0,
    disabled: false
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: '⚡',
    disabled: !performanceMetrics.value
  },
  {
    id: 'context',
    label: 'Execution Context',
    icon: '🔍',
    disabled: !executionContext.value
  }
]);

// Data state
const context = ref<EnhancedHookContext | null>(null);
const recentEvents = ref<any[]>([]);
const performanceMetrics = ref<any>(null);
const executionContext = ref<any>(null);

// Loading states
const contextLoading = ref(false);
const eventsLoading = ref(false);
const metricsLoading = ref(false);

// Watch for hook changes and fetch data
watch(() => props.hook, async (newHook) => {
  if (newHook && props.isOpen) {
    await fetchHookData(newHook);
  }
}, { immediate: true });

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.hook) {
    await fetchHookData(props.hook);
    activeTab.value = 'overview';
  }
});

// Data fetching functions
async function fetchHookData(hook: HookStatus) {
  await Promise.all([
    fetchHookContext(hook),
    fetchRecentEvents(hook),
    fetchPerformanceMetrics(hook),
    fetchExecutionContext(hook)
  ]);
}

async function fetchHookContext(hook: HookStatus) {
  contextLoading.value = true;
  try {
    const response = await fetch(`/api/hooks/${hook.type}/context`);
    if (response.ok) {
      context.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch hook context:', error);
  } finally {
    contextLoading.value = false;
  }
}

async function fetchRecentEvents(hook: HookStatus) {
  eventsLoading.value = true;
  try {
    const response = await fetch(`/api/hooks/${hook.type}/events?limit=50`);
    if (response.ok) {
      recentEvents.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch recent events:', error);
  } finally {
    eventsLoading.value = false;
  }
}

async function fetchPerformanceMetrics(hook: HookStatus) {
  metricsLoading.value = true;
  try {
    const response = await fetch(`/api/hooks/${hook.type}/metrics`);
    if (response.ok) {
      performanceMetrics.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error);
  } finally {
    metricsLoading.value = false;
  }
}

async function fetchExecutionContext(hook: HookStatus) {
  try {
    const response = await fetch(`/api/hooks/${hook.type}/execution-context`);
    if (response.ok) {
      executionContext.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch execution context:', error);
  }
}

// Styling helpers
function getStatusBadgeClass(status: string | undefined) {
  switch (status) {
    case 'active':
      return 'bg-green-600 text-green-100';
    case 'error':
      return 'bg-red-600 text-red-100';
    default:
      return 'bg-gray-600 text-gray-100';
  }
}

// Event handlers
function closeModal() {
  emit('close');
}
</script>

<style scoped>
.enhanced-hook-modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4;
}

.enhanced-hook-modal {
  @apply bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-full overflow-hidden flex flex-col;
  min-height: 600px;
}

/* Modal Header */
.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-700;
}

.hook-identity {
  @apply flex items-center space-x-4 flex-1;
}

.hook-info {
  @apply flex-1 min-w-0;
}

.status-badges {
  @apply flex items-center space-x-2;
}

.status-badge {
  @apply px-3 py-1 rounded-full text-xs font-medium;
}

.success-badge {
  @apply px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-blue-100;
}

.close-btn {
  @apply p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors;
}

/* Modal Tabs */
.modal-tabs {
  @apply flex border-b border-gray-700 px-6 overflow-x-auto;
}

.tab-button {
  @apply flex items-center space-x-2 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-600 transition-colors whitespace-nowrap;
}

.tab-button.active {
  @apply text-white border-blue-500;
}

.tab-button.disabled {
  @apply text-gray-600 cursor-not-allowed;
}

.tab-count {
  @apply bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full;
}

/* Tab Content */
.tab-content {
  @apply flex-1 overflow-auto;
}

.tab-panel {
  @apply p-6 h-full;
}

/* Responsive Design */
@media (max-width: 768px) {
  .enhanced-hook-modal {
    @apply max-w-none w-full h-full rounded-none;
  }
  
  .modal-header {
    @apply p-4 flex-wrap;
  }
  
  .hook-identity {
    @apply w-full mb-2;
  }
  
  .status-badges {
    @apply w-full justify-start;
  }
  
  .modal-tabs {
    @apply px-4;
  }
  
  .tab-button {
    @apply px-3 py-2;
  }
  
  .tab-content {
    @apply p-4;
  }
}
</style>