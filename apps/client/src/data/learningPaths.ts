import type {
  LearningPath,
  LearningPathStep,
  LearningResource,
  LearningOutcome,
  CompletionCriteria
} from '../types/learningProgression';

/**
 * Predefined Learning Paths for Claude Code Hooks
 * Phase 3 Educational Dashboard - Structured Learning Progression
 */

// Helper function to create completion criteria
const createCompletionCriteria = (
  type: 'score' | 'time' | 'assessment',
  requirements: any
): CompletionCriteria => ({
  type,
  requirements
});

// Helper function to create learning resources
const createResource = (
  id: string,
  type: 'guide' | 'example' | 'interactive' | 'assessment' | 'reference',
  title: string,
  description: string,
  duration = 10,
  difficulty: 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'beginner'
): LearningResource => ({
  resourceId: id,
  type,
  title,
  description,
  duration,
  difficulty
});

// Beginner Fundamentals Path
export const beginnerFundamentalsPath: LearningPath = {
  id: 'path-beginner-fundamentals',
  pathId: 'beginner-fundamentals',
  name: 'Claude Code Hooks Fundamentals',
  description: 'Master the essential Claude Code hooks through structured, beginner-friendly learning',
  difficulty: 'beginner',
  estimatedDurationMinutes: 240, // 4 hours
  steps: [
    {
      stepId: 'session-basics',
      hookId: 'session_start',
      name: 'Session Lifecycle Basics',
      description: 'Understand how Claude Code sessions begin and context is loaded',
      stepType: 'concept',
      competencyTarget: 'beginner',
      prerequisites: [],
      estimatedMinutes: 30,
      isCompleted: false,
      isUnlocked: true,
      completionCriteria: createCompletionCriteria('score', { minimumScore: 70 }),
      resources: [
        createResource(
          'session-guide',
          'guide',
          'Session Start Hook Guide',
          'Comprehensive guide to session initialization and context loading',
          15
        ),
        createResource(
          'session-example',
          'example',
          'Session Hook Example',
          'Working example of a session start hook implementation',
          10
        ),
        createResource(
          'session-assessment',
          'assessment',
          'Session Understanding Quiz',
          'Test your knowledge of session lifecycle concepts',
          5
        )
      ]
    },
    {
      stepId: 'user-interaction',
      hookId: 'user_prompt_submit',
      name: 'Understanding User Interactions',
      description: 'Learn how user prompts are captured and processed',
      stepType: 'concept',
      competencyTarget: 'beginner',
      prerequisites: ['session_start'],
      estimatedMinutes: 25,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('score', { minimumScore: 70 }),
      resources: [
        createResource(
          'user-prompt-guide',
          'guide',
          'User Prompt Processing Guide',
          'How user inputs are captured and analyzed',
          12
        ),
        createResource(
          'user-prompt-interactive',
          'interactive',
          'Interactive Prompt Tester',
          'Try different prompt types and see the results',
          8
        )
      ]
    },
    {
      stepId: 'tool-validation',
      hookId: 'pre_tool_use',
      name: 'Tool Security and Validation',
      description: 'Master the security gate that protects your system',
      stepType: 'concept',
      competencyTarget: 'intermediate',
      prerequisites: ['user_prompt_submit'],
      estimatedMinutes: 35,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { passAllDimensions: true }),
      resources: [
        createResource(
          'pre-tool-security',
          'guide',
          'Security Validation Deep Dive',
          'Understanding security patterns and validation techniques',
          20,
          'intermediate'
        ),
        createResource(
          'security-examples',
          'example',
          'Security Hook Examples',
          'Real-world security validation implementations',
          15,
          'intermediate'
        )
      ]
    },
    {
      stepId: 'result-processing',
      hookId: 'post_tool_use',
      name: 'Processing Tool Results',
      description: 'Learn to capture and analyze tool execution outcomes',
      stepType: 'practice',
      competencyTarget: 'intermediate',
      prerequisites: ['pre_tool_use'],
      estimatedMinutes: 30,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('score', { minimumScore: 75 }),
      resources: [
        createResource(
          'post-tool-guide',
          'guide',
          'Tool Result Processing',
          'Comprehensive guide to analyzing tool outputs and errors',
          18
        ),
        createResource(
          'error-handling',
          'example',
          'Error Detection Patterns',
          'Common patterns for detecting and handling tool errors',
          12,
          'intermediate'
        )
      ]
    },
    {
      stepId: 'agent-coordination',
      hookId: 'subagent_stop',
      name: 'Agent Coordination Mastery',
      description: 'Understand how AI agents work together and communicate',
      stepType: 'practice',
      competencyTarget: 'advanced',
      prerequisites: ['post_tool_use'],
      estimatedMinutes: 40,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 80 }),
      resources: [
        createResource(
          'agent-coordination',
          'guide',
          'Multi-Agent Systems Guide',
          'Understanding agent communication and coordination patterns',
          25,
          'advanced'
        ),
        createResource(
          'agent-examples',
          'interactive',
          'Agent Coordination Simulator',
          'Interactive simulation of multi-agent workflows',
          15,
          'advanced'
        )
      ]
    },
    {
      stepId: 'session-closure',
      hookId: 'stop',
      name: 'Session Closure and Analysis',
      description: 'Master session completion and intelligent summarization',
      stepType: 'concept',
      competencyTarget: 'intermediate',
      prerequisites: ['subagent_stop'],
      estimatedMinutes: 25,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('score', { minimumScore: 70 }),
      resources: [
        createResource(
          'session-closure',
          'guide',
          'Session Analysis and Closure',
          'How to generate meaningful session summaries',
          15
        )
      ]
    },
    {
      stepId: 'notification-systems',
      hookId: 'notification',
      name: 'Notification and Alert Systems',
      description: 'Handle system notifications and user interactions',
      stepType: 'concept',
      competencyTarget: 'beginner',
      prerequisites: [],
      estimatedMinutes: 20,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('score', { minimumScore: 65 }),
      resources: [
        createResource(
          'notification-guide',
          'guide',
          'Notification Systems Guide',
          'Understanding different types of system notifications',
          12
        )
      ]
    },
    {
      stepId: 'advanced-analysis',
      hookId: 'precompact',
      name: 'Advanced Session Analysis',
      description: 'Master conversation analysis and context preservation',
      stepType: 'assessment',
      competencyTarget: 'advanced',
      prerequisites: ['stop'],
      estimatedMinutes: 35,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 85, passAllDimensions: true }),
      resources: [
        createResource(
          'precompact-analysis',
          'guide',
          'Advanced Context Analysis',
          'Deep dive into conversation analysis and summarization',
          20,
          'advanced'
        ),
        createResource(
          'context-preservation',
          'example',
          'Context Preservation Techniques',
          'Advanced techniques for maintaining context across sessions',
          15,
          'advanced'
        )
      ]
    }
  ],
  prerequisites: [],
  outcomes: [
    {
      outcomeId: 'hook-comprehension',
      description: 'Comprehensive understanding of all Claude Code hooks and their relationships',
      competencyDimensions: ['knowledge', 'application'],
      targetLevel: 'intermediate',
      assessmentMethod: 'mixed'
    },
    {
      outcomeId: 'practical-implementation',
      description: 'Ability to implement and customize hooks for specific use cases',
      competencyDimensions: ['application', 'synthesis'],
      targetLevel: 'intermediate',
      assessmentMethod: 'practical'
    },
    {
      outcomeId: 'troubleshooting-skills',
      description: 'Competency in diagnosing and resolving hook-related issues',
      competencyDimensions: ['analysis', 'synthesis'],
      targetLevel: 'intermediate',
      assessmentMethod: 'practical'
    }
  ],
  isPersonalized: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1
};

