<template>
  <div class="secure-code-editor bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
    <!-- Editor Header -->
    <div class="bg-gray-800 px-3 md:px-4 py-3 border-b border-gray-700">
      <!-- Mobile: Stack vertically, Desktop: Side by side -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <!-- Left section -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div class="flex items-center">
            <label class="text-xs md:text-sm font-medium text-gray-300 mr-2">Language:</label>
            <select 
              v-model="selectedLanguage" 
              @change="handleLanguageChange"
              class="bg-gray-700 text-white text-xs md:text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none touch-target"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </select>
          </div>

          <!-- Engine Status -->
          <div class="flex items-center text-xs">
            <span class="text-gray-400 mr-2 hidden sm:inline">Engine:</span>
            <div class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full mr-1"
                :class="engineStatus[selectedLanguage] ? 'bg-green-400' : 'bg-red-400'"
              ></div>
              <span :class="engineStatus[selectedLanguage] ? 'text-green-400' : 'text-red-400'">
                {{ engineStatus[selectedLanguage] ? 'Ready' : 'Loading...' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right section -->
        <div class="flex items-center justify-between md:justify-end gap-2">
          <!-- Resource Usage -->
          <div v-if="isExecuting || lastExecution" class="text-xs text-gray-400 flex items-center gap-2 md:gap-3 flex-wrap">
            <div v-if="resourceUsage.memoryMB > 0" class="flex items-center">
              <span class="mr-1">💾</span>
              <span>{{ resourceUsage.memoryMB.toFixed(1) }}MB</span>
            </div>
            <div v-if="resourceUsage.executionTimeMs > 0" class="flex items-center">
              <span class="mr-1">⏱️</span>
              <span>{{ resourceUsage.executionTimeMs }}ms</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Execute Button -->
            <button
              @click="executeCode"
              :disabled="!engineStatus[selectedLanguage] || isExecuting || !code.trim()"
              class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 md:px-4 py-2 rounded text-xs md:text-sm flex items-center transition-colors touch-target"
            >
              <span v-if="isExecuting" class="animate-spin mr-1 md:mr-2">⚙️</span>
              <span v-else class="mr-1 md:mr-2">▶️</span>
              <span class="hidden sm:inline">{{ isExecuting ? 'Executing...' : 'Run Code' }}</span>
              <span class="sm:hidden">{{ isExecuting ? 'Run...' : 'Run' }}</span>
            </button>

            <!-- Security Info -->
            <button
              @click="showSecurityInfo = !showSecurityInfo"
              class="text-gray-400 hover:text-white p-2 rounded touch-target"
              title="Security Information"
            >
              🛡️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Security Info Panel -->
    <div v-if="showSecurityInfo" class="bg-blue-900/20 border-b border-blue-700/50 p-3 text-sm">
      <div class="flex items-start">
        <div class="text-blue-400 mr-2 mt-0.5">🛡️</div>
        <div>
          <div class="font-medium text-blue-300 mb-1">Secure Execution Environment</div>
          <ul class="text-blue-200 space-y-1 text-xs">
            <li>• Memory limit: {{ resourceLimits.maxMemoryMB }}MB</li>
            <li>• Execution timeout: {{ resourceLimits.maxExecutionTimeMs / 1000 }}s</li>
            <li>• Network access: Blocked</li>
            <li>• File system: Read-only sandbox</li>
            <li>• DOM access: Restricted</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Input Panel (if needed) -->
    <div v-if="showInputs" class="bg-gray-850 border-b border-gray-700 p-3">
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium text-gray-300">Program Inputs (one per line):</label>
        <button 
          @click="showInputs = false"
          class="text-gray-400 hover:text-white text-xs"
        >
          Hide
        </button>
      </div>
      <textarea
        v-model="inputText"
        placeholder="Enter inputs for your program..."
        class="w-full bg-gray-900 text-gray-100 text-sm border border-gray-600 rounded px-3 py-2 h-20 resize-none focus:border-blue-500 focus:outline-none"
      ></textarea>
    </div>

    <!-- Code Editor -->
    <div class="relative">
      <MonacoEditor
        v-model="code"
        :language="monacoLanguage"
        :theme="editorTheme"
        :options="responsiveEditorOptions"
        :class="['h-64 sm:h-80 md:h-96']"
        @editor-mounted="handleEditorMounted"
      />
      
      <!-- Add Inputs Button -->
      <button
        v-if="!showInputs"
        @click="showInputs = true"
        class="absolute top-2 right-2 bg-gray-700/80 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded backdrop-blur-sm touch-target"
        title="Add program inputs"
      >
        <span class="hidden sm:inline">📝 Add Inputs</span>
        <span class="sm:hidden">📝</span>
      </button>
    </div>

    <!-- Execution Output -->
    <div v-if="lastExecution || isExecuting" class="border-t border-gray-700">
      <!-- Output Header -->
      <div class="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-sm font-medium text-gray-300 mr-3">Output</span>
          <div v-if="lastExecution && !isExecuting" class="flex items-center text-xs space-x-3">
            <span :class="lastExecution.success ? 'text-green-400' : 'text-red-400'">
              {{ lastExecution.success ? '✅ Success' : '❌ Error' }}
            </span>
            <span class="text-gray-400">
              {{ lastExecution.metrics.executionTimeMs }}ms
            </span>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- Resource Alerts -->
          <div v-if="resourceAlerts.length > 0" class="flex items-center text-xs">
            <button
              @click="showAlerts = !showAlerts"
              class="text-yellow-400 hover:text-yellow-300 flex items-center"
              :title="`${resourceAlerts.length} resource alerts`"
            >
              ⚠️ {{ resourceAlerts.length }}
            </button>
          </div>
          
          <!-- Clear Output -->
          <button
            @click="clearOutput"
            class="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Resource Alerts -->
      <div v-if="showAlerts && resourceAlerts.length > 0" class="bg-yellow-900/20 border-b border-yellow-700/50 p-3">
        <div class="space-y-2">
          <div 
            v-for="alert in resourceAlerts" 
            :key="alert.timestamp"
            class="text-xs flex items-start"
            :class="{
              'text-yellow-300': alert.severity === 'warning',
              'text-red-300': alert.severity === 'error',
              'text-red-400': alert.severity === 'critical'
            }"
          >
            <span class="mr-2 mt-0.5">
              {{ alert.severity === 'critical' ? '🔥' : alert.severity === 'error' ? '⚠️' : 'ℹ️' }}
            </span>
            <span>{{ alert.message }}</span>
          </div>
        </div>
      </div>

      <!-- Output Content -->
      <div class="bg-gray-950 p-4 max-h-64 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isExecuting" class="flex items-center text-gray-400">
          <div class="animate-spin mr-2">⚙️</div>
          <span>Executing code...</span>
        </div>

        <!-- Execution Results -->
        <div v-else-if="lastExecution">
          <!-- Success Output -->
          <div v-if="lastExecution.success && lastExecution.output" class="space-y-2">
            <pre class="text-green-300 text-sm font-mono whitespace-pre-wrap">{{ lastExecution.output }}</pre>
            
            <!-- Python Globals (for educational purposes) -->
            <div v-if="selectedLanguage === 'python' && pythonGlobals && Object.keys(pythonGlobals).length > 0" 
                 class="mt-4 pt-3 border-t border-gray-700">
              <div class="text-xs text-gray-400 mb-2">Variables:</div>
              <div class="space-y-1">
                <div 
                  v-for="(value, name) in pythonGlobals" 
                  :key="name"
                  class="text-xs text-blue-300 font-mono"
                >
                  <span class="text-blue-400">{{ name }}</span> = {{ formatValue(value) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Error Output -->
          <div v-else-if="lastExecution.error" class="text-red-300 text-sm">
            <div class="font-mono">{{ lastExecution.error }}</div>
          </div>

          <!-- Empty Output -->
          <div v-else class="text-gray-500 text-sm italic">
            Code executed successfully (no output)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { VueMonacoEditor as MonacoEditor } from '@guolao/vue-monaco-editor';
import { wasiRuntimeManager, type CodeExecutionRequest, type ExecutionResult } from '../services/wasiRuntimeManager';
import { resourceMonitor, type ResourceUsage, type ResourceAlert } from '../services/resourceMonitor';

// Props
interface Props {
  initialCode?: string;
  language?: 'python' | 'javascript' | 'typescript';
  readonly?: boolean;
  showOutput?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialCode: '',
  language: 'python',
  readonly: false,
  showOutput: true
});

// Emits
const emit = defineEmits<{
  codeChange: [code: string];
  codeExecuted: [result: ExecutionResult];
  engineReady: [language: string, ready: boolean];
}>();

// State
const code = ref(props.initialCode);
const selectedLanguage = ref(props.language);
const isExecuting = ref(false);
const lastExecution = ref<ExecutionResult | null>(null);
const engineStatus = ref<Record<string, boolean>>({});
const resourceUsage = ref<ResourceUsage>({ memoryMB: 0, cpuPercent: 0, executionTimeMs: 0, networkRequests: 0, domModifications: 0 });
const resourceAlerts = ref<ResourceAlert[]>([]);
const showSecurityInfo = ref(false);
const showInputs = ref(false);
const showAlerts = ref(false);
const inputText = ref('');
const pythonGlobals = ref<Record<string, any>>({});

// Editor configuration
const editorTheme = ref('vs-dark');
const editorOptions = ref({
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: props.readonly,
  automaticLayout: true,
  wordWrap: 'on' as const,
  wrappingStrategy: 'advanced' as const,
  tabSize: 4,
  insertSpaces: true,
  detectIndentation: true,
  folding: true,
  foldingHighlight: true,
  showFoldingControls: 'always' as const,
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true
  }
});

// Resource limits
const resourceLimits = {
  maxMemoryMB: 32,
  maxExecutionTimeMs: 10000,
  maxCpuTimeMs: 5000,
  maxOutputSize: 10 * 1024 * 1024
};

// Computed
const monacoLanguage = computed(() => {
  const langMap = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript'
  };
  return langMap[selectedLanguage.value] || 'javascript';
});

