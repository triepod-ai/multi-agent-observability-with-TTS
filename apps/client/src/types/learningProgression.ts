// Learning Progression System Type Definitions
// Phase 3 Educational Dashboard - Advanced Competency Tracking

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// 4-dimensional competency model
export interface CompetencyDimensions {
  knowledge: number; // 0-100% - Understanding concepts and theory
  application: number; // 0-100% - Applying knowledge in practice
  analysis: number; // 0-100% - Analyzing problems and debugging
  synthesis: number; // 0-100% - Creating solutions and best practices
}

export interface HookCompetency extends CompetencyDimensions {
  hookId: string;
  overallMastery: number; // 0-100% weighted average
  skillLevel: CompetencyLevel;
  lastAssessed: number;
  assessmentCount: number;
  nextMilestone?: CompetencyMilestone;
  learningVelocity: number; // Rate of improvement over time
}

export type CompetencyLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CompetencyMilestone {
  milestoneId: string;
  name: string;
  description: string;
  requiredScore: number;
  hookId: string;
  dimension: keyof CompetencyDimensions;
  badge?: Badge;
  estimatedTimeMinutes: number;
}

export interface LearningProgression extends BaseEntity {
  userId: string;
  overallProgress: number; // 0-100%
  competencies: Record<string, HookCompetency>; // hookId -> competency
  badges: Badge[];
  learningPath: LearningPath;
  assessmentResults: AssessmentResult[];
  totalTimeSpentMinutes: number;
  streakDays: number;
  lastActivityTimestamp: number;
  preferences: LearningPreferences;
  analytics: ProgressAnalytics;
}

// Learning Path System
export interface LearningPath extends BaseEntity {
  pathId: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  estimatedDurationMinutes: number;
  steps: LearningPathStep[];
  prerequisites: string[];
  outcomes: LearningOutcome[];
  isPersonalized: boolean;
}

export interface LearningPathStep {
  stepId: string;
  hookId: string;
  name: string;
  description: string;
  stepType: 'concept' | 'practice' | 'assessment' | 'review';
  competencyTarget: CompetencyLevel;
  prerequisites: string[];
  estimatedMinutes: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  completionCriteria: CompletionCriteria;
  resources: LearningResource[];
}

export interface CompletionCriteria {
  type: 'score' | 'time' | 'interaction' | 'assessment';
  requirements: {
    minimumScore?: number; // For assessments
    minimumTimeMinutes?: number; // For timed activities  
    requiredInteractions?: string[]; // For interactive elements
    passAllDimensions?: boolean; // Must pass all 4 competency dimensions
  };
}

export interface LearningResource {
  resourceId: string;
  type: 'guide' | 'example' | 'interactive' | 'assessment' | 'reference';
  title: string;
  description: string;
  url?: string;
  duration?: number;
  difficulty: CompetencyLevel;
}

export interface LearningOutcome {
  outcomeId: string;
  description: string;
  competencyDimensions: (keyof CompetencyDimensions)[];
  targetLevel: CompetencyLevel;
  assessmentMethod: 'quiz' | 'practical' | 'mixed';
}

