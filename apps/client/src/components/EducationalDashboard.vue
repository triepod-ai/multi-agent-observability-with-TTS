<template>
  <div class="p-4 space-y-6">
    <!-- Educational Dashboard Header -->
    <div class="bg-gradient-to-r from-green-700 to-blue-700 rounded-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-2">🎓 Educational Dashboard</h1>
          <p class="text-green-100 text-sm">Learn how Claude Code hooks work together to monitor AI agents</p>
        </div>
        <div class="text-right">
          <div class="text-sm text-green-100 mb-1">Learning Progress</div>
          <div class="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              class="h-full bg-white rounded-full transition-all duration-500"
              :style="{ width: learningProgress + '%' }"
            ></div>
          </div>
          <div class="text-xs text-green-100 mt-1">{{ Math.round(learningProgress) }}% Complete</div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">🔧</span>
          <div>
            <div class="text-sm text-gray-400">Total Hooks</div>
            <div class="text-xl font-semibold text-white">8</div>
          </div>
        </div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">🚀</span>
          <div>
            <div class="text-sm text-gray-400">Active Hooks</div>
            <div class="text-xl font-semibold text-green-400">{{ activeHooksCount }}</div>
          </div>
        </div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">📚</span>
          <div>
            <div class="text-sm text-gray-400">Topics Learned</div>
            <div class="text-xl font-semibold text-blue-400">{{ topicsLearned }}/8</div>
          </div>
        </div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">⚡</span>
          <div>
            <div class="text-sm text-gray-400">Recent Events</div>
            <div class="text-xl font-semibold text-yellow-400">{{ recentEventsCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-1">
      <div class="flex space-x-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
          :class="activeTab === tab.id
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'"
        >
          <span class="mr-2">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
          <ContextualHelp
            v-if="tab.help"
            :tooltip="tab.help.tooltip"
            :title="tab.help.title"
            :description="tab.help.description"
            :tips="tab.help.tips"
            size="sm"
            position="top"
            class="ml-2"
          />
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="min-h-96">
      <!-- Hook Flow Tab -->
      <div v-if="activeTab === 'flow'">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Interactive Hook Flow</h2>
          <p class="text-sm text-gray-400 mb-4">
            This diagram shows how the 8 Claude Code hooks work together. Click any hook to learn more, or click "Start Flow" to see the execution sequence.
          </p>
        </div>
        
        <HookFlowDiagram @show-in-flow="handleShowInFlow" @simulate-hook="handleSimulateHook" />
        
        <!-- Flow Legend -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center">
            <span class="mr-2">📖</span>
            Flow Legend
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="flex items-center text-xs text-gray-300">
              <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Session Setup</span>
            </div>
            <div class="flex items-center text-xs text-gray-300">
              <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>User Interaction</span>
            </div>
            <div class="flex items-center text-xs text-gray-300">
              <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Tool Validation</span>
            </div>
            <div class="flex items-center text-xs text-gray-300">
              <div class="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              <span>Completion</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Hook Guide Tab -->
      <div v-else-if="activeTab === 'guide'">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Complete Hook Guide</h2>
          <p class="text-sm text-gray-400 mb-4">
            Detailed explanations of all 8 Claude Code hooks with examples, best practices, and common issues.
          </p>
        </div>
        
        <EducationalHookExplanations 
          @show-in-flow="handleShowInFlow" 
          @simulate-hook="handleSimulateHook"
          @topic-learned="handleTopicLearned"
        />
      </div>

      <!-- Scenarios Tab -->
      <div v-else-if="activeTab === 'scenarios'">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Real-World Scenarios</h2>
          <p class="text-sm text-gray-400 mb-4">
            See how hooks work together in common development scenarios.
          </p>
        </div>
        
        <div class="space-y-4">
          <div
            v-for="scenario in scenarios"
            :key="scenario.id"
            class="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-sm font-semibold text-white flex items-center">
                  <span class="mr-2">{{ scenario.icon }}</span>
                  {{ scenario.title }}
                </h3>
                <p class="text-xs text-gray-400 mt-1">{{ scenario.description }}</p>
              </div>
              <button
                @click="playScenario(scenario.id)"
                class="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
              >
                Play Scenario
              </button>
            </div>
            
            <div class="space-y-2">
              <div class="text-xs font-medium text-blue-400">Hook Sequence:</div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="hookId in scenario.hookSequence"
                  :key="hookId"
                  class="inline-flex items-center px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded border"
                >
                  {{ getHookName(hookId) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Glossary Tab -->
      <div v-else-if="activeTab === 'glossary'">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Hook System Glossary</h2>
          <p class="text-sm text-gray-400 mb-4">
            Key terms and concepts in the Claude Code hook system.
          </p>
        </div>
        
        <div class="space-y-3">
          <div
            v-for="term in glossaryTerms"
            :key="term.term"
            class="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <h3 class="text-sm font-semibold text-white mb-2">{{ term.term }}</h3>
            <p class="text-xs text-gray-300">{{ term.definition }}</p>
            <div v-if="term.example" class="mt-2">
              <div class="text-xs font-medium text-blue-400 mb-1">Example:</div>
              <div class="text-xs text-gray-400 italic">{{ term.example }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Learning Progress Tracker -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-white flex items-center">
          <span class="mr-2">📊</span>
          Learning Progress
        </h3>
        <button
          @click="resetProgress"
          class="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Reset Progress
        </button>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div
          v-for="hook in hookExplanations"
          :key="hook.id"
          class="flex items-center text-xs p-2 rounded"
          :class="learnedTopics.includes(hook.id) ? 'bg-green-900/30 border border-green-600' : 'bg-gray-900 border border-gray-600'"
        >
          <span class="mr-2">{{ hook.icon }}</span>
          <span class="flex-1 text-gray-300">{{ hook.name }}</span>
          <span v-if="learnedTopics.includes(hook.id)" class="text-green-400">✓</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEducationalMode } from '../composables/useEducationalMode';
import HookFlowDiagram from './HookFlowDiagram.vue';
import EducationalHookExplanations from './EducationalHookExplanations.vue';
import ContextualHelp from './ContextualHelp.vue';
import type { HookEvent } from '../types';

interface Props {
  events: HookEvent[];
}

const props = defineProps<Props>();

const { hookExplanations, getHookExplanation } = useEducationalMode();

const activeTab = ref('flow');
const learnedTopics = ref<string[]>([]);

const tabs = [
  {
    id: 'flow',
    label: 'Hook Flow',
    icon: '🔄',
    help: {
      tooltip: 'Interactive diagram showing hook execution flow',
      title: 'Hook Flow Diagram',
      description: 'This interactive diagram shows how the 8 Claude Code hooks execute in sequence during a typical session.',
      tips: [
        'Click any hook to see detailed information',
        'Use "Start Flow" to see animated execution',
        'Hover over hooks for quick descriptions'
      ]
    }
  },
  {
    id: 'guide',
    label: 'Hook Guide',
    icon: '📚',
    help: {
      tooltip: 'Comprehensive guide to all hooks',
      title: 'Hook Guide',
      description: 'Detailed explanations of each hook with examples, best practices, and troubleshooting tips.',
      tips: [
        'Click expand to see detailed information',
        'Use the code examples to understand data structures',
        'Follow best practices to avoid common issues'
      ]
    }
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    icon: '🎬',
    help: {
      tooltip: 'Real-world usage scenarios',
      title: 'Real-World Scenarios',
      description: 'Common development scenarios showing how multiple hooks work together.',
      tips: [
        'Play scenarios to see hook sequences',
        'Understand hook interactions in context',
        'Learn from practical examples'
      ]
    }
  },
  {
    id: 'glossary',
    label: 'Glossary',
    icon: '📖',
    help: {
      tooltip: 'Key terms and definitions',
      title: 'Glossary',
      description: 'Important terms and concepts in the Claude Code hook system.',
      tips: [
        'Reference when learning new concepts',
        'Understand technical terminology',
        'Build foundational knowledge'
      ]
    }
  }
];

const scenarios = [
  {
    id: 'code-review',
    title: 'Code Review Session',
    icon: '👀',
    description: 'A typical code review workflow showing hook interactions',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'subagent_stop', 'stop']
  },
  {
    id: 'debugging',
    title: 'Debugging Process',
    icon: '🐛',
    description: 'Debugging a failing test with multiple tool uses',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'pre_tool_use', 'post_tool_use', 'stop']
  },
  {
    id: 'deployment',
    title: 'Application Deployment',
    icon: '🚀',
    description: 'Deploying an application with validation and monitoring',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'notification', 'stop']
  },
  {
    id: 'documentation',
    title: 'Documentation Generation',
    icon: '📝',
    description: 'Generating documentation with agent assistance',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'subagent_stop', 'precompact', 'stop']
  }
];

