<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import type { GuideHook } from '@/types/GuideHook';
import type { SandboxItem } from '@/types/SandboxItem';
import { useProgressionStore } from '@/stores/progressionStore';
import type { 
  LearningProgression, 
  LearningPathStep, 
  CompetencyLevel, 
  PrerequisiteGateType,
  AssessmentResult 
} from '@/types/LearningProgression';
import { phase3Integration } from '@/services/phase3Integration';
import { subagentStopAssessment } from '@/data/assessments/subagentStopAssessment';
import { preCompactAssessment } from '@/data/assessments/preCompactAssessment';

// Tab Components
import {
  ProgressTab,
  FlowTab,
  GuideTab,
  ExamplesTab,
  SandboxTab,
  ScenariosTab,
  ReferenceTab,
  GlossaryTab
} from './educational-tabs';
import HookAssessment from './HookAssessment.vue';

// Props
interface Props {
  events: any[];
  isExpertMode: boolean;
  onModeToggle: () => void;
}

const props = defineProps<Props>();

// Store
const progressionStore = useProgressionStore();

// Tab management
const activeTab = ref('guide');

const tabs = [
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'guide', label: 'Guide', icon: '📖', help: { tooltip: 'Learn about Claude Code hooks' } },
  { id: 'flow', label: 'Flow', icon: '🔄' },
  { id: 'examples', label: 'Examples', icon: '💡' },
  { id: 'sandbox', label: 'Sandbox', icon: '🧪' },
  { id: 'scenarios', label: 'Scenarios', icon: '🎯' },
  { id: 'reference', label: 'Reference', icon: '📚' },
  { id: 'glossary', label: 'Glossary', icon: '📝' }
];

// State
const isExpanded = ref<Record<string, boolean>>({});
const currentLearningStep = ref<string | null>(null);
const currentStepProgress = ref(0);
const learnedTopics = ref<string[]>([]);

// Touch/Swipe Navigation State
const touchStartX = ref(0);
const touchStartY = ref(0);
const slideDirection = ref('slide-right');

// Initialize activity recording function
const recordActivity = (activity: string) => {
  if (userProgression.value) {
    userProgression.value.sessionStats.totalLearningTime += 1;
    if (activity === 'assessment') {
      userProgression.value.sessionStats.assessmentsCompleted += 1;
    }
  }
};

// Recording assessment result function
const recordAssessmentResult = async (result: AssessmentResult) => {
  console.log('Recording assessment result:', result);
  if (userProgression.value) {
    userProgression.value.assessmentHistory.push({
      assessmentId: result.assessmentId,
      hookId: result.hookId,
      score: result.score,
      maxScore: result.maxScore,
      completedAt: result.completedAt,
      timeSpent: result.timeSpent,
      attemptsCount: result.attemptsCount,
      competencyGain: result.competencyGain
    });
    
    // Update the hook's competency based on the assessment result
    const percentage = (result.score / result.maxScore) * 100;
    const competency = userProgression.value.competencies[result.hookId];
    
    if (competency) {
      // Assessment results have higher weight than regular activities
      if (percentage >= 80) {
        competency.analysis = Math.min(100, competency.analysis + 15);
        competency.application = Math.min(100, competency.application + 10);
      } else if (percentage >= 70) {
        competency.knowledge = Math.min(100, competency.knowledge + 10);
        competency.application = Math.min(100, competency.application + 5);
      } else {
        competency.knowledge = Math.min(100, competency.knowledge + 5);
      }
      
      // Recalculate overall mastery
      competency.overallMastery = Math.round(
        (competency.knowledge + competency.application + competency.analysis + competency.synthesis) / 4
      );
    }
    
    // Save to localStorage
    localStorage.setItem('learning-progression', JSON.stringify(userProgression.value));
    
    // Update overall progress
    const allCompetencies = Object.values(userProgression.value.competencies);
    const totalMastery = allCompetencies.reduce((sum, comp) => sum + comp.overallMastery, 0);
    userProgression.value.overallProgress = Math.min(100, totalMastery / allCompetencies.length);
  }
};

// Update competency function
const updateCompetency = (
  hookId: string,
  dimension: 'knowledge' | 'application' | 'analysis' | 'synthesis',
  score: number,
  activityType: 'view' | 'practice' | 'assessment' | 'example' = 'view'
) => {
  if (userProgression.value?.competencies[hookId]) {
    const competency = userProgression.value.competencies[hookId];
    
    // Weight increases based on activity type
    const weights = {
      'view': 2,
      'example': 5,
      'practice': 8,
      'assessment': 15
    };
    
    const increase = weights[activityType];
    competency[dimension] = Math.min(100, competency[dimension] + increase);
    
    // Recalculate overall mastery
    competency.overallMastery = Math.round(
      (competency.knowledge + competency.application + competency.analysis + competency.synthesis) / 4
    );
    
    competency.lastAssessed = Date.now();
    
    console.log(`Updated ${hookId} ${dimension} to ${score} (${activityType})`);
  }
};

