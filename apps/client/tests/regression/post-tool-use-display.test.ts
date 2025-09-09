/**
 * End-to-End Regression Tests for Post Tool Use Display
 * 
 * These tests prevent the regression where the UI showed:
 * - "Tool used: unknown" in summaries (should show actual tool names)
 * - Tool field showing correct name but summary showing "unknown"
 * - Notification displays showing incorrect tool information
 * 
 * Bug Fixed: Database contained old events with incorrect summaries from before hook fix.
 * Screenshots showed correct Tool field but wrong Summary field.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import EventDetailModal from '../../src/components/EventDetailModal.vue';
import EventRow from '../../src/components/EventRow.vue';
import ApplicationsOverview from '../../src/components/ApplicationsOverview.vue';
import type { HookEvent } from '../../src/types';

describe('Post Tool Use Display Regression Tests', () => {
  const mockGetAppColor = vi.fn(() => '#3B82F6');
  const mockGetSessionColor = vi.fn(() => '#10B981');

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.warn to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock window.matchMedia for useMediaQuery composable
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event Detail Modal Tool Display', () => {
    it('should show correct tool name in Tool field for Write operations', () => {
      const writeEvent: HookEvent = {
        id: 1,
        source_app: 'claude-code',
        session_id: 'test-session-123',
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Write',
          tool_input: {
            file_path: '/test/regression_test.txt',
            content: 'Testing regression fix'
          }
        },
        summary: 'Write: /test/regression_test.txt',
        timestamp: Date.now()
      };

      const wrapper = mount(EventDetailModal, {
        props: {
          isOpen: true,
          event: writeEvent,
          sessionColorClass: 'bg-blue-500',
          appHexColor: '#3B82F6',
          disableTeleport: true
        }
      });

      // Critical regression test - Tool field should show "Write"
      expect(wrapper.text()).toContain('Write');
      expect(wrapper.find('[data-testid="tool-name"]').exists() ? 
        wrapper.find('[data-testid="tool-name"]').text() : 
        wrapper.text()).toContain('Write');
    });

    it('should show correct summary without "Tool used: unknown"', () => {
      const writeEvent: HookEvent = {
        id: 2,
        source_app: 'claude-code', 
        session_id: 'test-session-456',
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Write',
          tool_input: {
            file_path: '/test/summary_test.txt',
            content: 'Summary test content'
          }
        },
        summary: 'Write: /test/summary_test.txt',
        timestamp: Date.now()
      };

      const wrapper = mount(EventDetailModal, {
        props: {
          isOpen: true,
          event: writeEvent,
          sessionColorClass: 'bg-green-500',
          appHexColor: '#10B981',
          disableTeleport: true
        }
      });

      // Critical regression test - Summary should NOT contain "Tool used: unknown"
      expect(wrapper.text()).not.toContain('Tool used: unknown');
      expect(wrapper.text()).toContain('Write: /test/summary_test.txt');
    });

    it('should handle Read operations with file content containing "timeout"', () => {
      const readEvent: HookEvent = {
        id: 3,
        source_app: 'claude-code',
        session_id: 'test-session-789',
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Read',
          tool_input: {
            file_path: '/test/timeout_config.py'
          }
        },
        summary: 'Read: /test/timeout_config.py',
        timestamp: Date.now()
      };

      const wrapper = mount(EventDetailModal, {
        props: {
          isOpen: true,
          event: readEvent,
          sessionColorClass: 'bg-yellow-500',
          appHexColor: '#F59E0B',
          disableTeleport: true
        }
      });

      // Ensure Read operations display correctly even with timeout-related content
      expect(wrapper.text()).toContain('Read');
      expect(wrapper.text()).not.toContain('Tool used: unknown');
      expect(wrapper.text()).not.toContain('timeout error');
    });

    it('should extract tool info correctly from payload.tool_name', () => {
      const editEvent: HookEvent = {
        id: 4,
        source_app: 'claude-code',
        session_id: 'test-session-edit',
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Edit',
          tool_input: {
            file_path: '/test/edit_test.py',
            old_string: 'old_code',
            new_string: 'new_code'
          }
        },
        summary: 'Edit: /test/edit_test.py',
        timestamp: Date.now()
      };

      const wrapper = mount(EventDetailModal, {
        props: {
          isOpen: true,
          event: editEvent,
          sessionColorClass: 'bg-purple-500',
          appHexColor: '#8B5CF6',
          disableTeleport: true
        }
      });

      // Test tool info extraction logic
      const component = wrapper.vm as any;
      expect(component.toolInfo).toBeTruthy();
      expect(component.toolInfo.tool).toBe('Edit');
      expect(component.toolInfo.detail).toContain('/test/edit_test.py');
    });
  });

  describe('Event Row Summary Display', () => {
    it('should display correct tool operations in event rows', async () => {
      const toolEvents: HookEvent[] = [
        {
          id: 5,
          source_app: 'claude-code',
          session_id: 'row-test-1',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Write' },
          summary: 'Write: /test/file1.txt',
          timestamp: Date.now() - 1000
        },
        {
          id: 6,
          source_app: 'claude-code',
          session_id: 'row-test-2',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Read' },
          summary: 'Read: /test/file2.txt',
          timestamp: Date.now() - 2000
        },
        {
          id: 7,
          source_app: 'claude-code',
          session_id: 'row-test-3',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Edit' },
          summary: 'Edit: /test/file3.txt',
          timestamp: Date.now() - 3000
        }
      ];

      for (const event of toolEvents) {
        const wrapper = mount(EventRow, {
          props: {
            event,
            appHexColor: '#3B82F6',
            gradientClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
            colorClass: 'bg-blue-500',
            appGradientClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
            appColorClass: 'bg-blue-500'
          }
        });

        await nextTick();

        // Verify no "Tool used: unknown" appears in any event row
        expect(wrapper.text()).not.toContain('Tool used: unknown');
        expect(wrapper.text()).not.toContain('unknown');
        
        // Verify correct tool name appears
        const toolName = event.payload.tool_name;
        expect(wrapper.text()).toContain(toolName);
      }
    });

    it('should handle events without triggering false error displays', async () => {
      const eventWithTimeoutContent: HookEvent = {
        id: 8,
        source_app: 'claude-code',
        session_id: 'normal-content-test',
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Read',
          tool_input: {
            file_path: '/test/post_tool_use.py'
          }
        },
        summary: 'Read: /test/post_tool_use.py',
        timestamp: Date.now()
      };

      const wrapper = mount(EventRow, {
        props: {
          event: eventWithTimeoutContent,
          appHexColor: '#10B981',
          gradientClass: 'bg-gradient-to-r from-green-500 to-green-600',
          colorClass: 'bg-green-500',
          appGradientClass: 'bg-gradient-to-r from-green-500 to-green-600',
          appColorClass: 'bg-green-500'
        }
      });

      await nextTick();

      // Should not show any error indicators for normal operations
      expect(wrapper.find('.text-red-500').exists()).toBe(false);
      expect(wrapper.find('.bg-red-500').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('error');
      expect(wrapper.text()).not.toContain('timeout');
    });
  });

  describe('Applications Overview Tool Usage', () => {
    it('should show tool usage stats without unknown tools', async () => {
      const mixedEvents: HookEvent[] = [
        {
          id: 9,
          source_app: 'claude-code',
          session_id: 'overview-test-1',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Write' },
          summary: 'Write: /test/doc1.md',
          timestamp: Date.now() - 1000
        },
        {
          id: 10,
          source_app: 'claude-code',
          session_id: 'overview-test-1',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Write' },
          summary: 'Write: /test/doc2.md',
          timestamp: Date.now() - 2000
        },
        {
          id: 11,
          source_app: 'claude-code',
          session_id: 'overview-test-2',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Read' },
          summary: 'Read: /test/config.json',
          timestamp: Date.now() - 3000
        }
      ];

      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: mixedEvents,
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      await nextTick();

      // Should show actual tool names in usage statistics
      expect(wrapper.text()).toContain('Write');
      expect(wrapper.text()).toContain('Read');
      
      // Should not show any unknown tools
      expect(wrapper.text()).not.toContain('unknown');
      expect(wrapper.text()).not.toContain('Unknown');
      
      // Should show proper usage counts (Write appears twice)
      expect(wrapper.text()).toContain('2'); // Write count
      expect(wrapper.text()).toContain('1'); // Read count
    });

    it('should extract tool names from different payload structures', async () => {
      const diverseEvents: HookEvent[] = [
        {
          id: 12,
          source_app: 'claude-code',
          session_id: 'diverse-test-1',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Bash' },
          summary: 'Bash: ls -la',
          timestamp: Date.now() - 1000
        },
        {
          id: 13,
          source_app: 'claude-code',
          session_id: 'diverse-test-2',
          hook_event_type: 'PreToolUse',
          payload: { name: 'Grep' }, // Some events use 'name' instead of 'tool_name'
          summary: 'Grep: searching pattern',
          timestamp: Date.now() - 2000
        },
        {
          id: 14,
          source_app: 'claude-code',
          session_id: 'diverse-test-3',
          hook_event_type: 'Stop',
          payload: {},
          summary: 'Session completed',
          timestamp: Date.now() - 3000
        }
      ];

      const wrapper = mount(ApplicationsOverview, {
        props: {
          events: diverseEvents,
          getAppColor: mockGetAppColor,
          getSessionColor: mockGetSessionColor
        }
      });

      await nextTick();

      // Should handle different payload structures gracefully
      expect(wrapper.text()).toContain('Bash');
      expect(wrapper.text()).toContain('Grep');
      expect(wrapper.text()).toContain('Session End'); // Mapped from Stop event type
      
      // No unknown tools should appear
      expect(wrapper.text()).not.toContain('unknown');
    });
  });

  describe('Notification Display Prevention', () => {
    it('should not show error notifications for normal tool operations', async () => {
      const normalOperations: HookEvent[] = [
        {
          id: 15,
          source_app: 'claude-code',
          session_id: 'normal-ops-1',
          hook_event_type: 'PostToolUse',
          payload: {
            tool_name: 'Write',
            tool_input: {
              file_path: '/test/timeout_handler.py',
              content: 'def handle_timeout():\n    # Handle timeout scenarios\n    pass'
            }
          },
          summary: 'Write: /test/timeout_handler.py',
          timestamp: Date.now()
        }
      ];

      // Test that no error notifications are triggered by content containing "timeout"
      for (const event of normalOperations) {
        const wrapper = mount(EventDetailModal, {
          props: {
            isOpen: true,
            event,
            sessionColorClass: 'bg-blue-500',
            appHexColor: '#3B82F6',
            disableTeleport: true
          }
        });

        await nextTick();

        // Should not show any error-related UI elements
        expect(wrapper.find('.text-red-500').exists()).toBe(false);
        expect(wrapper.find('.bg-red-500').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('Error:');
        expect(wrapper.text()).not.toContain('Timeout:');
        expect(wrapper.text()).not.toContain('Failed:');
      }
    });
  });

  describe('Regression Prevention Scenarios', () => {
    it('should handle the exact scenario from the bug report screenshots', async () => {
      // Recreate the exact scenario that was shown in the screenshots
      const screenshotScenario: HookEvent = {
        id: 5501,
        source_app: 'claude-code',
        session_id: '2250e000-7df8-4747-8662-85a871686956_9150_1737545923',
        hook_event_type: 'PostToolUse',
        payload: {
          tool_name: 'Write',
          tool_input: {
            file_path: '/home/bryan/multi-agent-observability-system/apps/client/docs/TESTING_QUICK_REFERENCE.md'
          }
        },
        summary: 'Write: /home/bryan/multi-agent-observability-system/apps/client/docs/TESTING_QUICK_REFERENCE.md',
        timestamp: 1737545924000
      };

      const wrapper = mount(EventDetailModal, {
        props: {
          isOpen: true,
          event: screenshotScenario,
          sessionColorClass: 'bg-green-500',
          appHexColor: '#10B981',
          disableTeleport: true
        }
      });

      await nextTick();

      // Exact regression checks based on the screenshots
      expect(wrapper.text()).toContain('Write'); // Tool field should show "Write"
      expect(wrapper.text()).not.toContain('Tool used: unknown'); // Summary should NOT show this
      expect(wrapper.text()).toContain('Write:'); // Summary should show "Write: filename"
      
      // Verify session info displays correctly
      expect(wrapper.text()).toContain('2250e0:9150'); // Formatted session ID
    });

    it('should prevent database cleanup regression', async () => {
      // Test that ensures cleaned database doesn't create new unknown events
      const postCleanupEvents: HookEvent[] = [
        {
          id: 6000,
          source_app: 'claude-code',
          session_id: 'post-cleanup-test',
          hook_event_type: 'PostToolUse',
          payload: { tool_name: 'Read' },
          summary: 'Read: /test/file.txt',
          timestamp: Date.now()
        }
      ];

      for (const event of postCleanupEvents) {
        const wrapper = mount(EventRow, {
          props: {
            event,
            appHexColor: '#3B82F6',
            gradientClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
            colorClass: 'bg-blue-500',
            appGradientClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
            appColorClass: 'bg-blue-500'
          }
        });

        await nextTick();

        // Ensure new events never show unknown
        expect(wrapper.text()).not.toContain('unknown');
        expect(wrapper.text()).toContain('Read');
      }
    });
  });
});