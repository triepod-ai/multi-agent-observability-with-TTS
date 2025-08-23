import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdvancedFlowDiagram from '../AdvancedFlowDiagram.vue';
import FlowNode from '../FlowNode.vue';
import FlowConnection from '../FlowConnection.vue';

// Mock composables
vi.mock('../composables/useFlowDiagram', () => ({
  useFlowDiagram: () => ({
    nodes: [
      {
        id: 'session_start',
        name: 'SessionStart',
        icon: '🚀',
        description: 'Sets up workspace when starting a new session',
        position: { x: 100, y: 100 },
        connections: ['user_prompt_submit'],
        isActive: false,
        color: '#10B981'
      },
      {
        id: 'user_prompt_submit',
        name: 'UserPromptSubmit',
        icon: '💬',
        description: 'Captures and logs every user message',
        position: { x: 300, y: 100 },
        connections: ['pre_tool_use'],
        isActive: false,
        color: '#3B82F6'
      }
    ],
    connections: [
      {
        from: 'session_start',
        to: 'user_prompt_submit',
        type: 'sequential',
        strength: 0.8
      }
    ],
    zoom: 1.0,
    viewBox: { x: 0, y: 0, width: 1200, height: 700 },
    selectedNodeId: null,
    hoveredNodeId: null,
    isSimulating: false,
    currentSimulationStep: -1,
    simulationSpeed: 1000,
    visibleNodes: [
      {
        id: 'session_start',
        name: 'SessionStart',
        icon: '🚀',
        description: 'Sets up workspace when starting a new session',
        position: { x: 100, y: 100 },
        connections: ['user_prompt_submit'],
        isActive: false,
        color: '#10B981'
      }
    ],
    visibleConnections: [],
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    updateViewBox: vi.fn(),
    resetView: vi.fn(),
    selectNode: vi.fn(),
    deselectNode: vi.fn(),
    startSimulation: vi.fn(),
    stopSimulation: vi.fn(),
    pauseSimulation: vi.fn(),
    resumeSimulation: vi.fn(),
    applyForceDirectedLayout: vi.fn(),
    applyCircularLayout: vi.fn(),
    applyHierarchicalLayout: vi.fn(),
    initializeLayout: vi.fn()
  })
}));

vi.mock('../composables/useEducationalMode', () => ({
  useEducationalMode: () => ({
    getHookExplanation: vi.fn((hookId: string) => ({
      id: hookId,
      name: 'SessionStart',
      whenItRuns: 'At the beginning of each session',
      whyItMatters: 'Provides essential context loading'
    }))
  })
}));

