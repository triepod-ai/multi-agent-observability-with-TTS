/**
 * Notification Hook Assessment
 * Comprehensive assessment for testing understanding of system notifications, permission requests, idle timeouts, and user interaction prompts
 * Phase 1 implementation continuing hook coverage expansion from 62.5% toward 75%
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

export const notificationAssessment: AssessmentData = {
  id: 'notification-assessment',
  title: 'Notification Hook Assessment',
  description: 'Test your understanding of system notifications, permission requests, idle timeouts, and user interaction prompts in Claude Code',
  hookId: 'notification',
  difficulty: 'intermediate',
  timeLimit: 300, // 5 minutes
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      question: 'What is the primary purpose of the Notification hook in Claude Code?',
      type: 'multiple-choice',
      options: [
        'To send push notifications to mobile devices',
        'To manage system notifications, permission requests, idle timeouts, and user interaction prompts',
        'To log all user actions to a notification database',
        'To automatically approve all system permissions'
      ],
      correctAnswer: 1,
      explanation: 'The Notification hook manages critical system communications including permission requests, system alerts, idle timeout warnings, and user interaction prompts. It ensures important system events are effectively communicated to users and handles their responses appropriately.',
      competencyDimension: 'knowledge',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q2',
      question: 'How does the Notification hook handle permission requests in Claude Code workflows?',
      type: 'multiple-choice',
      options: [
        'By automatically granting all permissions without user interaction',
        'By presenting interactive permission dialogs and capturing user consent before proceeding',
        'By logging permission requests but continuing execution regardless',
        'By blocking all operations that require permissions'
      ],
      correctAnswer: 1,
      explanation: 'The Notification hook presents interactive permission dialogs when Claude Code needs specific access (file system, network, external tools). It captures user consent through clear prompts and only proceeds with operations after explicit approval, ensuring security and user control.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q3',
      question: 'When would the Notification hook trigger an idle timeout warning?',
      type: 'multiple-choice',
      options: [
        'After every tool execution to prevent overuse',
        'When Claude has been inactive for an extended period with pending user input or long-running operations',
        'Only when the system runs out of memory',
        'Immediately when any error occurs'
      ],
      correctAnswer: 1,
      explanation: 'The Notification hook monitors session activity and triggers idle timeout warnings when Claude has been inactive for extended periods, especially when there is pending user input or long-running operations. This helps users understand system state and prevents resource waste while maintaining session awareness.',
      competencyDimension: 'analysis',
      difficulty: 'hard',
      points: 20
    },
    {
      id: 'q4',
      question: 'What types of system alerts does the Notification hook manage in development workflows?',
      type: 'multiple-choice',
      options: [
        'Only critical errors that stop execution',
        'Resource usage warnings, security alerts, dependency conflicts, and operation completion status',
        'Just network connectivity issues',
        'Only user-generated custom notifications'
      ],
      correctAnswer: 1,
      explanation: 'The Notification hook manages comprehensive system alerts including resource usage warnings (memory, disk space), security alerts (suspicious operations, permission escalations), dependency conflicts, build failures, operation completion status, and other critical system events that require user awareness or action.',
      competencyDimension: 'application',
      difficulty: 'medium',
      points: 15
    },
    {
      id: 'q5',
      question: 'How does the Notification hook enhance user experience and system reliability in Claude Code?',
      type: 'multiple-choice',
      options: [
        'By eliminating all user interactions to streamline workflows',
        'By providing transparent system communication, secure permission handling, proactive timeout management, and contextual user prompts that maintain user control and system awareness',
        'By automatically fixing all system issues without user notification',
        'By disabling all notifications to reduce distractions'
      ],
      correctAnswer: 1,
      explanation: 'The Notification hook enhances UX and reliability by providing transparent system communication about important events, secure permission handling that maintains user control, proactive timeout management that prevents resource waste, and contextual user prompts that keep users informed about system state and required actions. This creates a balance between automation and user agency.',
      competencyDimension: 'synthesis',
      difficulty: 'hard',
      points: 20
    }
  ]
};

export default notificationAssessment;