<template>
  <div class="space-y-6">
    <!-- Question Header -->
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center mb-2">
          <span class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded mr-2">
            Q{{ questionNumber }}
          </span>
          <span class="text-xs text-gray-400">{{ question.competencyDimension }}</span>
          <span class="mx-2 text-gray-500">•</span>
          <span class="text-xs" :class="getDifficultyColor(question.difficulty)">
            {{ question.difficulty }}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-white mb-4">{{ question.question }}</h3>
      </div>
      <div class="text-right text-sm text-gray-400">
        <div class="font-mono">{{ questionNumber }}/{{ totalQuestions }}</div>
        <div class="text-xs">{{ question.points }} pts</div>
      </div>
    </div>

    <!-- Code Block (if question contains code) -->
    <div v-if="hasCodeBlock" class="bg-gray-950 border border-gray-700 rounded-lg p-4">
      <div class="text-xs text-gray-400 mb-2">Code Example:</div>
      <pre class="text-green-300 text-sm font-mono overflow-x-auto"><code>{{ extractCodeBlock(question.question) }}</code></pre>
    </div>

    <!-- Answer Options -->
    <div class="space-y-3">
      <div
        v-for="(option, index) in question.options"
        :key="index"
        @click="selectAnswer(index)"
        class="border border-gray-600 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-blue-500"
        :class="getOptionClass(index)"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-3 mt-0.5">
            <div 
              class="w-4 h-4 border-2 rounded-full flex items-center justify-center"
              :class="getRadioClass(index)"
            >
              <div v-if="selectedAnswer === index" class="w-2 h-2 bg-current rounded-full"></div>
            </div>
          </div>
          <div class="flex-1">
            <div class="text-sm text-white leading-relaxed">{{ option }}</div>
          </div>
          <div v-if="selectedAnswer === index" class="flex-shrink-0 ml-2">
            <span class="text-blue-400">✓</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Answer Explanation (shown after selection and review) -->
    <div v-if="showExplanation" class="bg-gray-900 border border-gray-600 rounded-lg p-4">
      <div class="flex items-center mb-2">
        <span class="text-blue-400 mr-2">💡</span>
        <span class="font-semibold text-white">Explanation</span>
      </div>
      <p class="text-sm text-gray-300 leading-relaxed">{{ question.explanation }}</p>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-between items-center pt-4">
      <div class="flex items-center space-x-4">
        <!-- Review Toggle -->
        <button
          v-if="selectedAnswer !== null"
          @click="toggleExplanation"
          class="text-sm text-blue-400 hover:text-blue-300 flex items-center"
        >
          <span class="mr-1">{{ showExplanation ? '👁️' : '💡' }}</span>
          {{ showExplanation ? 'Hide' : 'Show' }} Explanation
        </button>
        
        <!-- Confidence Indicator -->
        <div v-if="selectedAnswer !== null" class="flex items-center text-xs text-gray-400">
          <span class="mr-2">Confidence:</span>
          <div class="flex space-x-1">
            <button
              v-for="level in 3"
              :key="level"
              @click="setConfidence(level)"
              class="w-6 h-2 rounded transition-colors"
              :class="confidence >= level ? 'bg-green-400' : 'bg-gray-600'"
            ></button>
          </div>
        </div>
      </div>

      <!-- Next/Continue Button -->
      <button
        @click="handleNext"
        :disabled="selectedAnswer === null"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
      >
        <span class="mr-2">{{ isLastQuestion ? '🎯' : '➡️' }}</span>
        {{ isLastQuestion ? 'Complete Assessment' : 'Next Question' }}
      </button>
    </div>

    <!-- Question Progress Indicator -->
    <div class="flex justify-center mt-4">
      <div class="flex space-x-1">
        <div
          v-for="i in totalQuestions"
          :key="i"
          class="w-2 h-2 rounded-full"
          :class="i <= questionNumber ? 'bg-blue-400' : 'bg-gray-600'"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

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

// Props
interface Props {
  question: QuestionData;
  questionNumber: number;
  totalQuestions: number;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  answerSelected: [answerIndex: number];
  nextQuestion: [];
}>();

// State
const selectedAnswer = ref<number | null>(null);
const showExplanation = ref(false);
const confidence = ref(0);

// Computed
const isLastQuestion = computed(() => props.questionNumber === props.totalQuestions);
const hasCodeBlock = computed(() => props.question.question.includes('```'));

// Methods
const selectAnswer = (index: number) => {
  selectedAnswer.value = index;
  showExplanation.value = false; // Hide explanation when changing answer
  emit('answerSelected', index);
};

const toggleExplanation = () => {
  showExplanation.value = !showExplanation.value;
};

const setConfidence = (level: number) => {
  confidence.value = level;
};

const handleNext = () => {
  if (selectedAnswer.value === null) return;
  emit('nextQuestion');
};

const getOptionClass = (index: number): string => {
  if (selectedAnswer.value === index) {
    return 'border-blue-500 bg-blue-900/20';
  }
  return 'hover:bg-gray-900/50';
};

const getRadioClass = (index: number): string => {
  if (selectedAnswer.value === index) {
    return 'border-blue-400 text-blue-400';
  }
  return 'border-gray-400';
};

const getDifficultyColor = (difficulty: string): string => {
  const colors = {
    easy: 'text-green-400',
    medium: 'text-yellow-400',
    hard: 'text-red-400'
  };
  return colors[difficulty as keyof typeof colors] || 'text-gray-400';
};

const extractCodeBlock = (text: string): string => {
  const codeMatch = text.match(/```[\s\S]*?```/);
  if (codeMatch) {
    return codeMatch[0].replace(/```/g, '').trim();
  }
  return '';
};
</script>

<style scoped>
/* Custom scrollbar for code blocks */
pre::-webkit-scrollbar {
  height: 6px;
}

pre::-webkit-scrollbar-track {
  background: #374151;
}

pre::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 3px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Question option hover effects */
.cursor-pointer:hover {
  transform: translateY(-1px);
}
</style>