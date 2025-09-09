<template>
  <div class="secure-code-editor bg-gray-900 border border-gray-700 rounded-lg overflow-hidden" role="region" aria-labelledby="code-editor-heading">
    <!-- Screen reader heading -->
    <h3 id="code-editor-heading" class="sr-only">Secure Code Editor</h3>
    
    <!-- Editor Header -->
    <header class="bg-gray-800 px-3 md:px-4 py-3 border-b border-gray-700">
      <!-- Mobile: Stack vertically, Desktop: Side by side -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <!-- Left section -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div class="flex items-center">
            <label for="language-select" class="text-xs md:text-sm font-medium text-gray-300 mr-2">
              Language:
            </label>
            <select 
              id="language-select"
              v-model="selectedLanguage" 
              @change="handleLanguageChange"
              class="bg-gray-700 text-white text-xs md:text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target"
              :aria-describedby="engineStatus[selectedLanguage] ? 'engine-ready' : 'engine-loading'"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </select>
          </div>

          <!-- Engine Status -->
          <div class="flex items-center text-xs" role="status">
            <span class="text-gray-400 mr-2 hidden sm:inline">Engine:</span>
            <div class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full mr-1"
                :class="engineStatus[selectedLanguage] ? 'bg-green-400' : 'bg-red-400'"
                :aria-hidden="true"
              ></div>
              <span 
                :class="engineStatus[selectedLanguage] ? 'text-green-400' : 'text-red-400'"
                :id="engineStatus[selectedLanguage] ? 'engine-ready' : 'engine-loading'"
              >
                {{ engineStatus[selectedLanguage] ? 'Ready' : 'Loading...' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right section -->
        <div class="flex items-center justify-between md:justify-end gap-2">
          <!-- Resource Usage -->
          <div v-if="isExecuting || lastExecution" class="text-xs text-gray-400 flex items-center gap-2 md:gap-3 flex-wrap" role="group" aria-label="Resource usage">
            <div v-if="resourceUsage.memoryMB > 0" class="flex items-center" :aria-label="`Memory usage: ${resourceUsage.memoryMB.toFixed(1)} megabytes`">
              <span class="mr-1" aria-hidden="true">💾</span>
              <span>{{ resourceUsage.memoryMB.toFixed(1) }}MB</span>
            </div>
            <div v-if="resourceUsage.executionTimeMs > 0" class="flex items-center" :aria-label="`Execution time: ${resourceUsage.executionTimeMs} milliseconds`">
              <span class="mr-1" aria-hidden="true">⏱️</span>
              <span>{{ resourceUsage.executionTimeMs }}ms</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Execute Button -->
            <button
              @click="executeCode"
              :disabled="!engineStatus[selectedLanguage] || isExecuting || !code.trim()"
              class="bg-green-600 hover:bg-green-700 focus:bg-green-700 disabled:bg-gray-600 text-white px-3 md:px-4 py-2 rounded text-xs md:text-sm flex items-center transition-colors touch-target focus-ring"
              type="button"
              :aria-describedby="(!engineStatus[selectedLanguage] || !code.trim()) ? 'execute-disabled-reason' : undefined"
            >
              <span v-if="isExecuting" class="animate-spin mr-1 md:mr-2" aria-hidden="true">⚙️</span>
              <span v-else class="mr-1 md:mr-2" aria-hidden="true">▶️</span>
              <span class="hidden sm:inline">{{ isExecuting ? 'Executing...' : 'Run Code' }}</span>
              <span class="sm:hidden">{{ isExecuting ? 'Run...' : 'Run' }}</span>
            </button>
            
            <div v-if="!engineStatus[selectedLanguage] || !code.trim()" id="execute-disabled-reason" class="sr-only">
              {{ !engineStatus[selectedLanguage] ? 'Engine is loading. Please wait.' : 'No code to execute. Please enter some code first.' }}
            </div>

            <!-- Security Info -->
            <button
              @click="showSecurityInfo = !showSecurityInfo"
              class="text-gray-400 hover:text-white focus:text-white p-2 rounded touch-target focus-ring"
              type="button"
              :aria-expanded="showSecurityInfo"
              aria-controls="security-info-panel"
              aria-label="Toggle security information"
              title="Security Information"
            >
              <span aria-hidden="true">🛡️</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Security Info Panel -->
    <section 
      v-if="showSecurityInfo" 
      id="security-info-panel"
      class="bg-blue-900/20 border-b border-blue-700/50 p-3 text-sm"
      role="region"
      aria-labelledby="security-info-heading"
    >
      <div class="flex items-start">
        <div class="text-blue-400 mr-2 mt-0.5" aria-hidden="true">🛡️</div>
        <div>
          <h4 id="security-info-heading" class="font-medium text-blue-300 mb-1">Secure Execution Environment</h4>
          <ul class="text-blue-200 space-y-1 text-xs">
            <li>• Memory limit: {{ resourceLimits.maxMemoryMB }}MB</li>
            <li>• Execution timeout: {{ resourceLimits.maxExecutionTimeMs / 1000 }}s</li>
            <li>• Network access: Blocked</li>
            <li>• File system: Read-only sandbox</li>
            <li>• DOM access: Restricted</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Input Panel (if needed) -->
    <section 
      v-if="showInputs" 
      class="bg-gray-850 border-b border-gray-700 p-3"
      role="region"
      aria-labelledby="input-panel-heading"
    >
      <div class="flex items-center justify-between mb-2">
        <label id="input-panel-heading" for="program-inputs" class="text-sm font-medium text-gray-300">
          Program Inputs (one per line):
        </label>
        <button 
          @click="showInputs = false"
          class="text-gray-400 hover:text-white focus:text-white text-xs focus-ring rounded px-1"
          type="button"
          aria-label="Hide input panel"
        >
          Hide
        </button>
      </div>
      <textarea
        id="program-inputs"
        v-model="inputText"
        placeholder="Enter inputs for your program..."
        class="w-full bg-gray-900 text-gray-100 text-sm border border-gray-600 rounded px-3 py-2 h-20 resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        :aria-describedby="inputText ? undefined : 'input-help'"
      ></textarea>
      <div v-if="!inputText" id="input-help" class="sr-only">
        Enter each program input on a separate line. This will be passed to your program during execution.
      </div>
    </section>

    <!-- Code Editor -->
    <div class="relative" role="region" aria-labelledby="monaco-editor-label">
      <label id="monaco-editor-label" class="sr-only">
        {{ selectedLanguage }} Code Editor. Press Tab to navigate out of the editor.
      </label>
      
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
        class="absolute top-2 right-2 bg-gray-700/80 hover:bg-gray-600 focus:bg-gray-600 text-white text-xs px-2 py-1 rounded backdrop-blur-sm touch-target focus-ring"
        type="button"
        aria-label="Add program inputs"
        title="Add program inputs"
      >
        <span class="hidden sm:inline">📝 Add Inputs</span>
        <span class="sm:hidden" aria-hidden="true">📝</span>
      </button>
    </div>

    <!-- Execution Output -->
    <section 
      v-if="lastExecution || isExecuting" 
      class="border-t border-gray-700"
      role="region"
      aria-labelledby="output-heading"
      aria-live="polite"
    >
      <!-- Output Header -->
      <header class="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div class="flex items-center">
          <h4 id="output-heading" class="text-sm font-medium text-gray-300 mr-3">Output</h4>
          <div v-if="lastExecution && !isExecuting" class="flex items-center text-xs space-x-3" role="group" aria-label="Execution status">
            <span :class="lastExecution.success ? 'text-green-400' : 'text-red-400'">
              {{ lastExecution.success ? '✅ Success' : '❌ Error' }}
            </span>
            <span class="text-gray-400" :aria-label="`Execution time: ${lastExecution.metrics.executionTimeMs} milliseconds`">
              {{ lastExecution.metrics.executionTimeMs }}ms
            </span>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- Resource Alerts -->
          <div v-if="resourceAlerts.length > 0" class="flex items-center text-xs">
            <button
              @click="showAlerts = !showAlerts"
              class="text-yellow-400 hover:text-yellow-300 focus:text-yellow-300 flex items-center focus-ring rounded px-1"
              type="button"
              :aria-expanded="showAlerts"
              aria-controls="resource-alerts"
              :aria-label="`${resourceAlerts.length} resource alerts. Click to ${showAlerts ? 'hide' : 'show'} details.`"
              :title="`${resourceAlerts.length} resource alerts`"
            >
              <span aria-hidden="true">⚠️</span>
              <span class="ml-1">{{ resourceAlerts.length }}</span>
            </button>
          </div>
          
          <!-- Clear Output -->
          <button
            @click="clearOutput"
            class="text-gray-400 hover:text-white focus:text-white text-xs px-2 py-1 rounded focus-ring"
            type="button"
            aria-label="Clear output and execution history"
          >
            Clear
          </button>
        </div>
      </header>

      <!-- Resource Alerts -->
      <div 
        v-if="showAlerts && resourceAlerts.length > 0" 
        id="resource-alerts"
        class="bg-yellow-900/20 border-b border-yellow-700/50 p-3"
        role="region"
        aria-labelledby="alerts-heading"
      >
        <h5 id="alerts-heading" class="sr-only">Resource Alerts</h5>
        <ul class="space-y-2" role="list">
          <li 
            v-for="alert in resourceAlerts" 
            :key="alert.timestamp"
            class="text-xs flex items-start"
            :class="{
              'text-yellow-300': alert.severity === 'warning',
              'text-red-300': alert.severity === 'error',
              'text-red-400': alert.severity === 'critical'
            }"
            role="listitem"
          >
            <span class="mr-2 mt-0.5" aria-hidden="true">
              {{ alert.severity === 'critical' ? '🔥' : alert.severity === 'error' ? '⚠️' : 'ℹ️' }}
            </span>
            <span>{{ alert.message }}</span>
          </li>
        </ul>
      </div>

      <!-- Output Content -->
      <div class="bg-gray-950 p-4 max-h-64 overflow-y-auto" role="log" aria-labelledby="execution-log-heading">
        <h5 id="execution-log-heading" class="sr-only">Code Execution Log</h5>
        
        <!-- Loading State -->
        <div v-if="isExecuting" class="flex items-center text-gray-400" role="status" aria-live="polite">
          <div class="animate-spin mr-2" aria-hidden="true">⚙️</div>
          <span>Executing code...</span>
        </div>

        <!-- Execution Results -->
        <div v-else-if="lastExecution">
          <!-- Success Output -->
          <div v-if="lastExecution.success && lastExecution.output" class="space-y-2">
            <pre class="text-green-300 text-sm font-mono whitespace-pre-wrap" role="img" :aria-label="`Program output: ${lastExecution.output}`">{{ lastExecution.output }}</pre>
            
            <!-- Python Globals (for educational purposes) -->
            <div v-if="selectedLanguage === 'python' && pythonGlobals && Object.keys(pythonGlobals).length > 0" 
                 class="mt-4 pt-3 border-t border-gray-700">
              <h6 class="text-xs text-gray-400 mb-2">Variables:</h6>
              <ul class="space-y-1" role="list">
                <li 
                  v-for="(value, name) in pythonGlobals" 
                  :key="name"
                  class="text-xs text-blue-300 font-mono"
                  role="listitem"
                  :aria-label="`Variable ${name} equals ${formatValue(value)}`"
                >
                  <span class="text-blue-400">{{ name }}</span> = {{ formatValue(value) }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Error Output -->
          <div v-else-if="lastExecution.error" class="text-red-300 text-sm" role="alert">
            <h6 class="sr-only">Execution Error</h6>
            <div class="font-mono">{{ lastExecution.error }}</div>
          </div>

          <!-- Empty Output -->
          <div v-else class="text-gray-500 text-sm italic" role="status">
            Code executed successfully (no output)
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
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

// Accessibility state
const announcements = ref<string[]>([]);

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
  },
  // Enhanced accessibility
  accessibilitySupport: 'on' as const,
  accessibilityPageSize: 10,
  ariaLabel: `${props.language} Code Editor`,
  cursorBlinking: 'blink' as const,
  cursorStyle: 'line' as const,
  renderFinalNewline: true,
  renderWhitespace: 'boundary' as const,
  wordBasedSuggestions: true,
  wordWrapColumn: 80,
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: 'on' as const,
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  tabCompletion: 'on' as const,
  snippetSuggestions: 'top' as const,
  hover: { enabled: true, delay: 300, sticky: true },
  parameterHints: { enabled: true, cycle: true },
  contextmenu: true
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
    },
    // Enhanced accessibility for mobile
    accessibilityPageSize: isMobile ? 5 : 10,
    hover: { enabled: !isMobile, delay: isMobile ? 500 : 300 },
    quickSuggestions: !isMobile,
    parameterHints: { enabled: !isMobile }
  };
});

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