const programInputs = computed(() => {
  return inputText.value.split('\n').filter(line => line.trim() !== '');
});

// Responsive editor options
const responsiveEditorOptions = computed(() => {
  const isMobile = window.innerWidth < 768;
  return {
    ...editorOptions.value,
    fontSize: isMobile ? 12 : 14,
    lineNumbers: isMobile ? 'off' : 'on',
    minimap: { enabled: !isMobile },
    scrollBeyondLastLine: false,
    wordWrap: isMobile ? 'on' : 'off',
    renderLineHighlight: isMobile ? 'none' : 'line',
    occurrencesHighlight: !isMobile,
    selectionHighlight: !isMobile,
    codeLens: !isMobile,
    folding: !isMobile,
    showFoldingControls: isMobile ? 'never' : 'always',
    glyphMargin: !isMobile,
    lineDecorationsWidth: isMobile ? 10 : 20,
    lineNumbersMinChars: isMobile ? 2 : 3,
    scrollbar: {
      vertical: isMobile ? 'hidden' : 'visible',
      horizontal: isMobile ? 'hidden' : 'visible',
      verticalScrollbarSize: isMobile ? 8 : 14,
      horizontalScrollbarSize: isMobile ? 8 : 14
    }
  };
});

// Methods
const handleEditorMounted = () => {
  // Editor is ready
  console.log('Monaco Editor mounted');
};