// Progression management
onMounted(async () => {
  // Load saved learning topics
  const savedTopics = localStorage.getItem('educational-learned-topics');
  if (savedTopics) {
    learnedTopics.value = JSON.parse(savedTopics);
  }
  
  // Initialize user progression if needed
  if (!userProgression.value) {
    await progressionStore.initializeProgression('default-user');
  }
});

// Computed properties for hook explanations
const hookExplanations = computed((): GuideHook[] => [
  {
    id: 'session_start',
    name: 'Session Start',
    purpose: 'Initialize session and load project context',
    whenTriggered: 'At the beginning of each Claude Code session',
    capabilities: ['Load project status', 'Initialize git context', 'Setup environment variables'],
    useCase: 'Perfect for loading project-specific configuration and context',
    criticalConcepts: ['Session initialization', 'Context loading', 'Environment setup'],
    bestPractice: 'Keep initialization fast and reliable - users expect quick session starts'
  },
  {
    id: 'pre_tool_use',
    name: 'PreToolUse',
    purpose: 'Validate and announce tools before execution',
    whenTriggered: 'Before Claude uses any tool',
    capabilities: ['Tool validation', 'Security checks', 'Usage notifications'],
    useCase: 'Security gate and user awareness for tool operations',
    criticalConcepts: ['Security validation', 'Tool announcement', 'Pre-execution checks'],
    bestPractice: 'Balance security with usability - avoid blocking legitimate operations'
  },
  {
    id: 'post_tool_use',
    name: 'PostToolUse',
    purpose: 'Process tool results and detect errors',
    whenTriggered: 'After any tool completes execution',
    capabilities: ['Error detection', 'Result processing', 'Performance monitoring'],
    useCase: 'Quality assurance and error handling for tool operations',
    criticalConcepts: ['Error detection', 'Result validation', 'Performance tracking'],
    bestPractice: 'Implement comprehensive error detection without false positives'
  },
  {
    id: 'user_prompt_submit',
    name: 'User Prompt Submit',
    purpose: 'Capture user interactions for logging',
    whenTriggered: 'When user sends a message to Claude',
    capabilities: ['Message logging', 'Session tracking', 'Interaction analytics'],
    useCase: 'Audit trail and conversation flow analysis',
    criticalConcepts: ['User interaction tracking', 'Message logging', 'Session analytics'],
    bestPractice: 'Log efficiently without impacting conversation flow'
  },
  {
    id: 'notification',
    name: 'Notification',
    purpose: 'Handle system notifications and alerts',
    whenTriggered: 'On system events requiring user attention',
    capabilities: ['Permission requests', 'Status updates', 'Alert management'],
    useCase: 'User communication and system status updates',
    criticalConcepts: ['Permission management', 'User alerts', 'System status'],
    bestPractice: 'Provide clear, actionable notifications without spam'
  },
  {
    id: 'stop',
    name: 'Stop',
    purpose: 'Summarize session completion',
    whenTriggered: 'When Claude Code session ends',
    capabilities: ['Activity summarization', 'Completion notifications', 'Session analytics'],
    useCase: 'Session wrap-up and user feedback',
    criticalConcepts: ['Session summarization', 'Activity tracking', 'Completion status'],
    bestPractice: 'Provide meaningful summaries that help users understand what was accomplished'
  },
  {
    id: 'subagent_stop',
    name: 'SubagentStop',
    purpose: 'Track completion of specialized AI agents',
    whenTriggered: 'When a subagent completes its task',
    capabilities: ['Agent performance tracking', 'Task completion summaries', 'Intelligent TTS filtering'],
    useCase: 'Monitor AI agent delegation effectiveness',
    criticalConcepts: ['Agent delegation tracking', 'Performance metrics', 'TTS filtering'],
    bestPractice: 'Balance comprehensive tracking with selective notifications to avoid audio spam'
  },
  {
    id: 'pre_compact',
    name: 'PreCompact',
    purpose: 'Analyze conversation before memory compaction',
    whenTriggered: 'Before context window compaction occurs',
    capabilities: ['Conversation analysis', 'Session insights extraction', 'Handoff context preparation', 'Knowledge preservation'],
    useCase: 'Preserve valuable session insights before memory compression and enable session continuity',
    criticalConcepts: ['Conversation analysis', 'Memory compaction', 'Session continuity', 'Insight extraction'],
    bestPractice: 'Extract meaningful insights and prepare structured handoff context for seamless session transitions'
  }
]);

// Sample lesson progression data
const sampleLessonSteps = ref([
  {
    stepId: 'understand-hooks',
    title: 'Understanding Hooks',
    description: 'Learn what hooks are and how they work',
    type: 'concept' as const,
    estimatedMinutes: 5,
    prerequisites: [],
    objectives: ['Define what a hook is', 'Explain hook execution order'],
    content: 'Hooks are code that runs at specific points in Claude Code execution...',
    expectedOutput: 'Clear understanding of hook concepts'
  },
  {
    stepId: 'hook-lifecycle',
    title: 'Hook Lifecycle',
    description: 'Understand the order and timing of hook execution',
    type: 'concept' as const,
    estimatedMinutes: 8,
    prerequisites: ['understand-hooks'],
    objectives: ['Map hook execution order', 'Identify trigger points'],
    content: 'The hook lifecycle follows a specific sequence...',
    expectedOutput: 'Mental model of hook execution flow'
  },
  {
    stepId: 'practical-implementation',
    title: 'Practical Implementation',
    description: 'Implement and test your own hook',
    type: 'hands-on' as const,
    estimatedMinutes: 15,
    prerequisites: ['hook-lifecycle'],
    objectives: ['Create a working hook', 'Test hook execution'],
    content: 'Now let\'s create a simple hook that logs messages...',
    expectedOutput: 'JSON with session_id, project_path, and git_status'
  }
]);

