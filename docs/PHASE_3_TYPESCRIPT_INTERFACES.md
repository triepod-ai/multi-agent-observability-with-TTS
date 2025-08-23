# Phase 3 Educational Dashboard TypeScript Interface Definitions

## Overview

This document defines comprehensive TypeScript interfaces for Phase 3 Advanced Orchestration features, ensuring type safety and consistency across all components.

## File Structure for Type Definitions

```
apps/client/src/types/educational/
├── index.ts              # Main exports
├── progression.ts        # Learning progression interfaces
├── flowDiagram.ts       # Enhanced flow diagram interfaces  
├── sandbox.ts           # Interactive tester interfaces
├── shared.ts            # Shared utilities and base interfaces
└── events.ts            # Event system interfaces
```

## Core Shared Interfaces

### apps/client/src/types/educational/shared.ts

```typescript
// Base interfaces used across all Phase 3 features
export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface User {
  userId: string;
  displayName: string;
  email?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  animations: boolean;
  notifications: boolean;
  accessibility: AccessibilitySettings;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// Competency and skill tracking
export interface CompetencyArea {
  areaId: string;
  name: string;
  description: string;
  weight: number; // 0.0-1.0 for weighted scoring
}

export interface SkillLevel {
  level: 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  threshold: number; // 0-100
  requirements: string[];
  color: string;
}

// Common UI states
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number; // 0-100 for progress indicators
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorCode?: string;
  recoverable: boolean;
  retryFunction?: () => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Performance monitoring
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  interactionLatency: number;
  animationFPS: number;
  errorRate: number;
}
```

## Learning Progression Interfaces

### apps/client/src/types/educational/progression.ts

