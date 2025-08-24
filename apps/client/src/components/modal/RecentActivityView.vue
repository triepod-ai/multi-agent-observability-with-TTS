<template>
  <div class="recent-activity">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="text-gray-400">Loading recent activity...</p>
    </div>

    <!-- No Data State -->
    <div v-else-if="!events?.length" class="no-data-state">
      <div class="no-data-icon">📭</div>
      <p class="text-gray-400">No recent activity found for this hook</p>
    </div>

    <!-- Activity Content -->
    <div v-else class="activity-content">
      <!-- Activity Summary -->
      <div class="activity-summary">
        <h3 class="section-title">Activity Summary (Last 24h)</h3>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-icon">📊</span>
            <span class="stat-text">{{ events.length }} executions</span>
          </div>
          <div class="summary-stat">
            <span class="stat-icon">🏢</span>
            <span class="stat-text">{{ uniqueSourceApps.length }} applications</span>
          </div>
          <div class="summary-stat">
            <span class="stat-icon">🔗</span>
            <span class="stat-text">{{ uniqueSessions.length }} sessions</span>
          </div>
          <div v-if="totalTokens" class="summary-stat">
            <span class="stat-icon">🪙</span>
            <span class="stat-text">{{ formatNumber(totalTokens) }} tokens</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="activity-filters">
        <div class="filter-group">
          <label class="filter-label">Filter by Application:</label>
          <select v-model="selectedApp" class="filter-select">
            <option value="">All Applications</option>
            <option v-for="app in uniqueSourceApps" :key="app" :value="app">
              {{ formatAppName(app) }}
            </option>
          </select>
        </div>
        
        <div class="filter-group" v-if="uniqueAgentTypes.length">
          <label class="filter-label">Filter by Agent Type:</label>
          <select v-model="selectedAgentType" class="filter-select">
            <option value="">All Agent Types</option>
            <option v-for="type in uniqueAgentTypes" :key="type" :value="type">
              {{ formatAgentType(type) }}
            </option>
          </select>
        </div>
      </div>

      <!-- Activity Timeline -->
      <div class="activity-timeline">
        <h3 class="section-title">Recent Executions</h3>
        <div class="timeline-container">
          <div 
            v-for="event in filteredEvents.slice(0, displayLimit)" 
            :key="event.id || `${event.timestamp}-${event.session_id}`"
            class="timeline-item"
            :class="{ 'has-error': event.error }"
          >
            <!-- Timeline Marker -->
            <div class="timeline-marker">
              <div class="marker-dot" :class="getMarkerClass(event)"></div>
              <div class="timeline-time">{{ formatTime(event.timestamp) }}</div>
            </div>
            
            <!-- Event Details -->
            <div class="timeline-content">
              <div class="event-header">
                <span class="source-app-badge">{{ formatAppName(event.source_app) }}</span>
                <span v-if="event.payload?.agent_name" class="agent-badge">
                  {{ event.payload.agent_name }}
                </span>
                <span v-if="event.duration" class="duration-badge">
                  {{ formatDuration(event.duration) }}
                </span>
                <span v-if="event.error" class="error-badge">ERROR</span>
              </div>
              
              <div class="event-details">
                <!-- Tool Usage -->
                <div v-if="event.payload?.tool_name" class="detail-item">
                  <span class="detail-icon">🔧</span>
                  <span class="detail-label">Tool:</span>
                  <span class="detail-value">{{ event.payload.tool_name }}</span>
                  <span v-if="event.payload.tool_input" class="tool-params">
                    {{ summarizeToolInput(event.payload.tool_input) }}
                  </span>
                </div>
                
                <!-- Agent Context -->
                <div v-if="event.payload?.agent_type" class="detail-item">
                  <span class="detail-icon">🤖</span>
                  <span class="detail-label">Agent:</span>
                  <span class="detail-value">{{ formatAgentType(event.payload.agent_type) }}</span>
                  <span v-if="event.payload.delegation_type" class="delegation-type">
                    ({{ event.payload.delegation_type }})
                  </span>
                </div>
                
                <!-- Session Context -->
                <div v-if="event.session_depth" class="detail-item">
                  <span class="detail-icon">🔗</span>
                  <span class="detail-label">Session depth:</span>
                  <span class="detail-value">{{ event.session_depth }}</span>
                  <span v-if="event.parent_session_id" class="parent-session">
                    (child of {{ event.parent_session_id.slice(0, 8) }}...)
                  </span>
                </div>
                
                <!-- Performance Data -->
                <div class="performance-details">
                  <span v-if="event.payload?.tokens || event.payload?.token_count" class="perf-item">
                    <span class="perf-icon">🪙</span>
                    {{ formatNumber(event.payload.tokens || event.payload.token_count || 0) }} tokens
                  </span>
                  <span v-if="event.payload?.memory_usage" class="perf-item">
                    <span class="perf-icon">💾</span>
                    {{ formatMemory(event.payload.memory_usage) }}
                  </span>
                  <span v-if="event.payload?.metadata?.environment" class="perf-item">
                    <span class="perf-icon">🌍</span>
                    {{ event.payload.metadata.environment }}
                  </span>
                </div>
                
                <!-- Error Details -->
                <div v-if="event.error && typeof event.error === 'string'" class="error-details">
                  <span class="detail-icon">⚠️</span>
                  <span class="error-message">{{ event.error }}</span>
                </div>
                
                <!-- Summary or Description -->
                <div v-if="event.summary" class="event-summary">
                  <span class="detail-icon">📋</span>
                  <span class="summary-text">{{ truncateText(event.summary, 120) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Load More Button -->
        <div v-if="filteredEvents.length > displayLimit" class="load-more-container">
          <button @click="loadMore" class="load-more-btn">
            Load More Events ({{ filteredEvents.length - displayLimit }} remaining)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookStatus, HookEvent } from '../../types';

interface Props {
  hook: HookStatus | null;
  events: HookEvent[];
  loading: boolean;
}

const props = defineProps<Props>();

// Filter state
const selectedApp = ref('');
const selectedAgentType = ref('');
const displayLimit = ref(20);

// Computed properties
const uniqueSourceApps = computed(() => 
  [...new Set(props.events.map(e => e.source_app))].sort()
);

const uniqueSessions = computed(() => 
  [...new Set(props.events.map(e => e.session_id))]
);

const uniqueAgentTypes = computed(() => {
  const types = props.events
    .map(e => e.payload?.agent_type)
    .filter(Boolean)
    .filter((type): type is string => typeof type === 'string');
  return [...new Set(types)].sort();
});

const totalTokens = computed(() => 
  props.events.reduce((sum, e) => 
    sum + (e.payload?.tokens || e.payload?.token_count || 0), 0)
);

const filteredEvents = computed(() => {
  let filtered = [...props.events];
  
  if (selectedApp.value) {
    filtered = filtered.filter(e => e.source_app === selectedApp.value);
  }
  
  if (selectedAgentType.value) {
    filtered = filtered.filter(e => e.payload?.agent_type === selectedAgentType.value);
  }
  
  // Sort by timestamp descending
  return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
});

// Methods
function loadMore() {
  displayLimit.value += 20;
}

function formatTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatMemory(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return bytes + 'B';
}

function formatAppName(app: string): string {
  return app.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatAgentType(type: string): string {
  return type.split(/[-_]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getMarkerClass(event: HookEvent): string {
  if (event.error) return 'error';
  if (event.payload?.agent_type) return 'agent';
  return 'normal';
}

function summarizeToolInput(input: any): string {
  if (!input || typeof input !== 'object') return '';
  
  const keys = Object.keys(input);
  if (keys.length === 0) return '';
  
  // Show first few key-value pairs
  const summary = keys.slice(0, 2).map(key => {
    const value = input[key];
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const truncatedValue = stringValue.length > 30 ? stringValue.slice(0, 30) + '...' : stringValue;
    return `${key}: ${truncatedValue}`;
  }).join(', ');
  
  return keys.length > 2 ? `${summary}...` : summary;
}
</script>

<style scoped>
.recent-activity {
  @apply space-y-6;
}

/* Loading and No Data States */
.loading-state, .no-data-state {
  @apply flex flex-col items-center justify-center py-16 space-y-4;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin;
}

.no-data-icon {
  @apply text-4xl mb-2;
}

/* Section Title */
.section-title {
  @apply text-lg font-semibold text-white mb-4;
}

/* Activity Summary */
.activity-summary {
  @apply bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6;
}

.summary-stats {
  @apply flex flex-wrap gap-4 mt-3;
}

.summary-stat {
  @apply flex items-center space-x-2 text-sm text-gray-300;
}

.stat-icon {
  @apply text-base;
}

/* Filters */
.activity-filters {
  @apply flex flex-wrap gap-4 mb-6 p-4 bg-gray-900/30 border border-gray-700 rounded-lg;
}

.filter-group {
  @apply flex items-center space-x-2;
}

.filter-label {
  @apply text-sm text-gray-400 whitespace-nowrap;
}

.filter-select {
  @apply bg-gray-800 border border-gray-600 text-white text-sm rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

/* Timeline */
.timeline-container {
  @apply space-y-4;
}

.timeline-item {
  @apply flex space-x-4 p-4 bg-gray-900/30 border border-gray-700 rounded-lg;
}

.timeline-item.has-error {
  @apply border-red-700/50 bg-red-900/10;
}

.timeline-marker {
  @apply flex flex-col items-center space-y-2 flex-shrink-0;
}

.marker-dot {
  @apply w-3 h-3 rounded-full;
}

.marker-dot.normal {
  @apply bg-blue-500;
}

.marker-dot.agent {
  @apply bg-green-500;
}

.marker-dot.error {
  @apply bg-red-500;
}

.timeline-time {
  @apply text-xs text-gray-500 whitespace-nowrap;
}

.timeline-content {
  @apply flex-1 min-w-0;
}

/* Event Header */
.event-header {
  @apply flex flex-wrap items-center gap-2 mb-3;
}

.source-app-badge {
  @apply px-2 py-1 bg-blue-600/20 border border-blue-600/30 text-blue-300 text-xs rounded;
}

.agent-badge {
  @apply px-2 py-1 bg-green-600/20 border border-green-600/30 text-green-300 text-xs rounded;
}

.duration-badge {
  @apply px-2 py-1 bg-yellow-600/20 border border-yellow-600/30 text-yellow-300 text-xs rounded;
}

.error-badge {
  @apply px-2 py-1 bg-red-600/20 border border-red-600/30 text-red-300 text-xs rounded font-medium;
}

/* Event Details */
.event-details {
  @apply space-y-2;
}

.detail-item {
  @apply flex items-center space-x-2 text-sm text-gray-300;
}

.detail-icon {
  @apply text-base flex-shrink-0;
}

.detail-label {
  @apply text-gray-400 font-medium;
}

.detail-value {
  @apply text-gray-200;
}

.tool-params {
  @apply text-gray-500 text-xs ml-2;
}

.delegation-type {
  @apply text-gray-500 text-xs;
}

.parent-session {
  @apply text-gray-500 text-xs;
}

/* Performance Details */
.performance-details {
  @apply flex flex-wrap gap-3 text-sm;
}

.perf-item {
  @apply flex items-center space-x-1 text-gray-400;
}

.perf-icon {
  @apply text-sm;
}

/* Error Details */
.error-details {
  @apply flex items-start space-x-2 text-sm p-3 bg-red-900/20 border border-red-700/30 rounded;
}

.error-message {
  @apply text-red-300;
}

/* Event Summary */
.event-summary {
  @apply flex items-start space-x-2 text-sm p-3 bg-gray-800/50 rounded;
}

.summary-text {
  @apply text-gray-300 leading-relaxed;
}

/* Load More */
.load-more-container {
  @apply text-center mt-6;
}

.load-more-btn {
  @apply px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors;
}

/* Responsive Design */
@media (max-width: 768px) {
  .activity-filters {
    @apply flex-col space-y-3;
  }
  
  .filter-group {
    @apply flex-col items-start space-y-1 space-x-0;
  }
  
  .timeline-item {
    @apply flex-col space-x-0 space-y-3;
  }
  
  .timeline-marker {
    @apply flex-row items-center space-y-0 space-x-3;
  }
  
  .event-header {
    @apply flex-col items-start gap-1;
  }
  
  .performance-details {
    @apply flex-col gap-1;
  }
}
</style>