// Assessment data
const currentAssessment = ref<any>(null);
const completedLessons = ref<Set<string>>(new Set());
const assessmentResults = ref<Map<string, any>>(new Map());
// Sample Assessment Data for Hook Testing
const sampleAssessments: Record<string, any> = {
  session_start: {
    id: 'session-start-assessment',
    title: 'Session Start Hook Assessment',
    description: 'Test your understanding of session initialization and context loading',
    hookId: 'session_start',
    difficulty: 'beginner' as const,
    timeLimit: 300, // 5 minutes
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        question: 'What is the primary purpose of the Session Start hook?',
        type: 'multiple-choice' as const,
        options: [
          'To initialize the Claude Code session and load project context',
          'To validate user permissions',
          'To start the application server',
          'To backup the current session'
        ],
        correctAnswer: 0,
        explanation: 'The Session Start hook initializes each new Claude Code session by loading project context, git status, and setting up the environment for AI assistance.',
        competencyDimension: 'knowledge' as const,
        difficulty: 'easy' as const,
        points: 10
      },
      {
        id: 'q2',
        question: 'When does the Session Start hook execute?',
        type: 'multiple-choice' as const,
        options: [
          'After every tool use',
          'At the beginning of each new Claude Code session',
          'When the user submits a prompt',
          'Only during debugging sessions'
        ],
        correctAnswer: 1,
        explanation: 'The Session Start hook executes at the very beginning of each new Claude Code session, before any user interaction.',
        competencyDimension: 'application' as const,
        difficulty: 'medium' as const,
        points: 15
      },
      {
        id: 'q3',
        question: 'What happens if the Session Start hook returns a non-zero exit code?',
        type: 'multiple-choice' as const,
        options: [
          'The session continues normally',
          'Claude Code shows a warning but continues',
          'The session initialization fails',
          'The hook is automatically retried'
        ],
        correctAnswer: 2,
        explanation: 'A non-zero exit code from any hook, including Session Start, indicates failure and can prevent the session from initializing properly.',
        competencyDimension: 'analysis' as const,
        difficulty: 'hard' as const,
        points: 20
      }
    ]
  },
  user_prompt_submit: {
    id: 'user-prompt-submit-assessment',
    title: 'User Prompt Submit Hook Assessment',
    description: 'Test your understanding of user interaction capture and session logging',
    hookId: 'user_prompt_submit',
    difficulty: 'beginner' as const,
    timeLimit: 300, // 5 minutes
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        question: 'What is the primary purpose of the User Prompt Submit hook?',
        type: 'multiple-choice' as const,
        options: [
          'To modify user input before processing',
          'To capture and log every user message before Claude processes it',
          'To validate user permissions',
          'To translate user messages'
        ],
        correctAnswer: 1,
        explanation: 'The User Prompt Submit hook captures and logs every user interaction before Claude processes it, enabling session logging, analytics, and conversation flow tracking.',
        competencyDimension: 'knowledge' as const,
        difficulty: 'easy' as const,
        points: 10
      },
      {
        id: 'q2',
        question: 'When does the User Prompt Submit hook execute?',
        type: 'multiple-choice' as const,
        options: [
          'After Claude processes the user message',
          'Every time a user sends a message to Claude, before processing',
          'Only when debugging is enabled',
          'During session initialization'
        ],
        correctAnswer: 1,
        explanation: 'The User Prompt Submit hook executes immediately when a user sends a message to Claude, before the AI processes or responds to it.',
        competencyDimension: 'application' as const,
        difficulty: 'medium' as const,
        points: 15
      },
      {
        id: 'q3',
        question: 'How does the User Prompt Submit hook appear in the observability UI?',
        type: 'multiple-choice' as const,
        options: [
          'As a bold system notification',
          'As italic text showing "Prompt: [user\'s message]"',
          'As a red error message',
          'It doesn\'t appear in the UI'
        ],
        correctAnswer: 1,
        explanation: 'The User Prompt Submit hook displays as italic text in the format "Prompt: [user\'s message]" in the observability UI, providing a clear visual indicator of user interactions.',
        competencyDimension: 'application' as const,
        difficulty: 'medium' as const,
        points: 15
      },
      {
        id: 'q4',
        question: 'What should happen if the User Prompt Submit hook encounters an error?',
        type: 'multiple-choice' as const,
        options: [
          'The user\'s message should be blocked from processing',
          'Claude should restart the session',
          'The error should be logged but not block prompt processing',
          'The hook should modify the user\'s message'
        ],
        correctAnswer: 2,
        explanation: 'Errors in the User Prompt Submit hook should be logged for debugging but must not block the user\'s prompt from being processed by Claude, ensuring conversation flow continues.',
        competencyDimension: 'analysis' as const,
        difficulty: 'hard' as const,
        points: 20
      }
    ]
  },
  subagent_stop: subagentStopAssessment,
  pre_compact: preCompactAssessment
};