```typescript
import type { BaseEntity, User, CompetencyArea, SkillLevel, ValidationResult } from './shared';

// Main progression tracking
export interface LearningProgression extends BaseEntity {
  userId: string;
  overallProgress: number; // 0-100%
  competencies: CompetencyMap;
  badges: Badge[];
  learningPath: LearningPath;
  assessmentResults: AssessmentResult[];
  timeSpentMinutes: number;
  streakDays: number;
  preferences: LearningPreferences;
}

export interface CompetencyMap {
  [hookId: string]: HookCompetency;
}

export interface HookCompetency {
  hookId: string;
  conceptUnderstanding: number; // 0-100%
  practicalApplication: number; // 0-100%
  troubleshooting: number; // 0-100%
  bestPractices: number; // 0-100%
  overallMastery: number; // 0-100% computed average
  lastAssessed: number;
  assessmentCount: number;
  skillLevel: SkillLevel['level'];
  nextMilestone?: CompetencyMilestone;
}

export interface CompetencyMilestone {
  milestoneId: string;
  name: string;
  description: string;
  requiredScore: number;
  badge?: Badge;
  estimatedTimeMinutes: number;
}

// Learning paths and navigation
export interface LearningPath extends BaseEntity {
  pathId: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDurationMinutes: number;
  steps: LearningPathStep[];
  prerequisites: string[];
  outcomes: LearningOutcome[];
}

export interface LearningPathStep {
  stepId: string;
  hookId: string;
  name: string;
  description: string;
  stepType: 'concept' | 'practice' | 'assessment' | 'project';
  competencyLevel: SkillLevel['level'];
  prerequisites: string[];
  estimatedMinutes: number;
  isCompleted: boolean;
  completionCriteria: CompletionCriteria;
  resources: LearningResource[];
}

export interface CompletionCriteria {
  type: 'score' | 'time' | 'interaction' | 'mixed';
  requirements: {
    minimumScore?: number;
    minimumTimeMinutes?: number;
    requiredInteractions?: string[];
    customValidator?: string;
  };
}

export interface LearningResource {
  resourceId: string;
  type: 'video' | 'article' | 'interactive' | 'documentation' | 'example';
  title: string;
  url: string;
  duration?: number;
  description?: string;
}

export interface LearningOutcome {
  outcomeId: string;
  description: string;
  competencyAreas: string[];
  assessmentMethod: 'quiz' | 'project' | 'practical' | 'peer-review';
}

// Assessment and testing
export interface AssessmentResult extends BaseEntity {
  assessmentId: string;
  hookId: string;
  userId: string;
  assessmentType: 'knowledge' | 'practical' | 'comprehensive';
  score: number; // 0-100
  maxScore: number;
  timeSpentSeconds: number;
  answers: AssessmentAnswer[];
  competencyImpact: CompetencyImpact;
  feedback: AssessmentFeedback;
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string | string[] | boolean;
  isCorrect: boolean;
  timeSpentSeconds: number;
  attempts: number;
}

export interface CompetencyImpact {
  [area: string]: number; // Delta change in competency score
}

export interface AssessmentFeedback {
  overallFeedback: string;
  strengths: string[];
  improvementAreas: string[];
  recommendedNextSteps: string[];
  resourceSuggestions: LearningResource[];
}

// Badge and achievement system
export interface Badge extends BaseEntity {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  category: BadgeCategory;
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedDate?: number;
  hookIds: string[];
  requirements: BadgeRequirement[];
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export interface BadgeCategory {
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface BadgeRequirement {
  type: 'competency' | 'assessment' | 'streak' | 'time' | 'interaction';
  description: string;
  target: number;
  current: number;
  isCompleted: boolean;
}

// Learning preferences and personalization
export interface LearningPreferences {
  preferredDifficulty: 'adaptive' | 'beginner' | 'intermediate' | 'advanced';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  pacePreference: 'slow' | 'normal' | 'fast' | 'adaptive';
  notificationSettings: NotificationSettings;
  pathCustomization: PathCustomization;
}

export interface NotificationSettings {
  milestoneAlerts: boolean;
  dailyReminders: boolean;
  weeklyProgress: boolean;
  badgeEarned: boolean;
  streakReminders: boolean;
}

export interface PathCustomization {
  skipIntroductions: boolean;
  focusAreas: string[];
  avoidedTopics: string[];
  timeConstraints: TimeConstraint[];
}

export interface TimeConstraint {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxSessionMinutes: number;
}

// Analytics and insights
export interface ProgressAnalytics extends BaseEntity {
  userId: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: number;
  endDate: number;
  metrics: AnalyticsMetrics;
  insights: AnalyticsInsight[];
  recommendations: AnalyticsRecommendation[];
}

export interface AnalyticsMetrics {
  totalTimeMinutes: number;
  sessionsCount: number;
  averageSessionMinutes: number;
  competencyGains: { [hookId: string]: number };
  badgesEarned: number;
  assessmentsPassed: number;
  currentStreak: number;
  longestStreak: number;
  engagement: EngagementMetrics;
}

export interface EngagementMetrics {
  interactionCount: number;
  featureUsage: { [feature: string]: number };
  errorEncounters: number;
  helpRequests: number;
  completionRate: number; // 0-100%
}

export interface AnalyticsInsight {
  insightId: string;
  type: 'strength' | 'weakness' | 'trend' | 'opportunity';
  title: string;
  description: string;
  data: any;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface AnalyticsRecommendation {
  recommendationId: string;
  type: 'learning-path' | 'review' | 'practice' | 'assessment';
  title: string;
  description: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  estimatedTimeMinutes: number;
  hookIds: string[];
  action: RecommendationAction;
}

export interface RecommendationAction {
  actionType: 'navigate' | 'schedule' | 'reminder' | 'custom';
  target: string;
  parameters?: Record<string, any>;
}
```

## Enhanced Flow Diagram Interfaces

### apps/client/src/types/educational/flowDiagram.ts

