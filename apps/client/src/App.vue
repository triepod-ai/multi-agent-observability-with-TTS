<template>
  <div class="h-screen flex flex-col bg-gray-900">
    <!-- Header with Primary Theme Colors -->
    <header class="bg-gradient-to-r from-blue-700 to-blue-600 shadow-xl border-b-2 border-blue-800">
      <div class="px-3 py-4 mobile:py-2 mobile:flex-col mobile:space-y-2 flex items-center justify-between">
        <!-- Title Section -->
        <div class="mobile:w-full mobile:text-center">
          <h1 class="text-2xl mobile:text-lg font-bold text-white drop-shadow-lg">
            Multi-Agent Observability
          </h1>
        </div>
        
        <!-- View Mode Selector -->
        <div class="mobile:w-full mobile:justify-center flex items-center space-x-2">
          <div class="flex items-center bg-white/20 backdrop-blur-sm rounded-lg p-1 border border-white/30">
            <button
              v-for="mode in viewModes"
              :key="mode.id"
              @click="currentViewMode = mode.id as typeof currentViewMode"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200"
              :class="currentViewMode === mode.id 
                ? 'bg-white text-blue-700 shadow-md font-semibold' 
                : 'text-white/90 hover:text-white hover:bg-white/20'"
            >
              <span class="mr-1">{{ mode.icon }}</span>
              <span class="hidden sm:inline">{{ mode.label }}</span>
            </button>
          </div>
        </div>
        
        <!-- Right Section -->
        <div class="mobile:w-full mobile:justify-center flex items-center space-x-2">
          <!-- Educational Mode Toggle -->
          <div class="flex items-center bg-white/20 backdrop-blur-sm rounded-lg p-1 border border-white/30">
            <button
              @click="toggleEducationalMode"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center"
              :class="isEducationalMode 
                ? 'bg-green-500 text-white shadow-md font-semibold' 
                : 'text-white/90 hover:text-white hover:bg-white/20'"
              :title="isEducationalMode ? 'Switch to Expert Mode' : 'Switch to Educational Mode'"
            >
              <span class="mr-1">{{ isEducationalMode ? '🎓' : '👨‍💻' }}</span>
              <span class="hidden sm:inline">{{ isEducationalMode ? 'Learning' : 'Expert' }}</span>
            </button>
          </div>
          <!-- Connection Status -->
          <div class="flex items-center space-x-1.5">
            <div v-if="isConnected" class="flex items-center space-x-1.5">
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span class="text-sm text-white font-semibold drop-shadow-md hidden sm:inline">Connected</span>
            </div>
            <div v-else class="flex items-center space-x-1.5">
              <span class="relative flex h-3 w-3">
                <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span class="text-sm text-white font-semibold drop-shadow-md hidden sm:inline">Disconnected</span>
            </div>
          </div>
          
          <span class="text-sm text-white font-semibold drop-shadow-md bg-blue-800 px-3 py-1.5 rounded-full border border-blue-600">
            {{ events.length }}
          </span>
          
          <!-- Filters Toggle Button -->
          <button
            @click="showFilters = !showFilters"
            class="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 border border-white/30 hover:border-white/50 backdrop-blur-sm shadow-lg hover:shadow-xl"
            :title="showFilters ? 'Hide filters' : 'Show filters'"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          
          
          <!-- Theme Manager Button -->
          <button
            @click="handleThemeManagerClick"
            class="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 border border-white/30 hover:border-white/50 backdrop-blur-sm shadow-lg hover:shadow-xl"
            title="Open theme manager"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        </div>
      </div>
    </header>
    
    <!-- Filters -->
    <Transition name="slide-down">
      <SmartFilterBar
        v-if="showFilters"
        :events="events"
        :filters="{ sourceApps: filters.sourceApps, sessionIds: filters.sessionIds, eventTypes: filters.eventTypes, toolNames: filters.toolNames, search: filters.search }"
        :sort-by="sortBy"
        :sort-order="sortOrder"
        @update:filters="handleSmartFilterUpdate"
        @update:sortBy="sortBy = $event as typeof sortBy"
        @update:sortOrder="sortOrder = $event as typeof sortOrder"
      />
    </Transition>
    
    <!-- Breadcrumb Navigation (shown when filters are active) -->
    <Transition name="slide-down">
      <div v-if="hasActiveFilters" class="bg-blue-900/30 border-b border-blue-700/50 px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2 text-sm">
            <button
              @click="clearFiltersAndReturnToApplications"
              class="flex items-center space-x-1 text-blue-300 hover:text-blue-200 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>📱 Applications</span>
            </button>
            
            <div class="flex items-center space-x-2">
              <span class="text-gray-400">›</span>
              <div class="flex items-center space-x-2">
                <span v-if="filters.sourceApps.length > 0" class="text-white font-medium">{{ filters.sourceApps[0] }}</span>
                <span v-if="filters.toolNames.length > 0" class="text-gray-400">›</span>
                <span v-if="filters.toolNames.length > 0" class="inline-flex items-center space-x-1 bg-blue-800/50 px-2 py-1 rounded-full text-xs">
                  <span>{{ getToolIcon(filters.toolNames[0]) }}</span>
                  <span class="text-blue-200">{{ filters.toolNames[0] }}</span>
                </span>
                <span v-if="filters.sessionIds.length > 0" class="text-gray-400">›</span>
                <span v-if="filters.sessionIds.length > 0" class="inline-flex items-center space-x-1 bg-purple-800/50 px-2 py-1 rounded-full text-xs">
                  <span>🔗</span>
                  <span class="text-purple-200">{{ formatSessionId(filters.sessionIds[0]) }}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <span class="text-xs text-gray-400">{{ finalFilteredEvents.length }} events</span>
            <button
              @click="clearAllFilters"
              class="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- Filter Notification Bar -->
    <FilterNotificationBar
      :notification="filterNotification"
      :filter-impact-percentage="filterImpactPercentage"
      :filter-summary-text="filterSummaryText"
      :show-notifications="showNotifications"
      @remove-filter="removeFilter"
      @clear-all-filters="clearAllFilters"
      @toggle-notifications="toggleNotifications"
    />
    
    <!-- Educational Dashboard (when in educational mode) -->
    <EducationalDashboard
      v-if="isEducationalMode"
      :events="events"
    />

    <!-- Hook Status Grid - Moved to Timeline tab instead of global display -->
    <!-- <HookStatusGrid
      v-else
      :events="events"
    /> -->

    <!-- Activity Dashboard -->
    <ActivityDashboard
      v-if="false"
      :events="events"
      :get-session-color="getHexColorForSession"
      :get-app-color="getHexColorForApp"
      @select-session="handleSessionSelect"
      @view-all-sessions="currentViewMode = 'timeline'"
    />

    <!-- Main Content Area -->
    <div class="flex-1 overflow-hidden">
      <Transition name="fade" mode="out-in">
        <!-- Timeline View (New Visual Timeline) -->
        <TimelineView
          v-if="currentViewMode === 'timeline'"
          key="timeline"
          :events="finalFilteredEvents"
          :get-session-color="getHexColorForSession"
          :get-app-color="getHexColorForApp"
          @event-click="openEventDetail"
          @copy-event="handleEventCopy"
        />
        
        <!-- Applications View (Application-centric monitoring) -->
        <ApplicationsOverview
          v-else-if="currentViewMode === 'applications'"
          key="applications"
          :events="finalFilteredEvents"
          :all-events="events"
          :active-filters="filters"
          :get-app-color="getHexColorForApp"
          :get-session-color="getHexColorForSession"
          @select-session="handleSessionSelect"
          @filter-by-app="handleFilterByApp"
          @view-all-sessions="handleViewAllSessions"
          @filter-by-tool="handleFilterByTool"
          @clear-filter="handleClearFilter"
          @clear-all-filters="clearAllFilters"
        />
        
        <!-- Agents View (Agent-centric monitoring) -->
        <AgentDashboard
          v-else-if="currentViewMode === 'agents'"
          key="agents"
          :events="finalFilteredEvents"
          :get-session-color="getHexColorForSession"
          :get-app-color="getHexColorForApp"
          @session-select="handleSessionSelect"
          @event-click="openEventDetail"
        />
        
        <!-- Legacy Timeline View (Original) -->
        <div v-else key="legacy" class="h-full">
          <EventTimeline
            :events="events"
            :filters="filters"
            v-model:stick-to-bottom="stickToBottom"
          />
        </div>
      </Transition>
    </div>
    
    
    <!-- Stick to bottom button -->
    <StickScrollButton
      :stick-to-bottom="stickToBottom"
      @toggle="stickToBottom = !stickToBottom"
    />
    
    <!-- Error message -->
    <div
      v-if="error"
      class="fixed bottom-4 left-4 mobile:bottom-3 mobile:left-3 mobile:right-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 mobile:px-2 mobile:py-1.5 rounded mobile:text-xs"
    >
      {{ error }}
    </div>
    
    <!-- Theme Manager -->
    <ThemeManager 
      :is-open="showThemeManager"
      @close="showThemeManager = false"
    />
    
    <!-- Event Detail Modal -->
    <EventDetailModal
      :is-open="showEventDetail"
      :event="selectedEvent"
      :all-events="finalFilteredEvents"
      :session-color-class="selectedEvent ? getColorForSession(selectedEvent.session_id) : ''"
      :app-hex-color="selectedEvent ? getHexColorForApp(selectedEvent.source_app) : ''"
      @close="showEventDetail = false"
      @navigate="navigateEvent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookEvent, FilterState } from './types';
