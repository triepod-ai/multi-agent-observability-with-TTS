<template>
  <div class="space-y-4 md:space-y-6">
    <!-- Assessment Header with proper heading hierarchy -->
    <header class="bg-gradient-to-r from-blue-700 to-purple-700 rounded-lg p-4 md:p-6 text-white">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex-1">
          <h1 
            :id="`assessment-title-${assessment.id}`"
            class="text-lg md:text-xl font-bold mb-2"
          >
            <span aria-hidden="true">🎯</span>
            <span>{{ assessment.title }}</span>
          </h1>
          <p 
            :id="`assessment-desc-${assessment.id}`"
            class="text-blue-100 text-xs md:text-sm"
          >
            {{ assessment.description }}
          </p>
        </div>
        <div class="text-center md:text-right">
          <div class="text-xs md:text-sm text-blue-100 mb-1">Progress</div>
          <div class="text-xl md:text-2xl font-bold" aria-live="polite">
            {{ currentQuestionIndex + 1 }} of {{ assessment.questions.length }}
          </div>
        </div>
      </div>
      
      <!-- Progress Bar with ARIA -->
      <div class="mt-4" role="progressbar" :aria-valuenow="progressPercentage" aria-valuemin="0" aria-valuemax="100" :aria-label="`Assessment progress: ${Math.round(progressPercentage)}% complete`">
        <div class="w-full bg-blue-800 rounded-full h-2">
          <div 
            class="bg-yellow-400 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <span class="sr-only">{{ Math.round(progressPercentage) }}% complete</span>
      </div>
    </header>

    <!-- Current Question -->
    <section 
      v-if="!isCompleted" 
      class="bg-gray-800 border border-gray-700 rounded-lg p-4 md:p-6"
      :aria-labelledby="`question-${currentQuestionIndex + 1}-heading`"
    >
      <h2 :id="`question-${currentQuestionIndex + 1}-heading`" class="sr-only">
        Question {{ currentQuestionIndex + 1 }} of {{ assessment.questions.length }}
      </h2>
      
      <AssessmentQuestionAccessible
        :question="currentQuestion"
        :question-number="currentQuestionIndex + 1"
        :total-questions="assessment.questions.length"
        @answer-selected="handleAnswerSelected"
        @next-question="handleNextQuestion"
        :key="currentQuestionIndex"
      />
    </section>

    <!-- Assessment Results -->
    <section 
      v-else 
      class="bg-gray-800 border border-gray-700 rounded-lg p-4 md:p-6"
      role="region"
      aria-labelledby="results-heading"
      aria-live="polite"
    >
      <header class="text-center mb-4 md:mb-6">
        <div class="text-4xl md:text-6xl mb-3 md:mb-4" aria-hidden="true">
          {{ results.score >= 80 ? '🎉' : results.score >= 60 ? '👍' : '📚' }}
        </div>
        <h2 id="results-heading" class="text-xl md:text-2xl font-bold text-white mb-2">
          Assessment Complete!
        </h2>
        <div class="text-base md:text-lg">
          <span class="text-xl md:text-2xl font-bold" :class="getScoreColor(results.score)">
            {{ results.score }}%
          </span>
        </div>
        <p class="text-gray-400 text-xs md:text-sm mt-2 px-2">
          {{ getScoreMessage(results.score) }}
        </p>
      </header>

      <!-- Score Breakdown with proper labeling -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6" role="group" aria-labelledby="score-breakdown">
        <h3 id="score-breakdown" class="sr-only">Score Breakdown</h3>
        
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-3 md:p-4 text-center" role="group" aria-labelledby="correct-label">
          <div class="text-lg md:text-2xl font-bold text-green-400" aria-describedby="correct-label">{{ results.correct }}</div>
          <div id="correct-label" class="text-xs md:text-sm text-gray-400">Correct Answers</div>
        </div>
        
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-3 md:p-4 text-center" role="group" aria-labelledby="incorrect-label">
          <div class="text-lg md:text-2xl font-bold text-red-400" aria-describedby="incorrect-label">{{ results.incorrect }}</div>
          <div id="incorrect-label" class="text-xs md:text-sm text-gray-400">Incorrect Answers</div>
        </div>
        
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-3 md:p-4 text-center" role="group" aria-labelledby="time-label">
          <div class="text-lg md:text-2xl font-bold text-blue-400" aria-describedby="time-label">{{ formatTime(results.timeSpent) }}</div>
          <div id="time-label" class="text-xs md:text-sm text-gray-400">Time Spent</div>
        </div>
        
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-3 md:p-4 text-center" role="group" aria-labelledby="xp-label">
          <div class="text-lg md:text-2xl font-bold text-purple-400" aria-describedby="xp-label">{{ results.competencyGain }}</div>
          <div id="xp-label" class="text-xs md:text-sm text-gray-400">Experience Points</div>
        </div>
      </div>

      <!-- New Badges with accessible structure -->
      <section v-if="results.badges.length > 0" class="mb-6" aria-labelledby="badges-heading">
        <h3 id="badges-heading" class="text-lg font-semibold text-white mb-3">
          <span aria-hidden="true">🏆</span>
          <span>New Badges Earned!</span>
        </h3>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
          <li
            v-for="badge in results.badges"
            :key="badge.id"
            class="bg-gradient-to-r from-yellow-600 to-yellow-500 border border-yellow-400 rounded-lg p-4 flex items-center"
            role="listitem"
          >
            <div class="text-2xl mr-3" aria-hidden="true">🏆</div>
            <div>
              <div class="font-semibold text-yellow-100">{{ badge.name }}</div>
              <div class="text-xs text-yellow-200">{{ badge.description }}</div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Action Buttons with proper labeling and keyboard support -->
      <div class="flex flex-col md:flex-row justify-center gap-3 md:gap-4">
        <button
          @click="retakeAssessment"
          class="bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors text-sm md:text-base touch-target focus-ring"
          type="button"
          :aria-describedby="results.score >= 60 ? 'retake-optional' : 'retake-recommended'"
        >
          <span class="mr-2" aria-hidden="true">🔄</span>
          <span>Retake Assessment</span>
        </button>
        
        <div 
          :id="results.score >= 60 ? 'retake-optional' : 'retake-recommended'" 
          class="sr-only"
        >
          {{ results.score >= 60 ? 'Optional: You passed but can retake to improve your score' : 'Recommended: Retake to achieve the passing score' }}
        </div>
        
        <button
          @click="continueToNextLesson"
          class="bg-green-600 hover:bg-green-700 focus:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors text-sm md:text-base touch-target focus-ring"
          :disabled="results.score < 60"
          type="button"
          :aria-describedby="results.score < 60 ? 'continue-disabled-reason' : 'continue-enabled-reason'"
        >
          <span class="mr-2" aria-hidden="true">➡️</span>
          <span>Continue to Next Lesson</span>
        </button>
        
        <div 
          :id="results.score < 60 ? 'continue-disabled-reason' : 'continue-enabled-reason'" 
          class="sr-only"
        >
          {{ results.score < 60 ? 'You need at least 60% to continue. Please retake the assessment.' : 'You passed! Continue to the next lesson.' }}
        </div>
      </div>
    </section>

    <!-- Assessment Timer with accessible announcement -->
    <div 
      v-if="!isCompleted && assessment.timeLimit" 
      class="fixed top-2 right-2 md:top-4 md:right-4 bg-gray-800 border border-gray-600 rounded-lg p-2 md:p-3 z-50 shadow-lg"
      role="timer"
      :aria-label="`Time remaining: ${formatTime(timeRemaining)}`"
      :aria-live="timeRemaining <= 60 ? 'assertive' : 'polite'"
    >
      <div class="flex items-center text-xs md:text-sm text-white">
        <span class="mr-2" aria-hidden="true">⏰</span>
        <span class="font-mono">{{ formatTime(timeRemaining) }}</span>
      </div>
      
      <!-- Time warning for screen readers -->
      <div class="sr-only" v-if="timeRemaining <= 60" aria-live="assertive">
        Warning: Only {{ formatTime(timeRemaining) }} remaining!
      </div>
    </div>
    
    <!-- Close button for modal -->
    <div class="flex justify-end mt-4">
      <button
        @click="$emit('continue')"
        class="text-gray-400 hover:text-white focus:text-white p-2 rounded focus-ring"
        type="button"
        aria-label="Close assessment modal"
        title="Close assessment (Escape key)"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useLearningProgression } from '../composables/useLearningProgression';
