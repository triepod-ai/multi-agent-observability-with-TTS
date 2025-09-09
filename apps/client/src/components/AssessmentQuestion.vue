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

    <!-- Interactive Code Editor (for code-execution questions) -->
    <div v-if="question.type === 'code-execution'" class="mb-6">
      <SecureCodeEditor
        :initial-code="question.starterCode || ''"
        :language="question.language || 'python'"
        :readonly="false"
        @code-executed="handleCodeExecution"
        @code-change="handleCodeChange"
      />
      
      <!-- Expected Output Display -->
      <div v-if="question.expectedOutput" class="mt-4 bg-gray-800 border border-gray-600 rounded-lg p-3">
        <div class="text-sm font-medium text-gray-300 mb-2">Expected Output:</div>
        <pre class="text-green-300 text-sm font-mono">{{ question.expectedOutput }}</pre>
      </div>
    </div>

    <!-- Code Block (if question contains code for analysis) -->
    <div v-else-if="hasCodeBlock" class="bg-gray-950 border border-gray-700 rounded-lg p-4">
      <div class="text-xs text-gray-400 mb-2">Code Example:</div>
      <pre class="text-green-300 text-sm font-mono overflow-x-auto"><code>{{ extractCodeBlock(question.question) }}</code></pre>
    </div>

    <!-- Code Execution Results (for code-execution questions) -->
    <div v-if="question.type === 'code-execution' && codeExecutionResult" class="mb-6">
      <div class="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-300">Execution Result:</span>
          <div class="flex items-center text-xs space-x-2">
            <span :class="codeExecutionResult.success ? 'text-green-400' : 'text-red-400'">
              {{ codeExecutionResult.success ? '✅ Success' : '❌ Error' }}
            </span>
            <span v-if="outputMatchScore !== null" class="text-blue-400">
              Match: {{ Math.round(outputMatchScore * 100) }}%
            </span>
          </div>
        </div>
        
        <!-- Automatic Scoring for Code Execution -->
        <div v-if="question.type === 'code-execution'" class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="bg-gray-900 border border-gray-700 rounded p-2">
              <div class="text-gray-400 mb-1">Correctness</div>
              <div :class="getCorrectnessColor(outputMatchScore || 0)">
                {{ getCorrectnessScore(outputMatchScore || 0) }}%
              </div>
            </div>
            <div class="bg-gray-900 border border-gray-700 rounded p-2">
              <div class="text-gray-400 mb-1">Efficiency</div>
              <div :class="getEfficiencyColor(codeExecutionResult.metrics.executionTimeMs)">
                {{ getEfficiencyScore(codeExecutionResult.metrics.executionTimeMs) }}%
              </div>
            </div>
            <div class="bg-gray-900 border border-gray-700 rounded p-2">
              <div class="text-gray-400 mb-1">Style</div>
              <div class="text-blue-400">
                {{ getStyleScore(userCode) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Answer Options (for non-code-execution questions) -->
    <div v-if="question.type !== 'code-execution'" class="space-y-3">
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
import SecureCodeEditor from './SecureCodeEditor.vue';
import type { ExecutionResult } from '../services/wasiRuntimeManager';

interface QuestionData {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'code-analysis' | 'code-execution';
  options: string[];
  correctAnswer: number;
  explanation: string;
  competencyDimension: 'knowledge' | 'application' | 'analysis' | 'synthesis';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  
  // Code execution specific fields
  starterCode?: string;
  language?: 'python' | 'javascript' | 'typescript';
  expectedOutput?: string;
  testCases?: Array<{
    input: string[];
    expectedOutput: string;
  }>;
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
const codeExecutionResult = ref<ExecutionResult | null>(null);
const userCode = ref('');
const outputMatchScore = ref<number | null>(null);

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

// Code execution handlers
const handleCodeExecution = (result: ExecutionResult) => {
  codeExecutionResult.value = result;
  
  if (result.success && props.question.expectedOutput) {
    outputMatchScore.value = calculateOutputMatch(result.output, props.question.expectedOutput);
    
    // Auto-select answer based on execution results for code-execution questions
    if (props.question.type === 'code-execution') {
      const score = calculateOverallScore();
      // Convert score to answer index (0-based)
      const answerIndex = score >= 80 ? 0 : score >= 60 ? 1 : 2; // Assuming 3 score ranges
      selectedAnswer.value = answerIndex;
      emit('answerSelected', answerIndex);
    }
  }
};

const handleCodeChange = (code: string) => {
  userCode.value = code;
};

// Scoring functions for code execution
const calculateOutputMatch = (actual: string, expected: string): number => {
  if (!actual || !expected) return 0;
  
  // Normalize outputs (trim whitespace, normalize line endings)
  const normalizeOutput = (output: string) => output.trim().replace(/\r\n/g, '\n');
  
  const actualNorm = normalizeOutput(actual);
  const expectedNorm = normalizeOutput(expected);
  
  if (actualNorm === expectedNorm) return 1.0;
  
  // Calculate similarity using simple character-based comparison
  const maxLength = Math.max(actualNorm.length, expectedNorm.length);
  if (maxLength === 0) return 1.0;
  
  let matchingChars = 0;
  const minLength = Math.min(actualNorm.length, expectedNorm.length);
  
  for (let i = 0; i < minLength; i++) {
    if (actualNorm[i] === expectedNorm[i]) {
      matchingChars++;
    }
  }
  
  return matchingChars / maxLength;
};

const calculateOverallScore = (): number => {
  if (!codeExecutionResult.value || !codeExecutionResult.value.success) return 0;
  
  const correctnessScore = getCorrectnessScore(outputMatchScore.value || 0);
  const efficiencyScore = getEfficiencyScore(codeExecutionResult.value.metrics.executionTimeMs);
  const styleScore = getStyleScore(userCode.value);
  
  // Weighted average: 60% correctness, 25% efficiency, 15% style
  return Math.round(correctnessScore * 0.6 + efficiencyScore * 0.25 + styleScore * 0.15);
};

const getCorrectnessScore = (matchScore: number): number => {
  return Math.round(matchScore * 100);
};

const getCorrectnessColor = (matchScore: number): string => {
  const score = matchScore * 100;
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
};

const getEfficiencyScore = (executionTimeMs: number): number => {
  // Efficiency based on execution time (assumes reasonable time is < 1000ms)
  if (executionTimeMs <= 100) return 100;
  if (executionTimeMs <= 500) return 90;
  if (executionTimeMs <= 1000) return 80;
  if (executionTimeMs <= 2000) return 70;
  if (executionTimeMs <= 5000) return 60;
  return 50;
};

const getEfficiencyColor = (executionTimeMs: number): string => {
  const score = getEfficiencyScore(executionTimeMs);
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
};

const getStyleScore = (code: string): number => {
  if (!code.trim()) return 0;
  
  let score = 100;
  const lines = code.split('\n');
  
  // Check for basic style issues
  let hasComments = false;
  let hasProperIndentation = true;
  let hasDescriptiveNames = true;
  let lineCount = lines.filter(line => line.trim()).length;
  
  for (const line of lines) {
    // Check for comments
    if (line.includes('#') || line.includes('//') || line.includes('/*')) {
      hasComments = true;
    }
    
    // Basic indentation check
    if (line.length > line.trimLeft().length) {
      const indent = line.length - line.trimLeft().length;
      if (indent % 2 !== 0 && indent % 4 !== 0) {
        hasProperIndentation = false;
      }
    }
    
    // Check for single-letter variable names (basic check)
    if (/\b[a-z]\s*=/.test(line) && !line.includes('for') && !line.includes('in')) {
      hasDescriptiveNames = false;
    }
  }
  
  // Apply penalties
  if (!hasComments && lineCount > 5) score -= 15;
  if (!hasProperIndentation) score -= 20;
  if (!hasDescriptiveNames) score -= 15;
  if (lineCount > 50) score -= 10; // Penalty for overly long solutions
  
  return Math.max(score, 50); // Minimum 50% for working code
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