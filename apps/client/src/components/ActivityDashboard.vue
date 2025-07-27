<template>
  <div class="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
    <div class="px-4 py-3">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-white flex items-center">
          <span class="mr-2">🚀</span>
          System Activity Dashboard
        </h3>
        <div class="flex items-center space-x-2 text-sm">
          <span class="text-gray-400">Last update:</span>
          <span class="text-white font-mono">{{ currentTime }}</span>
          <div class="flex items-center ml-2">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1"></div>
            <span class="text-green-400 text-xs font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Column 1: Real-time Event Feed -->
        <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-gray-300 flex items-center">
              <span class="mr-1">📡</span>
              Live Event Stream
            </h4>
            <span class="text-xs text-gray-500">Latest 5</span>
          </div>
          
          <div class="relative">
            <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            <TransitionGroup name="event-feed">
              <div
                v-for="event in latestEvents.slice(0, 5)"
                :key="`${event.id}-${event.timestamp}`"
                class="flex items-center space-x-2 p-1.5 bg-gray-900/50 rounded border border-gray-700/50 hover:border-gray-600 transition-all duration-200 group"
              >
                <!-- Event Type Icon -->
                <div class="text-lg flex-shrink-0">
                  {{ getEventEmoji(event.hook_event_type) }}
                </div>
                
                <!-- Event Details -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs font-semibold text-white truncate">
                      {{ event.hook_event_type }}
                    </span>
                    <span class="text-xs text-gray-500">
                      {{ getToolName(event) }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-2 mt-0.5">
                    <div 
                      class="flex items-center space-x-1 text-xs"
                      :title="`Session: ${event.session_id}`"
                    >
                      <div 
                        class="w-2 h-2 rounded-full"
                        :style="{ backgroundColor: getSessionColor(event.session_id) }"
                      ></div>
                      <span class="text-gray-400">{{ getSessionShort(event.session_id) }}</span>
                    </div>
                    <span class="text-gray-600">•</span>
                    <span class="text-xs text-gray-400 font-mono">
                      {{ getRelativeTime(event.timestamp) }}
                    </span>
                  </div>
                </div>
                
                <!-- App Badge -->
                <div 
                  class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                  :style="{ 
                    backgroundColor: getAppColor(event.source_app) + '20',
                    color: getAppColor(event.source_app)
                  }"
                  :title="event.source_app"
                >
                  {{ event.source_app.charAt(0).toUpperCase() }}
                </div>
              </div>
            </TransitionGroup>
            
            <div v-if="latestEvents.length === 0" class="text-center py-4 text-gray-500 text-sm">
              No events yet...
            </div>
            </div>
            <!-- Gradient fade indicator -->
            <div v-if="latestEvents.length > 4" class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-800/50 to-transparent pointer-events-none rounded-b-lg"></div>
          </div>
        </div>

        <!-- Column 2: Key Metrics -->
        <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
          <h4 class="text-sm font-semibold text-gray-300 mb-2 flex items-center">
            <span class="mr-1">📊</span>
            Key Metrics
          </h4>
          
          <div class="grid grid-cols-2 gap-2">
            <!-- Events Per Minute -->
            <div class="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Events/min</span>
                <span class="text-xs" :class="metrics.eventsPerMinute > 50 ? 'text-yellow-500' : 'text-green-500'">
                  {{ metrics.eventsPerMinute > 50 ? '⚠️' : '✅' }}
                </span>
              </div>
              <div class="text-xl font-bold text-white">
                {{ metrics.eventsPerMinute }}
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ metrics.trend }}
              </div>
            </div>

            <!-- Error Rate -->
            <div class="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Error Rate</span>
                <span class="text-xs" :class="metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'">
                  {{ metrics.errorRate > 5 ? '🚨' : '✅' }}
                </span>
              </div>
              <div class="text-xl font-bold" :class="metrics.errorRate > 5 ? 'text-red-400' : 'text-white'">
                {{ metrics.errorRate }}%
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ metrics.errorCount }} errors
              </div>
            </div>

            <!-- Active Sessions -->
            <div class="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Sessions</span>
                <span class="text-xs text-blue-500">🔗</span>
              </div>
              <div class="text-xl font-bold text-white">
                {{ metrics.activeSessions }}
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                active now
              </div>
            </div>

            <!-- Total Events -->
            <div class="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Total Events</span>
                <span class="text-xs text-purple-500">📈</span>
              </div>
              <div class="text-xl font-bold text-white">
                {{ formatNumber(metrics.totalEvents) }}
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                last 5 min
              </div>
            </div>
          </div>

          <!-- Event Type Distribution -->
          <div class="mt-3">
            <div class="text-xs text-gray-400 mb-1">Event Distribution</div>
            <div class="space-y-1">
              <div 
                v-for="type in topEventTypes"
                :key="type.name"
                class="flex items-center space-x-2"
              >
                <span class="text-xs">{{ type.emoji }}</span>
                <div class="flex-1 bg-gray-900/50 rounded-full h-4 overflow-hidden">
                  <div 
                    class="h-full transition-all duration-500"
                    :style="{ 
                      width: type.percentage + '%',
                      backgroundColor: type.color
                    }"
                  ></div>
                </div>
                <span class="text-xs text-gray-400 w-10 text-right">{{ type.percentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 3: Active Sessions -->
        <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-gray-300 flex items-center">
              <span class="mr-1">👥</span>
              Active Sessions
            </h4>
            <button
              @click="$emit('viewAllSessions')"
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all →
            </button>
          </div>
          
          <div class="relative">
            <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            <div
              v-for="session in activeSessions.slice(0, 5)"
              :key="session.id"
              class="flex items-center justify-between p-1.5 bg-gray-900/50 rounded border border-gray-700/50 hover:border-gray-600 transition-all duration-200 cursor-pointer group"
              @click="$emit('selectSession', session.id)"
            >
              <div class="flex items-center space-x-2">
                <div 
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: session.color }"
                ></div>
                <div>
                  <div class="text-xs font-semibold text-white">
                    {{ session.display }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ session.app }}
                  </div>
                </div>
              </div>
              
              <div class="text-right">
                <div class="flex items-center space-x-1">
                  <div 
                    class="w-1 h-3 rounded-full"
                    :class="session.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'"
                  ></div>
                  <span class="text-xs font-mono text-gray-400">
                    {{ session.eventCount }}
                  </span>
                </div>
                <div class="text-xs text-gray-500">
                  {{ session.duration }}
                </div>
              </div>
            </div>
            
            <div v-if="activeSessions.length === 0" class="text-center py-4 text-gray-500 text-sm">
              No active sessions
            </div>
            </div>
            <!-- Gradient fade indicator -->
            <div v-if="activeSessions.length > 4" class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-800/50 to-transparent pointer-events-none rounded-b-lg"></div>
          </div>
          
          <!-- Session Activity Sparkline -->
          <div class="mt-3 pt-3 border-t border-gray-700/50">
            <div class="text-xs text-gray-400 mb-1">Session Activity (1 min)</div>
            <div class="h-8 flex items-end space-x-0.5">
              <div
                v-for="(bar, index) in activitySparkline"
                :key="index"
                class="flex-1 bg-blue-500/50 rounded-t transition-all duration-300"
                :style="{ height: bar + '%' }"
                :title="`${bar}% activity`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Alert Bar (if any critical events) -->
      <TransitionGroup name="alert">
        <div
          v-if="criticalAlert"
          class="mt-3 p-2 bg-red-900/20 border border-red-700/50 rounded-lg flex items-center justify-between"
        >
          <div class="flex items-center space-x-2">
            <span class="text-red-500 animate-pulse">🚨</span>
            <span class="text-sm text-red-300">{{ criticalAlert.message }}</span>
            <span class="text-xs text-red-400 ml-2">{{ criticalAlert.time }}</span>
          </div>
          <button
            @click="dismissAlert"
            class="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { HookEvent } from '../types';

