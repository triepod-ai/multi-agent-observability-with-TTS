<template>
  <div class="learning-path">
    <!-- Path Overview Header -->
    <div class="path-header bg-gradient-to-r from-indigo-700 to-purple-700 rounded-lg p-6 mb-6">
      <div class="flex flex-col lg:flex-row items-start justify-between">
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-white mb-2 flex items-center">
            <span class="mr-3">🛤️</span>
            {{ learningPath?.name || 'Custom Learning Path' }}
          </h2>
          <p class="text-indigo-100 mb-4">{{ learningPath?.description }}</p>
          
          <!-- Path Stats -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div class="flex items-center space-x-2">
              <span class="text-indigo-200">📚</span>
              <span class="text-white">{{ totalSteps }} Total Steps</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-indigo-200">✅</span>
              <span class="text-white">{{ completedSteps }} Completed</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-indigo-200">⏱️</span>
              <span class="text-white">{{ estimatedTimeRemaining }}min Remaining</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-indigo-200">🎯</span>
              <span class="text-white">{{ learningPath?.difficulty.toUpperCase() || 'ADAPTIVE' }}</span>
            </div>
          </div>
        </div>
        
        <!-- Path Progress Ring -->
        <div class="mt-6 lg:mt-0">
          <div class="relative w-24 h-24">
            <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                stroke-width="2"
              />
              <path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="#10B981"
                stroke-width="2"
                stroke-linecap="round"
                :stroke-dasharray="`${pathProgress}, 100`"
                class="transition-all duration-1000 ease-out"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-sm font-bold text-white">{{ Math.round(pathProgress) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Adaptive Recommendations -->
    <div v-if="adaptiveRecommendations.length > 0" class="recommendations mb-6">
      <h3 class="text-lg font-semibold text-white mb-3 flex items-center">
        <span class="mr-2">🤖</span>
        Personalized Recommendations
      </h3>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="rec in adaptiveRecommendations"
          :key="rec.recommendationId"
          class="recommendation-card bg-blue-900/30 border border-blue-600 rounded-lg p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="text-sm font-medium text-blue-100 mb-1">{{ rec.title }}</h4>
              <p class="text-xs text-blue-200 mb-2">{{ rec.description }}</p>
              <div class="flex items-center space-x-3 text-xs text-blue-300">
                <span>📈 {{ rec.estimatedImpact.toUpperCase() }}</span>
                <span>⏱️ {{ rec.estimatedTimeMinutes }}min</span>
              </div>
            </div>
            <button
              @click="executeRecommendation(rec)"
              class="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Learning Path Steps -->
    <div class="path-steps">
      <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
        <span class="mr-2">📋</span>
        Learning Steps
      </h3>
      
      <!-- Path Visualization -->
      <div class="path-visualization relative">
        <!-- Connection Line -->
        <div class="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-600 z-0"></div>
        
        <div class="space-y-6 relative z-10">
          <div
            v-for="(step, index) in pathSteps"
            :key="step.stepId"
            class="step-container flex items-start space-x-4"
            :class="{
              'opacity-60': !step.isUnlocked && !step.isCompleted,
              'animate-pulse': step.isCompleted && showCompletionAnimation === step.stepId
            }"
          >
            <!-- Step Indicator -->
            <div
              class="step-indicator flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-sm border-4 transition-all duration-300"
              :class="{
                'bg-green-600 border-green-500': step.isCompleted,
                'bg-blue-600 border-blue-500 ring-4 ring-blue-200': !step.isCompleted && step.isUnlocked,
                'bg-gray-600 border-gray-500': !step.isUnlocked,
                'shadow-lg scale-110': currentStep === step.stepId
              }"
            >
              <span v-if="step.isCompleted" class="text-lg">✓</span>
              <span v-else-if="step.isUnlocked">{{ index + 1 }}</span>
              <span v-else class="text-lg">🔒</span>
            </div>
            
            <!-- Step Content -->
            <div
              class="step-content flex-1 bg-gray-800 border rounded-lg p-4 transition-all duration-300"
              :class="{
                'border-green-500 shadow-green-500/20 shadow-lg': step.isCompleted,
                'border-blue-500 shadow-blue-500/20 shadow-lg': !step.isCompleted && step.isUnlocked && currentStep === step.stepId,
                'border-blue-400': !step.isCompleted && step.isUnlocked && currentStep !== step.stepId,
                'border-gray-600': !step.isUnlocked,
                'cursor-pointer hover:border-blue-400': step.isUnlocked && !step.isCompleted
              }"
              @click="step.isUnlocked && !step.isCompleted ? selectStep(step) : null"
            >
              <!-- Step Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h4 class="text-lg font-medium text-white mb-1 flex items-center">
                    <span class="mr-2">{{ getStepTypeIcon(step.stepType) }}</span>
                    {{ step.name }}
                  </h4>
                  <p class="text-sm text-gray-300 mb-2">{{ step.description }}</p>
                  
                  <!-- Step Metadata -->
                  <div class="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span class="flex items-center">
                      <span class="mr-1">⏱️</span>
                      {{ step.estimatedMinutes }}min
                    </span>
                    <span class="flex items-center">
                      <span class="mr-1">🎯</span>
                      {{ step.competencyTarget }}
                    </span>
                    <span class="flex items-center">
                      <span class="mr-1">🔧</span>
                      {{ getHookDisplayName(step.hookId) }}
                    </span>
                  </div>
                </div>
                
                <!-- Action Button -->
                <div class="ml-4 flex flex-col space-y-2">
                  <button
                    v-if="step.isCompleted"
                    @click.stop="reviewStep(step)"
                    class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    Review
                  </button>
                  <button
                    v-else-if="step.isUnlocked"
                    @click.stop="startStep(step)"
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    :class="{ 'animate-pulse': currentStep === step.stepId }"
                  >
                    {{ currentStep === step.stepId ? 'Continue' : 'Start' }}
                  </button>
                  <span
                    v-else
                    class="px-3 py-1 bg-gray-600 text-gray-300 text-xs rounded cursor-not-allowed"
                  >
                    Locked
                  </span>
                </div>
              </div>
              
              <!-- Prerequisites -->
              <div v-if="step.prerequisites.length > 0" class="prerequisites mb-3">
                <div class="text-xs font-medium text-gray-400 mb-1">Prerequisites:</div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="prereqId in step.prerequisites"
                    :key="prereqId"
                    class="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {{ getHookDisplayName(prereqId) }}
                  </span>
                </div>
              </div>
              
              <!-- Completion Criteria -->
              <div v-if="step.completionCriteria" class="completion-criteria mb-3">
                <div class="text-xs font-medium text-gray-400 mb-1">Success Criteria:</div>
                <div class="text-xs text-gray-300">
                  <span v-if="step.completionCriteria.type === 'score'">
                    Score {{ step.completionCriteria.requirements.minimumScore }}% or higher
                  </span>
                  <span v-else-if="step.completionCriteria.type === 'time'">
                    Spend at least {{ step.completionCriteria.requirements.minimumTimeMinutes }} minutes
                  </span>
                  <span v-else-if="step.completionCriteria.type === 'assessment'">
                    Pass competency assessment
                  </span>
                  <span v-else>
                    Complete all required interactions
                  </span>
                </div>
              </div>
              
              <!-- Learning Resources -->
              <div v-if="step.resources && step.resources.length > 0" class="resources">
                <div class="text-xs font-medium text-gray-400 mb-2">Resources:</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    v-for="resource in step.resources"
                    :key="resource.resourceId"
                    class="resource-item flex items-center space-x-2 p-2 bg-gray-900 rounded border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                    @click="openResource(resource)"
                  >
                    <span class="text-sm">{{ getResourceIcon(resource.type) }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-medium text-white truncate">{{ resource.title }}</div>
                      <div class="text-xs text-gray-400">
                        {{ resource.type }} • {{ resource.duration || 0 }}min
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Progress Indicator for Current Step -->
              <div v-if="currentStep === step.stepId && stepProgress > 0" class="step-progress mt-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-gray-400">Step Progress</span>
                  <span class="text-xs text-blue-400">{{ Math.round(stepProgress) }}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                  <div
                    class="h-2 bg-blue-500 rounded-full transition-all duration-300"
                    :style="{ width: `${stepProgress}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Path Summary -->
    <div class="path-summary mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-white mb-3 flex items-center">
        <span class="mr-2">📊</span>
        Learning Path Summary
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Strengths -->
        <div class="summary-section">
          <h4 class="text-sm font-medium text-green-400 mb-2">Strengths</h4>
          <div class="space-y-1">
            <div
              v-for="strength in topStrengths"
              :key="strength.hookId"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-gray-300">{{ getHookDisplayName(strength.hookId) }}</span>
              <span class="text-green-400 font-medium">{{ Math.round(strength.mastery) }}%</span>
            </div>
          </div>
        </div>
        
        <!-- Focus Areas -->
        <div class="summary-section">
          <h4 class="text-sm font-medium text-yellow-400 mb-2">Focus Areas</h4>
          <div class="space-y-1">
            <div
              v-for="focus in focusAreas"
              :key="focus.hookId"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-gray-300">{{ getHookDisplayName(focus.hookId) }}</span>
              <span class="text-yellow-400 font-medium">{{ Math.round(focus.mastery) }}%</span>
            </div>
          </div>
        </div>
        
        <!-- Next Goals -->
        <div class="summary-section">
          <h4 class="text-sm font-medium text-blue-400 mb-2">Next Goals</h4>
          <div class="space-y-1">
            <div
              v-for="step in nextUnlockedSteps.slice(0, 3)"
              :key="step.stepId"
              class="text-xs text-gray-300"
            >
              {{ step.name }} ({{ step.estimatedMinutes }}min)
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
  LearningPath,
  LearningPathStep,
  LearningResource,
  LearningProgression,
  AnalyticsRecommendation
} from '../types/learningProgression';