// Sample Prerequisites Gate for Demo
const samplePrerequisiteGate = computed((): PrerequisiteGateType => {
  const competencies = userProgression.value?.competencies || {};
  const intermediateLevelCount = Object.values(competencies).filter(comp => 
    comp.overallMastery >= 60
  ).length;
  
  return {
    gateId: 'advanced-mastery-gate',
    name: 'Advanced Hook Mastery Track',
    description: 'Unlock advanced content by reaching intermediate level in at least 5 hooks',
    requirements: [
      {
        type: 'competency',
        hookId: 'session_start',
        dimension: 'overall',
        threshold: 60,
        description: 'Master Session Start basics'
      },
      {
        type: 'competency',
        hookId: 'pre_tool_use',
        dimension: 'overall', 
        threshold: 60,
        description: 'Master PreToolUse security concepts'
      }
    ],
    isUnlocked: intermediateLevelCount >= 2,
    unlockedContent: ['Advanced error handling patterns', 'Custom hook development', 'Performance optimization techniques'],
    progress: {
      completed: intermediateLevelCount,
      total: 5,
      percentage: Math.min(100, (intermediateLevelCount / 5) * 100)
    }
  };
});

// Sample items for different tabs
const sampleFlowDiagramData = {
  nodes: [
    { id: 'session_start', name: 'Session Start', position: { x: 100, y: 50 } },
    { id: 'user_prompt_submit', name: 'User Prompt Submit', position: { x: 300, y: 50 } },
    { id: 'pre_tool_use', name: 'PreToolUse', position: { x: 500, y: 50 } },
    { id: 'post_tool_use', name: 'PostToolUse', position: { x: 700, y: 50 } },
    { id: 'subagent_stop', name: 'SubagentStop', position: { x: 900, y: 50 } },
    { id: 'pre_compact', name: 'PreCompact', position: { x: 1100, y: 50 } },
    { id: 'stop', name: 'Stop', position: { x: 1300, y: 50 } }
  ],
  connections: [
    { from: 'session_start', to: 'user_prompt_submit' },
    { from: 'user_prompt_submit', to: 'pre_tool_use' },
    { from: 'pre_tool_use', to: 'post_tool_use' },
    { from: 'post_tool_use', to: 'subagent_stop' },
    { from: 'subagent_stop', to: 'pre_compact' },
    { from: 'pre_compact', to: 'stop' }
  ]
};

const sampleExamples = [
  {
    id: 'session-start-example',
    title: 'Session Start Example',
    hookId: 'session_start',
    description: 'Basic session initialization',
    code: `#!/bin/bash
# Session Start Hook Example
echo "Initializing session..."
echo "Project: $(pwd)"
git status --porcelain`,
    explanation: 'This hook initializes the session by displaying project context and git status.'
  },
  {
    id: 'subagent-stop-example',
    title: 'SubagentStop Example',
    hookId: 'subagent_stop',
    description: 'Track agent completion with TTS filtering',
    code: `#!/usr/bin/env python3
# SubagentStop Hook Example
import json
import sys

def classify_agent_type(agent_name):
    """Classify agent for TTS filtering"""
    specialized_types = ['code-reviewer', 'debugger', 'security-auditor']
    return 'specialized' if any(t in agent_name.lower() for t in specialized_types) else 'generic'

# Extract agent data
agent_data = json.loads(sys.argv[1])
agent_type = classify_agent_type(agent_data.get('agent_name', ''))

# TTS filtering based on agent type
if agent_type == 'specialized':
    print(f"Agent completed: {agent_data['task_summary']}")
else:
    # Log without TTS for generic agents
    sys.stderr.write(f"Generic agent completed silently: {agent_data['agent_name']}\\n")`,
    explanation: 'This hook tracks agent completion and implements intelligent TTS filtering to reduce audio spam from generic agents.'
  },
  {
    id: 'pre-compact-example',
    title: 'PreCompact Example',
    hookId: 'pre_compact',
    description: 'Conversation analysis before memory compaction',
    code: `#!/usr/bin/env python3
# PreCompact Hook Example
import json
import sys
from datetime import datetime

def analyze_conversation(conversation_data):
    """Extract key insights from conversation"""
    return {
        "achievements": [
            "Session analysis completed",
            "Project context preserved"
        ],
        "next_steps": [
            "Continue development work", 
            "Review generated summaries"
        ],
        "blockers": [],
        "insights": [
            "PreCompact hook effectively preserves session context",
            "Conversation analysis provides valuable handoff data"
        ],
        "session_metrics": {
            "complexity": "medium",
            "duration_minutes": 45,
            "files_modified": 3
        }
    }

# Extract conversation from stdin
conversation_input = sys.stdin.read()
analysis_result = analyze_conversation(conversation_input)

# Generate summary files
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
project_name = "multi-agent-observability-system"

summary_file = f"~/.claude/summaries/{project_name}_analysis_{timestamp}.md"
print(f"Generated analysis summary: {summary_file}")
print(json.dumps(analysis_result, indent=2))`,
    explanation: 'This hook analyzes conversation content before memory compaction, extracting achievements, next steps, and insights for session continuity.'
  }
];

