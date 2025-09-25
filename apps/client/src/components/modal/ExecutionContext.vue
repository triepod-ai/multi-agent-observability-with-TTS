<template>
  <div class="execution-context">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="text-gray-400">Loading execution context...</p>
    </div>

    <!-- No Data State -->
    <div v-else-if="!context" class="no-data-state">
      <div class="no-data-icon">🔍</div>
      <p class="text-gray-400">No execution context data available</p>
    </div>

    <!-- Context Content -->
    <div v-else class="context-content">
      <!-- Application Context -->
      <div class="context-section">
        <h3 class="section-title">
          <span class="title-icon">🏢</span>
          Application Environment
        </h3>
        <div class="context-grid">
          <div class="context-item">
            <label class="context-label">Active Applications:</label>
            <div class="app-badges">
              <span 
                v-for="app in context.sourceApps" 
                :key="app"
                class="app-badge"
                :title="`Application: ${formatAppName(app)}`"
              >
                {{ formatAppName(app) }}
              </span>
            </div>
          </div>
          
          <div class="context-item">
            <label class="context-label">Active Sessions:</label>
            <div class="session-info">
              <span class="session-count">{{ context.activeSessions.length }} sessions</span>
              <div class="session-details">
                <span v-if="context.sessionDepthRange.min !== context.sessionDepthRange.max">
                  Depth: {{ context.sessionDepthRange.min }}-{{ context.sessionDepthRange.max }}
                </span>
                <span v-else-if="context.sessionDepthRange.min > 0">
                  Depth: {{ context.sessionDepthRange.min }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="context-item" v-if="context.executionEnvironments?.length">
            <label class="context-label">Environments:</label>
            <div class="env-badges">
              <span 
                v-for="env in context.executionEnvironments" 
                :key="env"
                class="env-badge"
              >
                {{ env }}
              </span>
            </div>
          </div>
          
          <div class="context-item" v-if="context.userContext?.length">
            <label class="context-label">Users:</label>
            <div class="user-badges">
              <span 
                v-for="user in context.userContext" 
                :key="user"
                class="user-badge"
              >
                {{ user }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tool Usage Context -->
      <div v-if="context.toolUsage?.length" class="context-section">
        <h3 class="section-title">
          <span class="title-icon">🔧</span>
          Tool Usage Patterns
        </h3>
        <div class="tool-usage-list">
          <div 
            v-for="tool in context.toolUsage.slice(0, 8)" 
            :key="tool.name"
            class="tool-usage-item"
          >
            <div class="tool-header">
              <div class="tool-identity">
                <span class="tool-icon">{{ getToolIcon(tool.name) }}</span>
                <span class="tool-name">{{ tool.name }}</span>
              </div>
              <div class="tool-stats">
                <span class="usage-count">{{ tool.count }} uses</span>
                <span class="success-rate" :class="getSuccessRateClass(tool.successRate)">
                  {{ tool.successRate }}% success
                </span>
              </div>
            </div>
            
            <div class="tool-details">
              <div v-if="tool.commonParams?.length" class="tool-params">
                <strong>Common parameters:</strong>
                <div class="param-tags">
                  <span 
                    v-for="param in tool.commonParams.slice(0, 5)" 
                    :key="param"
                    class="param-tag"
                  >
                    {{ param }}
                  </span>
                </div>
              </div>
              
              <div class="tool-performance">
                <span class="perf-item">
                  <span class="perf-icon">⏱️</span>
                  Avg: {{ formatDuration(tool.avgDuration) }}
                </span>
                <span class="perf-item">
                  <span class="perf-icon">🎯</span>
                  {{ tool.successRate }}% reliable
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Agent Activity Context -->
      <div v-if="context.agentActivity?.length" class="context-section">
        <h3 class="section-title">
          <span class="title-icon">🤖</span>
          Agent Activity
        </h3>
        <div class="agent-activity-list">
          <div 
            v-for="agent in context.agentActivity.slice(0, 10)" 
            :key="agent.id"
            class="agent-activity-item"
          >
            <div class="agent-header">
              <div class="agent-identity">
                <span class="agent-icon">{{ getAgentIcon(agent.type) }}</span>
                <div class="agent-names">
                  <span class="agent-name">{{ agent.name }}</span>
                  <span class="agent-type">{{ formatAgentType(agent.type) }}</span>
                </div>
              </div>
              <div class="agent-badge">{{ agent.executions }} runs</div>
            </div>
            
            <div class="agent-stats">
              <div class="stat-item">
                <span class="stat-icon">⏱️</span>
                <span class="stat-label">Avg Duration:</span>
                <span class="stat-value">{{ formatDuration(agent.avgDuration) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🪙</span>
                <span class="stat-label">Total Tokens:</span>
                <span class="stat-value">{{ formatNumber(agent.totalTokens) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Session Context -->
      <div v-if="context.sessionContext" class="context-section">
        <h3 class="section-title">
          <span class="title-icon">🔗</span>
          Session Context
        </h3>
        <div class="session-context-grid">
          <div class="session-context-card">
            <div class="context-card-header">
              <span class="card-icon">🌳</span>
              <span class="card-title">Session Hierarchy</span>
            </div>
            <div class="context-card-content">
              <div class="hierarchy-stats">
                <div class="hierarchy-stat">
                  <span class="hierarchy-label">Max Depth:</span>
                  <span class="hierarchy-value">{{ context.sessionContext?.maxDepth || context.sessionDepthRange?.max || 0 }}</span>
                </div>
                <div class="hierarchy-stat">
                  <span class="hierarchy-label">Parent Sessions:</span>
                  <span class="hierarchy-value">{{ context.sessionContext?.parentSessions || 0 }}</span>
                </div>
                <div class="hierarchy-stat">
                  <span class="hierarchy-label">Child Sessions:</span>
                  <span class="hierarchy-value">{{ context.sessionContext?.childSessions || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="session-context-card" v-if="context.delegationPatterns?.length">
            <div class="context-card-header">
              <span class="card-icon">🎯</span>
              <span class="card-title">Delegation Patterns</span>
            </div>
            <div class="context-card-content">
              <div class="delegation-list">
                <div 
                  v-for="pattern in context.delegationPatterns.slice(0, 4)" 
                  :key="pattern.type"
                  class="delegation-item"
                >
                  <span class="delegation-type">{{ pattern.type }}</span>
                  <span class="delegation-count">{{ pattern.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Context -->
      <div v-if="context.recentErrors?.length" class="context-section">
        <h3 class="section-title">
          <span class="title-icon">⚠️</span>
          Recent Issues ({{ context.recentErrors.length }})
        </h3>
        <div class="error-list">
          <div 
            v-for="error in context.recentErrors.slice(0, 5)" 
            :key="error.id"
            class="error-item"
          >
            <div class="error-header">
              <span class="error-time">{{ formatTime(error.timestamp) }}</span>
              <span class="error-source-badge">{{ formatAppName(error.source) }}</span>
            </div>
            <div class="error-message">{{ truncateText(error.message, 100) }}</div>
          </div>
        </div>
      </div>

      <!-- System Context -->
      <div v-if="context.systemContext" class="context-section">
        <h3 class="section-title">
          <span class="title-icon">⚙️</span>
          System Context
        </h3>
        <div class="system-context-grid">
          <div class="system-item" v-if="context.systemContext.hostname">
            <span class="system-label">Hostname:</span>
            <span class="system-value">{{ context.systemContext.hostname }}</span>
          </div>
          <div class="system-item" v-if="context.systemContext.platform">
            <span class="system-label">Platform:</span>
            <span class="system-value">{{ context.systemContext.platform }}</span>
          </div>
          <div class="system-item" v-if="context.systemContext.nodeVersion">
            <span class="system-label">Node Version:</span>
            <span class="system-value">{{ context.systemContext.nodeVersion }}</span>
          </div>
          <div class="system-item" v-if="context.systemContext.uptime">
            <span class="system-label">Uptime:</span>
            <span class="system-value">{{ formatDuration(context.systemContext.uptime * 1000) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HookStatus } from '../../types';

interface ExecutionContext {
  sourceApps: string[];
  activeSessions: string[];
  sessionDepthRange: { min: number; max: number };
  executionEnvironments?: string[];
  userContext?: string[];
  toolUsage?: Array<{
    name: string;
    count: number;
    successRate: number;
    commonParams: string[];
    avgDuration: number;
  }>;
  agentActivity?: Array<{
    id: string;
    name: string;
    type: string;
    executions: number;
    avgDuration: number;
    totalTokens: number;
  }>;
  sessionContext?: {
    parentSessions?: number;
    childSessions?: number;
    delegationPatterns?: Array<{
      type: string;
      count: number;
    }>;
  };
  recentErrors?: Array<{
    id: string;
    timestamp: number;
    source: string;
    message: string;
  }>;
  systemContext?: {
    hostname?: string;
    platform?: string;
    nodeVersion?: string;
    uptime?: number;
  };
}

interface Props {
  hook: HookStatus | null;
  context: ExecutionContext | null;
  loading: boolean;
}

const props = defineProps<Props>();

// Helper functions
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getToolIcon(toolName: string): string {
  const iconMap: Record<string, string> = {
    'Read': '📖',
    'Write': '✏️',
    'Edit': '✂️',
    'Bash': '💻',
    'Grep': '🔍',
    'Glob': '📁',
    'Task': '📋',
    'WebSearch': '🌐',
    'WebFetch': '📥'
  };
  return iconMap[toolName] || '🔧';
}

function getAgentIcon(agentType: string): string {
  const iconMap: Record<string, string> = {
    'analyzer': '🔍',
    'debugger': '🐛',
    'reviewer': '👁️',
    'optimizer': '⚡',
    'tester': '🧪',
    'builder': '🏗️',
    'writer': '✍️'
  };
  
  for (const [type, icon] of Object.entries(iconMap)) {
    if (agentType.toLowerCase().includes(type)) {
      return icon;
    }
  }
  
  return '🤖';
}

function getSuccessRateClass(rate: number): string {
  if (rate >= 95) return 'success-rate-high';
  if (rate >= 80) return 'success-rate-medium';
  return 'success-rate-low';
}
</script>

<style scoped>
.execution-context {
  @apply space-y-8;
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

/* Context Sections */
.context-section {
  @apply bg-gray-900/30 border border-gray-700 rounded-lg p-6;
}

.section-title {
  @apply flex items-center space-x-2 text-lg font-semibold text-white mb-6;
}

.title-icon {
  @apply text-xl;
}

/* Application Context */
.context-grid {
  @apply space-y-6;
}

.context-item {
  @apply space-y-2;
}

.context-label {
  @apply block text-sm font-medium text-gray-400;
}

.app-badges, .env-badges, .user-badges {
  @apply flex flex-wrap gap-2;
}

.app-badge {
  @apply px-3 py-1 bg-blue-600/20 border border-blue-600/30 text-blue-300 text-sm rounded-full;
}

.env-badge {
  @apply px-3 py-1 bg-green-600/20 border border-green-600/30 text-green-300 text-sm rounded-full;
}

.user-badge {
  @apply px-3 py-1 bg-purple-600/20 border border-purple-600/30 text-purple-300 text-sm rounded-full;
}

.session-info {
  @apply space-y-1;
}

.session-count {
  @apply text-sm font-medium text-white;
}

.session-details {
  @apply text-xs text-gray-500;
}

/* Tool Usage */
.tool-usage-list {
  @apply space-y-4;
}

.tool-usage-item {
  @apply bg-gray-800/50 border border-gray-700 rounded-lg p-4;
}

.tool-header {
  @apply flex items-center justify-between mb-3;
}

.tool-identity {
  @apply flex items-center space-x-2;
}

.tool-icon {
  @apply text-lg;
}

.tool-name {
  @apply font-medium text-white;
}

.tool-stats {
  @apply flex items-center space-x-3 text-sm;
}

.usage-count {
  @apply text-gray-300 font-medium;
}

.success-rate {
  @apply font-medium;
}

.success-rate-high {
  @apply text-green-400;
}

.success-rate-medium {
  @apply text-yellow-400;
}

.success-rate-low {
  @apply text-red-400;
}

.tool-details {
  @apply space-y-3;
}

.tool-params {
  @apply text-sm;
}

.param-tags {
  @apply flex flex-wrap gap-2 mt-1;
}

.param-tag {
  @apply px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded;
}

.tool-performance {
  @apply flex items-center space-x-4 text-sm text-gray-400;
}

.perf-item {
  @apply flex items-center space-x-1;
}

.perf-icon {
  @apply text-sm;
}

/* Agent Activity */
.agent-activity-list {
  @apply space-y-4;
}

.agent-activity-item {
  @apply bg-gray-800/50 border border-gray-700 rounded-lg p-4;
}

.agent-header {
  @apply flex items-center justify-between mb-3;
}

.agent-identity {
  @apply flex items-center space-x-3;
}

.agent-icon {
  @apply text-lg;
}

.agent-names {
  @apply space-y-1;
}

.agent-name {
  @apply font-medium text-white block;
}

.agent-type {
  @apply text-sm text-gray-400;
}

.agent-badge {
  @apply px-3 py-1 bg-green-600/20 border border-green-600/30 text-green-300 text-sm rounded-full;
}

.agent-stats {
  @apply grid grid-cols-2 gap-4;
}

.stat-item {
  @apply flex items-center space-x-2 text-sm;
}

.stat-icon {
  @apply text-base;
}

.stat-label {
  @apply text-gray-400;
}

.stat-value {
  @apply text-white font-medium;
}

/* Session Context */
.session-context-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.session-context-card {
  @apply bg-gray-800/50 border border-gray-700 rounded-lg p-4;
}

.context-card-header {
  @apply flex items-center space-x-2 mb-4;
}

.card-icon {
  @apply text-lg;
}

.card-title {
  @apply font-medium text-white;
}

.hierarchy-stats {
  @apply space-y-2;
}

.hierarchy-stat {
  @apply flex items-center justify-between text-sm;
}

.hierarchy-label {
  @apply text-gray-400;
}

.hierarchy-value {
  @apply text-white font-medium;
}

.delegation-list {
  @apply space-y-2;
}

.delegation-item {
  @apply flex items-center justify-between text-sm;
}

.delegation-type {
  @apply text-gray-300;
}

.delegation-count {
  @apply text-white font-medium;
}

/* Error List */
.error-list {
  @apply space-y-3;
}

.error-item {
  @apply p-3 bg-red-900/20 border border-red-700/30 rounded-lg;
}

.error-header {
  @apply flex items-center justify-between mb-2;
}

.error-time {
  @apply text-xs text-gray-400;
}

.error-source-badge {
  @apply px-2 py-1 bg-red-600/20 border border-red-600/30 text-red-300 text-xs rounded;
}

.error-message {
  @apply text-sm text-red-200;
}

/* System Context */
.system-context-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.system-item {
  @apply flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded;
}

.system-label {
  @apply text-sm text-gray-400;
}

.system-value {
  @apply text-sm text-white font-medium;
}

/* Responsive Design */
@media (max-width: 768px) {
  .tool-header, .agent-header {
    @apply flex-col items-start space-y-2;
  }
  
  .tool-stats, .tool-performance {
    @apply flex-col items-start space-x-0 space-y-1;
  }
  
  .session-context-grid {
    @apply grid-cols-1;
  }
  
  .agent-stats {
    @apply grid-cols-1;
  }
  
  .system-context-grid {
    @apply grid-cols-1;
  }
  
  .system-item {
    @apply flex-col items-start;
  }
}
</style>