// Advanced Systems Path
export const advancedSystemsPath: LearningPath = {
  id: 'path-advanced-systems',
  pathId: 'advanced-systems',
  name: 'Advanced Hook Systems Architecture',
  description: 'Master complex hook interactions, performance optimization, and enterprise patterns',
  difficulty: 'advanced',
  estimatedDurationMinutes: 360, // 6 hours
  steps: [
    {
      stepId: 'hook-orchestration',
      hookId: 'session_start',
      name: 'Hook Orchestration Patterns',
      description: 'Master complex hook interaction patterns and orchestration strategies',
      stepType: 'concept',
      competencyTarget: 'advanced',
      prerequisites: ['post_tool_use'], // Requires completion of fundamentals
      estimatedMinutes: 45,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 85 }),
      resources: [
        createResource(
          'orchestration-patterns',
          'guide',
          'Hook Orchestration Patterns',
          'Advanced patterns for coordinating multiple hooks',
          30,
          'advanced'
        ),
        createResource(
          'orchestration-examples',
          'example',
          'Complex Orchestration Examples',
          'Real-world examples of sophisticated hook orchestration',
          15,
          'advanced'
        )
      ]
    },
    {
      stepId: 'performance-optimization',
      hookId: 'pre_tool_use',
      name: 'Hook Performance Optimization',
      description: 'Optimize hook performance for high-throughput scenarios',
      stepType: 'practice',
      competencyTarget: 'expert',
      prerequisites: ['hook-orchestration'],
      estimatedMinutes: 50,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 90, passAllDimensions: true }),
      resources: [
        createResource(
          'performance-guide',
          'guide',
          'Hook Performance Optimization',
          'Advanced techniques for optimizing hook performance',
          35,
          'expert'
        ),
        createResource(
          'benchmarking-tools',
          'interactive',
          'Hook Performance Benchmarking',
          'Tools and techniques for measuring hook performance',
          15,
          'expert'
        )
      ]
    },
    {
      stepId: 'enterprise-patterns',
      hookId: 'subagent_stop',
      name: 'Enterprise Integration Patterns',
      description: 'Implement hooks for enterprise-scale deployments',
      stepType: 'practice',
      competencyTarget: 'expert',
      prerequisites: ['performance-optimization'],
      estimatedMinutes: 60,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 90 }),
      resources: [
        createResource(
          'enterprise-patterns',
          'guide',
          'Enterprise Hook Patterns',
          'Patterns for enterprise-scale hook implementations',
          40,
          'expert'
        ),
        createResource(
          'scalability-case-studies',
          'reference',
          'Enterprise Scalability Case Studies',
          'Real-world case studies of large-scale hook deployments',
          20,
          'expert'
        )
      ]
    }
  ],
  prerequisites: ['beginner-fundamentals'], // Must complete fundamentals first
  outcomes: [
    {
      outcomeId: 'architecture-mastery',
      description: 'Expert-level understanding of hook system architecture',
      competencyDimensions: ['knowledge', 'analysis', 'synthesis'],
      targetLevel: 'expert',
      assessmentMethod: 'comprehensive'
    },
    {
      outcomeId: 'performance-expertise',
      description: 'Ability to optimize hooks for high-performance scenarios',
      competencyDimensions: ['application', 'analysis', 'synthesis'],
      targetLevel: 'expert',
      assessmentMethod: 'practical'
    },
    {
      outcomeId: 'enterprise-readiness',
      description: 'Competency in implementing hooks for enterprise environments',
      competencyDimensions: ['application', 'synthesis'],
      targetLevel: 'expert',
      assessmentMethod: 'practical'
    }
  ],
  isPersonalized: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1
};