```typescript
import type { BaseEntity, CompetencyArea, PerformanceMetrics } from './shared';
import type { HookCompetency } from './progression';

// Enhanced node representation
export interface FlowDiagramNode extends BaseEntity {
  nodeId: string;
  hookId: string;
  name: string;
  icon: string;
  description: string;
  position: NodePosition;
  dimensions: NodeDimensions;
  visualState: NodeVisualState;
  renderingConfig: NodeRenderingConfig;
  interactionConfig: NodeInteractionConfig;
  animationConfig: NodeAnimationConfig;
  competencyOverlay?: CompetencyOverlay;
  connections: string[]; // Connected node IDs
  metadata: NodeMetadata;
}

export interface NodePosition {
  x: number;
  y: number;
  z?: number; // For 3D layouts
}

export interface NodeDimensions {
  width: number;
  height: number;
  padding: number;
  borderRadius: number;
}

export interface NodeVisualState {
  state: 'idle' | 'hovered' | 'selected' | 'active' | 'executing' | 'completed' | 'error';
  opacity: number; // 0.0-1.0
  scale: number; // Scaling factor
  rotation: number; // Degrees
  color: NodeColors;
}

export interface NodeColors {
  background: string;
  border: string;
  text: string;
  accent: string;
  glow?: string;
}

export interface NodeRenderingConfig {
  engine: 'svg' | 'canvas';
  layerPriority: number;
  cacheable: boolean;
  highDPI: boolean;
  antialiasing: boolean;
}

export interface NodeInteractionConfig {
  clickable: boolean;
  hoverable: boolean;
  draggable: boolean;
  selectable: boolean;
  focusable: boolean;
  tooltip: boolean;
  contextMenu: boolean;
  doubleClickAction?: string;
  rightClickAction?: string;
}

export interface NodeAnimationConfig {
  entrance: AnimationConfig;
  exit: AnimationConfig;
  idle: AnimationConfig;
  interaction: AnimationConfig;
  competencyChange: AnimationConfig;
}

export interface AnimationConfig {
  type: 'none' | 'fade' | 'scale' | 'slide' | 'bounce' | 'pulse' | 'glow' | 'rotate';
  duration: number; // milliseconds
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
  delay: number; // milliseconds
  loop: boolean;
  direction: 'normal' | 'reverse' | 'alternate';
}

export interface CompetencyOverlay {
  enabled: boolean;
  competencyData: HookCompetency;
  visualStyle: CompetencyVisualStyle;
  interactionEnabled: boolean;
}

export interface CompetencyVisualStyle {
  type: 'ring' | 'bar' | 'fill' | 'gradient';
  colors: CompetencyColors;
  strokeWidth: number;
  showPercentage: boolean;
  showLevel: boolean;
  animateChanges: boolean;
}

export interface CompetencyColors {
  novice: string;
  beginner: string;
  intermediate: string;
  advanced: string;
  expert: string;
  unknown: string;
}

export interface NodeMetadata {
  hookType: string;
  executionOrder: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex';
  tags: string[];
  learningObjectives: string[];
  prerequisites: string[];
}

// Connection system
export interface FlowConnection extends BaseEntity {
  connectionId: string;
  fromNodeId: string;
  toNodeId: string;
  connectionType: ConnectionType;
  visualStyle: ConnectionVisualStyle;
  animationStyle: ConnectionAnimation;
  interactionConfig: ConnectionInteractionConfig;
  metadata: ConnectionMetadata;
}

export interface ConnectionType {
  type: 'sequential' | 'conditional' | 'parallel' | 'error' | 'data-flow';
  condition?: string; // For conditional connections
  probability?: number; // 0.0-1.0 for probabilistic flows
  weight?: number; // Connection strength/importance
}

export interface ConnectionVisualStyle {
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  color: string;
  opacity: number;
  arrowStyle: ArrowStyle;
  curvature: number; // 0.0-1.0
  zIndex: number;
}

export interface ArrowStyle {
  enabled: boolean;
  size: number;
  style: 'triangle' | 'circle' | 'diamond' | 'custom';
  position: 'start' | 'end' | 'both';
}

export interface ConnectionAnimation {
  enabled: boolean;
  type: 'flow' | 'pulse' | 'dash' | 'glow';
  speed: number; // pixels per second or animation cycles per second
  direction: 'forward' | 'backward' | 'bidirectional';
  particleCount?: number; // For particle-based animations
  particleSize?: number;
}

export interface ConnectionInteractionConfig {
  hoverable: boolean;
  clickable: boolean;
  tooltip: boolean;
  highlightPath: boolean; // Highlight entire path on hover
}

export interface ConnectionMetadata {
  dataFlowType?: string;
  bandwidth?: number;
  latency?: number;
  errorRate?: number;
  description?: string;
}

// Flow diagram state management
export interface FlowDiagramState {
  diagramId: string;
  nodes: Map<string, FlowDiagramNode>;
  connections: Map<string, FlowConnection>;
  viewport: ViewportState;
  interaction: InteractionState;
  animation: AnimationState;
  performance: PerformanceState;
}

export interface ViewportState {
  zoom: number; // 0.1-5.0
  pan: { x: number; y: number };
  center: { x: number; y: number };
  bounds: ViewportBounds;
  autoFit: boolean;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface InteractionState {
  mode: 'view' | 'edit' | 'simulate' | 'assess';
  selectedNodes: Set<string>;
  hoveredNode?: string;
  dragState?: DragState;
  selectionBox?: SelectionBox;
  contextMenu?: ContextMenuState;
}

export interface DragState {
  isDragging: boolean;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  draggedNodes: Set<string>;
}

export interface SelectionBox {
  isActive: boolean;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  selectedNodes: Set<string>;
}

export interface ContextMenuState {
  isVisible: boolean;
  position: { x: number; y: number };
  targetNodeId?: string;
  targetConnectionId?: string;
  menuItems: ContextMenuItem[];
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: string;
  disabled?: boolean;
  separator?: boolean;
}

export interface AnimationState {
  isPlaying: boolean;
  currentAnimation?: FlowAnimation;
  animationQueue: FlowAnimation[];
  playbackSpeed: number; // 0.1-5.0
  currentStep: number;
  totalSteps: number;
}

export interface FlowAnimation {
  animationId: string;
  name: string;
  type: 'execution-sequence' | 'data-flow' | 'error-propagation' | 'competency-progress';
  duration: number;
  steps: AnimationStep[];
  loop: boolean;
  autoPlay: boolean;
}

export interface AnimationStep {
  stepId: string;
  duration: number;
  delay: number;
  nodeTargets: string[];
  connectionTargets: string[];
  actions: AnimationAction[];
}

export interface AnimationAction {
  type: 'highlight' | 'pulse' | 'flow' | 'appear' | 'disappear' | 'move' | 'scale' | 'rotate';
  parameters: Record<string, any>;
  easing: AnimationConfig['easing'];
}

export interface PerformanceState {
  frameRate: number;
  renderTime: number;
  memoryUsage: number;
  nodeCount: number;
  connectionCount: number;
  visibleNodes: number;
  visibleConnections: number;
  performanceMode: 'auto' | 'performance' | 'quality';
}

// Simulation and execution
export interface FlowSimulation {
  simulationId: string;
  name: string;
  scenario: SimulationScenario;
  state: SimulationState;
  results: SimulationResults;
}

export interface SimulationScenario {
  scenarioId: string;
  name: string;
  description: string;
  hookSequence: string[];
  parameters: Record<string, any>;
  expectedOutcome: string;
  learningObjectives: string[];
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  startTime: number;
  endTime?: number;
  errors: SimulationError[];
}

export interface SimulationResults {
  success: boolean;
  executionTime: number;
  stepResults: StepResult[];
  competencyGains: Record<string, number>;
  insights: string[];
  nextRecommendations: string[];
}

export interface StepResult {
  stepIndex: number;
  hookId: string;
  success: boolean;
  duration: number;
  output?: any;
  error?: string;
}

export interface SimulationError {
  errorId: string;
  type: 'execution' | 'validation' | 'timeout' | 'security';
  message: string;
  stepIndex: number;
  recoverable: boolean;
}
```

