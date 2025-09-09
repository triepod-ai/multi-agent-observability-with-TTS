<template>
  <Teleport to="body" :disabled="disableTeleport">
    <Transition name="modal">
      <div 
        v-if="isOpen && event" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close"
      >
        <div 
          class="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]/50">
            <div class="flex items-center space-x-4">
              <!-- Event Type Badge -->
              <div 
                class="inline-flex items-center px-4 py-2 rounded-full text-lg font-bold shadow-md"
                :class="eventBadgeClasses"
              >
                <span class="mr-2 text-2xl">{{ hookEmoji }}</span>
                {{ event.hook_event_type }}
              </div>
              
              <!-- App Badge -->
              <div 
                class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border"
                :style="{ backgroundColor: appHexColor + '20', color: appHexColor, borderColor: appHexColor }"
              >
                {{ event.source_app }}
              </div>
              
              <!-- Session Badge -->
              <div class="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)]">
                <div 
                  class="w-2 h-2 rounded-full mr-2"
                  :class="sessionColorClass"
                ></div>
                {{ sessionIdShort }}
              </div>
            </div>
            
            <!-- Close Button -->
            <button
              @click="close"
              class="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content Tabs -->
          <div class="flex-1 overflow-hidden flex flex-col">
            <!-- Tab Navigation -->
            <div class="flex items-center px-6 py-3 bg-[var(--theme-bg-tertiary)]/30 border-b border-[var(--theme-border-primary)]">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                class="px-4 py-2 mr-2 rounded-lg font-medium transition-all duration-200"
                :class="activeTab === tab.id 
                  ? 'bg-[var(--theme-primary)] text-white shadow-md' 
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'"
              >
                <span class="mr-2">{{ tab.icon }}</span>
                {{ tab.label }}
                <span v-if="tab.count" class="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                  {{ tab.count }}
                </span>
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-auto p-6">
              <!-- Overview Tab -->
              <div v-if="activeTab === 'overview'" class="space-y-6">
                <!-- Event Details Grid -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-4">
                    <div>
                      <h4 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-1">Timestamp</h4>
                      <p class="text-base text-[var(--theme-text-primary)]">{{ formatFullTimestamp(event.timestamp) }}</p>
                    </div>
                    <div v-if="toolInfo">
                      <h4 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-1">Tool</h4>
                      <p class="text-base text-[var(--theme-text-primary)]" data-testid="tool-name">{{ toolInfo.tool }}</p>
                    </div>
                    <div v-if="event.summary">
                      <h4 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-1">Summary</h4>
                      <p class="text-base text-[var(--theme-text-primary)]">{{ event.summary }}</p>
                    </div>
                  </div>
                  
                  <div class="space-y-4">
                    <div>
                      <h4 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-1">Session Info</h4>
                      <div class="text-sm space-y-1">
                        <p><span class="text-[var(--theme-text-tertiary)]">ID:</span> <span class="font-mono">{{ event.session_id }}</span></p>
                        <p v-if="sessionInfo.hostname"><span class="text-[var(--theme-text-tertiary)]">Host:</span> {{ sessionInfo.hostname }}</p>
                        <p v-if="sessionInfo.user"><span class="text-[var(--theme-text-tertiary)]">User:</span> {{ sessionInfo.user }}</p>
                        <p v-if="sessionInfo.processId"><span class="text-[var(--theme-text-tertiary)]">Process:</span> {{ sessionInfo.processId }}</p>
                      </div>
                    </div>
                    <div v-if="event.id">
                      <h4 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-1">Event ID</h4>
                      <p class="text-base text-[var(--theme-text-primary)] font-mono">{{ event.id }}</p>
                    </div>
                  </div>
                </div>

                <!-- Tool Details -->
                <div v-if="toolInfo && toolInfo.detail" class="mt-6">
                  <h4 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-2">Command/Operation</h4>
                  <div class="bg-[var(--theme-bg-tertiary)] rounded-lg p-4 overflow-x-auto">
                    <pre class="text-sm text-[var(--theme-text-primary)] font-mono whitespace-pre-wrap">{{ toolInfo.detail }}</pre>
                  </div>
                </div>
              </div>

              <!-- Payload Tab -->
              <div v-if="activeTab === 'payload'">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-lg font-bold text-[var(--theme-text-primary)]">Event Payload</h4>
                  <div class="flex items-center space-x-2">
                    <button
                      @click="formatPayload = !formatPayload"
                      class="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] text-[var(--theme-text-primary)] transition-colors"
                    >
                      {{ formatPayload ? 'Raw' : 'Formatted' }}
                    </button>
                    <button
                      @click="copyPayload"
                      class="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-white transition-colors flex items-center space-x-1"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{{ copyButtonText }}</span>
                    </button>
                  </div>
                </div>
                <div class="bg-[var(--theme-bg-tertiary)] rounded-lg p-4 overflow-x-auto">
                  <pre 
                    class="text-sm text-[var(--theme-text-primary)] font-mono"
                    :class="{ 'whitespace-pre-wrap': formatPayload }"
                  >{{ formattedPayload }}</pre>
                </div>
              </div>

              <!-- Chat Tab -->
              <div v-if="activeTab === 'chat' && event.chat && event.chat.length > 0">
                <div class="space-y-4">
                  <h4 class="text-lg font-bold text-[var(--theme-text-primary)] mb-4">Chat Transcript</h4>
                  <div class="space-y-3">
                    <div 
                      v-for="(message, index) in event.chat" 
                      :key="index"
                      class="rounded-lg p-4 transition-all duration-200"
                      :class="message.role === 'user' 
                        ? 'bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 ml-12' 
                        : 'bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] mr-12'"
                    >
                      <div class="flex items-start space-x-3">
                        <div 
                          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm"
                          :class="message.role === 'user' 
                            ? 'bg-[var(--theme-primary)] text-white' 
                            : 'bg-[var(--theme-bg-quaternary)] text-[var(--theme-text-primary)]'"
                        >
                          {{ message.role === 'user' ? 'U' : 'A' }}
                        </div>
                        <div class="flex-1">
                          <div class="flex items-center justify-between mb-1">
                            <span class="text-sm font-semibold text-[var(--theme-text-primary)]">
                              {{ message.role === 'user' ? 'User' : 'Assistant' }}
                            </span>
                            <span class="text-xs text-[var(--theme-text-tertiary)]">
                              Message {{ index + 1 }}
                            </span>
                          </div>
                          <div class="text-sm text-[var(--theme-text-primary)] prose prose-sm max-w-none">
                            <pre class="whitespace-pre-wrap font-sans">{{ message.content }}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Metadata Tab -->
              <div v-if="activeTab === 'metadata'">
                <h4 class="text-lg font-bold text-[var(--theme-text-primary)] mb-4">Event Metadata</h4>
                <div class="space-y-4">
                  <!-- Raw Event Data -->
                  <div>
                    <h5 class="text-sm font-semibold text-[var(--theme-text-secondary)] mb-2">Complete Event Data</h5>
                    <div class="bg-[var(--theme-bg-tertiary)] rounded-lg p-4 overflow-x-auto">
                      <pre class="text-sm text-[var(--theme-text-primary)] font-mono whitespace-pre-wrap">{{ JSON.stringify(event, null, 2) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]/50">
            <div class="flex items-center space-x-2">
              <button
                @click="navigateEvent('prev')"
                :disabled="!canNavigatePrev"
                class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center space-x-1"
                :class="canNavigatePrev 
                  ? 'bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] text-[var(--theme-text-primary)]' 
                  : 'bg-[var(--theme-bg-tertiary)]/50 text-[var(--theme-text-tertiary)] cursor-not-allowed'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>
              <button
                @click="navigateEvent('next')"
                :disabled="!canNavigateNext"
                class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center space-x-1"
                :class="canNavigateNext 
                  ? 'bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] text-[var(--theme-text-primary)]' 
                  : 'bg-[var(--theme-bg-tertiary)]/50 text-[var(--theme-text-tertiary)] cursor-not-allowed'"
              >
                <span>Next</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <button
              @click="close"
              class="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] text-[var(--theme-text-primary)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { HookEvent } from '../types';
import { useEventTypeColors } from '../composables/useEventTypeColors';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  event: HookEvent | null;
  allEvents?: HookEvent[];
  sessionColorClass?: string;
  appHexColor?: string;
  disableTeleport?: boolean;
}>(), {
  disableTeleport: false
});

