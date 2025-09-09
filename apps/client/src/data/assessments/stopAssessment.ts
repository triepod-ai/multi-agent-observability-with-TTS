/**
 * Stop Hook Assessment
 * Comprehensive assessment for testing understanding of session completion, intelligent summaries, and outcome tracking
 * Phase 1 implementation to achieve 62.5% hook coverage expansion
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

export const stopAssessment: AssessmentData = {
  id: 'stop-assessment',
  title: 'Stop Hook Assessment',
  description: 'Test your understanding of session completion, intelligent summary generation, and outcome tracking in Claude Code',
  hookId: 'stop',
  difficulty: 'intermediate',
  timeLimit: 300, // 5 minutes
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      question: 'What is the primary purpose of the Stop hook in Claude Code?',
      type: 'multiple-choice',
      options: [
        'To prevent Claude from executing any more tools',
        'To provide intelligent summaries when Claude finishes working with context-aware analysis',
        'To save all session data to disk before shutdown',
        'To validate that all tasks were completed successfully'
      ],
      correctAnswer: 1,
      explanation: 'The Stop hook provides intelligent summaries when Claude Code finishes tasks by analyzing session activity (tools used, files modified, commands run), generating context-aware summaries, and announcing completion with meaningful context through TTS.',
      competencyDimension: 'knowledge',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q2',
      question: 'How does the Stop hook generate context-aware summaries of work performed?',
      type: 'multiple-choice',
      options: [
        'By reading only the last user prompt to determine what was requested',
        'By analyzing recent tool usage, files modified, commands run, and applying smart summary logic',
        'By asking Claude to provide a summary before stopping',
        'By scanning git commit messages for context clues'
      ],
      correctAnswer: 1,
      explanation: 'The Stop hook analyzes recent session activity including tools used, files modified, and commands run. It applies smart summary logic to detect patterns like UI work (Magic tool + .vue/.tsx files), documentation (.md files), testing (test commands), configuration changes, and analysis work.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q3',
      question: 'What type of intelligent summary would the Stop hook generate if Claude used the Magic tool and modified .vue and .tsx files?',
      type: 'multiple-choice',
      options: [
        '"I have finished analyzing the codebase"',
        '"I have finished implementing UI redesign with new components"',
        '"I have finished updating the configuration"',
        '"I have finished running the tests"'
      ],
      correctAnswer: 1,
      explanation: 'The Stop hook\'s smart summary logic detects UI work by identifying Magic tool usage combined with frontend file modifications (.vue, .tsx, .jsx files). This triggers UI-focused summaries like "implementing UI redesign with X new components" rather than generic completion messages.',
      competencyDimension: 'analysis',
      difficulty: 'hard',
      points: 20
    },
    {
      id: 'q4',
      question: 'Which session activity data does the Stop hook capture for generating outcome summaries?',
      type: 'multiple-choice',
      options: [
        'Only the final tool execution result',
        'Tools used, files modified, commands run, last user prompt, key actions, and error detection',
        'Just the execution duration and success status',
        'Only files that were successfully saved to disk'
      ],
      correctAnswer: 1,
      explanation: 'The Stop hook performs comprehensive session activity analysis, capturing tools used, files modified, commands run, the last user prompt for context, key actions performed, test results if applicable, and whether any errors were encountered during the session.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q5',
      question: 'How does the Stop hook\'s intelligent summary system provide closure and context for development workflows?',
      type: 'multiple-choice',
      options: [
        'By simply announcing that Claude has stopped working',
        'By generating personalized TTS announcements with meaningful work context and preserving session outcomes for future reference',
        'By automatically committing all changes to version control',
        'By sending email notifications about completed tasks'
      ],
      correctAnswer: 1,
      explanation: 'The Stop hook provides closure by generating personalized TTS announcements with meaningful work context (e.g., "finished implementing UI redesign with 6 new components"), tracks session outcomes through observability events, and preserves context for future sessions through its comprehensive activity analysis and summary generation.',
      competencyDimension: 'synthesis',
      difficulty: 'hard',
      points: 20
    }
  ]
};

export default stopAssessment;