interface Props {
  learningPath: LearningPath | null;
  progression: LearningProgression | null;
  currentStep?: string;
  stepProgress?: number;
}

const props = withDefaults(defineProps<Props>(), {
  stepProgress: 0
});

// Reactive state
const showCompletionAnimation = ref<string | null>(null);

// Emits
const emit = defineEmits<{
  'step-selected': [step: LearningPathStep];
  'step-started': [step: LearningPathStep];
  'step-reviewed': [step: LearningPathStep];
  'resource-opened': [resource: LearningResource];
  'recommendation-executed': [recommendation: AnalyticsRecommendation];
}>();

// Computed properties
const pathSteps = computed(() => props.learningPath?.steps || []);
const totalSteps = computed(() => pathSteps.value.length);
const completedSteps = computed(() => pathSteps.value.filter(s => s.isCompleted).length);
const pathProgress = computed(() => {
  if (totalSteps.value === 0) return 0;
  return (completedSteps.value / totalSteps.value) * 100;
});

const estimatedTimeRemaining = computed(() => {
  const remainingSteps = pathSteps.value.filter(s => !s.isCompleted);
  return remainingSteps.reduce((total, step) => total + step.estimatedMinutes, 0);
});

const nextUnlockedSteps = computed(() => {
  return pathSteps.value.filter(s => s.isUnlocked && !s.isCompleted);
});

