/**
 * Phase 3 Educational Dashboard Integration Coordinator
 * 
 * Orchestrates seamless integration between:
 * - Learning Progression System 
 * - Visual Flow Diagrams Enhancement
 * - Interactive Prompt Tester
 * 
 * Provides unified event coordination, performance monitoring,
 * and cross-component communication.
 */

import mitt from 'mitt';
import type { 
  LearningProgression,
  HookCompetency,
  AnalyticsRecommendation
} from '../types/learningProgression';
import type { ExecutionResult } from './hookTestRunner';

// Event types for cross-component communication
interface Phase3Events {
  // Learning Progression Events
  'competency-updated': {
    userId: string;
    hookId: string;
    dimension: string;
    oldScore: number;
    newScore: number;
    skillLevel: string;
  };
  
  'badge-earned': {
    userId: string;
    badge: any;
    hookId: string;
  };
  
  'milestone-achieved': {
    userId: string;
    hookId: string;
    dimension: string;
    milestone: number;
    score: number;
  };
  
  // Flow Diagram Events
  'node-selected': {
    nodeId: string;
    competencyLevel?: number;
    masteryType?: string;
  };
  
  'simulation-started': {
    nodeCount: number;
    estimatedDuration: number;
  };
  
  'simulation-step': {
    currentStep: number;
    totalSteps: number;
    activeNodeId: string;
  };
  
  // Prompt Tester Events
  'test-started': {
    testId: string;
    scenario?: string;
    language: string;
  };
  
  'test-completed': {
    testId: string;
    result: ExecutionResult;
    learningValue: number;
  };
  
  'security-validation': {
    code: string;
    riskLevel: string;
    valid: boolean;
  };
  
  // Performance Events
  'performance-warning': {
    component: string;
    metric: string;
    value: number;
    threshold: number;
  };
  
  // Navigation Events
  'tab-changed': {
    from: string;
    to: string;
    context?: any;
  };
  
  // Learning Path Events
  'learning-objective-completed': {
    objectiveId: string;
    hookId: string;
    score: number;
  };
}

class Phase3IntegrationCoordinator {
  private eventBus = mitt<Phase3Events>();
  private performanceMetrics = new Map<string, number[]>();
  private componentStates = new Map<string, any>();
  private integrationSettings = {
    competencyUpdateThreshold: 5, // Minimum score change to trigger updates
    performanceWarningThreshold: 100, // Milliseconds
    maxEventHistory: 1000,
    enableCrossComponentUpdates: true,
    enablePerformanceMonitoring: true
  };

