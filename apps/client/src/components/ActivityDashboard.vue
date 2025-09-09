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
          <!-- Collapse Button -->
          <button
            @click="toggleCollapse"
            class="text-gray-400 hover:text-white transition-colors p-1 ml-2"
            :title="isCollapsed ? 'Expand Activity Dashboard' : 'Collapse Activity Dashboard'"
          >
            <svg 
              class="w-4 h-4 transform transition-transform duration-200"
              :class="{ 'rotate-180': isCollapsed }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Collapsed Summary View -->
      <Transition name="fade">
        <div v-if="isCollapsed" class="mt-3">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- Events Per Minute -->
            <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
              <div class="flex items-center space-x-2">
                <span class="text-sm" :class="metrics.eventsPerMinute > 50 ? 'text-yellow-500' : 'text-green-500'">
                  {{ metrics.eventsPerMinute > 50 ? '⚠️' : '📡' }}
                </span>
                <div>
                  <div class="text-lg font-bold text-white">{{ metrics.eventsPerMinute }}</div>
                  <div class="text-xs text-gray-400">events/min</div>
                </div>
              </div>
            </div>

            <!-- Error Rate -->
            <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
              <div class="flex items-center space-x-2">
                <span class="text-sm" :class="metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'">
                  {{ metrics.errorRate > 5 ? '🚨' : '✅' }}
                </span>
                <div>
                  <div class="text-lg font-bold" :class="metrics.errorRate > 5 ? 'text-red-400' : 'text-white'">
                    {{ metrics.errorRate }}%
                  </div>
                  <div class="text-xs text-gray-400">error rate</div>
                </div>
              </div>
            </div>

            <!-- Active Sessions -->
            <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
              <div class="flex items-center space-x-2">
                <span class="text-sm text-blue-500">👥</span>
                <div>
                  <div class="text-lg font-bold text-white">{{ metrics.activeSessions }}</div>
                  <div class="text-xs text-gray-400">sessions</div>
                </div>
              </div>
            </div>

            <!-- Total Events -->
            <div class="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
              <div class="flex items-center space-x-2">
                <span class="text-sm text-purple-500">📈</span>
                <div>
                  <div class="text-lg font-bold text-white">{{ formatNumber(metrics.totalEvents) }}</div>
                  <div class="text-xs text-gray-400">events</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Responsive Main Grid -->
      <Transition name="collapse">
        <div v-show="!isCollapsed" class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Column 1: Real-time Event Feed (responsive width) -->
        <div class="lg:col-span-4 bg-gray-800/50 rounded-lg border border-gray-700 p-3">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-300 flex items-center">
              <span class="mr-1">📡</span>
              Live Events
            </h4>
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span class="text-xs text-gray-500">{{ latestEvents.length > 5 ? '5+' : latestEvents.length }}</span>
            </div>
          </div>
          
          <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            <TransitionGroup name="event-feed">
              <div
                v-for="event in latestEvents.slice(0, 5)"
                :key="`${event.id}-${event.timestamp}`"
                class="flex items-center space-x-2 p-2 bg-gray-900/50 rounded border border-gray-700/50 hover:border-gray-600 transition-all duration-200 group"
              >
                <!-- Event Type Icon -->
                <div class="text-sm flex-shrink-0">
                  {{ getEventEmoji(event.hook_event_type) }}
                </div>
                
                <!-- Event Details (improved layout) -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-white truncate">
                      {{ event.hook_event_type }}
                    </span>
                    <!-- App Badge (compact) -->
                    <div 
                      class="w-5 h-5 rounded text-xs font-bold flex items-center justify-center flex-shrink-0"
                      :style="{ 
                        backgroundColor: getAppColor(event.source_app) + '30',
                        color: getAppColor(event.source_app)
                      }"
                      :title="event.source_app"
                    >
                      {{ event.source_app.charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div class="flex items-center space-x-2 mt-1">
                    <div 
                      class="w-1.5 h-1.5 rounded-full"
                      :style="{ backgroundColor: getSessionColor(event.session_id) }"
                    ></div>
                    <span class="text-xs text-gray-400 font-mono truncate">
                      {{ getSessionShort(event.session_id) }}
                    </span>
                    <span class="text-gray-600 text-xs">•</span>
                    <span class="text-xs text-gray-400">
                      {{ getRelativeTime(event.timestamp) }}
                    </span>
                  </div>
                </div>
              </div>
            </TransitionGroup>
            
            <div v-if="latestEvents.length === 0" class="text-center py-8 text-gray-500 text-sm">
              <div class="text-2xl mb-2">📡</div>
              Waiting for events...
            </div>
          </div>
        </div>

        <!-- Column 2: Key Metrics (adaptive grid) -->
        <div class="lg:col-span-5 bg-gray-800/50 rounded-lg border border-gray-700 p-3">
          <h4 class="text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <span class="mr-1">📊</span>
            Key Metrics
          </h4>
          
          <!-- Compact 2x3 Grid -->
          <div class="grid grid-cols-2 gap-3">
            <!-- Events Per Minute -->
            <div class="bg-gray-900/50 rounded p-3 border border-gray-700/50 hover:border-gray-600 transition-colors">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Events/min</span>
                <span class="text-sm" :class="metrics.eventsPerMinute > 50 ? 'text-yellow-500' : 'text-green-500'">
                  {{ metrics.eventsPerMinute > 50 ? '⚠️' : '✅' }}
                </span>
              </div>
              <div class="text-lg font-bold text-white">
                {{ metrics.eventsPerMinute }}
              </div>
              <div class="text-xs text-gray-500">
                {{ metrics.trend }}
              </div>
            </div>

            <!-- Error Rate -->
            <div class="bg-gray-900/50 rounded p-3 border border-gray-700/50 hover:border-gray-600 transition-colors">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Error Rate</span>
                <span class="text-sm" :class="metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'">
                  {{ metrics.errorRate > 5 ? '🚨' : '✅' }}
                </span>
              </div>
              <div class="text-lg font-bold" :class="metrics.errorRate > 5 ? 'text-red-400' : 'text-white'">
                {{ metrics.errorRate }}%
              </div>
              <div class="text-xs text-gray-500">
                {{ metrics.errorCount }} errors
              </div>
            </div>

            <!-- Active Sessions -->
            <div class="bg-gray-900/50 rounded p-3 border border-gray-700/50 hover:border-gray-600 transition-colors">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Sessions</span>
                <span class="text-sm text-blue-500">🔗</span>
              </div>
              <div class="text-lg font-bold text-white">
                {{ metrics.activeSessions }}
              </div>
              <div class="text-xs text-gray-500">
                active now
              </div>
            </div>

            <!-- Total Events -->
            <div class="bg-gray-900/50 rounded p-3 border border-gray-700/50 hover:border-gray-600 transition-colors">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Total Events</span>
                <span class="text-sm text-purple-500">📈</span>
              </div>
              <div class="text-lg font-bold text-white">
                {{ formatNumber(metrics.totalEvents) }}
              </div>
              <div class="text-xs text-gray-500">
                last 5 min
              </div>
            </div>
          </div>

          <!-- Compact Event Distribution -->
          <div class="mt-4 pt-3 border-t border-gray-700/50">
            <div class="text-xs text-gray-400 mb-2">Top Event Types</div>
            <div class="space-y-1.5">
              <div 
                v-for="type in topEventTypes.slice(0, 3)"
                :key="type.name"
                class="flex items-center space-x-2"
              >
                <span class="text-xs">{{ type.emoji }}</span>
                <span class="text-xs text-gray-300 flex-1 truncate">{{ type.name }}</span>
                <div class="w-12 bg-gray-900/50 rounded-full h-2 overflow-hidden">
                  <div 
                    class="h-full transition-all duration-500"
                    :style="{ 
                      width: type.percentage + '%',
                      backgroundColor: type.color
                    }"
                  ></div>
                </div>
                <span class="text-xs text-gray-400 w-8 text-right">{{ type.percentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 3: Active Sessions (adaptive width) -->
        <div class="lg:col-span-3 bg-gray-800/50 rounded-lg border border-gray-700 p-3">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-300 flex items-center">
              <span class="mr-1">👥</span>
              Sessions
            </h4>
            <button
              @click="$emit('viewAllSessions')"
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all →
            </button>
          </div>
          
          <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            <div
              v-for="session in activeSessions.slice(0, 6)"
              :key="session.id"
              class="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-700/50 hover:border-gray-600 transition-all duration-200 cursor-pointer group"
              @click="$emit('selectSession', session.id)"
            >
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <div class="flex items-center space-x-1">
                  <div 
                    class="w-2 h-2 rounded-full"
                    :style="{ backgroundColor: session.color }"
                  ></div>
                  <div 
                    class="w-1 h-3 rounded-full"
                    :class="session.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'"
                  ></div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-semibold text-white truncate">
                    {{ session.display }}
                  </div>
                  <div class="text-xs text-gray-500 truncate">
                    {{ session.app }}
                  </div>
                </div>
              </div>
              
              <div class="text-right text-xs">
                <div class="text-gray-400 font-mono">
                  {{ session.eventCount }}
                </div>
                <div class="text-gray-500">
                  {{ session.duration }}
                </div>
              </div>
            </div>
            
            <div v-if="activeSessions.length === 0" class="text-center py-8 text-gray-500 text-sm">
              <div class="text-2xl mb-2">👥</div>
              No active sessions
            </div>
          </div>
          
          <!-- Mini Activity Sparkline -->
          <div class="mt-3 pt-3 border-t border-gray-700/50">
            <div class="text-xs text-gray-400 mb-1">Activity (1m)</div>
            <div class="h-6 flex items-end space-x-0.5">
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
      </Transition>

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

defineEmits<{
  selectSession: [sessionId: string];
  viewAllSessions: [];
}>();

// State
const currentTime = ref(new Date().toLocaleTimeString());
const criticalAlert = ref<{ message: string; time: string } | null>(null);
const isCollapsed = ref<boolean>(false);

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

// Toggle main component collapse
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
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

/* Collapse transition for entire dashboard */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.4s ease;
  transform-origin: top;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  transform: scaleY(0);
  max-height: 0;
  overflow: hidden;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  transform: scaleY(1);
  max-height: 1000px;
}

/* Fade transition for summary */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>