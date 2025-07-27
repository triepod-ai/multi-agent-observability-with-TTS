<template>
  <div class="w-full bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-primary)] shadow-md">
    <div class="p-4">
      <!-- Search Bar -->
      <div class="mb-4">
        <div class="relative">
          <svg 
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--theme-text-tertiary)]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search events, apps, sessions, tools..."
            class="w-full pl-10 pr-4 py-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] transition-all duration-200"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Active Filters Display -->
      <div v-if="hasActiveFilters" class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-[var(--theme-text-secondary)]">Active Filters</h3>
          <button
            @click="clearAllFilters"
            class="text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
          >
            Clear all
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <TransitionGroup name="filter-chip">
            <div
              v-for="filter in activeFilterChips"
              :key="filter.id"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30 hover:border-[var(--theme-primary)] transition-all duration-200"
            >
              <span class="mr-1">{{ filter.icon }}</span>
              <span>{{ filter.label }}</span>
              <button
                @click="removeFilter(filter)"
                class="ml-2 hover:text-[var(--theme-primary-dark)] transition-colors"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Sorting Controls -->
      <div class="mb-4 pb-4 border-b border-[var(--theme-border-primary)]">
        <h3 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-3 flex items-center">
          <span class="mr-1">📊</span>
          Sort Options
        </h3>
        <div class="flex flex-wrap gap-4">
          <!-- Sort By -->
          <div class="flex items-center space-x-2">
            <label class="text-sm text-[var(--theme-text-secondary)]">Sort by:</label>
            <select
              :value="sortBy || 'timestamp'"
              @change="updateSortBy(($event.target as HTMLSelectElement).value)"
              class="px-3 py-1.5 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-lg text-sm text-[var(--theme-text-primary)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition-all duration-200"
            >
              <option value="timestamp">Date</option>
              <option value="source_app">Application</option>
              <option value="event_type">Event Type</option>
              <option value="name">Name</option>
            </select>
          </div>
          
          <!-- Sort Order -->
          <div class="flex items-center space-x-2">
            <label class="text-sm text-[var(--theme-text-secondary)]">Order:</label>
            <div class="flex rounded-lg overflow-hidden border border-[var(--theme-border-primary)]">
              <button
                @click="updateSortOrder('desc')"
                :class="[
                  'px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  (sortOrder || 'desc') === 'desc' 
                    ? 'bg-[var(--theme-primary)] text-white' 
                    : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-quaternary)]'
                ]"
              >
                <span class="mr-1">↓</span>
                Latest First
              </button>
              <button
                @click="updateSortOrder('asc')"
                :class="[
                  'px-3 py-1.5 text-sm font-medium transition-all duration-200 border-l border-[var(--theme-border-primary)]',
                  (sortOrder || 'desc') === 'asc' 
                    ? 'bg-[var(--theme-primary)] text-white' 
                    : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-quaternary)]'
                ]"
              >
                <span class="mr-1">↑</span>
                Oldest First
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Categories -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Apps Filter -->
        <div>
          <h3 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-2 flex items-center">
            <span class="mr-1">📱</span>
            Applications
          </h3>
          <div class="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            <label
              v-for="app in availableApps"
              :key="app.name"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] cursor-pointer transition-colors"
            >
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :checked="selectedApps.includes(app.name)"
                  @change="toggleApp(app.name)"
                  class="w-4 h-4 text-[var(--theme-primary)] bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-primary)] rounded focus:ring-[var(--theme-primary)] focus:ring-offset-0"
                />
                <span class="text-sm text-[var(--theme-text-primary)]">{{ app.name }}</span>
              </div>
              <span class="text-xs text-[var(--theme-text-tertiary)] bg-[var(--theme-bg-quaternary)] px-2 py-0.5 rounded-full">
                {{ app.count }}
              </span>
            </label>
          </div>
        </div>

        <!-- Event Types Filter -->
        <div>
          <h3 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-2 flex items-center">
            <span class="mr-1">🎯</span>
            Event Types
          </h3>
          <div class="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            <label
              v-for="eventType in availableEventTypes"
              :key="eventType.name"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] cursor-pointer transition-colors"
            >
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :checked="selectedEventTypes.includes(eventType.name)"
                  @change="toggleEventType(eventType.name)"
                  class="w-4 h-4 text-[var(--theme-primary)] bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-primary)] rounded focus:ring-[var(--theme-primary)] focus:ring-offset-0"
                />
                <span class="text-sm text-[var(--theme-text-primary)] flex items-center">
                  <span class="mr-1">{{ eventType.emoji }}</span>
                  {{ eventType.name }}
                </span>
              </div>
              <span class="text-xs text-[var(--theme-text-tertiary)] bg-[var(--theme-bg-quaternary)] px-2 py-0.5 rounded-full">
                {{ eventType.count }}
              </span>
            </label>
          </div>
        </div>

        <!-- Sessions Filter -->
        <div>
          <h3 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-2 flex items-center">
            <span class="mr-1">🔗</span>
            Sessions
          </h3>
          <div class="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            <label
              v-for="session in availableSessions"
              :key="session.id"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] cursor-pointer transition-colors"
            >
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :checked="selectedSessions.includes(session.id)"
                  @change="toggleSession(session.id)"
                  class="w-4 h-4 text-[var(--theme-primary)] bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-primary)] rounded focus:ring-[var(--theme-primary)] focus:ring-offset-0"
                />
                <span class="text-sm text-[var(--theme-text-primary)] flex items-center">
                  <div 
                    class="w-2 h-2 rounded-full mr-1"
                    :class="session.colorClass"
                  ></div>
                  {{ session.display }}
                </span>
              </div>
              <span class="text-xs text-[var(--theme-text-tertiary)] bg-[var(--theme-bg-quaternary)] px-2 py-0.5 rounded-full">
                {{ session.count }}
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- Saved Filters -->
      <div class="mt-4 pt-4 border-t border-[var(--theme-border-primary)]">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-[var(--theme-text-secondary)] flex items-center">
            <span class="mr-1">⭐</span>
            Saved Filters
          </h3>
          <button
            v-if="hasActiveFilters"
            @click="saveCurrentFilter"
            class="text-xs text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] transition-colors flex items-center space-x-1"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Save current</span>
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in filterPresets"
            :key="preset.id"
            @click="applyPreset(preset)"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] transition-all duration-200"
          >
            <span class="mr-1">{{ preset.icon }}</span>
            {{ preset.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { HookEvent } from '../types';

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  apps: string[];
  eventTypes: string[];
  sessions: string[];
}

const props = defineProps<{
  events: HookEvent[];
  filters: {
    sourceApps: string[];
    sessionIds: string[];
    eventTypes: string[];
    toolNames: string[];
    search?: string;
  };
  sortBy?: string;
  sortOrder?: string;
}>();

const emit = defineEmits<{
  'update:filters': [filters: typeof props.filters];
  'update:sortBy': [value: string];
  'update:sortOrder': [value: string];
}>();

const searchQuery = ref('');
const selectedApps = ref<string[]>([]);
const selectedEventTypes = ref<string[]>([]);
const selectedSessions = ref<string[]>([]);

const filterPresets = ref<FilterPreset[]>([
  {
    id: 'errors',
    name: 'Errors Only',
    icon: '🚨',
    apps: [],
    eventTypes: ['Error', 'Exception'],
    sessions: []
  },
  {
    id: 'tools',
    name: 'Tool Usage',
    icon: '🔧',
    apps: [],
    eventTypes: ['PreToolUse', 'PostToolUse'],
    sessions: []
  },
  {
    id: 'user',
    name: 'User Activity',
    icon: '👤',
    apps: [],
    eventTypes: ['UserPromptSubmit', 'Notification'],
    sessions: []
  }
]);

const eventTypeEmojis: Record<string, string> = {
  'PreToolUse': '🔧',
  'PostToolUse': '✅',
  'Notification': '🔔',
  'Stop': '🛑',
  'SubagentStop': '👥',
  'PreCompact': '📦',
  'UserPromptSubmit': '💬'
};

const availableApps = computed(() => {
  const appCounts = new Map<string, number>();
  props.events.forEach(event => {
    const count = appCounts.get(event.source_app) || 0;
    appCounts.set(event.source_app, count + 1);
  });
  
  return Array.from(appCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
});

const availableEventTypes = computed(() => {
  const typeCounts = new Map<string, number>();
  props.events.forEach(event => {
    const count = typeCounts.get(event.hook_event_type) || 0;
    typeCounts.set(event.hook_event_type, count + 1);
  });
  
  return Array.from(typeCounts.entries())
    .map(([name, count]) => ({ 
      name, 
      count,
      emoji: eventTypeEmojis[name] || '❓'
    }))
    .sort((a, b) => b.count - a.count);
});

const availableSessions = computed(() => {
  const sessionMap = new Map<string, { count: number; colorClass: string; display: string }>();
  
  props.events.forEach(event => {
    if (!sessionMap.has(event.session_id)) {
      const parts = event.session_id.split('_');
      let display = event.session_id.slice(0, 8) + '...';
      if (parts.length >= 3) {
        display = `${parts[0].slice(0, 6)}:${parts[1]}`;
      }
      
      sessionMap.set(event.session_id, {
        count: 0,
        colorClass: getSessionColorClass(event.session_id),
        display
      });
    }
    
    const session = sessionMap.get(event.session_id)!;
    session.count++;
  });
  
  return Array.from(sessionMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count);
});

const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() !== '' || 
         selectedApps.value.length > 0 || 
         selectedEventTypes.value.length > 0 || 
         selectedSessions.value.length > 0;
});

