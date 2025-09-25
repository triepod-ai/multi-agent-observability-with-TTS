<template>
  <div class="nested-expandables space-y-0">
    <!-- Breadcrumb Navigation for Deep Levels -->
    <div
      v-if="showBreadcrumbs && currentPath.length > 0"
      class="flex items-center space-x-2 text-xs text-gray-400 mb-1 p-1 bg-gray-900 rounded border border-gray-700"
    >
      <span class="flex items-center">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3h14a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z"/>
        </svg>
        Navigation:
      </span>
      <template v-for="(item, index) in currentPath" :key="index">
        <span class="text-gray-600">›</span>
        <button
          @click="navigateToLevel(index)"
          class="hover:text-blue-400 transition-colors"
        >
          {{ item.title }}
        </button>
      </template>
    </div>

    <!-- Control Bar -->
    <div
      v-if="showControls"
      class="flex items-center justify-between p-1 bg-gray-800 border border-gray-700 rounded mb-1"
    >
      <div class="flex items-center space-x-3">
        <span class="text-xs text-gray-400">Disclosure Level:</span>
        <div class="flex items-center space-x-1">
          <button
            v-for="level in availableLevels"
            :key="level.id"
            @click="setDisclosureLevel(level.id)"
            class="px-2 py-1 text-xs rounded transition-colors"
            :class="currentLevel === level.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            {{ level.label }}
          </button>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          @click="expandAll"
          class="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
        >
          Expand All
        </button>
        <button
          @click="collapseAll"
          class="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
        >
          Collapse All
        </button>
      </div>
    </div>

    <!-- Nested Content Sections -->
    <div class="space-y-0">
      <NestedSection
        v-for="section in filteredSections"
        :key="section.id"
        :section="section"
        :current-level="currentLevel"
        :max-depth="maxDepth"
        :current-depth="0"
        :path="[]"
        @navigate="handleNavigate"
        @expand="handleExpand"
        @collapse="handleCollapse"
        @deep-link="handleDeepLink"
      />
    </div>

    <!-- Quick Access Menu -->
    <div
      v-if="showQuickAccess && quickAccessItems.length > 0"
      class="mt-3 p-2 bg-gray-800 border border-gray-700 rounded"
    >
      <h4 class="text-sm font-medium text-white mb-3 flex items-center">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Quick Access
      </h4>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          v-for="item in quickAccessItems"
          :key="item.id"
          @click="jumpToSection(item.path)"
          class="text-left p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 hover:text-white transition-colors"
        >
          <div class="flex items-center">
            <span class="mr-2">{{ item.icon }}</span>
            <span class="truncate">{{ item.title }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide } from 'vue';
import { useExpandableState } from '../composables/useExpandableState';
import NestedSection from './NestedSection.vue';

interface DisclosureLevel {
  id: string;
  label: string;
  description: string;
}

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

interface PathItem {
  id: string;
  title: string;
}

interface QuickAccessItem {
  id: string;
  title: string;
  icon: string;
  path: string[];
}

interface Props {
  sections: NestedContentSection[];
  disclosureLevels?: DisclosureLevel[];
  defaultLevel?: string;
  maxDepth?: number;
  showBreadcrumbs?: boolean;
  showControls?: boolean;
  showQuickAccess?: boolean;
  persistState?: boolean;
  stateKeyPrefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disclosureLevels: () => [
    { id: 'overview', label: 'Overview', description: 'Basic information only' },
    { id: 'details', label: 'Details', description: 'Expanded details and examples' },
    { id: 'advanced', label: 'Advanced', description: 'Expert-level information' },
    { id: 'reference', label: 'Reference', description: 'Complete technical reference' }
  ],
  defaultLevel: 'overview',
  maxDepth: 4,
  showBreadcrumbs: true,
  showControls: true,
  showQuickAccess: true,
  persistState: true,
  stateKeyPrefix: 'nested-expandables'
});

const emit = defineEmits<{
  levelChange: [level: string];
  sectionExpand: [path: string[]];
  sectionCollapse: [path: string[]];
  navigate: [path: string[]];
  deepLink: [url: string];
}>();

// State management
const { getValue, setValue } = useExpandableState(
  `${props.stateKeyPrefix}-level`,
  props.defaultLevel,
  props.persistState
);

const currentLevel = ref(getValue());
const currentPath = ref<PathItem[]>([]);
const expandedSections = ref<Set<string>>(new Set());

// Computed properties
const availableLevels = computed(() => props.disclosureLevels);

const levelOrder = computed(() => {
  const order: Record<string, number> = {};
  props.disclosureLevels.forEach((level, index) => {
    order[level.id] = index;
  });
  return order;
});