import AssessmentQuestionAccessible from './AssessmentQuestionAccessible.vue';
import type { AssessmentResult, Badge } from '../types/learningProgression';

interface AssessmentData {
  id: string;
  title: string;
  description: string;
  hookId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimit?: number; // in seconds
  passingScore: number;
  questions: QuestionData[];
}

interface QuestionData {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'code-analysis';
  options: string[];
  correctAnswer: number;
  explanation: string;
  competencyDimension: 'knowledge' | 'application' | 'analysis' | 'synthesis';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface AssessmentResults {
  score: number;
  correct: number;
  incorrect: number;
  timeSpent: number;
  competencyGain: number;
  badges: Badge[];
}

// Props
interface Props {
  assessmentData: AssessmentData;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  completed: [results: AssessmentResults];
  retake: [];
  continue: [];
}>();

// Composables
const { updateCompetency, recordActivity } = useLearningProgression('default-user');

// State
const currentQuestionIndex = ref(0);
const answers = ref<number[]>([]);
const isCompleted = ref(false);
const startTime = ref(Date.now());
const timeRemaining = ref(props.assessmentData.timeLimit || 0);
const results = ref<AssessmentResults>({
  score: 0,
  correct: 0,
  incorrect: 0,
  timeSpent: 0,
  competencyGain: 0,
  badges: []
});

// Accessibility state
const announcementQueue = ref<string[]>([]);

// Timer
let timer: number | null = null;

// Computed
const assessment = computed(() => props.assessmentData);
const currentQuestion = computed(() => assessment.value.questions[currentQuestionIndex.value]);
const progressPercentage = computed(() => ((currentQuestionIndex.value) / assessment.value.questions.length) * 100);

// Accessibility methods
const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  // Use the live region that exists in the parent component
  const liveRegion = document.getElementById('sr-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
    liveRegion.setAttribute('aria-live', priority);
  }
  
