<template>
  <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all duration-200">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center">
        <span class="text-lg mr-2">{{ example.icon }}</span>
        <h4 class="text-sm font-semibold text-gray-300">{{ example.title }}</h4>
        <span v-if="example.type" class="ml-2 px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded">
          {{ example.type }}
        </span>
      </div>
      <button
        @click="copyCode"
        class="flex items-center text-blue-400 hover:text-blue-300 text-xs transition-colors"
        :class="{ 'text-green-400': showCopiedFeedback }"
        :title="showCopiedFeedback ? 'Copied!' : 'Copy to clipboard'"
      >
        <span class="mr-1">{{ showCopiedFeedback ? '✓' : '📋' }}</span>
        {{ showCopiedFeedback ? 'Copied!' : 'Copy Code' }}
      </button>
    </div>

    <!-- Description -->
    <p v-if="example.description" class="text-xs text-gray-400 mb-3">
      {{ example.description }}
    </p>

    <!-- Code Block with Syntax Highlighting -->
    <div class="relative">
      <pre 
        class="text-sm overflow-x-auto bg-gray-950 rounded border border-gray-800 p-3"
        :class="getLanguageClass(example.language)"
      ><code v-html="highlightCode(example.code, example.language)"></code></pre>
      
      <!-- Language indicator -->
      <div class="absolute top-2 right-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
        {{ example.language }}
      </div>
    </div>

    <!-- Explanation -->
    <div v-if="example.explanation" class="mt-3 text-xs text-gray-400 bg-gray-800 rounded p-3 border border-gray-700">
      <div class="flex items-start">
        <span class="text-yellow-400 mr-2 flex-shrink-0">💡</span>
        <div v-html="formatExplanation(example.explanation)"></div>
      </div>
    </div>

    <!-- Footer with metadata and actions -->
    <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
      <div class="flex items-center text-xs text-gray-400 space-x-4">
        <div v-if="example.estimatedTime" class="flex items-center">
          <span class="mr-1">⏱️</span>
          <span>~{{ example.estimatedTime }}</span>
        </div>
        <div v-if="example.difficulty" class="flex items-center">
          <span class="mr-1">📊</span>
          <span class="capitalize">{{ example.difficulty }}</span>
        </div>
        <div v-if="example.lines" class="flex items-center">
          <span class="mr-1">📝</span>
          <span>{{ example.lines }} lines</span>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          v-if="showRunButton"
          @click="runExample"
          class="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs text-white transition-colors flex items-center"
          :disabled="isRunning"
        >
          <span class="mr-1">{{ isRunning ? '⏳' : '▶️' }}</span>
          {{ isRunning ? 'Running...' : 'Run Example' }}
        </button>
        
        <button
          v-if="example.docsLink"
          @click="openDocs"
          class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs text-white transition-colors flex items-center"
        >
          <span class="mr-1">📚</span>
          Learn More
        </button>
      </div>
    </div>

    <!-- Output/Result Display -->
    <Transition name="slide-down">
      <div v-if="showOutput && exampleOutput" class="mt-3 bg-gray-950 border border-gray-600 rounded p-3">
        <div class="flex items-center mb-2">
          <span class="text-green-400 mr-2">🖥️</span>
          <span class="text-xs font-medium text-green-400">Output:</span>
        </div>
        <pre class="text-xs text-green-300 whitespace-pre-wrap">{{ exampleOutput }}</pre>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface CodeExample {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type?: string;
  language: 'python' | 'json' | 'bash' | 'javascript' | 'typescript' | 'yaml';
  code: string;
  explanation?: string;
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  runnable?: boolean;
  docsLink?: string;
  expectedOutput?: string;
  lines?: number;
}

interface Props {
  example: CodeExample;
  enableExecution?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  enableExecution: true
});

const emit = defineEmits<{
  run: [example: CodeExample];
  openDocs: [url: string];
}>();

// Component state
const showCopiedFeedback = ref(false);
const isRunning = ref(false);
const showOutput = ref(false);
const exampleOutput = ref('');

// Computed properties
const showRunButton = computed(() => {
  return props.enableExecution && props.example.runnable;
});

const lines = computed(() => {
  return props.example.code.split('\n').length;
});

// Add lines to example for display
if (!props.example.lines) {
  (props.example as any).lines = lines.value;
}

// Methods
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.example.code);
    showCopiedFeedback.value = true;
    setTimeout(() => {
      showCopiedFeedback.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy code:', err);
    // Fallback for older browsers
    fallbackCopyTextToClipboard(props.example.code);
  }
};

const fallbackCopyTextToClipboard = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showCopiedFeedback.value = true;
    setTimeout(() => {
      showCopiedFeedback.value = false;
    }, 2000);
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  
  document.body.removeChild(textArea);
};

