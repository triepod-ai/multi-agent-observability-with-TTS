/**
 * Enhanced Hook Coverage Service
 * 
 * Provides rich contextual data for hook coverage status display.
 * Transforms basic hook status into comprehensive operational intelligence.
 */

import type { HookEvent, HookCoverageData, HookStatus } from '../types';

// Enhanced interfaces for rich contextual data
export interface EnhancedHookContext {
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
  executionEnvironments?: string[];
  userContext?: string[];
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
  sessionContext?: any;
  systemContext?: {
    hostname?: string;
    platform: string;
    nodeVersion: string;
    uptime: number;
  };
}

export interface EnhancedHookStatus extends HookStatus {
  // Enhanced contextual information
  contextualDescription: string;
  keyMetrics: {
    totalExecutions: number;
    avgDuration: number;
    activeApps: number;
    totalTokens: number;
    recentErrors: number;
  };
  activityPatterns: Array<{
    pattern: string;
    frequency: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  resourceUsage: {
    tokenConsumption: number;
    estimatedCost: number;
    executionTime: number;
  };
  healthIndicators: {
    performance: 'excellent' | 'good' | 'fair' | 'poor';
    reliability: 'excellent' | 'good' | 'fair' | 'poor';
    errorRate: 'low' | 'medium' | 'high';
  };
  recentActivity: {
    lastExecution?: number;
    recentExecutionCount: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
  };
}

export interface PerformanceMetrics {
  duration: {
    avg: number;
    median: number;
    p95: number;
    min: number;
    max: number;
  };
  throughput: {
    executions: number;
    executionsPerHour: number;
    peakExecutionsPerHour: number;
  };
  resources: {
    totalTokens: number;
    avgTokensPerExecution: number;
    estimatedCost: number;
    costPerExecution: number;
  };
  trends: {
    executionTrend: 'increasing' | 'stable' | 'decreasing';
    durationTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'worsening';
  };
}

class HookCoverageService {
  private cache = new Map<string, any>();
  private cacheExpiry = 30000; // 30 seconds

  /**
   * Fetch enhanced hook context from backend API
   */
  async fetchHookContext(hookType: string): Promise<EnhancedHookContext | null> {
    const cacheKey = `context_${hookType}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const response = await fetch(`/api/hooks/${hookType}/context`);
      if (!response.ok) {
        console.warn(`Failed to fetch context for hook ${hookType}: ${response.status}`);
        return null;
      }

      const context: EnhancedHookContext = await response.json();
      this.setCache(cacheKey, context);
      return context;
    } catch (error) {
      console.error(`Error fetching hook context for ${hookType}:`, error);
      return null;
    }
  }

  /**
   * Fetch recent events for a specific hook
   */
  async fetchHookEvents(hookType: string, limit = 50): Promise<HookEvent[]> {
    const cacheKey = `events_${hookType}_${limit}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const response = await fetch(`/api/hooks/${hookType}/events?limit=${limit}`);
      if (!response.ok) {
        console.warn(`Failed to fetch events for hook ${hookType}: ${response.status}`);
        return [];
      }

      const events: HookEvent[] = await response.json();
      this.setCache(cacheKey, events);
      return events;
    } catch (error) {
      console.error(`Error fetching hook events for ${hookType}:`, error);
      return [];
    }
  }

