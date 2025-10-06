/**
 * PreCompact Hook Assessment
 * Comprehensive assessment for testing understanding of conversation analysis, session compression, 
 * handoff context preparation, and insight extraction in Claude Code workflows
 * Achieving 100% hook coverage (9/9 hooks complete) for Phase 1 implementation
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

export const preCompactAssessment: AssessmentData = {
  id: 'pre-compact-assessment',
  title: 'PreCompact Hook Assessment',
  description: 'Test your understanding of conversation analysis, session compression, handoff context preparation, and insight extraction in Claude Code memory management',
  hookId: 'pre_compact',
  difficulty: 'intermediate',
  timeLimit: 300, // 5 minutes
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      question: 'What is the primary purpose of the PreCompact hook in Claude Code?',
      type: 'multiple-choice',
      options: [
        'To compress files before saving them to disk',
        'To analyze conversation content before memory compaction and generate session insights',
        'To validate user permissions before context operations',
        'To optimize database queries for better performance'
      ],
      correctAnswer: 1,
      explanation: 'The PreCompact hook executes before Claude Code compacts context memory, analyzing the conversation to extract insights, achievements, next steps, and blockers. This critical analysis preserves important information that would otherwise be lost during memory compression.',
      competencyDimension: 'knowledge',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q2',
      question: 'When does the PreCompact hook execute in the Claude Code workflow?',
      type: 'multiple-choice',
      options: [
        'At the beginning of each new session',
        'When the user submits a prompt',
        'Just before context memory is compressed due to token limits',
        'After each tool completes execution'
      ],
      correctAnswer: 2,
      explanation: 'PreCompact executes specifically before context compaction occurs, typically when Claude Code approaches token limits and needs to compress conversation memory. This timing ensures valuable session insights are captured before information is lost.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q3',
      question: 'What types of structured data does the PreCompact hook extract from conversation analysis?',
      type: 'multiple-choice',
      options: [
        'Only error messages and debugging information',
        'File names and directory structures',
        'Achievements, next steps, blockers, insights, and session metrics',
        'User preferences and system configurations'
      ],
      correctAnswer: 2,
      explanation: 'PreCompact performs comprehensive conversation analysis to extract achievements (what was accomplished), next steps (actionable tasks), blockers (obstacles preventing progress), insights (lessons learned), and session metrics (complexity, duration, files modified). This structured data enables session continuity and knowledge preservation.',
      competencyDimension: 'analysis',
      difficulty: 'hard',
      points: 20
    },
    {
      id: 'q4',
      question: 'How does the PreCompact hook contribute to session continuity across multiple Claude Code sessions?',
      type: 'multiple-choice',
      options: [
        'It backs up all conversation data to external storage',
        'It generates summaries that are automatically loaded by SessionStart hook for continuous learning',
        'It maintains a persistent database of all user interactions',
        'It prevents context compaction from ever occurring'
      ],
      correctAnswer: 1,
      explanation: 'PreCompact creates structured summary files that are automatically loaded by the SessionStart hook in subsequent sessions. This creates a continuous learning system where each session builds on insights from previous sessions, eliminating the "write-only" knowledge base problem.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q5',
      question: 'What makes the PreCompact hook particularly valuable for enterprise development workflows and team collaboration?',
      type: 'multiple-choice',
      options: [
        'It reduces server costs by compressing data more efficiently',
        'It provides comprehensive session documentation, handoff context, and knowledge preservation for team continuity and project management',
        'It automatically fixes code errors before they impact production',
        'It sends email notifications to all team members'
      ],
      correctAnswer: 1,
      explanation: 'PreCompact provides critical enterprise value by generating comprehensive session documentation (analysis reports), enabling smooth team handoffs (structured context), preserving institutional knowledge (insights and lessons learned), and maintaining project continuity across developers and sessions. The structured summaries serve as both technical documentation and management reporting.',
      competencyDimension: 'synthesis',
      difficulty: 'hard',
      points: 20
    }
  ]
};

export default preCompactAssessment;