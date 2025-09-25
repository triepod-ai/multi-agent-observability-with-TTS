<template>
  <div 
    :id="sectionId"
    class="nested-section"
    :class="[
      `depth-${currentDepth}`,
      isExpanded ? 'expanded' : 'collapsed'
    ]"
  >
    <ExpandableSection
      :title="section.title"
      :subtitle="section.subtitle"
      :icon="section.icon"
      :badge="section.badge"
      :level="sectionLevel"
      :variant="sectionVariant"
      :size="sectionSize"
      :default-expanded="isExpanded"
      :state-key="`nested-${path.join('-')}`"
      :persist-state="true"
      @toggle="handleToggle"
      @expand="handleExpand"
      @collapse="handleCollapse"
    >
      <!-- Section Content -->
      <div class="space-y-1">
        <!-- Main Content -->
        <div v-if="section.content" class="prose prose-sm prose-invert max-w-none">
          <div class="text-gray-300 leading-tight text-xs" v-html="formatContent(section.content)"></div>
        </div>

        <!-- Metadata Display -->
        <div
          v-if="section.metadata && Object.keys(section.metadata).length > 0"
          class="grid grid-cols-1 md:grid-cols-2 gap-1 p-1 bg-gray-900 rounded border border-gray-700"
        >
          <div
            v-for="(value, key) in section.metadata"
            :key="key"
            class="flex items-start space-x-1"
          >
            <span class="text-xs font-medium text-blue-400 capitalize min-w-0 flex-shrink-0">
              {{ formatMetadataKey(key) }}:
            </span>
            <span class="text-xs text-gray-300 min-w-0 flex-1">
              {{ formatMetadataValue(value) }}
            </span>
          </div>
        </div>

        <!-- Child Sections -->
        <div
          v-if="section.children && section.children.length > 0 && isExpanded"
          class="space-y-1 pl-4 border-l-2 border-gray-700"
        >
          <div class="flex items-center mb-1">
            <div class="w-2 h-px bg-gray-700 mr-2"></div>
            <span class="text-xs font-medium text-gray-400">
              {{ section.children.length }} subsection{{ section.children.length !== 1 ? 's' : '' }}
            </span>
          </div>
          
          <NestedSection
            v-for="child in section.children"
            :key="child.id"
            :section="child"
            :current-level="currentLevel"
            :max-depth="maxDepth"
            :current-depth="currentDepth + 1"
            :path="[...path, child.id]"
            @navigate="$emit('navigate', $event)"
            @expand="$emit('expand', $event)"
            @collapse="$emit('collapse', $event)"
            @deep-link="$emit('deepLink', $event)"
          />
        </div>

        <!-- Deep Link Actions -->
        <div
          v-if="showActions"
          class="flex items-center justify-between pt-1 border-t border-gray-700"
        >
          <div class="flex items-center space-x-1 text-xs text-gray-400">
            <span>Level {{ currentDepth + 1 }}</span>
            <span v-if="section.children">•</span>
            <span v-if="section.children">{{ section.children.length }} children</span>
          </div>

          <div class="flex items-center space-x-1">
            <button
              v-if="section.children && section.children.length > 0"
              @click="expandChildren"
              class="px-1 py-0 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Expand Children
            </button>
            <button
              @click="copyDeepLink"
              class="px-1 py-0 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              title="Copy direct link to this section"
            >
              📋 Copy Link
            </button>
          </div>
        </div>
      </div>
    </ExpandableSection>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, nextTick, type Ref } from 'vue';
import ExpandableSection from './ExpandableSection.vue';

interface NestedContentSection {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  content?: string;
  level: number;
  minLevel?: number;
  maxLevel?: number;
  children?: NestedContentSection[];
  metadata?: Record<string, any>;
}

interface Props {
  section: NestedContentSection;
  currentLevel: string;
  maxDepth: number;
  currentDepth: number;
  path: string[];
  showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true
});

