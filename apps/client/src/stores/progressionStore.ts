/**
 * Learning Progression Store
 * Manages user learning progress and competencies
 */
import { ref, computed } from 'vue';
import type { LearningProgression, HookCompetency, CompetencyLevel } from '@/types/learningProgression';

// State
const currentProgression = ref<LearningProgression | null>(null);
const isLoading = ref(false);

// Default progression structure
const createDefaultProgression = (userId: string): LearningProgression => ({
  id: `progression-${userId}`,
  userId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
  overallProgress: 0,
  competencies: {},
  badges: [],
  learningPath: {
    id: 'default-path',
    name: 'Claude Code Hooks Mastery',
    steps: [],
    totalSteps: 8,
    estimatedTimeMinutes: 480
  },
  assessmentResults: [],
  totalTimeSpentMinutes: 0,
  streakDays: 0,
  preferences: {
    reminderFrequencyDays: 1,
    preferredDifficulty: 'intermediate',
    learningGoalMinutesPerWeek: 120
  }
});

// Store functions
export function useProgressionStore() {
  const initializeProgression = async (userId: string): Promise<void> => {
    isLoading.value = true;
    try {
      // Try to load from localStorage first
      const saved = localStorage.getItem(`progression-${userId}`);
      if (saved) {
        currentProgression.value = JSON.parse(saved);
      } else {
        currentProgression.value = createDefaultProgression(userId);
        await saveProgression();
      }
    } catch (error) {
      console.error('Failed to initialize progression:', error);
      currentProgression.value = createDefaultProgression(userId);
    } finally {
      isLoading.value = false;
    }
  };

  const setProgression = (progression: LearningProgression): void => {
    currentProgression.value = progression;
    saveProgression();
  };

  const updateCompetency = (hookId: string, competency: Partial<HookCompetency>): void => {
    if (!currentProgression.value) return;
    
    const existing = currentProgression.value.competencies[hookId] || {
      hookId,
      knowledge: 0,
      application: 0,
      analysis: 0,
      synthesis: 0,
      overallMastery: 0,
      skillLevel: 'novice' as CompetencyLevel,
      lastAssessed: Date.now(),
      assessmentCount: 0,
      learningVelocity: 0
    };

    currentProgression.value.competencies[hookId] = { ...existing, ...competency };
    currentProgression.value.updatedAt = Date.now();
    saveProgression();
  };

  const saveProgression = async (): Promise<void> => {
    if (!currentProgression.value) return;
    
    try {
      localStorage.setItem(
        `progression-${currentProgression.value.userId}`,
        JSON.stringify(currentProgression.value)
      );
    } catch (error) {
      console.error('Failed to save progression:', error);
    }
  };

  return {
    // State
    currentProgression: computed(() => currentProgression.value),
    isLoading: computed(() => isLoading.value),
    
    // Actions
    initializeProgression,
    setProgression,
    updateCompetency,
    saveProgression
  };
}