const emit = defineEmits<{
  close: [];
  navigate: [direction: 'prev' | 'next'];
}>();

const activeTab = ref('overview');
const formatPayload = ref(true);
const copyButtonText = ref('Copy');

const { getEventBadgeClasses } = useEventTypeColors();

const tabs = computed(() => {
  const tabList = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'payload', label: 'Payload', icon: '📦' },
  ];
  
  if (props.event?.chat && props.event.chat.length > 0) {
    tabList.push({ 
      id: 'chat', 
      label: 'Chat Transcript', 
      icon: '💬',
      count: props.event.chat.length 
    });
  }
  
  tabList.push({ id: 'metadata', label: 'Metadata', icon: '🔍' });
  
  return tabList;
});

const sessionIdShort = computed(() => {
  if (!props.event) return '';
  const parts = props.event.session_id.split('_');
  if (parts.length >= 3) {
    const originalId = parts[0].slice(0, 6);
    const processId = parts[1];
    return `${originalId}:${processId}`;
  }
  return props.event.session_id.slice(0, 8);
});

const sessionInfo = computed(() => {
  if (!props.event) return {};
  const parts = props.event.session_id.split('_');
  if (parts.length >= 3) {
    return {
      originalId: parts[0],
      processId: parts[1],
      startTime: parseInt(parts[2]) * 1000,
      hostname: props.event.payload?.metadata?.hostname,
      user: props.event.payload?.metadata?.user
    };
  }
  return {
    originalId: props.event.session_id
  };
});

