<template>
  <div class="learning-progress-tracker">
    <!-- Progress Overview Header -->
    <div class="progress-overview bg-gradient-to-r from-blue-700 to-purple-700 rounded-lg p-6 mb-6">
      <div class="flex flex-col lg:flex-row items-center justify-between">
        <!-- Overall Progress Ring -->
        <div class="progress-ring-section flex items-center space-x-6">
          <div class="progress-ring-container relative">
            <svg class="progress-ring w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <!-- Background ring -->
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.2)"
                stroke-width="8"
              />
              <!-- Progress ring -->
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="url(#progressGradient)"
                stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset"
                class="transition-all duration-1000 ease-out"
              />
              <!-- Gradient definition -->
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#10B981" />
                  <stop offset="50%" stop-color="#3B82F6" />
                  <stop offset="100%" stop-color="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
            <!-- Center text -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="text-2xl font-bold text-white">{{ Math.round(overallProgress) }}%</div>
                <div class="text-sm text-blue-100">Complete</div>
              </div>
            </div>
          </div>
          
          <!-- Progress Stats -->
          <div class="text-white space-y-2">
            <h2 class="text-2xl font-bold mb-3">🎓 Learning Progress</h2>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex items-center space-x-2">
                <span class="text-blue-200">🏆</span>
                <span>{{ totalBadges }} Badges Earned</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-blue-200">📊</span>
                <span>{{ completedAssessments }} Assessments Passed</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-blue-200">🔥</span>
                <span>{{ currentStreak }} Day Streak</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-blue-200">⏱️</span>
                <span>{{ formatTime(totalTimeSpent) }} Learning Time</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="mt-6 lg:mt-0 flex flex-col space-y-2">
          <button
            @click="$emit('start-assessment')"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Take Assessment
          </button>
          <button
            @click="showRecommendations = !showRecommendations"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            View Recommendations
          </button>
        </div>
      </div>
    </div>

    <!-- Recommendations Panel (Expandable) -->
    <div v-if="showRecommendations" class="recommendations-panel bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-white mb-3 flex items-center">
        <span class="mr-2">💡</span>
        Personalized Recommendations
      </h3>
      
      <div v-if="recommendations.length === 0" class="text-gray-400 text-center py-4">
        Great job! You're doing well across all areas. Keep up the excellent work!
      </div>
      
      <div v-else class="space-y-3">
        <div
          v-for="recommendation in recommendations.slice(0, 3)"
          :key="recommendation.recommendationId"
          class="recommendation-card bg-gray-900 rounded-lg p-4 border border-gray-600"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="text-sm font-medium text-white mb-1">{{ recommendation.title }}</h4>
              <p class="text-xs text-gray-300 mb-2">{{ recommendation.description }}</p>
              <div class="flex items-center space-x-4 text-xs text-gray-400">
                <span>⏱️ {{ recommendation.estimatedTimeMinutes }}min</span>
                <span 
                  :class="{
                    'text-green-400': recommendation.estimatedImpact === 'high',
                    'text-yellow-400': recommendation.estimatedImpact === 'medium',
                    'text-blue-400': recommendation.estimatedImpact === 'low'
                  }"
                >
                  📈 {{ recommendation.estimatedImpact.toUpperCase() }} impact
                </span>
              </div>
            </div>
            <button
              @click="executeRecommendation(recommendation)"
              class="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Competency Grid -->
    <div class="competency-grid">
      <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
        <span class="mr-2">📚</span>
        Hook Competency Breakdown
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="(competency, hookId) in competencies"
          :key="hookId"
          class="competency-card bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
          @click="$emit('hook-selected', hookId)"
        >
          <!-- Hook Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="text-xl">{{ getHookIcon(hookId) }}</span>
              <span class="text-sm font-medium text-white">{{ getHookDisplayName(hookId) }}</span>
            </div>
            <span 
              class="skill-level-badge px-2 py-1 text-xs font-medium rounded"
              :class="getSkillLevelColor(competency.skillLevel)"
            >
              {{ competency.skillLevel }}
            </span>
          </div>
          
          <!-- Overall Mastery -->
          <div class="overall-mastery mb-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-400">Overall Mastery</span>
              <span class="text-xs font-medium text-white">{{ Math.round(competency.overallMastery) }}%</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-500"
                :class="getMasteryBarColor(competency.overallMastery)"
                :style="{ width: `${competency.overallMastery}%` }"
              ></div>
            </div>
          </div>
          
          <!-- Dimension Breakdown -->
          <div class="dimensions-grid grid grid-cols-2 gap-2 text-xs">
            <div class="dimension-item">
              <div class="flex items-center justify-between">
                <span class="text-gray-400">📖 Knowledge</span>
                <span class="text-white font-medium">{{ Math.round(competency.knowledge) }}%</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-1 mt-1">
                <div
                  class="h-1 bg-blue-500 rounded-full transition-all duration-300"
                  :style="{ width: `${competency.knowledge}%` }"
                ></div>
              </div>
            </div>
            
            <div class="dimension-item">
              <div class="flex items-center justify-between">
                <span class="text-gray-400">🔧 Application</span>
                <span class="text-white font-medium">{{ Math.round(competency.application) }}%</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-1 mt-1">
                <div
                  class="h-1 bg-green-500 rounded-full transition-all duration-300"
                  :style="{ width: `${competency.application}%` }"
                ></div>
              </div>
            </div>
            
            <div class="dimension-item">
              <div class="flex items-center justify-between">
                <span class="text-gray-400">🔍 Analysis</span>
                <span class="text-white font-medium">{{ Math.round(competency.analysis) }}%</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-1 mt-1">
                <div
                  class="h-1 bg-yellow-500 rounded-full transition-all duration-300"
                  :style="{ width: `${competency.analysis}%` }"
                ></div>
              </div>
            </div>
            
            <div class="dimension-item">
              <div class="flex items-center justify-between">
                <span class="text-gray-400">⚡ Synthesis</span>
                <span class="text-white font-medium">{{ Math.round(competency.synthesis) }}%</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-1 mt-1">
                <div
                  class="h-1 bg-purple-500 rounded-full transition-all duration-300"
                  :style="{ width: `${competency.synthesis}%` }"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- Learning Velocity Indicator -->
          <div v-if="competency.learningVelocity !== 0" class="velocity-indicator mt-3 pt-2 border-t border-gray-600">
            <div class="flex items-center space-x-2 text-xs">
              <span 
                :class="{
                  'text-green-400': competency.learningVelocity > 0,
                  'text-red-400': competency.learningVelocity < 0,
                  'text-gray-400': competency.learningVelocity === 0
                }"
              >
                {{ competency.learningVelocity > 0 ? '📈' : competency.learningVelocity < 0 ? '📉' : '➖' }}
                {{ competency.learningVelocity > 0 ? '+' : '' }}{{ competency.learningVelocity.toFixed(1) }}/hr
              </span>
              <span class="text-gray-400">velocity</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Achievement Highlights -->
    <div v-if="recentBadges.length > 0" class="achievements-section mt-6">
      <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
        <span class="mr-2">🏆</span>
        Recent Achievements
      </h3>
      
      <div class="flex space-x-4 overflow-x-auto pb-2">
        <div
          v-for="badge in recentBadges"
          :key="badge.badgeId"
          class="achievement-card flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg p-3 w-48"
        >
          <div class="flex items-center space-x-3">
            <div class="badge-icon text-2xl">🏆</div>
            <div class="flex-1">
              <div class="text-sm font-medium text-white">{{ badge.name }}</div>
              <div class="text-xs text-gray-400">{{ badge.description }}</div>
              <div class="flex items-center space-x-2 mt-1">
                <span 
                  class="rarity-badge px-2 py-1 text-xs font-medium rounded"
                  :class="getRarityColor(badge.rarity)"
                >
                  {{ badge.rarity }}
                </span>
                <span class="text-xs text-yellow-400">{{ badge.points }} pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Learning Path Progress -->
    <div v-if="learningPath" class="learning-path-section mt-6">
      <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
        <span class="mr-2">🛤️</span>
        Current Learning Path: {{ learningPath.name }}
      </h3>
      
      <div class="path-progress bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-300">{{ learningPath.description }}</span>
          <span class="text-sm font-medium text-white">
            {{ completedSteps }} / {{ totalSteps }} Steps Complete
          </span>
        </div>
        
        <!-- Progress bar -->
        <div class="w-full bg-gray-700 rounded-full h-3 mb-3">
          <div
            class="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            :style="{ width: `${pathProgress}%` }"
          ></div>
        </div>
        
        <!-- Next steps -->
        <div v-if="nextSteps.length > 0" class="next-steps">
          <div class="text-sm font-medium text-white mb-2">Next Steps:</div>
          <div class="space-y-2">
            <div
              v-for="step in nextSteps.slice(0, 2)"
              :key="step.stepId"
              class="flex items-center justify-between p-2 bg-gray-900 rounded border border-gray-600"
            >
              <div class="flex-1">
                <div class="text-sm text-white">{{ step.name }}</div>
                <div class="text-xs text-gray-400">{{ step.description }}</div>
              </div>
              <button
                @click="$emit('start-step', step)"
                class="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                :disabled="!step.isUnlocked"
              >
                {{ step.isUnlocked ? 'Start' : 'Locked' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { 
  LearningProgression,
  HookCompetency,
  Badge,
  LearningPath,
  LearningPathStep,
  CompetencyLevel,
  AnalyticsRecommendation
} from '../types/learningProgression';

interface Props {
  progression: LearningProgression | null;
  showRecommendations?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showRecommendations: false
});

const showRecommendations = ref(props.showRecommendations);

// Emits
const emit = defineEmits<{
  'hook-selected': [hookId: string];
  'start-assessment': [];
  'start-step': [step: LearningPathStep];
  'execute-recommendation': [recommendation: AnalyticsRecommendation];
}>();

// Computed properties
const overallProgress = computed(() => props.progression?.overallProgress || 0);
const totalBadges = computed(() => props.progression?.badges.length || 0);
const completedAssessments = computed(() => 
  props.progression?.assessmentResults.filter(a => a.score >= 70).length || 0
);
const currentStreak = computed(() => props.progression?.streakDays || 0);
const totalTimeSpent = computed(() => props.progression?.totalTimeSpentMinutes || 0);
const competencies = computed(() => props.progression?.competencies || {});
const learningPath = computed(() => props.progression?.learningPath);
const recommendations = computed(() => {
  // Generate simple recommendations based on lowest scoring areas
  if (!props.progression) return [];
  
  const recs: AnalyticsRecommendation[] = [];
  Object.entries(props.progression.competencies).forEach(([hookId, comp]) => {
    if (comp.overallMastery < 60) {
      recs.push({
        recommendationId: `improve-${hookId}`,
        type: 'practice',
        title: `Improve ${getHookDisplayName(hookId)} Skills`,
        description: `Your mastery is at ${Math.round(comp.overallMastery)}%. Focus on practice to reach the next level.`,
        estimatedImpact: comp.overallMastery < 30 ? 'high' : 'medium',
        estimatedTimeMinutes: 20,
        hookIds: [hookId],
        priority: Math.round((100 - comp.overallMastery) / 10),
        reason: 'Low competency score',
        action: {
          actionType: 'practice',
          target: hookId
        }
      });
    }
  });
  
  return recs.sort((a, b) => b.priority - a.priority);
});

const recentBadges = computed(() => {
  if (!props.progression?.badges) return [];
  return props.progression.badges
    .filter(b => b.earnedDate && (Date.now() - b.earnedDate) < 7 * 24 * 60 * 60 * 1000) // Last 7 days
    .sort((a, b) => (b.earnedDate || 0) - (a.earnedDate || 0))
    .slice(0, 3);
});

const completedSteps = computed(() => {
  return learningPath.value?.steps.filter(s => s.isCompleted).length || 0;
});

const totalSteps = computed(() => learningPath.value?.steps.length || 0);

const pathProgress = computed(() => {
  if (totalSteps.value === 0) return 0;
  return (completedSteps.value / totalSteps.value) * 100;
});

const nextSteps = computed(() => {
  if (!learningPath.value) return [];
  return learningPath.value.steps.filter(s => !s.isCompleted);
});

// SVG circle calculations
const circumference = computed(() => 2 * Math.PI * 50); // radius = 50
const strokeDashoffset = computed(() => {
  return circumference.value - (overallProgress.value / 100) * circumference.value;
});

// Helper functions
const getHookIcon = (hookId: string): string => {
  const icons: Record<string, string> = {
    'session_start': '🚀',
    'user_prompt_submit': '💬',
    'pre_tool_use': '⚡',
    'post_tool_use': '✅',
    'subagent_stop': '🤖',
    'stop': '🛑',
    'notification': '🔔',
    'precompact': '📦'
  };
  return icons[hookId] || '🔧';
};

const getHookDisplayName = (hookId: string): string => {
  const names: Record<string, string> = {
    'session_start': 'Session Start',
    'user_prompt_submit': 'User Prompt',
    'pre_tool_use': 'Pre Tool Use',
    'post_tool_use': 'Post Tool Use',
    'subagent_stop': 'Subagent Stop',
    'stop': 'Stop',
    'notification': 'Notification',
    'precompact': 'PreCompact'
  };
  return names[hookId] || hookId;
};

const getSkillLevelColor = (level: CompetencyLevel): string => {
  const colors = {
    novice: 'bg-gray-600 text-gray-200',
    beginner: 'bg-blue-600 text-blue-200',
    intermediate: 'bg-green-600 text-green-200',
    advanced: 'bg-yellow-600 text-yellow-200',
    expert: 'bg-purple-600 text-purple-200'
  };
  return colors[level] || colors.novice;
};

const getMasteryBarColor = (mastery: number): string => {
  if (mastery >= 90) return 'bg-purple-500';
  if (mastery >= 75) return 'bg-yellow-500';
  if (mastery >= 60) return 'bg-green-500';
  if (mastery >= 30) return 'bg-blue-500';
  return 'bg-gray-500';
};

const getRarityColor = (rarity: string): string => {
  const colors = {
    common: 'bg-gray-600 text-gray-200',
    uncommon: 'bg-green-600 text-green-200',
    rare: 'bg-blue-600 text-blue-200',
    epic: 'bg-purple-600 text-purple-200',
    legendary: 'bg-yellow-600 text-yellow-200'
  };
  return colors[rarity as keyof typeof colors] || colors.common;
};

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const executeRecommendation = (recommendation: AnalyticsRecommendation) => {
  emit('execute-recommendation', recommendation);
};
</script>

<style scoped>
.progress-ring {
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3));
}

.competency-card {
  transition: all 0.3s ease;
}

.competency-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.achievement-card {
  transition: transform 0.2s ease;
}

.achievement-card:hover {
  transform: scale(1.02);
}

.dimension-item {
  transition: all 0.3s ease;
}

.skill-level-badge {
  text-transform: capitalize;
}

.rarity-badge {
  text-transform: capitalize;
}

/* Custom scrollbar for horizontal scroll */
.achievements-section .overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}

.achievements-section .overflow-x-auto::-webkit-scrollbar-track {
  background: rgba(75, 85, 99, 0.3);
  border-radius: 2px;
}

.achievements-section .overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.6);
  border-radius: 2px;
}

.achievements-section .overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.8);
}
</style>