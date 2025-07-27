<template>
  <div class="h-full overflow-y-auto p-4 bg-gray-950">
    <!-- Timeline Header -->
    <div class="mb-6 text-center">
      <h2 class="text-xl font-bold text-white mb-2">Event Timeline</h2>
      <p class="text-sm text-gray-400">{{ events.length }} events</p>
    </div>

    <!-- Timeline Container -->
    <div class="relative max-w-6xl mx-auto">
      <!-- Vertical Timeline Line -->
      <div class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-pink-500/50"></div>
      
      <!-- Timeline Events -->
      <div class="space-y-8">
        <TransitionGroup name="timeline-event">
          <div
            v-for="(event, index) in events"
            :key="`${event.id}-${event.timestamp}`"
            class="relative"
          >
            <!-- Time Marker -->
            <div 
              class="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 z-10"
              :class="getTimeMarkerPosition(index)"
            >
              <div 
                class="w-4 h-4 rounded-full border-2 border-gray-800 shadow-lg animate-pulse"
                :class="getEventColorClass(event.hook_event_type)"
              ></div>
            </div>

            <!-- Event Card Container -->
            <div 
              class="relative flex items-center"
              :class="index % 2 === 0 ? 'justify-start' : 'justify-end'"
            >
              <!-- Connection Line -->
              <div 
                class="absolute top-1/2 transform -translate-y-1/2 w-24 h-0.5"
                :class="[
                  index % 2 === 0 ? 'left-1/2 bg-gradient-to-r' : 'right-1/2 bg-gradient-to-l',
                  getConnectionGradient(event.hook_event_type)
                ]"
              ></div>

              <!-- Event Card -->
              <div 
                class="relative w-5/12 group"
                :class="index % 2 === 0 ? 'pr-8' : 'pl-8'"
              >
                <!-- Timestamp -->
                <div 
                  class="absolute top-1/2 transform -translate-y-1/2 text-xs font-mono text-gray-500"
                  :class="index % 2 === 0 ? 'right-0' : 'left-0'"
                >
                  {{ formatTimestamp(event.timestamp) }}
                </div>

                <!-- Card Content -->
                <div 
                  class="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:bg-gray-800 hover:border-gray-600 transition-all duration-300 cursor-pointer group-hover:shadow-xl"
                  :class="getSessionBorderClass(event.session_id)"
                  @click="$emit('event-click', event)"
                >
                  <!-- Header -->
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                      <span class="text-lg">{{ getEventEmoji(event.hook_event_type) }}</span>
                      <span class="font-semibold text-sm text-white">{{ event.hook_event_type }}</span>
                    </div>
                    <div 
                      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      :style="{ backgroundColor: getAppColor(event.source_app) + '30', color: getAppColor(event.source_app) }"
                    >
                      {{ event.source_app.charAt(0).toUpperCase() }}
                    </div>
                  </div>

                  <!-- Tool/Command Info -->
                  <div v-if="getToolInfo(event)" class="mb-2">
                    <div class="text-xs text-gray-400">
                      <span class="font-medium">{{ getToolInfo(event).tool }}</span>
                      <span v-if="getToolInfo(event).detail" class="ml-1 text-gray-500">
                        - {{ truncate(getToolInfo(event).detail, 50) }}
                      </span>
                    </div>
                  </div>

                  <!-- Summary -->
                  <div v-if="event.summary" class="text-xs text-gray-300 italic">
                    "{{ truncate(event.summary, 60) }}"
                  </div>

                  <!-- Session Badge -->
                  <div class="mt-2 flex items-center justify-between">
                    <div 
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                      :class="getSessionColorClass(event.session_id)"
                    >
                      <div class="w-1.5 h-1.5 rounded-full mr-1" :class="getSessionDotClass(event.session_id)"></div>
                      {{ getSessionShort(event.session_id) }}
                    </div>
                    <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        @click.stop="$emit('copy-event', event)"
                        class="text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Time Group Separator -->
            <div 
              v-if="shouldShowTimeSeparator(event, index)"
              class="absolute left-0 right-0 flex items-center justify-center my-8"
            >
              <div class="bg-gray-800 px-4 py-1 rounded-full text-xs text-gray-400 font-medium border border-gray-700">
                {{ getTimeSeparatorText(event, index) }}
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Empty State -->
      <div v-if="events.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">⏰</div>
        <p class="text-lg font-semibold text-gray-400 mb-2">No events yet</p>
        <p class="text-sm text-gray-500">Events will appear here as they occur</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HookEvent } from '../types';

const props = defineProps<{
  events: HookEvent[];
  getSessionColor: (sessionId: string) => string;
  getAppColor: (appName: string) => string;
}>();

const emit = defineEmits<{
  'event-click': [event: HookEvent];
  'copy-event': [event: HookEvent];
}>();

