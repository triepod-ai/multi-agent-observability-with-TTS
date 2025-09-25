<template>
  <div class="progressive-disclosure">
    <!-- Header with Level Controls -->
    <div class="flex items-center justify-between mb-0.5 p-0.5 bg-gradient-to-r from-blue-900 to-purple-900 rounded">
      <div>
        <h2 class="text-sm font-semibold text-white mb-0">{{ title }}</h2>
        <p v-if="description" class="text-xs text-blue-100">{{ description }}</p>
      </div>
      
      <div class="flex items-center space-x-2">
        <!-- Disclosure Level Selector -->
        <div class="flex items-center space-x-2">
          <span class="text-xs text-blue-100">Detail Level:</span>
          <select
            v-model="currentLevel"
            @change="handleLevelChange"
            class="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option
              v-for="level in disclosureLevels"
              :key="level.id"
              :value="level.id"
            >
              {{ level.label }}
            </option>
          </select>
        </div>
        
        <!-- Quick Actions -->
        <div class="flex items-center space-x-1">
          <button
            @click="expandAll"
            class="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
            title="Expand all sections"
          >
            ⊞
          </button>
          <button
            @click="collapseAll"
            class="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
            title="Collapse all sections"
          >
            ⊟
          </button>
          <button
            v-if="showSearch"
            @click="toggleSearch"
            class="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
            title="Search content"
          >
            🔍
          </button>
        </div>
      </div>
    </div>

    <!-- Search Interface -->
    <Transition name="search-expand">
      <div
        v-if="searchVisible"
        class="mb-1 p-1 bg-gray-800 border border-gray-700 rounded"
      >
        <div class="flex items-center space-x-3">
          <input
            v-model="searchQuery"
            @input="performSearch"
            placeholder="Search through all disclosure levels..."
            class="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            @click="clearSearch"
            class="px-3 py-2 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Clear
          </button>
        </div>
        
        <div
          v-if="searchResults.length > 0"
          class="mt-2 text-xs text-gray-400"
        >
          Found {{ searchResults.length }} results
        </div>
      </div>
    </Transition>

    <!-- Level Description -->
    <div class="mb-0.5 p-0.5 bg-gray-800 border border-gray-700 rounded">
      <div class="flex items-center space-x-2 text-xs">
        <div class="flex items-center space-x-1">
          <div
            class="w-2 h-2 rounded-full"
            :class="currentLevelInfo.color"
          ></div>
          <span class="font-medium text-white">{{ currentLevelInfo.label }}</span>
        </div>
        <span class="text-gray-500">•</span>
        <span class="text-gray-400">{{ currentLevelInfo.description }}</span>
        <span class="text-gray-500">•</span>
        <span class="text-gray-400">{{ visibleSectionsCount }} visible</span>
      </div>
    </div>

    <!-- Progressive Content -->
    <NestedExpandables
      :sections="processedSections"
      :disclosure-levels="disclosureLevels"
      :default-level="currentLevel"
      :max-depth="maxDepth"
      :show-breadcrumbs="showBreadcrumbs"
      :show-controls="false"
      :show-quick-access="showQuickAccess"
      :persist-state="persistState"
      :state-key-prefix="`progressive-${stateKey}`"
      @level-change="currentLevel = $event"
      @section-expand="handleSectionExpand"
      @section-collapse="handleSectionCollapse"
      @navigate="handleNavigate"
      @deep-link="handleDeepLink"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import NestedExpandables from './NestedExpandables.vue';

