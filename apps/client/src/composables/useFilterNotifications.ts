import { ref, computed, type Ref } from 'vue';
import type { HookEvent, FilterState, FilterNotification, ActiveFilter } from '../types';

export function useFilterNotifications(events: Ref<HookEvent[]>, filters: Ref<FilterState>) {
  const showNotifications = ref(true);
  
  // Helper function to get tool icon
  const getToolIcon = (toolName: string): string => {
    const toolIcons: Record<string, string> = {
      'Read': '📖',
      'Write': '✏️',
      'Edit': '📝',
      'MultiEdit': '📄',
      'Bash': '💻',
      'Grep': '🔍',
      'Glob': '🌐',
      'Task': '🎯',
      'WebFetch': '🌐',
      'TodoWrite': '📋',
      'LS': '📁',
      'User Input': '💬',
      'System Notification': '🔔',
      'Session End': '🛑',
      'Sub-agent Complete': '✅',
      'NotebookRead': '📓',
      'NotebookEdit': '📝',
      'WebSearch': '🔍'
    };
    return toolIcons[toolName] || '🔧';
  };

  // Helper function to format session ID
  const formatSessionId = (sessionId: string): string => {
    const parts = sessionId.split('_');
    if (parts.length >= 3) {
      return `${parts[0].slice(0, 4)}:${parts[1]}`;
    }
    return sessionId.slice(0, 8) + '...';
  };

  // Helper function to extract tool name from event
  const getToolNameFromEvent = (event: HookEvent): string => {
    if (event.payload?.tool_name) {
      return event.payload.tool_name;
    } else if (event.hook_event_type === 'PostToolUse' && event.payload?.name) {
      return event.payload.name;
    } else if (event.hook_event_type === 'PreToolUse' && event.payload?.name) {
      return event.payload.name;
    } else {
      // Map hook event types to tool names
      const hookTypeToTool: Record<string, string> = {
        'UserPromptSubmit': 'User Input',
        'Notification': 'System Notification',
        'Stop': 'Session End',
        'SubagentStop': 'Sub-agent Complete'
      };
      return hookTypeToTool[event.hook_event_type] || event.hook_event_type;
    }
  };

  // Check if any filters are active
  const hasActiveFilters = computed(() => {
    return !!(
      (filters.value.sourceApps && filters.value.sourceApps.length > 0) || 
      (filters.value.sessionIds && filters.value.sessionIds.length > 0) || 
      (filters.value.eventTypes && filters.value.eventTypes.length > 0) || 
      (filters.value.toolNames && filters.value.toolNames.length > 0) ||
      filters.value.search
    );
  });

  // Get filtered events based on current filters
  const filteredEvents = computed(() => {
    let filtered = [...events.value];
    
    
    if (filters.value.sourceApps && filters.value.sourceApps.length > 0) {
      filtered = filtered.filter(e => filters.value.sourceApps.includes(e.source_app));
    }
    if (filters.value.sessionIds && filters.value.sessionIds.length > 0) {
      filtered = filtered.filter(e => filters.value.sessionIds.includes(e.session_id));
    }
    if (filters.value.eventTypes && filters.value.eventTypes.length > 0) {
      filtered = filtered.filter(e => filters.value.eventTypes.includes(e.hook_event_type));
    }
    if (filters.value.toolNames && filters.value.toolNames.length > 0) {
      filtered = filtered.filter(e => {
        const toolName = getToolNameFromEvent(e);
        return filters.value.toolNames.includes(toolName);
      });
    }
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.source_app.toLowerCase().includes(searchLower) ||
        e.hook_event_type.toLowerCase().includes(searchLower) ||
        e.session_id.toLowerCase().includes(searchLower) ||
        getToolNameFromEvent(e).toLowerCase().includes(searchLower) ||
        JSON.stringify(e.payload).toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  });

  // Get unique applications from filtered events
  const filteredApplications = computed(() => {
    const apps = new Set(filteredEvents.value.map(e => e.source_app));
    return Array.from(apps);
  });

  // Get unique sessions from filtered events
  const filteredSessions = computed(() => {
    const sessions = new Set(filteredEvents.value.map(e => e.session_id));
    return Array.from(sessions);
  });

  // Get total unique applications
  const totalApplications = computed(() => {
    const apps = new Set(events.value.map(e => e.source_app));
    return Array.from(apps);
  });

  // Get total unique sessions
  const totalSessions = computed(() => {
    const sessions = new Set(events.value.map(e => e.session_id));
    return Array.from(sessions);
  });

  // Generate active filter chips
  const activeFilters = computed((): ActiveFilter[] => {
    const chips: ActiveFilter[] = [];
    
    if (filters.value.search) {
      chips.push({
        id: 'search',
        type: 'search',
        icon: '🔍',
        label: `"${filters.value.search}"`,
        values: [filters.value.search],
        count: filteredEvents.value.length
      });
    }
    
    if (filters.value.sourceApps.length > 0) {
      const count = filteredEvents.value.filter(e => filters.value.sourceApps.includes(e.source_app)).length;
      const label = filters.value.sourceApps.length === 1 
        ? filters.value.sourceApps[0] 
        : `${filters.value.sourceApps.length} applications`;
      chips.push({
        id: 'apps',
        type: 'sourceApps',
        icon: '📱',
        label,
        values: filters.value.sourceApps,
        count
      });
    }
    
    if (filters.value.eventTypes.length > 0) {
      const count = filteredEvents.value.filter(e => filters.value.eventTypes.includes(e.hook_event_type)).length;
      const eventTypeEmojis: Record<string, string> = {
        'PreToolUse': '🔧',
        'PostToolUse': '✅',
        'Notification': '🔔',
        'Stop': '🛑',
        'SubagentStop': '👥',
        'PreCompact': '📦',
        'UserPromptSubmit': '💬'
      };
      const label = filters.value.eventTypes.length === 1
        ? filters.value.eventTypes[0]
        : `${filters.value.eventTypes.length} event types`;
      const icon = filters.value.eventTypes.length === 1
        ? eventTypeEmojis[filters.value.eventTypes[0]] || '❓'
        : '🎯';
      chips.push({
        id: 'types',
        type: 'eventTypes',
        icon,
        label,
        values: filters.value.eventTypes,
        count
      });
    }
    
    if (filters.value.toolNames.length > 0) {
      const count = filteredEvents.value.filter(e => {
        const toolName = getToolNameFromEvent(e);
        return filters.value.toolNames.includes(toolName);
      }).length;
      const label = filters.value.toolNames.length === 1
        ? filters.value.toolNames[0]
        : `${filters.value.toolNames.length} tools`;
      const icon = filters.value.toolNames.length === 1
        ? getToolIcon(filters.value.toolNames[0])
        : '🔧';
      chips.push({
        id: 'tools',
        type: 'toolNames',
        icon,
        label,
        values: filters.value.toolNames,
        count
      });
    }
    
    if (filters.value.sessionIds.length > 0) {
      const count = filteredEvents.value.filter(e => filters.value.sessionIds.includes(e.session_id)).length;
      const label = filters.value.sessionIds.length === 1
        ? formatSessionId(filters.value.sessionIds[0])
        : `${filters.value.sessionIds.length} sessions`;
      chips.push({
        id: 'sessions',
        type: 'sessionIds',
        icon: '🔗',
        label,
        values: filters.value.sessionIds,
        count
      });
    }
    
    return chips;
  });

  // Main filter notification data
  const filterNotification = computed((): FilterNotification => ({
    isVisible: hasActiveFilters.value && showNotifications.value,
    totalEvents: events.value.length,
    filteredEvents: filteredEvents.value.length,
    totalApplications: totalApplications.value.length,
    filteredApplications: filteredApplications.value.length,
    totalSessions: totalSessions.value.length,
    filteredSessions: filteredSessions.value.length,
    activeFilters: activeFilters.value
  }));

  // Filter removal functions
  const removeFilter = (filterId: string) => {
    const filter = activeFilters.value.find(f => f.id === filterId);
    if (!filter) return;

    switch (filter.type) {
      case 'search':
        filters.value.search = '';
        break;
      case 'sourceApps':
        filters.value.sourceApps = [];
        break;
      case 'eventTypes':
        filters.value.eventTypes = [];
        break;
      case 'toolNames':
        filters.value.toolNames = [];
        break;
      case 'sessionIds':
        filters.value.sessionIds = [];
        break;
    }
  };

  const clearAllFilters = () => {
    filters.value.sourceApps = [];
    filters.value.sessionIds = [];
    filters.value.eventTypes = [];
    filters.value.toolNames = [];
    filters.value.search = '';
  };

  const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value;
  };

  // Filter impact calculation
  const filterImpactPercentage = computed(() => {
    if (events.value.length === 0) return 0;
    return Math.round((filteredEvents.value.length / events.value.length) * 100);
  });

  const filterSummaryText = computed(() => {
    if (!hasActiveFilters.value) return '';
    
    const parts = [];
    if (filteredEvents.value.length !== events.value.length) {
      parts.push(`${filteredEvents.value.length} of ${events.value.length} events`);
    }
    if (filteredApplications.value.length !== totalApplications.value.length) {
      parts.push(`${filteredApplications.value.length} of ${totalApplications.value.length} applications`);
    }
    if (filteredSessions.value.length !== totalSessions.value.length) {
      parts.push(`${filteredSessions.value.length} of ${totalSessions.value.length} sessions`);
    }
    
    return parts.join(' • ');
  });

  return {
    hasActiveFilters,
    filteredEvents,
    filteredApplications,
    filteredSessions,
    totalApplications,
    totalSessions,
    activeFilters,
    filterNotification,
    removeFilter,
    clearAllFilters,
    toggleNotifications,
    showNotifications,
    filterImpactPercentage,
    filterSummaryText
  };
}