import { useWebSocket } from './composables/useWebSocket';
import { useThemes } from './composables/useThemes';
import { useEventColors } from './composables/useEventColors';
import { useFilterNotifications } from './composables/useFilterNotifications';
import EventTimeline from './components/EventTimeline.vue';
import StickScrollButton from './components/StickScrollButton.vue';
import ThemeManager from './components/ThemeManager.vue';
import SmartFilterBar from './components/SmartFilterBar.vue';
import ActivityDashboard from './components/ActivityDashboard.vue';
import EventDetailModal from './components/EventDetailModal.vue';
import TimelineView from './components/TimelineView.vue';
import ApplicationsOverview from './components/ApplicationsOverview.vue';
import AgentDashboard from './components/AgentDashboard.vue';
import FilterNotificationBar from './components/FilterNotificationBar.vue';
import HookStatusGrid from './components/HookStatusGrid.vue';
import EducationalDashboard from './components/EducationalDashboard.vue';
import { useEducationalMode } from './composables/useEducationalMode';

// WebSocket connection
const { events, isConnected, error, terminalStatus } = useWebSocket('ws://localhost:4000/stream');

// Theme management
const { } = useThemes();

// Event colors
const { getColorForSession, getHexColorForSession, getHexColorForApp } = useEventColors();

