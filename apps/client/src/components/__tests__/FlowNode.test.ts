import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FlowNode from '../FlowNode.vue';
import type { HookFlowStep } from '../../types';

describe('FlowNode', () => {
  let wrapper: any;

  const mockNode: HookFlowStep = {
    id: 'session_start',
    name: 'SessionStart',
    icon: '🚀',
    description: 'Sets up workspace when starting a new session',
    position: { x: 100, y: 100 },
    connections: ['user_prompt_submit'],
    isActive: false,
    color: '#10B981'
  };

  const mockCompetency = {
    level: 75,
    masteryType: 'application' as const
  };

  const defaultProps = {
    node: mockNode,
    competency: mockCompetency,
    isSelected: false,
    isActive: false,
    zoom: 1.0,
    showMetrics: true,
    executionCount: 5,
    successRate: 95,
    avgDuration: 150
  };

  beforeEach(() => {
    wrapper = mount(FlowNode, {
      props: defaultProps
    });
  });

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true);
    
    // Check that the SVG group exists
    const group = wrapper.find('g.flow-node');
    expect(group.exists()).toBe(true);
  });

  it('displays node icon and name', () => {
    const iconText = wrapper.find('.node-icon');
    const nameText = wrapper.find('.node-name');
    
    expect(iconText.text()).toBe('🚀');
    expect(nameText.text()).toBe('SessionStart');
  });

  it('shows competency badge when competency data is provided', () => {
    const competencyBadge = wrapper.find('.competency-badge');
    expect(competencyBadge.exists()).toBe(true);
  });

  it('displays correct competency level', () => {
    // Level 75 should map to 'I' (Intermediate)
    expect(wrapper.vm.competencyDisplay).toBe('I');
  });

  it('shows correct competency color', () => {
    // Level 75 should be green
    expect(wrapper.vm.competencyColor).toBe('#10B981');
  });

  it('handles active state correctly', async () => {
    await wrapper.setProps({ isActive: true });
    
    expect(wrapper.classes()).toContain('node-active');
    
    // Should show active pulse ring
    const pulseRing = wrapper.find('.active-pulse');
    expect(pulseRing.exists()).toBe(true);
  });

  it('handles selected state correctly', async () => {
    await wrapper.setProps({ isSelected: true });
    
    expect(wrapper.classes()).toContain('node-selected');
    
    // Should show selection ring
    const selectionRing = wrapper.find('.selection-ring');
    expect(selectionRing.exists()).toBe(true);
  });

  it('shows performance metrics when enabled', () => {
    const metricsText = wrapper.vm.metricsText;
    expect(metricsText).toBe('5 runs • 95% • 150ms');
  });

  it('truncates long names based on zoom level', async () => {
    const longNameNode = { ...mockNode, name: 'VeryLongSessionStartHookName' };
    await wrapper.setProps({ node: longNameNode, zoom: 0.5 });
    
    const displayName = wrapper.vm.displayName;
    expect(displayName.length).toBeLessThan(longNameNode.name.length);
    expect(displayName).toContain('...');
  });

  it('emits click event when clicked', async () => {
    await wrapper.find('.interaction-area').trigger('click');
    
    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('click')[0]).toEqual(['session_start']);
  });

  it('emits hover events correctly', async () => {
    await wrapper.find('g.flow-node').trigger('mouseenter');
    expect(wrapper.emitted('hover')).toBeTruthy();
    expect(wrapper.emitted('hover')[0]).toEqual(['session_start']);

    await wrapper.find('g.flow-node').trigger('mouseleave');
    expect(wrapper.emitted('hover')[1]).toEqual([null]);
  });

  it('calculates status indicator color based on success rate', () => {
    // 95% success rate should be green
    expect(wrapper.vm.statusIndicatorColor).toBe('#10B981');
  });

  it('handles low success rate correctly', async () => {
    await wrapper.setProps({ successRate: 70 });
    expect(wrapper.vm.statusIndicatorColor).toBe('#EF4444'); // red
  });

  it('handles medium success rate correctly', async () => {
    await wrapper.setProps({ successRate: 85 });
    expect(wrapper.vm.statusIndicatorColor).toBe('#F59E0B'); // amber
  });

  it('shows competency badge only when zoom is sufficient', async () => {
    await wrapper.setProps({ zoom: 0.5 });
    expect(wrapper.vm.showCompetencyBadge).toBe(false);

    await wrapper.setProps({ zoom: 0.8 });
    expect(wrapper.vm.showCompetencyBadge).toBe(true);
  });

  it('handles different competency levels correctly', async () => {
    // Test beginner level
    await wrapper.setProps({ competency: { level: 25, masteryType: 'knowledge' } });
    expect(wrapper.vm.competencyDisplay).toBe('B');
    expect(wrapper.vm.competencyColor).toBe('#EF4444');

    // Test learning level  
    await wrapper.setProps({ competency: { level: 50, masteryType: 'application' } });
    expect(wrapper.vm.competencyDisplay).toBe('L');
    expect(wrapper.vm.competencyColor).toBe('#F59E0B');

    // Test advanced level
    await wrapper.setProps({ competency: { level: 90, masteryType: 'synthesis' } });
    expect(wrapper.vm.competencyDisplay).toBe('A');
    expect(wrapper.vm.competencyColor).toBe('#8B5CF6');
  });

  it('applies correct styling based on node state', () => {
    // Default state
    expect(wrapper.vm.nodeFill).toBe('#1F2937');
    expect(wrapper.vm.nodeStroke).toBe('#4B5563');
  });

  it('applies active styling when node is active', async () => {
    await wrapper.setProps({ isActive: true });
    
    expect(wrapper.vm.nodeFill).toContain('40'); // Should have opacity
    expect(wrapper.vm.nodeStroke).toBe('#10B981'); // Should use node color
  });

  it('applies selected styling when node is selected', async () => {
    await wrapper.setProps({ isSelected: true });
    
    expect(wrapper.vm.nodeStroke).toBe('#3B82F6'); // Blue selection color
  });

  it('handles no competency data gracefully', async () => {
    await wrapper.setProps({ competency: undefined });
    
    expect(wrapper.vm.competencyColor).toBe('#6B7280');
    expect(wrapper.vm.competencyDisplay).toBe('?');
  });

  it('handles no metrics data gracefully', async () => {
    await wrapper.setProps({ executionCount: 0 });
    
    expect(wrapper.vm.metricsText).toBe('No executions');
  });
});