## Interactive Sandbox Interfaces

### apps/client/src/types/educational/sandbox.ts

```typescript
import type { BaseEntity, ValidationResult, PerformanceMetrics } from './shared';

// Main sandbox environment
export interface SandboxEnvironment extends BaseEntity {
  environmentId: string;
  userId: string;
  hookType: string;
  securityConfig: SecurityConfig;
  resourceLimits: ResourceLimits;
  executionHistory: SandboxExecution[];
  currentSession?: SandboxSession;
}

export interface SecurityConfig {
  isolationLevel: 'iframe' | 'web-worker' | 'vm';
  allowedAPIs: string[];
  blockedPatterns: string[];
  cspPolicies: CSPPolicy[];
  runtimeRestrictions: RuntimeRestrictions;
  auditLogging: boolean;
}

export interface CSPPolicy {
  directive: string;
  sources: string[];
  strict: boolean;
}

export interface RuntimeRestrictions {
  allowEval: boolean;
  allowDOM: boolean;
  allowNetwork: boolean;
  allowFileSystem: boolean;
  allowWebAssembly: boolean;
  maxRecursionDepth: number;
  maxLoopIterations: number;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxExecutionTimeMS: number;
  maxCPUUsage: number; // percentage
  maxNetworkRequests: number;
  maxFileReads: number;
  maxFileWrites: number;
  maxConsoleOutputKB: number;
}

// Sandbox sessions and execution
export interface SandboxSession extends BaseEntity {
  sessionId: string;
  environmentId: string;
  code: string;
  executionState: ExecutionState;
  securityValidation: SecurityValidation;
  performance: SandboxPerformance;
  results?: ExecutionResult;
  metadata: SessionMetadata;
}

export interface ExecutionState {
  status: 'idle' | 'validating' | 'queued' | 'running' | 'completed' | 'error' | 'timeout' | 'killed';
  startTime?: number;
  endTime?: number;
  progress: number; // 0-100%
  currentLine?: number;
  stackTrace?: string[];
}

export interface SecurityValidation {
  riskLevel: 'safe' | 'warning' | 'dangerous' | 'critical';
  violations: SecurityViolation[];
  recommendations: string[];
  autoBlock: boolean;
  manualReview: boolean;
  validationTime: number;
}

export interface SecurityViolation {
  violationId: string;
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  lineNumber: number;
  columnNumber: number;
  suggestion: string;
  autoFix?: AutoFix;
}

export type ViolationType =
  | 'code-injection'
  | 'file-access'
  | 'network-request'
  | 'eval-usage'
  | 'infinite-loop'
  | 'memory-exhaustion'
  | 'dom-manipulation'
  | 'xss-risk'
  | 'prototype-pollution';

export interface AutoFix {
  available: boolean;
  description: string;
  fixedCode?: string;
  confidence: number; // 0-100%
}

export interface SandboxPerformance extends PerformanceMetrics {
  memoryPeak: number;
  cpuUsage: number;
  networkRequests: number;
  fileOperations: number;
  consoleOutputSize: number;
  cacheHitRate: number;
}

export interface ExecutionResult {
  success: boolean;
  output: ExecutionOutput;
  errors: ExecutionError[];
  warnings: ExecutionWarning[];
  metadata: ExecutionMetadata;
  learningInsights?: LearningInsights;
}

export interface ExecutionOutput {
  stdout: string;
  stderr: string;
  consoleLog: ConsoleMessage[];
  returnValue?: any;
  sideEffects: SideEffect[];
  hookPayload?: any; // Simulated hook payload
}

export interface ConsoleMessage {
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  lineNumber?: number;
}

export interface SideEffect {
  type: 'file-write' | 'network-call' | 'dom-change' | 'storage-access';
  description: string;
  simulated: boolean;
  safe: boolean;
}

export interface ExecutionError {
  errorId: string;
  type: 'syntax' | 'runtime' | 'security' | 'timeout' | 'memory' | 'network';
  message: string;
  lineNumber?: number;
  columnNumber?: number;
  stackTrace: string;
  suggestion?: string;
  relatedDocs?: string[];
}

export interface ExecutionWarning {
  warningId: string;
  type: 'performance' | 'best-practice' | 'security' | 'compatibility';
  message: string;
  lineNumber?: number;
  severity: 'info' | 'warning';
  suggestion?: string;
}

export interface ExecutionMetadata {
  executionTime: number;
  linesExecuted: number;
  functionsInvoked: string[];
  variablesCreated: string[];
  apiCallsMade: string[];
  resourcesAccessed: string[];
}

export interface LearningInsights {
  conceptsUsed: string[];
  bestPracticesFollowed: string[];
  commonMistakes: string[];
  improvementSuggestions: string[];
  relatedExamples: string[];
  nextSteps: string[];
}

export interface SessionMetadata {
  source: 'manual' | 'template' | 'example' | 'assessment';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  tags: string[];
  estimatedDuration: number;
  actualDuration?: number;
}

// Test scenarios and templates
export interface TestScenario extends BaseEntity {
  scenarioId: string;
  name: string;
  description: string;
  hookType: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: ScenarioCategory;
  template: CodeTemplate;
  expectedResults: ExpectedResults;
  learningObjectives: string[];
  hints: Hint[];
  solutions: Solution[];
}

export interface ScenarioCategory {
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface CodeTemplate {
  code: string;
  language: 'javascript' | 'python' | 'bash';
  placeholders: Placeholder[];
  imports: string[];
  comments: string[];
}

export interface Placeholder {
  id: string;
  marker: string; // e.g., "{{placeholder_name}}"
  description: string;
  defaultValue: string;
  validation?: ValidationRule[];
  suggestions?: string[];
}

export interface ValidationRule {
  type: 'required' | 'type' | 'pattern' | 'length' | 'custom';
  value: any;
  message: string;
}

export interface ExpectedResults {
  output: string | RegExp;
  exitCode: number;
  sideEffects: ExpectedSideEffect[];
  performance: PerformanceBenchmark;
  errors: ExpectedError[];
}

export interface ExpectedSideEffect {
  type: string;
  description: string;
  required: boolean;
}

export interface PerformanceBenchmark {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxCPUUsage: number;
}

export interface ExpectedError {
  type: string;
  messagePattern: string | RegExp;
  shouldOccur: boolean;
}

export interface Hint {
  hintId: string;
  trigger: HintTrigger;
  content: string;
  type: 'tip' | 'warning' | 'example' | 'link';
  priority: number;
  showAfterSeconds?: number;
}

export interface HintTrigger {
  type: 'time' | 'error' | 'attempts' | 'idle' | 'pattern';
  condition: any;
}

export interface Solution {
  solutionId: string;
  name: string;
  description: string;
  code: string;
  explanation: string;
  concepts: string[];
  difficulty: 'basic' | 'optimal' | 'advanced';
  tradeoffs?: string[];
}

// Code editor integration
export interface EditorConfiguration {
  language: 'javascript' | 'python' | 'bash' | 'json' | 'yaml';
  theme: 'light' | 'dark' | 'high-contrast';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoComplete: boolean;
  syntaxHighlighting: boolean;
  errorSquiggles: boolean;
  bracketMatching: boolean;
  keyBindings: 'default' | 'vim' | 'emacs';
}

export interface EditorState {
  content: string;
  cursorPosition: CursorPosition;
  selections: EditorSelection[];
  foldedRegions: FoldedRegion[];
  bookmarks: Bookmark[];
  breakpoints: Breakpoint[];
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface EditorSelection {
  start: CursorPosition;
  end: CursorPosition;
  direction: 'ltr' | 'rtl';
}

export interface FoldedRegion {
  startLine: number;
  endLine: number;
  collapsed: boolean;
}

export interface Bookmark {
  line: number;
  label?: string;
  color?: string;
}

export interface Breakpoint {
  line: number;
  enabled: boolean;
  condition?: string;
  hitCount: number;
}

// Sandbox execution history and analytics
export interface SandboxExecution extends BaseEntity {
  executionId: string;
  sessionId: string;
  userId: string;
  hookType: string;
  code: string;
  result: ExecutionResult;
  performance: SandboxPerformance;
  learningValue: number; // 0-100 how much user learned
  difficulty: number; // 0-100 perceived difficulty
  satisfaction: number; // 0-100 user satisfaction
}

export interface SandboxAnalytics {
  userId: string;
  timeframe: { start: number; end: number };
  summary: SandboxSummary;
  progressTrends: ProgressTrend[];
  commonErrors: CommonError[];
  learningInsights: AnalyticsInsights[];
}

export interface SandboxSummary {
  totalExecutions: number;
  successfulExecutions: number;
  averageExecutionTime: number;
  averageMemoryUsage: number;
  mostUsedHookTypes: string[];
  learningVelocity: number; // improvement rate
}

export interface ProgressTrend {
  hookType: string;
  timePoints: { timestamp: number; competency: number }[];
  trend: 'improving' | 'stable' | 'declining';
  velocity: number;
}

export interface CommonError {
  errorPattern: string;
  frequency: number;
  hookTypes: string[];
  averageResolutionTime: number;
  commonSolutions: string[];
}

export interface AnalyticsInsights {
  insightType: 'strength' | 'weakness' | 'pattern' | 'recommendation';
  title: string;
  description: string;
  evidence: string[];
  actionItems: string[];
  priority: 'low' | 'medium' | 'high';
}
```

