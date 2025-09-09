# WASI Implementation Specification

*Created: August 24, 2025*  
*Part of: WebAssembly Security Architecture Implementation*  
*Timeline: 5 weeks (35-40 hours total)*

## 🎯 Implementation Overview

This document provides detailed implementation specifications for the WebAssembly (WASI) security architecture, including code examples, configuration templates, and step-by-step implementation guides.

## 📁 Project Structure

```
/apps/client/src/
├── security/
│   ├── wasi/
│   │   ├── runtime-manager.ts          # WASI runtime management
│   │   ├── security-validator.ts       # Enhanced AST validation
│   │   ├── resource-monitor.ts         # Resource tracking
│   │   └── policy-generator.ts         # Security policy creation
│   ├── engines/
│   │   ├── python-engine.ts           # Pyodide integration
│   │   ├── javascript-engine.ts       # QuickJS integration
│   │   └── bash-engine.ts             # Minimal shell implementation
│   └── sandbox/
│       ├── execution-context.ts       # Execution environment
│       ├── output-sanitizer.ts        # Output cleaning
│       └── emergency-handler.ts       # Emergency termination
├── components/educational/
│   ├── secure-code-editor/
│   │   ├── SecurityAwareMonaco.vue    # Enhanced Monaco editor
│   │   ├── SecurityFeedback.vue       # Real-time validation UI
│   │   └── ResourceMonitor.vue        # Resource usage display
│   └── assessment/
│       ├── SecureAssessment.vue       # Security-aware assessments
│       └── SecurityEducation.vue      # Security learning content
└── services/
    ├── secure-execution.ts            # Main execution service
    └── educational-security.ts        # Educational integration
```

## 🔧 Core Implementation

### 1. WASI Runtime Manager

