<template>
  <div class="bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] p-4 rounded-lg shadow-lg">
    <h3 class="text-lg font-bold text-[var(--theme-primary)] mb-3 flex items-center">
      <span class="mr-2">🎨</span>
      Event Type Legend
    </h3>
    
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div 
        v-for="(eventType, index) in eventTypes" 
        :key="index"
        class="flex items-center space-x-2"
      >
        <span 
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white"
          :class="getEventBadgeClasses(eventType.type).gradient"
        >
          <span class="mr-1">{{ eventType.emoji }}</span>
          {{ eventType.label }}
        </span>
        <span class="text-xs text-[var(--theme-text-tertiary)]">
          {{ eventType.description }}
        </span>
      </div>
    </div>
    
    <div class="mt-4 text-sm text-[var(--theme-text-secondary)]">
      <p class="flex items-center">
        <span class="mr-2">💡</span>
        <span>Events are color-coded by type for easier identification. Hover over events for more details.</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventTypeColors } from '../composables/useEventTypeColors';

const { getEventBadgeClasses } = useEventTypeColors();

const eventTypes = [
  // Tool Events
  { type: 'PreToolUse', emoji: '🔧', label: 'Pre Tool', description: 'Before tool execution' },
  { type: 'PostToolUse', emoji: '✅', label: 'Post Tool', description: 'After tool execution' },
  
  // User Events
  { type: 'UserPromptSubmit', emoji: '💬', label: 'User Prompt', description: 'User input' },
  
  // System Events
  { type: 'Notification', emoji: '🔔', label: 'Notification', description: 'System alerts' },
  
  // Stop Events
  { type: 'Stop', emoji: '🛑', label: 'Stop', description: 'Session end' },
  { type: 'SubagentStop', emoji: '👥', label: 'Subagent Stop', description: 'Sub-task end' },
  
  // Optimization
  { type: 'PreCompact', emoji: '📦', label: 'Compact', description: 'Memory optimization' },
  
  // Generic
  { type: 'custom_event', emoji: '📌', label: 'Custom', description: 'Other events' }
];
</script>