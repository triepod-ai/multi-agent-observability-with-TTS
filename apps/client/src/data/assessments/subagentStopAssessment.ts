/**
 * SubagentStop Hook Assessment
 * Comprehensive assessment for testing understanding of AI agent delegation, task completion notifications, and TTS filtering
 * Phase 1 implementation to achieve 50% hook coverage expansion
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

export const subagentStopAssessment: AssessmentData = {
  id: 'subagent-stop-assessment',
  title: 'SubagentStop Hook Assessment',
  description: 'Test your understanding of AI agent delegation, task completion notifications, and intelligent TTS filtering systems',
  hookId: 'subagent_stop',
  difficulty: 'intermediate',
  timeLimit: 300, // 5 minutes
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      question: 'What is the primary purpose of the SubagentStop hook in Claude Code?',
      type: 'multiple-choice',
      options: [
        'To prevent subagents from starting execution',
        'To track completion of specialized AI agents with performance metrics and notifications',
        'To validate subagent permissions before delegation',
        'To compress subagent data to save memory'
      ],
      correctAnswer: 1,
      explanation: 'The SubagentStop hook manages completion of specialized AI agents (subagents), providing intelligent TTS filtering, performance metrics, task summaries, and observability tracking. It helps track the effectiveness of agent delegation.',
      competencyDimension: 'knowledge',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q2',
      question: 'How does the SubagentStop hook extract agent names from task execution?',
      type: 'multiple-choice',
      options: [
        'Only from explicit agent name fields in JSON data',
        'Using multiple detection strategies including @-mentions, Task tool delegation, and keyword pattern matching',
        'By scanning file names for agent identifiers',
        'From user prompt history exclusively'
      ],
      correctAnswer: 1,
      explanation: 'The SubagentStop hook uses multi-strategy agent name extraction: Strategy 1 detects @-mentions (e.g., "@code-reviewer"), Strategy 2 finds Task tool delegation patterns ("delegate to analyzer-agent"), and Strategy 3 uses keyword matching to identify agent types from context.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q3',
      question: 'What is the purpose of intelligent TTS filtering for generic agents in the SubagentStop hook?',
      type: 'multiple-choice',
      options: [
        'To completely disable observability for utility agents',
        'To reduce audio notification spam while maintaining full metrics tracking',
        'To prevent generic agents from executing at all',
        'To compress TTS messages to save bandwidth'
      ],
      correctAnswer: 1,
      explanation: 'Intelligent TTS filtering reduces audio notification spam by filtering out generic/utility agents from TTS announcements while maintaining full observability. Generic agents (type="generic") are automatically filtered from TTS, but all metrics, events, and tracking remain active.',
      competencyDimension: 'analysis',
      difficulty: 'hard',
      points: 20
    },
    {
      id: 'q4',
      question: 'Which performance metrics does the SubagentStop hook capture for agent execution analysis?',
      type: 'multiple-choice',
      options: [
        'Only execution duration and success status',
        'Token usage, estimated cost, tools used count, duration, and success status',
        'Just the agent name and completion time',
        'Only error messages and failure reasons'
      ],
      correctAnswer: 1,
      explanation: 'The SubagentStop hook captures comprehensive performance metrics including token usage, estimated cost calculations, tools used count, execution duration in milliseconds, success/partial/failure status, and detailed execution metadata for complete agent performance analysis.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q5',
      question: 'How does the enhanced agent type classification system in SubagentStop improve observability and reduce notification fatigue?',
      type: 'multiple-choice',
      options: [
        'By blocking all agents except the most important ones',
        'Using 30+ specific agent types to minimize generic classifications and selectively enable TTS for specialized agents',
        'By combining all agents into a single notification',
        'By only tracking agents that take longer than 5 seconds'
      ],
      correctAnswer: 1,
      explanation: 'The enhanced system classifies agents into 30+ specific types (data-processor, code-reviewer, debugger, etc.) instead of generic categories. This minimizes "generic" classifications, ensures specialized agents (debugger, reviewer) trigger important TTS notifications while utility agents operate silently, reducing notification fatigue while maintaining full observability.',
      competencyDimension: 'synthesis',
      difficulty: 'hard',
      points: 20
    }
  ]
};

export default subagentStopAssessment;