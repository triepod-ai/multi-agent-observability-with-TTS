<template>
  <div class="select-none">
    <!-- Node Container -->
    <div
      class="flex items-center py-2 px-3 rounded-lg hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group"
      :class="[
        getNodeClasses(),
        { 'bg-gray-800/30': node.expanded && node.children.length > 0 }
      ]"
      :style="{ paddingLeft: `${12 + node.depth * 24}px` }"
      @click="handleClick"
    >
      <!-- Expand/Collapse Control -->
      <div class="w-6 h-6 flex items-center justify-center mr-2">
        <button
          v-if="node.children.length > 0"
          @click.stop="toggleExpansion"
          class="w-5 h-5 rounded hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <svg
            class="w-3 h-3 text-gray-400 transition-transform duration-200"
            :class="{ 'rotate-90': node.expanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div v-else class="w-5 h-5"></div>
      </div>

      <!-- Session Type Icon -->
      <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" :class="getIconContainerClass()">
        <span class="text-lg">{{ getSessionIcon() }}</span>
      </div>

      <!-- Session Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center space-x-2">
          <!-- Session ID and Name -->
          <div class="flex items-center space-x-2 min-w-0">
            <span class="font-mono text-sm text-gray-300 truncate">{{ getSessionShort() }}</span>
            <span v-if="node.agent_name" class="text-sm font-medium text-white truncate">{{ node.agent_name }}</span>
          </div>

          <!-- Status Badge -->
          <div class="flex-shrink-0">
            <div
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :class="getStatusClass()"
            >
              <div class="w-1.5 h-1.5 rounded-full mr-1" :class="getStatusDotClass()"></div>
              {{ node.status }}
            </div>
          </div>
        </div>

        <!-- Secondary Info -->
        <div class="flex items-center space-x-4 mt-1">
          <!-- Relationship Info -->
          <div v-if="node.relationship_type || node.spawn_reason" class="flex items-center space-x-1 text-xs text-gray-400">
            <span v-if="node.relationship_type">{{ node.relationship_type }}</span>
            <span v-if="node.relationship_type && node.spawn_reason">•</span>
            <span v-if="node.spawn_reason" class="truncate max-w-32">{{ node.spawn_reason }}</span>
          </div>

          <!-- Duration -->
          <div v-if="getDuration()" class="text-xs text-gray-400">
            <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ getDuration() }}
          </div>

          <!-- Token Usage -->
          <div v-if="node.token_usage" class="text-xs text-gray-400">
            <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {{ formatNumber(node.token_usage) }} tokens
          </div>

          <!-- Tool Count -->
          <div v-if="node.tool_count" class="text-xs text-gray-400">
            <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ node.tool_count }} tools
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <!-- Navigate Button -->
        <button
          @click.stop="navigate"
          class="p-1 rounded hover:bg-gray-600 transition-colors"
          :title="`View details for session ${node.session_id}`"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        <!-- Copy Button -->
        <button
          @click.stop="copySessionId"
          class="p-1 rounded hover:bg-gray-600 transition-colors"
          title="Copy session ID"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="showTooltip"
        ref="tooltipRef"
        class="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm shadow-xl max-w-80 pointer-events-none"
        :style="tooltipStyle"
      >
        <div class="space-y-2">
          <div class="flex items-center space-x-2">
            <span class="text-lg">{{ getSessionIcon() }}</span>
            <span class="font-medium text-white">{{ node.agent_name || 'Session' }}</span>
          </div>
          
          <div class="text-xs text-gray-300 space-y-1">
            <div><span class="text-gray-400">ID:</span> {{ node.session_id }}</div>
            <div><span class="text-gray-400">Type:</span> {{ node.session_type }}</div>
            <div v-if="node.relationship_type"><span class="text-gray-400">Relation:</span> {{ node.relationship_type }}</div>
            <div v-if="node.spawn_reason"><span class="text-gray-400">Reason:</span> {{ node.spawn_reason }}</div>
            <div><span class="text-gray-400">Status:</span> {{ node.status }}</div>
            <div><span class="text-gray-400">Depth:</span> {{ node.depth }}</div>
            <div v-if="getDuration()"><span class="text-gray-400">Duration:</span> {{ getDuration() }}</div>
            <div v-if="node.token_usage"><span class="text-gray-400">Tokens:</span> {{ formatNumber(node.token_usage) }}</div>
            <div v-if="node.tool_count"><span class="text-gray-400">Tools:</span> {{ node.tool_count }}</div>
            <div v-if="node.children.length"><span class="text-gray-400">Children:</span> {{ node.children.length }}</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Recursive Children -->
    <div v-if="node.expanded && node.children.length > 0" class="space-y-1">
      <SessionTreeNode
        v-for="child in node.children"
        :key="child.session_id"
        :node="child"
        @expand="$emit('expand', $event)"
        @navigate="$emit('navigate', $event)"
        @copy="$emit('copy', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { SessionTreeNode } from '../types';

