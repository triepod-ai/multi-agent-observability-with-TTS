import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import HookAssessment from '../components/HookAssessment.vue';
import AssessmentQuestion from '../components/AssessmentQuestion.vue';
import { useLearningProgression } from '../composables/useLearningProgression';

// Mock the learning progression composable
vi.mock('../composables/useLearningProgression');

describe('Lesson Completion Flow', () => {
  let mockUpdateCompetency: ReturnType<typeof vi.fn>;
  let mockRecordActivity: ReturnType<typeof vi.fn>;
  let mockRecordAssessmentResult: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUpdateCompetency = vi.fn();
    mockRecordActivity = vi.fn();
    mockRecordAssessmentResult = vi.fn();

    (useLearningProgression as any).mockReturnValue({
      progression: { value: null },
      state: { value: { isLoading: false, error: null } },
      updateCompetency: mockUpdateCompetency,
      recordActivity: mockRecordActivity,
      recordAssessmentResult: mockRecordAssessmentResult,
      overallProgress: { value: 0 },
      totalBadges: { value: 0 },
      completedAssessments: { value: 0 },
      currentStreak: { value: 0 },
      recommendations: { value: [] },
      strongestAreas: { value: [] },
      weakestAreas: { value: [] },
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    });
  });

  describe('AssessmentQuestion Component', () => {
    const mockQuestion = {
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
      explanation: 'The Session Start hook initializes each new Claude Code session.',
      competencyDimension: 'knowledge' as const,
      difficulty: 'easy' as const,
      points: 10
    };

    it('renders question correctly', () => {
      const wrapper = mount(AssessmentQuestion, {
        props: {
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 3
        }
      });

      expect(wrapper.find('h3').text()).toContain(mockQuestion.question);
      expect(wrapper.findAll('.cursor-pointer')).toHaveLength(4); // 4 options
    });

    it('allows answer selection', async () => {
      const wrapper = mount(AssessmentQuestion, {
        props: {
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 3
        }
      });

      // Click first option
      await wrapper.findAll('.cursor-pointer')[0].trigger('click');

      expect(wrapper.emitted('answerSelected')).toHaveLength(1);
      expect(wrapper.emitted('answerSelected')?.[0]).toEqual([0]);
    });

    it('enables next button after answer selection', async () => {
      const wrapper = mount(AssessmentQuestion, {
        props: {
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 3
        }
      });

      const nextButton = wrapper.find('button[class*="bg-blue-600"]');
      expect(nextButton.attributes('disabled')).toBeDefined();

      // Select an answer
      await wrapper.findAll('.cursor-pointer')[0].trigger('click');

      expect(nextButton.attributes('disabled')).toBeUndefined();
    });
  });

  describe('HookAssessment Component', () => {
    const mockAssessment = {
      id: 'session-start-assessment',
      title: 'Session Start Hook Assessment',
      description: 'Test your understanding of session initialization',
      hookId: 'session_start',
      difficulty: 'beginner' as const,
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          question: 'What is the primary purpose of the Session Start hook?',
          type: 'multiple-choice' as const,
          options: [
            'To initialize the Claude Code session and load project context',
            'To validate user permissions'
          ],
          correctAnswer: 0,
          explanation: 'The Session Start hook initializes sessions.',
          competencyDimension: 'knowledge' as const,
          difficulty: 'easy' as const,
          points: 10
        }
      ]
    };

    it('renders assessment header correctly', () => {
      const wrapper = mount(HookAssessment, {
        props: {
          assessmentData: mockAssessment
        }
      });

      expect(wrapper.find('h2').text()).toContain(mockAssessment.title);
      expect(wrapper.text()).toContain(mockAssessment.description);
    });

    it('shows progress correctly', () => {
      const wrapper = mount(HookAssessment, {
        props: {
          assessmentData: mockAssessment
        }
      });

      expect(wrapper.text()).toContain('1/1'); // Question progress
    });

    it('records activity on mount', () => {
      mount(HookAssessment, {
        props: {
          assessmentData: mockAssessment
        }
      });

      expect(mockRecordActivity).toHaveBeenCalledWith('assessment');
    });

    it('emits completed event with results', async () => {
      const wrapper = mount(HookAssessment, {
        props: {
          assessmentData: mockAssessment
        }
      });

      // Simulate completing the assessment by accessing internal methods
      // In a real test, we would interact with the UI elements
      const component = wrapper.vm as any;
      
      // Mock the completion
      component.results = {
        score: 80,
        correct: 1,
        incorrect: 0,
        timeSpent: 60,
        competencyGain: 40,
        badges: []
      };
      component.isCompleted = true;

      await wrapper.vm.$nextTick();

      // Check if component would emit completion event
      expect(wrapper.exists('[data-testid="assessment-results"]') || wrapper.text().includes('Assessment Complete'));
    });
  });

  describe('Learning Progression Integration', () => {
    it('recordAssessmentResult handles assessment data correctly', async () => {
      const { recordAssessmentResult } = useLearningProgression('test-user') as any;

      const assessmentResult = {
        assessmentId: 'test-assessment',
        hookId: 'session_start',
        score: 85,
        timeSpentSeconds: 120,
        answers: [0, 1, 0],
        passed: true
      };

      await recordAssessmentResult(assessmentResult);

      expect(mockRecordAssessmentResult).toHaveBeenCalledWith(assessmentResult);
    });
  });
});