// Event type emojis
const eventEmojis: Record<string, string> = {
  'PreToolUse': '🔧',
  'PostToolUse': '✅',
  'Notification': '🔔',
  'Stop': '🛑',
  'SubagentStop': '👥',
  'PreCompact': '📦',
  'UserPromptSubmit': '💬'
};

// Event type colors
const eventTypeColors: Record<string, string> = {
  'PreToolUse': 'bg-blue-500',
  'PostToolUse': 'bg-green-500',
  'Notification': 'bg-yellow-500',
  'Stop': 'bg-red-500',
  'SubagentStop': 'bg-purple-500',
  'PreCompact': 'bg-indigo-500',
  'UserPromptSubmit': 'bg-pink-500'
};

// Connection gradients
const connectionGradients: Record<string, string> = {
  'PreToolUse': 'from-transparent to-blue-500/50',
  'PostToolUse': 'from-transparent to-green-500/50',
  'Notification': 'from-transparent to-yellow-500/50',
  'Stop': 'from-transparent to-red-500/50',
  'SubagentStop': 'from-transparent to-purple-500/50',
  'PreCompact': 'from-transparent to-indigo-500/50',
  'UserPromptSubmit': 'from-transparent to-pink-500/50'
};

const getEventEmoji = (eventType: string) => eventEmojis[eventType] || '❓';
const getEventColorClass = (eventType: string) => eventTypeColors[eventType] || 'bg-gray-500';
const getConnectionGradient = (eventType: string) => connectionGradients[eventType] || 'from-transparent to-gray-500/50';

const getTimeMarkerPosition = (index: number) => {
  // Alternate slight vertical offset for visual interest
  return index % 4 === 0 ? '-mt-1' : index % 4 === 2 ? 'mt-1' : '';
};

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
};

const getSessionShort = (sessionId: string) => {
  const parts = sessionId.split('_');
  if (parts.length >= 3) {
    return `${parts[0].slice(0, 6)}:${parts[1]}`;
  }
  return sessionId.slice(0, 8);
};

const getSessionColorClass = (sessionId: string) => {
  const colors = ['bg-blue-900/30', 'bg-green-900/30', 'bg-purple-900/30', 'bg-yellow-900/30', 'bg-pink-900/30'];
  const index = sessionId.charCodeAt(0) % colors.length;
  return colors[index];
};

const getSessionBorderClass = (sessionId: string) => {
  const colors = ['border-blue-700', 'border-green-700', 'border-purple-700', 'border-yellow-700', 'border-pink-700'];
  const index = sessionId.charCodeAt(0) % colors.length;
  return colors[index];
};

const getSessionDotClass = (sessionId: string) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];
  const index = sessionId.charCodeAt(0) % colors.length;
  return colors[index];
};

const getToolInfo = (event: HookEvent) => {
  const payload = event.payload;
  
  if (event.hook_event_type === 'UserPromptSubmit' && payload.prompt) {
    return {
      tool: 'Prompt',
      detail: payload.prompt
    };
  }
  
  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: payload.tool_name };
    
    if (payload.tool_input) {
      if (payload.tool_input.command) {
        info.detail = payload.tool_input.command;
      } else if (payload.tool_input.file_path) {
        info.detail = payload.tool_input.file_path;
      } else if (payload.tool_input.pattern) {
        info.detail = payload.tool_input.pattern;
      }
    }
    
    return info;
  }
  
  return null;
};

const truncate = (str: string, length: number) => {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
};

const shouldShowTimeSeparator = (event: HookEvent, index: number) => {
  if (index === 0 || !props.events[index - 1]) return false;
  
  const currentTime = new Date(event.timestamp || 0);
  const prevTime = new Date(props.events[index - 1].timestamp || 0);
  
  // Show separator if more than 5 minutes between events
  const timeDiff = currentTime.getTime() - prevTime.getTime();
  return timeDiff > 5 * 60 * 1000; // 5 minutes
};

const getTimeSeparatorText = (event: HookEvent, index: number) => {
  if (!props.events[index - 1]) return '';
  
  const currentTime = new Date(event.timestamp || 0);
  const prevTime = new Date(props.events[index - 1].timestamp || 0);
  
  const timeDiff = currentTime.getTime() - prevTime.getTime();
  const minutes = Math.floor(timeDiff / (60 * 1000));
  
  if (minutes < 60) return `${minutes} minutes later`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} later`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} later`;
};
</script>

<style scoped>
/* Timeline event animations */
.timeline-event-enter-active,
.timeline-event-leave-active {
  transition: all 0.5s ease;
}

.timeline-event-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.timeline-event-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Add glow effect to timeline */
.bg-gradient-to-b {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

/* Pulse animation for time markers */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>