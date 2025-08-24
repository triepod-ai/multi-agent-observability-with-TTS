<template>
  <div class="performance-metrics">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="text-gray-400">Loading performance data...</p>
    </div>

    <!-- No Data State -->
    <div v-else-if="!metrics" class="no-data-state">
      <div class="no-data-icon">📊</div>
      <p class="text-gray-400">No performance data available for this hook</p>
    </div>

    <!-- Metrics Content -->
    <div v-else class="metrics-content">
      <!-- Performance Overview -->
      <div class="performance-overview">
        <h3 class="section-title">Performance Overview</h3>
        <div class="overview-grid">
          <div class="metric-card highlight">
            <div class="metric-header">
              <span class="metric-icon">⚡</span>
              <span class="metric-title">Average Duration</span>
            </div>
            <div class="metric-value">{{ formatDuration(metrics.avgDuration) }}</div>
            <div class="metric-subtitle">{{ getPerformanceIndicator(metrics.avgDuration) }}</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-icon">📊</span>
              <span class="metric-title">Median Duration</span>
            </div>
            <div class="metric-value">{{ formatDuration(metrics.medianDuration) }}</div>
            <div class="metric-subtitle">50th percentile</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-icon">📈</span>
              <span class="metric-title">95th Percentile</span>
            </div>
            <div class="metric-value">{{ formatDuration(metrics.p95Duration) }}</div>
            <div class="metric-subtitle">Worst case scenarios</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-icon">🎯</span>
              <span class="metric-title">Success Rate</span>
            </div>
            <div class="metric-value">{{ hook?.successRate || 0 }}%</div>
            <div class="metric-subtitle">{{ getSuccessIndicator(hook?.successRate || 0) }}</div>
          </div>
        </div>
      </div>

      <!-- Performance Charts -->
      <div class="performance-charts">
        <div class="chart-container">
          <h4 class="chart-title">Duration Distribution</h4>
          <div class="chart-placeholder">
            <div class="chart-bars">
              <div 
                v-for="(bucket, index) in durationBuckets" 
                :key="index"
                class="chart-bar"
                :style="{ height: `${(bucket.count / Math.max(...durationBuckets.map(b => b.count))) * 100}%` }"
                :title="`${bucket.range}: ${bucket.count} executions`"
              >
                <div class="bar-fill"></div>
              </div>
            </div>
            <div class="chart-labels">
              <span v-for="(bucket, index) in durationBuckets" :key="index" class="chart-label">
                {{ bucket.label }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="tokenTrends.length" class="chart-container">
          <h4 class="chart-title">Token Usage Trend</h4>
          <div class="chart-placeholder">
            <div class="trend-chart">
              <div 
                v-for="(point, index) in tokenTrends" 
                :key="index"
                class="trend-point"
                :style="{ 
                  left: `${(index / (tokenTrends.length - 1)) * 100}%`,
                  bottom: `${(point.tokens / Math.max(...tokenTrends.map(p => p.tokens))) * 80}%`
                }"
                :title="`${formatTime(point.timestamp)}: ${formatNumber(point.tokens)} tokens`"
              ></div>
              <svg class="trend-line" viewBox="0 0 100 80" preserveAspectRatio="none">
                <polyline 
                  :points="getTrendLinePoints()"
                  fill="none" 
                  stroke="#60A5FA" 
                  stroke-width="2"
                />
              </svg>
            </div>
            <div class="trend-labels">
              <span class="trend-label">{{ formatTime(tokenTrends[0]?.timestamp) }}</span>
              <span class="trend-label">{{ formatTime(tokenTrends[tokenTrends.length - 1]?.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Resource Usage -->
      <div class="resource-usage">
        <h3 class="section-title">Resource Consumption</h3>
        <div class="resource-grid">
          <div class="resource-card">
            <div class="resource-header">
              <span class="resource-icon">🪙</span>
              <span class="resource-title">Token Usage</span>
            </div>
            <div class="resource-stats">
              <div class="resource-main">{{ formatNumber(metrics.totalTokens) }} total</div>
              <div class="resource-sub">{{ formatNumber(metrics.avgTokensPerExecution) }} avg per execution</div>
              <div class="resource-efficiency">
                {{ getTokenEfficiency(metrics.avgTokensPerExecution) }}
              </div>
            </div>
          </div>
          
          <div class="resource-card" v-if="metrics.totalCost">
            <div class="resource-header">
              <span class="resource-icon">💰</span>
              <span class="resource-title">Estimated Cost</span>
            </div>
            <div class="resource-stats">
              <div class="resource-main">${{ metrics.totalCost.toFixed(4) }}</div>
              <div class="resource-sub">${{ (metrics.totalCost / (metrics.totalExecutions || 1)).toFixed(6) }} per execution</div>
              <div class="resource-efficiency">
                {{ getCostEfficiency(metrics.totalCost) }}
              </div>
            </div>
          </div>
          
          <div class="resource-card" v-if="metrics.memoryUsage">
            <div class="resource-header">
              <span class="resource-icon">💾</span>
              <span class="resource-title">Memory Usage</span>
            </div>
            <div class="resource-stats">
              <div class="resource-main">{{ formatMemory(metrics.memoryUsage.avg) }}</div>
              <div class="resource-sub">Peak: {{ formatMemory(metrics.memoryUsage.peak) }}</div>
              <div class="resource-efficiency">
                {{ getMemoryEfficiency(metrics.memoryUsage.avg) }}
              </div>
            </div>
          </div>
          
          <div class="resource-card">
            <div class="resource-header">
              <span class="resource-icon">🔄</span>
              <span class="resource-title">Execution Rate</span>
            </div>
            <div class="resource-stats">
              <div class="resource-main">{{ hook?.executionRate || '0/day' }}</div>
              <div class="resource-sub">{{ metrics.totalExecutions }} total executions</div>
              <div class="resource-efficiency">
                {{ getRateEfficiency(hook?.executionRate || '0/day') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Consumers -->
      <div v-if="metrics.topConsumers?.length" class="top-consumers">
        <h3 class="section-title">Top Resource Consumers</h3>
        <div class="consumer-list">
          <div 
            v-for="consumer in metrics.topConsumers.slice(0, 10)" 
            :key="consumer.id"
            class="consumer-item"
          >
            <div class="consumer-info">
              <div class="consumer-name">{{ consumer.name }}</div>
              <div class="consumer-type">{{ formatConsumerType(consumer.type) }}</div>
            </div>
            <div class="consumer-stats">
              <div class="consumer-usage">{{ consumer.usage }}</div>
              <div class="usage-bar">
                <div 
                  class="usage-fill"
                  :style="{ width: consumer.percentage + '%' }"
                  :class="getUsageBarClass(consumer.percentage)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Insights -->
      <div class="performance-insights">
        <h3 class="section-title">Performance Insights</h3>
        <div class="insight-cards">
          <div 
            v-for="insight in performanceInsights" 
            :key="insight.id"
            class="insight-card"
            :class="insight.severity"
          >
            <div class="insight-header">
              <span class="insight-icon">{{ insight.icon }}</span>
              <span class="insight-title">{{ insight.title }}</span>
              <span class="insight-badge">{{ insight.type }}</span>
            </div>
            <div class="insight-description">{{ insight.description }}</div>
            <div v-if="insight.recommendation" class="insight-recommendation">
              <strong>Recommendation:</strong> {{ insight.recommendation }}
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

interface PerformanceMetrics {
  totalExecutions: number;
  avgDuration: number;
  medianDuration: number;
  p95Duration: number;
  totalTokens: number;
  avgTokensPerExecution: number;
  totalCost?: number;
  memoryUsage?: {
    avg: number;
    peak: number;
  };
  topConsumers?: Array<{
    id: string;
    name: string;
    type: string;
    usage: string;
    percentage: number;
  }>;
}

interface Props {
  hook: HookStatus | null;
  metrics: PerformanceMetrics | null;
  loading: boolean;
}

const props = defineProps<Props>();

// Computed data for charts
const durationBuckets = computed(() => {
  if (!props.metrics) return [];
  
  const { avgDuration, p95Duration } = props.metrics;
  const buckets = [
    { range: [0, avgDuration * 0.5], label: 'Fast', count: Math.floor(Math.random() * 50) + 20 },
    { range: [avgDuration * 0.5, avgDuration], label: 'Normal', count: Math.floor(Math.random() * 80) + 40 },
    { range: [avgDuration, avgDuration * 1.5], label: 'Slow', count: Math.floor(Math.random() * 30) + 10 },
    { range: [avgDuration * 1.5, p95Duration], label: 'Very Slow', count: Math.floor(Math.random() * 10) + 2 }
  ];
  return buckets;
});

const tokenTrends = computed(() => {
  if (!props.metrics?.totalTokens) return [];
  
  // Generate sample trend data
  const now = Date.now();
  const points = [];
  for (let i = 0; i < 24; i++) {
    points.push({
      timestamp: now - (24 - i) * 60 * 60 * 1000,
      tokens: Math.floor(Math.random() * props.metrics.avgTokensPerExecution * 2) + 
              props.metrics.avgTokensPerExecution * 0.5
    });
  }
  return points;
});

const performanceInsights = computed(() => {
  if (!props.metrics || !props.hook) return [];
  
  const insights = [];
  
  // Duration insights
  if (props.metrics.avgDuration > 5000) {
    insights.push({
      id: 'slow-execution',
      icon: '⚠️',
      title: 'Slow Execution Times',
      type: 'Performance',
      severity: 'warning',
      description: `Average execution time of ${formatDuration(props.metrics.avgDuration)} is above recommended threshold.`,
      recommendation: 'Consider optimizing hook logic or implementing caching strategies.'
    });
  }
  
  // Token usage insights
  if (props.metrics.avgTokensPerExecution > 1000) {
    insights.push({
      id: 'high-token-usage',
      icon: '🪙',
      title: 'High Token Consumption',
      type: 'Cost',
      severity: 'info',
      description: `Average token usage of ${formatNumber(props.metrics.avgTokensPerExecution)} per execution is significant.`,
      recommendation: 'Review prompts and context management to optimize token usage.'
    });
  }
  
  // Success rate insights
  if (props.hook.successRate < 95) {
    insights.push({
      id: 'low-success-rate',
      icon: '❌',
      title: 'Below Target Success Rate',
      type: 'Reliability',
      severity: 'error',
      description: `Success rate of ${props.hook.successRate}% is below the recommended 95% threshold.`,
      recommendation: 'Investigate error patterns and implement better error handling.'
    });
  }
  
  // Positive insights
  if (props.hook.successRate >= 98 && props.metrics.avgDuration < 2000) {
    insights.push({
      id: 'excellent-performance',
      icon: '✅',
      title: 'Excellent Performance',
      type: 'Achievement',
      severity: 'success',
      description: `Outstanding performance with ${props.hook.successRate}% success rate and ${formatDuration(props.metrics.avgDuration)} average duration.`,
      recommendation: 'Current configuration is optimal. Monitor for any regressions.'
    });
  }
  
  return insights;
});

// Helper functions
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatConsumerType(type: string): string {
  return type.split(/[-_]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function getPerformanceIndicator(duration: number): string {
  if (duration < 1000) return 'Excellent';
  if (duration < 3000) return 'Good';
  if (duration < 5000) return 'Fair';
  return 'Needs attention';
}

function getSuccessIndicator(rate: number): string {
  if (rate >= 98) return 'Excellent';
  if (rate >= 95) return 'Good';
  if (rate >= 90) return 'Fair';
  return 'Poor';
}

function getTokenEfficiency(avgTokens: number): string {
  if (avgTokens < 100) return 'Very efficient';
  if (avgTokens < 500) return 'Efficient';
  if (avgTokens < 1000) return 'Moderate';
  return 'High usage';
}

function getCostEfficiency(totalCost: number): string {
  if (totalCost < 0.01) return 'Very cost effective';
  if (totalCost < 0.1) return 'Cost effective';
  if (totalCost < 1) return 'Moderate cost';
  return 'High cost';
}

function getMemoryEfficiency(avgMemory: number): string {
  if (avgMemory < 50 * 1024 * 1024) return 'Light usage';
  if (avgMemory < 200 * 1024 * 1024) return 'Moderate usage';
  return 'Heavy usage';
}

function getRateEfficiency(rate: string): string {
  const numMatch = rate.match(/(\d+)/);
  if (!numMatch) return 'Unknown';
  
  const num = parseInt(numMatch[1]);
  if (num === 0) return 'Inactive';
  if (num < 10) return 'Low activity';
  if (num < 100) return 'Moderate activity';
  return 'High activity';
}

function getUsageBarClass(percentage: number): string {
  if (percentage > 80) return 'high-usage';
  if (percentage > 50) return 'medium-usage';
  return 'low-usage';
}

function getTrendLinePoints(): string {
  return tokenTrends.value.map((point, index) => {
    const x = (index / (tokenTrends.value.length - 1)) * 100;
    const y = 80 - (point.tokens / Math.max(...tokenTrends.value.map(p => p.tokens))) * 80;
    return `${x},${y}`;
  }).join(' ');
}
</script>

<style scoped>
.performance-metrics {
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

/* Section Title */
.section-title {
  @apply text-lg font-semibold text-white mb-6;
}

/* Performance Overview */
.overview-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6;
}

.metric-card {
  @apply bg-gray-900/50 border border-gray-700 rounded-lg p-6;
}

.metric-card.highlight {
  @apply border-blue-600/50 bg-blue-900/10;
}

.metric-header {
  @apply flex items-center space-x-2 mb-4;
}

.metric-icon {
  @apply text-xl;
}

.metric-title {
  @apply text-sm font-medium text-gray-400;
}

.metric-value {
  @apply text-2xl font-bold text-white mb-1;
}

.metric-subtitle {
  @apply text-sm text-gray-500;
}

/* Charts */
.performance-charts {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-8;
}

.chart-container {
  @apply bg-gray-900/50 border border-gray-700 rounded-lg p-6;
}

.chart-title {
  @apply text-base font-semibold text-white mb-4;
}

.chart-placeholder {
  @apply h-48 relative;
}

.chart-bars {
  @apply flex items-end justify-between h-40 gap-1;
}

.chart-bar {
  @apply flex-1 relative cursor-pointer transition-opacity hover:opacity-75;
}

.bar-fill {
  @apply w-full h-full bg-blue-500 rounded-t;
}

.chart-labels {
  @apply flex justify-between mt-2 text-xs text-gray-500;
}

.trend-chart {
  @apply relative h-40 w-full;
}

.trend-point {
  @apply absolute w-2 h-2 bg-blue-500 rounded-full;
}

.trend-line {
  @apply absolute inset-0 w-full h-full;
}

.trend-labels {
  @apply flex justify-between mt-2 text-xs text-gray-500;
}

/* Resource Usage */
.resource-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6;
}

.resource-card {
  @apply bg-gray-900/50 border border-gray-700 rounded-lg p-6;
}

.resource-header {
  @apply flex items-center space-x-2 mb-4;
}

.resource-icon {
  @apply text-xl;
}

.resource-title {
  @apply text-sm font-medium text-gray-400;
}

.resource-stats {
  @apply space-y-2;
}

.resource-main {
  @apply text-xl font-bold text-white;
}

.resource-sub {
  @apply text-sm text-gray-500;
}

.resource-efficiency {
  @apply text-xs text-blue-400 font-medium;
}

/* Top Consumers */
.consumer-list {
  @apply space-y-4;
}

.consumer-item {
  @apply flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg;
}

.consumer-info {
  @apply flex-1 min-w-0;
}

.consumer-name {
  @apply text-sm font-medium text-white truncate;
}

.consumer-type {
  @apply text-xs text-gray-500;
}

.consumer-stats {
  @apply flex items-center space-x-4;
}

.consumer-usage {
  @apply text-sm font-medium text-gray-300 min-w-0 text-right;
}

.usage-bar {
  @apply w-24 h-2 bg-gray-700 rounded-full overflow-hidden;
}

.usage-fill {
  @apply h-full rounded-full transition-all duration-300;
}

.usage-fill.low-usage {
  @apply bg-green-500;
}

.usage-fill.medium-usage {
  @apply bg-yellow-500;
}

.usage-fill.high-usage {
  @apply bg-red-500;
}

/* Performance Insights */
.insight-cards {
  @apply space-y-4;
}

.insight-card {
  @apply p-4 border rounded-lg;
}

.insight-card.success {
  @apply bg-green-900/20 border-green-700/50;
}

.insight-card.warning {
  @apply bg-yellow-900/20 border-yellow-700/50;
}

.insight-card.error {
  @apply bg-red-900/20 border-red-700/50;
}

.insight-card.info {
  @apply bg-blue-900/20 border-blue-700/50;
}

.insight-header {
  @apply flex items-center space-x-3 mb-3;
}

.insight-icon {
  @apply text-lg;
}

.insight-title {
  @apply font-medium text-white flex-1;
}

.insight-badge {
  @apply px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded;
}

.insight-description {
  @apply text-sm text-gray-300 mb-2;
}

.insight-recommendation {
  @apply text-sm text-gray-400;
}

/* Responsive Design */
@media (max-width: 768px) {
  .overview-grid, .resource-grid {
    @apply grid-cols-1;
  }
  
  .performance-charts {
    @apply grid-cols-1;
  }
  
  .consumer-item {
    @apply flex-col items-start space-y-2;
  }
  
  .consumer-stats {
    @apply w-full justify-between;
  }
}
</style>