  constructor() {
    this.initializeEventHandlers();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize cross-component event handlers
   */
  private initializeEventHandlers(): void {
    // Learning Progression → Flow Diagram Integration
    this.eventBus.on('competency-updated', (event) => {
      if (!this.integrationSettings.enableCrossComponentUpdates) return;
      
      // Update flow diagram competency overlays
      this.updateFlowDiagramCompetency(event.hookId, {
        level: event.newScore,
        masteryType: this.getMasteryTypeFromScores(event.hookId),
        improvement: event.newScore - event.oldScore
      });
      
      // Record learning analytics
      this.recordLearningActivity('competency_update', {
        hookId: event.hookId,
        improvement: event.newScore - event.oldScore,
        skillLevel: event.skillLevel
      });
    });

    // Flow Diagram → Learning Progression Integration  
    this.eventBus.on('node-selected', (event) => {
      // Update learning progression to focus on selected hook
      this.focusLearningProgression(event.nodeId);
      
      // Provide contextual recommendations
      this.generateContextualRecommendations(event.nodeId);
    });

    // Prompt Tester → Learning Progression Integration
    this.eventBus.on('test-completed', (event) => {
      if (event.result.success) {
        // Award competency points based on test complexity and performance
        const competencyGain = this.calculateCompetencyGain(event.result);
        this.awardCompetencyGain(competencyGain);
      }
      
      // Update learning analytics
      this.recordLearningActivity('test_completion', {
        success: event.result.success,
        executionTime: event.result.executionTime,
        learningValue: event.learningValue
      });
    });

    // Security validation events
    this.eventBus.on('security-validation', (event) => {
      if (!event.valid) {
        // Update learning progression with security awareness
        this.recordSecurityLearning(event.riskLevel);
      }
    });

    // Performance monitoring integration
    this.eventBus.on('performance-warning', (event) => {
      console.warn(`Performance warning in ${event.component}: ${event.metric} = ${event.value}ms (threshold: ${event.threshold}ms)`);
      
      // Adjust component performance settings if needed
      this.adjustPerformanceSettings(event.component, event.metric, event.value);
    });
  }

  /**
   * Start performance monitoring for all components
   */
  private startPerformanceMonitoring(): void {
    if (!this.integrationSettings.enablePerformanceMonitoring) return;

    const performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.name.includes('educational-')) {
          const componentName = entry.name.replace('educational-', '');
          
          if (!this.performanceMetrics.has(componentName)) {
            this.performanceMetrics.set(componentName, []);
          }
          
          const metrics = this.performanceMetrics.get(componentName)!;
          metrics.push(entry.duration);
          
          // Keep only recent metrics
          if (metrics.length > 50) {
            metrics.splice(0, metrics.length - 50);
          }
          
          // Check for performance issues
          if (entry.duration > this.integrationSettings.performanceWarningThreshold) {
            this.eventBus.emit('performance-warning', {
              component: componentName,
              metric: 'duration',
              value: entry.duration,
              threshold: this.integrationSettings.performanceWarningThreshold
            });
          }
        }
      });
    });

    performanceObserver.observe({ entryTypes: ['measure'] });
  }

  /**
   * Update flow diagram competency overlays
   */
  private updateFlowDiagramCompetency(hookId: string, competency: {
    level: number;
    masteryType: string;
    improvement: number;
  }): void {
    const flowState = this.componentStates.get('flow-diagram') || {};
    
    if (!flowState.competencyOverlays) {
      flowState.competencyOverlays = {};
    }
    
    flowState.competencyOverlays[hookId] = competency;
    this.componentStates.set('flow-diagram', flowState);
  }

  /**
   * Determine mastery type based on competency scores
   */
  private getMasteryTypeFromScores(hookId: string): 'knowledge' | 'application' | 'analysis' | 'synthesis' {
    const progressionState = this.componentStates.get('learning-progression');
    if (!progressionState?.competencies?.[hookId]) return 'knowledge';
    
    const competency = progressionState.competencies[hookId];
    const scores = {
      knowledge: competency.knowledge,
      application: competency.application, 
      analysis: competency.analysis,
      synthesis: competency.synthesis
    };
    
    return Object.entries(scores).reduce((highest, [type, score]) => 
      score > scores[highest as keyof typeof scores] ? type as keyof typeof scores : highest,
      'knowledge' as keyof typeof scores
    );
  }

  /**
   * Focus learning progression on specific hook
   */
  private focusLearningProgression(hookId: string): void {
    const progressionState = this.componentStates.get('learning-progression') || {};
    progressionState.focusedHook = hookId;
    progressionState.lastFocusTime = Date.now();
    
    this.componentStates.set('learning-progression', progressionState);
  }

  /**
   * Generate contextual recommendations based on current context
   */
  private generateContextualRecommendations(hookId: string): AnalyticsRecommendation[] {
    const progressionState = this.componentStates.get('learning-progression');
    if (!progressionState?.competencies?.[hookId]) return [];
    
    const competency: HookCompetency = progressionState.competencies[hookId];
    const recommendations: AnalyticsRecommendation[] = [];
    
    // Find lowest dimension and suggest improvement
    const dimensions = ['knowledge', 'application', 'analysis', 'synthesis'] as const;
    const lowestDimension = dimensions.reduce((lowest, current) => 
      competency[current] < competency[lowest] ? current : lowest
    );
    
    if (competency[lowestDimension] < 70) {
      recommendations.push({
        recommendationId: `contextual-${hookId}-${lowestDimension}`,
        type: 'practice',
        title: `Improve ${this.getHookDisplayName(hookId)} ${lowestDimension}`,
        description: `Based on your current focus, work on ${lowestDimension} skills`,
        estimatedImpact: competency[lowestDimension] < 40 ? 'high' : 'medium',
        estimatedTimeMinutes: 15,
        hookIds: [hookId],
        priority: 10 - Math.floor(competency[lowestDimension] / 10),
        reason: `Currently focused on ${hookId} with low ${lowestDimension} score`,
        action: {
          actionType: 'practice',
          target: `${hookId}-${lowestDimension}`,
          parameters: { dimension: lowestDimension, targetScore: 70 }
        }
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate competency gain from test results
   */
  private calculateCompetencyGain(result: ExecutionResult): {
    hookId: string;
    dimension: 'application' | 'analysis';
    gain: number;
  } | null {
    // Determine hook ID from test context (would be provided by test scenario)
    const hookId = this.extractHookIdFromResult(result);
    if (!hookId) return null;
    
    // Base gain calculation
    let baseGain = result.success ? 5 : 2;
    
    // Bonus for execution efficiency
    if (result.executionTime < 1000) {
      baseGain += 2;
    }
    
    // Bonus for clean execution (no warnings)
    if (result.warnings.length === 0) {
      baseGain += 1;
    }
    
    // Determine dimension based on test type
    const dimension = result.executionTime < 2000 ? 'application' : 'analysis';
    
    return {
      hookId,
      dimension,
      gain: Math.min(baseGain, 10) // Cap at 10 points per test
    };
  }

  /**
   * Extract hook ID from execution result
   */
  private extractHookIdFromResult(result: ExecutionResult): string | null {
    // This would be enhanced to parse the test code or scenario to determine which hook it tests
    if (result.output.includes('session_start')) return 'session_start';
    if (result.output.includes('pre_tool_use')) return 'pre_tool_use';
    if (result.output.includes('post_tool_use')) return 'post_tool_use';
    return null;
  }

  /**
   * Award competency gain to learning progression
   */
  private awardCompetencyGain(gain: {
    hookId: string;
    dimension: 'application' | 'analysis';
    gain: number;
  } | null): void {
    if (!gain) return;
    
    const progressionState = this.componentStates.get('learning-progression');
    if (!progressionState?.competencies?.[gain.hookId]) return;
    
    const currentScore = progressionState.competencies[gain.hookId][gain.dimension];
    const newScore = Math.min(100, currentScore + gain.gain);
    
    // Emit competency update event
    this.eventBus.emit('competency-updated', {
      userId: progressionState.userId,
      hookId: gain.hookId,
      dimension: gain.dimension,
      oldScore: currentScore,
      newScore,
      skillLevel: this.getSkillLevelFromScore(newScore)
    });
  }

  /**
   * Record security learning for failed validations
   */
  private recordSecurityLearning(riskLevel: string): void {
    const securityPoints = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 5
    };
    
    const points = securityPoints[riskLevel as keyof typeof securityPoints] || 1;
    
    // Award security awareness points
    this.recordLearningActivity('security_awareness', {
      riskLevel,
      pointsAwarded: points
    });
  }

  /**
   * Record learning activity for analytics
   */
  private recordLearningActivity(activityType: string, data: any): void {
    const analytics = this.componentStates.get('analytics') || {
      activities: [],
      totalPoints: 0
    };
    
    analytics.activities.push({
      timestamp: Date.now(),
      type: activityType,
      data
    });
    
    // Keep only recent activities
    if (analytics.activities.length > this.integrationSettings.maxEventHistory) {
      analytics.activities.splice(0, analytics.activities.length - this.integrationSettings.maxEventHistory);
    }
    
    this.componentStates.set('analytics', analytics);
  }

  /**
   * Adjust performance settings based on warnings
   */
  private adjustPerformanceSettings(component: string, metric: string, value: number): void {
    const settings = this.componentStates.get(`${component}-settings`) || {};
    
    if (metric === 'duration' && value > 200) {
      // Reduce animation complexity for better performance
      settings.animationComplexity = Math.max(0.5, (settings.animationComplexity || 1.0) - 0.1);
      settings.enableHighDpiRendering = false;
    }
    
    if (component === 'flow-diagram' && value > 150) {
      // Reduce visible node count for better flow diagram performance
      settings.maxVisibleNodes = Math.max(20, (settings.maxVisibleNodes || 50) - 5);
    }
    
    this.componentStates.set(`${component}-settings`, settings);
  }

  /**
   * Helper functions
   */
  private getHookDisplayName(hookId: string): string {
    const displayNames: Record<string, string> = {
      'session_start': 'Session Start',
      'user_prompt_submit': 'User Prompt Submit',
      'pre_tool_use': 'Pre Tool Use',
      'post_tool_use': 'Post Tool Use',
      'subagent_stop': 'Subagent Stop',
      'stop': 'Stop',
      'notification': 'Notification',
      'precompact': 'PreCompact'
    };
    return displayNames[hookId] || hookId;
  }

  private getSkillLevelFromScore(score: number): string {
    if (score >= 90) return 'expert';
    if (score >= 75) return 'advanced';
    if (score >= 60) return 'intermediate';
    if (score >= 30) return 'beginner';
    return 'novice';
  }

  /**
   * Public API for components to interact with integration system
   */

  // Event system access
  on<T extends keyof Phase3Events>(event: T, handler: (payload: Phase3Events[T]) => void): void {
    this.eventBus.on(event, handler);
  }

  off<T extends keyof Phase3Events>(event: T, handler: (payload: Phase3Events[T]) => void): void {
    this.eventBus.off(event, handler);
  }

  emit<T extends keyof Phase3Events>(event: T, payload: Phase3Events[T]): void {
    this.eventBus.emit(event, payload);
  }

  // Component state management
  setComponentState(componentId: string, state: any): void {
    this.componentStates.set(componentId, state);
  }

  getComponentState(componentId: string): any {
    return this.componentStates.get(componentId);
  }

  // Performance metrics
  getPerformanceMetrics(componentId?: string): Map<string, number[]> | number[] | null {
    if (componentId) {
      return this.performanceMetrics.get(componentId) || null;
    }
    return this.performanceMetrics;
  }

  // Settings management
  updateSettings(newSettings: Partial<typeof this.integrationSettings>): void {
    this.integrationSettings = { ...this.integrationSettings, ...newSettings };
  }

  getSettings(): typeof this.integrationSettings {
    return { ...this.integrationSettings };
  }

  // Performance measurement helpers
  measureComponentPerformance<T>(componentName: string, operation: string, fn: () => T): T {
    const measureName = `educational-${componentName}-${operation}`;
    performance.mark(`${measureName}-start`);
    
    const result = fn();
    
    performance.mark(`${measureName}-end`);
    performance.measure(measureName, `${measureName}-start`, `${measureName}-end`);
    
    return result;
  }

  async measureAsyncComponentPerformance<T>(
    componentName: string, 
    operation: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    const measureName = `educational-${componentName}-${operation}`;
    performance.mark(`${measureName}-start`);
    
    const result = await fn();
    
    performance.mark(`${measureName}-end`);
    performance.measure(measureName, `${measureName}-start`, `${measureName}-end`);
    
    return result;
  }

  // Cross-component navigation
  navigateWithContext(targetTab: string, context?: any): void {
    this.eventBus.emit('tab-changed', {
      from: this.componentStates.get('current-tab') || 'unknown',
      to: targetTab,
      context
    });
    
    this.componentStates.set('current-tab', targetTab);
  }

  // Learning objective completion tracking
  completeObjective(objectiveId: string, hookId: string, score: number): void {
    this.eventBus.emit('learning-objective-completed', {
      objectiveId,
      hookId,
      score
    });
    
    // Award points for objective completion
    const pointsAwarded = Math.floor(score / 10);
    this.recordLearningActivity('objective_completion', {
      objectiveId,
      hookId,
      score,
      pointsAwarded
    });
  }

  // Health check for integration system
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'error';
    components: Record<string, 'active' | 'inactive' | 'error'>;
    performanceStatus: 'good' | 'warning' | 'critical';
    memoryUsage?: number;
  } {
    const componentStates: Record<string, 'active' | 'inactive' | 'error'> = {};
    
    // Check component states
    ['learning-progression', 'flow-diagram', 'prompt-tester'].forEach(component => {
      const state = this.componentStates.get(component);
      componentStates[component] = state ? 'active' : 'inactive';
    });
    
    // Check performance metrics
    const avgPerformance = Array.from(this.performanceMetrics.values())
      .flat()
      .reduce((sum, val, _, arr) => sum + val / arr.length, 0);
    
    const performanceStatus = avgPerformance > 200 ? 'critical' : 
                            avgPerformance > 100 ? 'warning' : 'good';
    
    const overallStatus = Object.values(componentStates).includes('error') ? 'error' :
                         performanceStatus === 'critical' ? 'degraded' : 'healthy';
    
    return {
      status: overallStatus,
      components: componentStates,
      performanceStatus,
      memoryUsage: performance.memory?.usedJSHeapSize
    };
  }
}

// Create singleton instance
export const phase3Integration = new Phase3IntegrationCoordinator();
export default phase3Integration;