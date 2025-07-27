const eventTypeToEmoji: Record<string, string> = {
  // Claude Code hook events
  'PreToolUse': '🔧',
  'PostToolUse': '✅',
  'Notification': '🔔',
  'Stop': '🛑',
  'SubagentStop': '👥',
  'PreCompact': '📦',
  'UserPromptSubmit': '💬',
  
  // Custom event types
  'custom_event': '📌',
  'post_tool_use': '✅',
  'pre_tool_use': '🔧',
  'user_prompt_submit': '💬',
  'notification': '🔔',
  'stop': '🛑',
  'subagent_stop': '👥',
  'pre_compact': '📦',
  
  // Tool-specific events
  'Write': '✏️',
  'Read': '📖',
  'Edit': '📝',
  'MultiEdit': '📝',
  'Bash': '🖥️',
  'Grep': '🔍',
  'Glob': '🗂️',
  'WebFetch': '🌐',
  'WebSearch': '🔎',
  'Task': '🚀',
  'TodoWrite': '📋',
  
  // Default
  'default': '❓'
};

export function useEventEmojis() {
  const getEmojiForEventType = (eventType: string): string => {
    return eventTypeToEmoji[eventType] || eventTypeToEmoji.default;
  };
  
  const formatEventTypeLabel = (eventTypes: Record<string, number>): string => {
    const entries = Object.entries(eventTypes)
      .sort((a, b) => b[1] - a[1]); // Sort by count descending
    
    if (entries.length === 0) return '';
    
    // Show up to 3 most frequent event types
    const topEntries = entries.slice(0, 3);
    
    return topEntries
      .map(([type, count]) => {
        const emoji = getEmojiForEventType(type);
        return count > 1 ? `${emoji}×${count}` : emoji;
      })
      .join('');
  };
  
  return {
    getEmojiForEventType,
    formatEventTypeLabel
  };
}