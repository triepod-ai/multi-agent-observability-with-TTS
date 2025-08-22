import { ref, computed } from 'vue';
import type { HookExplanation, HookFlowStep } from '../types';

const isEducationalMode = ref<boolean>(false);

// Hook explanations with beginner-friendly content
const hookExplanations: HookExplanation[] = [
  {
    id: 'session_start',
    name: 'SessionStart',
    icon: '🚀',
    simpleDescription: 'Sets up your workspace when you start a new Claude Code session',
    detailedDescription: 'The SessionStart hook initializes the Claude Code environment by loading project context, git status, previous session data, and any necessary configuration. It ensures Claude understands your project from the very beginning.',
    realWorldExample: 'When you open Claude Code in a project folder, this hook loads your README.md, checks your git status, and retrieves any session handoffs from Redis to give Claude full context of where you left off.',
    codeExample: `{
  "hook_event_type": "SessionStart",
  "payload": {
    "project_name": "my-project",
    "git_status": "clean",
    "handoff_context": "Previous session: Added login feature"
  }
}`,
    whenItRuns: 'Every time you begin working on a project or resume a session',
    whyItMatters: 'Ensures Claude understands your project context and can provide relevant assistance from the start',
    bestPractices: [
      'Keep your PROJECT_STATUS.md updated for better context loading',
      'Use meaningful git commit messages for better session continuity',
      'Enable Redis handoffs for seamless session transitions'
    ],
    commonIssues: [
      'Hook may fail if project files are corrupted or missing',
      'Large projects may cause slower startup times',
      'Permission issues can prevent context loading'
    ],
    flowPosition: 1,
    connections: ['user_prompt_submit']
  },
  {
    id: 'user_prompt_submit',
    name: 'UserPromptSubmit',
    icon: '💬',
    simpleDescription: 'Captures and logs every message you send to Claude',
    detailedDescription: 'The UserPromptSubmit hook records all user interactions before Claude processes them, enabling session logging, analytics, and debugging. It helps track the conversation flow and user intent.',
    realWorldExample: 'When you type "Help me fix this bug" and press enter, this hook captures your message, timestamps it, and logs it before Claude starts thinking about your request.',
    codeExample: `{
  "hook_event_type": "UserPromptSubmit",
  "payload": {
    "prompt": "Help me implement user authentication",
    "session_id": "abc-123",
    "timestamp": 1704067200000
  }
}`,
    whenItRuns: 'Immediately after you send a message but before Claude processes it',
    whyItMatters: 'Provides a complete record of user interactions for debugging and analytics',
    bestPractices: [
      'Be specific in your prompts for better logging and results',
      'Use consistent terminology for easier session analysis',
      'Break complex requests into smaller, trackable parts'
    ],
    commonIssues: [
      'Very long prompts might be truncated in logs',
      'Special characters could cause logging issues',
      'High-frequency requests might impact performance'
    ],
    flowPosition: 2,
    connections: ['pre_tool_use']
  },
  {
    id: 'pre_tool_use',
    name: 'PreToolUse',
    icon: '⚡',
    simpleDescription: 'Validates and announces tools before Claude uses them',
    detailedDescription: 'The PreToolUse hook intercepts tool usage before execution, providing security validation, context-aware notifications, and usage tracking. It acts as a safety gate for potentially dangerous operations.',
    realWorldExample: 'When Claude wants to run "npm install", this hook first announces "Claude is about to run a bash command" and validates that the operation is safe before allowing it to proceed.',
    codeExample: `{
  "hook_event_type": "PreToolUse",
  "payload": {
    "tool_name": "Bash",
    "tool_input": {"command": "npm install"},
    "validation_status": "approved",
    "security_risk": "low"
  }
}`,
    whenItRuns: 'Just before Claude executes any tool (Read, Write, Bash, etc.)',
    whyItMatters: 'Provides security validation and user awareness of what Claude is about to do',
    bestPractices: [
      'Review high-risk tool operations (Bash, Write) carefully',
      'Enable TTS notifications for security-critical tools',
      'Monitor tool usage patterns for unusual activity'
    ],
    commonIssues: [
      'May cause delays for tool execution',
      'False positives on security validation',
      'Can generate too many notifications if not filtered properly'
    ],
    flowPosition: 3,
    connections: ['post_tool_use']
  },
  {
    id: 'post_tool_use',
    name: 'PostToolUse',
    icon: '✅',
    simpleDescription: 'Captures tool results and detects errors after execution',
    detailedDescription: 'The PostToolUse hook processes tool execution results, detects errors, measures performance, and provides completion notifications. It\'s essential for understanding what actually happened during tool execution.',
    realWorldExample: 'After Claude runs "git status", this hook captures the output, checks if the command succeeded, measures how long it took, and announces "Git command completed successfully" if everything worked.',
    codeExample: `{
  "hook_event_type": "PostToolUse", 
  "payload": {
    "tool_name": "Bash",
    "tool_output": "On branch main\\nnothing to commit",
    "execution_time_ms": 250,
    "success": true
  }
}`,
    whenItRuns: 'Immediately after any tool finishes executing',
    whyItMatters: 'Critical for error detection, performance monitoring, and understanding tool effectiveness',
    bestPractices: [
      'Monitor error rates to identify problematic tools or commands',
      'Use execution timing to optimize performance',
      'Pay attention to error notifications for troubleshooting'
    ],
    commonIssues: [
      'May miss errors in tools that don\'t report them properly',
      'Large tool outputs could impact performance',
      'Complex nested tool structures might not parse correctly'
    ],
    flowPosition: 4,
    connections: ['subagent_stop', 'stop']
  },
  {
    id: 'subagent_stop',
    name: 'SubagentStop',
    icon: '🤖',
    simpleDescription: 'Announces when AI agents complete their specialized tasks',
    detailedDescription: 'The SubagentStop hook manages completion of specialized AI agents (subagents), providing intelligent TTS filtering, performance metrics, and task summaries. It helps track the effectiveness of agent delegation.',
    realWorldExample: 'When a code-review agent finishes analyzing your code, this hook announces "Code review completed: Found 3 suggestions for improvement" and logs the agent\'s performance metrics.',
    codeExample: `{
  "hook_event_type": "SubagentStop",
  "payload": {
    "agent_type": "code-reviewer", 
    "agent_name": "Code Quality Agent",
    "task_summary": "Reviewed 5 files, found 3 issues",
    "execution_time_ms": 15000,
    "success": true
  }
}`,
    whenItRuns: 'When any specialized AI agent completes its assigned task',
    whyItMatters: 'Tracks agent effectiveness and provides accountability for delegated work',
    bestPractices: [
      'Create specialized agents for recurring tasks',
      'Monitor agent performance to optimize task delegation',
      'Use meaningful agent names for better tracking'
    ],
    commonIssues: [
      'Generic agents may spam notifications (filtered automatically)',
      'Agent timeouts might not be properly reported',
      'Complex agent hierarchies can be hard to track'
    ],
    flowPosition: 5,
    connections: ['stop']
  },
  {
    id: 'stop',
    name: 'Stop',
    icon: '🛑',
    simpleDescription: 'Provides intelligent summaries when Claude finishes working',
    detailedDescription: 'The Stop hook analyzes the entire session when Claude finishes, generating context-aware summaries of work completed, files modified, and outcomes achieved. It provides closure and context for the session.',
    realWorldExample: 'When you finish a coding session, this hook announces "Session completed: Implemented user authentication with 4 new files and 12 tests passing" giving you a clear summary of what was accomplished.',
    codeExample: `{
  "hook_event_type": "Stop",
  "payload": {
    "session_summary": "Implemented authentication system",
    "files_modified": 4,
    "tools_used": ["Read", "Write", "Bash"],
    "errors_encountered": 0,
    "duration_minutes": 25
  }
}`,
    whenItRuns: 'When Claude Code finishes working on a task or you end a session',
    whyItMatters: 'Provides valuable context and closure, helping you understand what was accomplished',
    bestPractices: [
      'Use summaries to track project progress over time',
      'Pay attention to error counts for quality assessment',
      'Review file modification patterns for better organization'
    ],
    commonIssues: [
      'May not detect all types of work if tools don\'t report properly',
      'Complex sessions might have oversimplified summaries',
      'Background processes might not be included in the summary'
    ],
    flowPosition: 6,
    connections: ['precompact']
  },
  {
    id: 'notification',
    name: 'Notification',
    icon: '🔔',
    simpleDescription: 'Handles permission requests and system alerts',
    detailedDescription: 'The Notification hook manages system notifications, permission requests, idle timeouts, and user interaction prompts. It ensures important system events are communicated effectively to the user.',
    realWorldExample: 'When Claude needs permission to modify system files, this hook displays a permission dialog and announces "Claude needs permission to edit configuration files" to get your attention.',
    codeExample: `{
  "hook_event_type": "Notification",
  "payload": {
    "notification_type": "permission_request",
    "message": "Request to modify system files",
    "requires_user_action": true,
    "priority": "high"
  }
}`,
    whenItRuns: 'When system events require user attention or permission',
    whyItMatters: 'Ensures critical system events are communicated and user consent is obtained',
    bestPractices: [
      'Respond promptly to permission requests to avoid timeouts',
      'Configure notification preferences to avoid spam',
      'Pay special attention to security-related notifications'
    ],
    commonIssues: [
      'Too many notifications can become overwhelming',
      'Important notifications might be missed in noisy environments',
      'Permission timeouts can interrupt workflows'
    ],
    flowPosition: 7,
    connections: ['user_prompt_submit']
  },
  {
    id: 'precompact',
    name: 'PreCompact',
    icon: '📦',
    simpleDescription: 'Analyzes conversations before compressing them',
    detailedDescription: 'The PreCompact hook performs analysis before conversation compression, extracting insights, generating summaries, and preparing handoff context for future sessions. It ensures important information is preserved.',
    realWorldExample: 'Before a long conversation gets compressed to save memory, this hook extracts key decisions, blockers, and achievements, then stores them as "session handoff context" for future reference.',
    codeExample: `{
  "hook_event_type": "PreCompact", 
  "payload": {
    "summary_type": "session_handoff",
    "key_insights": ["Authentication implemented", "Database schema updated"],
    "blockers": ["API keys missing"],
    "next_actions": ["Deploy to staging"]
  }
}`,
    whenItRuns: 'Before Claude compresses long conversations to manage memory',
    whyItMatters: 'Preserves important context that would otherwise be lost during compression',
    bestPractices: [
      'Enable Redis storage for session handoffs',
      'Review generated summaries for accuracy',
      'Use structured task descriptions for better analysis'
    ],
    commonIssues: [
      'Complex conversations might not summarize well',
      'Important details could be lost if analysis is superficial',
      'Storage failures might prevent handoff preservation'
    ],
    flowPosition: 8,
    connections: ['session_start']
  }
];