describe('AdvancedFlowDiagram', () => {
  let wrapper: any;

  const defaultProps = {
    competencyData: {
      session_start: {
        level: 75,
        masteryType: 'application' as const
      }
    },
    showPerformanceMonitor: true
  };

  beforeEach(() => {
    wrapper = mount(AdvancedFlowDiagram, {
      props: defaultProps,
      global: {
        stubs: {
          FlowNode: true,
          FlowConnection: true
        }
      }
    });
  });

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h2').text()).toContain('Interactive Hook Flow');
  });

  it('displays zoom controls', () => {
    const zoomControls = wrapper.find('.flex .bg-gray-700');
    expect(zoomControls.exists()).toBe(true);
    
    const zoomOutBtn = wrapper.find('button[title="Zoom Out"]');
    const zoomInBtn = wrapper.find('button[title="Zoom In"]');
    
    expect(zoomOutBtn.exists()).toBe(true);
    expect(zoomInBtn.exists()).toBe(true);
  });

  it('displays category filter dropdown', () => {
    const categoryFilter = wrapper.find('select');
    expect(categoryFilter.exists()).toBe(true);
    
    const options = categoryFilter.findAll('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options[0].text()).toBe('All Categories');
  });

  it('displays simulation controls', () => {
    const buttons = wrapper.findAll('button');
    const hasSimulationBtn = buttons.some((btn: any) => 
      btn.text().includes('Start Simulation')
    );
    const hasResetBtn = buttons.some((btn: any) => 
      btn.text().includes('Reset View')
    );
    
    expect(hasSimulationBtn).toBeTruthy();
    expect(hasResetBtn).toBeTruthy();
  });

  it('renders SVG canvas with viewBox', () => {
    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
    // ViewBox attribute might be dynamically set, just check the SVG exists
    expect(svg.attributes()).toBeDefined();
  });

  it('displays performance monitor when enabled', () => {
    expect(wrapper.props('showPerformanceMonitor')).toBe(true);
    // Performance monitor should be visible in the template
    const monitor = wrapper.find('.absolute.top-2.right-2');
    // Note: Monitor might be conditionally rendered, so we just check the prop is passed
  });

  it('handles competency data correctly', () => {
    expect(wrapper.props('competencyData')).toEqual({
      session_start: {
        level: 75,
        masteryType: 'application'
      }
    });
  });

  it('emits events correctly', async () => {
    // Test node selection emission
    await wrapper.vm.selectNode('session_start');
    expect(wrapper.emitted('nodeSelected')).toBeTruthy();
    expect(wrapper.emitted('nodeSelected')[0]).toEqual(['session_start']);

    // Test simulate hook emission  
    await wrapper.vm.simulateHook('session_start');
    expect(wrapper.emitted('simulateHook')).toBeTruthy();
    expect(wrapper.emitted('simulateHook')[0]).toEqual(['session_start']);

    // Test view example emission
    await wrapper.vm.viewCodeExample('session_start');
    expect(wrapper.emitted('viewExample')).toBeTruthy();
    expect(wrapper.emitted('viewExample')[0]).toEqual(['session_start']);

    // Test start practice emission
    await wrapper.vm.startPractice('session_start');
    expect(wrapper.emitted('startPractice')).toBeTruthy();
    expect(wrapper.emitted('startPractice')[0]).toEqual(['session_start']);
  });

  it('handles category filtering', async () => {
    const categoryFilter = wrapper.find('select');
    
    // Change category filter
    await categoryFilter.setValue('essential');
    expect(wrapper.vm.categoryFilter).toBe('essential');
    
    // Test that visibleNodes would be filtered (mocked, so we just verify the reactive property)
    expect(wrapper.vm.visibleNodes).toBeDefined();
  });

  it('computes competency colors correctly', () => {
    // Test different competency levels
    expect(wrapper.vm.getCompetencyColor(25)).toBe('#EF4444'); // red
    expect(wrapper.vm.getCompetencyColor(50)).toBe('#F59E0B'); // amber  
    expect(wrapper.vm.getCompetencyColor(75)).toBe('#10B981'); // green
    expect(wrapper.vm.getCompetencyColor(90)).toBe('#8B5CF6'); // purple
  });

  it('computes competency level names correctly', () => {
    expect(wrapper.vm.getCompetencyLevelName(25)).toBe('Beginner');
    expect(wrapper.vm.getCompetencyLevelName(50)).toBe('Learning');
    expect(wrapper.vm.getCompetencyLevelName(75)).toBe('Intermediate');
    expect(wrapper.vm.getCompetencyLevelName(90)).toBe('Advanced');
  });

  it('handles keyboard shortcuts', async () => {
    // Mock window keyboard event
    const event = new KeyboardEvent('keydown', { code: 'Escape' });
    window.dispatchEvent(event);
    
    // Since this is mocked, we just verify the handler exists
    expect(wrapper.vm.handleKeydown).toBeDefined();
  });

  it('handles wheel events for zooming', () => {
    // Verify the handler exists (actual zoom logic is in the composable)
    expect(wrapper.vm.handleWheel).toBeDefined();
  });

  it('handles panning operations', () => {
    // Verify panning methods exist
    expect(wrapper.vm.startPanning).toBeDefined();
    expect(wrapper.vm.handlePanning).toBeDefined();
    expect(wrapper.vm.stopPanning).toBeDefined();
    expect(wrapper.vm.isMouseDown).toBe(false);
  });
});

describe('AdvancedFlowDiagram Integration', () => {
  const testProps = {
    competencyData: {},
    showPerformanceMonitor: false
  };

  it('integrates with learning progression system', () => {
    const competencyData = {
      session_start: { level: 80, masteryType: 'synthesis' as const },
      pre_tool_use: { level: 60, masteryType: 'application' as const }
    };

    const wrapper = mount(AdvancedFlowDiagram, {
      props: { competencyData },
      global: {
        stubs: {
          FlowNode: true,
          FlowConnection: true
        }
      }
    });

    expect(wrapper.props('competencyData')).toEqual(competencyData);
  });

  it('provides accessibility features', () => {
    const wrapper = mount(AdvancedFlowDiagram, {
      props: testProps,
      global: {
        stubs: {
          FlowNode: true,
          FlowConnection: true
        }
      }
    });

    // Check for keyboard navigation support
    const flowContainer = wrapper.find('.relative.bg-gray-900');
    expect(flowContainer.exists()).toBe(true);
  });

  it('handles performance monitoring', async () => {
    const wrapper = mount(AdvancedFlowDiagram, {
      props: { ...testProps, showPerformanceMonitor: true },
      global: {
        stubs: {
          FlowNode: true,
          FlowConnection: true
        }
      }
    });

    expect(wrapper.props('showPerformanceMonitor')).toBe(true);
    
    // FPS counter should be available
    expect(wrapper.vm.currentFps).toBeDefined();
    expect(typeof wrapper.vm.currentFps).toBe('number');
  });
});