const activeFilterChips = computed(() => {
  const chips = [];
  
  if (searchQuery.value.trim()) {
    chips.push({
      id: 'search',
      type: 'search',
      icon: '🔍',
      label: `"${searchQuery.value}"`,
      value: searchQuery.value
    });
  }
  
  selectedApps.value.forEach(app => {
    chips.push({
      id: `app-${app}`,
      type: 'app',
      icon: '📱',
      label: app,
      value: app
    });
  });
  
  selectedEventTypes.value.forEach(type => {
    chips.push({
      id: `type-${type}`,
      type: 'eventType',
      icon: eventTypeEmojis[type] || '❓',
      label: type,
      value: type
    });
  });
  
  selectedSessions.value.forEach(session => {
    const sessionData = availableSessions.value.find(s => s.id === session);
    chips.push({
      id: `session-${session}`,
      type: 'session',
      icon: '🔗',
      label: sessionData?.display || session.slice(0, 8),
      value: session
    });
  });
  
  return chips;
});

const getSessionColorClass = (sessionId: string) => {
  // This would be replaced with actual color assignment logic
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
  const index = sessionId.charCodeAt(0) % colors.length;
  return colors[index];
};

const handleSearch = () => {
  updateFilters();
};

const clearSearch = () => {
  searchQuery.value = '';
  updateFilters();
};