// Educational mode
const { isEducationalMode, toggleEducationalMode } = useEducationalMode();

// View modes
const viewModes = [
  { id: 'timeline', label: 'Timeline', icon: '⏰' },
  { id: 'applications', label: 'Applications', icon: '📱' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'legacy', label: 'Classic', icon: '📜' }
];

const currentViewMode = ref<'timeline' | 'applications' | 'agents' | 'legacy'>('timeline');

// Filters
const filters = ref<FilterState>({
  sourceApps: [],
  sessionIds: [],
  eventTypes: [],
  toolNames: [],
  search: '',
  demoMode: false
});

// Filter notifications
const {
  hasActiveFilters,
  filteredEvents,
  filterNotification,
  removeFilter,
  clearAllFilters: clearAllFiltersFromComposable,
  toggleNotifications,
  showNotifications,
  filterImpactPercentage,
  filterSummaryText
} = useFilterNotifications(events, filters);

// Sorting state
const sortBy = ref<'timestamp' | 'name' | 'source_app' | 'event_type'>('timestamp');
const sortOrder = ref<'asc' | 'desc'>('desc'); // Default to latest first

// UI state
const stickToBottom = ref(true);
const showThemeManager = ref(false);
const showFilters = ref(false);
const selectedSessionId = ref<string | null>(null);
const selectedEvent = ref<HookEvent | null>(null);
const showEventDetail = ref(false);

// Computed properties

// Apply selected session filter and sorting to filtered events
const finalFilteredEvents = computed(() => {
  let filtered = [...filteredEvents.value];
  
  // Also filter by selected session from ActivityMonitor
  if (selectedSessionId.value) {
    filtered = filtered.filter(e => e.session_id === selectedSessionId.value);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy.value) {
      case 'timestamp':
        compareValue = (a.timestamp || 0) - (b.timestamp || 0);
        break;
      case 'source_app':
        compareValue = a.source_app.localeCompare(b.source_app);
        break;
      case 'event_type':
        compareValue = a.hook_event_type.localeCompare(b.hook_event_type);
        break;
      case 'name':
        // Sort by a combination of source_app and event type
        const aName = `${a.source_app}_${a.hook_event_type}`;
        const bName = `${b.source_app}_${b.hook_event_type}`;
        compareValue = aName.localeCompare(bName);
        break;
    }
    
    // Apply sort order
    return sortOrder.value === 'asc' ? compareValue : -compareValue;
  });
  
  return filtered;
});



