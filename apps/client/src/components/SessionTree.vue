<template>
  <div class="h-full bg-gray-950 flex flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 p-4 border-b border-gray-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">Session Tree</h2>
            <p class="text-sm text-gray-400">Hierarchical view of session relationships</p>
          </div>
        </div>
        
        <!-- Controls -->
        <div class="flex items-center space-x-2">
          <!-- Stats -->
          <div v-if="sessionRelationships.treeStats.value.totalNodes > 0" class="flex items-center space-x-4 text-xs text-gray-400 mr-4">
            <span>{{ sessionRelationships.treeStats.value.totalNodes }} total</span>
            <span>{{ sessionRelationships.treeStats.value.visibleNodes }} visible</span>
            <span>{{ sessionRelationships.treeStats.value.maxDepth }} depth</span>
          </div>
          
          <!-- Session ID Input -->
          <div class="flex items-center space-x-2">
            <input
              v-model="sessionId"
              @keyup.enter="loadTree"
              placeholder="Enter session ID..."
              class="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-48"
            />
            <button
              @click="loadTree"
              :disabled="!sessionId.trim() || sessionRelationships.loading.value"
              class="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors flex items-center space-x-2"
            >
              <svg v-if="!sessionRelationships.loading.value" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ sessionRelationships.loading.value ? 'Loading...' : 'Load' }}</span>
            </button>
          </div>

          <!-- Tree Controls -->
          <div v-if="sessionRelationships.sessionTree.value" class="flex items-center space-x-1">
            <button
              @click="sessionRelationships.expandAll()"
              class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Expand All"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              @click="sessionRelationships.collapseAll()"
              class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Collapse All"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6" />
              </svg>
            </button>
            <button
              @click="refreshTree"
              :disabled="sessionRelationships.loading.value"
              class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <svg 
                class="w-4 h-4"
                :class="{ 'animate-spin': sessionRelationships.loading.value }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div v-if="sessionRelationships.sessionTree.value" class="flex-shrink-0 p-4 bg-gray-900/50 border-b border-gray-800">
      <div class="flex items-center space-x-4">
        <!-- Search -->
        <div class="flex-1">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              placeholder="Search sessions, agents, or reasons..."
              class="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Filter by Status -->
        <div class="flex items-center space-x-2">
          <label class="text-sm text-gray-400">Status:</label>
          <select
            v-model="statusFilter"
            class="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="timeout">Timeout</option>
          </select>
        </div>

        <!-- Filter by Type -->
        <div class="flex items-center space-x-2">
          <label class="text-sm text-gray-400">Type:</label>
          <select
            v-model="typeFilter"
            class="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All</option>
            <option value="main">Main</option>
            <option value="subagent">Subagent</option>
            <option value="wave">Wave</option>
            <option value="continuation">Continuation</option>
          </select>
        </div>

        <!-- Clear Filters -->
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-3 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="sessionRelationships.error.value" class="flex-shrink-0 p-4">
      <div class="bg-red-900/50 border border-red-500/50 rounded-lg p-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 class="text-red-300 font-medium">Error</h4>
            <p class="text-red-200 text-sm">{{ sessionRelationships.error.value }}</p>
          </div>
        </div>
        <button
          @click="sessionRelationships.error.value = null"
          class="text-red-400 hover:text-red-300 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Success Messages -->
    <div v-if="successMessage" class="flex-shrink-0 p-4">
      <div class="bg-green-900/50 border border-green-500/50 rounded-lg p-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h4 class="text-green-300 font-medium">Success</h4>
            <p class="text-green-200 text-sm">{{ successMessage }}</p>
          </div>
        </div>
        <button
          @click="successMessage = null"
          class="text-green-400 hover:text-green-300 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tree Content -->
    <div class="flex-1 overflow-auto p-4">
      <!-- Loading State -->
      <div v-if="sessionRelationships.loading.value && !sessionRelationships.sessionTree.value" class="flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-300">Loading session tree...</h3>
          <p class="mt-2 text-sm text-gray-400">Fetching session relationships and hierarchy</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!sessionRelationships.sessionTree.value" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="text-6xl mb-4">🌳</div>
          <h3 class="text-lg font-medium text-gray-300 mb-2">No Session Tree Loaded</h3>
          <p class="text-sm text-gray-400 mb-6">Enter a session ID above to view its relationship hierarchy</p>
          
          <!-- Example Session IDs (if available) -->
          <div v-if="recentSessionIds.length > 0" class="space-y-2">
            <p class="text-xs text-gray-500">Recent sessions:</p>
            <div class="flex flex-wrap justify-center gap-2">
              <button
                v-for="recentId in recentSessionIds.slice(0, 3)"
                :key="recentId"
                @click="loadRecentSession(recentId)"
                class="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 font-mono transition-colors"
              >
                {{ recentId.slice(0, 16) }}...
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tree View -->
      <div v-else-if="filteredTree" class="space-y-1">
        <!-- Root Node -->
        <SessionTreeNode
          :node="filteredTree"
          @expand="sessionRelationships.toggleNodeExpansion"
          @navigate="handleNavigate"
          @copy="handleCopy"
        />
        
        <!-- Performance Stats -->
        <div v-if="showPerformanceStats && sessionRelationships.treeStats.value.totalNodes > 50" class="mt-8 p-4 bg-gray-800/30 rounded-lg">
          <h4 class="text-sm font-medium text-white mb-2">Performance</h4>
          <div class="grid grid-cols-3 gap-4 text-xs text-gray-400">
            <div>
              <div class="text-white font-medium">{{ sessionRelationships.treeStats.value.totalNodes }}</div>
              <div>Total Nodes</div>
            </div>
            <div>
              <div class="text-white font-medium">{{ sessionRelationships.treeStats.value.visibleNodes }}</div>
              <div>Visible Nodes</div>
            </div>
            <div>
              <div class="text-white font-medium">{{ renderTime }}ms</div>
              <div>Render Time</div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-else-if="hasActiveFilters" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="text-4xl mb-4">🔍</div>
          <h3 class="text-lg font-medium text-gray-300 mb-2">No Results Found</h3>
          <p class="text-sm text-gray-400 mb-4">No sessions match your current filters</p>
          <button
            @click="clearFilters"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Connection Status -->
    <div class="flex-shrink-0 p-4 border-t border-gray-800">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center space-x-2 text-gray-500">
          <span>Last updated: {{ formatLastUpdate() }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <div 
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'"
          ></div>
          <span class="text-gray-400">{{ isConnected ? 'Live' : 'Disconnected' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSessionRelationships } from '../composables/useSessionRelationships';
import SessionTreeNode from './SessionTreeNode.vue';
import type { SessionTreeNode as SessionTreeNodeType } from '../types';

// Props
interface Props {
  initialSessionId?: string;
  recentSessionIds?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  recentSessionIds: () => []
});

// Emits
const emit = defineEmits<{
  'session-select': [sessionId: string];
  'session-navigate': [sessionId: string];
}>();

// Composables
const sessionRelationships = useSessionRelationships();

// Component state
const sessionId = ref(props.initialSessionId || '');
const searchQuery = ref('');
const statusFilter = ref('');
const typeFilter = ref('');
const successMessage = ref<string | null>(null);
const showPerformanceStats = ref(false);
const renderTime = ref(0);
const lastUpdate = ref(Date.now());
const isConnected = ref(true);

// Computed properties
const hasActiveFilters = computed(() => {
  return searchQuery.value || statusFilter.value || typeFilter.value;
});

const filteredTree = computed((): SessionTreeNodeType | null => {
  if (!sessionRelationships.sessionTree.value) return null;
  
  const startTime = performance.now();
  const filtered = filterTreeNode(sessionRelationships.sessionTree.value);
  renderTime.value = Math.round(performance.now() - startTime);
  
  return filtered;
});

// Filter tree nodes recursively
function filterTreeNode(node: SessionTreeNodeType): SessionTreeNodeType | null {
  // Check if this node matches filters
  const matchesSearch = !searchQuery.value || 
    node.session_id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (node.agent_name && node.agent_name.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
    (node.spawn_reason && node.spawn_reason.toLowerCase().includes(searchQuery.value.toLowerCase()));
  
  const matchesStatus = !statusFilter.value || node.status === statusFilter.value;
  const matchesType = !typeFilter.value || node.session_type === typeFilter.value;
  
  // Filter children recursively
  const filteredChildren = node.children
    .map(child => filterTreeNode(child))
    .filter(child => child !== null) as SessionTreeNodeType[];
  
  // Include node if it matches filters OR has matching children
  const shouldInclude = (matchesSearch && matchesStatus && matchesType) || filteredChildren.length > 0;
  
  if (!shouldInclude) return null;
  
  return {
    ...node,
    children: filteredChildren,
    expanded: filteredChildren.length > 0 || node.expanded // Auto-expand if has matching children
  };
}

// Methods
async function loadTree(): Promise<void> {
  if (!sessionId.value.trim()) return;
  
  try {
    await sessionRelationships.fetchSessionTree(sessionId.value.trim());
    lastUpdate.value = Date.now();
    
    if (sessionRelationships.sessionTree.value) {
      successMessage.value = `Loaded session tree for ${sessionId.value}`;
      setTimeout(() => successMessage.value = null, 3000);
      
      // Enable performance stats for large trees
      showPerformanceStats.value = sessionRelationships.treeStats.value.totalNodes > 20;
    }
  } catch (error) {
    console.error('Failed to load session tree:', error);
  }
}

async function refreshTree(): Promise<void> {
  if (!sessionId.value.trim() || !sessionRelationships.sessionTree.value) return;
  await loadTree();
}

function loadRecentSession(recentId: string): void {
  sessionId.value = recentId;
  loadTree();
}

function clearFilters(): void {
  searchQuery.value = '';
  statusFilter.value = '';
  typeFilter.value = '';
}

function handleNavigate(selectedSessionId: string): void {
  emit('session-navigate', selectedSessionId);
  emit('session-select', selectedSessionId);
}

function handleCopy(copiedSessionId: string): void {
  successMessage.value = `Copied session ID: ${copiedSessionId.slice(0, 16)}...`;
  setTimeout(() => successMessage.value = null, 2000);
}

function formatLastUpdate(): string {
  const now = Date.now();
  const diff = now - lastUpdate.value;
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  
  return new Date(lastUpdate.value).toLocaleTimeString();
}

// Watch for prop changes
watch(() => props.initialSessionId, (newId) => {
  if (newId && newId !== sessionId.value) {
    sessionId.value = newId;
    loadTree();
  }
});

// Mock connection status (replace with actual WebSocket status)
let connectionInterval: number | null = null;

onMounted(() => {
  // Load tree if initial session ID provided
  if (props.initialSessionId) {
    loadTree();
  }
  
  // Simulate connection status updates
  connectionInterval = window.setInterval(() => {
    isConnected.value = Math.random() > 0.1; // 90% connected
  }, 5000);
});

onUnmounted(() => {
  if (connectionInterval) {
    clearInterval(connectionInterval);
  }
});
</script>

<style scoped>
/* Custom scrollbar */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.3);
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: rgba(107, 114, 128, 0.5);
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 0.7);
}

/* Smooth transitions */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Pulse animation for connection indicator */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>