const sampleSandboxItems: SandboxItem[] = [
  {
    id: 'test-session-start',
    name: 'Test Session Start Hook',
    description: 'Interactive test for session initialization',
    category: 'testing',
    difficulty: 'beginner',
    language: 'bash',
    template: '#!/bin/bash\necho "Session starting..."\n# Your code here',
    expectedOutput: 'Session initialization successful',
    validationRules: ['Must output session info', 'Must include project path']
  },
  {
    id: 'test-subagent-stop',
    name: 'Test SubagentStop Hook',
    description: 'Test agent completion tracking with TTS filtering',
    category: 'testing', 
    difficulty: 'intermediate',
    language: 'python',
    template: '#!/usr/bin/env python3\n# Test SubagentStop functionality\nimport json\n# Your code here',
    expectedOutput: 'Agent tracking data with TTS filtering logic',
    validationRules: ['Must classify agent type', 'Must implement TTS filtering', 'Must track completion metrics']
  },
  {
    id: 'test-pre-compact',
    name: 'Test PreCompact Hook',
    description: 'Test conversation analysis and insight extraction',
    category: 'testing',
    difficulty: 'advanced',
    language: 'python',
    template: '#!/usr/bin/env python3\n# Test PreCompact functionality\nimport json\n# Your code here',
    expectedOutput: 'Structured analysis with achievements, next steps, blockers, and insights',
    validationRules: ['Must extract achievements', 'Must identify next steps', 'Must detect blockers', 'Must generate insights']
  }
];

// User progression state
const userProgression = computed({
  get: () => progressionStore.currentProgression,
  set: (value) => progressionStore.setProgression(value)
});

const showAssessment = computed(() => !!currentAssessment.value);

// Computed values for dashboard stats
const learningProgress = computed(() => {
  return userProgression.value?.overallProgress || 0;
});

const topicsLearned = computed(() => learnedTopics.value.length);
const activeHooksCount = computed(() => hookExplanations.value.length);
const recentEventsCount = computed(() => props.events?.length || 0);

// Competency data mapped for flow diagram
const competencyMappedData = computed(() => {
  const competencies = userProgression.value?.competencies || {};
  const mapped: Record<string, any> = {};
  
  hookExplanations.value.forEach(hook => {
    const comp = competencies[hook.id];
    mapped[hook.id] = {
      level: comp?.overallMastery || 0,
      masteryType: comp?.overallMastery >= 80 ? 'expert' : 
                   comp?.overallMastery >= 60 ? 'intermediate' : 'beginner'
    };
  });
  
  return mapped;
});

// Tab component mapping
const tabComponents = {
  progress: ProgressTab,
  flow: FlowTab,
  guide: GuideTab,
  examples: ExamplesTab,
  sandbox: SandboxTab,
  scenarios: ScenariosTab,
  reference: ReferenceTab,
  glossary: GlossaryTab
};

const currentTabComponent = computed(() => tabComponents[activeTab.value as keyof typeof tabComponents]);

const currentTabProps = computed(() => {
  const baseProps = {
    events: props.events,
    isExpertMode: props.isExpertMode,
    userProgression: userProgression.value,
    hookExplanations: hookExplanations.value
  };

  switch (activeTab.value) {
    case 'progress':
      return {
        ...baseProps,
        learningProgress: learningProgress.value,
        topicsLearned: topicsLearned.value,
        competencyData: competencyMappedData.value,
        prerequisiteGate: samplePrerequisiteGate.value
      };
    case 'flow':
      return {
        ...baseProps,
        flowData: sampleFlowDiagramData,
        competencyData: competencyMappedData.value
      };
    case 'guide':
      return {
        ...baseProps,
        lessonSteps: sampleLessonSteps.value,
        currentStep: currentLearningStep.value,
        stepProgress: currentStepProgress.value,
        expandedStates: isExpanded.value
      };
    case 'examples':
      return {
        ...baseProps,
        examples: sampleExamples
      };
    case 'sandbox':
      return {
        ...baseProps,
        sandboxItems: sampleSandboxItems
      };
    case 'scenarios':
      return {
        ...baseProps,
        scenarios: [] // Will be populated with scenario data
      };
    case 'reference':
      return {
        ...baseProps
      };
    case 'glossary':
      return {
        ...baseProps
      };
    default:
      return baseProps;
  }
});

// Event handlers
const handleTabChange = (tabId: string) => {
  activeTab.value = tabId;
  recordActivity('view');
  
  // Emit tab change for phase 3 integration
  phase3Integration.emit('tab-changed', {
    tabId,
    context: { userProgression: userProgression.value }
  });
  
  // Record activity
  recordActivity('view');
};