// Props
interface Props {
  node: SessionTreeNode;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  expand: [sessionId: string];
  navigate: [sessionId: string];
  copy: [sessionId: string];
}>();

// Component state
const showTooltip = ref(false);
const tooltipRef = ref<HTMLElement>();
const tooltipStyle = ref({});

// Session type icons
const sessionIcons: Record<string, string> = {
  main: '🎯',
  subagent: '🤖',
  wave: '🌊',
  continuation: '🔗'
};

// Session type colors
const sessionTypeColors: Record<string, string> = {
  main: 'bg-blue-600/20 border-blue-500/30',
  subagent: 'bg-purple-600/20 border-purple-500/30',
  wave: 'bg-cyan-600/20 border-cyan-500/30',
  continuation: 'bg-green-600/20 border-green-500/30'
};

const iconContainerColors: Record<string, string> = {
  main: 'bg-blue-500/20',
  subagent: 'bg-purple-500/20',
  wave: 'bg-cyan-500/20',
  continuation: 'bg-green-500/20'
};

// Status colors
const statusColors: Record<string, { bg: string; dot: string }> = {
  active: { bg: 'bg-blue-900/30 text-blue-300', dot: 'bg-blue-400 animate-pulse' },
  completed: { bg: 'bg-green-900/30 text-green-300', dot: 'bg-green-400' },
  failed: { bg: 'bg-red-900/30 text-red-300', dot: 'bg-red-400' },
  timeout: { bg: 'bg-yellow-900/30 text-yellow-300', dot: 'bg-yellow-400' }
};

// Computed properties
const getSessionIcon = (): string => {
  return sessionIcons[props.node.session_type] || '📄';
};

const getNodeClasses = (): string => {
  const baseClasses = 'border border-transparent';
  const typeClasses = sessionTypeColors[props.node.session_type] || 'bg-gray-600/20 border-gray-500/30';
  return `${baseClasses} ${typeClasses}`;
};

const getIconContainerClass = (): string => {
  return iconContainerColors[props.node.session_type] || 'bg-gray-500/20';
};

const getStatusClass = (): string => {
  return statusColors[props.node.status]?.bg || 'bg-gray-900/30 text-gray-300';
};

const getStatusDotClass = (): string => {
  return statusColors[props.node.status]?.dot || 'bg-gray-400';
};

const getSessionShort = (): string => {
  const parts = props.node.session_id.split('_');
  if (parts.length >= 2) {
    return `${parts[0].slice(0, 8)}:${parts[1]}`;
  }
  return props.node.session_id.slice(0, 12);
};

const getDuration = (): string | null => {
  if (!props.node.duration_ms && !props.node.end_time) return null;
  
  const duration = props.node.duration_ms || (props.node.end_time ? props.node.end_time - props.node.start_time : 0);
  
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

// Helper functions
function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

// Event handlers
function handleClick(): void {
  if (props.node.children.length > 0) {
    toggleExpansion();
  } else {
    navigate();
  }
}

function toggleExpansion(): void {
  emit('expand', props.node.session_id);
}

function navigate(): void {
  emit('navigate', props.node.session_id);
}

async function copySessionId(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.node.session_id);
    emit('copy', props.node.session_id);
  } catch (err) {
    console.error('Failed to copy session ID:', err);
  }
}

// Note: Tooltip functionality would be implemented here for hover effects
// but is simplified for this implementation

// Note: onMouseEnter and onMouseLeave are referenced in template but not needed in script
</script>

<script lang="ts">
export default {
  name: 'SessionTreeNode'
};
</script>

<style scoped>
/* Custom scrollbar for long content */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover animations */
.group:hover .opacity-0 {
  opacity: 1;
}

/* Icon animations */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>