## Event System Interfaces

### apps/client/src/types/educational/events.ts

```typescript
// Event system for cross-component communication
export interface EducationalEvent<T = any> {
  eventId: string;
  timestamp: number;
  source: string;
  type: string;
  payload: T;
  userId?: string;
  sessionId?: string;
}

// Learning progression events
export interface ProgressionEvents {
  'progression:updated': {
    userId: string;
    hookId: string;
    competencyArea: string;
    oldValue: number;
    newValue: number;
    milestone?: string;
  };
  
  'badge:earned': {
    userId: string;
    badgeId: string;
    hookIds: string[];
    category: string;
    points: number;
  };
  
  'assessment:completed': {
    userId: string;
    assessmentId: string;
    hookId: string;
    score: number;
    improvementAreas: string[];
  };
  
  'path:step-completed': {
    userId: string;
    pathId: string;
    stepId: string;
    hookId: string;
    timeSpent: number;
  };
  
  'milestone:achieved': {
    userId: string;
    milestoneId: string;
    hookId: string;
    competencyArea: string;
    level: string;
  };
}

// Flow diagram events
export interface FlowDiagramEvents {
  'flow:node-selected': {
    nodeId: string;
    hookId: string;
    competencyData?: any;
    interactionType: 'click' | 'keyboard' | 'touch';
  };
  
  'flow:animation-started': {
    animationId: string;
    type: string;
    duration: number;
  };
  
  'flow:animation-completed': {
    animationId: string;
    success: boolean;
    actualDuration: number;
  };
  
  'flow:simulation-executed': {
    simulationId: string;
    scenarioId: string;
    results: any;
    learningObjectives: string[];
  };
  
  'flow:competency-viewed': {
    nodeId: string;
    hookId: string;
    competencyArea: string;
    currentLevel: string;
  };
}

// Interactive tester events
export interface SandboxEvents {
  'sandbox:execution-started': {
    sessionId: string;
    hookType: string;
    codeLength: number;
    securityRisk: string;
  };
  
  'sandbox:execution-completed': {
    sessionId: string;
    success: boolean;
    executionTime: number;
    learningInsights: string[];
  };
  
  'sandbox:security-violation': {
    sessionId: string;
    violationType: string;
    severity: string;
    blocked: boolean;
  };
  
  'sandbox:scenario-loaded': {
    scenarioId: string;
    hookType: string;
    difficulty: string;
    learningObjectives: string[];
  };
  
  'sandbox:hint-requested': {
    sessionId: string;
    hintType: string;
    context: any;
  };
}

// UI interaction events
export interface UIEvents {
  'modal:opened': {
    modalId: string;
    context: any;
    source: string;
  };
  
  'modal:closed': {
    modalId: string;
    reason: 'user' | 'programmatic' | 'escape';
    duration: number;
  };
  
  'notification:shown': {
    notificationId: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    persistent: boolean;
  };
  
  'help:requested': {
    context: string;
    helpType: 'tooltip' | 'guide' | 'documentation';
    trigger: 'click' | 'hover' | 'keyboard';
  };
  
  'navigation:changed': {
    fromTab: string;
    toTab: string;
    trigger: 'click' | 'keyboard' | 'programmatic';
  };
}

// Combined event map
export type EducationalEventMap = 
  & ProgressionEvents 
  & FlowDiagramEvents 
  & SandboxEvents 
  & UIEvents;

// Event handler types
export type EventHandler<T = any> = (event: EducationalEvent<T>) => void;

export type EventEmitter = {
  emit: <K extends keyof EducationalEventMap>(
    type: K, 
    payload: EducationalEventMap[K]
  ) => void;
  
  on: <K extends keyof EducationalEventMap>(
    type: K, 
    handler: EventHandler<EducationalEventMap[K]>
  ) => () => void;
  
  off: <K extends keyof EducationalEventMap>(
    type: K, 
    handler: EventHandler<EducationalEventMap[K]>
  ) => void;
  
  once: <K extends keyof EducationalEventMap>(
    type: K, 
    handler: EventHandler<EducationalEventMap[K]>
  ) => void;
};

// Event analytics
export interface EventAnalytics {
  userId: string;
  timeframe: { start: number; end: number };
  eventCounts: Record<keyof EducationalEventMap, number>;
  engagementMetrics: {
    sessionDuration: number;
    interactionRate: number; // events per minute
    featureAdoption: Record<string, number>;
    dropoffPoints: string[];
  };
  learningEffectiveness: {
    conceptsExplored: string[];
    timeToCompetency: Record<string, number>;
    retentionRate: number;
    applicationSuccess: number;
  };
}
```