const handleTestStarted = (testData: { testId: string; scenario?: string; language: string }) => {
  phase3Integration.emit('test-started', testData);
};

const handleTestCompleted = (testData: { testId: string; result: ExecutionResult; learningValue: number }) => {
  phase3Integration.emit('test-completed', testData);
  recordActivity('practice');
};

const handleSecurityValidation = (validationData: { code: string; riskLevel: string; valid: boolean }) => {
  phase3Integration.emit('security-validation', validationData);
};

// Event handlers
const handleShowInFlow = (_hookId: string) => {
  activeTab.value = 'flow';
  // Could scroll to or highlight the specific hook in the flow diagram
};

const handleSimulateHook = (hookId: string) => {
  // Simulate hook execution or show example data
  console.log('Simulating hook:', hookId);
  phase3Integration.emit('simulation-step', {
    currentStep: 0,
    totalSteps: 1,
    activeNodeId: hookId
  });
};

const handleTopicLearned = (hookId: string) => {
  if (!learnedTopics.value.includes(hookId)) {
    learnedTopics.value.push(hookId);
    // Save to localStorage
    localStorage.setItem('educational-learned-topics', JSON.stringify(learnedTopics.value));
    
    // Emit learning objective completion
    phase3Integration.completeObjective(`learn-${hookId}`, hookId, 70);
  }
};

const playScenario = (scenarioId: string) => {
  // Animate through the scenario's hook sequence
  console.log('Playing scenario:', scenarioId);
  activeTab.value = 'flow';
  
  phase3Integration.emit('simulation-started', {
    nodeCount: 8,
    estimatedDuration: 5000
  });
};

const getHookName = (hookId: string) => {
  const hook = getHookExplanation(hookId);
  return hook ? hook.name : hookId;
};

const resetProgress = () => {
  learnedTopics.value = [];
  localStorage.removeItem('educational-learned-topics');
};

const handleRunExample = (example: any) => {
  console.log('Running example in Educational Dashboard:', example.id);
  recordActivity('practice');
};

const handleOpenDocs = (url: string) => {
  console.log('Opening documentation:', url);
  recordActivity('view');
};

const handleHookSelect = (hook: any) => {
  console.log('Hook selected from reference cards:', hook.name);
  // Navigate to detailed hook information in the guide tab
  activeTab.value = 'guide';
  recordActivity('view');
};

// Advanced Flow Diagram Event Handlers
const handleAdvancedNodeSelected = (nodeId: string) => {
  console.log('Advanced node selected:', nodeId);
  recordActivity('view');
  
  phase3Integration.emit('node-selected', {
    nodeId,
    competencyLevel: competencyMappedData.value[nodeId]?.level,
    masteryType: competencyMappedData.value[nodeId]?.masteryType
  });
};

const handleViewExample = (nodeId: string) => {
  console.log('View example requested for:', nodeId);
  activeTab.value = 'examples';
  recordActivity('view');
};

const handleStartPractice = (nodeId: string) => {
  console.log('Start practice requested for:', nodeId);
  
  // Simulate starting practice and updating competency
  if (Math.random() > 0.3) {
    setTimeout(() => {
      updateCompetency(nodeId, 'application', Math.random() * 10 + 70, 'practice');
    }, 1000);
  }
  
  recordActivity('practice');
};


// Event handlers for Learning Progression System
const handleHookSelected = (hookId: string) => {
  console.log('Hook selected:', hookId);
  recordActivity('view');
  
  // Emit hook selection for phase 3 integration
  phase3Integration.emit('node-selected', {
    nodeId: hookId,
    competencyLevel: userProgression.value?.competencies[hookId]?.overallMastery,
    masteryType: 'knowledge'
  });
};

const handleStartAssessment = (hookId: string = 'session_start') => {
  console.log('Starting assessment for:', hookId);
  const assessment = sampleAssessments[hookId];
  if (assessment) {
    currentAssessment.value = assessment;
    recordActivity('assessment');
  }
};

const handleAssessmentCompleted = async (results: any) => {
  console.log('Assessment completed:', results);
  if (currentAssessment.value) {
    const hookId = currentAssessment.value.hookId;
    const passed = results.score >= currentAssessment.value.passingScore;
    
    assessmentResults.value.set(hookId, results);
    
    // Record the assessment result in the progression system
    await recordAssessmentResult({
      assessmentId: currentAssessment.value.id,
      hookId: hookId,
      score: results.score,
      maxScore: 100,
      completedAt: Date.now(),
      timeSpent: results.timeSpent || 0,
      attemptsCount: 1,
      competencyGain: results.competencyGain || 0
    });
    
    recordActivity('assessment');
  }
  currentAssessment.value = null;
};

const handleAssessmentRetake = () => {
  // Assessment will be reset, just track the activity
  recordActivity('assessment');
};

const handleAssessmentContinue = () => {
  currentAssessment.value = null;
  // Could navigate to next lesson or show congratulations
};

const handleStartStep = (step: LearningPathStep) => {
  console.log('Starting step:', step);
  currentLearningStep.value = step.stepId;
  recordActivity('view');
};