interface DisclosureLevel {
  id: string;
  label: string;
  description: string;
  color?: string;
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

interface SearchResult {
  section: NestedContentSection;
  path: string[];
  matchType: 'title' | 'content' | 'metadata';
  snippet: string;
}

interface Props {
  title: string;
  description?: string;
  sections: NestedContentSection[];
  disclosureLevels?: DisclosureLevel[];
  defaultLevel?: string;
  maxDepth?: number;
  showBreadcrumbs?: boolean;
  showQuickAccess?: boolean;
  showSearch?: boolean;
  showProgress?: boolean;
  persistState?: boolean;
  stateKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disclosureLevels: () => [
    { id: 'overview', label: 'Overview', description: 'Basic concepts and key points', color: 'bg-green-500' },
    { id: 'details', label: 'Details', description: 'Expanded explanations with examples', color: 'bg-blue-500' },
    { id: 'advanced', label: 'Advanced', description: 'Expert-level information and edge cases', color: 'bg-purple-500' },
    { id: 'reference', label: 'Reference', description: 'Complete technical documentation', color: 'bg-red-500' }
  ],
  defaultLevel: 'overview',
  maxDepth: 4,
  showBreadcrumbs: true,
  showQuickAccess: true,
  showSearch: true,
  showProgress: true,
  persistState: true,
  stateKey: 'progressive-disclosure'
});

const emit = defineEmits<{
  levelChange: [level: string];
  sectionExplore: [sectionId: string, path: string[]];
  searchPerformed: [query: string, results: SearchResult[]];
  progressUpdate: [percentage: number];
}>();

// State management
const currentLevel = ref(props.defaultLevel);
const searchVisible = ref(false);
const searchQuery = ref('');
const searchResults = ref<SearchResult[]>([]);
const exploredSections = ref<Set<string>>(new Set());

// Computed properties
const currentLevelInfo = computed(() => {
  return props.disclosureLevels.find(level => level.id === currentLevel.value) 
    || props.disclosureLevels[0];
});

const levelOrder = computed(() => {
  const order: Record<string, number> = {};
  props.disclosureLevels.forEach((level, index) => {
    order[level.id] = index;
  });
  return order;
});

const currentLevelIndex = computed(() => levelOrder.value[currentLevel.value] || 0);

const processedSections = computed(() => {
  if (searchQuery.value.trim()) {
    return buildSearchResultSections();
  }
  return filterSectionsByLevel(props.sections, currentLevelIndex.value);
});

const visibleSectionsCount = computed(() => {
  return countVisibleSections(processedSections.value);
});

const totalSections = computed(() => {
  return countAllSections(props.sections);
});

const progressPercentage = computed(() => {
  return totalSections.value > 0 
    ? (exploredSections.value.size / totalSections.value) * 100 
    : 0;
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

const countVisibleSections = (sections: NestedContentSection[]): number => {
  return sections.reduce((count, section) => {
    let total = 1;
    if (section.children) {
      total += countVisibleSections(section.children);
    }
    return count + total;
  }, 0);
};

const countAllSections = (sections: NestedContentSection[]): number => {
  return sections.reduce((count, section) => {
    let total = 1;
    if (section.children) {
      total += countAllSections(section.children);
    }
    return count + total;
  }, 0);
};

const handleLevelChange = () => {
  emit('levelChange', currentLevel.value);
  
  // Save to localStorage if persistence is enabled
  if (props.persistState) {
    localStorage.setItem(`${props.stateKey}-level`, currentLevel.value);
  }
};

const expandAll = () => {
  // This would trigger the NestedExpandables component to expand all sections
  // Implementation depends on the parent-child communication pattern
};

const collapseAll = () => {
  // This would trigger the NestedExpandables component to collapse all sections
  // Implementation depends on the parent-child communication pattern
};

const toggleSearch = () => {
  searchVisible.value = !searchVisible.value;
  if (!searchVisible.value) {
    clearSearch();
  }
};

const performSearch = () => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    searchResults.value = [];
    return;
  }

  const results: SearchResult[] = [];
  
  const searchInSections = (sections: NestedContentSection[], path: string[] = []) => {
    sections.forEach(section => {
      const sectionPath = [...path, section.id];
      
      // Search in title
      if (section.title.toLowerCase().includes(query)) {
        results.push({
          section,
          path: sectionPath,
          matchType: 'title',
          snippet: section.title
        });
      }
      
      // Search in content
      if (section.content && section.content.toLowerCase().includes(query)) {
        const index = section.content.toLowerCase().indexOf(query);
        const start = Math.max(0, index - 50);
        const end = Math.min(section.content.length, index + query.length + 50);
        const snippet = section.content.slice(start, end);
        
        results.push({
          section,
          path: sectionPath,
          matchType: 'content',
          snippet: snippet
        });
      }
      
      // Search in metadata
      if (section.metadata) {
        const metadataStr = JSON.stringify(section.metadata).toLowerCase();
        if (metadataStr.includes(query)) {
          results.push({
            section,
            path: sectionPath,
            matchType: 'metadata',
            snippet: 'Found in metadata'
          });
        }
      }
      
      // Recursively search children
      if (section.children) {
        searchInSections(section.children, sectionPath);
      }
    });
  };
  
  searchInSections(props.sections);
  searchResults.value = results;
  
  emit('searchPerformed', query, results);
};