  /**
   * Fetch performance metrics for a specific hook
   */
  async fetchPerformanceMetrics(hookType: string): Promise<PerformanceMetrics | null> {
    const cacheKey = `metrics_${hookType}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const response = await fetch(`/api/hooks/${hookType}/metrics`);
      if (!response.ok) {
        console.warn(`Failed to fetch metrics for hook ${hookType}: ${response.status}`);
        return null;
      }

      const metrics: PerformanceMetrics = await response.json();
      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error(`Error fetching performance metrics for ${hookType}:`, error);
      return null;
    }
  }

  /**
   * Enhance hook status with rich contextual data
   */
  async enhanceHookStatus(basicStatus: HookStatus): Promise<EnhancedHookStatus> {
    const context = await this.fetchHookContext(basicStatus.type);
    const metrics = await this.fetchPerformanceMetrics(basicStatus.type);

    // Generate contextual description based on real data
    const contextualDescription = this.generateContextualDescription(basicStatus, context);

    // Extract key metrics
    const keyMetrics = {
      totalExecutions: context?.totalExecutions || basicStatus.executionCount,
      avgDuration: context?.avgDuration || basicStatus.averageExecutionTime || 0,
      activeApps: context?.sourceApps?.length || 1,
      totalTokens: context?.totalTokens || 0,
      recentErrors: context?.recentErrors?.length || 0
    };

    // Analyze activity patterns
    const activityPatterns = this.extractActivityPatterns(context);

    // Calculate resource usage
    const resourceUsage = {
      tokenConsumption: context?.totalTokens || 0,
      estimatedCost: context?.totalCost || 0,
      executionTime: context?.avgDuration || 0
    };

    // Assess health indicators
    const healthIndicators = this.assessHealthIndicators(basicStatus, context, metrics);

    // Analyze recent activity trends
    const recentActivity = this.analyzeRecentActivity(basicStatus, context);

    return {
      ...basicStatus,
      contextualDescription,
      keyMetrics,
      activityPatterns,
      resourceUsage,
      healthIndicators,
      recentActivity
    };
  }

  /**
   * Generate dynamic contextual description based on hook type and data
   */
  private generateContextualDescription(status: HookStatus, context: EnhancedHookContext | null): string {
    if (!context) {
      return `${status.description}. Currently monitoring ${status.executionCount} executions with ${status.successRate}% success rate.`;
    }

    const formatNumber = (num: number): string => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    };

    const formatDuration = (ms: number): string => {
      if (ms < 1000) return `${Math.round(ms)}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${(ms / 60000).toFixed(1)}m`;
    };

    switch (status.type) {
      case 'session_start':
        return `Managing session initialization across ${context.sourceApps.length} applications. Processed ${formatNumber(context.totalExecutions)} session starts with ${formatDuration(context.avgDuration)} average startup time. Currently tracking ${context.activeSessions.length} active sessions.`;
      
      case 'pre_tool_use':
        const topTools = context.toolUsage.slice(0, 3).map(t => t.name).join(', ');
        return `Validating tool executions system-wide. Most active tools: ${topTools || 'various system tools'}. Processed ${formatNumber(context.totalExecutions)} validations averaging ${formatDuration(context.avgDuration)} per check.`;
      
      case 'subagent_stop':
        const agentTypes = [...new Set(context.agentActivity.map(a => a.type))].slice(0, 3).join(', ');
        return `Managing AI agent lifecycle and cleanup. Active agent types: ${agentTypes || 'various agents'}. Completed ${formatNumber(context.totalExecutions)} agent tasks consuming ${formatNumber(context.totalTokens)} tokens total.`;
      
      case 'post_tool_use':
        return `Processing tool execution results with ${formatDuration(context.avgDuration)} average processing time. Handled ${formatNumber(context.totalExecutions)} tool completions across ${context.sourceApps.length} applications maintaining ${status.successRate}% success rate.`;
        
      case 'user_prompt_submit':
        return `Processing user interactions and requests. Handled ${formatNumber(context.totalExecutions)} prompts with ${formatDuration(context.avgDuration)} average response time, consuming ${formatNumber(context.totalTokens)} tokens across all sessions.`;
        
      case 'stop':
        return `Managing session termination and cleanup operations. Processed ${formatNumber(context.totalExecutions)} session stops across ${context.sourceApps.length} applications with ${status.successRate}% cleanup success rate.`;
        
      case 'notification':
        return `Delivering system notifications and alerts. Sent ${formatNumber(context.totalExecutions)} notifications with ${formatDuration(context.avgDuration)} average delivery time across ${context.sourceApps.length} active applications.`;
        
      case 'precompact':
        return `Performing conversation analysis and pre-compression processing. Analyzed ${formatNumber(context.totalExecutions)} sessions in ${formatDuration(context.avgDuration)} average time, processing ${formatNumber(context.totalTokens)} tokens.`;
        
      default:
        return `${status.description} - Active across ${context.sourceApps.length} applications with ${formatNumber(context.totalExecutions)} recent executions averaging ${formatDuration(context.avgDuration)} per operation.`;
    }
  }

  /**
   * Extract activity patterns from context data
   */
  private extractActivityPatterns(context: EnhancedHookContext | null): Array<{
    pattern: string;
    frequency: string;
    impact: 'high' | 'medium' | 'low';
  }> {
    if (!context) return [];

    const patterns = [];

    // High token usage pattern
    if (context.totalTokens > 50000) {
      patterns.push({
        pattern: 'High Token Consumption',
        frequency: `${Math.round(context.avgTokensPerExecution)} avg/execution`,
        impact: context.totalTokens > 200000 ? 'high' : 'medium' as 'high' | 'medium' | 'low'
      });
    }

    // Multi-application usage
    if (context.sourceApps.length > 3) {
      patterns.push({
        pattern: 'Multi-Application Usage',
        frequency: `${context.sourceApps.length} active apps`,
        impact: 'high' as 'high' | 'medium' | 'low'
      });
    }

    // Performance patterns
    if (context.avgDuration > 5000) {
      patterns.push({
        pattern: 'Long Execution Times',
        frequency: `${Math.round(context.avgDuration)}ms avg`,
        impact: context.avgDuration > 10000 ? 'high' : 'medium' as 'high' | 'medium' | 'low'
      });
    }

    // Error patterns
    if (context.recentErrors.length > 5) {
      patterns.push({
        pattern: 'Elevated Error Rate',
        frequency: `${context.recentErrors.length} recent errors`,
        impact: 'high' as 'high' | 'medium' | 'low'
      });
    }

    // Session depth patterns
    if (context.sessionDepthRange.max > 3) {
      patterns.push({
        pattern: 'Deep Session Nesting',
        frequency: `Max depth: ${context.sessionDepthRange.max}`,
        impact: 'medium' as 'high' | 'medium' | 'low'
      });
    }

    return patterns;
  }

  /**
   * Assess health indicators based on multiple data sources
   */
  private assessHealthIndicators(
    status: HookStatus, 
    context: EnhancedHookContext | null,
    metrics: PerformanceMetrics | null
  ): {
    performance: 'excellent' | 'good' | 'fair' | 'poor';
    reliability: 'excellent' | 'good' | 'fair' | 'poor';
    errorRate: 'low' | 'medium' | 'high';
  } {
    // Performance assessment
    let performance: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    const avgDuration = context?.avgDuration || status.averageExecutionTime || 0;
    if (avgDuration < 1000) performance = 'excellent';
    else if (avgDuration < 5000) performance = 'good';
    else if (avgDuration < 15000) performance = 'fair';
    else performance = 'poor';

    // Reliability assessment
    let reliability: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    const successRate = status.successRate;
    if (successRate >= 99) reliability = 'excellent';
    else if (successRate >= 95) reliability = 'good';
    else if (successRate >= 85) reliability = 'fair';
    else reliability = 'poor';

    // Error rate assessment
    let errorRate: 'low' | 'medium' | 'high' = 'low';
    const recentErrorCount = context?.recentErrors.length || 0;
    const totalExecutions = context?.totalExecutions || status.executionCount;
    if (totalExecutions > 0) {
      const errorPercentage = (recentErrorCount / totalExecutions) * 100;
      if (errorPercentage < 1) errorRate = 'low';
      else if (errorPercentage < 5) errorRate = 'medium';
      else errorRate = 'high';
    }

    return { performance, reliability, errorRate };
  }

  /**
   * Analyze recent activity trends
   */
  private analyzeRecentActivity(
    status: HookStatus,
    context: EnhancedHookContext | null
  ): {
    lastExecution?: number;
    recentExecutionCount: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
  } {
    const recentExecutionCount = context?.totalExecutions || status.executionCount;
    
    // Simple trend analysis (could be enhanced with historical data)
    let trendDirection: 'increasing' | 'stable' | 'decreasing' = 'stable';
    
    // Basic heuristic: if we have recent executions and high activity, assume increasing
    if (recentExecutionCount > 50 && status.executionRate.includes('/day')) {
      const rate = parseFloat(status.executionRate);
      if (rate > 10) trendDirection = 'increasing';
      else if (rate < 2) trendDirection = 'decreasing';
    }

    return {
      lastExecution: status.lastExecution,
      recentExecutionCount,
      trendDirection
    };
  }

  /**
   * Cache management utilities
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheExpiry;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const hookCoverageService = new HookCoverageService();

// Utility functions for formatting data
export const formatUtils = {
  /**
   * Format numbers with appropriate suffixes
   */
  formatNumber: (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  /**
   * Format duration in human-readable format
   */
  formatDuration: (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },

  /**
   * Format cost in currency
   */
  formatCost: (cost: number): string => {
    if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`; // Show in millicents
    return `$${cost.toFixed(4)}`;
  },

  /**
   * Format relative time
   */
  formatRelativeTime: (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  },

  /**
   * Get health status color class
   */
  getHealthColorClass: (health: 'excellent' | 'good' | 'fair' | 'poor'): string => {
    switch (health) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  },

  /**
   * Get impact level color class
   */
  getImpactColorClass: (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  }
};