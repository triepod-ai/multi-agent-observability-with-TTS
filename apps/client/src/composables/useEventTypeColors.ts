import { computed } from 'vue';

// Define color schemes for different event types
const eventTypeColors: Record<string, {
  bgColor: string;
  borderColor: string;
  textColor: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  // Tool Use Events - Green tones
  'PreToolUse': {
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-800 dark:text-emerald-200',
    gradientFrom: 'from-emerald-400',
    gradientTo: 'to-emerald-600'
  },
  'PostToolUse': {
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-500',
    textColor: 'text-green-800 dark:text-green-200',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-green-600'
  },
  
  // User Interaction Events - Blue tones
  'UserPromptSubmit': {
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-800 dark:text-blue-200',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-blue-600'
  },
  
  // System Events - Purple tones
  'Notification': {
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-800 dark:text-purple-200',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-purple-600'
  },
  
  // Stop Events - Red/Orange tones
  'Stop': {
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-500',
    textColor: 'text-red-800 dark:text-red-200',
    gradientFrom: 'from-red-400',
    gradientTo: 'to-red-600'
  },
  'SubagentStop': {
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-800 dark:text-orange-200',
    gradientFrom: 'from-orange-400',
    gradientTo: 'to-orange-600'
  },
  
  // Optimization Events - Yellow tones
  'PreCompact': {
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    gradientFrom: 'from-yellow-400',
    gradientTo: 'to-yellow-600'
  },
  
  // Generic/Custom Events - Gray tones
  'custom_event': {
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-800 dark:text-gray-200',
    gradientFrom: 'from-gray-400',
    gradientTo: 'to-gray-600'
  },
  
  // Tool-specific colors
  'Write': {
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-800 dark:text-indigo-200',
    gradientFrom: 'from-indigo-400',
    gradientTo: 'to-indigo-600'
  },
  'Read': {
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    borderColor: 'border-cyan-500',
    textColor: 'text-cyan-800 dark:text-cyan-200',
    gradientFrom: 'from-cyan-400',
    gradientTo: 'to-cyan-600'
  },
  'Bash': {
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    borderColor: 'border-slate-500',
    textColor: 'text-slate-800 dark:text-slate-200',
    gradientFrom: 'from-slate-400',
    gradientTo: 'to-slate-600'
  },
  
  // Default fallback
  'default': {
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-800 dark:text-gray-200',
    gradientFrom: 'from-gray-400',
    gradientTo: 'to-gray-600'
  }
};

// Map lowercase variations
const lowercaseMapping: Record<string, string> = {
  'pre_tool_use': 'PreToolUse',
  'post_tool_use': 'PostToolUse',
  'user_prompt_submit': 'UserPromptSubmit',
  'notification': 'Notification',
  'stop': 'Stop',
  'subagent_stop': 'SubagentStop',
  'pre_compact': 'PreCompact'
};

export function useEventTypeColors() {
  const getEventTypeColor = (eventType: string) => {
    // Check for lowercase mapping first
    const mappedType = lowercaseMapping[eventType.toLowerCase()];
    if (mappedType && eventTypeColors[mappedType]) {
      return eventTypeColors[mappedType];
    }
    
    // Check direct match
    if (eventTypeColors[eventType]) {
      return eventTypeColors[eventType];
    }
    
    // Return default
    return eventTypeColors.default;
  };
  
  const getEventBadgeClasses = (eventType: string) => {
    const colors = getEventTypeColor(eventType);
    return {
      container: `${colors.bgColor} ${colors.borderColor} border`,
      text: colors.textColor,
      gradient: `bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientTo}`
    };
  };
  
  const getEventCategory = (eventType: string) => {
    // Categorize events for better organization
    if (eventType.includes('Tool') || ['Write', 'Read', 'Edit', 'Bash', 'Grep', 'Glob'].includes(eventType)) {
      return 'tool';
    }
    if (eventType.includes('User') || eventType.includes('Prompt')) {
      return 'user';
    }
    if (eventType.includes('Stop')) {
      return 'stop';
    }
    if (eventType.includes('Notification')) {
      return 'system';
    }
    if (eventType.includes('Compact')) {
      return 'optimization';
    }
    return 'other';
  };
  
  return {
    getEventTypeColor,
    getEventBadgeClasses,
    getEventCategory
  };
}