const clearSearch = () => {
  searchQuery.value = '';
  searchResults.value = [];
};

const buildSearchResultSections = (): NestedContentSection[] => {
  // Convert search results into a flat structure for display
  return searchResults.value.map((result, index) => ({
    id: `search-result-${index}`,
    title: result.section.title,
    subtitle: `Found in ${result.matchType}: ${result.snippet}`,
    icon: result.section.icon || '🔍',
    badge: result.matchType,
    content: result.section.content,
    level: 0,
    metadata: {
      ...result.section.metadata,
      searchPath: result.path.join(' → '),
      matchType: result.matchType
    }
  }));
};

const handleSectionExpand = (path: string[]) => {
  const sectionId = path.join('.');
  exploredSections.value.add(sectionId);
  
  emit('sectionExplore', sectionId, path);
  emit('progressUpdate', progressPercentage.value);
  
  // Save progress if persistence is enabled
  if (props.persistState) {
    localStorage.setItem(
      `${props.stateKey}-explored`,
      JSON.stringify([...exploredSections.value])
    );
  }
};

const handleSectionCollapse = (path: string[]) => {
  // Optional: Could remove from explored sections or leave for progress tracking
};

const handleNavigate = (path: string[]) => {
  // Track navigation for analytics or user behavior insights
};

const handleDeepLink = (url: string) => {
  // Handle deep linking functionality
};

const resetProgress = () => {
  exploredSections.value.clear();
  emit('progressUpdate', 0);
  
  if (props.persistState) {
    localStorage.removeItem(`${props.stateKey}-explored`);
  }
};

// Load saved state on mount
onMounted(() => {
  if (props.persistState) {
    // Load disclosure level
    const savedLevel = localStorage.getItem(`${props.stateKey}-level`);
    if (savedLevel && props.disclosureLevels.some(l => l.id === savedLevel)) {
      currentLevel.value = savedLevel;
    }
    
    // Load explored sections
    const savedExplored = localStorage.getItem(`${props.stateKey}-explored`);
    if (savedExplored) {
      try {
        const explored = JSON.parse(savedExplored);
        if (Array.isArray(explored)) {
          exploredSections.value = new Set(explored);
        }
      } catch (e) {
        console.warn('Failed to load explored sections from localStorage');
      }
    }
  }
});

// Watch for progress changes
watch(progressPercentage, (newProgress) => {
  emit('progressUpdate', newProgress);
});
</script>

<style scoped>
/* Search expand animation */
.search-expand-enter-active,
.search-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.search-expand-enter-from,
.search-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.search-expand-enter-to,
.search-expand-leave-from {
  opacity: 1;
  max-height: 200px;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

/* Progress bar animations */
.progressive-disclosure .bg-gradient-to-r {
  transition: width 0.5s ease-in-out;
}

/* Level indicator colors */
.bg-green-500 { background-color: #10b981; }
.bg-blue-500 { background-color: #3b82f6; }
.bg-purple-500 { background-color: #8b5cf6; }
.bg-red-500 { background-color: #ef4444; }

/* Responsive adjustments */
@media (max-width: 768px) {
  .progressive-disclosure .flex.items-center.justify-between {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .progressive-disclosure .flex.items-center.space-x-4 {
    flex-direction: column;
    space-x: 0;
    gap: 0.5rem;
    width: 100%;
  }
  
  .progressive-disclosure select {
    width: 100%;
  }
}
</style>