// Helper functions for breadcrumb navigation
const getToolIcon = (toolName: string): string => {
  const toolIcons: Record<string, string> = {
    'Read': '📖',
    'Write': '✏️',
    'Edit': '📝',
    'MultiEdit': '📄',
    'Bash': '💻',
    'Grep': '🔍',
    'Glob': '🌐',
    'Task': '🎯',
    'WebFetch': '🌐',
    'TodoWrite': '📋',
    'LS': '📁',
    'User Input': '💬',
    'System Notification': '🔔',
    'Session End': '🛑',
    'Sub-agent Complete': '✅',
    'NotebookRead': '📓',
    'NotebookEdit': '📝',
    'WebSearch': '🔍'
  };
  return toolIcons[toolName] || '🔧';
};

const formatSessionId = (sessionId: string): string => {
  const parts = sessionId.split('_');
  if (parts.length >= 3) {
    return `${parts[0].slice(0, 4)}:${parts[1]}`;
  }
  return sessionId.slice(0, 8) + '...';
};

// Event handlers
const handleThemeManagerClick = () => {
  showThemeManager.value = true;
};

const handleEventCopy = (event: HookEvent) => {
  console.log('Event payload copied:', event);
};

const openEventDetail = (event: HookEvent) => {
  selectedEvent.value = event;
  showEventDetail.value = true;
};

const navigateEvent = (direction: 'prev' | 'next') => {
  if (!selectedEvent.value) return;
  
  const currentIndex = finalFilteredEvents.value.findIndex(e => e.id === selectedEvent.value!.id);
  if (currentIndex === -1) return;
  
  if (direction === 'prev' && currentIndex > 0) {
    selectedEvent.value = finalFilteredEvents.value[currentIndex - 1];
  } else if (direction === 'next' && currentIndex < finalFilteredEvents.value.length - 1) {
    selectedEvent.value = finalFilteredEvents.value[currentIndex + 1];
  }
};

const handleSessionSelect = (sessionId: string) => {
  selectedSessionId.value = sessionId;
  // Switch to timeline view to show the filtered session
  currentViewMode.value = 'timeline';
};

const handleFilterByApp = (appName: string) => {
  filters.value.sourceApps = [appName];
  currentViewMode.value = 'timeline'; // Switch to timeline to show filtered events
};

const handleViewAllSessions = (appName: string) => {
  filters.value.sourceApps = [appName];
  currentViewMode.value = 'timeline'; // Switch to timeline to show all sessions for this app
};

const handleFilterByTool = (appName: string, toolName: string) => {
  filters.value.sourceApps = [appName];
  filters.value.toolNames = [toolName];
  currentViewMode.value = 'timeline'; // Switch to timeline to show filtered events
};

const clearAllFilters = () => {
  clearAllFiltersFromComposable();
  selectedSessionId.value = null;
};

const clearFiltersAndReturnToApplications = () => {
  clearAllFilters();
  currentViewMode.value = 'applications';
};

const handleClearFilter = (filterType: 'sourceApp' | 'sessionId' | 'eventType' | 'toolName') => {
  switch (filterType) {
    case 'sourceApp':
      filters.value.sourceApps = [];
      break;
    case 'sessionId':
      filters.value.sessionIds = [];
      selectedSessionId.value = null;
      break;
    case 'eventType':
      filters.value.eventTypes = [];
      break;
    case 'toolName':
      filters.value.toolNames = [];
      break;
  }
};

const handleSmartFilterUpdate = (newFilters: { sourceApps: string[]; sessionIds: string[]; eventTypes: string[]; toolNames: string[]; search?: string }) => {
  filters.value.sourceApps = newFilters.sourceApps;
  filters.value.sessionIds = newFilters.sessionIds;
  filters.value.eventTypes = newFilters.eventTypes;
  filters.value.toolNames = newFilters.toolNames;
  if (newFilters.search !== undefined) {
    filters.value.search = newFilters.search;
  }
};
</script>

<style>
/* Transition animations */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

</style>