const runExample = async () => {
  if (isRunning.value) return;
  
  isRunning.value = true;
  showOutput.value = false;
  
  try {
    // Emit the run event for parent to handle
    emit('run', props.example);
    
    // Simulate execution with mock output for demo purposes
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Show expected output or mock output
    if (props.example.expectedOutput) {
      exampleOutput.value = props.example.expectedOutput;
    } else {
      exampleOutput.value = generateMockOutput(props.example);
    }
    
    showOutput.value = true;
  } catch (error) {
    exampleOutput.value = `Error: ${error}`;
    showOutput.value = true;
  } finally {
    isRunning.value = false;
  }
};

const openDocs = () => {
  if (props.example.docsLink) {
    emit('openDocs', props.example.docsLink);
    window.open(props.example.docsLink, '_blank');
  }
};

const getLanguageClass = (language: string) => {
  const classMap: Record<string, string> = {
    python: 'language-python',
    json: 'language-json',
    bash: 'language-bash',
    javascript: 'language-javascript',
    typescript: 'language-typescript',
    yaml: 'language-yaml'
  };
  return classMap[language] || 'language-text';
};

const formatExplanation = (explanation: string) => {
  // Simple formatting for inline code and emphasis
  return explanation
    .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-cyan-300">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="text-gray-300">$1</em>');
};

const highlightCode = (code: string, language: string): string => {
  // Simple regex-based syntax highlighting
  let highlighted = code;
  
  switch (language) {
    case 'python':
      // Keywords
      highlighted = highlighted.replace(
        /\b(def|class|import|from|if|else|elif|for|while|try|except|finally|with|as|return|yield|break|continue|pass|and|or|not|in|is|None|True|False)\b/g,
        '<span class="text-purple-400 font-medium">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
        '<span class="text-green-300">$1$2$1</span>'
      );
      // Comments
      highlighted = highlighted.replace(
        /(#.*$)/gm,
        '<span class="text-gray-500 italic">$1</span>'
      );
      // Function/method calls
      highlighted = highlighted.replace(
        /\b(\w+)(?=\()/g,
        '<span class="text-yellow-300">$1</span>'
      );
      break;
      
    case 'json':
      // Strings (keys and values)
      highlighted = highlighted.replace(
        /"([^"\\]|\\.)*"/g,
        '<span class="text-green-300">$&</span>'
      );
      // Numbers
      highlighted = highlighted.replace(
        /\b\d+\.?\d*\b/g,
        '<span class="text-blue-300">$&</span>'
      );
      // Booleans and null
      highlighted = highlighted.replace(
        /\b(true|false|null)\b/g,
        '<span class="text-purple-400">$1</span>'
      );
      break;
      
    case 'bash':
      // Comments
      highlighted = highlighted.replace(
        /(#.*$)/gm,
        '<span class="text-gray-500 italic">$1</span>'
      );
      // Commands
      highlighted = highlighted.replace(
        /^(\w+)(?=\s)/gm,
        '<span class="text-yellow-300 font-medium">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
        '<span class="text-green-300">$1$2$1</span>'
      );
      break;
      
    default:
      // Basic highlighting for unknown languages
      highlighted = highlighted.replace(
        /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
        '<span class="text-green-300">$1$2$1</span>'
      );
      highlighted = highlighted.replace(
        /(#.*$|\/\/.*$)/gm,
        '<span class="text-gray-500 italic">$1</span>'
      );
  }
  
  return `<span class="text-gray-300">${highlighted}</span>`;
};

const generateMockOutput = (example: CodeExample): string => {
  const outputs: Record<string, string> = {
    'security-validator': `🛡️ Security validation completed
✅ Tool "git status" - ALLOWED
✅ No dangerous patterns detected
📊 Validation time: 0.003s
💾 Logged to audit trail`,

    'execution-logger': `📝 Tool execution logged successfully
🔧 Tool: git
📊 Duration: 120ms
✅ Exit code: 0
💾 Saved to: /var/log/claude-hooks/tool_execution.log
🕒 Timestamp: ${new Date().toISOString()}`,

    'hook-config': `⚙️ Configuration validated
✅ pre_tool_use hook registered
✅ post_tool_use hook registered
📁 Scripts found in ./hooks/
🔄 Hook system ready`,

    'session-context': `🏗️ Session context loaded
📊 Project: multi-agent-observability-system
🌿 Branch: main
📝 Last commit: feat: Add interactive code examples
🔧 Recent changes: 3 files modified
💾 Context injected successfully`
  };

  return outputs[example.id] || `✅ Example executed successfully
📊 Operation completed in 0.${Math.floor(Math.random() * 999)}s
🔄 Ready for next operation`;
};
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
  max-height: 200px;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

/* Basic syntax highlighting classes (simple approach) */
.language-python {
  color: #e5e7eb;
}

.language-json {
  color: #d1d5db;
}

.language-bash {
  color: #9ca3af;
}

/* Add more language-specific styling as needed */
code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}

pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>