const toggleApp = (app: string) => {
  const index = selectedApps.value.indexOf(app);
  if (index > -1) {
    selectedApps.value.splice(index, 1);
  } else {
    selectedApps.value.push(app);
  }
  updateFilters();
};

const toggleEventType = (type: string) => {
  const index = selectedEventTypes.value.indexOf(type);
  if (index > -1) {
    selectedEventTypes.value.splice(index, 1);
  } else {
    selectedEventTypes.value.push(type);
  }
  updateFilters();
};

const toggleSession = (session: string) => {
  const index = selectedSessions.value.indexOf(session);
  if (index > -1) {
    selectedSessions.value.splice(index, 1);
  } else {
    selectedSessions.value.push(session);
  }
  updateFilters();
};

const removeFilter = (filter: any) => {
  switch (filter.type) {
    case 'search':
      searchQuery.value = '';
      break;
    case 'app':
      toggleApp(filter.value);
      break;
    case 'eventType':
      toggleEventType(filter.value);
      break;
    case 'session':
      toggleSession(filter.value);
      break;
  }
};

const clearAllFilters = () => {
  searchQuery.value = '';
  selectedApps.value = [];
  selectedEventTypes.value = [];
  selectedSessions.value = [];
  updateFilters();
};

const applyPreset = (preset: FilterPreset) => {
  selectedApps.value = [...preset.apps];
  selectedEventTypes.value = [...preset.eventTypes];
  selectedSessions.value = [...preset.sessions];
  updateFilters();
};

const saveCurrentFilter = () => {
  const name = prompt('Enter a name for this filter preset:');
  if (name) {
    filterPresets.value.push({
      id: Date.now().toString(),
      name,
      icon: '⭐',
      apps: [...selectedApps.value],
      eventTypes: [...selectedEventTypes.value],
      sessions: [...selectedSessions.value]
    });
  }
};

const updateFilters = () => {
  // Emit arrays directly for multi-selection support
  const newFilters = {
    sourceApps: selectedApps.value,
    sessionIds: selectedSessions.value,
    eventTypes: selectedEventTypes.value,
    toolNames: [],  // TODO: Add tool name filtering in the UI
    search: searchQuery.value
  };
  
  emit('update:filters', newFilters);
};

const updateSortBy = (value: string) => {
  emit('update:sortBy', value);
};

const updateSortOrder = (value: string) => {
  emit('update:sortOrder', value);
};

// Initialize from props
onMounted(() => {
  selectedApps.value = [...props.filters.sourceApps];
  selectedSessions.value = [...props.filters.sessionIds];
  selectedEventTypes.value = [...props.filters.eventTypes];
  if (props.filters.search) {
    searchQuery.value = props.filters.search;
  }
});

// Watch for external filter changes
watch(() => props.filters, (newFilters) => {
  selectedApps.value = [...newFilters.sourceApps];
  selectedSessions.value = [...newFilters.sessionIds];
  selectedEventTypes.value = [...newFilters.eventTypes];
  searchQuery.value = newFilters.search || '';
}, { deep: true });
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--theme-bg-tertiary);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--theme-primary);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--theme-primary-dark);
}

/* Filter chip animations */
.filter-chip-enter-active,
.filter-chip-leave-active {
  transition: all 0.3s ease;
}

.filter-chip-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.filter-chip-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>