const topStrengths = computed(() => {
  if (!props.progression?.competencies) return [];
  
  return Object.entries(props.progression.competencies)
    .filter(([, comp]) => comp.overallMastery >= 70)
    .sort(([,a], [,b]) => b.overallMastery - a.overallMastery)
    .slice(0, 3)
    .map(([hookId, comp]) => ({ hookId, mastery: comp.overallMastery }));
});

const focusAreas = computed(() => {
  if (!props.progression?.competencies) return [];
  
  return Object.entries(props.progression.competencies)
    .filter(([, comp]) => comp.overallMastery < 70 && comp.overallMastery > 30)
    .sort(([,a], [,b]) => a.overallMastery - b.overallMastery)
    .slice(0, 3)
    .map(([hookId, comp]) => ({ hookId, mastery: comp.overallMastery }));
});

const adaptiveRecommendations = computed(() => {
  // Generate adaptive recommendations based on user progress
  const recommendations: AnalyticsRecommendation[] = [];
  
  if (!props.progression) return recommendations;
  
  // Recommend review for skills that haven't been practiced recently
  Object.entries(props.progression.competencies).forEach(([hookId, comp]) => {
    const daysSinceAssessment = (Date.now() - comp.lastAssessed) / (1000 * 60 * 60 * 24);
    
    if (comp.overallMastery > 60 && daysSinceAssessment > 14) {
      recommendations.push({
        recommendationId: `review-${hookId}`,
        type: 'review',
        title: `Review ${getHookDisplayName(hookId)} Skills`,
        description: `It's been ${Math.floor(daysSinceAssessment)} days since your last assessment. Keep your skills fresh!`,
        estimatedImpact: 'medium',
        estimatedTimeMinutes: 15,
        hookIds: [hookId],
        priority: 5,
        reason: 'Skill maintenance',
        action: {
          actionType: 'review-content',
          target: hookId
        }
      });
    }
    
    // Recommend next level progression
    if (comp.overallMastery >= 85 && comp.skillLevel !== 'expert') {
      recommendations.push({
        recommendationId: `advance-${hookId}`,
        type: 'assessment',
        title: `Ready for Advanced ${getHookDisplayName(hookId)}?`,
        description: `You're scoring ${Math.round(comp.overallMastery)}%. Take the advanced assessment to level up!`,
        estimatedImpact: 'high',
        estimatedTimeMinutes: 25,
        hookIds: [hookId],
        priority: 9,
        reason: 'Ready for advancement',
        action: {
          actionType: 'start-assessment',
          target: `${hookId}-advanced-assessment`
        }
      });
    }
  });
  
  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 4);
});