// Methods
const handleEditorMounted = () => {
  console.log('Monaco Editor mounted');
  announceToScreenReader('Code editor loaded and ready');
};

const handleLanguageChange = () => {
  // Clear previous execution results when language changes
  lastExecution.value = null;
  pythonGlobals.value = {};
  resourceAlerts.value = [];
  
  announceToScreenReader(`Language changed to ${selectedLanguage.value}. Previous execution results cleared.`);
};

const executeCode = async () => {
  if (!engineStatus.value[selectedLanguage.value] || isExecuting.value || !code.value.trim()) {
    if (!code.value.trim()) {
      announceToScreenReader('No code to execute. Please enter some code first.', 'assertive');
    }
    return;
  }

  isExecuting.value = true;
  resourceUsage.value = { memoryMB: 0, cpuPercent: 0, executionTimeMs: 0, networkRequests: 0, domModifications: 0 };
  resourceAlerts.value = [];
  pythonGlobals.value = {};
  
  announceToScreenReader('Starting code execution');

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
    
    // Announce execution result
    const successMessage = result.success 
      ? `Code executed successfully in ${result.metrics.executionTimeMs}ms. ${result.output ? 'Output available.' : 'No output produced.'}`
      : `Code execution failed: ${result.error}`;
    
    announceToScreenReader(successMessage, result.success ? 'polite' : 'assertive');

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
    
    announceToScreenReader(`Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'assertive');

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
  
  announceToScreenReader('Output and execution history cleared');
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
    const previousStatus = { ...engineStatus.value };
    engineStatus.value = { ...status };
    
    // Announce engine status changes
    Object.entries(status).forEach(([language, ready]) => {
      if (previousStatus[language] !== ready) {
        if (ready) {
          announceToScreenReader(`${language} engine is now ready`);
        }
      }
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

// Keyboard navigation for accessibility
const handleKeyDown = (event: KeyboardEvent) => {
  // Handle Ctrl+Enter for code execution
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    executeCode();
  }
  
  // Handle Escape to close panels
  if (event.key === 'Escape') {
    if (showSecurityInfo.value) {
      showSecurityInfo.value = false;
      announceToScreenReader('Security information panel closed');
    } else if (showInputs.value) {
      showInputs.value = false;
      announceToScreenReader('Input panel closed');
    } else if (showAlerts.value) {
      showAlerts.value = false;
      announceToScreenReader('Resource alerts panel closed');
    }
  }
};

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
  
  // Add keyboard listeners
  document.addEventListener('keydown', handleKeyDown);
  
  // Announce initial state
  const engineMsg = engineStatus.value[selectedLanguage.value] 
    ? `${selectedLanguage.value} engine ready` 
    : `${selectedLanguage.value} engine loading`;
  
  announceToScreenReader(`Code editor initialized. ${engineMsg}. Press Ctrl+Enter to execute code.`);
});

onBeforeUnmount(() => {
  resourceMonitor.stopMonitoring();
  document.removeEventListener('keydown', handleKeyDown);
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

/* Focus ring for accessibility */
.focus-ring:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900;
}

.focus-ring:focus-visible {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900;
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
  
  .touch-target,
  .focus-ring {
    @apply border border-gray-500;
  }
  
  .focus-ring:focus {
    outline: 3px solid white;
    outline-offset: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
  
  .alert-enter-active,
  .transition-colors {
    transition: none;
  }
  
  /* Still show focus for accessibility */
  .focus-ring:focus,
  .focus-ring:focus-visible {
    @apply ring-2 ring-blue-500;
  }
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

/* Color contrast improvements */
.text-gray-300 {
  color: #d1d5db; /* Improved contrast ratio */
}

.text-gray-400 {
  color: #9ca3af; /* Meets WCAG AA standards */
}

.text-blue-200 {
  color: #bfdbfe; /* Improved contrast */
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