// Security Specialist Path
export const securitySpecialistPath: LearningPath = {
  id: 'path-security-specialist',
  pathId: 'security-specialist',
  name: 'Hook Security Specialist',
  description: 'Master security patterns, threat detection, and secure hook implementations',
  difficulty: 'advanced',
  estimatedDurationMinutes: 300, // 5 hours
  steps: [
    {
      stepId: 'security-fundamentals',
      hookId: 'pre_tool_use',
      name: 'Hook Security Fundamentals',
      description: 'Master the fundamentals of hook-based security validation',
      stepType: 'concept',
      competencyTarget: 'advanced',
      prerequisites: ['pre_tool_use'], // From fundamentals path
      estimatedMinutes: 40,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 85 }),
      resources: [
        createResource(
          'security-fundamentals',
          'guide',
          'Hook Security Fundamentals',
          'Core security concepts for hook implementations',
          25,
          'advanced'
        ),
        createResource(
          'threat-modeling',
          'interactive',
          'Threat Modeling Workshop',
          'Interactive workshop on identifying security threats',
          15,
          'advanced'
        )
      ]
    },
    {
      stepId: 'threat-detection',
      hookId: 'post_tool_use',
      name: 'Advanced Threat Detection',
      description: 'Implement sophisticated threat detection in post-execution analysis',
      stepType: 'practice',
      competencyTarget: 'expert',
      prerequisites: ['security-fundamentals'],
      estimatedMinutes: 50,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 90, passAllDimensions: true }),
      resources: [
        createResource(
          'threat-detection-guide',
          'guide',
          'Advanced Threat Detection Techniques',
          'Sophisticated methods for detecting security threats',
          35,
          'expert'
        ),
        createResource(
          'ml-security',
          'example',
          'ML-based Security Analysis',
          'Using machine learning for security threat detection',
          15,
          'expert'
        )
      ]
    },
    {
      stepId: 'compliance-automation',
      hookId: 'notification',
      name: 'Compliance and Audit Automation',
      description: 'Automate security compliance and audit processes',
      stepType: 'practice',
      competencyTarget: 'expert',
      prerequisites: ['threat-detection'],
      estimatedMinutes: 45,
      isCompleted: false,
      isUnlocked: false,
      completionCriteria: createCompletionCriteria('assessment', { minimumScore: 85 }),
      resources: [
        createResource(
          'compliance-automation',
          'guide',
          'Security Compliance Automation',
          'Automating compliance checks and audit processes',
          30,
          'expert'
        ),
        createResource(
          'regulatory-frameworks',
          'reference',
          'Regulatory Framework Guide',
          'Understanding major security regulatory frameworks',
          15,
          'expert'
        )
      ]
    }
  ],
  prerequisites: ['beginner-fundamentals'],
  outcomes: [
    {
      outcomeId: 'security-expertise',
      description: 'Expert-level security knowledge for hook systems',
      competencyDimensions: ['knowledge', 'analysis'],
      targetLevel: 'expert',
      assessmentMethod: 'comprehensive'
    },
    {
      outcomeId: 'threat-analysis',
      description: 'Advanced threat detection and analysis capabilities',
      competencyDimensions: ['analysis', 'synthesis'],
      targetLevel: 'expert',
      assessmentMethod: 'practical'
    },
    {
      outcomeId: 'compliance-mastery',
      description: 'Comprehensive understanding of security compliance requirements',
      competencyDimensions: ['knowledge', 'application'],
      targetLevel: 'advanced',
      assessmentMethod: 'mixed'
    }
  ],
  isPersonalized: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1
};