// Methods
const selectStep = (step: LearningPathStep) => {
  emit('step-selected', step);
};

const startStep = (step: LearningPathStep) => {
  emit('step-started', step);
};

const reviewStep = (step: LearningPathStep) => {
  emit('step-reviewed', step);
};

const openResource = (resource: LearningResource) => {
  emit('resource-opened', resource);
};

const executeRecommendation = (recommendation: AnalyticsRecommendation) => {
  emit('recommendation-executed', recommendation);
};

// Helper functions
const getStepTypeIcon = (type: string): string => {
  const icons = {
    concept: '📖',
    practice: '🔧',
    assessment: '📊',
    review: '🔄'
  };
  return icons[type as keyof typeof icons] || '📚';
};

const getResourceIcon = (type: string): string => {
  const icons = {
    guide: '📖',
    example: '💻',
    interactive: '🎮',
    assessment: '📊',
    reference: '📚'
  };
  return icons[type as keyof typeof icons] || '📄';
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
</script>

<style scoped>
.step-indicator {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-content {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-content:hover {
  transform: translateY(-1px);
}

.resource-item {
  transition: all 0.2s ease;
}

.resource-item:hover {
  transform: scale(1.02);
}

.recommendation-card {
  transition: all 0.3s ease;
}

.recommendation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.step-indicator.ring-4 {
  animation: pulse-ring 2s infinite;
}

/* Custom scrollbar for any overflow areas */
.path-steps::-webkit-scrollbar {
  width: 6px;
}

.path-steps::-webkit-scrollbar-track {
  background: rgba(75, 85, 99, 0.3);
  border-radius: 3px;
}

.path-steps::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.6);
  border-radius: 3px;
}

.path-steps::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.8);
}
</style>