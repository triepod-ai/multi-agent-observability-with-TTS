<template>
  <div class="help-page bg-gray-950 text-gray-100 min-h-screen">
    <!-- Modern Header with Gradient -->
    <div class="sticky top-0 bg-gradient-to-b from-gray-900 to-gray-950/95 backdrop-blur-sm border-b border-gray-800 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-white flex items-center gap-2">
              <span class="text-3xl">🪝</span>
              Claude Code Hooks Reference
            </h1>
            <p class="text-gray-400 text-sm mt-1">Complete documentation for all 9 Claude Code hooks</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">Source:</span>
            <span class="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded-full">
              Verified from Qdrant
            </span>
          </div>
        </div>

        <!-- Smart Search Bar -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search hooks by name, purpose, or configuration..."
            class="w-full pl-10 pr-10 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            @input="handleSearch"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <button v-if="searchQuery" @click="clearSearch" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Quick Filters -->
        <div class="flex flex-wrap gap-2 mt-3">
          <button
            v-for="filter in quickFilters"
            :key="filter.id"
            @click="toggleFilter(filter.id)"
            :class="[
              'px-3 py-1 rounded-full text-xs font-medium transition-all',
              activeFilters.includes(filter.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            ]"
          >
            {{ filter.icon }} {{ filter.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Hooks List -->
        <div class="lg:col-span-2 space-y-4">
          <TransitionGroup name="list" tag="div" class="space-y-3">
            <div
              v-for="hook in filteredHooks"
              :key="hook.id"
              @click="selectHook(hook)"
              :class="[
                'group cursor-pointer rounded-xl border transition-all duration-200',
                selectedHook?.id === hook.id
                  ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900/70'
              ]"
            >
              <div class="p-5">
                <!-- Hook Header -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                      {{ hook.icon }}
                    </div>
                    <div>
                      <h3 class="text-base font-semibold text-white">{{ hook.name }}</h3>
                      <p class="text-xs text-gray-500 mt-0.5">{{ hook.event }}</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">
                    #{{ hook.position }}
                  </span>
                </div>

                <!-- Hook Description -->
                <p class="text-sm text-gray-400 mb-3 line-clamp-2">{{ hook.description }}</p>

                <!-- Hook Metadata -->
                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    {{ hook.trigger }}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4v2m0-6V4"/>
                    </svg>
                    {{ hook.category }}
                  </span>
                  <span v-if="hook.canBlock" class="flex items-center gap-1 text-red-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                    </svg>
                    Can Block
                  </span>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <!-- Empty State -->
          <div v-if="filteredHooks.length === 0" class="text-center py-12">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <h3 class="text-lg font-medium text-gray-400 mb-2">No hooks found</h3>
            <p class="text-gray-600 mb-4">Try adjusting your search or filters</p>
            <button @click="resetFilters" class="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
              Reset Filters
            </button>
          </div>
        </div>

        <!-- Details Panel -->
        <div class="lg:col-span-1">
          <div class="sticky top-36">
            <Transition name="slide-fade">
              <div v-if="selectedHook" class="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                <!-- Hook Header -->
                <div class="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-5 border-b border-gray-800">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="text-2xl">{{ selectedHook.icon }}</div>
                    <div class="flex-1">
                      <h2 class="text-lg font-bold text-white">{{ selectedHook.name }}</h2>
                      <code class="text-xs text-gray-400 font-mono">{{ selectedHook.event }}</code>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <span v-for="tag in selectedHook.tags" :key="tag"
                          class="px-2 py-0.5 bg-gray-800/50 text-gray-300 text-xs rounded-full">
                      {{ tag }}
                    </span>
                  </div>
                </div>

                <!-- Hook Details -->
                <div class="p-5 space-y-5 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                  <!-- Purpose -->
                  <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Purpose</h3>
                    <p class="text-sm text-gray-300">{{ selectedHook.purpose }}</p>
                  </div>

                  <!-- Configuration -->
                  <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Configuration</h3>
                    <div class="bg-gray-950 rounded-lg p-3 border border-gray-800">
                      <pre class="text-xs text-gray-300 font-mono overflow-x-auto"><code>{{ selectedHook.config }}</code></pre>
                    </div>
                  </div>

                  <!-- Input/Output -->
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <h4 class="text-xs font-semibold text-green-400 mb-2">Input Schema</h4>
                      <div class="bg-gray-950 rounded p-2 border border-gray-800">
                        <pre class="text-xs text-gray-400 font-mono"><code>{{ selectedHook.inputSchema }}</code></pre>
                      </div>
                    </div>
                    <div>
                      <h4 class="text-xs font-semibold text-yellow-400 mb-2">Output Control</h4>
                      <div class="bg-gray-950 rounded p-2 border border-gray-800">
                        <pre class="text-xs text-gray-400 font-mono"><code>{{ selectedHook.outputControl }}</code></pre>
                      </div>
                    </div>
                  </div>

                  <!-- Use Cases -->
                  <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Common Use Cases</h3>
                    <ul class="space-y-1">
                      <li v-for="useCase in selectedHook.useCases" :key="useCase"
                          class="flex items-start gap-2 text-xs text-gray-300">
                        <span class="text-blue-400 mt-0.5">•</span>
                        <span>{{ useCase }}</span>
                      </li>
                    </ul>
                  </div>

                  <!-- Best Practices -->
                  <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Best Practices</h3>
                    <ul class="space-y-1">
                      <li v-for="practice in selectedHook.bestPractices" :key="practice"
                          class="flex items-start gap-2 text-xs text-gray-300">
                        <span class="text-green-400 mt-0.5">✓</span>
                        <span>{{ practice }}</span>
                      </li>
                    </ul>
                  </div>

                  <!-- Security Notes -->
                  <div v-if="selectedHook.security" class="bg-red-900/20 rounded-lg p-3 border border-red-900/50">
                    <h3 class="text-xs font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 3 1.732 3z"/>
                      </svg>
                      Security Considerations
                    </h3>
                    <p class="text-xs text-gray-300">{{ selectedHook.security }}</p>
                  </div>

                  <!-- Actions -->
                  <div class="flex gap-2 pt-3 border-t border-gray-800">
                    <button @click="copyConfig(selectedHook)"
                            class="flex-1 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-xs font-medium transition-colors">
                      Copy Config
                    </button>
                    <button @click="openDocs(selectedHook)"
                            class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors">
                      View Docs
                    </button>
                  </div>
                </div>
              </div>

              <!-- No Selection -->
              <div v-else class="bg-gray-900/50 rounded-xl border border-gray-800 p-8 text-center">
                <div class="text-gray-700 mb-4">
                  <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
                <h3 class="text-base font-medium text-gray-400 mb-2">Select a Hook</h3>
                <p class="text-xs text-gray-600">Click on any hook to view detailed information</p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Hook data structure based on Qdrant documentation
interface HookInfo {
  id: string
  name: string
  event: string
  icon: string
  position: number
  category: string
  trigger: string
  description: string
  purpose: string
  canBlock: boolean
  tags: string[]
  config: string
  inputSchema: string
  outputControl: string
  useCases: string[]
  bestPractices: string[]
  security?: string
}

// State
const searchQuery = ref('')
const selectedHook = ref<HookInfo | null>(null)
const activeFilters = ref<string[]>([])

// Verified hook data from Qdrant documentation
const hooks = ref<HookInfo[]>([
  {
    id: 'session_start',
    name: 'SessionStart Hook',
    event: 'SessionStart',
    icon: '🚀',
    position: 1,
    category: 'Session',
    trigger: 'Session start/resume',
    description: 'Runs when Claude Code starts a new session or resumes an existing session. Essential for loading development context.',
    purpose: 'Load development context at session start including issues, recent changes, and project status. Supports startup, resume, and clear matchers.',
    canBlock: false,
    tags: ['Context', 'Initialization', 'Project Setup'],
    config: `{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/session-init.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "transcript_path": "~/.claude/...",
  "hook_event_name": "SessionStart",
  "source": "startup|resume|clear"
}`,
    outputControl: `Exit 0: Success, stdout added to context
Exit 2: N/A
Other: Non-blocking error`,
    useCases: [
      'Loading development context at session start',
      'Initializing project-specific settings',
      'Adding current project status to context',
      'Loading recent changes or issues',
      'Setting up environment variables'
    ],
    bestPractices: [
      'Keep initialization scripts fast (<5s)',
      'Load only essential context initially',
      'Use project-specific scripts with $CLAUDE_PROJECT_DIR',
      'Handle errors gracefully with proper exit codes',
      'Consider using different scripts for startup vs resume'
    ]
  },
  {
    id: 'user_prompt_submit',
    name: 'UserPromptSubmit Hook',
    event: 'UserPromptSubmit',
    icon: '💬',
    position: 2,
    category: 'User Input',
    trigger: 'Before user prompt processing',
    description: 'Runs after user submits a prompt but before Claude processes it. Can modify or block the prompt.',
    purpose: 'Intercept and potentially modify user prompts before processing. Useful for prompt expansion, validation, or blocking certain requests.',
    canBlock: true,
    tags: ['Input', 'Validation', 'Security'],
    config: `{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/prompt-validator.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "transcript_path": "~/.claude/...",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "user's prompt text"
}`,
    outputControl: `Exit 0: Continue with prompt
Exit 2: Block with error message
JSON: {"continue": bool, "prompt": "modified"}`,
    useCases: [
      'Prompt validation and sanitization',
      'Auto-expanding abbreviated commands',
      'Adding context to prompts',
      'Blocking sensitive operations',
      'Logging user interactions'
    ],
    bestPractices: [
      'Validate prompts without being overly restrictive',
      'Provide clear feedback when blocking',
      'Consider prompt expansion for common patterns',
      'Log interactions for audit purposes',
      'Keep processing time minimal'
    ],
    security: 'Can prevent execution of dangerous prompts or commands. Essential for environments with strict security requirements.'
  },
  {
    id: 'pre_tool_use',
    name: 'PreToolUse Hook',
    event: 'PreToolUse',
    icon: '🛡️',
    position: 3,
    category: 'Security',
    trigger: 'Before tool execution',
    description: 'Security gate that runs before any tool execution. Exit code 1 completely prevents tool execution.',
    purpose: 'Validate and potentially block tool execution. Critical security checkpoint for preventing unauthorized operations.',
    canBlock: true,
    tags: ['Security', 'Validation', 'Permissions'],
    config: `{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "/path/to/security-check.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "tool_name": "Bash",
  "tool_input": {...},
  "hook_event_name": "PreToolUse"
}`,
    outputControl: `Exit 0: Allow execution
Exit 1: BLOCK execution
Exit 2: Block with feedback
JSON: {"decision": "approve|block"}`,
    useCases: [
      'Block modifications to production files',
      'Prevent sensitive directory access',
      'Validate command safety',
      'Enforce permission boundaries',
      'Custom security policies'
    ],
    bestPractices: [
      'Always validate and sanitize inputs',
      'Use absolute paths for security scripts',
      'Quote shell variables properly',
      'Check for path traversal attempts',
      'Log all blocked operations'
    ],
    security: 'Most critical security hook. Exit code 1 is the only way to completely prevent tool execution. Essential for production environments.'
  },
  {
    id: 'post_tool_use',
    name: 'PostToolUse Hook',
    event: 'PostToolUse',
    icon: '📊',
    position: 4,
    category: 'Monitoring',
    trigger: 'After tool completion',
    description: 'Runs immediately after successful tool execution. Sees everything that happens - critical for monitoring.',
    purpose: 'Monitor tool execution, collect metrics, detect errors, and trigger alerts. Essential for observability.',
    canBlock: false,
    tags: ['Monitoring', 'Metrics', 'Logging'],
    config: `{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|MultiEdit|Write",
      "hooks": [{
        "type": "command",
        "command": "/path/to/formatter.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "tool_name": "Edit",
  "tool_input": {...},
  "tool_output": {...},
  "hook_event_name": "PostToolUse"
}`,
    outputControl: `Exit 0: Success
Exit 2: Feed error to Claude
Other: Non-blocking error`,
    useCases: [
      'Auto-formatting code after edits',
      'Running tests after changes',
      'Collecting metrics and analytics',
      'Detecting and alerting on errors',
      'Triggering CI/CD pipelines'
    ],
    bestPractices: [
      'Run formatters on appropriate file types',
      'Collect comprehensive metrics',
      'Handle large outputs efficiently',
      'Consider async processing for heavy tasks',
      'Maintain audit logs'
    ]
  },
  {
    id: 'notification',
    name: 'Notification Hook',
    event: 'Notification',
    icon: '🔔',
    position: 5,
    category: 'System',
    trigger: 'Claude notifications',
    description: 'Runs when Claude Code sends notifications. Customize how you get alerted.',
    purpose: 'Customize notification delivery. Replace or augment default notifications with custom alerts.',
    canBlock: false,
    tags: ['Alerts', 'UX', 'Integration'],
    config: `{
  "hooks": {
    "Notification": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/notifier.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "notification_type": "permission_request",
  "message": "notification text",
  "hook_event_name": "Notification"
}`,
    outputControl: `Exit 0: Success
Exit 2: Show error
Other: Non-blocking`,
    useCases: [
      'Custom notification sounds',
      'Slack/Discord integration',
      'Desktop notifications',
      'Email alerts for critical events',
      'Custom notification filtering'
    ],
    bestPractices: [
      'Keep notifications non-intrusive',
      'Provide notification preferences',
      'Handle notification failures gracefully',
      'Consider rate limiting',
      'Support multiple notification channels'
    ]
  },
  {
    id: 'subagent_stop',
    name: 'SubagentStop Hook',
    event: 'SubagentStop',
    icon: '🤖',
    position: 6,
    category: 'Agents',
    trigger: 'Subagent completion',
    description: 'Runs when a subagent completes its task. Track specialized AI delegation work.',
    purpose: 'Monitor subagent execution, collect results, and maintain accountability for AI delegation.',
    canBlock: false,
    tags: ['Subagents', 'Delegation', 'Tracking'],
    config: `{
  "hooks": {
    "SubagentStop": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/agent-tracker.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "subagent_name": "code-reviewer",
  "duration_ms": 1234,
  "result": "success",
  "hook_event_name": "SubagentStop"
}`,
    outputControl: `Exit 0: Success
Exit 2: Show error
Other: Non-blocking`,
    useCases: [
      'Track subagent performance',
      'Collect delegation metrics',
      'Log subagent results',
      'TTS notifications for completion',
      'Cost tracking for delegated work'
    ],
    bestPractices: [
      'Filter generic vs specialized agents',
      'Track performance metrics',
      'Log results for analysis',
      'Consider TTS filtering to reduce spam',
      'Maintain subagent audit trail'
    ]
  },
  {
    id: 'stop',
    name: 'Stop Hook',
    event: 'Stop',
    icon: '💾',
    position: 7,
    category: 'Session',
    trigger: 'Claude finishes response',
    description: 'Runs when Claude Code finishes responding. Last chance to capture insights and prepare handoff.',
    purpose: 'Capture session state, save progress, generate summaries, and prepare handoff context for next session.',
    canBlock: false,
    tags: ['Session', 'Summary', 'Handoff'],
    config: `{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/session-save.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "transcript_path": "~/.claude/...",
  "hook_event_name": "Stop"
}`,
    outputControl: `Exit 0: Success
Exit 2: Show error
Other: Non-blocking`,
    useCases: [
      'Save session progress',
      'Generate session summaries',
      'Export to Redis/database',
      'Prepare handoff context',
      'Backup critical data'
    ],
    bestPractices: [
      'Capture essential context only',
      'Generate concise summaries',
      'Use appropriate storage TTLs',
      'Handle large sessions efficiently',
      'Ensure data persistence'
    ]
  },
  {
    id: 'precompact',
    name: 'PreCompact Hook',
    event: 'PreCompact',
    icon: '🗜️',
    position: 8,
    category: 'Optimization',
    trigger: 'Before context compaction',
    description: 'Runs before Claude compacts conversation history. Opportunity to save important context.',
    purpose: 'Save important context before compaction, generate summaries, and ensure critical information persists.',
    canBlock: false,
    tags: ['Memory', 'Optimization', 'Context'],
    config: `{
  "hooks": {
    "PreCompact": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/pre-compact.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "transcript_path": "~/.claude/...",
  "hook_event_name": "PreCompact",
  "tokens_before": 50000
}`,
    outputControl: `Exit 0: Success
Exit 2: Show error
Other: Non-blocking`,
    useCases: [
      'Save context before compaction',
      'Generate conversation summaries',
      'Extract key decisions and insights',
      'Backup important code snippets',
      'Prepare session continuity data'
    ],
    bestPractices: [
      'Process quickly before compaction',
      'Focus on extracting key insights',
      'Save to appropriate storage',
      'Consider session continuity',
      'Handle token limits gracefully'
    ]
  },
  {
    id: 'session_end',
    name: 'SessionEnd Hook',
    event: 'SessionEnd',
    icon: '🚪',
    position: 9,
    category: 'Session',
    trigger: 'Session termination',
    description: 'Runs when Claude Code session ends. Final opportunity for cleanup, logging, and state persistence.',
    purpose: 'Handle session shutdown gracefully by performing cleanup, closing resources, logging statistics, and saving final state.',
    canBlock: false,
    tags: ['Session', 'Cleanup', 'Logging'],
    config: `{
  "hooks": {
    "SessionEnd": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/session-cleanup.sh"
      }]
    }]
  }
}`,
    inputSchema: `{
  "session_id": "abc123",
  "transcript_path": "~/.claude/...",
  "hook_event_name": "SessionEnd",
  "exit_reason": "user_initiated|timeout|error"
}`,
    outputControl: `Exit 0: Success
Exit 2: Show error
Other: Non-blocking`,
    useCases: [
      'Close database connections and resources',
      'Save final session state',
      'Log session statistics and duration',
      'Cleanup temporary files',
      'Send session completion notifications'
    ],
    bestPractices: [
      'Keep cleanup operations fast',
      'Handle both graceful and forced exits',
      'Log critical errors that occur during cleanup',
      'Ensure cleanup is idempotent',
      'Save state before resource deallocation'
    ],
    security: 'Ensure sensitive resources are properly closed and credentials are cleared. Handle cleanup failures gracefully to prevent resource leaks.'
  }
])

// Quick filter options
const quickFilters = [
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'session', label: 'Session', icon: '🚀' },
  { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  { id: 'canBlock', label: 'Can Block', icon: '🚫' }
]

// Computed
const filteredHooks = computed(() => {
  let result = hooks.value

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(hook =>
      hook.name.toLowerCase().includes(query) ||
      hook.description.toLowerCase().includes(query) ||
      hook.purpose.toLowerCase().includes(query) ||
      hook.config.toLowerCase().includes(query) ||
      hook.useCases.some(uc => uc.toLowerCase().includes(query)) ||
      hook.bestPractices.some(bp => bp.toLowerCase().includes(query))
    )
  }

  // Apply filters
  if (activeFilters.value.includes('security')) {
    result = result.filter(h => h.category === 'Security' || h.canBlock)
  }
  if (activeFilters.value.includes('session')) {
    result = result.filter(h => h.category === 'Session')
  }
  if (activeFilters.value.includes('monitoring')) {
    result = result.filter(h => h.category === 'Monitoring' || h.event === 'PostToolUse')
  }
  if (activeFilters.value.includes('canBlock')) {
    result = result.filter(h => h.canBlock)
  }

  return result.sort((a, b) => a.position - b.position)
})

// Methods
const selectHook = (hook: HookInfo) => {
  selectedHook.value = hook
}

const handleSearch = () => {
  // Handled by computed
}

const clearSearch = () => {
  searchQuery.value = ''
}

const toggleFilter = (filterId: string) => {
  const index = activeFilters.value.indexOf(filterId)
  if (index > -1) {
    activeFilters.value.splice(index, 1)
  } else {
    activeFilters.value.push(filterId)
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  activeFilters.value = []
}

const copyConfig = async (hook: HookInfo) => {
  try {
    await navigator.clipboard.writeText(hook.config)
    console.log('Configuration copied to clipboard')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const openDocs = (hook: HookInfo) => {
  // Open official Claude Code documentation
  window.open('https://docs.anthropic.com/en/docs/claude-code/hooks', '_blank')
}

// Auto-select first hook on mount
onMounted(() => {
  if (hooks.value.length > 0) {
    selectedHook.value = hooks.value[0]
  }
})
</script>

<style scoped>
/* Animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1f2937;
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>