const emit = defineEmits<{
  navigate: [path: string[]];
  expand: [path: string[]];
  collapse: [path: string[]];
  deepLink: [url: string];
}>();

// Inject expanded sections state from parent
const expandedSections = inject<Ref<Set<string>>>('expandedSections', ref(new Set()));

// Computed properties
const sectionId = computed(() => `nested-section-${props.path.join('-')}`);
const pathKey = computed(() => props.path.join('.'));

const isExpanded = computed(() => {
  return expandedSections.value.has(pathKey.value);
});

const sectionLevel = computed(() => {
  const levelMap = {
    0: 'primary',
    1: 'secondary',
    2: 'tertiary'
  } as const;
  
  return levelMap[Math.min(props.currentDepth, 2) as keyof typeof levelMap] || 'tertiary';
});

const sectionVariant = computed(() => {
  const variantMap = {
    0: 'default',
    1: 'bordered',
    2: 'minimal'
  } as const;
  
  return variantMap[Math.min(props.currentDepth, 2) as keyof typeof variantMap] || 'minimal';
});

const sectionSize = computed(() => {
  const sizeMap = {
    0: 'lg',
    1: 'md',
    2: 'sm'
  } as const;
  
  return sizeMap[Math.min(props.currentDepth, 2) as keyof typeof sizeMap] || 'sm';
});

// Methods
const formatContent = (content: string): string => {
  // Convert markdown-like syntax to HTML
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-blue-300">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
};

const formatMetadataKey = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const formatMetadataValue = (value: any): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const handleToggle = (expanded: boolean) => {
  if (expanded) {
    expandedSections.value.add(pathKey.value);
    emit('expand', props.path);
  } else {
    expandedSections.value.delete(pathKey.value);
    emit('collapse', props.path);
  }
};

const handleExpand = () => {
  expandedSections.value.add(pathKey.value);
  emit('expand', props.path);
};

const handleCollapse = () => {
  expandedSections.value.delete(pathKey.value);
  emit('collapse', props.path);
};

const expandChildren = () => {
  if (props.section.children) {
    props.section.children.forEach(child => {
      const childPath = [...props.path, child.id];
      expandedSections.value.add(childPath.join('.'));
    });
  }
};

const copyDeepLink = async () => {
  const url = `${window.location.origin}${window.location.pathname}#${sectionId.value}`;
  
  try {
    await navigator.clipboard.writeText(url);
    
    // Emit deep link event for analytics/tracking
    emit('deepLink', url);
    
    // Could show a toast notification here
    console.log('Deep link copied to clipboard:', url);
  } catch (err) {
    console.error('Failed to copy deep link:', err);
  }
};

// Auto-scroll to section if it matches the URL hash
nextTick(() => {
  if (window.location.hash === `#${sectionId.value}`) {
    const element = document.getElementById(sectionId.value);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});
</script>

<style scoped>
.nested-section {
  transition: all 0.2s ease;
}

/* Depth-based styling */
.depth-0 {
  margin-bottom: 1rem;
}

.depth-1 {
  margin-bottom: 0.75rem;
}

.depth-2 {
  margin-bottom: 0.5rem;
}

.depth-3 {
  margin-bottom: 0.25rem;
}

/* Visual hierarchy indicators */
.depth-1 .expandable-section {
  margin-left: 0.5rem;
}

.depth-2 .expandable-section {
  margin-left: 1rem;
}

.depth-3 .expandable-section {
  margin-left: 1.5rem;
}

/* Expanded state styling */
.expanded {
  background: rgba(59, 130, 246, 0.05);
  border-radius: 0.5rem;
}

/* Prose styling for content */
.prose code {
  @apply bg-gray-800 px-1 rounded text-blue-300 text-xs;
}

.prose strong {
  @apply text-white;
}

.prose em {
  @apply text-blue-300;
}

/* Animation for child sections */
.nested-section .space-y-2 > * {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .depth-1 .expandable-section,
  .depth-2 .expandable-section,
  .depth-3 .expandable-section {
    margin-left: 0;
  }
}
</style>