const handleCompleteStep = (stepId: string) => {
  console.log('Completing step:', stepId);
  if (userProgression.value) {
    const stepIndex = userProgression.value.personalizedPaths[0]?.steps?.findIndex(s => s.stepId === stepId);
    if (stepIndex !== undefined && stepIndex !== -1) {
      currentStepProgress.value = Math.min(100, ((stepIndex + 1) / userProgression.value.personalizedPaths[0].steps.length) * 100);
    }
  }
  recordActivity('practice');
};

const toggleExpanded = (hookId: string) => {
  isExpanded.value[hookId] = !isExpanded.value[hookId];
};

const getHookExplanation = (hookId: string): GuideHook | undefined => {
  return hookExplanations.value.find(h => h.id === hookId);
};

// Touch/Swipe Navigation Methods
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
};

const handleTouchMove = (e: TouchEvent) => {
  // Prevent default scrolling during horizontal swipe
  const deltaX = Math.abs(e.touches[0].clientX - touchStartX.value);
  const deltaY = Math.abs(e.touches[0].clientY - touchStartY.value);
  
  if (deltaX > deltaY && deltaX > 20) {
    e.preventDefault();
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  
  const deltaX = touchEndX - touchStartX.value;
  const deltaY = touchEndY - touchStartY.value;
  
  // Only trigger swipe if horizontal movement is greater than vertical
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab.value);
    
    if (deltaX > 0 && currentIndex > 0) {
      // Swipe right - previous tab
      slideDirection.value = 'slide-right';
      handleTabChange(tabs[currentIndex - 1].id);
    } else if (deltaX < 0 && currentIndex < tabs.length - 1) {
      // Swipe left - next tab
      slideDirection.value = 'slide-left';
      handleTabChange(tabs[currentIndex + 1].id);
    }
  }
};

// Provide functions for child components
const provide = inject('provide', () => {});

// Define what we're providing to child components
const providedData = {
  userProgression,
  learnedTopics,
  hookExplanations,
  currentLearningStep,
  currentStepProgress,
  competencyMappedData,
  showAssessment,
  currentAssessment,
  assessmentResults,
  handleTabChange,
  handleRunExample,
  handleOpenDocs,
  handleHookSelect,
  handleAdvancedNodeSelected,
  handleViewExample,
  handleStartPractice,
  handleHookSelected,
  handleStartAssessment,
  handleAssessmentCompleted,
  handleAssessmentRetake,
  handleAssessmentContinue,
  handleStartStep,
  handleCompleteStep,
  toggleExpanded,
  getHookExplanation,
  recordActivity,
  recordAssessmentResult,
  updateCompetency,
};

// Provide all the data to child components
if (typeof provide === 'function') {
  provide('educationalDashboard', providedData);
}
</script>

<template>
  <div class="educational-dashboard" data-testid="educational-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h2>🎓 Educational Dashboard</h2>
          <p class="subtitle">Learn Claude Code hooks through interactive lessons</p>
        </div>
        
        <!-- Mode Toggle -->
        <button 
          @click="props.onModeToggle"
          class="mode-toggle"
          :class="{ 'expert': props.isExpertMode }"
          data-testid="mode-toggle"
        >
          {{ props.isExpertMode ? '👨‍💼 Expert Mode' : '🎓 Learning Mode' }}
        </button>
      </div>
      
      <!-- Progress Overview -->
      <div class="progress-overview">
        <div class="stat-card">
          <div class="stat-value">{{ Math.round(learningProgress) }}%</div>
          <div class="stat-label">Progress</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ topicsLearned }}</div>
          <div class="stat-label">Topics</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ activeHooksCount }}</div>
          <div class="stat-label">Active Hooks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ recentEventsCount }}</div>
          <div class="stat-label">Recent Events</div>
        </div>
      </div>
    </div>
    
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="handleTabChange(tab.id)"
        class="tab-button"
        :class="{ 'active': activeTab === tab.id }"
        :title="tab.help?.tooltip"
        :data-testid="`tab-${tab.id}`"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>
    
    <!-- Tab Content with Touch/Swipe Support -->
    <div 
      class="tab-content mobile-scroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      :data-testid="`tab-content-${activeTab}`"
    >
      <Transition :name="slideDirection" mode="out-in">
        <component 
          :is="currentTabComponent"
          v-bind="currentTabProps"
          @hook-selected="handleHookSelected"
          @start-assessment="handleStartAssessment"
          @topic-learned="handleTopicLearned"
          @run-example="handleRunExample"
          @open-docs="handleOpenDocs"
          @hook-select="handleHookSelect"
          @show-in-flow="handleShowInFlow"
          @simulate-hook="handleSimulateHook"
          @play-scenario="playScenario"
          @advanced-node-selected="handleAdvancedNodeSelected"
          @view-example="handleViewExample"
          @start-practice="handleStartPractice"
          @start-step="handleStartStep"
          @complete-step="handleCompleteStep"
          @test-started="handleTestStarted"
          @test-completed="handleTestCompleted"
          @security-validation="handleSecurityValidation"
          :key="activeTab"
        />
      </Transition>
    </div>
    
    <!-- Assessment Modal -->
    <HookAssessment
      v-if="showAssessment && currentAssessment"
      :assessment-data="currentAssessment"
      @completed="handleAssessmentCompleted"
      @retake="handleAssessmentRetake"
      @continue="handleAssessmentContinue"
      data-testid="assessment-modal"
    />
  </div>