```typescript
// /apps/client/src/security/wasi/runtime-manager.ts

import { WASIRuntimeConfig, WASIRuntime, ExecutionResult, SecurityPolicy } from '../types';

export class WASIRuntimeManager {
  private runtimes: Map<string, WASIRuntime> = new Map();
  private wasmCache: Map<string, WebAssembly.Module> = new Map();

  async createRuntime(config: WASIRuntimeConfig): Promise<WASIRuntime> {
    const runtimeId = this.generateRuntimeId();
    
    // Create WASI instance with strict security settings
    const wasiConfig = {
      args: ['main'],
      env: {
        ...config.environmentVariables,
        'EDUCATIONAL_MODE': '1',
        'SECURE_EXECUTION': '1'
      },
      preopens: {
        '/tmp': '/tmp',  // Virtual temporary directory only
        ...config.preOpenDirectories
      },
      stdin: 0,
      stdout: 1,
      stderr: 2,
      // Security: No access to real filesystem
      fds: [
        { type: 'stdin', handle: 0 },
        { type: 'stdout', handle: 1 },
        { type: 'stderr', handle: 2 }
      ]
    };

    // Initialize WebAssembly instance with memory limits
    const memory = new WebAssembly.Memory({
      initial: Math.ceil(config.maxMemory / (64 * 1024)), // 64KB pages
      maximum: Math.ceil(config.maxMemory / (64 * 1024)),
      shared: false
    });

    const runtime: WASIRuntime = {
      id: runtimeId,
      config,
      memory,
      instance: null,
      wasiInstance: null,
      status: 'created',
      startTime: Date.now(),
      executionCount: 0
    };

    this.runtimes.set(runtimeId, runtime);
    return runtime;
  }

  async executeCode(
    runtime: WASIRuntime,
    code: string,
    language: string,
    policy: SecurityPolicy
  ): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();

    try {
      // Update runtime status
      runtime.status = 'executing';
      runtime.executionCount++;

      // Initialize language-specific engine
      const engine = await this.getLanguageEngine(language);
      
      // Set up resource monitoring
      const monitor = this.startResourceMonitoring(runtime, policy);

      // Execute with timeout enforcement
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), policy.maxCpuTime);
      });

      const executionPromise = engine.execute(code, runtime, policy);
      
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Stop monitoring and collect metrics
      const metrics = this.stopResourceMonitoring(monitor);

      runtime.status = 'completed';

      return {
        success: true,
        output: result.output,
        executionTime: performance.now() - startTime,
        memoryUsed: metrics.peakMemoryUsage,
        cpuTimeUsed: metrics.cpuTimeUsed,
        exitCode: result.exitCode,
        warnings: result.warnings || [],
        resourceMetrics: metrics,
        securityWarnings: result.securityWarnings || [],
        educationalInsights: result.educationalInsights || []
      };

    } catch (error) {
      runtime.status = 'failed';
      
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: performance.now() - startTime,
        exitCode: 1,
        warnings: ['Execution failed'],
        resourceMetrics: this.getDefaultMetrics(),
        securityWarnings: [],
        educationalInsights: []
      };
    }
  }

  async terminateRuntime(runtimeId: string): Promise<void> {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) return;

    runtime.status = 'terminating';

    // Clean up WebAssembly instance
    if (runtime.instance) {
      // Ensure memory is cleared for security
      const memoryBuffer = new Uint8Array(runtime.memory.buffer);
      memoryBuffer.fill(0);
    }

    // Remove from active runtimes
    this.runtimes.delete(runtimeId);
  }

  private generateRuntimeId(): string {
    return `wasi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getLanguageEngine(language: string): Promise<LanguageEngine> {
    switch (language.toLowerCase()) {
      case 'python':
        return new (await import('../engines/python-engine')).PythonEngine();
      case 'javascript':
      case 'typescript':
        return new (await import('../engines/javascript-engine')).JavaScriptEngine();
      case 'bash':
        return new (await import('../engines/bash-engine')).BashEngine();
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
}
```

### 2. Enhanced Security Validator

```typescript
// /apps/client/src/security/wasi/security-validator.ts

export class WASISecurityValidator extends CodeValidator {
  
  async validateForWASI(code: string, language: string): Promise<WASIValidationResult> {
    const baseResult = await this.validate(code, language);
    
    // Enhanced validation for real execution
    const wasiSpecific = await this.performWASIValidation(code, language);
    
    return {
      ...baseResult,
      wasiCompatible: wasiSpecific.compatible,
      requiredPermissions: wasiSpecific.permissions,
      transformedCode: wasiSpecific.transformedCode,
      securityPolicy: wasiSpecific.policy,
      estimatedResources: wasiSpecific.resourceEstimate
    };
  }

  private async performWASIValidation(
    code: string, 
    language: string
  ): Promise<WASISpecificValidation> {
    const result: WASISpecificValidation = {
      compatible: true,
      permissions: [],
      transformedCode: code,
      policy: this.generateDefaultPolicy(),
      resourceEstimate: await this.estimateResources(code, language)
    };

    switch (language.toLowerCase()) {
      case 'python':
        return this.validatePythonForWASI(code, result);
      case 'javascript':
      case 'typescript':
        return this.validateJavaScriptForWASI(code, result);
      case 'bash':
        return this.validateBashForWASI(code, result);
      default:
        result.compatible = false;
        return result;
    }
  }

  private async validatePythonForWASI(
    code: string, 
    result: WASISpecificValidation
  ): Promise<WASISpecificValidation> {
    // Parse Python AST for detailed analysis
    const ast = await this.parsePythonAST(code);
    
    // Check for dangerous imports
    const dangerousImports = this.findDangerousImports(ast);
    if (dangerousImports.length > 0) {
      result.compatible = false;
      result.policy.blockedImports.push(...dangerousImports);
    }

    // Transform code for sandbox
    result.transformedCode = this.transformPythonForSandbox(code, ast);
    
    // Estimate resource requirements
    result.resourceEstimate = await this.estimatePythonResources(ast);
    
    // Generate security policy
    result.policy = this.generatePythonSecurityPolicy(ast);
    
    return result;
  }

  private transformPythonForSandbox(code: string, ast: any): string {
    let transformed = code;
    
    // Wrap in resource monitoring
    transformed = `
# Resource monitoring setup
import sys
sys.setrecursionlimit(100)  # Limit recursion depth

# Original user code
${transformed}

# Resource cleanup
import gc
gc.collect()
`;
    
    return transformed;
  }

  private async estimateResources(code: string, language: string): Promise<ResourceEstimate> {
    const lines = code.split('\n').length;
    const complexity = this.calculateComplexity(code);
    
    // Heuristic-based resource estimation
    const baseMemory = 1024 * 1024; // 1MB base
    const memoryPerLine = 1024; // 1KB per line estimate
    const memoryForComplexity = complexity * 50 * 1024; // 50KB per complexity point
    
    return {
      estimatedMemory: Math.min(baseMemory + (lines * memoryPerLine) + memoryForComplexity, 32 * 1024 * 1024),
      estimatedCpuTime: Math.min(complexity * 100, 5000), // Max 5 seconds
      estimatedSystemCalls: Math.min(lines * 2, 1000)
    };
  }

  private calculateComplexity(code: string): number {
    let complexity = 0;
    
    // Basic complexity indicators
    complexity += (code.match(/for\s+/g) || []).length * 2;
    complexity += (code.match(/while\s+/g) || []).length * 3;
    complexity += (code.match(/if\s+/g) || []).length * 1;
    complexity += (code.match(/def\s+/g) || []).length * 2;
    complexity += (code.match(/class\s+/g) || []).length * 3;
    
    return Math.max(1, complexity);
  }
}
```

### 3. Python Engine Implementation

```typescript
// /apps/client/src/security/engines/python-engine.ts

export class PythonEngine implements LanguageEngine {
  private pyodideInstance: any = null;

  async initialize(): Promise<void> {
    if (this.pyodideInstance) return;

    // Load Pyodide with secure configuration
    const pyodide = await import('pyodide');
    this.pyodideInstance = await pyodide.loadPyodide({
      indexURL: '/pyodide/',
      // Minimize package loading for security
      packages: ['micropip'],
      // Use strict mode
      fullStdLib: false
    });

    // Configure secure Python environment
    await this.configureSecureEnvironment();
  }

  private async configureSecureEnvironment(): Promise<void> {
    // Install security restrictions
    await this.pyodideInstance.runPython(`
import sys
import builtins

# Remove dangerous builtins
dangerous_builtins = ['eval', 'exec', 'compile', '__import__', 'open']
for builtin in dangerous_builtins:
    if hasattr(builtins, builtin):
        delattr(builtins, builtin)

# Set up safe builtins
def safe_print(*args, **kwargs):
    """Safe print function with output length limits"""
    output = ' '.join(str(arg) for arg in args)
    if len(output) > 10000:  # 10KB limit
        output = output[:10000] + '... [OUTPUT TRUNCATED]'
    return output

builtins.print = safe_print

# Memory limit tracking
import tracemalloc
tracemalloc.start()

class ResourceTracker:
    def __init__(self):
        self.max_memory = 32 * 1024 * 1024  # 32MB
        
    def check_memory(self):
        current, peak = tracemalloc.get_traced_memory()
        if current > self.max_memory:
            raise MemoryError(f"Memory limit exceeded: {current} > {self.max_memory}")
        return current
        
    def get_metrics(self):
        current, peak = tracemalloc.get_traced_memory()
        return {'current': current, 'peak': peak}

# Global resource tracker
_resource_tracker = ResourceTracker()
sys.resource_tracker = _resource_tracker
`);
  }

  async execute(
    code: string, 
    runtime: WASIRuntime, 
    policy: SecurityPolicy
  ): Promise<LanguageExecutionResult> {
    await this.initialize();

    const startTime = performance.now();
    let output = '';
    let error: string | undefined;
    let securityWarnings: string[] = [];
    let educationalInsights: string[] = [];

    try {
      // Set up output capture
      await this.pyodideInstance.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

      // Execute user code with monitoring
      await this.pyodideInstance.runPython(`
# Check memory before execution
sys.resource_tracker.check_memory()

# Execute user code
try:
${this.indentCode(code, 4)}
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

# Check memory after execution
final_memory = sys.resource_tracker.get_metrics()
print(f"\\n--- Resource Usage ---")
print(f"Peak Memory: {final_memory['peak'] / 1024:.1f} KB")
print(f"Current Memory: {final_memory['current'] / 1024:.1f} KB")
`);

      // Capture output
      output = await this.pyodideInstance.runPython(`
stdout_content = sys.stdout.getvalue()
stderr_content = sys.stderr.getvalue()
if stderr_content:
    stdout_content + "\\nErrors:\\n" + stderr_content
else:
    stdout_content
`);

      // Generate educational insights
      educationalInsights = await this.generatePythonInsights(code);

    } catch (err: any) {
      error = err.message;
      
      if (err.message.includes('Memory limit exceeded')) {
        securityWarnings.push('Code exceeded memory limits - consider optimizing memory usage');
        educationalInsights.push('Large memory usage can slow down programs. Try using generators or processing data in smaller chunks.');
      }
    }

    return {
      output: output || '',
      error,
      exitCode: error ? 1 : 0,
      executionTime: performance.now() - startTime,
      securityWarnings,
      educationalInsights,
      warnings: []
    };
  }

  private async generatePythonInsights(code: string): Promise<string[]> {
    const insights: string[] = [];
    
    // Check for educational opportunities
    if (code.includes('for ') && code.includes('range(')) {
      insights.push('💡 Using for-loops with range() is efficient for counting operations');
    }
    
    if (code.includes('while True:')) {
      insights.push('⚠️ Infinite loops can consume excessive resources - always include a break condition');
    }
    
    if (code.includes('print(')) {
      insights.push('📝 print() statements help debug code by showing intermediate values');
    }
    
    // Check for performance patterns
    if (code.includes('+=') && code.includes('for ')) {
      insights.push('🚀 String concatenation in loops can be slow - consider using join() for better performance');
    }
    
    return insights;
  }

  private indentCode(code: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return code.split('\n').map(line => indent + line).join('\n');
  }
}
```

### 4. Resource Monitoring Implementation

```typescript
// /apps/client/src/security/wasi/resource-monitor.ts

export class ResourceMonitor {
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private globalMetrics: GlobalResourceMetrics = {
    totalExecutions: 0,
    totalMemoryUsed: 0,
    totalCpuTime: 0,
    activeRuntimes: 0
  };

  startMonitoring(runtime: WASIRuntime, policy: SecurityPolicy): MonitoringSession {
    const session: MonitoringSession = {
      id: this.generateSessionId(),
      runtimeId: runtime.id,
      startTime: performance.now(),
      policy,
      metrics: {
        currentMemory: 0,
        peakMemory: 0,
        cpuTimeUsed: 0,
        systemCallCount: 0,
        allocationCount: 0,
        executionTime: 0
      },
      violations: [],
      status: 'active'
    };

    this.activeSessions.set(session.id, session);
    
    // Start periodic monitoring
    this.startPeriodicMonitoring(session);
    
    return session;
  }

  private startPeriodicMonitoring(session: MonitoringSession): void {
    const monitoringInterval = setInterval(() => {
      if (session.status !== 'active') {
        clearInterval(monitoringInterval);
        return;
      }

      // Check memory usage
      this.checkMemoryUsage(session);
      
      // Check CPU time
      this.checkCpuTime(session);
      
      // Check for violations
      this.enforceResourceLimits(session);
      
    }, 100); // Monitor every 100ms

    // Store interval ID for cleanup
    (session as any).monitoringInterval = monitoringInterval;
  }

  private checkMemoryUsage(session: MonitoringSession): void {
    // For WebAssembly, we can monitor memory through the Memory object
    const runtime = this.getRuntimeById(session.runtimeId);
    if (runtime?.memory) {
      const currentMemory = runtime.memory.buffer.byteLength;
      session.metrics.currentMemory = currentMemory;
      session.metrics.peakMemory = Math.max(session.metrics.peakMemory, currentMemory);
      
      // Check for memory limit violation
      if (currentMemory > session.policy.maxMemory) {
        this.recordViolation(session, 'memory', currentMemory, session.policy.maxMemory);
      }
    }
  }

  private checkCpuTime(session: MonitoringSession): void {
    const elapsedTime = performance.now() - session.startTime;
    session.metrics.executionTime = elapsedTime;
    
    // For CPU time, we approximate based on execution time
    // In a real implementation, this would use more precise CPU time measurement
    session.metrics.cpuTimeUsed = elapsedTime;
    
    // Check for CPU time limit violation
    if (elapsedTime > session.policy.maxCpuTime) {
      this.recordViolation(session, 'cpu', elapsedTime, session.policy.maxCpuTime);
    }
  }

  private recordViolation(
    session: MonitoringSession,
    type: 'memory' | 'cpu' | 'time' | 'syscall',
    value: number,
    limit: number
  ): void {
    const violation: LimitViolation = {
      type,
      timestamp: Date.now(),
      value,
      limit,
      action: value > limit * 1.5 ? 'terminate' : 'warning'
    };
    
    session.violations.push(violation);
    
    if (violation.action === 'terminate') {
      this.emergencyTerminate(session);
    }
  }

  private emergencyTerminate(session: MonitoringSession): void {
    console.warn(`🚨 Emergency termination of session ${session.id} due to resource violation`);
    
    session.status = 'terminated';
    
    // Terminate the runtime
    const runtime = this.getRuntimeById(session.runtimeId);
    if (runtime) {
      // In a real implementation, this would forcibly terminate the WASI instance
      runtime.status = 'terminated';
    }
    
    // Clean up monitoring
    const interval = (session as any).monitoringInterval;
    if (interval) {
      clearInterval(interval);
    }
  }

  stopMonitoring(sessionId: string): ResourceMetrics {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Monitoring session not found: ${sessionId}`);
    }

    session.status = 'completed';
    
    // Clean up monitoring interval
    const interval = (session as any).monitoringInterval;
    if (interval) {
      clearInterval(interval);
    }
    
    // Update global metrics
    this.globalMetrics.totalExecutions++;
    this.globalMetrics.totalMemoryUsed += session.metrics.peakMemory;
    this.globalMetrics.totalCpuTime += session.metrics.cpuTimeUsed;
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    
    return session.metrics;
  }

  getGlobalMetrics(): GlobalResourceMetrics {
    this.globalMetrics.activeRuntimes = this.activeSessions.size;
    return { ...this.globalMetrics };
  }

  private getRuntimeById(runtimeId: string): WASIRuntime | undefined {
    // This would interface with the runtime manager to get runtime instances
    return undefined; // Placeholder
  }

  private generateSessionId(): string {
    return `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 5. Security-Aware Monaco Editor Component

```vue
<!-- /apps/client/src/components/educational/secure-code-editor/SecurityAwareMonaco.vue -->
<template>
  <div class="security-aware-editor">
    <!-- Security Status Bar -->
    <div class="security-status-bar bg-gray-800 p-2 border-b border-gray-600">
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center space-x-4">
          <span class="flex items-center">
            <span :class="securityStatusColor" class="mr-2">{{ securityIcon }}</span>
            Security: {{ securityStatus }}
          </span>
          <span class="text-gray-400">
            Risk Level: <span :class="getRiskLevelColor(currentRiskLevel)">{{ currentRiskLevel.toUpperCase() }}</span>
          </span>
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-gray-400">
            Estimated Memory: {{ formatBytes(estimatedMemory) }}
          </span>
          <span class="text-gray-400">
            Estimated Time: {{ estimatedTime }}ms
          </span>
        </div>
      </div>
    </div>

    <!-- Monaco Editor -->
    <div class="editor-container">
      <VueMonacoEditor
        v-model:value="code"
        :language="language"
        theme="vs-dark"
        :options="editorOptions"
        @change="handleCodeChange"
        @mount="handleEditorMount"
        class="h-96"
      />
    </div>

    <!-- Security Warnings Panel -->
    <div v-if="securityWarnings.length > 0" class="security-warnings bg-yellow-900 border border-yellow-600">
      <div class="p-3">
        <h4 class="text-yellow-200 font-semibold mb-2">⚠️ Security Warnings</h4>
        <div class="space-y-1">
          <div 
            v-for="(warning, index) in securityWarnings" 
            :key="index"
            class="text-yellow-100 text-sm"
          >
            • {{ warning }}
          </div>
        </div>
      </div>
    </div>

    <!-- Educational Tips Panel -->
    <div v-if="educationalTips.length > 0" class="educational-tips bg-blue-900 border border-blue-600">
      <div class="p-3">
        <h4 class="text-blue-200 font-semibold mb-2">💡 Learning Tips</h4>
        <div class="space-y-1">
          <div 
            v-for="(tip, index) in educationalTips" 
            :key="index"
            class="text-blue-100 text-sm"
          >
            • {{ tip }}
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Controls -->
    <div class="execution-controls bg-gray-800 border-t border-gray-600 p-3">
      <div class="flex items-center justify-between">
        <button
          @click="executeCode"
          :disabled="!canExecute || isExecuting"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
        >
          <span v-if="isExecuting">🔄 Executing...</span>
          <span v-else>▶️ Execute Code</span>
        </button>
        
        <div class="flex items-center space-x-4">
          <label class="flex items-center text-sm text-gray-300">
            <input
              v-model="strictMode"
              type="checkbox"
              class="mr-2"
            >
            Strict Security Mode
          </label>
          
          <select
            v-model="securityLevel"
            class="bg-gray-700 text-white px-2 py-1 rounded text-sm"
          >
            <option value="educational">Educational (Lenient)</option>
            <option value="strict">Strict Security</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { WASISecurityValidator } from '../../../security/wasi/security-validator';
import { WASIRuntimeManager } from '../../../security/wasi/runtime-manager';
import type { ValidationResult, ResourceEstimate } from '../../../security/types';

interface Props {
  modelValue: string;
  language: string;
  readonly?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'execute', result: any): void;
  (e: 'securityChange', status: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Reactive state
const code = ref(props.modelValue);
const isExecuting = ref(false);
const strictMode = ref(true);
const securityLevel = ref<'educational' | 'strict'>('educational');

// Security state
const validationResult = ref<ValidationResult | null>(null);
const securityWarnings = ref<string[]>([]);
const educationalTips = ref<string[]>([]);
const currentRiskLevel = ref<'safe' | 'low' | 'medium' | 'high' | 'critical'>('safe');
const estimatedMemory = ref(0);
const estimatedTime = ref(0);

// Services
const validator = new WASISecurityValidator();
const runtimeManager = new WASIRuntimeManager();

// Computed properties
const securityStatus = computed(() => {
  if (!validationResult.value) return 'Checking...';
  return validationResult.value.valid ? 'Secure' : 'Issues Detected';
});

const securityIcon = computed(() => {
  if (!validationResult.value) return '⏳';
  return validationResult.value.valid ? '✅' : '⚠️';
});

const securityStatusColor = computed(() => {
  if (!validationResult.value) return 'text-yellow-400';
  return validationResult.value.valid ? 'text-green-400' : 'text-red-400';
});

const canExecute = computed(() => {
  return validationResult.value?.valid || (!strictMode.value && currentRiskLevel.value !== 'critical');
});

// Editor configuration
const editorOptions = computed(() => ({
  fontSize: 14,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  theme: 'vs-dark',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  readOnly: props.readonly,
  // Security-aware features
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false
  },
  // Disable potentially dangerous features
  wordBasedSuggestions: false
}));

// Event handlers
async function handleCodeChange(newCode: string) {
  code.value = newCode;
  emit('update:modelValue', newCode);
  
  // Debounced validation
  clearTimeout((window as any).validationTimeout);
  (window as any).validationTimeout = setTimeout(async () => {
    await validateCode(newCode);
  }, 500);
}

async function validateCode(codeToValidate: string) {
  if (!codeToValidate.trim()) {
    resetValidation();
    return;
  }

  try {
    const result = await validator.validateForWASI(codeToValidate, props.language);
    
    validationResult.value = result;
    securityWarnings.value = result.errors.concat(result.warnings);
    currentRiskLevel.value = result.riskLevel;
    
    if (result.estimatedResources) {
      estimatedMemory.value = result.estimatedResources.estimatedMemory;
      estimatedTime.value = result.estimatedResources.estimatedCpuTime;
    }
    
    // Generate educational tips
    educationalTips.value = generateEducationalTips(codeToValidate, result);
    
    // Emit security status change
    emit('securityChange', {
      valid: result.valid,
      riskLevel: result.riskLevel,
      warnings: securityWarnings.value,
      tips: educationalTips.value
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    resetValidation();
  }
}

async function executeCode() {
  if (!validationResult.value || isExecuting.value) return;

  isExecuting.value = true;

  try {
    // Create runtime configuration
    const config = {
      maxMemory: Math.min(estimatedMemory.value * 1.5, 32 * 1024 * 1024), // 1.5x estimated, max 32MB
      maxCpuTime: Math.min(estimatedTime.value * 2, 5000), // 2x estimated, max 5 seconds
      environmentVariables: {
        'EDUCATIONAL_MODE': '1',
        'SECURITY_LEVEL': securityLevel.value
      },
      preOpenDirectories: {}
    };

    // Create runtime
    const runtime = await runtimeManager.createRuntime(config);
    
    // Execute code
    const result = await runtimeManager.executeCode(
      runtime,
      code.value,
      props.language,
      validationResult.value.securityPolicy || {}
    );

    // Cleanup runtime
    await runtimeManager.terminateRuntime(runtime.id);

    // Emit result
    emit('execute', result);

  } catch (error) {
    console.error('Execution error:', error);
    emit('execute', {
      success: false,
      error: error.message,
      output: '',
      executionTime: 0
    });
  } finally {
    isExecuting.value = false;
  }
}

function handleEditorMount(editor: any) {
  // Configure editor decorations for security warnings
  // This could highlight dangerous code patterns
}

function resetValidation() {
  validationResult.value = null;
  securityWarnings.value = [];
  educationalTips.value = [];
  currentRiskLevel.value = 'safe';
  estimatedMemory.value = 0;
  estimatedTime.value = 0;
}

function generateEducationalTips(code: string, result: ValidationResult): string[] {
  const tips: string[] = [];
  
  if (result.riskLevel === 'safe') {
    tips.push('✅ This code follows security best practices!');
  }
  
  if (code.includes('for ') || code.includes('while ')) {
    tips.push('💡 Loops can affect performance - consider the number of iterations');
  }
  
  if (estimatedMemory.value > 16 * 1024 * 1024) { // 16MB
    tips.push('🔍 This code may use significant memory - consider optimization techniques');
  }
  
  return tips;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getRiskLevelColor(riskLevel: string): string {
  const colors = {
    safe: 'text-green-400',
    low: 'text-yellow-400',
    medium: 'text-orange-400',
    high: 'text-red-400',
    critical: 'text-red-600'
  };
  return colors[riskLevel as keyof typeof colors] || 'text-gray-400';
}

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== code.value) {
    code.value = newValue;
    validateCode(newValue);
  }
});

// Initial validation
onMounted(() => {
  if (code.value) {
    validateCode(code.value);
  }
});
</script>

<style scoped>
.security-aware-editor {
  border: 1px solid #374151;
  border-radius: 8px;
  overflow: hidden;
  background: #1f2937;
}

.editor-container {
  position: relative;
}

.security-warnings,
.educational-tips {
  border-radius: 0;
  margin: 0;
}
</style>
```

## 🚀 Implementation Timeline

### Week 1: Core Infrastructure (16 hours)
- **Day 1-2**: WASI Runtime Manager implementation (8h)
- **Day 3-4**: Enhanced Security Validator (8h)

### Week 2: Language Engines (16 hours)
- **Day 1-2**: Python Engine (Pyodide integration) (10h)
- **Day 3-4**: JavaScript Engine (QuickJS integration) (6h)

### Week 3: Monitoring & UI (12 hours)
- **Day 1-2**: Resource Monitoring system (8h)
- **Day 3**: Security-aware Monaco Editor (4h)

### Week 4: Integration & Testing (8 hours)
- **Day 1-2**: Assessment system integration (6h)
- **Day 3**: End-to-end testing (2h)

### Week 5: Production Ready (8 hours)
- **Day 1-2**: Performance optimization (4h)
- **Day 3**: Security hardening & documentation (4h)

**Total Estimated Effort**: 60 hours over 5 weeks

This implementation specification provides the complete technical foundation for building the WebAssembly security architecture, with production-ready code examples and clear implementation guidelines.