// Adaptive Learning Path Factory
export function createAdaptiveLearningPath(
  userId: string,
  progression: any,
  focusAreas: string[] = [],
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): LearningPath {
  const now = Date.now();
  
  // Analyze user's current competencies
  const competencies = progression?.competencies || {};
  const weakAreas = Object.entries(competencies)
    .filter(([, comp]: [string, any]) => comp.overallMastery < 60)
    .map(([hookId]) => hookId);
  
  const strongAreas = Object.entries(competencies)
    .filter(([, comp]: [string, any]) => comp.overallMastery >= 70)
    .map(([hookId]) => hookId);
  
  // Create personalized steps based on analysis
  const adaptiveSteps: LearningPathStep[] = [];
  
  // Prioritize weak areas or focus areas
  const priorityHooks = focusAreas.length > 0 ? focusAreas : weakAreas;
  
  priorityHooks.forEach((hookId, index) => {
    const currentComp = competencies[hookId];
    const targetLevel = currentComp?.skillLevel === 'expert' ? 'expert' : 
                       currentComp?.skillLevel === 'advanced' ? 'advanced' : 
                       currentComp?.skillLevel === 'intermediate' ? 'advanced' : 'intermediate';
    
    adaptiveSteps.push({
      stepId: `adaptive-${hookId}-${index}`,
      hookId,
      name: `Focus: ${getHookDisplayName(hookId)}`,
      description: `Personalized learning for ${getHookDisplayName(hookId)} based on your current progress`,
      stepType: currentComp?.overallMastery < 30 ? 'concept' : 'practice',
      competencyTarget: targetLevel,
      prerequisites: index > 0 ? [priorityHooks[index - 1]] : [],
      estimatedMinutes: 30,
      isCompleted: false,
      isUnlocked: index === 0,
      completionCriteria: createCompletionCriteria('score', { 
        minimumScore: targetLevel === 'expert' ? 90 : targetLevel === 'advanced' ? 80 : 70 
      }),
      resources: [
        createResource(
          `adaptive-${hookId}-resource`,
          'guide',
          `Personalized ${getHookDisplayName(hookId)} Guide`,
          `Customized learning material based on your current skill level`,
          20,
          targetLevel
        )
      ]
    });
  });
  
  return {
    id: `adaptive-path-${userId}`,
    pathId: `adaptive-${userId}-${now}`,
    name: 'Your Personalized Learning Path',
    description: 'A learning path tailored specifically to your current skills and goals',
    difficulty: 'adaptive',
    estimatedDurationMinutes: adaptiveSteps.length * 30,
    steps: adaptiveSteps,
    prerequisites: [],
    outcomes: [
      {
        outcomeId: 'personalized-mastery',
        description: 'Improved competency in your focus areas',
        competencyDimensions: ['knowledge', 'application', 'analysis'],
        targetLevel: difficulty === 'advanced' ? 'advanced' : 'intermediate',
        assessmentMethod: 'mixed'
      }
    ],
    isPersonalized: true,
    createdAt: now,
    updatedAt: now,
    version: 1
  };
}

// Helper function (same as in components)
function getHookDisplayName(hookId: string): string {
  const names: Record<string, string> = {
    'session_start': 'Session Start',
    'user_prompt_submit': 'User Prompt',
    'pre_tool_use': 'Pre Tool Use',
    'post_tool_use': 'Post Tool Use',
    'subagent_stop': 'Subagent Stop',
    'stop': 'Stop',
    'notification': 'Notification',
    'precompact': 'PreCompact'
  };
  return names[hookId] || hookId;
}

// Export all available paths
export const availableLearningPaths = [
  beginnerFundamentalsPath,
  advancedSystemsPath,
  securitySpecialistPath
];

// Export path utilities
export const learningPathUtils = {
  createAdaptiveLearningPath,
  getPathById: (pathId: string) => availableLearningPaths.find(path => path.pathId === pathId),
  getPathsByDifficulty: (difficulty: string) => availableLearningPaths.filter(path => path.difficulty === difficulty),
  getPersonalizedPaths: () => availableLearningPaths.filter(path => path.isPersonalized)
};