// Badge and Achievement System
export interface Badge extends BaseEntity {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  earnedDate?: number;
  hookIds: string[];
  requirements: BadgeRequirement[];
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BadgeCategory {
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface BadgeRequirement {
  type: 'competency' | 'assessment' | 'streak' | 'time' | 'practice';
  description: string;
  target: number;
  current: number;
  isCompleted: boolean;
  hookId?: string;
  dimension?: keyof CompetencyDimensions;
}

// Assessment System
export interface AssessmentResult extends BaseEntity {
  assessmentId: string;
  hookId: string;
  userId: string;
  assessmentType: 'knowledge' | 'practical' | 'comprehensive' | 'adaptive';
  score: number; // 0-100
  maxScore: number;
  timeSpentSeconds: number;
  answers: AssessmentAnswer[];
  competencyImpact: CompetencyImpact;
  feedback: AssessmentFeedback;
  difficulty: CompetencyLevel;
}

export interface AssessmentAnswer {
  questionId: string;
  question: string;
  answer: string | string[] | boolean;
  isCorrect: boolean;
  timeSpentSeconds: number;
  attempts: number;
  dimension: keyof CompetencyDimensions;
  explanation?: string;
}

export interface CompetencyImpact {
  knowledge: number; // Delta change (-100 to +100)
  application: number;
  analysis: number;
  synthesis: number;
}

export interface AssessmentFeedback {
  overallFeedback: string;
  dimensionFeedback: Record<keyof CompetencyDimensions, string>;
  strengths: string[];
  improvementAreas: string[];
  recommendedNextSteps: string[];
  resourceSuggestions: LearningResource[];
}

// User Preferences and Personalization
export interface LearningPreferences {
  preferredDifficulty: 'adaptive' | 'beginner' | 'intermediate' | 'advanced';
  learningStyle: 'visual' | 'practical' | 'mixed';
  pacePreference: 'slow' | 'normal' | 'fast' | 'adaptive';
  notificationSettings: NotificationSettings;
  pathCustomization: PathCustomization;
  accessibility: AccessibilitySettings;
}

export interface NotificationSettings {
  milestoneAlerts: boolean;
  dailyReminders: boolean;
  weeklyProgress: boolean;
  badgeEarned: boolean;
  streakReminders: boolean;
  assessmentAvailable: boolean;
}

export interface PathCustomization {
  skipIntroductions: boolean;
  focusAreas: string[]; // hookIds to emphasize
  avoidedTopics: string[]; // hookIds to minimize
  maxSessionMinutes: number;
  preferredAssessmentFrequency: 'low' | 'medium' | 'high';
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// Analytics and Insights
export interface ProgressAnalytics extends BaseEntity {
  userId: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: number;
  endDate: number;
  metrics: AnalyticsMetrics;
  insights: AnalyticsInsight[];
  recommendations: AnalyticsRecommendation[];
  trends: AnalyticsTrend[];
}

export interface AnalyticsMetrics {
  totalTimeMinutes: number;
  sessionsCount: number;
  averageSessionMinutes: number;
  competencyGains: Record<string, CompetencyImpact>; // hookId -> gains
  badgesEarned: number;
  assessmentsPassed: number;
  assessmentsFailed: number;
  currentStreak: number;
  longestStreak: number;
  learningVelocity: number; // Overall improvement rate
  engagement: EngagementMetrics;
}

export interface EngagementMetrics {
  interactionCount: number;
  featureUsage: Record<string, number>; // feature -> usage count
  errorEncounters: number;
  helpRequests: number;
  completionRate: number; // 0-100%
  dropoffRate: number; // 0-100%
  retentionRate: number; // 0-100%
}

export interface AnalyticsInsight {
  insightId: string;
  type: 'strength' | 'weakness' | 'trend' | 'opportunity' | 'achievement';
  title: string;
  description: string;
  data: any;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  hookIds?: string[];
  competencyDimensions?: (keyof CompetencyDimensions)[];
}

export interface AnalyticsRecommendation {
  recommendationId: string;
  type: 'learning-path' | 'review' | 'practice' | 'assessment' | 'rest';
  title: string;
  description: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  estimatedTimeMinutes: number;
  hookIds: string[];
  priority: number; // 1-10
  reason: string;
  action: RecommendationAction;
}

export interface RecommendationAction {
  actionType: 'navigate' | 'start-assessment' | 'review-content' | 'practice' | 'take-break';
  target: string; // URL, hookId, or action identifier
  parameters?: Record<string, any>;
}

export interface AnalyticsTrend {
  trendId: string;
  hookId: string;
  dimension: keyof CompetencyDimensions;
  timePoints: { timestamp: number; value: number }[];
  trend: 'improving' | 'stable' | 'declining' | 'plateauing';
  velocity: number; // Rate of change
  confidence: number; // 0-100% confidence in trend analysis
  projectedOutcome?: {
    targetLevel: CompetencyLevel;
    estimatedTimeToReach: number; // minutes
    confidence: number;
  };
}

// Prerequisite and Gating System
export interface PrerequisiteValidation {
  hookId: string;
  dimension?: keyof CompetencyDimensions;
  minimumLevel: CompetencyLevel;
  minimumScore: number; // 0-100
  alternativeRequirements?: AlternativeRequirement[];
}

export interface AlternativeRequirement {
  type: 'badge' | 'assessment' | 'time' | 'practice';
  target: string | number;
  description: string;
}

export interface PrerequisiteGate {
  gateId: string;
  name: string;
  description: string;
  requirements: PrerequisiteValidation[];
  isUnlocked: boolean;
  unlockProgress: number; // 0-100%
  estimatedTimeToUnlock: number; // minutes
}

// Event and State Management
export interface LearningProgressionState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  syncStatus: 'synced' | 'pending' | 'error';
  cacheExpiry: number;
}

export interface ProgressionEvent {
  type: 'competency-updated' | 'badge-earned' | 'milestone-achieved' | 'assessment-completed' | 'path-progressed';
  timestamp: number;
  userId: string;
  hookId?: string;
  data: any;
}

// Storage and Persistence
export interface ProgressionStorageConfig {
  useIndexedDB: boolean;
  compressionEnabled: boolean;
  maxCacheSize: number; // MB
  syncInterval: number; // minutes
  offlineMode: boolean;
}

export interface StoredProgression {
  data: LearningProgression;
  metadata: {
    storedAt: number;
    version: string;
    compressed: boolean;
    checksum: string;
  };
}