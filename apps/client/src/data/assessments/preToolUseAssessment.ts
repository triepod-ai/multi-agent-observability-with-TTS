/**
 * PreToolUse Hook Assessment
 * Comprehensive assessment for testing understanding of tool validation, security awareness, and Claude Code workflow
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

export const preToolUseAssessment: AssessmentData = {
  id: 'pre-tool-use-assessment',
  title: 'PreToolUse Hook Assessment',
  description: 'Test your understanding of tool validation, security patterns, and Claude Code workflow integration',
  hookId: 'pre_tool_use',
  difficulty: 'intermediate',
  timeLimit: 300, // 5 minutes
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      question: 'What is the primary purpose of the PreToolUse hook?',
      type: 'multiple-choice',
      options: [
        'To validate and announce tools before Claude uses them',
        'To execute tools on behalf of Claude',
        'To clean up after tool execution',
        'To monitor system performance during tool use'
      ],
      correctAnswer: 0,
      explanation: 'The PreToolUse hook acts as a security gate that validates and announces tools before Claude executes them, providing context-aware notifications and security filtering.',
      competencyDimension: 'knowledge',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q2',
      question: 'Which of these is a key security benefit of the PreToolUse hook?',
      type: 'multiple-choice',
      options: [
        'It speeds up tool execution',
        'It can block dangerous commands before they execute',
        'It automatically fixes tool errors',
        'It reduces memory usage during tool operations'
      ],
      correctAnswer: 1,
      explanation: 'The PreToolUse hook provides critical security validation by analyzing tool requests and blocking dangerous commands (like rm -rf /, format commands, etc.) before they can execute and cause system damage.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q3',
      question: 'When implementing a PreToolUse security validation, which approach is most effective?',
      type: 'multiple-choice',
      options: [
        'Only check tool names, ignore parameters',
        'Block all Bash commands for maximum security',
        'Use pattern matching on both tool names and command content',
        'Rely solely on user permissions for validation'
      ],
      correctAnswer: 2,
      explanation: 'Effective security validation requires analyzing both tool names AND command content using pattern matching. This catches dangerous operations like "rm -rf /" in Bash commands while allowing safe operations to proceed.',
      competencyDimension: 'analysis',
      difficulty: 'hard',
      points: 20
    },
    {
      id: 'q4',
      question: 'What happens when a PreToolUse hook returns a non-zero exit code?',
      type: 'multiple-choice',
      options: [
        'The tool executes with a warning message',
        'Claude automatically retries with different parameters',
        'The tool execution is blocked and prevented',
        'The hook runs again with elevated permissions'
      ],
      correctAnswer: 2,
      explanation: 'A non-zero exit code from the PreToolUse hook indicates failure and blocks the tool from executing. This is the security mechanism that prevents dangerous operations from proceeding.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q5',
      question: 'In the context of Claude Code workflow, why is the PreToolUse hook particularly important for enterprise environments?',
      type: 'multiple-choice',
      options: [
        'It improves code completion speed',
        'It provides audit trails and prevents unauthorized system access',
        'It automatically backs up files before editing',
        'It optimizes network bandwidth usage'
      ],
      correctAnswer: 1,
      explanation: 'In enterprise environments, the PreToolUse hook provides critical governance by creating audit trails of all tool usage and preventing unauthorized system access through security validation patterns.',
      competencyDimension: 'synthesis',
      difficulty: 'hard',
      points: 20
    }
  ]
};

export default preToolUseAssessment;