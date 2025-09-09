/**
 * PostToolUse Hook Assessment
 * Comprehensive assessment for testing understanding of tool result processing, error detection, and performance monitoring
 * Phase 1 implementation to achieve 100% hook coverage
 */

interface QuestionData {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'code-analysis';
  options: string[];
  correctAnswer: number;
  explanation: string;
  competencyDimension: 'knowledge' | 'application' | 'analysis' | 'synthesis';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface AssessmentData {
  id: string;
  title: string;
  description: string;
  hookId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimit?: number; // in seconds
  passingScore: number;
  questions: QuestionData[];
}

export const postToolUseAssessment: AssessmentData = {
  id: 'post-tool-use-assessment',
  title: 'PostToolUse Hook Assessment',
  description: 'Test your understanding of tool result processing, error detection, and performance monitoring in Claude Code workflows',
  hookId: 'post_tool_use',
  difficulty: 'intermediate',
  timeLimit: 300, // 5 minutes
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      question: 'What is the primary purpose of the PostToolUse hook in Claude Code?',
      type: 'multiple-choice',
      options: [
        'To validate tools before they execute',
        'To process tool results, detect errors, and provide completion notifications', 
        'To modify tool parameters during execution',
        'To prevent dangerous tool operations from running'
      ],
      correctAnswer: 1,
      explanation: 'The PostToolUse hook runs after tool completion to process results, detect errors in tool responses, monitor performance metrics, and provide intelligent notifications about execution outcomes.',
      competencyDimension: 'knowledge',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q2', 
      question: 'When does the PostToolUse hook execute in the Claude Code workflow?',
      type: 'multiple-choice',
      options: [
        'Before a tool is selected for execution',
        'During tool parameter validation', 
        'Immediately after a tool completes successfully or with errors',
        'Only when a tool encounters an error condition'
      ],
      correctAnswer: 2,
      explanation: 'PostToolUse executes immediately after any tool completes, regardless of success or failure. This timing allows it to analyze actual results, detect errors from tool responses, and provide post-execution notifications.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q3',
      question: 'Which of the following error detection strategies does the PostToolUse hook use?',
      type: 'multiple-choice', 
      options: [
        'Only checking explicit error fields in tool responses',
        'Multi-layered detection including explicit errors, stderr analysis, exit codes, and tool-specific patterns',
        'Simple pattern matching on output text only',
        'Relying solely on Claude Code\'s built-in error handling'
      ],
      correctAnswer: 1,
      explanation: 'PostToolUse uses comprehensive error detection including explicit error fields, stderr output analysis, exit code checking for Bash commands, and tool-specific error patterns. This multi-layered approach catches errors that might be missed by single-method detection.',
      competencyDimension: 'analysis',
      difficulty: 'hard', 
      points: 20
    },
    {
      id: 'q4',
      question: 'How does the PostToolUse hook handle repeated error patterns?',
      type: 'multiple-choice',
      options: [
        'It ignores repeated errors to reduce noise',
        'It tracks error patterns, escalates repeated errors, and provides diagnostic suggestions',
        'It automatically blocks tools that repeatedly fail', 
        'It only reports the first occurrence of each error type'
      ],
      correctAnswer: 1,
      explanation: 'PostToolUse implements intelligent pattern detection that tracks repeated errors within a time window, escalates their severity when patterns emerge, and provides diagnostic suggestions to help resolve root causes.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q5',
      question: 'In enterprise environments, why is PostToolUse hook particularly valuable for performance monitoring and quality assurance?',
      type: 'multiple-choice',
      options: [
        'It speeds up tool execution by caching results',
        'It provides comprehensive execution analytics, error patterns, and success milestone tracking for operational insights',
        'It automatically fixes tool errors without human intervention',
        'It reduces system resource usage during tool operations'
      ],
      correctAnswer: 1,
      explanation: 'PostToolUse provides critical operational intelligence by tracking tool performance metrics, identifying error patterns for proactive resolution, logging success milestones, and enabling comprehensive observability for enterprise monitoring and quality assurance.',
      competencyDimension: 'synthesis',
      difficulty: 'hard',
      points: 20
    }
  ]
};

export default postToolUseAssessment;