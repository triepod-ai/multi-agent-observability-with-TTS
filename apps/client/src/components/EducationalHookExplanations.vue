<template>
  <ProgressiveDisclosure
    title="Claude Code Hook System"
    description="Learn about the 8 Claude Code hooks with progressive complexity levels"
    :sections="hookSections"
    :disclosure-levels="disclosureLevels"
    default-level="overview"
    :max-depth="4"
    :show-breadcrumbs="true"
    :show-quick-access="true"
    :show-search="true"
    :show-progress="true"
    :persist-state="true"
    state-key="hook-explanations"
    @level-change="handleLevelChange"
    @section-explore="handleSectionExplore"
    @search-performed="handleSearchPerformed"
    @progress-update="handleProgressUpdate"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEducationalMode } from '../composables/useEducationalMode';
import ProgressiveDisclosure from './ProgressiveDisclosure.vue';
import { getExamplesForHook } from '../data/hookExamples';
import type { CodeExample } from './InteractiveCodeExample.vue';

const { hookExplanations } = useEducationalMode();

const emit = defineEmits<{
  showInFlow: [hookId: string];
  simulateHook: [hookId: string];
  topicLearned: [hookId: string];
  runExample: [example: CodeExample];
  openDocs: [url: string];
}>();

// Progressive disclosure levels specific to Claude Code hooks
const disclosureLevels = [
  { 
    id: 'overview', 
    label: 'Overview', 
    description: 'Hook names and basic purpose', 
    color: 'bg-green-500' 
  },
  { 
    id: 'details', 
    label: 'Details', 
    description: 'When hooks run and why they matter', 
    color: 'bg-blue-500' 
  },
  { 
    id: 'advanced', 
    label: 'Advanced', 
    description: 'Code examples and best practices', 
    color: 'bg-purple-500' 
  },
  { 
    id: 'reference', 
    label: 'Reference', 
    description: 'Complete implementation guide', 
    color: 'bg-red-500' 
  }
];

