<template>
  <div class="w-full bg-[var(--theme-bg-secondary)] rounded-xl border border-[var(--theme-border-primary)] overflow-hidden">
    <!-- Session Header -->
    <div 
      class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-primary)] cursor-pointer hover:bg-[var(--theme-bg-tertiary)] transition-colors duration-200"
      @click="toggleCollapsed"
    >
      <div class="flex items-center space-x-3">
        <!-- Session Color Indicator -->
        <div 
          class="w-3 h-3 rounded-full shadow-sm"
          :class="sessionColorClass"
        ></div>
        
        <!-- Session Info -->
        <div class="flex items-center space-x-2">
          <h3 class="font-bold text-[var(--theme-text-primary)]">
            Session: {{ sessionIdDisplay }}
          </h3>
          <span class="text-xs text-[var(--theme-text-tertiary)] px-2 py-0.5 bg-[var(--theme-bg-tertiary)] rounded-full">
            {{ sessionInfo.processId }}
          </span>
        </div>

        <!-- Session Metadata -->
        <div class="flex items-center space-x-3 text-xs text-[var(--theme-text-secondary)]">
          <span class="flex items-center space-x-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ formatSessionTime(sessionInfo.startTime) }}</span>
          </span>
          <span v-if="sessionInfo.hostname" class="flex items-center space-x-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span>{{ sessionInfo.hostname }}</span>
          </span>
          <span class="flex items-center space-x-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span>{{ events.length }} events</span>
          </span>
        </div>
      </div>

      <!-- Collapse/Expand Icon -->
      <div class="flex items-center space-x-2">
        <!-- Activity Indicator -->
        <div v-if="hasRecentActivity" class="relative">
          <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        
        <svg 
          class="w-5 h-5 text-[var(--theme-text-secondary)] transition-transform duration-300"
          :class="{ 'rotate-180': !isCollapsed }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- Events Timeline -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[400px] opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="max-h-[400px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="!isCollapsed" class="relative overflow-x-auto overflow-y-hidden">
        <!-- Timeline Container -->
        <div class="p-4 min-w-max">
          <!-- Time Ruler -->
          <div class="relative h-6 mb-4 border-b border-[var(--theme-border-primary)]">
            <div 
              v-for="(marker, index) in timeMarkers" 
              :key="index"
              class="absolute top-0 flex flex-col items-center"
              :style="{ left: `${marker.position}%` }"
            >
              <div class="w-px h-3 bg-[var(--theme-border-primary)]"></div>
              <span class="text-xs text-[var(--theme-text-tertiary)] mt-1">{{ marker.label }}</span>
            </div>
          </div>

          <!-- Events Lane -->
          <div class="relative h-32">
            <!-- Connection Lines -->
            <svg 
              v-if="eventConnections.length > 0"
              class="absolute inset-0 pointer-events-none"
              style="width: 100%; height: 100%;"
            >
              <defs>
                <marker 
                  id="arrowhead" 
                  markerWidth="10" 
                  markerHeight="7" 
                  refX="9" 
                  refY="3.5" 
                  orient="auto"
                  fill="var(--theme-text-tertiary)"
                >
                  <polygon points="0 0, 10 3.5, 0 7" />
                </marker>
              </defs>
              <path
                v-for="(connection, index) in eventConnections"
                :key="index"
                :d="connection.path"
                fill="none"
                stroke="var(--theme-text-tertiary)"
                stroke-width="1"
                stroke-dasharray="2,2"
                opacity="0.5"
                marker-end="url(#arrowhead)"
              />
            </svg>

            <!-- Event Cards -->
            <div
              v-for="(event, index) in events"
              :key="event.id"
              class="absolute top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:z-10"
              :style="{ left: `${getEventPosition(event, index)}%`, transform: `translateX(-50%) translateY(-50%)` }"
              @click="$emit('eventClick', event)"
            >
              <div 
                class="relative bg-[var(--theme-bg-primary)] border-2 rounded-lg p-3 shadow-md hover:shadow-xl transition-all duration-200 min-w-[120px] hover:scale-105"
                :class="getEventBorderClass(event)"
              >
                <!-- App Color Dot -->
                <div 
                  class="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-[var(--theme-bg-primary)]"
                  :style="{ backgroundColor: getAppColor(event.source_app) }"
                ></div>

                <!-- Event Content -->
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-2xl">{{ getEventEmoji(event.hook_event_type) }}</span>
                  <span class="text-xs font-medium text-[var(--theme-text-primary)]">
                    {{ event.hook_event_type }}
                  </span>
                  <span v-if="getToolName(event)" class="text-xs text-[var(--theme-text-secondary)] truncate max-w-[100px]">
                    {{ getToolName(event) }}
                  </span>
                  <span class="text-xs text-[var(--theme-text-tertiary)]">
                    {{ formatEventTime(event.timestamp) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookEvent } from '../types';

const props = defineProps<{
  sessionId: string;
  events: HookEvent[];
  sessionColorClass: string;
  getAppColor: (app: string) => string;
}>();

const emit = defineEmits<{
  eventClick: [event: HookEvent];
}>();

const isCollapsed = ref(false);

const sessionInfo = computed(() => {
  const parts = props.sessionId.split('_');
  if (parts.length >= 3) {
    const firstEvent = props.events[0];
    return {
      originalId: parts[0],
      processId: parts[1],
      startTime: parseInt(parts[2]) * 1000,
      hostname: firstEvent?.payload?.metadata?.hostname,
      user: firstEvent?.payload?.metadata?.user
    };
  }
  return {
    originalId: props.sessionId,
    processId: 'unknown',
    startTime: Date.now(),
    hostname: null,
    user: null
  };
});

const sessionIdDisplay = computed(() => {
  return sessionInfo.value.originalId.slice(0, 8) + '...';
});

const hasRecentActivity = computed(() => {
  if (props.events.length === 0) return false;
  const lastEvent = props.events[props.events.length - 1];
  
  if (!lastEvent.timestamp || lastEvent.timestamp <= 0) return false;
  
  // Handle both milliseconds and seconds timestamps
  const lastEventTime = lastEvent.timestamp > 1000000000000 ? lastEvent.timestamp : lastEvent.timestamp * 1000;
  const timeDiff = Date.now() - lastEventTime;
  return timeDiff < 60000; // Active if last event within 1 minute
});

const timeRange = computed(() => {
  if (props.events.length === 0) return { start: Date.now(), end: Date.now() };
  
  // Normalize timestamps to milliseconds and filter valid ones
  const timestamps = props.events
    .map(e => {
      if (!e.timestamp || e.timestamp <= 0) return 0;
      // Convert seconds to milliseconds if needed
      return e.timestamp > 1000000000000 ? e.timestamp : e.timestamp * 1000;
    })
    .filter(t => t > 0);
  
  if (timestamps.length === 0) return { start: Date.now(), end: Date.now() };
  
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  
  // If all events have the same timestamp, create a small time range for visualization
  if (start === end) {
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return {
      start: start - fiveMinutes,
      end: start + fiveMinutes
    };
  }
  
  return { start, end };
});

const timeMarkers = computed(() => {
  const { start, end } = timeRange.value;
  const duration = end - start;
  const markers = [];
  
  // Create 5 time markers
  for (let i = 0; i <= 4; i++) {
    const time = start + (duration * i / 4);
    const position = (i / 4) * 100;
    markers.push({
      position,
      label: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  }
  
  return markers;
});

const eventConnections = computed(() => {
  const connections = [];
  for (let i = 0; i < props.events.length - 1; i++) {
    const fromPos = getEventPosition(props.events[i], i);
    const toPos = getEventPosition(props.events[i + 1], i + 1);
    
    // Create curved path
    const midX = (fromPos + toPos) / 2;
    const path = `M ${fromPos}% 50% Q ${midX}% 30% ${toPos}% 50%`;
    
    connections.push({ path });
  }
  return connections;
});

const getEventPosition = (event: HookEvent, index?: number) => {
  const { start, end } = timeRange.value;
  const duration = end - start;
  
  // If no valid timestamp, distribute events evenly across the timeline
  if (!event.timestamp || event.timestamp <= 0) {
    if (index !== undefined && props.events.length > 1) {
      const position = index / (props.events.length - 1);
      return Math.max(5, Math.min(95, position * 90 + 5));
    }
    return 50;
  }
  
  if (duration === 0) {
    // If all events have the same timestamp, distribute them evenly
    if (index !== undefined && props.events.length > 1) {
      const position = index / (props.events.length - 1);
      return Math.max(5, Math.min(95, position * 90 + 5));
    }
    return 50;
  }
  
  // Normalize event timestamp to milliseconds
  const eventTime = event.timestamp > 1000000000000 ? event.timestamp : event.timestamp * 1000;
  let position = (eventTime - start) / duration;
  
  // Add a small offset for events with very similar timestamps to prevent overlap
  if (index !== undefined) {
    const sameTimestampEvents = props.events.filter(e => {
      if (!e.timestamp || e.timestamp <= 0) return false;
      const eTime = e.timestamp > 1000000000000 ? e.timestamp : e.timestamp * 1000;
      return Math.abs(eTime - eventTime) < 1000; // Within 1 second
    });
    
    if (sameTimestampEvents.length > 1) {
      const offset = (index % sameTimestampEvents.length) * 0.02; // 2% offset per event
      position += offset;
    }
  }
  
  return Math.max(5, Math.min(95, position * 90 + 5)); // Keep within 5-95% range
};

const getEventEmoji = (eventType: string) => {
  const emojiMap: Record<string, string> = {
    'PreToolUse': '🔧',
    'PostToolUse': '✅',
    'Notification': '🔔',
    'Stop': '🛑',
    'SubagentStop': '👥',
    'PreCompact': '📦',
    'UserPromptSubmit': '💬'
  };
  return emojiMap[eventType] || '❓';
};

const getEventBorderClass = (event: HookEvent) => {
  const typeClasses: Record<string, string> = {
    'PreToolUse': 'border-blue-500 hover:border-blue-600',
    'PostToolUse': 'border-green-500 hover:border-green-600',
    'Notification': 'border-yellow-500 hover:border-yellow-600',
    'Stop': 'border-red-500 hover:border-red-600',
    'SubagentStop': 'border-purple-500 hover:border-purple-600',
    'PreCompact': 'border-orange-500 hover:border-orange-600',
    'UserPromptSubmit': 'border-cyan-500 hover:border-cyan-600'
  };
  return typeClasses[event.hook_event_type] || 'border-gray-500 hover:border-gray-600';
};

const getToolName = (event: HookEvent) => {
  return event.payload?.tool_name || null;
};

const formatSessionTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

const formatEventTime = (timestamp?: number) => {
  if (!timestamp || timestamp <= 0) return 'No time';
  
  // Handle both milliseconds and seconds timestamps
  const date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
  
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
/* Custom scrollbar for timeline */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: var(--theme-bg-tertiary);
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: var(--theme-primary);
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: var(--theme-primary-dark);
}
</style>