  // Also queue for internal management
  announcementQueue.value.push(message);
  setTimeout(() => {
    announcementQueue.value = announcementQueue.value.filter(a => a !== message);
  }, 3000);
};

// Keyboard navigation handler
const handleKeyDown = (event: KeyboardEvent) => {
  // Handle Escape key to close modal
  if (event.key === 'Escape') {
    emit('continue');
    announceToScreenReader('Assessment modal closed');
  }
  
  // Handle Enter/Space on buttons (browser handles this but we can announce)
  if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) {
    const buttonText = event.target.textContent?.trim();
    if (buttonText) {
      announceToScreenReader(`Activated: ${buttonText}`);
    }
  }
};

// Methods
const handleAnswerSelected = (answerIndex: number) => {
  answers.value[currentQuestionIndex.value] = answerIndex;
  
  // Announce answer selection
  const questionNum = currentQuestionIndex.value + 1;
  const optionText = currentQuestion.value.options[answerIndex];
  announceToScreenReader(`Selected answer ${answerIndex + 1} for question ${questionNum}: ${optionText.substring(0, 50)}...`);
};

const handleNextQuestion = async () => {
  await recordActivity('assessment');
  
  if (currentQuestionIndex.value < assessment.value.questions.length - 1) {
    currentQuestionIndex.value++;
    
    // Announce question progression
    const nextQuestionNum = currentQuestionIndex.value + 1;
    announceToScreenReader(`Moving to question ${nextQuestionNum} of ${assessment.value.questions.length}`);
    
    // Focus management - focus the question content
    nextTick(() => {
      const nextQuestionHeading = document.querySelector(`#question-${nextQuestionNum}-heading`);
      if (nextQuestionHeading) {
        (nextQuestionHeading as HTMLElement).focus();
      }
    });
  } else {
    await completeAssessment();
  }
};

const completeAssessment = async () => {
  const endTime = Date.now();
  const timeSpent = Math.round((endTime - startTime.value) / 1000);
  
  if (timer) {
    clearInterval(timer);
  }

  // Calculate results
  let correct = 0;
  let totalPoints = 0;
  let earnedPoints = 0;

  assessment.value.questions.forEach((question, index) => {
    totalPoints += question.points;
    if (answers.value[index] === question.correctAnswer) {
      correct++;
      earnedPoints += question.points;
    }
  });

  const incorrect = assessment.value.questions.length - correct;
  const score = Math.round((earnedPoints / totalPoints) * 100);
  const competencyGain = Math.round(score * 0.5); // XP based on score

  results.value = {
    score,
    correct,
    incorrect,
    timeSpent,
    competencyGain,
    badges: []
  };

  // Update competency based on performance
  const competencyDimensions = ['knowledge', 'application', 'analysis', 'synthesis'] as const;
  
  for (const dimension of competencyDimensions) {
    const dimensionQuestions = assessment.value.questions.filter(q => q.competencyDimension === dimension);
    if (dimensionQuestions.length > 0) {
      const dimensionScore = dimensionQuestions.reduce((sum, question, index) => {
        const globalIndex = assessment.value.questions.indexOf(question);
        return sum + (answers.value[globalIndex] === question.correctAnswer ? question.points : 0);
      }, 0);
      
      const dimensionTotalPoints = dimensionQuestions.reduce((sum, q) => sum + q.points, 0);
      const dimensionPercentage = (dimensionScore / dimensionTotalPoints) * 100;
      
      await updateCompetency(assessment.value.hookId, dimension, dimensionPercentage, 'assessment');
    }
  }

  isCompleted.value = true;
  
  // Announce completion with detailed results
  const passed = score >= assessment.value.passingScore;
  const resultMessage = passed 
    ? `Assessment completed successfully! You scored ${score}% with ${correct} correct answers out of ${assessment.value.questions.length}. You gained ${competencyGain} experience points.`
    : `Assessment completed. You scored ${score}% with ${correct} correct answers. The passing score is ${assessment.value.passingScore}%. Please review and try again.`;
  
  announceToScreenReader(resultMessage, 'assertive');
  
  // Focus management - focus results heading
  nextTick(() => {
    const resultsHeading = document.querySelector('#results-heading');
    if (resultsHeading) {
      (resultsHeading as HTMLElement).focus();
    }
  });

  emit('completed', results.value);
};