// Transform hook explanations into progressive disclosure format
const hookSections = computed(() => {
  return hookExplanations.value.map(hook => ({
    id: hook.id,
    title: hook.name,
    subtitle: hook.simpleDescription,
    icon: hook.icon,
    badge: `Hook #${hook.flowPosition}`,
    level: 0, // Always visible
    content: `
      <div class="space-y-6">
        <!-- Critical Concept Callout for important hooks -->
        ${getCriticalConceptCallout(hook.id)}
        
        <!-- Basic Description (Overview level) -->
        <div class="prose prose-sm prose-invert max-w-none">
          <p class="text-gray-300 leading-relaxed">${hook.detailedDescription}</p>
        </div>
      </div>
    `,
    children: [
      // Details Level
      {
        id: `${hook.id}-details`,
        title: 'When & Why',
        subtitle: 'Execution timing and importance',
        icon: '⏰',
        level: 1,
        minLevel: 1, // Only show at details level and above
        content: `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="text-sm font-medium text-green-400 mb-2 flex items-center">
                <span class="mr-1">⏰</span>
                When It Runs
              </h4>
              <p class="text-sm text-gray-300">${hook.whenItRuns}</p>
            </div>
            <div>
              <h4 class="text-sm font-medium text-yellow-400 mb-2 flex items-center">
                <span class="mr-1">💡</span>
                Why It Matters
              </h4>
              <p class="text-sm text-gray-300">${hook.whyItMatters}</p>
            </div>
          </div>
        `
      },
      {
        id: `${hook.id}-example`,
        title: 'Real World Example',
        subtitle: 'Practical application scenario',
        icon: '🌟',
        level: 1,
        minLevel: 1,
        content: `
          <div class="bg-gray-900 rounded-md p-4 border border-gray-600">
            <p class="text-sm text-gray-300 italic">${hook.realWorldExample}</p>
          </div>
        `
      },
      // Advanced Level
      {
        id: `${hook.id}-code`,
        title: 'Code Examples',
        subtitle: 'Interactive implementation examples',
        icon: '💻',
        level: 2,
        minLevel: 2, // Only show at advanced level and above
        content: `
          <div class="space-y-3">
            ${generateCodeExamplesHTML(hook.id)}
          </div>
        `,
        children: getCodeExampleChildren(hook.id)
      },
      {
        id: `${hook.id}-practices`,
        title: 'Best Practices & Issues',
        subtitle: 'Do\'s and don\'ts for implementation',
        icon: '✅',
        level: 2,
        minLevel: 2,
        content: `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="text-sm font-medium text-green-400 mb-2 flex items-center">
                <span class="mr-1">✅</span>
                Best Practices
              </h4>
              <ul class="space-y-1">
                ${hook.bestPractices.map(practice => `
                  <li class="text-xs text-gray-300 flex items-start">
                    <span class="text-green-400 mr-2 flex-shrink-0">•</span>
                    <span>${practice}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            <div>
              <h4 class="text-sm font-medium text-red-400 mb-2 flex items-center">
                <span class="mr-1">⚠️</span>
                Common Issues
              </h4>
              <ul class="space-y-1">
                ${hook.commonIssues.map(issue => `
                  <li class="text-xs text-gray-300 flex items-start">
                    <span class="text-red-400 mr-2 flex-shrink-0">•</span>
                    <span>${issue}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        `
      },
      // Reference Level
      {
        id: `${hook.id}-reference`,
        title: 'Complete Reference',
        subtitle: 'Full implementation guide with actions',
        icon: '📚',
        level: 3,
        minLevel: 3, // Only show at reference level
        content: `
          <div class="space-y-4">
            <!-- Connection Information -->
            <div class="bg-gray-900 p-3 rounded border border-gray-700">
              <h5 class="text-sm font-medium text-cyan-400 mb-2">Hook Connections</h5>
              <p class="text-xs text-gray-400">${hook.connections.length} related hooks</p>
            </div>
            
            <!-- Quick Actions -->
            <div class="flex items-center justify-between pt-2 border-t border-gray-700">
              <div class="flex items-center space-x-2 text-xs text-gray-400">
                <span>Hook #${hook.flowPosition}</span>
                <span>•</span>
                <span>${hook.connections.length} connections</span>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  onclick="window.dispatchEvent(new CustomEvent('showInFlow', { detail: '${hook.id}' }))"
                  class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Show in Flow
                </button>
                <button
                  onclick="window.dispatchEvent(new CustomEvent('simulateHook', { detail: '${hook.id}' }))"
                  class="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Simulate
                </button>
              </div>
            </div>
          </div>
        `
      }
    ],
    metadata: {
      hookId: hook.id,
      flowPosition: hook.flowPosition,
      connections: hook.connections.length,
      type: 'claude-code-hook'
    }
  }));
});

// Helper functions
function getCriticalConceptCallout(hookId: string): string {
  const callouts: Record<string, string> = {
    pre_tool_use: `
      <div class="p-4 bg-red-900/20 border border-red-700 rounded-lg mb-4">
        <div class="flex items-start space-x-3">
          <span class="text-xl">🚫</span>
          <div>
            <h4 class="text-sm font-medium text-red-400 mb-1">Security Gate: Can Block Tool Execution</h4>
            <p class="text-xs text-gray-300 mb-2">
              This hook is your <strong>security guardian</strong>. If it returns exit code 1, 
              the tool execution is <em>completely prevented</em> - Claude never gets to run the command.
            </p>
            <p class="text-xs text-gray-400">
              Use this for validating dangerous operations, checking permissions, or implementing safety policies.
            </p>
          </div>
        </div>
      </div>
    `,
    post_tool_use: `
      <div class="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg mb-4">
        <div class="flex items-start space-x-3">
          <span class="text-xl">🔍</span>
          <div>
            <h4 class="text-sm font-medium text-yellow-400 mb-1">Error Detection: Essential for Monitoring</h4>
            <p class="text-xs text-gray-300 mb-2">
              This hook sees <strong>everything</strong> that happens with tools. It's critical for detecting errors, 
              measuring performance, and understanding what Claude actually accomplished.
            </p>
            <p class="text-xs text-gray-400">
              Parse tool outputs here to catch failures, log metrics, and trigger alerts.
            </p>
          </div>
        </div>
      </div>
    `,
    session_start: `
      <div class="p-4 bg-blue-900/20 border border-blue-700 rounded-lg mb-4">
        <div class="flex items-start space-x-3">
          <span class="text-xl">🏗️</span>
          <div>
            <h4 class="text-sm font-medium text-blue-400 mb-1">Context is King: Sets the Foundation</h4>
            <p class="text-xs text-gray-300 mb-2">
              The <strong>quality of this hook determines Claude's effectiveness</strong>. Loading proper context 
              here means Claude understands your project from the very first interaction.
            </p>
            <p class="text-xs text-gray-400">
              Load PROJECT_STATUS.md, git status, and previous session handoffs for maximum effectiveness.
            </p>
          </div>
        </div>
      </div>
    `,
    subagent_stop: `
      <div class="p-4 bg-green-900/20 border border-green-700 rounded-lg mb-4">
        <div class="flex items-start space-x-3">
          <span class="text-xl">🤖</span>
          <div>
            <h4 class="text-sm font-medium text-green-400 mb-1">Agent Accountability: Track Specialized Work</h4>
            <p class="text-xs text-gray-300 mb-2">
              This hook provides <strong>accountability for delegated AI work</strong>. It's essential for understanding 
              which agents are effective and tracking the value of AI task delegation.
            </p>
            <p class="text-xs text-gray-400">
              Includes intelligent TTS filtering - only specialized agents announce completion, not generic utilities.
            </p>
          </div>
        </div>
      </div>
    `,
    stop: `
      <div class="p-4 bg-blue-900/20 border border-blue-700 rounded-lg mb-4">
        <div class="flex items-start space-x-3">
          <span class="text-xl">💾</span>
          <div>
            <h4 class="text-sm font-medium text-blue-400 mb-1">Session Closure: Preserve What Matters</h4>
            <p class="text-xs text-gray-300 mb-2">
              Your <strong>last chance to capture session insights</strong> before Claude stops working. 
              This hook should summarize achievements and prepare handoff context for future sessions.
            </p>
            <p class="text-xs text-gray-400">
              Generate meaningful summaries that help resume work seamlessly later.
            </p>
          </div>
        </div>
      </div>
    `
  };
  
  return callouts[hookId] || '';
}

function generateCodeExamplesHTML(hookId: string): string {
  const examples = getExamplesForHook(hookId);
  
  if (examples.length === 0) {
    const hook = hookExplanations.value.find(h => h.id === hookId);
    if (hook?.codeExample) {
      return `
        <div class="bg-gray-900 rounded-md p-3 border border-gray-600">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400">Legacy Example</span>
            <button
              onclick="navigator.clipboard.writeText(${JSON.stringify(hook.codeExample)})"
              class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
            >
              Copy
            </button>
          </div>
          <pre class="text-xs text-gray-300 overflow-x-auto"><code>${hook.codeExample}</code></pre>
        </div>
      `;
    }
    return '<p class="text-sm text-gray-400 italic">No code examples available yet.</p>';
  }
  
  return examples.map(example => `
    <div class="bg-gray-900 rounded-md p-3 border border-gray-600">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-cyan-400">${example.title}</span>
        <div class="flex items-center space-x-2">
          <button
            onclick="window.dispatchEvent(new CustomEvent('runExample', { detail: ${JSON.stringify(example)} }))"
            class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition-colors"
          >
            Run
          </button>
          <button
            onclick="navigator.clipboard.writeText(${JSON.stringify(example.code)})"
            class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
      <p class="text-xs text-gray-400 mb-2">${example.description}</p>
      <pre class="text-xs text-gray-300 overflow-x-auto"><code>${example.code}</code></pre>
    </div>
  `).join('');
}

function getCodeExampleChildren(hookId: string): any[] {
  const examples = getExamplesForHook(hookId);
  
  return examples.map((example, index) => ({
    id: `${hookId}-example-${index}`,
    title: example.title,
    subtitle: example.description,
    icon: '🔧',
    level: 3,
    minLevel: 3,
    content: `
      <div class="bg-gray-900 rounded-md p-3 border border-gray-600">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-cyan-400">${example.title}</span>
          <div class="flex items-center space-x-2">
            <button
              onclick="window.dispatchEvent(new CustomEvent('runExample', { detail: ${JSON.stringify(example)} }))"
              class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition-colors"
            >
              Run Example
            </button>
            <button
              onclick="navigator.clipboard.writeText(${JSON.stringify(example.code)})"
              class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
            >
              Copy Code
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-400 mb-2">${example.description}</p>
        <pre class="text-xs text-gray-300 overflow-x-auto"><code>${example.code}</code></pre>
        ${example.expectedOutput ? `
          <div class="mt-2 pt-2 border-t border-gray-700">
            <span class="text-xs text-gray-400">Expected Output:</span>
            <pre class="text-xs text-green-300 mt-1"><code>${example.expectedOutput}</code></pre>
          </div>
        ` : ''}
      </div>
    `,
    metadata: {
      exampleId: example.id,
      language: example.language,
      difficulty: example.difficulty
    }
  }));
}

// Event handlers for progressive disclosure
const handleLevelChange = (level: string) => {
  console.log('Disclosure level changed to:', level);
};

const handleSectionExplore = (sectionId: string, path: string[]) => {
  // Mark hook as learned when explored
  const hookId = path[0];
  if (hookId) {
    emit('topicLearned', hookId);
  }
};

const handleSearchPerformed = (query: string, results: any[]) => {
  console.log('Search performed:', query, 'Results:', results.length);
};

const handleProgressUpdate = (percentage: number) => {
  console.log('Learning progress:', percentage + '%');
};

// Listen for custom events from inline buttons
if (typeof window !== 'undefined') {
  window.addEventListener('showInFlow', (event: any) => {
    emit('showInFlow', event.detail);
  });
  
  window.addEventListener('simulateHook', (event: any) => {
    emit('simulateHook', event.detail);
  });
  
  window.addEventListener('runExample', (event: any) => {
    emit('runExample', event.detail);
  });
}
</script>

