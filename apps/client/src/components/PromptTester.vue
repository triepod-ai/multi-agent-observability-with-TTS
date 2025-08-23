<template>
  <div class="space-y-6">
    <!-- Header with Security Notice -->
    <div class="bg-gradient-to-r from-purple-700 to-blue-700 rounded-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">🧪 Interactive Prompt Tester</h2>
          <p class="text-purple-100 text-sm">
            Safe sandbox environment for testing Claude Code hooks with multi-layer security validation
          </p>
        </div>
        <div class="text-right">
          <div class="text-sm text-purple-100 mb-1">Security Status</div>
          <div class="flex items-center">
            <div class="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span class="text-xs">Sandbox Active</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Scenario Selector -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Test Scenarios</h3>
        <div class="flex items-center space-x-2">
          <!-- Category Filter -->
          <select
            v-model="selectedCategory"
            class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-gray-300"
          >
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category.charAt(0).toUpperCase() + category.slice(1) }}
            </option>
          </select>
          
          <!-- Difficulty Filter -->
          <select
            v-model="selectedDifficulty"
            class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-gray-300"
          >
            <option value="">All Levels</option>
            <option v-for="difficulty in difficulties" :key="difficulty" :value="difficulty">
              {{ difficulty.charAt(0).toUpperCase() + difficulty.slice(1) }}
            </option>
          </select>
          
          <!-- Custom Code Toggle -->
          <button
            @click="showCustomEditor = !showCustomEditor"
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center transition-colors"
          >
            <span class="mr-2">{{ showCustomEditor ? '📋' : '✏️' }}</span>
            {{ showCustomEditor ? 'Use Scenario' : 'Custom Code' }}
          </button>
        </div>
      </div>
      
      <!-- Scenario Grid -->
      <div v-if="!showCustomEditor" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="scenario in filteredScenarios"
          :key="scenario.id"
          @click="selectScenario(scenario)"
          class="bg-gray-900 border border-gray-600 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-all duration-200"
          :class="{ 'border-blue-500 bg-blue-900/20': selectedScenario?.id === scenario.id }"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-white">{{ scenario.title }}</h4>
            <span 
              class="px-2 py-1 rounded text-xs font-medium"
              :class="getCategoryColor(scenario.category)"
            >
              {{ scenario.hookType }}
            </span>
          </div>
          
          <p class="text-xs text-gray-400 mb-3">{{ scenario.description }}</p>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span 
                class="px-2 py-0.5 rounded text-xs"
                :class="getDifficultyColor(scenario.difficulty)"
              >
                {{ scenario.difficulty }}
              </span>
              <span 
                class="px-2 py-0.5 rounded text-xs"
                :class="getRiskColor(scenario.riskLevel)"
              >
                {{ getRiskIcon(scenario.riskLevel) }} {{ scenario.riskLevel }}
              </span>
            </div>
            <div class="text-xs text-gray-400">
              {{ scenario.estimatedTime }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Code Editor Section -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          {{ showCustomEditor ? 'Custom Code Editor' : 'Selected Scenario Code' }}
        </h3>
        <div class="flex items-center space-x-2">
          <!-- Language Selector -->
          <select
            v-model="selectedLanguage"
            class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-gray-300"
            :disabled="!showCustomEditor && selectedScenario"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="bash">Bash</option>
            <option value="json">JSON</option>
          </select>
          
          <!-- Validation Button -->
          <button
            @click="validateCode"
            :disabled="!currentCode.trim() || isValidating"
            class="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center transition-colors"
          >
            <span class="mr-2">{{ isValidating ? '⏳' : '🛡️' }}</span>
            {{ isValidating ? 'Validating...' : 'Validate' }}
          </button>
          
          <!-- Execute Button -->
          <button
            @click="executeCode"
            :disabled="!currentCode.trim() || isExecuting || (validationResult && !validationResult.valid)"
            class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center transition-colors"
          >
            <span class="mr-2">{{ isExecuting ? '⏳' : '▶️' }}</span>
            {{ isExecuting ? 'Executing...' : 'Execute' }}
          </button>
        </div>
      </div>
      
      <!-- Monaco Editor Container -->
      <div class="border border-gray-600 rounded-lg overflow-hidden">
        <div 
          ref="editorContainer" 
          class="h-80 bg-gray-950"
        ></div>
      </div>
      
      <!-- Code Editor Footer -->
      <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
        <div class="flex items-center space-x-4">
          <span>Language: {{ selectedLanguage }}</span>
          <span>Lines: {{ currentCode.split('\\n').length }}</span>
          <span>Characters: {{ currentCode.length }}</span>
        </div>
        <div v-if="selectedScenario" class="flex items-center space-x-2">
          <span>Learning Objectives:</span>
          <div class="flex items-center space-x-1">
            <span 
              v-for="(objective, index) in selectedScenario.learningObjectives" 
              :key="index"
              class="px-2 py-1 bg-blue-900/30 text-blue-300 rounded"
              :title="objective"
            >
              {{ index + 1 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Results -->
    <Transition name="slide-down">
      <div v-if="validationResult" class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-white">Security Validation</h3>
          <span 
            class="px-3 py-1 rounded text-sm font-medium flex items-center"
            :class="validationResult.valid ? 'bg-green-900/30 text-green-400 border border-green-600' : 'bg-red-900/30 text-red-400 border border-red-600'"
          >
            {{ validationResult.valid ? '✅ Passed' : '❌ Failed' }}
          </span>
        </div>
        
        <!-- Risk Level Display -->
        <div class="mb-3">
          <div class="flex items-center">
            <span class="text-sm font-medium text-gray-300 mr-2">Risk Level:</span>
            <span 
              class="px-2 py-1 rounded text-sm font-medium flex items-center"
              :class="getRiskColor(validationResult.riskLevel)"
            >
              {{ getRiskIcon(validationResult.riskLevel) }}
              <span class="ml-1 capitalize">{{ validationResult.riskLevel }}</span>
            </span>
          </div>
        </div>
        
        <!-- Validation Issues -->
        <div v-if="validationResult.errors.length > 0 || validationResult.warnings.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Errors -->
          <div v-if="validationResult.errors.length > 0">
            <div class="text-sm font-medium text-red-400 mb-2">Security Errors</div>
            <div class="space-y-1">
              <div 
                v-for="error in validationResult.errors" 
                :key="error"
                class="text-xs text-red-300 bg-red-900/30 rounded px-2 py-1 border border-red-600"
              >
                🚨 {{ error }}
              </div>
            </div>
          </div>
          
          <!-- Warnings -->
          <div v-if="validationResult.warnings.length > 0">
            <div class="text-sm font-medium text-yellow-400 mb-2">Warnings</div>
            <div class="space-y-1">
              <div 
                v-for="warning in validationResult.warnings" 
                :key="warning"
                class="text-xs text-yellow-300 bg-yellow-900/30 rounded px-2 py-1 border border-yellow-600"
              >
                ⚠️ {{ warning }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Suggestions -->
        <div v-if="validationResult.suggestions && validationResult.suggestions.length > 0" class="mt-3">
          <div class="text-sm font-medium text-blue-400 mb-2">Suggestions</div>
          <div class="space-y-1">
            <div 
              v-for="suggestion in validationResult.suggestions" 
              :key="suggestion"
              class="text-xs text-blue-300 bg-blue-900/30 rounded px-2 py-1 border border-blue-600"
            >
              💡 {{ suggestion }}
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Execution Environment -->
    <TestEnvironment
      v-if="currentEnvironment"
      :environment-id="currentEnvironment.id"
      :status="currentEnvironment.status"
      :config="currentEnvironment.config"
      :execution-time="executionTime"
      :error="executionError"
      @terminate="handleEmergencyTerminate"
      @status-change="handleEnvironmentStatusChange"
    />

    <!-- Execution Results -->
    <ResultViewer
      v-if="executionResult"
      :result="executionResult"
    />

    <!-- Learning Objectives Panel -->
    <div v-if="selectedScenario && !showCustomEditor" class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-white mb-3">Learning Objectives</h3>
      <div class="space-y-2">
        <div 
          v-for="(objective, index) in selectedScenario.learningObjectives" 
          :key="index"
          class="flex items-start text-sm text-gray-300"
        >
          <span class="text-blue-400 mr-2 flex-shrink-0">{{ index + 1 }}.</span>
          <span>{{ objective }}</span>
        </div>
      </div>
      
      <!-- Scenario Tags -->
      <div class="mt-4">
        <div class="text-sm font-medium text-gray-300 mb-2">Tags</div>
        <div class="flex flex-wrap gap-2">
          <span 
            v-for="tag in selectedScenario.tags" 
            :key="tag"
            class="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { testScenarios, scenarioCategories, scenarioDifficulties } from '../data/testScenarios';
import { hookTestRunner } from '../services/hookTestRunner';
import { codeValidator } from '../utils/codeValidator';
import TestEnvironment from './TestEnvironment.vue';
import ResultViewer from './ResultViewer.vue';
import type { TestScenario } from '../data/testScenarios';
import type { ExecutionResult, SandboxEnvironment } from '../services/hookTestRunner';
import type { ValidationResult } from '../utils/codeValidator';

// Component state
const selectedCategory = ref('');
const selectedDifficulty = ref('');
const selectedLanguage = ref<'python' | 'javascript' | 'bash' | 'json'>('python');
const showCustomEditor = ref(false);
const selectedScenario = ref<TestScenario | null>(null);
const currentCode = ref('');
const isValidating = ref(false);
const isExecuting = ref(false);
const validationResult = ref<ValidationResult | null>(null);
const executionResult = ref<ExecutionResult | null>(null);
const currentEnvironment = ref<SandboxEnvironment | null>(null);
const executionTime = ref(0);
const executionError = ref('');

// Editor references
const editorContainer = ref<HTMLElement>();
let monacoEditor: any = null;

// Computed properties
const categories = computed(() => scenarioCategories);
const difficulties = computed(() => scenarioDifficulties);

const filteredScenarios = computed(() => {
  return testScenarios.filter(scenario => {
    const categoryMatch = !selectedCategory.value || scenario.category === selectedCategory.value;
    const difficultyMatch = !selectedDifficulty.value || scenario.difficulty === selectedDifficulty.value;
    return categoryMatch && difficultyMatch;
  });
});

// Style methods
const getCategoryColor = (category: string) => {
  const colors = {
    essential: 'bg-green-900/30 text-green-400 border border-green-600',
    security: 'bg-red-900/30 text-red-400 border border-red-600',
    monitoring: 'bg-blue-900/30 text-blue-400 border border-blue-600',
    advanced: 'bg-purple-900/30 text-purple-400 border border-purple-600'
  };
  return colors[category as keyof typeof colors] || 'bg-gray-600 text-gray-300';
};

const getDifficultyColor = (difficulty: string) => {
  const colors = {
    beginner: 'bg-green-900/30 text-green-400',
    intermediate: 'bg-yellow-900/30 text-yellow-400',
    advanced: 'bg-red-900/30 text-red-400'
  };
  return colors[difficulty as keyof typeof colors] || 'bg-gray-600 text-gray-300';
};

const getRiskColor = (riskLevel: string) => {
  const colors = {
    safe: 'bg-green-900/30 text-green-400',
    low: 'bg-yellow-900/30 text-yellow-400',
    medium: 'bg-orange-900/30 text-orange-400',
    high: 'bg-red-900/30 text-red-400',
    critical: 'bg-red-900/50 text-red-300 border border-red-600'
  };
  return colors[riskLevel as keyof typeof colors] || 'bg-gray-600 text-gray-300';
};

const getRiskIcon = (riskLevel: string) => {
  const icons = {
    safe: '✅',
    low: '⚠️',
    medium: '🟡',
    high: '🔴',
    critical: '🚨'
  };
  return icons[riskLevel as keyof typeof icons] || '❓';
};

// Event handlers
const selectScenario = (scenario: TestScenario) => {
  selectedScenario.value = scenario;
  selectedLanguage.value = scenario.language;
  currentCode.value = scenario.code;
  
  // Update Monaco editor
  if (monacoEditor) {
    monacoEditor.setValue(scenario.code);
    monacoEditor.setModelLanguage(monacoEditor.getModel(), scenario.language);
  }
  
  // Clear previous results
  validationResult.value = null;
  executionResult.value = null;
};

const validateCode = async () => {
  if (!currentCode.value.trim()) return;
  
  isValidating.value = true;
  try {
    const result = await codeValidator.validate(currentCode.value, selectedLanguage.value);
    validationResult.value = result;
  } catch (error) {
    console.error('Validation error:', error);
    validationResult.value = {
      valid: false,
      errors: [`Validation failed: ${error}`],
      warnings: [],
      riskLevel: 'critical'
    };
  } finally {
    isValidating.value = false;
  }
};

const executeCode = async () => {
  if (!currentCode.value.trim()) return;
  
  // Validate code first if not already validated
  if (!validationResult.value) {
    await validateCode();
  }
  
  // Block execution if validation failed in strict mode
  if (validationResult.value && !validationResult.value.valid) {
    alert('Code validation failed. Please fix security issues before executing.');
    return;
  }
  
  isExecuting.value = true;
  executionTime.value = 0;
  executionError.value = '';
  executionResult.value = null;
  
  // Create mock environment for UI
  currentEnvironment.value = {
    id: `env_${Date.now()}`,
    status: 'running',
    createdAt: Date.now(),
    config: {
      timeout: 10000,
      maxMemory: 50 * 1024 * 1024,
      maxOutputSize: 10 * 1024,
      enableNetworkAccess: false,
      enableFileSystemAccess: false,
      strictMode: true
    }
  };
  
  const startTime = Date.now();
  const timeInterval = setInterval(() => {
    executionTime.value = Date.now() - startTime;
  }, 100);
  
  try {
    let result: ExecutionResult;
    
    if (selectedScenario.value && !showCustomEditor.value) {
      // Execute test scenario
      result = await hookTestRunner.executeTestScenario(selectedScenario.value);
    } else {
      // Execute custom code
      result = await hookTestRunner.executeHook(currentCode.value, selectedLanguage.value);
    }
    
    executionResult.value = result;
    currentEnvironment.value.status = result.success ? 'completed' : 'failed';
    
    if (!result.success && result.error) {
      executionError.value = result.error;
    }
    
  } catch (error) {
    console.error('Execution error:', error);
    executionError.value = String(error);
    currentEnvironment.value.status = 'failed';
    
    executionResult.value = {
      success: false,
      output: '',
      error: String(error),
      executionTime: Date.now() - startTime,
      exitCode: 1,
      warnings: ['Execution failed'],
      validationResult: validationResult.value || {
        valid: false,
        errors: ['Unknown validation state'],
        warnings: [],
        riskLevel: 'critical'
      },
      sanitizedOutput: ''
    };
  } finally {
    clearInterval(timeInterval);
    isExecuting.value = false;
  }
};

const handleEmergencyTerminate = (environmentId: string) => {
  console.log('Emergency terminate requested for:', environmentId);
  
  if (currentEnvironment.value && currentEnvironment.value.id === environmentId) {
    currentEnvironment.value.status = 'terminated';
    isExecuting.value = false;
    executionError.value = 'Execution terminated by user';
    
    // Call emergency shutdown
    hookTestRunner.emergencyShutdown();
  }
};

const handleEnvironmentStatusChange = (environmentId: string, status: string) => {
  if (currentEnvironment.value && currentEnvironment.value.id === environmentId) {
    currentEnvironment.value.status = status as any;
  }
};

// Monaco Editor setup
const initializeMonacoEditor = async () => {
  if (!editorContainer.value) return;
  
  try {
    // For now, use a simple textarea as Monaco Editor requires additional setup
    const textarea = document.createElement('textarea');
    textarea.className = 'w-full h-full bg-gray-950 text-green-300 p-4 font-mono text-sm border-none outline-none resize-none';
    textarea.placeholder = showCustomEditor.value 
      ? 'Enter your custom hook code here...' 
      : 'Select a test scenario to see the code';
    textarea.value = currentCode.value;
    
    textarea.addEventListener('input', (e) => {
      currentCode.value = (e.target as HTMLTextAreaElement).value;
      // Clear validation when code changes
      validationResult.value = null;
    });
    
    editorContainer.value.innerHTML = '';
    editorContainer.value.appendChild(textarea);
    
    monacoEditor = {
      setValue: (value: string) => {
        textarea.value = value;
        currentCode.value = value;
      },
      setModelLanguage: () => {
        // Mock implementation
      },
      getModel: () => ({})
    };
    
  } catch (error) {
    console.error('Failed to initialize editor:', error);
  }
};

// Watchers
watch(showCustomEditor, (newValue) => {
  if (newValue) {
    selectedScenario.value = null;
    currentCode.value = '';
    validationResult.value = null;
    executionResult.value = null;
  }
  initializeMonacoEditor();
});

watch(selectedLanguage, () => {
  if (monacoEditor && showCustomEditor.value) {
    monacoEditor.setModelLanguage(monacoEditor.getModel(), selectedLanguage.value);
  }
});

// Lifecycle
onMounted(() => {
  initializeMonacoEditor();
  
  // Select first scenario by default
  if (filteredScenarios.value.length > 0) {
    selectScenario(filteredScenarios.value[0]);
  }
});

onBeforeUnmount(() => {
  // Emergency cleanup
  hookTestRunner.emergencyShutdown();
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 400px;
}

/* Ensure consistent styling */
textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* Custom scrollbar for better UX */
textarea::-webkit-scrollbar {
  width: 8px;
}

textarea::-webkit-scrollbar-track {
  background: #374151;
}

textarea::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>