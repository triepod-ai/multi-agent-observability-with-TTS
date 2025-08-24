<template>
  <div class="space-y-6">
    <!-- Assessment Header -->
    <div class="bg-gradient-to-r from-blue-700 to-purple-700 rounded-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">🎯 {{ assessment.title }}</h2>
          <p class="text-blue-100 text-sm">{{ assessment.description }}</p>
        </div>
        <div class="text-right">
          <div class="text-sm text-blue-100 mb-1">Progress</div>
          <div class="text-2xl font-bold">{{ currentQuestionIndex + 1 }}/{{ assessment.questions.length }}</div>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="mt-4">
        <div class="w-full bg-blue-800 rounded-full h-2">
          <div 
            class="bg-yellow-400 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Current Question -->
    <div v-if="!isCompleted" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <AssessmentQuestion
        :question="currentQuestion"
        :question-number="currentQuestionIndex + 1"
        :total-questions="assessment.questions.length"
        @answer-selected="handleAnswerSelected"
        @next-question="handleNextQuestion"
        :key="currentQuestionIndex"
      />
    </div>

    <!-- Assessment Results -->
    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div class="text-center mb-6">
        <div class="text-6xl mb-4">
          {{ results.score >= 80 ? '🎉' : results.score >= 60 ? '👍' : '📚' }}
        </div>
        <h3 class="text-2xl font-bold text-white mb-2">Assessment Complete!</h3>
        <div class="text-lg">
          <span class="text-2xl font-bold" :class="getScoreColor(results.score)">
            {{ results.score }}%
          </span>
        </div>
        <p class="text-gray-400 text-sm mt-2">
          {{ getScoreMessage(results.score) }}
        </p>
      </div>

      <!-- Score Breakdown -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-400">{{ results.correct }}</div>
          <div class="text-sm text-gray-400">Correct</div>
        </div>
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-red-400">{{ results.incorrect }}</div>
          <div class="text-sm text-gray-400">Incorrect</div>
        </div>
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-400">{{ formatTime(results.timeSpent) }}</div>
          <div class="text-sm text-gray-400">Time</div>
        </div>
        <div class="bg-gray-900 border border-gray-600 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-purple-400">{{ results.competencyGain }}</div>
          <div class="text-sm text-gray-400">XP Gained</div>
        </div>
      </div>

      <!-- New Badges -->
      <div v-if="results.badges.length > 0" class="mb-6">
        <h4 class="text-lg font-semibold text-white mb-3">🏆 New Badges Earned!</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="badge in results.badges"
            :key="badge.id"
            class="bg-gradient-to-r from-yellow-600 to-yellow-500 border border-yellow-400 rounded-lg p-4 flex items-center"
          >
            <div class="text-2xl mr-3">🏆</div>
            <div>
              <div class="font-semibold text-yellow-100">{{ badge.name }}</div>
              <div class="text-xs text-yellow-200">{{ badge.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-center space-x-4">
        <button
          @click="retakeAssessment"
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors"
        >
          <span class="mr-2">🔄</span>
          Retake Assessment
        </button>
        <button
          @click="continueToNextLesson"
          class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors"
          :disabled="results.score < 60"
        >
          <span class="mr-2">➡️</span>
          Continue to Next Lesson
        </button>
      </div>
    </div>

    <!-- Assessment Timer (if active) -->
    <div v-if="!isCompleted && assessment.timeLimit" class="fixed top-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-3 z-50">
      <div class="flex items-center text-sm text-white">
        <span class="mr-2">⏰</span>
        <span class="font-mono">{{ formatTime(timeRemaining) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useLearningProgression } from '../composables/useLearningProgression';
import AssessmentQuestion from './AssessmentQuestion.vue';
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

// Timer
let timer: number | null = null;

// Computed
const assessment = computed(() => props.assessmentData);
const currentQuestion = computed(() => assessment.value.questions[currentQuestionIndex.value]);
const progressPercentage = computed(() => ((currentQuestionIndex.value) / assessment.value.questions.length) * 100);

// Methods
const handleAnswerSelected = (answerIndex: number) => {
  answers.value[currentQuestionIndex.value] = answerIndex;
};

const handleNextQuestion = async () => {
  await recordActivity('assessment');
  
  if (currentQuestionIndex.value < assessment.value.questions.length - 1) {
    currentQuestionIndex.value++;
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
  
  emit('retake');
};

const continueToNextLesson = () => {
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
    
    if (timeRemaining.value <= 0) {
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
});

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
/* Assessment-specific animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Timer warning colors */
.timer-warning {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>