const handleLanguageChange = () => {
  // Clear previous execution results when language changes
  lastExecution.value = null;
  pythonGlobals.value = {};
  resourceAlerts.value = [];
};

const executeCode = async () => {
  if (!engineStatus.value[selectedLanguage.value] || isExecuting.value || !code.value.trim()) {
    return;
  }

  isExecuting.value = true;
  resourceUsage.value = { memoryMB: 0, cpuPercent: 0, executionTimeMs: 0, networkRequests: 0, domModifications: 0 };
  resourceAlerts.value = [];
  pythonGlobals.value = {};

  try {
    // Start resource monitoring
    resourceMonitor.startMonitoring();

    // Subscribe to resource updates
    const unsubscribe = resourceMonitor.subscribe((usage) => {
      resourceUsage.value = usage;
    });

    // Execute code
    const request: CodeExecutionRequest = {
      language: selectedLanguage.value,
      code: code.value,
      inputs: programInputs.value,
      limits: resourceLimits
    };

    const result = await wasiRuntimeManager.executeCode(request);
    
    // Handle Python-specific results
    if (selectedLanguage.value === 'python' && result.success) {
      // Extract Python globals if available
      try {
        const engine = (wasiRuntimeManager as any).engines?.get('python');
        if (engine && typeof engine.extractGlobals === 'function') {
          pythonGlobals.value = engine.extractGlobals();
        }
      } catch (error) {
        console.warn('Failed to extract Python globals:', error);
      }
    }

    lastExecution.value = result;
    
    // Get resource alerts
    resourceAlerts.value = resourceMonitor.getAlerts();
    
    // Cleanup
    unsubscribe();
    resourceMonitor.stopMonitoring();

    emit('codeExecuted', result);

  } catch (error) {
    console.error('Code execution error:', error);
    
    lastExecution.value = {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown execution error',
      metrics: {
        executionTimeMs: 0,
        memoryUsedMB: 0,
        cpuTimeMs: 0,
        outputSize: 0
      }
    };

  } finally {
    isExecuting.value = false;
    resourceMonitor.stopMonitoring();
  }
};