const currentLevelIndex = computed(() => levelOrder.value[currentLevel.value] || 0);

const filteredSections = computed(() => {
  return filterSectionsByLevel(props.sections, currentLevelIndex.value);
});

const quickAccessItems = computed((): QuickAccessItem[] => {
  const items: QuickAccessItem[] = [];
  
  const extractQuickAccess = (sections: NestedContentSection[], path: string[] = []) => {
    sections.forEach(section => {
      if (section.level <= currentLevelIndex.value && section.badge) {
        items.push({
          id: section.id,
          title: section.title,
          icon: section.icon || '📄',
          path: [...path, section.id]
        });
      }
      
      if (section.children) {
        extractQuickAccess(section.children, [...path, section.id]);
      }
    });
  };
  
  extractQuickAccess(props.sections);
  return items.slice(0, 8); // Limit to 8 items
});

// Methods
const filterSectionsByLevel = (sections: NestedContentSection[], levelIndex: number): NestedContentSection[] => {
  return sections
    .filter(section => {
      const minLevel = section.minLevel !== undefined ? section.minLevel : 0;
      const maxLevel = section.maxLevel !== undefined ? section.maxLevel : 999;
      return levelIndex >= minLevel && levelIndex <= maxLevel;
    })
    .map(section => ({
      ...section,
      children: section.children 
        ? filterSectionsByLevel(section.children, levelIndex)
        : undefined
    }));
};

const setDisclosureLevel = (level: string) => {
  currentLevel.value = level;
  setValue(level);
  emit('levelChange', level);
};

const expandAll = () => {
  const expandAllSections = (sections: NestedContentSection[], path: string[] = []) => {
    sections.forEach(section => {
      const sectionPath = [...path, section.id];
      expandedSections.value.add(sectionPath.join('.'));
      
      if (section.children) {
        expandAllSections(section.children, sectionPath);
      }
    });
  };
  
  expandAllSections(filteredSections.value);
};

const collapseAll = () => {
  expandedSections.value.clear();
  currentPath.value = [];
};

const navigateToLevel = (levelIndex: number) => {
  if (levelIndex < currentPath.value.length) {
    currentPath.value = currentPath.value.slice(0, levelIndex + 1);
  }
};

const jumpToSection = (path: string[]) => {
  // Expand all sections in the path
  for (let i = 0; i < path.length; i++) {
    const pathSegment = path.slice(0, i + 1).join('.');
    expandedSections.value.add(pathSegment);
  }
  
  // Update current path
  const pathItems = buildPathItems(path);
  currentPath.value = pathItems;
  
  emit('navigate', path);
  
  // Scroll to the target section
  setTimeout(() => {
    const targetId = `nested-section-${path.join('-')}`;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

const buildPathItems = (path: string[]): PathItem[] => {
  const items: PathItem[] = [];
  
  const findSection = (sections: NestedContentSection[], searchPath: string[], currentPath: string[] = []): NestedContentSection | null => {
    for (const section of sections) {
      const sectionPath = [...currentPath, section.id];
      
      if (sectionPath.join('.') === searchPath.slice(0, sectionPath.length).join('.')) {
        if (sectionPath.length === searchPath.length) {
          return section;
        }
        if (section.children) {
          return findSection(section.children, searchPath, sectionPath);
        }
      }
    }
    return null;
  };
  
  for (let i = 0; i < path.length; i++) {
    const subPath = path.slice(0, i + 1);
    const section = findSection(props.sections, subPath);
    if (section) {
      items.push({
        id: section.id,
        title: section.title
      });
    }
  }
  
  return items;
};

// Event handlers
const handleNavigate = (path: string[]) => {
  currentPath.value = buildPathItems(path);
  emit('navigate', path);
};

const handleExpand = (path: string[]) => {
  expandedSections.value.add(path.join('.'));
  emit('sectionExpand', path);
};

const handleCollapse = (path: string[]) => {
  expandedSections.value.delete(path.join('.'));
  emit('sectionCollapse', path);
};

const handleDeepLink = (url: string) => {
  emit('deepLink', url);
};

// Provide context for child components
provide('expandedSections', expandedSections);
provide('currentLevel', currentLevel);

// Watch for level changes
watch(currentLevel, (newLevel) => {
  // Reset path when level changes
  currentPath.value = [];
}, { immediate: false });
</script>

<style scoped>
/* Smooth transitions for all elements */
.nested-expandables * {
  transition: all 0.2s ease;
}

/* Breadcrumb hover effects */
.nested-expandables button:hover {
  transform: translateY(-1px);
}

/* Quick access grid responsive behavior */
@media (max-width: 768px) {
  .grid-cols-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>