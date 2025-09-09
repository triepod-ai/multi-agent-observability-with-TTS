<template>
  <div class="wasi-runtime-demo bg-gray-900 border border-gray-700 rounded-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white mb-2">🚀 WebAssembly Runtime Demo</h2>
      <p class="text-gray-400">Test the secure code execution system with real Python, JavaScript, and TypeScript</p>
    </div>

    <!-- Runtime Status -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div v-for="(status, language) in engineStatus" :key="language" 
           class="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="text-2xl mr-3">
              {{ getLanguageIcon(language) }}
            </div>
            <div>
              <div class="font-medium text-white capitalize">{{ language }}</div>
              <div class="text-sm text-gray-400">Runtime Engine</div>
            </div>
          </div>
          <div class="flex items-center">
            <div 
              class="w-3 h-3 rounded-full mr-2"
              :class="status ? 'bg-green-400' : 'bg-red-400'"
            ></div>
            <span class="text-sm" :class="status ? 'text-green-400' : 'text-red-400'">
              {{ status ? 'Ready' : 'Loading...' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sample Code Examples -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Sample Code Examples</h3>
        <div class="flex space-x-2">
          <button
            v-for="(example, key) in codeExamples"
            :key="key"
            @click="loadExample(key)"
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm capitalize transition-colors"
          >
            {{ key }}
          </button>
        </div>
      </div>
    </div>

    <!-- Code Editor -->
    <div class="mb-6">
      <SecureCodeEditor
        :initial-code="selectedExample.code"
        :language="selectedExample.language"
        :readonly="false"
        @code-executed="handleCodeExecution"
        @engine-ready="handleEngineReady"
        ref="codeEditor"
      />
    </div>

    <!-- Execution History -->
    <div v-if="executionHistory.length > 0" class="mt-6">
      <h3 class="text-lg font-semibold text-white mb-4">Execution History</h3>
      <div class="space-y-3 max-h-64 overflow-y-auto">
        <div 
          v-for="(execution, index) in executionHistory.slice().reverse()" 
          :key="index"
          class="bg-gray-800 border border-gray-600 rounded-lg p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <span class="text-lg mr-2">{{ getLanguageIcon(execution.language) }}</span>
              <span class="font-medium text-white capitalize">{{ execution.language }}</span>
            </div>
            <div class="flex items-center text-sm space-x-3">
              <span :class="execution.result.success ? 'text-green-400' : 'text-red-400'">
                {{ execution.result.success ? '✅ Success' : '❌ Error' }}
              </span>
              <span class="text-gray-400">{{ execution.result.metrics.executionTimeMs }}ms</span>
              <span class="text-gray-400">{{ execution.result.metrics.memoryUsedMB.toFixed(1) }}MB</span>
            </div>
          </div>
          
          <div class="text-sm">
            <div class="text-gray-300 mb-1">Output:</div>
            <pre class="bg-gray-950 text-green-300 p-2 rounded font-mono text-xs overflow-x-auto">{{ execution.result.output || '(no output)' }}</pre>
            
            <div v-if="execution.result.error" class="mt-2">
              <div class="text-red-400 mb-1">Error:</div>
              <div class="bg-gray-950 text-red-300 p-2 rounded font-mono text-xs">{{ execution.result.error }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div v-if="performanceMetrics.length > 0" class="mt-6">
      <h3 class="text-lg font-semibold text-white mb-4">Performance Analysis</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <div class="text-sm text-gray-400 mb-1">Avg Execution Time</div>
          <div class="text-lg font-semibold text-blue-400">{{ avgExecutionTime }}ms</div>
        </div>
        <div class="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <div class="text-sm text-gray-400 mb-1">Peak Memory</div>
          <div class="text-lg font-semibold text-green-400">{{ peakMemory }}MB</div>
        </div>
        <div class="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <div class="text-sm text-gray-400 mb-1">Success Rate</div>
          <div class="text-lg font-semibold text-yellow-400">{{ successRate }}%</div>
        </div>
        <div class="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <div class="text-sm text-gray-400 mb-1">Total Executions</div>
          <div class="text-lg font-semibold text-purple-400">{{ executionHistory.length }}</div>
        </div>
      </div>
    </div>

    <!-- Security Information -->
    <div class="mt-6 bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
      <div class="flex items-start">
        <div class="text-blue-400 mr-3 mt-1">🛡️</div>
        <div>
          <h4 class="font-semibold text-blue-300 mb-2">Security Features Active</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-blue-200">
            <div>✓ Memory isolation (32MB limit)</div>
            <div>✓ CPU time limits (5s timeout)</div>
            <div>✓ Network access blocked</div>
            <div>✓ File system sandboxed</div>
            <div>✓ DOM access restricted</div>
            <div>✓ Resource monitoring active</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import SecureCodeEditor from './SecureCodeEditor.vue';
import type { ExecutionResult } from '../services/wasiRuntimeManager';

// Sample code examples for demonstration
const codeExamples = {
  python: {
    language: 'python' as const,
    code: `# Python Hello World with user input simulation
name = "Claude"
age = 25

print(f"Hello, {name}!")
print(f"You are {age} years old.")

# Simple calculation
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
average = total / len(numbers)

print(f"Sum: {total}")
print(f"Average: {average}")

# Function example
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(f"Fibonacci(6): {fibonacci(6)}")
`
  },
  javascript: {
    language: 'javascript' as const,
    code: `// JavaScript examples with modern syntax
const greeting = "Hello, JavaScript World!";
console.log(greeting);

// Arrow function
const multiply = (a, b) => a * b;
console.log(\`5 * 3 = \${multiply(5, 3)}\`);

// Array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const evenDoubled = numbers.filter(n => n % 2 === 0).map(n => n * 2);

console.log("Doubled:", doubled);
console.log("Even doubled:", evenDoubled);

// Async simulation (using Promise)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
delay(100).then(() => console.log("Async operation completed!"));

// Object destructuring
const person = { name: "Alice", age: 30, city: "New York" };
const { name, age } = person;
console.log(\`\${name} is \${age} years old\`);
`
  },
  typescript: {
    language: 'typescript' as const,
    code: `// TypeScript with type safety
interface Person {
  name: string;
  age: number;
  email?: string;
}

const createPerson = (name: string, age: number): Person => {
  return { name, age };
};

const alice: Person = createPerson("Alice", 28);
console.log(\`Person: \${alice.name}, Age: \${alice.age}\`);

// Generic function
function getFirst<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[0] : undefined;
}

const numbers: number[] = [1, 2, 3];
const words: string[] = ["hello", "world"];

console.log("First number:", getFirst(numbers));
console.log("First word:", getFirst(words));

// Class with type annotations
class Calculator {
  private history: number[] = [];

  add(a: number, b: number): number {
    const result = a + b;
    this.history.push(result);
    return result;
  }

  getHistory(): number[] {
    return [...this.history];
  }
}

const calc = new Calculator();
console.log("5 + 3 =", calc.add(5, 3));
console.log("History:", calc.getHistory());
`
  }
};

// State
const engineStatus = ref<Record<string, boolean>>({});
const selectedExample = ref(codeExamples.python);
const executionHistory = ref<Array<{
  language: string;
  code: string;
  result: ExecutionResult;
  timestamp: number;
}>>([]);

// Computed metrics
const performanceMetrics = computed(() => executionHistory.value);

const avgExecutionTime = computed(() => {
  if (executionHistory.value.length === 0) return 0;
  const total = executionHistory.value.reduce((sum, exec) => sum + exec.result.metrics.executionTimeMs, 0);
  return Math.round(total / executionHistory.value.length);
});

const peakMemory = computed(() => {
  if (executionHistory.value.length === 0) return 0;
  return Math.max(...executionHistory.value.map(exec => exec.result.metrics.memoryUsedMB)).toFixed(1);
});

const successRate = computed(() => {
  if (executionHistory.value.length === 0) return 100;
  const successful = executionHistory.value.filter(exec => exec.result.success).length;
  return Math.round((successful / executionHistory.value.length) * 100);
});

// Methods
const loadExample = (exampleKey: keyof typeof codeExamples) => {
  selectedExample.value = codeExamples[exampleKey];
};

const getLanguageIcon = (language: string): string => {
  const icons = {
    python: '🐍',
    javascript: '🟨', 
    typescript: '🔷'
  };
  return icons[language as keyof typeof icons] || '📄';
};

const handleCodeExecution = (result: ExecutionResult) => {
  executionHistory.value.push({
    language: selectedExample.value.language,
    code: selectedExample.value.code,
    result,
    timestamp: Date.now()
  });

  // Keep only last 10 executions
  if (executionHistory.value.length > 10) {
    executionHistory.value = executionHistory.value.slice(-10);
  }
};

const handleEngineReady = (language: string, ready: boolean) => {
  engineStatus.value[language] = ready;
};

// Lifecycle
onMounted(() => {
  console.log('WASI Runtime Demo mounted');
});
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #1f2937;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Animation for new execution entries */
.execution-entry-enter-active {
  transition: all 0.3s ease-out;
}

.execution-entry-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
</style>