const hookEmoji = computed(() => {
  if (!props.event) return '❓';
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
  if (!props.event) return '';
  return getEventBadgeClasses(props.event.hook_event_type).gradient + ' text-white';
});

const toolInfo = computed(() => {
  if (!props.event) return null;
  const payload = props.event.payload;
  
  if (props.event.hook_event_type === 'UserPromptSubmit' && payload.prompt) {
    return {
      tool: 'User Prompt',
      detail: payload.prompt
    };
  }
  
  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: payload.tool_name };
    
    if (payload.tool_input) {
      if (payload.tool_input.command) {
        info.detail = payload.tool_input.command;
      } else if (payload.tool_input.file_path) {
        info.detail = `File: ${payload.tool_input.file_path}`;
      } else if (payload.tool_input.pattern) {
        info.detail = `Pattern: ${payload.tool_input.pattern}`;
      } else {
        info.detail = JSON.stringify(payload.tool_input, null, 2);
      }
    }
    
    return info;
  }
  
  return null;
});

const formattedPayload = computed(() => {
  if (!props.event) return '';
  return formatPayload.value 
    ? JSON.stringify(props.event.payload, null, 2)
    : JSON.stringify(props.event.payload);
});

const canNavigatePrev = computed(() => {
  if (!props.allEvents || !props.event) return false;
  const currentIndex = props.allEvents.findIndex(e => e.id === props.event!.id);
  return currentIndex > 0;
});

const canNavigateNext = computed(() => {
  if (!props.allEvents || !props.event) return false;
  const currentIndex = props.allEvents.findIndex(e => e.id === props.event!.id);
  return currentIndex < props.allEvents.length - 1;
});

const formatFullTimestamp = (timestamp?: number) => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
};

const copyPayload = async () => {
  try {
    await navigator.clipboard.writeText(formattedPayload.value);
    copyButtonText.value = 'Copied!';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    copyButtonText.value = 'Failed';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  }
};

const navigateEvent = (direction: 'prev' | 'next') => {
  emit('navigate', direction);
};

const close = () => {
  emit('close');
};

// Reset tab when event changes
watch(() => props.event, () => {
  activeTab.value = 'overview';
});

// Handle escape key
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
};

// Add/remove escape key listener
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
  } else {
    document.removeEventListener('keydown', handleEscape);
  }
});
</script>

<style scoped>
/* Modal animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.9);
}
</style>