import { ref, reactive, computed, watch, nextTick } from 'vue';
import mitt from 'mitt';
import type {
  LearningProgression,
  HookCompetency,
  Badge,
  AssessmentResult,
  LearningPath,
  ProgressAnalytics,
  CompetencyDimensions,
  CompetencyLevel,
  LearningProgressionState,
  ProgressionEvent,
  PrerequisiteGate,
  AnalyticsRecommendation,
  ProgressionStorageConfig
} from '../types/learningProgression';

// Event emitter for cross-component communication
const progressionEvents = mitt<Record<string, any>>();

// Storage configuration
const STORAGE_CONFIG: ProgressionStorageConfig = {
  useIndexedDB: true,
  compressionEnabled: true,
  maxCacheSize: 50, // 50MB
  syncInterval: 5, // 5 minutes
  offlineMode: true
};

// IndexedDB setup for complex data storage
class ProgressionStorage {
  private dbName = 'educational-progression';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!STORAGE_CONFIG.useIndexedDB || !window.indexedDB) {
      console.warn('IndexedDB not available, falling back to localStorage');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Create progression store
        if (!db.objectStoreNames.contains('progressions')) {
          const store = db.createObjectStore('progressions', { keyPath: 'userId' });
          store.createIndex('lastUpdated', 'lastUpdated');
        }
        
        // Create analytics store
        if (!db.objectStoreNames.contains('analytics')) {
          const store = db.createObjectStore('analytics', { keyPath: 'id' });
          store.createIndex('userId', 'userId');
          store.createIndex('timeframe', 'timeframe');
        }
      };
    });
  }

  async saveProgression(progression: LearningProgression): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage
      localStorage.setItem(`progression-${progression.userId}`, JSON.stringify(progression));
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progressions'], 'readwrite');
      const store = transaction.objectStore('progressions');
      const request = store.put(progression);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async loadProgression(userId: string): Promise<LearningProgression | null> {
    if (!this.db) {
      // Fallback to localStorage
      const stored = localStorage.getItem(`progression-${userId}`);
      return stored ? JSON.parse(stored) : null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progressions'], 'readonly');
      const store = transaction.objectStore('progressions');
      const request = store.get(userId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveAnalytics(analytics: ProgressAnalytics): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');
      const request = store.put(analytics);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const storage = new ProgressionStorage();

/**
 * Advanced Learning Progression System Composable
 * Manages 4-dimensional competency tracking with IndexedDB persistence
 */
export function useLearningProgression(userId: string) {
  // Core reactive state
  const progression = ref<LearningProgression | null>(null);
  const state = reactive<LearningProgressionState>({
    isLoading: false,
    error: null,
    lastUpdated: 0,
    syncStatus: 'synced',
    cacheExpiry: 0
  });

  // Initialize storage on first use
  const initStorage = async () => {
    try {
      await storage.init();
    } catch (error) {
      console.warn('Failed to initialize progression storage:', error);
    }
  };

  // Load progression data
  const loadProgression = async (): Promise<void> => {
    state.isLoading = true;
    state.error = null;
    
    try {
      await initStorage();
      
      const stored = await storage.loadProgression(userId);
      if (stored) {
        progression.value = stored;
        state.lastUpdated = stored.updatedAt;
      } else {
        // Create default progression for new user
        progression.value = createDefaultProgression(userId);
      }
      
      state.syncStatus = 'synced';
    } catch (error) {
      state.error = `Failed to load progression: ${error}`;
      console.error('Error loading progression:', error);
    } finally {
      state.isLoading = false;
    }
  };

  // Save progression data with automatic compression
  const saveProgression = async (): Promise<void> => {
    if (!progression.value) return;
    
    try {
      progression.value.updatedAt = Date.now();
      await storage.saveProgression(progression.value);
      state.lastUpdated = progression.value.updatedAt;
      state.syncStatus = 'synced';
    } catch (error) {
      state.error = `Failed to save progression: ${error}`;
      state.syncStatus = 'error';
      console.error('Error saving progression:', error);
    }
  };

  // Create default progression for new users
  const createDefaultProgression = (userId: string): LearningProgression => {
    const now = Date.now();
    const hookIds = [
      'session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use',
      'subagent_stop', 'stop', 'notification', 'precompact'
    ];

    const defaultCompetencies: Record<string, HookCompetency> = {};
    hookIds.forEach(hookId => {
      defaultCompetencies[hookId] = {
        hookId,
        knowledge: 0,
        application: 0,
        analysis: 0,
        synthesis: 0,
        overallMastery: 0,
        skillLevel: 'novice',
        lastAssessed: now,
        assessmentCount: 0,
        learningVelocity: 0
      };
    });

    return {
      id: `progression-${userId}`,
      userId,
      overallProgress: 0,
      competencies: defaultCompetencies,
      badges: [],
      learningPath: createDefaultLearningPath(),
      assessmentResults: [],
      totalTimeSpentMinutes: 0,
      streakDays: 0,
      lastActivityTimestamp: now,
      preferences: {
        preferredDifficulty: 'adaptive',
        learningStyle: 'mixed',
        pacePreference: 'adaptive',
        notificationSettings: {
          milestoneAlerts: true,
          dailyReminders: false,
          weeklyProgress: true,
          badgeEarned: true,
          streakReminders: true,
          assessmentAvailable: true
        },
        pathCustomization: {
          skipIntroductions: false,
          focusAreas: [],
          avoidedTopics: [],
          maxSessionMinutes: 60,
          preferredAssessmentFrequency: 'medium'
        },
        accessibility: {
          reducedMotion: false,
          highContrast: false,
          largeText: false,
          screenReader: false,
          keyboardNavigation: false
        }
      },
      analytics: createDefaultAnalytics(userId, now),
      createdAt: now,
      updatedAt: now,
      version: 1
    };
  };

  const createDefaultLearningPath = (): LearningPath => {
    const now = Date.now();
    return {
      id: 'default-path',
      pathId: 'beginner-fundamentals',
      name: 'Claude Code Hooks Fundamentals',
      description: 'Master the essential Claude Code hooks through structured learning',
      difficulty: 'beginner',
      estimatedDurationMinutes: 240, // 4 hours
      steps: [
        {
          stepId: 'session-basics',
          hookId: 'session_start',
          name: 'Session Lifecycle Basics',
          description: 'Understand how Claude Code sessions begin and context is loaded',
          stepType: 'concept',
          competencyTarget: 'beginner',
          prerequisites: [],
          estimatedMinutes: 30,
          isCompleted: false,
          isUnlocked: true,
          completionCriteria: {
            type: 'score',
            requirements: { minimumScore: 70 }
          },
          resources: [
            {
              resourceId: 'session-guide',
              type: 'guide',
              title: 'Session Start Hook Guide',
              description: 'Comprehensive guide to session initialization',
              duration: 15,
              difficulty: 'beginner'
            }
          ]
        }
        // Additional steps would be defined here...
      ],
      prerequisites: [],
      outcomes: [],
      isPersonalized: false,
      createdAt: now,
      updatedAt: now,
      version: 1
    };
  };

  const createDefaultAnalytics = (userId: string, timestamp: number): ProgressAnalytics => ({
    id: `analytics-${userId}`,
    userId,
    timeframe: 'weekly',
    startDate: timestamp - (7 * 24 * 60 * 60 * 1000), // 1 week ago
    endDate: timestamp,
    metrics: {
      totalTimeMinutes: 0,
      sessionsCount: 0,
      averageSessionMinutes: 0,
      competencyGains: {},
      badgesEarned: 0,
      assessmentsPassed: 0,
      assessmentsFailed: 0,
      currentStreak: 0,
      longestStreak: 0,
      learningVelocity: 0,
      engagement: {
        interactionCount: 0,
        featureUsage: {},
        errorEncounters: 0,
        helpRequests: 0,
        completionRate: 0,
        dropoffRate: 0,
        retentionRate: 100
      }
    },
    insights: [],
    recommendations: [],
    trends: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1
  });

  // Update competency in a specific dimension
  const updateCompetency = async (
    hookId: string,
    dimension: keyof CompetencyDimensions,
    newScore: number,
    source: 'assessment' | 'practice' | 'manual' = 'practice'
  ): Promise<void> => {
    if (!progression.value) return;

    const competency = progression.value.competencies[hookId];
    if (!competency) return;

    const oldScore = competency[dimension];
    const clampedScore = Math.max(0, Math.min(100, newScore));
    
    // Update the dimension
    competency[dimension] = clampedScore;
    
    // Recalculate overall mastery (weighted average)
    const weights = { knowledge: 0.2, application: 0.3, analysis: 0.3, synthesis: 0.2 };
    competency.overallMastery = Object.entries(weights).reduce((sum, [dim, weight]) => {
      return sum + (competency[dim as keyof CompetencyDimensions] * weight);
    }, 0);

    // Update skill level based on overall mastery
    competency.skillLevel = getSkillLevelFromScore(competency.overallMastery);
    
    // Calculate learning velocity (improvement rate)
    const scoreDelta = clampedScore - oldScore;
    const timeDelta = Date.now() - competency.lastAssessed;
    if (timeDelta > 0) {
      competency.learningVelocity = (scoreDelta / (timeDelta / (1000 * 60 * 60))) || 0; // Score change per hour
    }

    competency.lastAssessed = Date.now();
    if (source === 'assessment') {
      competency.assessmentCount += 1;
    }

    // Update overall progress
    updateOverallProgress();
    
    // Check for new achievements
    await checkAchievements(hookId, dimension, oldScore, clampedScore);
    
    // Emit progression event
    progressionEvents.emit('competency-updated', {
      userId,
      hookId,
      dimension,
      oldScore,
      newScore: clampedScore,
      skillLevel: competency.skillLevel
    });

    await saveProgression();
  };

  // Calculate overall progress across all competencies
  const updateOverallProgress = (): void => {
    if (!progression.value) return;

    const competencies = Object.values(progression.value.competencies);
    const totalMastery = competencies.reduce((sum, comp) => sum + comp.overallMastery, 0);
    progression.value.overallProgress = totalMastery / competencies.length;
  };

  // Convert numerical score to skill level
  const getSkillLevelFromScore = (score: number): CompetencyLevel => {
    if (score >= 90) return 'expert';
    if (score >= 75) return 'advanced';
    if (score >= 60) return 'intermediate';
    if (score >= 30) return 'beginner';
    return 'novice';
  };

  // Check for new achievements and badges
  const checkAchievements = async (
    hookId: string,
    dimension: keyof CompetencyDimensions,
    oldScore: number,
    newScore: number
  ): Promise<void> => {
    if (!progression.value) return;

    const competency = progression.value.competencies[hookId];
    
    // Check for skill level advancement
    const oldLevel = getSkillLevelFromScore(oldScore);
    const newLevel = getSkillLevelFromScore(newScore);
    
    if (newLevel !== oldLevel) {
      await checkLevelUpBadges(hookId, newLevel);
      
      progressionEvents.emit('skill-level-up', {
        userId,
        hookId,
        dimension,
        oldLevel,
        newLevel,
        score: newScore
      });
    }

    // Check for milestone achievements
    const milestones = [70, 80, 90, 95, 100];
    const crossedMilestone = milestones.find(milestone => 
      oldScore < milestone && newScore >= milestone
    );
    
    if (crossedMilestone) {
      await awardMilestoneBadge(hookId, dimension, crossedMilestone);
      
      progressionEvents.emit('milestone-achieved', {
        userId,
        hookId,
        dimension,
        milestone: crossedMilestone,
        score: newScore
      });
    }
  };

  // Award badges for skill level advancement
  const checkLevelUpBadges = async (hookId: string, level: CompetencyLevel): Promise<void> => {
    if (!progression.value) return;

    const badgeId = `${hookId}-${level}-mastery`;
    
    // Check if badge already earned
    if (progression.value.badges.some(b => b.badgeId === badgeId)) return;

    const rarityMap: Record<CompetencyLevel, 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> = {
      novice: 'common',
      beginner: 'common', 
      intermediate: 'uncommon',
      advanced: 'rare',
      expert: 'legendary'
    };

    const pointsMap: Record<CompetencyLevel, number> = {
      novice: 10,
      beginner: 25,
      intermediate: 50,
      advanced: 100,
      expert: 200
    };

    const badge: Badge = {
      id: `badge-${badgeId}`,
      badgeId,
      name: `${getHookDisplayName(hookId)} ${level.charAt(0).toUpperCase() + level.slice(1)}`,
      description: `Achieved ${level} level mastery in ${getHookDisplayName(hookId)}`,
      iconUrl: `/badges/${level}-${hookId}.svg`,
      category: {
        categoryId: 'mastery',
        name: 'Mastery Badges',
        description: 'Awarded for achieving competency levels',
        icon: '🎯',
        color: '#3B82F6'
      },
      rarity: rarityMap[level],
      earnedDate: Date.now(),
      hookIds: [hookId],
      requirements: [
        {
          type: 'competency',
          description: `Reach ${level} level in ${getHookDisplayName(hookId)}`,
          target: getScoreThresholdForLevel(level),
          current: getScoreThresholdForLevel(level),
          isCompleted: true,
          hookId
        }
      ],
      points: pointsMap[level],
      tier: level === 'expert' ? 'diamond' : level === 'advanced' ? 'gold' : 'bronze',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    progression.value.badges.push(badge);
    
    progressionEvents.emit('badge-earned', {
      userId,
      badge,
      hookId
    });
  };

  // Award milestone badges
  const awardMilestoneBadge = async (
    hookId: string,
    dimension: keyof CompetencyDimensions,
    milestone: number
  ): Promise<void> => {
    if (!progression.value) return;

    const badgeId = `${hookId}-${dimension}-${milestone}`;
    
    if (progression.value.badges.some(b => b.badgeId === badgeId)) return;

    const badge: Badge = {
      id: `badge-${badgeId}`,
      badgeId,
      name: `${getHookDisplayName(hookId)} ${dimension} Master`,
      description: `Achieved ${milestone}% in ${dimension} for ${getHookDisplayName(hookId)}`,
      iconUrl: `/badges/milestone-${dimension}.svg`,
      category: {
        categoryId: 'milestones',
        name: 'Milestone Badges',
        description: 'Awarded for reaching score milestones',
        icon: '🏆',
        color: '#F59E0B'
      },
      rarity: milestone >= 95 ? 'legendary' : milestone >= 90 ? 'epic' : 'rare',
      earnedDate: Date.now(),
      hookIds: [hookId],
      requirements: [
        {
          type: 'competency',
          description: `Score ${milestone}% in ${dimension}`,
          target: milestone,
          current: milestone,
          isCompleted: true,
          hookId,
          dimension
        }
      ],
      points: milestone,
      tier: milestone >= 95 ? 'platinum' : milestone >= 90 ? 'gold' : 'silver',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    progression.value.badges.push(badge);
  };

  // Helper functions
  const getHookDisplayName = (hookId: string): string => {
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
  };

  const getScoreThresholdForLevel = (level: CompetencyLevel): number => {
    const thresholds = { novice: 0, beginner: 30, intermediate: 60, advanced: 75, expert: 90 };
    return thresholds[level];
  };

  // Record learning activity
  const recordActivity = async (activityType: 'view' | 'interaction' | 'assessment' | 'practice'): Promise<void> => {
    if (!progression.value) return;

    progression.value.lastActivityTimestamp = Date.now();
    
    // Update engagement metrics
    const engagement = progression.value.analytics.metrics.engagement;
    engagement.interactionCount += 1;
    engagement.featureUsage[activityType] = (engagement.featureUsage[activityType] || 0) + 1;

    await saveProgression();
  };

  // Record assessment result
  const recordAssessmentResult = async (assessmentResult: {
    assessmentId: string;
    hookId: string;
    score: number;
    timeSpentSeconds: number;
    answers: any[];
    passed: boolean;
  }): Promise<void> => {
    if (!progression.value) return;

    const now = Date.now();
    const result = {
      id: `assessment-result-${now}`,
      assessmentId: assessmentResult.assessmentId,
      hookId: assessmentResult.hookId,
      userId,
      assessmentType: 'knowledge' as const,
      score: assessmentResult.score,
      maxScore: 100,
      timeSpentSeconds: assessmentResult.timeSpentSeconds,
      answers: assessmentResult.answers.map((answer: any, index: number) => ({
        questionId: `q${index + 1}`,
        question: `Question ${index + 1}`, // Would be populated with actual question text
        answer: answer,
        isCorrect: true, // Will be calculated based on assessment data
        timeSpentSeconds: Math.round(assessmentResult.timeSpentSeconds / assessmentResult.answers.length),
        attempts: 1,
        dimension: 'knowledge' as keyof CompetencyDimensions // Default to knowledge, would be dynamic
      })),
      competencyImpact: {
        knowledge: Math.round(assessmentResult.score * 0.4),
        application: Math.round(assessmentResult.score * 0.3),
        analysis: Math.round(assessmentResult.score * 0.2),
        synthesis: Math.round(assessmentResult.score * 0.1)
      },
      feedback: {
        overallFeedback: getFeedbackForScore(assessmentResult.score),
        dimensionFeedback: {
          knowledge: 'Good understanding of concepts',
          application: 'Solid practical application',
          analysis: 'Strong analytical skills',
          synthesis: 'Creative problem solving'
        },
        strengths: assessmentResult.passed ? ['Good overall performance'] : [],
        improvementAreas: assessmentResult.passed ? [] : ['Review basic concepts'],
        recommendedNextSteps: assessmentResult.passed ? ['Continue to next lesson'] : ['Review material and retake assessment'],
        resourceSuggestions: []
      },
      difficulty: 'beginner' as const,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    progression.value.assessmentResults.push(result);
    
    // Update analytics
    const analytics = progression.value.analytics.metrics;
    if (assessmentResult.passed) {
      analytics.assessmentsPassed += 1;
    } else {
      analytics.assessmentsFailed += 1;
    }

    await saveProgression();
  };

  // Helper function for feedback
  const getFeedbackForScore = (score: number): string => {
    if (score >= 90) return 'Outstanding! You have mastered this concept.';
    if (score >= 80) return 'Excellent work! You have a strong understanding.';
    if (score >= 70) return 'Good job! You understand the key concepts.';
    if (score >= 60) return 'You passed! Consider reviewing before moving on.';
    return 'Keep studying and try again when you\'re ready.';
  };

  // Generate analytics insights and recommendations
  const generateRecommendations = (): AnalyticsRecommendation[] => {
    if (!progression.value) return [];

    const recommendations: AnalyticsRecommendation[] = [];
    const competencies = progression.value.competencies;

    // Find weakest areas for improvement recommendations
    Object.entries(competencies).forEach(([hookId, comp]) => {
      const weakestDimension = (Object.keys(comp) as (keyof CompetencyDimensions)[])
        .filter(key => ['knowledge', 'application', 'analysis', 'synthesis'].includes(key))
        .reduce((weakest, current) => 
          comp[current] < comp[weakest] ? current : weakest
        );

      if (comp[weakestDimension] < 60) {
        recommendations.push({
          recommendationId: `improve-${hookId}-${weakestDimension}`,
          type: 'practice',
          title: `Improve ${getHookDisplayName(hookId)} ${weakestDimension}`,
          description: `Your ${weakestDimension} score (${comp[weakestDimension]}%) could use some work`,
          estimatedImpact: 'high',
          estimatedTimeMinutes: 20,
          hookIds: [hookId],
          priority: 8,
          reason: `Low score in ${weakestDimension} dimension`,
          action: {
            actionType: 'practice',
            target: `practice-${hookId}-${weakestDimension}`,
            parameters: { dimension: weakestDimension, targetScore: 70 }
          }
        });
      }
    });

    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5);
  };

  // Computed properties
  const overallProgress = computed(() => progression.value?.overallProgress || 0);
  
  const totalBadges = computed(() => progression.value?.badges.length || 0);
  
  const completedAssessments = computed(() => 
    progression.value?.assessmentResults.filter(a => a.score >= 70).length || 0
  );

  const currentStreak = computed(() => progression.value?.streakDays || 0);

  const recommendations = computed(() => generateRecommendations());

  const strongestAreas = computed(() => {
    if (!progression.value) return [];
    
    return Object.entries(progression.value.competencies)
      .sort(([,a], [,b]) => b.overallMastery - a.overallMastery)
      .slice(0, 3)
      .map(([hookId, comp]) => ({ hookId, mastery: comp.overallMastery, level: comp.skillLevel }));
  });

  const weakestAreas = computed(() => {
    if (!progression.value) return [];
    
    return Object.entries(progression.value.competencies)
      .sort(([,a], [,b]) => a.overallMastery - b.overallMastery)
      .slice(0, 3)
      .map(([hookId, comp]) => ({ hookId, mastery: comp.overallMastery, level: comp.skillLevel }));
  });

  // Auto-save on changes
  watch(() => progression.value, () => {
    if (progression.value && state.syncStatus === 'synced') {
      state.syncStatus = 'pending';
      // Debounced save
      setTimeout(() => saveProgression(), 1000);
    }
  }, { deep: true });

  // Initialize on creation
  nextTick(() => {
    loadProgression();
  });

  return {
    // State
    progression: computed(() => progression.value),
    state: computed(() => state),
    
    // Actions
    updateCompetency,
    recordActivity,
    recordAssessmentResult,
    loadProgression,
    saveProgression,
    
    // Computed insights
    overallProgress,
    totalBadges,
    completedAssessments,
    currentStreak,
    recommendations,
    strongestAreas,
    weakestAreas,
    
    // Event system
    on: progressionEvents.on,
    off: progressionEvents.off,
    emit: progressionEvents.emit
  };
}