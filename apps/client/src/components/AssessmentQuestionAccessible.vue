<template>
  <div class="space-y-6">
    <!-- Question Header with proper structure -->
    <header class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center mb-2">
          <span class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded mr-2">
            Q{{ questionNumber }}
          </span>
          <span class="text-xs text-gray-400">{{ question.competencyDimension }}</span>
          <span class="mx-2 text-gray-500" aria-hidden="true">•</span>
          <span class="text-xs" :class="getDifficultyColor(question.difficulty)">
            {{ question.difficulty }} difficulty
          </span>
        </div>
        
        <h3 
          :id="`question-${questionNumber}-text`"
          class="text-lg font-semibold text-white mb-4"
        >
          {{ question.question }}
        </h3>
      </div>
      
      <div class="text-right text-sm text-gray-400">
        <div class="font-mono" aria-label="Question progress">{{ questionNumber }}/{{ totalQuestions }}</div>
        <div class="text-xs" :aria-label="`${question.points} points available`">{{ question.points }} pts</div>
      </div>
    </header>

    <!-- Interactive Code Editor (for code-execution questions) -->
    <section v-if="question.type === 'code-execution'" class="mb-6" aria-labelledby="code-editor-heading">
      <h4 id="code-editor-heading" class="sr-only">Code Editor</h4>
      <SecureCodeEditorAccessible
        :initial-code="question.starterCode || ''"
        :language="question.language || 'python'"
        :readonly="false"
        @code-executed="handleCodeExecution"
        @code-change="handleCodeChange"
      />
      
      <!-- Expected Output Display -->
      <div v-if="question.expectedOutput" class="mt-4 bg-gray-800 border border-gray-600 rounded-lg p-3" role="region" aria-labelledby="expected-output-heading">
        <h5 id="expected-output-heading" class="text-sm font-medium text-gray-300 mb-2">Expected Output:</h5>
        <pre class="text-green-300 text-sm font-mono" role="img" :aria-label="`Expected output: ${question.expectedOutput}`">{{ question.expectedOutput }}</pre>
      </div>
    </section>

    <!-- Code Block (if question contains code for analysis) -->
    <section v-else-if="hasCodeBlock" class="bg-gray-950 border border-gray-700 rounded-lg p-4" role="region" aria-labelledby="code-example-heading">
      <h4 id="code-example-heading" class="text-xs text-gray-400 mb-2">Code Example:</h4>
      <pre class="text-green-300 text-sm font-mono overflow-x-auto" role="img" :aria-label="`Code example: ${extractCodeBlock(question.question)}`"><code>{{ extractCodeBlock(question.question) }}</code></pre>
    </section>

    <!-- Code Execution Results (for code-execution questions) -->
    <section v-if="question.type === 'code-execution' && codeExecutionResult" class="mb-6" role="region" aria-labelledby="execution-results-heading" aria-live="polite">
      <div class="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <header class="flex items-center justify-between mb-3">
          <h4 id="execution-results-heading" class="text-sm font-medium text-gray-300">Execution Result:</h4>
          <div class="flex items-center text-xs space-x-2">
            <span :class="codeExecutionResult.success ? 'text-green-400' : 'text-red-400'">
              {{ codeExecutionResult.success ? '✅ Success' : '❌ Error' }}
            </span>
            <span v-if="outputMatchScore !== null" class="text-blue-400" :aria-label="`Output match: ${Math.round(outputMatchScore * 100)} percent`">
              Match: {{ Math.round(outputMatchScore * 100) }}%
            </span>
          </div>
        </header>
        
        <!-- Automatic Scoring for Code Execution -->
        <div v-if="question.type === 'code-execution'" class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" role="group" aria-labelledby="scoring-breakdown">
            <h5 id="scoring-breakdown" class="sr-only">Scoring Breakdown</h5>
            
            <div class="bg-gray-900 border border-gray-700 rounded p-2" role="group" aria-labelledby="correctness-score">
              <div id="correctness-score" class="text-gray-400 mb-1">Correctness</div>
              <div :class="getCorrectnessColor(outputMatchScore || 0)" :aria-label="`Correctness score: ${getCorrectnessScore(outputMatchScore || 0)} percent`">
                {{ getCorrectnessScore(outputMatchScore || 0) }}%
              </div>
            </div>
            
            <div class="bg-gray-900 border border-gray-700 rounded p-2" role="group" aria-labelledby="efficiency-score">
              <div id="efficiency-score" class="text-gray-400 mb-1">Efficiency</div>
              <div :class="getEfficiencyColor(codeExecutionResult.metrics.executionTimeMs)" :aria-label="`Efficiency score: ${getEfficiencyScore(codeExecutionResult.metrics.executionTimeMs)} percent`">
                {{ getEfficiencyScore(codeExecutionResult.metrics.executionTimeMs) }}%
              </div>
            </div>
            
            <div class="bg-gray-900 border border-gray-700 rounded p-2" role="group" aria-labelledby="style-score">
              <div id="style-score" class="text-gray-400 mb-1">Style</div>
              <div class="text-blue-400" :aria-label="`Style score: ${getStyleScore(userCode)} percent`">
                {{ getStyleScore(userCode) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Answer Options (for non-code-execution questions) with proper radio group -->
    <fieldset v-if="question.type !== 'code-execution'" class="space-y-3">
      <legend class="sr-only">Choose your answer</legend>
      
      <div
        v-for="(option, index) in question.options"
        :key="index"
        class="border border-gray-600 rounded-lg transition-all duration-200 hover:border-blue-500 focus-within:border-blue-500"
        :class="getOptionClass(index)"
      >
        <label class="flex items-start p-4 cursor-pointer w-full">
          <input
            type="radio"
            :name="`question-${questionNumber}-options`"
            :value="index"
            :checked="selectedAnswer === index"
            @change="selectAnswer(index)"
            class="sr-only"
            :aria-describedby="`option-${questionNumber}-${index}-text`"
          />
          
          <div class="flex-shrink-0 mr-3 mt-0.5">
            <div 
              class="w-4 h-4 border-2 rounded-full flex items-center justify-center focus-ring"
              :class="getRadioClass(index)"
              :aria-hidden="true"
            >
              <div v-if="selectedAnswer === index" class="w-2 h-2 bg-current rounded-full"></div>
            </div>
          </div>
          
          <div class="flex-1">
            <span :id="`option-${questionNumber}-${index}-text`" class="text-sm text-white leading-relaxed">
              {{ option }}
            </span>
          </div>
          
          <div v-if="selectedAnswer === index" class="flex-shrink-0 ml-2">
            <span class="text-blue-400" aria-hidden="true">✓</span>
            <span class="sr-only">Selected</span>
          </div>
        </label>
      </div>
    </fieldset>

    <!-- Answer Explanation (shown after selection and review) -->
    <section 
      v-if="showExplanation" 
      class="bg-gray-900 border border-gray-600 rounded-lg p-4"
      role="region"
      aria-labelledby="explanation-heading"
      aria-live="polite"
    >
      <header class="flex items-center mb-2">
        <span class="text-blue-400 mr-2" aria-hidden="true">💡</span>
        <h4 id="explanation-heading" class="font-semibold text-white">Explanation</h4>
      </header>
      <p class="text-sm text-gray-300 leading-relaxed">{{ question.explanation }}</p>
    </section>

    <!-- Action Controls -->
    <footer class="flex justify-between items-center pt-4">
      <div class="flex items-center space-x-4">
        <!-- Review Toggle -->
        <button
          v-if="selectedAnswer !== null"
          @click="toggleExplanation"
          class="text-sm text-blue-400 hover:text-blue-300 focus:text-blue-300 flex items-center focus-ring rounded px-2 py-1"
          type="button"
          :aria-expanded="showExplanation"
          :aria-controls="'explanation-heading'"
        >
          <span class="mr-1" aria-hidden="true">{{ showExplanation ? '👁️' : '💡' }}</span>
          <span>{{ showExplanation ? 'Hide' : 'Show' }} Explanation</span>
        </button>
        
        <!-- Confidence Indicator -->
        <div v-if="selectedAnswer !== null" class="flex items-center text-xs text-gray-400" role="group" aria-labelledby="confidence-heading">
          <span id="confidence-heading" class="mr-2">Confidence:</span>
          <div class="flex space-x-1" role="radiogroup" aria-labelledby="confidence-heading">
            <button
              v-for="level in 3"
              :key="level"
              @click="setConfidence(level)"
              class="w-6 h-2 rounded transition-colors focus-ring"
              :class="confidence >= level ? 'bg-green-400' : 'bg-gray-600'"
              type="button"
              role="radio"
              :aria-checked="confidence === level"
              :aria-label="`Confidence level ${level} of 3`"
            ></button>
          </div>
        </div>
      </div>

      <!-- Next/Continue Button -->
      <button
        @click="handleNext"
        :disabled="selectedAnswer === null"
        class="bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center transition-colors focus-ring touch-target"
        type="button"
        :aria-describedby="selectedAnswer === null ? 'next-button-disabled-reason' : undefined"
      >
        <span class="mr-2" aria-hidden="true">{{ isLastQuestion ? '🎯' : '➡️' }}</span>
        <span>{{ isLastQuestion ? 'Complete Assessment' : 'Next Question' }}</span>
      </button>
      
      <div v-if="selectedAnswer === null" id="next-button-disabled-reason" class="sr-only">
        Please select an answer before continuing.
      </div>
    </footer>

    <!-- Question Progress Indicator -->
    <div class="flex justify-center mt-4" role="img" :aria-label="`Question ${questionNumber} of ${totalQuestions}`">
      <div class="flex space-x-1">
        <div
          v-for="i in totalQuestions"
          :key="i"
          class="w-2 h-2 rounded-full"
          :class="i <= questionNumber ? 'bg-blue-400' : 'bg-gray-600'"
          :aria-hidden="true"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import SecureCodeEditorAccessible from './SecureCodeEditorAccessible.vue';
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

// Accessibility state
const announcements = ref<string[]>([]);

// Computed
const isLastQuestion = computed(() => props.questionNumber === props.totalQuestions);
const hasCodeBlock = computed(() => props.question.question.includes('```'));

// Accessibility methods
const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const liveRegion = document.getElementById('sr-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
    liveRegion.setAttribute('aria-live', priority);
  }
  
  announcements.value.push(message);
  setTimeout(() => {
    announcements.value = announcements.value.filter(a => a !== message);
  }, 3000);
};

// Methods with accessibility enhancements
const selectAnswer = (index: number) => {
  const previousAnswer = selectedAnswer.value;
  selectedAnswer.value = index;
  showExplanation.value = false; // Hide explanation when changing answer
  
  // Announce answer selection
  const optionText = props.question.options[index];
  const changeType = previousAnswer === null ? 'Selected' : 'Changed answer to';
  announceToScreenReader(`${changeType} option ${index + 1}: ${optionText.substring(0, 100)}${optionText.length > 100 ? '...' : ''}`);
  
  emit('answerSelected', index);
};

const toggleExplanation = () => {
  showExplanation.value = !showExplanation.value;
  
  if (showExplanation.value) {
    announceToScreenReader('Showing explanation');
    // Focus the explanation
    nextTick(() => {
      const explanationHeading = document.getElementById('explanation-heading');
      if (explanationHeading) {
        explanationHeading.focus();
      }
    });
  } else {
    announceToScreenReader('Hiding explanation');
  }
};

const setConfidence = (level: number) => {
  confidence.value = level;
  announceToScreenReader(`Confidence set to ${level} out of 3`);
};

const handleNext = () => {
  if (selectedAnswer.value === null) {
    announceToScreenReader('Please select an answer before continuing', 'assertive');
    return;
  }
  
  const actionType = isLastQuestion.value ? 'Completing assessment' : 'Moving to next question';
  announceToScreenReader(actionType);
  
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

// Code execution handlers with accessibility
const handleCodeExecution = (result: ExecutionResult) => {
  codeExecutionResult.value = result;
  
  if (result.success && props.question.expectedOutput) {
    outputMatchScore.value = calculateOutputMatch(result.output, props.question.expectedOutput);
    
    // Auto-select answer based on execution results for code-execution questions
    if (props.question.type === 'code-execution') {
      const score = calculateOverallScore();
      // Convert score to answer index (0-based)
      const answerIndex = score >= 80 ? 0 : score >= 60 ? 1 : 2; // Assuming 3 score ranges
      selectAnswer(answerIndex);
    }
  }
  
  // Announce execution result
  const successMessage = result.success 
    ? `Code executed successfully. Output match: ${Math.round((outputMatchScore.value || 0) * 100)}%`
    : `Code execution failed: ${result.error}`;
  
  announceToScreenReader(successMessage, result.success ? 'polite' : 'assertive');
};

const handleCodeChange = (code: string) => {
  userCode.value = code;
};

// Scoring functions for code execution (unchanged)
const calculateOutputMatch = (actual: string, expected: string): number => {
  if (!actual || !expected) return 0;
  
  const normalizeOutput = (output: string) => output.trim().replace(/\r\n/g, '\n');
  
  const actualNorm = normalizeOutput(actual);
  const expectedNorm = normalizeOutput(expected);
  
  if (actualNorm === expectedNorm) return 1.0;
  
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
  
  let hasComments = false;
  let hasProperIndentation = true;
  let hasDescriptiveNames = true;
  let lineCount = lines.filter(line => line.trim()).length;
  
  for (const line of lines) {
    if (line.includes('#') || line.includes('//') || line.includes('/*')) {
      hasComments = true;
    }
    
    if (line.length > line.trimLeft().length) {
      const indent = line.length - line.trimLeft().length;
      if (indent % 2 !== 0 && indent % 4 !== 0) {
        hasProperIndentation = false;
      }
    }
    
    if (/\b[a-z]\s*=/.test(line) && !line.includes('for') && !line.includes('in')) {
      hasDescriptiveNames = false;
    }
  }
  
  if (!hasComments && lineCount > 5) score -= 15;
  if (!hasProperIndentation) score -= 20;
  if (!hasDescriptiveNames) score -= 15;
  if (lineCount > 50) score -= 10;
  
  return Math.max(score, 50);
};
</script>

<style scoped>
/* Accessibility and touch optimization */
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

/* Smooth transitions with reduced motion support */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Question option hover effects */
.cursor-pointer:hover {
  transform: translateY(-1px);
}

/* Enhanced radio button styling for accessibility */
input[type="radio"]:focus + .focus-ring {
  @apply ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900;
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

/* High contrast mode support */
@media (prefers-contrast: high) {
  .border-gray-600,
  .border-gray-700 {
    border-width: 2px;
    @apply border-gray-400;
  }
  
  .bg-gray-800,
  .bg-gray-900,
  .bg-gray-950 {
    @apply border border-gray-500;
  }
  
  .focus-ring:focus {
    outline: 3px solid white;
    outline-offset: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .transition-all,
  .transition-colors,
  .cursor-pointer:hover {
    transition: none;
    transform: none;
  }
  
  /* Still show focus for accessibility */
  .focus-ring:focus,
  input[type="radio"]:focus + .focus-ring {
    @apply ring-2 ring-blue-500;
  }
}

/* Color contrast improvements */
.text-gray-300 {
  color: #d1d5db; /* Improved contrast ratio */
}

.text-gray-400 {
  color: #9ca3af; /* Meets WCAG AA standards */
}

.text-blue-100 {
  color: #dbeafe; /* Improved contrast */
}

/* Print styles */
@media print {
  .sr-only {
    position: static !important;
    width: auto !important;
    height: auto !important;
    clip: auto !important;
  }
  
  .focus-ring:focus {
    @apply ring-0;
    outline: 2px solid black;
  }
}
</style>
