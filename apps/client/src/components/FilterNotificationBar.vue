<template>
  <Transition name="slide-down">
    <div 
      v-if="notification.isVisible" 
      class="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-b border-blue-700/50 backdrop-blur-sm"
    >
      <div class="px-4 py-3">
        <!-- Main notification content -->
        <div class="flex items-center justify-between">
          <!-- Left section: Filter status and chips -->
          <div class="flex items-center space-x-4">
            <!-- Filter status indicator -->
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-1">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span class="text-sm font-semibold text-blue-300">
                  {{ notification.activeFilters.length }} Filter{{ notification.activeFilters.length !== 1 ? 's' : '' }} Applied
                </span>
              </div>
              
              <!-- Impact indicator -->
              <div class="flex items-center space-x-1 text-xs text-blue-200">
                <span>•</span>
                <span>{{ filterImpactPercentage }}% of data visible</span>
              </div>
            </div>
            
            <!-- Active filter chips -->
            <div class="flex items-center space-x-2">
              <TransitionGroup name="filter-chip">
                <div
                  v-for="filter in notification.activeFilters"
                  :key="filter.id"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-800/50 text-blue-100 border border-blue-600/50 hover:border-blue-500 transition-all duration-200 group"
                >
                  <span class="mr-1.5">{{ filter.icon }}</span>
                  <span>{{ filter.label }}</span>
                  <span v-if="filter.count !== undefined" class="ml-1.5 text-xs text-blue-300 bg-blue-900/50 px-1.5 py-0.5 rounded-full">
                    {{ filter.count }}
                  </span>
                  <button
                    @click="removeFilter(filter.id)"
                    class="ml-2 opacity-60 hover:opacity-100 hover:text-red-300 transition-all duration-200"
                    :title="`Remove ${filter.type} filter`"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </TransitionGroup>
            </div>
          </div>
          
          <!-- Right section: Summary and actions -->
          <div class="flex items-center space-x-4">
            <!-- Filter summary -->
            <div class="text-sm text-blue-200">
              {{ filterSummaryText }}
            </div>
            
            <!-- Action buttons -->
            <div class="flex items-center space-x-2">
              <!-- Toggle notifications -->
              <button
                @click="toggleNotifications"
                class="p-1.5 rounded-lg bg-blue-800/30 hover:bg-blue-700/50 text-blue-300 hover:text-blue-200 transition-all duration-200"
                :title="showNotifications ? 'Hide filter notifications' : 'Show filter notifications'"
              >
                <svg v-if="showNotifications" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              </button>
              
              <!-- Clear all filters -->
              <button
                @click="clearAllFilters"
                class="px-3 py-1.5 rounded-lg bg-red-800/30 hover:bg-red-700/50 text-red-300 hover:text-red-200 border border-red-700/50 hover:border-red-600 transition-all duration-200 text-sm font-medium"
                title="Clear all active filters"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
        
        <!-- Expanded details (mobile responsive) -->
        <div v-if="notification.activeFilters.length > 3" class="mt-3 pt-3 border-t border-blue-700/30 lg:hidden">
          <div class="text-xs text-blue-300">
            <span class="font-medium">Active Filters:</span>
            <span class="ml-2">
              {{ notification.activeFilters.map(f => f.label).join(', ') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { FilterNotification } from '../types';

interface Props {
  notification: FilterNotification;
  filterImpactPercentage: number;
  filterSummaryText: string;
  showNotifications: boolean;
}

interface Emits {
  removeFilter: [filterId: string];
  clearAllFilters: [];
  toggleNotifications: [];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const removeFilter = (filterId: string) => {
  emit('removeFilter', filterId);
};

const clearAllFilters = () => {
  emit('clearAllFilters');
};

const toggleNotifications = () => {
  emit('toggleNotifications');
};
</script>

<style scoped>
/* Slide down animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Filter chip animations */
.filter-chip-enter-active,
.filter-chip-leave-active {
  transition: all 0.3s ease;
}

.filter-chip-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}

.filter-chip-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .filter-chip-container {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .filter-summary {
    display: none;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>