const glossaryTerms = [
  {
    term: 'Hook',
    definition: 'A script that runs at specific points during Claude Code execution to capture events, provide notifications, or perform validation.',
    example: 'The PostToolUse hook runs after every tool execution to capture results and detect errors.'
  },
  {
    term: 'Session',
    definition: 'A single conversation or work session with Claude Code, from start to finish.',
    example: 'A session might involve loading a project, making code changes, running tests, and deploying.'
  },
  {
    term: 'Tool',
    definition: 'A capability that Claude can use to interact with your system, such as Read, Write, Bash, or Grep.',
    example: 'When Claude uses the Bash tool to run "git status", both PreToolUse and PostToolUse hooks will fire.'
  },
  {
    term: 'Subagent',
    definition: 'A specialized AI assistant that handles specific tasks within a larger session.',
    example: 'A code-review subagent might analyze your code for quality issues while the main Claude handles other tasks.'
  },
  {
    term: 'TTS (Text-to-Speech)',
    definition: 'Voice notifications that announce important events or require user attention.',
    example: 'When a hook detects an error, TTS might announce "Error detected: Build failed" to get your attention.'
  },
  {
    term: 'Payload',
    definition: 'The data structure containing information about a hook event, including tool inputs, outputs, and metadata.',
    example: 'A PostToolUse payload contains the tool name, execution results, timing, and success status.'
  },
  {
    term: 'Observability',
    definition: 'The ability to monitor and understand what\'s happening in your Claude Code sessions through events and metrics.',
    example: 'The observability dashboard shows all hook events, helping you track tool usage and session performance.'
  },
  {
    term: 'Hook Chain',
    definition: 'The sequence of hooks that execute during a typical Claude Code operation.',
    example: 'A simple operation might trigger: SessionStart → UserPromptSubmit → PreToolUse → PostToolUse → Stop'
  }
];