## Main Type Export File

### apps/client/src/types/educational/index.ts

```typescript
// Main exports for all educational types
export * from './shared';
export * from './progression';
export * from './flowDiagram';
export * from './sandbox';
export * from './events';

// Convenience type unions
export type EducationalFeature = 'progression' | 'flow' | 'sandbox';

export type CompetencyLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type InteractionType = 'click' | 'hover' | 'keyboard' | 'touch' | 'voice';

export type SecurityLevel = 'safe' | 'warning' | 'dangerous' | 'critical';

export type AnimationType = 'none' | 'fade' | 'scale' | 'slide' | 'bounce' | 'pulse' | 'glow' | 'rotate';

export type RenderingEngine = 'svg' | 'canvas' | 'hybrid';

// Type guards
export function isProgressionEvent(event: any): event is EducationalEvent<ProgressionEvents[keyof ProgressionEvents]> {
  return typeof event === 'object' && event.type?.startsWith('progression:');
}

export function isFlowEvent(event: any): event is EducationalEvent<FlowDiagramEvents[keyof FlowDiagramEvents]> {
  return typeof event === 'object' && event.type?.startsWith('flow:');
}

export function isSandboxEvent(event: any): event is EducationalEvent<SandboxEvents[keyof SandboxEvents]> {
  return typeof event === 'object' && event.type?.startsWith('sandbox:');
}

// Utility types
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

This comprehensive set of TypeScript interfaces provides a solid foundation for Phase 3 development, ensuring type safety, consistency, and clear contracts between components. The interfaces support all three major features (Learning Progression, Enhanced Flow Diagrams, and Interactive Sandbox) while maintaining compatibility with existing Phase 1 and Phase 2 implementations.