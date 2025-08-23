import { ref, watch, computed } from 'vue';

interface ExpandableStateOptions {
  storageKey?: string;
  defaultValue?: boolean;
  persist?: boolean;
  scope?: 'session' | 'local';
}

// Global state store for expanded sections
const globalExpandedState = ref<Map<string, boolean>>(new Map());
const globalStateListeners = ref<Map<string, Set<() => void>>>(new Map());

/**
 * Reactive expandable state management with persistence
 * 
 * @param key - Unique identifier for the expandable section
 * @param defaultExpanded - Default expansion state
 * @param persist - Whether to persist state across sessions
 * @param scope - Storage scope (session or local)
 */
export function useExpandableState(
  key: string,
  defaultExpanded = false,
  persist = false,
  scope: 'session' | 'local' = 'local'
) {
  const storage = scope === 'session' ? sessionStorage : localStorage;
  const storageKey = `expandable-state-${key}`;
  
  // Initialize state from storage or default
  const getInitialValue = (): boolean => {
    if (persist) {
      try {
        const stored = storage.getItem(storageKey);
        if (stored !== null) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.warn(`Failed to load expandable state for ${key}:`, error);
      }
    }
    return defaultExpanded;
  };

  // Create reactive state
  const isExpanded = ref(getInitialValue());
  
  // Update global state
  globalExpandedState.value.set(key, isExpanded.value);

  // Save state to storage
  const saveState = (value: boolean) => {
    if (persist) {
      try {
        storage.setItem(storageKey, JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to save expandable state for ${key}:`, error);
      }
    }
    
    // Update global state
    globalExpandedState.value.set(key, value);
    
    // Notify listeners
    const listeners = globalStateListeners.value.get(key);
    if (listeners) {
      listeners.forEach(callback => callback());
    }
  };

  // Watch for changes and save
  watch(isExpanded, (newValue) => {
    saveState(newValue);
  }, { immediate: false });

  // Toggle function
  const toggleExpansion = () => {
    isExpanded.value = !isExpanded.value;
  };

  // Expand function
  const expand = () => {
    isExpanded.value = true;
  };

  // Collapse function
  const collapse = () => {
    isExpanded.value = false;
  };

  // Set state function
  const setState = (value: boolean) => {
    isExpanded.value = value;
  };

  // Get current value (useful for non-reactive contexts)
  const getValue = () => isExpanded.value;

  // Set value (useful for non-reactive contexts)
  const setValue = (value: boolean) => {
    isExpanded.value = value;
  };

  return {
    isExpanded: computed(() => isExpanded.value),
    toggleExpansion,
    expand,
    collapse,
    setState,
    getValue,
    setValue
  };
}

/**
 * Batch management for multiple expandable sections
 */
export function useExpandableGroup(
  keys: string[],
  defaultExpanded = false,
  persist = false
) {
  const sections = keys.map(key => useExpandableState(key, defaultExpanded, persist));
  
  const expandAll = () => {
    sections.forEach(section => section.expand());
  };
  
  const collapseAll = () => {
    sections.forEach(section => section.collapse());
  };
  
  const toggleAll = () => {
    const anyExpanded = sections.some(section => section.getValue());
    if (anyExpanded) {
      collapseAll();
    } else {
      expandAll();
    }
  };
  
  const isAnyExpanded = computed(() => 
    sections.some(section => section.isExpanded.value)
  );
  
  const areAllExpanded = computed(() => 
    sections.every(section => section.isExpanded.value)
  );
  
  const expandedCount = computed(() => 
    sections.filter(section => section.isExpanded.value).length
  );
  
  return {
    sections,
    expandAll,
    collapseAll,
    toggleAll,
    isAnyExpanded,
    areAllExpanded,
    expandedCount
  };
}

/**
 * Advanced state management with hierarchical support
 */
export function useHierarchicalExpandableState(
  baseKey: string,
  path: string[],
  defaultExpanded = false,
  persist = false
) {
  const fullKey = `${baseKey}-${path.join('.')}`;
  const parentKey = path.length > 1 ? `${baseKey}-${path.slice(0, -1).join('.')}` : null;
  
  const { 
    isExpanded, 
    toggleExpansion, 
    expand, 
    collapse, 
    getValue, 
    setValue 
  } = useExpandableState(fullKey, defaultExpanded, persist);
  
  // Auto-expand parent when child expands
  const expandWithParents = () => {
    expand();
    
    if (parentKey) {
      const parentState = useExpandableState(parentKey, false, persist);
      parentState.expand();
    }
  };
  
  // Collapse children when parent collapses
  const collapseWithChildren = () => {
    collapse();
    
    // Find and collapse children
    const childPrefix = `${fullKey}.`;
    globalExpandedState.value.forEach((_, key) => {
      if (key.startsWith(childPrefix)) {
        const childState = useExpandableState(key.replace(`${baseKey}-`, ''), false, persist);
        childState.collapse();
      }
    });
  };
  
  // Get all children states
  const getChildrenStates = () => {
    const children: Array<{ key: string; expanded: boolean }> = [];
    const childPrefix = `${fullKey}.`;
    
    globalExpandedState.value.forEach((expanded, key) => {
      if (key.startsWith(childPrefix)) {
        children.push({ key, expanded });
      }
    });
    
    return children;
  };
  
  // Check if any children are expanded
  const hasExpandedChildren = computed(() => {
    return getChildrenStates().some(child => child.expanded);
  });
  
  return {
    isExpanded,
    toggleExpansion,
    expand,
    collapse,
    expandWithParents,
    collapseWithChildren,
    hasExpandedChildren,
    getValue,
    setValue,
    getChildrenStates
  };
}

/**
 * Global state utilities
 */
export function useGlobalExpandableState() {
  const getAllExpandedKeys = () => {
    const expanded: string[] = [];
    globalExpandedState.value.forEach((isExpanded, key) => {
      if (isExpanded) {
        expanded.push(key);
      }
    });
    return expanded;
  };
  
  const getExpandedCount = () => {
    return getAllExpandedKeys().length;
  };
  
  const clearAllState = (persist = false) => {
    globalExpandedState.value.clear();
    
    if (persist) {
      // Clear localStorage/sessionStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('expandable-state-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Also clear sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('expandable-state-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }
  };
  
  const subscribeToStateChanges = (key: string, callback: () => void) => {
    if (!globalStateListeners.value.has(key)) {
      globalStateListeners.value.set(key, new Set());
    }
    globalStateListeners.value.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = globalStateListeners.value.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          globalStateListeners.value.delete(key);
        }
      }
    };
  };
  
  return {
    getAllExpandedKeys,
    getExpandedCount,
    clearAllState,
    subscribeToStateChanges,
    globalState: computed(() => new Map(globalExpandedState.value))
  };
}

/**
 * URL hash synchronization for deep linking
 */
export function useExpandableUrlSync(
  baseKey: string,
  persist = true
) {
  const { getValue, setValue } = useExpandableState(baseKey, false, persist);
  
  const syncFromUrl = () => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith(baseKey)) {
      setValue(true);
      
      // Scroll to element if it exists
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
  
  const syncToUrl = (sectionId: string) => {
    if (getValue()) {
      window.history.replaceState(null, '', `#${sectionId}`);
    }
  };
  
  // Listen for hash changes
  const handleHashChange = () => {
    syncFromUrl();
  };
  
  // Setup URL synchronization
  window.addEventListener('hashchange', handleHashChange);
  
  // Initial sync
  syncFromUrl();
  
  // Cleanup function
  const cleanup = () => {
    window.removeEventListener('hashchange', handleHashChange);
  };
  
  return {
    syncFromUrl,
    syncToUrl,
    cleanup
  };
}