// Computed properties
const activeHooksCount = computed(() => {
  const recentEvents = props.events.filter(e => 
    e.timestamp && (Date.now() - e.timestamp) < 24 * 60 * 60 * 1000
  );
  const uniqueHookTypes = new Set(recentEvents.map(e => e.hook_event_type));
  return uniqueHookTypes.size;
});

const recentEventsCount = computed(() => {
  return props.events.filter(e => 
    e.timestamp && (Date.now() - e.timestamp) < 60 * 60 * 1000
  ).length;
});

const topicsLearned = computed(() => learnedTopics.value.length);

const learningProgress = computed(() => {
  return (topicsLearned.value / hookExplanations.value.length) * 100;
});

// Event handlers
const handleShowInFlow = (_hookId: string) => {
  activeTab.value = 'flow';
  // Could scroll to or highlight the specific hook in the flow diagram
};

const handleSimulateHook = (hookId: string) => {
  // Simulate hook execution or show example data
  console.log('Simulating hook:', hookId);
};

const handleTopicLearned = (hookId: string) => {
  if (!learnedTopics.value.includes(hookId)) {
    learnedTopics.value.push(hookId);
    // Save to localStorage
    localStorage.setItem('educational-learned-topics', JSON.stringify(learnedTopics.value));
  }
};

const playScenario = (scenarioId: string) => {
  // Animate through the scenario's hook sequence
  console.log('Playing scenario:', scenarioId);
  activeTab.value = 'flow';
};

const getHookName = (hookId: string) => {
  const hook = getHookExplanation(hookId);
  return hook ? hook.name : hookId;
};

const resetProgress = () => {
  learnedTopics.value = [];
  localStorage.removeItem('educational-learned-topics');
};

// Load saved progress on mount
onMounted(() => {
  const saved = localStorage.getItem('educational-learned-topics');
  if (saved) {
    learnedTopics.value = JSON.parse(saved);
  }
});
</script>