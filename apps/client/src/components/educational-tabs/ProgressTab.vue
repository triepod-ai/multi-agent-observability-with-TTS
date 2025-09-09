<template>
  <div data-tab-content="progress">
    <LearningProgressTracker
      :progression="progression"
      @hook-selected="$emit('hook-selected', $event)"
      @start-assessment="$emit('start-assessment', $event)"
      @start-step="$emit('start-step', $event)"
      @execute-recommendation="$emit('execute-recommendation', $event)"
    />
    
    <!-- Learning Path Section -->
    <div v-if="progression?.learningPath" class="mt-6">
      <LearningPath
        :learning-path="progression.learningPath"
        :progression="progression"
        :current-step="currentStep"
        :step-progress="stepProgress"
        @step-selected="$emit('step-selected', $event)"
        @step-started="$emit('step-started', $event)"
        @step-reviewed="$emit('step-reviewed', $event)"
        @resource-opened="$emit('resource-opened', $event)"
        @recommendation-executed="$emit('execute-recommendation', $event)"
      />
    </div>
    
    <!-- Prerequisites Demo -->
    <div class="mt-6">
      <PrerequisiteGate
        :gate="prerequisiteGate"
        :progression="progression"
        @unlocked="$emit('content-unlocked', $event)"
        @view-prerequisites="$emit('view-prerequisites')"
        @work-on-requirement="$emit('work-on-requirement', $event)"
      >
        <template #locked-content>
          <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 md:p-6 text-center">
            <div class="text-3xl md:text-4xl mb-3">🏆</div>
            <h3 class="text-base md:text-lg font-semibold text-white mb-2">Advanced Hook Mastery</h3>
            <p class="text-gray-300 mb-4 text-sm md:text-base px-2">
              This advanced content is unlocked when you reach intermediate level in at least 5 hooks.
            </p>
            <div class="bg-gradient-to-r from-purple-600 to-blue-600 rounded p-3 md:p-4 text-white">
              <div class="text-xs md:text-sm font-medium mb-2">What you'll learn:</div>
              <ul class="text-xs space-y-1 text-left">
                <li>• Advanced hook orchestration patterns</li>
                <li>• Performance optimization techniques</li>
                <li>• Enterprise-scale implementations</li>
                <li>• Complex debugging scenarios</li>
              </ul>
            </div>
          </div>
        </template>
        
        <template #unlocked-content>
          <div class="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-4 md:p-6 text-center text-white">
            <div class="text-3xl md:text-4xl mb-3">🎉</div>
            <h3 class="text-base md:text-lg font-semibold mb-2">Congratulations! Advanced Content Unlocked</h3>
            <p class="mb-4 text-sm md:text-base px-2">You've demonstrated mastery across multiple hooks. Ready for the advanced challenges?</p>
            <button class="px-4 md:px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors touch-target text-sm md:text-base">
              Start Advanced Track
            </button>
          </div>
        </template>
      </PrerequisiteGate>
    </div>
  </div>
</template>

<script setup lang="ts">
import LearningProgressTracker from '../LearningProgressTracker.vue';
import LearningPath from '../LearningPath.vue';
import PrerequisiteGate from '../PrerequisiteGate.vue';
import type { 
  PrerequisiteGate as PrerequisiteGateType,
  LearningPathStep,
  LearningResource,
  AnalyticsRecommendation
} from '../../types/learningProgression';

interface Props {
  progression: any;
  currentStep: string;
  stepProgress: number;
  prerequisiteGate: PrerequisiteGateType;
}

defineProps<Props>();

defineEmits<{
  'hook-selected': [hookId: string];
  'start-assessment': [hookId: string];
  'start-step': [step: LearningPathStep];
  'execute-recommendation': [recommendation: AnalyticsRecommendation];
  'step-selected': [step: LearningPathStep];
  'step-started': [step: LearningPathStep];
  'step-reviewed': [step: LearningPathStep];
  'resource-opened': [resource: LearningResource];
  'content-unlocked': [gate: PrerequisiteGateType];
  'view-prerequisites': [];
  'work-on-requirement': [requirement: any];
}>();
</script>