const clearOutput = () => {
  lastExecution.value = null;
  resourceUsage.value = { memoryMB: 0, cpuPercent: 0, executionTimeMs: 0, networkRequests: 0, domModifications: 0 };
  resourceAlerts.value = [];
  pythonGlobals.value = {};
  showAlerts.value = false;
};

const formatValue = (value: any): string => {
  if (typeof value === 'string') {
    return `"${value}"`;
  } else if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  } else {
    return String(value);
  }
};

const checkEngineStatus = async () => {
  try {
    const status = wasiRuntimeManager.getEngineStatus();
    engineStatus.value = { ...status };
    
    // Emit engine ready events
    Object.entries(status).forEach(([language, ready]) => {
      emit('engineReady', language, ready);
    });
  } catch (error) {
    console.error('Failed to check engine status:', error);
  }
};

// Watchers
watch(code, (newCode) => {
  emit('codeChange', newCode);
});

// Lifecycle
onMounted(async () => {
  // Check engine status periodically until ready
  const checkStatus = async () => {
    await checkEngineStatus();
    
    // Continue checking if not all engines are ready
    if (!Object.values(engineStatus.value).every(ready => ready)) {
      setTimeout(checkStatus, 1000);
    }
  };
  
  await checkStatus();
});

onBeforeUnmount(() => {
  resourceMonitor.stopMonitoring();
});
</script>

<style scoped>
.secure-code-editor {
  min-height: 300px;
}

/* Mobile responsive adjustments */
@media (min-width: 768px) {
  .secure-code-editor {
    min-height: 400px;
  }
}

/* Touch target class */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  @apply flex items-center justify-center;
}

/* Custom scrollbar for output */
.bg-gray-950::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

@media (min-width: 768px) {
  .bg-gray-950::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
}

.bg-gray-950::-webkit-scrollbar-track {
  background: #1f2937;
}

.bg-gray-950::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

.bg-gray-950::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Animation for spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Fade in animation for alerts */
.alert-enter-active {
  transition: all 0.3s ease-out;
}

.alert-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

/* Mobile-specific optimizations */
@media (max-width: 767px) {
  .secure-code-editor {
    border-radius: 0.5rem;
    overflow: hidden;
  }
  
  .secure-code-editor :deep(.monaco-editor) {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }
  
  /* Hide complex UI elements on mobile */
  .secure-code-editor :deep(.monaco-editor .decorations-overview-ruler),
  .secure-code-editor :deep(.monaco-editor .current-line-highlight) {
    display: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .secure-code-editor {
    @apply border-2;
  }
  
  .touch-target {
    @apply border border-gray-500;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
  
  .alert-enter-active {
    transition: none;
  }
}
</style>