export function useEducationalMode() {
  // Load educational mode preference from localStorage
  const storedMode = localStorage.getItem('educational-mode');
  if (storedMode) {
    isEducationalMode.value = JSON.parse(storedMode);
  }

  const toggleEducationalMode = () => {
    isEducationalMode.value = !isEducationalMode.value;
    localStorage.setItem('educational-mode', JSON.stringify(isEducationalMode.value));
  };

  const getHookExplanation = (hookId: string): HookExplanation | undefined => {
    return hookExplanations.find(hook => hook.id === hookId);
  };

  const getHookFlowSteps = (): HookFlowStep[] => {
    return hookExplanations.map((hook, index) => ({
      id: hook.id,
      name: hook.name,
      icon: hook.icon,
      description: hook.simpleDescription,
      position: { 
        x: (index % 4) * 200 + 100, 
        y: Math.floor(index / 4) * 150 + 100 
      },
      connections: hook.connections,
      isActive: false,
      color: getHookColor(hook.id)
    }));
  };

  const getHookColor = (hookId: string): string => {
    const colors: Record<string, string> = {
      'session_start': '#10B981', // green
      'user_prompt_submit': '#3B82F6', // blue
      'pre_tool_use': '#F59E0B', // amber
      'post_tool_use': '#EF4444', // red
      'subagent_stop': '#8B5CF6', // purple
      'stop': '#6B7280', // gray
      'notification': '#F97316', // orange
      'precompact': '#06B6D4' // cyan
    };
    return colors[hookId] || '#6B7280';
  };

  const sortedHookExplanations = computed(() => {
    return [...hookExplanations].sort((a, b) => a.flowPosition - b.flowPosition);
  });

  return {
    isEducationalMode: computed(() => isEducationalMode.value),
    toggleEducationalMode,
    hookExplanations: sortedHookExplanations,
    getHookExplanation,
    getHookFlowSteps,
    getHookColor
  };
}