const retakeAssessment = () => {
  // Reset state
  currentQuestionIndex.value = 0;
  answers.value = [];
  isCompleted.value = false;
  startTime.value = Date.now();
  timeRemaining.value = props.assessmentData.timeLimit || 0;
  
  // Restart timer if needed
  if (assessment.value.timeLimit) {
    startTimer();
  }
  
  announceToScreenReader('Assessment reset. Starting from the beginning.', 'assertive');
  
  // Focus first question
  nextTick(() => {
    const firstQuestion = document.querySelector('#question-1-heading');
    if (firstQuestion) {
      (firstQuestion as HTMLElement).focus();
    }
  });
  
  emit('retake');
};

const continueToNextLesson = () => {
  announceToScreenReader('Continuing to next lesson');
  emit('continue');
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

const getScoreMessage = (score: number): string => {
  if (score >= 90) return 'Outstanding! You have mastered this hook.';
  if (score >= 80) return 'Excellent work! You have a strong understanding.';
  if (score >= 70) return 'Good job! You understand the key concepts.';
  if (score >= 60) return 'You passed! Consider reviewing before moving on.';
  return 'Keep studying and try again when you\'re ready.';
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const startTimer = () => {
  if (!assessment.value.timeLimit) return;
  
  timer = window.setInterval(() => {
    timeRemaining.value--;
    
    // Announce time warnings
    if (timeRemaining.value === 60) {
      announceToScreenReader('Warning: Only 1 minute remaining!', 'assertive');
    } else if (timeRemaining.value === 30) {
      announceToScreenReader('Warning: Only 30 seconds remaining!', 'assertive');
    } else if (timeRemaining.value === 10) {
      announceToScreenReader('Warning: Only 10 seconds remaining!', 'assertive');
    }
    
    if (timeRemaining.value <= 0) {
      announceToScreenReader('Time is up! Assessment completed automatically.', 'assertive');
      completeAssessment();
    }
  }, 1000);
};

// Lifecycle
onMounted(() => {
  recordActivity('assessment');
  
  if (assessment.value.timeLimit) {
    timeRemaining.value = assessment.value.timeLimit;
    startTimer();
  }
  
  // Add keyboard listeners
  document.addEventListener('keydown', handleKeyDown);
  
  // Announce assessment start
  const timeMessage = assessment.value.timeLimit 
    ? `Time limit: ${formatTime(assessment.value.timeLimit)}. ` 
    : '';
  
  announceToScreenReader(
    `Assessment started: ${assessment.value.title}. ${assessment.value.questions.length} questions. ${timeMessage}Use Tab to navigate, Enter or Space to select options, Escape to close.`,
    'assertive'
  );
  
  // Focus first question
  nextTick(() => {
    const firstQuestion = document.querySelector('#question-1-heading');
    if (firstQuestion) {
      (firstQuestion as HTMLElement).focus();
    }
  });
});

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
  }
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* Assessment-specific accessibility enhancements */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  @apply flex items-center justify-center;
}

.focus-ring:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900;
}

.focus-ring:focus-visible {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900;
}

/* Assessment-specific animations with reduced motion support */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Timer warning colors with accessibility */
.timer-warning {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .bg-gradient-to-r {
    @apply border-2 border-white;
  }
  
  .bg-gray-800,
  .bg-gray-900 {
    @apply border border-gray-500;
  }
  
  .focus-ring:focus {
    outline: 3px solid white;
    outline-offset: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .transition-all,
  .transition-colors {
    transition: none;
  }
  
  .timer-warning {
    animation: none;
  }
  
  /* Still show focus for accessibility */
  .focus-ring:focus {
    @apply ring-2 ring-blue-500;
  }
}

/* Color contrast improvements */
.text-blue-100 {
  color: #dbeafe; /* Improved contrast ratio */
}

.text-gray-400 {
  color: #9ca3af; /* Meets WCAG AA standards */
}

/* Screen reader only content */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Print accessibility */
@media print {
  .sr-only {
    position: static !important;
    width: auto !important;
    height: auto !important;
    clip: auto !important;
  }
}
</style>