const props = defineProps<{
  events: HookEvent[];
  getSessionColor: (sessionId: string) => string;
  getAppColor: (appName: string) => string;
}>();

const emit = defineEmits<{
  selectSession: [sessionId: string];
  viewAllSessions: [];
}>();

// State
const currentTime = ref(new Date().toLocaleTimeString());
const criticalAlert = ref<{ message: string; time: string } | null>(null);

// Update time every second
let timeInterval: number;
onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString();
  }, 1000) as unknown as number;
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});

// Event emojis
const eventEmojis: Record<string, string> = {
  'PreToolUse': '🔧',
  'PostToolUse': '✅',
  'Notification': '🔔',
  'Stop': '🛑',
  'SubagentStop': '👥',
  'PreCompact': '📦',
  'UserPromptSubmit': '💬'
};

const eventColors: Record<string, string> = {
  'PreToolUse': '#3B82F6',
  'PostToolUse': '#10B981',
  'Notification': '#F59E0B',
  'Stop': '#EF4444',
  'SubagentStop': '#8B5CF6',
  'PreCompact': '#6366F1',
  'UserPromptSubmit': '#EC4899'
};

// Computed
const latestEvents = computed(() => {
  return [...props.events].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
});

const metrics = computed(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const oneMinuteAgo = now - 60 * 1000;
  
  const recentEvents = props.events.filter(e => (e.timestamp || 0) > fiveMinutesAgo);
  const lastMinuteEvents = props.events.filter(e => (e.timestamp || 0) > oneMinuteAgo);
  
  const errorEvents = recentEvents.filter(e => 
    e.hook_event_type === 'Stop' || 
    e.hook_event_type === 'SubagentStop' ||
    e.payload?.error
  );
  
  const uniqueSessions = new Set(recentEvents.map(e => e.session_id));
  
  const eventsPerMinute = lastMinuteEvents.length;
  const trend = eventsPerMinute > 30 ? '📈 High' : eventsPerMinute > 10 ? '➡️ Normal' : '📉 Low';
  
  return {
    totalEvents: recentEvents.length,
    eventsPerMinute,
    errorRate: recentEvents.length > 0 ? Math.round((errorEvents.length / recentEvents.length) * 100) : 0,
    errorCount: errorEvents.length,
    activeSessions: uniqueSessions.size,
    trend
  };
});

