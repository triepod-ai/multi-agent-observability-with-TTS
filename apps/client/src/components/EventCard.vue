<template>
  <div 
    class="relative bg-gray-800 border border-gray-600 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group w-full min-w-0 flex flex-col cursor-pointer hover:border-gray-500"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="openModal"
  >
    <!-- Status Indicator Bar -->
    <div 
      class="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
      :class="statusBarClass"
    ></div>

    <!-- Session Color Indicator -->
    <div 
      class="absolute top-1 left-0 w-1 h-full transition-all duration-300"
      :class="[sessionColorClass, isHovered ? 'w-1.5' : 'w-1']"
    ></div>
    
    <!-- App Color Badge -->
    <div 
      class="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110"
      :style="{ backgroundColor: appHexColor + '20', borderColor: appHexColor }"
      :class="{ 'ring-2': isHovered }"
      :title="event.source_app"
    >
      <span class="text-xl font-bold" :style="{ color: appHexColor }">
        {{ appInitial }}
      </span>
    </div>

    <!-- Main Content Area -->
    <div class="flex-grow p-6 pr-20 flex flex-col">
      <!-- Event Type Badge with Status -->
      <div class="flex items-center justify-between mb-4">
        <div 
          class="inline-flex items-center px-5 py-2.5 rounded-full text-base font-semibold shadow-lg transition-all duration-300 border border-gray-700"
          :class="[eventBadgeClasses, isHovered ? 'scale-105 shadow-xl' : '']"
        >
          <span class="mr-2 text-xl">{{ hookEmoji }}</span>
          <span class="text-white">{{ event.hook_event_type }}</span>
        </div>
        <!-- Status Icon -->
        <div v-if="statusInfo" class="flex items-center space-x-2">
          <span 
            class="text-lg"
            :title="statusInfo.tooltip"
          >
            {{ statusInfo.icon }}
          </span>
          <span v-if="event.duration" class="text-xs text-gray-400">
            {{ formatDuration(event.duration) }}
          </span>
        </div>
      </div>

      <!-- Metadata Pills -->
      <div v-if="metadataPills.length > 0" class="flex flex-wrap gap-2 mb-3">
        <div 
          v-for="pill in metadataPills" 
          :key="pill.key"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700/50 text-gray-300 border border-gray-600"
          :title="pill.tooltip"
        >
          <span class="mr-1">{{ pill.icon }}</span>
          <span>{{ pill.value }}</span>
        </div>
      </div>

      <!-- Tool/Command Section -->
      <div class="mb-4 flex-grow">
        <div v-if="toolInfo" class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-sm font-semibold text-[var(--theme-text-secondary)]">Tool:</span>
              <span class="text-base font-bold text-[var(--theme-text-primary)]">{{ toolInfo.tool }}</span>
            </div>
          </div>
          
          <!-- Primary Detail -->
          <div v-if="toolInfo.detail" class="relative">
            <div 
              class="bg-[var(--theme-bg-tertiary)] rounded-lg px-3 py-2 font-mono text-sm text-[var(--theme-text-secondary)] transition-all duration-300 line-clamp-2"
              :title="toolInfo.fullDetail || toolInfo.detail"
              style="word-break: break-word; overflow-wrap: break-word;"
            >
              <span :class="{ 'italic': event.hook_event_type === 'UserPromptSubmit' }">
                {{ toolInfo.detail }}
              </span>
            </div>
            <div 
              v-if="toolInfo.detail.length > 80" 
              class="absolute bottom-0 right-0 bg-gradient-to-l from-[var(--theme-bg-tertiary)] to-transparent px-2 py-1 text-[var(--theme-text-tertiary)] text-xs pointer-events-none"
            >
              ...
            </div>
          </div>

          <!-- Additional Parameters -->
          <div v-if="toolParameters.length > 0" class="space-y-1">
            <div 
              v-for="param in toolParameters" 
              :key="param.key"
              class="flex items-center text-xs text-gray-400"
            >
              <span class="font-medium text-gray-500 mr-1">{{ param.key }}:</span>
              <span class="truncate" :title="param.fullValue">{{ param.value }}</span>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="event.error" class="mt-2 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
          <div class="flex items-start space-x-2">
            <span class="text-sm flex-shrink-0">❌</span>
            <span class="text-sm text-red-300 font-medium break-words">
              {{ typeof event.error === 'string' ? event.error : 'Operation failed' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Summary Section -->
      <div v-if="event.summary" class="mb-4">
        <div class="bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 rounded-lg px-3 py-2">
          <div class="flex items-start space-x-2">
            <span class="text-sm flex-shrink-0">📝</span>
            <span 
              class="text-sm text-[var(--theme-text-primary)] font-medium break-words line-clamp-2"
              :title="event.summary.length > 100 ? event.summary : ''"
              style="word-break: break-word; overflow-wrap: break-word;"
            >
              {{ event.summary }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer - Anchored at Bottom -->
    <div class="px-6 pb-6 pt-2 border-t border-[var(--theme-border-primary)]/20 mt-auto">
      <div class="flex items-center justify-between">
        <!-- Session Info -->
        <div class="flex items-center space-x-2">
          <div 
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--theme-bg-tertiary)]/50 border relative group/session"
            :class="sessionBorderClass"
            :title="sessionTooltip"
          >
            <div 
              class="w-2 h-2 rounded-full mr-1.5"
              :class="sessionColorClass"
            ></div>
            {{ sessionIdShort }}
            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/session:opacity-100 transition-opacity pointer-events-none z-10 max-w-xs break-words">
              {{ sessionTooltip }}
            </span>
          </div>
          <span class="text-xs text-[var(--theme-text-tertiary)]">{{ formatTime(event.timestamp) }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-1">
          <button
            @click.stop="copyPayload"
            class="p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all duration-200"
            :title="copyButtonText"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            @click.stop="openModal"
            class="p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all duration-200"
            title="View details"
          >
            <svg 
              class="w-4 h-4 transition-transform duration-300"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookEvent } from '../types';
import { useEventTypeColors } from '../composables/useEventTypeColors';

const props = defineProps<{
  event: HookEvent;
  sessionColorClass: string;
  sessionBorderClass: string;
  appColorClass: string;
  appHexColor: string;
}>();

const emit = defineEmits<{
  openModal: [];
  copy: [];
}>();

const isHovered = ref(false);
const copyButtonText = ref('Copy payload');

const { getEventBadgeClasses } = useEventTypeColors();

const appInitial = computed(() => {
  return props.event.source_app.charAt(0).toUpperCase();
});

const sessionIdShort = computed(() => {
  const parts = props.event.session_id.split('_');
  if (parts.length >= 3) {
    const originalId = parts[0].slice(0, 6);
    const processId = parts[1];
    return `${originalId}:${processId}`;
  }
  return props.event.session_id.slice(0, 8);
});

const sessionTooltip = computed(() => {
  const parts = props.event.session_id.split('_');
  if (parts.length >= 3) {
    const timestamp = parseInt(parts[2]);
    const date = new Date(timestamp * 1000);
    const metadata = props.event.payload?.metadata;
    
    let tooltip = `Session: ${parts[0]}\nProcess: ${parts[1]}\nStarted: ${date.toLocaleTimeString()}`;
    
    if (metadata) {
      if (metadata.hostname) tooltip += `\nHost: ${metadata.hostname}`;
      if (metadata.user) tooltip += `\nUser: ${metadata.user}`;
    }
    
    return tooltip;
  }
  return `Session: ${props.event.session_id}`;
});

const hookEmoji = computed(() => {
  const emojiMap: Record<string, string> = {
    'PreToolUse': '🔧',
    'PostToolUse': '✅',
    'Notification': '🔔',
    'Stop': '🛑',
    'SubagentStop': '👥',
    'PreCompact': '📦',
    'UserPromptSubmit': '💬'
  };
  return emojiMap[props.event.hook_event_type] || '❓';
});

const eventBadgeClasses = computed(() => {
  return getEventBadgeClasses(props.event.hook_event_type).gradient + ' text-white';
});

const statusInfo = computed(() => {
  const payload = props.event.payload;
  
  // Check for explicit status indicators
  if (props.event.error) {
    return { icon: '❌', tooltip: 'Failed', class: 'text-red-500' };
  }
  
  // PostToolUse events usually indicate success
  if (props.event.hook_event_type === 'PostToolUse') {
    if (payload.tool_output?.error) {
      return { icon: '⚠️', tooltip: 'Completed with warnings', class: 'text-yellow-500' };
    }
    return { icon: '✅', tooltip: 'Success', class: 'text-green-500' };
  }
  
  // PreToolUse events are in progress
  if (props.event.hook_event_type === 'PreToolUse') {
    return { icon: '⏳', tooltip: 'In progress', class: 'text-blue-500' };
  }
  
  // Stop events
  if (props.event.hook_event_type === 'Stop' || props.event.hook_event_type === 'SubagentStop') {
    return { icon: '🏁', tooltip: 'Completed', class: 'text-gray-400' };
  }
  
  return null;
});

const statusBarClass = computed(() => {
  if (props.event.error) return 'bg-red-500';
  if (props.event.hook_event_type === 'PostToolUse') {
    if (props.event.payload.tool_output?.error) return 'bg-yellow-500';
    return 'bg-green-500';
  }
  if (props.event.hook_event_type === 'PreToolUse') return 'bg-blue-500';
  if (props.event.hook_event_type.includes('Stop')) return 'bg-gray-500';
  return 'bg-gray-600';
});

const metadataPills = computed(() => {
  const pills: Array<{ key: string; icon: string; value: string; tooltip: string }> = [];
  const payload = props.event.payload;
  const metadata = payload.metadata || {};
  
  // User/Agent info
  if (metadata.user) {
    pills.push({
      key: 'user',
      icon: '👤',
      value: metadata.user,
      tooltip: `User: ${metadata.user}`
    });
  }
  
  // Environment
  if (metadata.environment || metadata.hostname) {
    const env = metadata.environment || metadata.hostname;
    pills.push({
      key: 'env',
      icon: '🌐',
      value: env.length > 15 ? env.substring(0, 12) + '...' : env,
      tooltip: `Environment: ${env}`
    });
  }
  
  // Token count for AI operations
  if (payload.token_count || payload.tokens) {
    const tokens = payload.token_count || payload.tokens;
    pills.push({
      key: 'tokens',
      icon: '🎯',
      value: `${tokens} tokens`,
      tooltip: `Token usage: ${tokens}`
    });
  }
  
  // Memory usage
  if (payload.memory_usage) {
    pills.push({
      key: 'memory',
      icon: '💾',
      value: formatBytes(payload.memory_usage),
      tooltip: `Memory: ${formatBytes(payload.memory_usage)}`
    });
  }
  
  // Agent type
  if (payload.agent_type || metadata.agent_type) {
    const agent = payload.agent_type || metadata.agent_type;
    pills.push({
      key: 'agent',
      icon: '🤖',
      value: agent,
      tooltip: `Agent: ${agent}`
    });
  }
  
  return pills;
});

const toolParameters = computed(() => {
  const params: Array<{ key: string; value: string; fullValue: string }> = [];
  const payload = props.event.payload;
  
  if (!payload.tool_input || !toolInfo.value) return params;
  
  const input = payload.tool_input;
  
  // Add relevant parameters based on tool type
  if (input.limit !== undefined) {
    params.push({
      key: 'limit',
      value: String(input.limit),
      fullValue: `Limit: ${input.limit}`
    });
  }
  
  if (input.offset !== undefined) {
    params.push({
      key: 'offset',
      value: String(input.offset),
      fullValue: `Offset: ${input.offset}`
    });
  }
  
  if (input.type) {
    params.push({
      key: 'type',
      value: input.type,
      fullValue: `Type: ${input.type}`
    });
  }
  
  if (input.format) {
    params.push({
      key: 'format',
      value: input.format,
      fullValue: `Format: ${input.format}`
    });
  }
  
  if (input.recursive !== undefined) {
    params.push({
      key: 'recursive',
      value: input.recursive ? 'yes' : 'no',
      fullValue: `Recursive: ${input.recursive}`
    });
  }
  
  // Add any other non-primary parameters
  const primaryKeys = ['command', 'file_path', 'pattern', 'path', 'query'];
  const skipKeys = [...primaryKeys, 'limit', 'offset', 'type', 'format', 'recursive'];
  
  Object.entries(input).forEach(([key, value]) => {
    if (!skipKeys.includes(key) && value !== null && value !== undefined) {
      const strValue = String(value);
      params.push({
        key,
        value: strValue.length > 30 ? strValue.substring(0, 27) + '...' : strValue,
        fullValue: `${key}: ${strValue}`
      });
    }
  });
  
  return params.slice(0, 3); // Limit to 3 parameters to avoid clutter
});

const toolInfo = computed(() => {
  const payload = props.event.payload;
  
  if (props.event.hook_event_type === 'UserPromptSubmit' && payload.prompt) {
    return {
      tool: 'Prompt',
      detail: payload.prompt,
      fullDetail: payload.prompt
    };
  }
  
  if (payload.tool_name) {
    const info: { tool: string; detail?: string; fullDetail?: string } = { tool: payload.tool_name };
    
    if (payload.tool_input) {
      if (payload.tool_input.command) {
        info.detail = payload.tool_input.command;
        info.fullDetail = payload.tool_input.command;
      } else if (payload.tool_input.file_path) {
        const filePath = payload.tool_input.file_path;
        // Smart truncation for file paths - show start and end
        if (filePath.length > 60) {
          const parts = filePath.split('/');
          if (parts.length > 3) {
            info.detail = `${parts[0]}/.../${parts.slice(-2).join('/')}`;
          } else {
            info.detail = `${filePath.slice(0, 30)}...${filePath.slice(-20)}`;
          }
        } else {
          info.detail = filePath;
        }
        info.fullDetail = filePath;
      } else if (payload.tool_input.pattern) {
        info.detail = payload.tool_input.pattern;
        info.fullDetail = payload.tool_input.pattern;
      }
    }
    
    return info;
  }
  
  return null;
});

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const formatDuration = (duration: number) => {
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
};

const openModal = () => {
  emit('openModal');
};

const copyPayload = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.event.payload, null, 2));
    copyButtonText.value = 'Copied!';
    emit('copy');
    setTimeout(() => {
      copyButtonText.value = 'Copy payload';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    copyButtonText.value = 'Failed';
    setTimeout(() => {
      copyButtonText.value = 'Copy payload';
    }, 2000);
  }
};
</script>

<style scoped>
/* Add smooth transitions for hover effects */
.group:hover .transition-all {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Line clamp utilities for text truncation */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Better text breaking for long content */
.break-words {
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* Ensure mono space content wraps properly */
.font-mono.break-words {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Ensure consistent card heights in grid layout */
.group {
  min-height: 320px;
}
</style>