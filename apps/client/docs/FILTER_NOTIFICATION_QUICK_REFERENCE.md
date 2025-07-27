# Filter Notification System - Developer Quick Reference

## 🚀 Quick Setup

### Basic Implementation
```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFilterNotifications } from '@/composables/useFilterNotifications';
import FilterNotificationBar from '@/components/FilterNotificationBar.vue';

const events = ref([]);
const filters = ref({
  sourceApp: '',
  sessionId: '',
  eventType: '',
  toolName: '',
  search: ''
});

const {
  hasActiveFilters,
  filteredEvents,
  filterNotification,
  removeFilter,
  clearAllFilters,
  toggleNotifications,
  showNotifications,
  filterImpactPercentage,
  filterSummaryText
} = useFilterNotifications(events, filters);
</script>

<template>
  <FilterNotificationBar
    :notification="filterNotification"
    :filter-impact-percentage="filterImpactPercentage"
    :filter-summary-text="filterSummaryText"
    :show-notifications="showNotifications"
    @remove-filter="removeFilter"
    @clear-all-filters="clearAllFilters"
    @toggle-notifications="toggleNotifications"
  />
</template>
```

## 🔧 Key Components

### FilterNotificationBar.vue
**Purpose**: Persistent notification bar  
**Props**: `notification`, `filterImpactPercentage`, `filterSummaryText`, `showNotifications`  
**Events**: `removeFilter`, `clearAllFilters`, `toggleNotifications`

### useFilterNotifications.ts
**Purpose**: Filter state management composable  
**Input**: `events` (Ref), `filters` (Ref)  
**Output**: Filter management functions and computed data

## 📝 Type Definitions

```typescript
interface FilterState {
  sourceApp: string;
  sessionId: string;
  eventType: string;
  toolName: string;
  search?: string;
}

interface ActiveFilter {
  id: string;
  type: 'sourceApp' | 'sessionId' | 'eventType' | 'toolName' | 'search';
  value: string;
  label: string;
  icon: string;
  count?: number;
}
```

## 🎯 Common Use Cases

### Apply Filter
```typescript
// Application filter
filters.value.sourceApp = 'my-app';

// Search filter
filters.value.search = 'error';

// Clear specific filter
filters.value.sourceApp = '';
```

### Remove Filter by ID
```typescript
removeFilter('app-my-app');
removeFilter('search');
```

### Get Filter Statistics
```typescript
console.log(`${filterImpactPercentage.value}% of data visible`);
console.log(filterSummaryText.value); // "X of Y events • X of Y applications"
```

## 🎨 Styling

### CSS Custom Properties
```css
--theme-primary: #3b82f6;
--theme-bg-primary: #111827;
--theme-text-primary: #f9fafb;
--theme-border-primary: #374151;
```

### Filter Chip Colors
- **App Filter**: Blue theme (`bg-blue-800/50`)
- **Session Filter**: Purple theme (`bg-purple-800/50`)
- **Event Type**: Dynamic based on event type
- **Tool Filter**: Green theme (`bg-green-800/50`)
- **Search**: Blue theme (`bg-blue-800/50`)

## 🧪 Testing

### Component Testing
```typescript
import { mount } from '@vue/test-utils';
import FilterNotificationBar from '@/components/FilterNotificationBar.vue';

const mockNotification = {
  isVisible: true,
  totalEvents: 100,
  filteredEvents: 50,
  activeFilters: [
    { id: 'app-test', type: 'sourceApp', value: 'test', label: 'test', icon: '📱' }
  ]
};

const wrapper = mount(FilterNotificationBar, {
  props: {
    notification: mockNotification,
    filterImpactPercentage: 50,
    filterSummaryText: '50 of 100 events',
    showNotifications: true
  }
});
```

### Composable Testing
```typescript
import { ref } from 'vue';
import { useFilterNotifications } from '@/composables/useFilterNotifications';

const events = ref([/* mock events */]);
const filters = ref({ sourceApp: 'test', sessionId: '', eventType: '', toolName: '', search: '' });

const { hasActiveFilters, filteredEvents } = useFilterNotifications(events, filters);

expect(hasActiveFilters.value).toBe(true);
expect(filteredEvents.value.length).toBe(/* expected count */);
```

## 🔧 Customization

### Add New Filter Type
1. **Update FilterState interface** in `types.ts`
2. **Add filter processing** in `useFilterNotifications.ts`
3. **Add icon mapping** in filter chip generation
4. **Update removal logic** in `removeFilter` function

### Custom Filter Icons
```typescript
const customIcons: Record<string, string> = {
  'MyCustomTool': '🔨',
  'AnotherTool': '⚡'
};
```

### Custom Animation Timing
```css
.filter-chip-enter-active,
.filter-chip-leave-active {
  transition: all 0.5s ease; /* Custom timing */
}
```

## 📊 Performance Tips

1. **Use computed properties** for expensive calculations
2. **Debounce search filters** to avoid excessive updates
3. **Limit filter chip count** for better mobile performance
4. **Cache filter results** when appropriate

## 🐛 Common Issues

### Filter Not Updating
- Check reactive binding: `filters.value.field = value`
- Verify computed dependencies are correct
- Ensure `useFilterNotifications` receives updates

### Performance Issues
- Profile with Vue DevTools
- Check for unnecessary re-renders
- Optimize filter processing logic

### Mobile Display Problems
- Test responsive breakpoints
- Verify touch target sizes
- Check horizontal scroll behavior

## 📚 Related Documentation

- [Complete Filter System Documentation](../../../docs/FILTER_NOTIFICATION_SYSTEM.md)
- [Vue 3 Composition API](https://v3.vuejs.org/guide/composition-api-introduction.html)
- [TypeScript Support](https://v3.vuejs.org/guide/typescript-support.html)

---

*Quick reference for Filter Notification System v2.0.0+*