const topEventTypes = computed(() => {
  const typeCounts = new Map<string, number>();
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const recentEvents = props.events.filter(e => (e.timestamp || 0) > fiveMinutesAgo);
  
  recentEvents.forEach(event => {
    const count = typeCounts.get(event.hook_event_type) || 0;
    typeCounts.set(event.hook_event_type, count + 1);
  });
  
  const total = recentEvents.length || 1;
  
  return Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({
      name: type,
      count,
      percentage: Math.round((count / total) * 100),
      emoji: eventEmojis[type] || '❓',
      color: eventColors[type] || '#666'
    }));
});

const activeSessions = computed(() => {
  const sessionMap = new Map<string, any>();
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  props.events
    .filter(e => (e.timestamp || 0) > fiveMinutesAgo)
    .forEach(event => {
      if (!sessionMap.has(event.session_id)) {
        const parts = event.session_id.split('_');
        let display = event.session_id.slice(0, 8);
        if (parts.length >= 3) {
          display = `${parts[0].slice(0, 6)}:${parts[1]}`;
        }
        
        sessionMap.set(event.session_id, {
          id: event.session_id,
          display,
          color: props.getSessionColor(event.session_id),
          app: event.source_app,
          eventCount: 0,
          firstEvent: event.timestamp || 0,
          lastEvent: event.timestamp || 0
        });
      }
      
      const session = sessionMap.get(event.session_id)!;
      session.eventCount++;
      session.lastEvent = Math.max(session.lastEvent, event.timestamp || 0);
      if (!session.app.includes(event.source_app) && session.app !== event.source_app) {
        session.app = 'Multiple';
      }
    });
  
  return Array.from(sessionMap.values())
    .map(session => {
      const duration = session.lastEvent - session.firstEvent;
      const isActive = now - session.lastEvent < 30000; // Active if event in last 30s
      
      return {
        ...session,
        isActive,
        duration: formatDuration(duration)
      };
    })
    .sort((a, b) => b.lastEvent - a.lastEvent);
});

const activitySparkline = computed(() => {
  const now = Date.now();
  const buckets = 12; // 12 x 5 second buckets = 1 minute
  const bucketSize = 5000; // 5 seconds
  
  const counts = new Array(buckets).fill(0);
  
  props.events.forEach(event => {
    const age = now - (event.timestamp || 0);
    const bucketIndex = Math.floor(age / bucketSize);
    if (bucketIndex >= 0 && bucketIndex < buckets) {
      counts[buckets - 1 - bucketIndex]++;
    }
  });
  
  const max = Math.max(...counts, 1);
  return counts.map(count => Math.round((count / max) * 100));
});

// Check for critical events
const checkCriticalEvents = () => {
  const lastEvent = latestEvents.value[0];
  if (lastEvent && lastEvent.hook_event_type === 'Stop' && lastEvent.payload?.error) {
    criticalAlert.value = {
      message: `Error in ${lastEvent.source_app}: ${lastEvent.payload.error}`,
      time: new Date(lastEvent.timestamp || 0).toLocaleTimeString()
    };
  }
};

// Helper functions
const getEventEmoji = (type: string) => eventEmojis[type] || '❓';

const getToolName = (event: HookEvent) => {
  if (event.payload?.tool_name) return event.payload.tool_name;
  if (event.hook_event_type === 'UserPromptSubmit') return 'User Input';
  return '';
};

const getSessionShort = (sessionId: string) => {
  const parts = sessionId.split('_');
  if (parts.length >= 3) {
    return `${parts[0].slice(0, 4)}:${parts[1]}`;
  }
  return sessionId.slice(0, 6);
};

const getRelativeTime = (timestamp?: number) => {
  if (!timestamp) return 'now';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
};

const formatNumber = (num: number) => {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const dismissAlert = () => {
  criticalAlert.value = null;
};

// Check for critical events periodically
onMounted(() => {
  checkCriticalEvents();
  setInterval(checkCriticalEvents, 5000);
});
</script>

<style scoped>
/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Event feed animation */
.event-feed-enter-active,
.event-feed-leave-active {
  transition: all 0.3s ease;
}

.event-feed-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.event-feed-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Alert animation */
.alert-enter-active,
.alert-leave-active {
  transition: all 0.3s ease;
}

.alert-enter-from,
.alert-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>