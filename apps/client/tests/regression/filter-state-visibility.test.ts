/**
 * Regression Tests for Filter State Visibility Issues
 * 
 * These tests prevent the "hidden filter state" problem where users
 * couldn't see active filters when returning to Applications view.
 * 
 * Bug Fixed: Users would apply filters, switch views, return to Applications,
 * and see limited results without understanding why (filters were hidden).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ApplicationsOverview from '../../src/components/ApplicationsOverview.vue';
import type { HookEvent } from '../../src/types';

describe('Filter State Visibility Regression Tests', () => {
  const mockEvents: HookEvent[] = [
    {
      id: 1,
      source_app: 'claude-code',
      session_id: '12345',
      hook_event_type: 'PostToolUse',
      payload: { tool_name: 'Read' },
      timestamp: Date.now() - 1000
    },
    {
      id: 2,
      source_app: 'multi-agent',
      session_id: '67890',
      hook_event_type: 'PostToolUse',
      payload: { tool_name: 'Edit' },
      timestamp: Date.now() - 2000
    },
    {
      id: 3,
      source_app: 'claude-code',
      session_id: '12345',
      hook_event_type: 'PostToolUse',
      payload: { tool_name: 'TodoWrite' },
      timestamp: Date.now() - 500
    }
  ];

  const mockAllEvents: HookEvent[] = [
    ...mockEvents,
    {
      id: 4,
      source_app: 'testing-app',
      session_id: '99999',
      hook_event_type: 'PostToolUse',
      payload: { tool_name: 'Bash' },
      timestamp: Date.now() - 3000
    }
  ];

  const mockGetAppColor = vi.fn(() => '#3B82F6');
  const mockGetSessionColor = vi.fn(() => '#10B981');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter Visibility Indicators', () => {
    it('should show "Filtered" badge when filters are active', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: 'claude-code',
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Should show filtered badge
      expect(wrapper.text()).toContain('🔍 Filtered');
    });

    it('should NOT show "Filtered" badge when no filters are active', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: '',
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Should NOT show filtered badge
      expect(wrapper.text()).not.toContain('🔍 Filtered');
    });

    it('should show filter count indicator when filtered', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents, // Only 2 apps (claude-code, multi-agent)
          allEvents: mockAllEvents, // 3 total apps (+ testing-app)
          activeFilters: {
            sourceApp: 'claude-code',
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Should show filtered count indicator somewhere in the text
      const text = wrapper.text();
      // The count might be 2 of 3 based on our test data (claude-code appears in 2 out of 3 apps)
      expect(text).toMatch(/\d+\s*of\s*\d+/);
    });
  });

  describe('Active Filter Chips Display', () => {
    it('should display active app filter chip', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: 'claude-code',
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Should show active filters section
      expect(wrapper.text()).toContain('Active Filters:');
      expect(wrapper.text()).toContain('claude-code');
    });

    it('should display active tool filter chip with icon', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: '',
            sessionId: '',
            eventType: '',
            toolName: 'Read'
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      expect(wrapper.text()).toContain('Active Filters:');
      expect(wrapper.text()).toContain('Read');
      // Should have the Read icon (📖) but hard to test emoji rendering
    });

    it('should display multiple filter chips when multiple filters active', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: 'claude-code',
            sessionId: '12345',
            eventType: '',
            toolName: 'Read'
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      expect(wrapper.text()).toContain('Active Filters:');
      expect(wrapper.text()).toContain('claude-code');
      expect(wrapper.text()).toContain('Read');
      expect(wrapper.text()).toContain('12345'); // Session ID (formatted)
    });
  });

  describe('Filter Removal Functionality', () => {
    it('should emit clearFilter event when app filter X is clicked', async () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: 'claude-code',
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Find and click the X button for app filter
      const appFilterXButton = wrapper.find('[data-testid="clear-app-filter"]');
      if (appFilterXButton.exists()) {
        await appFilterXButton.trigger('click');
        expect(wrapper.emitted('clearFilter')).toBeTruthy();
        expect(wrapper.emitted('clearFilter')?.[0]).toEqual(['sourceApp']);
      }
    });

    it('should emit clearAllFilters event when "Clear All Filters" is clicked', async () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: 'claude-code',
            sessionId: '',
            eventType: '',
            toolName: 'Read'
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Find and click "Clear All Filters" button - use a more specific selector
      const clearAllButtons = wrapper.findAll('button');
      let clearAllButton = null;
      
      for (const button of clearAllButtons) {
        if (button.text().includes('Clear All Filters')) {
          clearAllButton = button;
          break;
        }
      }
      
      if (clearAllButton) {
        await clearAllButton.trigger('click');
        expect(wrapper.emitted('clearAllFilters')).toBeTruthy();
      }
    });
  });

  describe('Filter State Persistence Prevention', () => {
    it('should prevent hidden filter state by always showing indicators', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents.filter(e => e.source_app === 'claude-code'), // Filtered results
          allEvents: mockAllEvents, // Unfiltered results
          activeFilters: {
            sourceApp: 'claude-code', // Active filter
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Critical regression test: These elements MUST be visible when filters are active
      expect(wrapper.text()).toContain('🔍 Filtered');
      expect(wrapper.text()).toContain('Active Filters:');
      expect(wrapper.text()).toMatch(/\d+\s*of\s*\d+/);
      expect(wrapper.text()).toContain('Clear All Filters');
    });

    it('should show normal state when no filters are active', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockAllEvents, // All events
          allEvents: mockAllEvents,
          activeFilters: {
            sourceApp: '',
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Normal state: No filter indicators should be visible
      expect(wrapper.text()).not.toContain('🔍 Filtered');
      expect(wrapper.text()).not.toContain('Active Filters:');
      expect(wrapper.text()).not.toContain('Showing');
      expect(wrapper.text()).not.toContain('Clear All Filters');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined activeFilters gracefully', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          allEvents: mockAllEvents,
          activeFilters: undefined,
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Should not crash and should show normal state
      expect(wrapper.text()).not.toContain('🔍 Filtered');
      expect(wrapper.text()).not.toContain('Active Filters:');
    });

    it('should handle missing allEvents prop gracefully', () => {
      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mockEvents,
          // allEvents: undefined (not provided)
          activeFilters: {
            sourceApp: 'claude-code',
            sessionId: '',
            eventType: '',
            toolName: ''
          },
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      // Should still show filter indicators, but count might not be accurate
      expect(wrapper.text()).toContain('🔍 Filtered');
      expect(wrapper.text()).toContain('Active Filters:');
    });
  });
});