</template>

<style scoped>
/* Mobile-First Responsive Design */
.educational-dashboard {
  @apply bg-gray-900 text-white min-h-screen;
}

/* Header - Mobile First */
.dashboard-header {
  @apply bg-gradient-to-r from-blue-800 to-purple-800 p-3 mb-4;
  /* Mobile: Reduced padding and margin */
}

.header-content {
  @apply flex flex-col gap-3 mb-3;
  /* Mobile: Stack vertically */
}

@media (min-width: 768px) {
  .dashboard-header {
    @apply p-6 mb-6;
  }
  
  .header-content {
    @apply flex-row justify-between items-center mb-4;
  }
}

.title-section h2 {
  @apply text-lg font-bold mb-1;
  /* Mobile: Smaller text */
}

@media (min-width: 768px) {
  .title-section h2 {
    @apply text-2xl mb-2;
  }
}

.subtitle {
  @apply text-blue-100 text-xs;
  /* Mobile: Smaller subtitle */
}

@media (min-width: 768px) {
  .subtitle {
    @apply text-sm;
  }
}

.mode-toggle {
  @apply px-3 py-2 rounded-lg border border-blue-400 text-blue-100 hover:bg-blue-700 transition-colors text-sm;
  /* Mobile: Smaller button, reduced padding */
  min-height: 44px; /* Touch-friendly minimum height */
}

@media (min-width: 768px) {
  .mode-toggle {
    @apply px-4 py-2 text-base;
  }
}

.mode-toggle.expert {
  @apply bg-purple-600 border-purple-400 text-white;
}

/* Progress Overview - Mobile Responsive */
.progress-overview {
  @apply grid grid-cols-2 gap-2;
  /* Mobile: 2x2 grid */
}

@media (min-width: 768px) {
  .progress-overview {
    @apply flex gap-4;
  }
}

.stat-card {
  @apply bg-black bg-opacity-20 rounded-lg p-3 text-center;
  /* Mobile: Reduced padding */
}

@media (min-width: 768px) {
  .stat-card {
    @apply p-4 min-w-20;
  }
}

.stat-value {
  @apply text-lg font-bold text-yellow-300;
  /* Mobile: Smaller value text */
}

@media (min-width: 768px) {
  .stat-value {
    @apply text-xl;
  }
}

.stat-label {
  @apply text-xs text-blue-100 mt-1;
}

/* Tab Navigation - Mobile Responsive */
.tab-navigation {
  @apply flex gap-1 px-3 mb-4 overflow-x-auto pb-2;
  /* Mobile: Reduced gaps and padding, scrollable */
  -webkit-overflow-scrolling: touch; /* iOS smooth scrolling */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.tab-navigation::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

@media (min-width: 768px) {
  .tab-navigation {
    @apply gap-2 px-6 mb-6;
  }
}

.tab-button {
  @apply flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors whitespace-nowrap text-sm;
  /* Mobile: Smaller text, reduced gaps */
  min-height: 44px; /* Touch-friendly height */
  min-width: 44px; /* Touch-friendly width */
}

@media (min-width: 768px) {
  .tab-button {
    @apply gap-2 px-4 text-base;
  }
}

.tab-button.active {
  @apply bg-blue-600 text-white;
}

.tab-icon {
  @apply text-sm flex-shrink-0;
}

@media (min-width: 768px) {
  .tab-icon {
    @apply text-base;
  }
}

.tab-label {
  @apply font-medium hidden;
  /* Mobile: Hide labels by default */
}

@media (min-width: 480px) {
  .tab-label {
    @apply block;
    /* Show labels on larger mobile screens */
  }
}

/* Tab Content - Mobile Responsive */
.tab-content {
  @apply px-3 pb-4;
  /* Mobile: Reduced padding */
}

@media (min-width: 768px) {
  .tab-content {
    @apply px-6 pb-6;
  }
}

/* Mobile-specific utility classes */
@media (max-width: 767px) {
  .mobile-hidden {
    @apply hidden;
  }
  
  .mobile-full-width {
    @apply w-full;
  }
  
  .mobile-stack {
    @apply flex-col;
  }
  
  .mobile-center {
    @apply text-center;
  }
}

/* Touch optimization */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  @apply flex items-center justify-center;
}

/* Improved scrolling for mobile */
.mobile-scroll {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.mobile-scroll::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.mobile-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.mobile-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

/* Focus states for accessibility */
.tab-button:focus,
.mode-toggle:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .dashboard-header {
    @apply border-b-2 border-white;
  }
  
  .tab-button {
    @apply border border-gray-600;
  }
  
  .tab-button.active {
    @apply border-blue-400;
  }
}

/* Swipe animations for mobile navigation */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-from {
  transform: translateX(-100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}

/* Fade animation as fallback */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Reduced motion support for animations */
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active,
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>