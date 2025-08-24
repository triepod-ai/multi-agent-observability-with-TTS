<template>
  <div class="contextual-overview">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="text-gray-400">Loading contextual data...</p>
    </div>

    <!-- Content -->
    <div v-else class="overview-content">
      <!-- Dynamic Description -->
      <div class="dynamic-description">
        <h3 class="section-title">Current Status & Activity</h3>
        <div class="rich-description-card">
          <p class="rich-description-text">{{ generateRichDescription() }}</p>
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(context?.totalExecutions || hook?.executionCount || 0) }}</div>
            <div class="stat-label">Total Executions</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatDuration(context?.avgDuration || hook?.averageExecutionTime || 0) }}</div>
            <div class="stat-label">Avg Duration</div>
          </div>
        </div>
        
        <div class="stat-card" v-if="context?.totalTokens">
          <div class="stat-icon">🪙</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(context.totalTokens) }}</div>
            <div class="stat-label">Total Tokens</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏢</div>
          <div class="stat-content">
            <div class="stat-value">{{ context?.sourceApps?.length || 1 }}</div>
            <div class="stat-label">Active Apps</div>
          </div>
        </div>
      </div>

      <!-- Activity Patterns -->
      <div v-if="context?.patterns?.length" class="recent-patterns">
        <h3 class="section-title">Recent Activity Patterns</h3>
        <div class="pattern-grid">
          <div 
            v-for="pattern in context.patterns.slice(0, 6)" 
            :key="pattern.id"
            class="pattern-item"
          >
            <span class="pattern-icon">{{ pattern.icon }}</span>
            <div class="pattern-content">
              <div class="pattern-text">{{ pattern.description }}</div>
              <div class="pattern-frequency">{{ pattern.frequency }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Applications -->
      <div v-if="context?.sourceApps?.length" class="top-applications">
        <h3 class="section-title">Active Applications</h3>
        <div class="app-list">
          <div 
            v-for="app in context.sourceApps.slice(0, 8)" 
            :key="app"
            class="app-item"
          >
            <div class="app-icon">📱</div>
            <div class="app-name">{{ formatAppName(app) }}</div>
          </div>
        </div>
      </div>

      <!-- Quick Health Indicators -->
      <div class="health-indicators">
        <h3 class="section-title">Health Indicators</h3>
        <div class="health-grid">
          <div class="health-item">
            <div class="health-icon" :class="getHealthIconClass(hook?.successRate || 0)">
              {{ getHealthIcon(hook?.successRate || 0) }}
            </div>
            <div class="health-content">
              <div class="health-label">Success Rate</div>
              <div class="health-value">{{ hook?.successRate || 0 }}%</div>
            </div>
          </div>
          
          <div class="health-item">
            <div class="health-icon" :class="getActivityIconClass()">
              {{ getActivityIcon() }}
            </div>
            <div class="health-content">
              <div class="health-label">Activity Level</div>
              <div class="health-value">{{ getActivityLevel() }}</div>
            </div>
          </div>
          
          <div class="health-item" v-if="context?.recentErrors?.length !== undefined">
            <div class="health-icon" :class="getErrorIconClass(context.recentErrors.length)">
              {{ getErrorIcon(context.recentErrors.length) }}
            </div>
            <div class="health-content">
              <div class="health-label">Recent Errors</div>
              <div class="health-value">{{ context.recentErrors.length }}</div>
            </div>
          </div>
          
          <div class="health-item" v-if="hook?.lastExecution">
            <div class="health-icon text-blue-400">🕐</div>
            <div class="health-content">
              <div class="health-label">Last Activity</div>
              <div class="health-value">{{ formatLastExecution(hook.lastExecution) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resource Usage Summary -->
      <div v-if="context?.totalCost || context?.totalTokens" class="resource-summary">
        <h3 class="section-title">Resource Usage</h3>
        <div class="resource-cards">
          <div v-if="context.totalTokens" class="resource-card">
            <div class="resource-header">
              <span class="resource-icon">🪙</span>
              <span class="resource-title">Token Consumption</span>
            </div>
            <div class="resource-stats">
              <div class="resource-main">{{ formatNumber(context.totalTokens) }} total</div>
              <div class="resource-sub">{{ formatNumber(context.avgTokensPerExecution || 0) }} avg per execution</div>
            </div>
          </div>
          
          <div v-if="context.totalCost" class="resource-card">
            <div class="resource-header">
              <span class="resource-icon">💰</span>
              <span class="resource-title">Estimated Cost</span>
            </div>
            <div class="resource-stats">
              <div class="resource-main">${{ context.totalCost.toFixed(4) }}</div>
              <div class="resource-sub">${{ (context.totalCost / (context.totalExecutions || 1)).toFixed(6) }} per execution</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HookStatus } from '../../types';

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

interface Props {
  hook: HookStatus | null;
  context: EnhancedHookContext | null;
  loading: boolean;
}

const props = defineProps<Props>();

// Generate rich, contextual descriptions
function generateRichDescription(): string {
  const { hook, context } = props;
  
  if (!hook) return 'Hook information not available.';
  
  if (!context) {
    return `${hook.description}. Monitoring ${hook.executionCount || 0} executions with ${hook.successRate || 0}% success rate.`;
  }
  
  // Generate dynamic description based on actual usage patterns
  switch (hook.type) {
    case 'session_start':
      return `Initializing sessions across ${context.sourceApps.length} applications with average startup time of ${formatDuration(context.avgDuration)}. Recent activity includes ${context.totalExecutions} session starts with ${context.activeSessions.length} unique sessions tracked.`;
    
    case 'pre_tool_use':
      const topTools = context.toolUsage.slice(0, 3).map(t => t.name).join(', ');
      return `Validating tool executions across the system. Most active tools: ${topTools || 'various system tools'}. Processing ${context.totalExecutions} validation requests with ${formatDuration(context.avgDuration)} average validation time.`;
    
    case 'subagent_stop':
      const agentTypes = [...new Set(context.agentActivity.map(a => a.type))].slice(0, 3).join(', ');
      return `Managing agent completion and cleanup. Active agent types: ${agentTypes || 'various agents'}. Processed ${context.totalExecutions} agent completions with ${formatNumber(context.totalTokens)} total tokens consumed.`;
    
    case 'post_tool_use':
      return `Processing tool execution results with ${context.avgDuration}ms average processing time. Handled ${context.totalExecutions} tool completions across ${context.sourceApps.length} applications with ${hook.successRate || 0}% success rate.`;
      
    case 'user_prompt_submit':
      return `Processing user interactions with ${formatDuration(context.avgDuration)} average response time. Handled ${context.totalExecutions} user prompts consuming ${formatNumber(context.totalTokens)} tokens total.`;
      
    case 'stop':
      return `Managing session termination and cleanup. Processed ${context.totalExecutions} session stops across ${context.sourceApps.length} applications with cleanup efficiency of ${hook.successRate || 0}%.`;
      
    case 'notification':
      return `Delivering system notifications with ${formatDuration(context.avgDuration)} average delivery time. Sent ${context.totalExecutions} notifications across ${context.sourceApps.length} applications.`;
      
    case 'precompact':
      return `Performing pre-compression analysis with ${formatDuration(context.avgDuration)} average analysis time. Analyzed ${context.totalExecutions} sessions consuming ${formatNumber(context.totalTokens)} tokens.`;
      
    default:
      return `${hook.description} - Active across ${context.sourceApps.length} applications with ${context.totalExecutions} recent executions averaging ${formatDuration(context.avgDuration)} per execution.`;
  }
}

// Utility functions
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatAppName(app: string): string {
  return app.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatLastExecution(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// Health indicator functions
function getHealthIcon(successRate: number): string {
  if (successRate >= 95) return '🟢';
  if (successRate >= 80) return '🟡';
  return '🔴';
}

function getHealthIconClass(successRate: number): string {
  if (successRate >= 95) return 'text-green-400';
  if (successRate >= 80) return 'text-yellow-400';
  return 'text-red-400';
}

function getActivityIcon(): string {
  const level = getActivityLevel();
  if (level === 'High') return '🔥';
  if (level === 'Medium') return '⚡';
  return '💤';
}

function getActivityIconClass(): string {
  const level = getActivityLevel();
  if (level === 'High') return 'text-red-400';
  if (level === 'Medium') return 'text-yellow-400';
  return 'text-gray-400';
}

function getActivityLevel(): string {
  const executions = props.context?.totalExecutions || props.hook?.executionCount || 0;
  if (executions >= 100) return 'High';
  if (executions >= 10) return 'Medium';
  return 'Low';
}

function getErrorIcon(errorCount: number): string {
  if (errorCount === 0) return '✅';
  if (errorCount <= 5) return '⚠️';
  return '🚨';
}

function getErrorIconClass(errorCount: number): string {
  if (errorCount === 0) return 'text-green-400';
  if (errorCount <= 5) return 'text-yellow-400';
  return 'text-red-400';
}
</script>

<style scoped>
.contextual-overview {
  @apply space-y-6;
}

/* Loading State */
.loading-state {
  @apply flex flex-col items-center justify-center py-16 space-y-4;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin;
}

/* Section Titles */
.section-title {
  @apply text-lg font-semibold text-white mb-4 flex items-center space-x-2;
}

/* Dynamic Description */
.dynamic-description {
  @apply mb-6;
}

.rich-description-card {
  @apply bg-gray-900/50 border border-gray-700 rounded-lg p-4;
}

.rich-description-text {
  @apply text-gray-300 leading-relaxed;
}

/* Stats Grid */
.stats-grid {
  @apply grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6;
}

.stat-card {
  @apply bg-gray-900/30 border border-gray-700 rounded-lg p-4 flex items-center space-x-3;
}

.stat-icon {
  @apply text-2xl;
}

.stat-content {
  @apply flex-1 min-w-0;
}

.stat-value {
  @apply text-xl font-bold text-white;
}

.stat-label {
  @apply text-sm text-gray-400;
}

/* Pattern Grid */
.pattern-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3;
}

.pattern-item {
  @apply bg-gray-900/30 border border-gray-700 rounded-lg p-3 flex items-center space-x-3;
}

.pattern-icon {
  @apply text-xl;
}

.pattern-content {
  @apply flex-1 min-w-0;
}

.pattern-text {
  @apply text-sm text-gray-300 font-medium;
}

.pattern-frequency {
  @apply text-xs text-gray-500;
}

/* App List */
.app-list {
  @apply grid grid-cols-2 md:grid-cols-4 gap-3;
}

.app-item {
  @apply bg-gray-900/30 border border-gray-700 rounded-lg p-3 flex items-center space-x-2 text-center;
}

.app-icon {
  @apply text-lg;
}

.app-name {
  @apply text-sm text-gray-300 font-medium truncate;
}

/* Health Indicators */
.health-grid {
  @apply grid grid-cols-2 lg:grid-cols-4 gap-4;
}

.health-item {
  @apply bg-gray-900/30 border border-gray-700 rounded-lg p-4 flex items-center space-x-3;
}

.health-icon {
  @apply text-xl;
}

.health-content {
  @apply flex-1 min-w-0;
}

.health-label {
  @apply text-xs text-gray-500 uppercase tracking-wide;
}

.health-value {
  @apply text-sm font-semibold text-white;
}

/* Resource Cards */
.resource-cards {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.resource-card {
  @apply bg-gray-900/30 border border-gray-700 rounded-lg p-4;
}

.resource-header {
  @apply flex items-center space-x-2 mb-3;
}

.resource-icon {
  @apply text-xl;
}

.resource-title {
  @apply text-sm font-semibold text-gray-300;
}

.resource-stats {
  @apply space-y-1;
}

.resource-main {
  @apply text-lg font-bold text-white;
}

.resource-sub {
  @apply text-xs text-gray-500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .stats-grid {
    @apply grid-cols-2;
  }
  
  .pattern-grid {
    @apply grid-cols-1;
  }
  
  .app-list {
    @apply grid-cols-2;
  }
  
  .health-grid {
    @apply grid-cols-1;
  }
  
  .resource-cards {
    @apply grid-cols-1;
  }
}
</style>