# Multi-Agent Observability Client

Vue 3 + TypeScript client application for real-time monitoring and visualization of Claude Code agent events.

## 🎯 Overview

The client provides a comprehensive dashboard for monitoring multiple Claude Code agents with advanced filtering, real-time updates, and multiple visualization modes.

## 🛠️ Technology Stack

- **Vue 3** with Composition API and `<script setup>` syntax
- **TypeScript** for type safety and better developer experience
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive styling with CSS custom properties
- **WebSocket** for real-time event streaming
- **Canvas API** for high-performance visualizations

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ or Bun
- Multi-Agent Observability Server running

### Installation
```bash
# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun run dev

# Build for production
npm run build
# or
bun run build
```

### Environment Variables
```env
VITE_MAX_EVENTS_TO_DISPLAY=1000  # Maximum events to display in UI
VITE_WS_URL=ws://localhost:4000  # WebSocket server URL
```

## 🎨 Features

### Core Functionality
- **Real-time Event Streaming**: WebSocket connection for live updates
- **Multiple View Modes**: Timeline, Applications, Cards, Swimlane, Grid, and Legacy views
- **Advanced Filtering**: Multi-criteria filtering with persistent notification system
- **Session Management**: Track and visualize multiple concurrent agent sessions
- **Event Navigation**: Detailed event inspection with modal dialogs

### Filter Notification System
- **Persistent Status Bar**: Always-visible filter status when active
- **Real-time Impact Display**: Shows percentage of data visible and affected counts
- **Visual Filter Chips**: Individual filter removal with count badges
- **Cross-View Consistency**: Filters maintained across all view modes
- **Mobile Responsive**: Optimized layout for mobile devices

### Visualization Modes

#### 1. Timeline View
- **Chronological event display** with session grouping
- **Visual timeline** with event type indicators
- **Smooth animations** and responsive design

#### 2. Applications Overview
- **Application-centric monitoring** with session statistics
- **Tool usage visualization** with recent activity
- **Performance metrics** (success rate, response time)

#### 3. Cards View
- **Event cards** with detailed information
- **Session color coding** for visual organization
- **Expandable details** with payload inspection

#### 4. Swimlane View
- **Session-based lanes** showing event flow
- **Horizontal timeline** with session separation
- **Activity patterns** visualization

#### 5. Grid View
- **Responsive grid layout** with auto-sizing cards
- **Dense information display** for large datasets
- **Efficient scrolling** with virtual rendering

## 🔧 Architecture

### Component Structure
```
src/
├── components/
│   ├── FilterNotificationBar.vue     # Persistent filter status
│   ├── SmartFilterBar.vue           # Advanced filtering interface
│   ├── ActivityDashboard.vue        # Real-time activity overview
│   ├── ApplicationsOverview.vue     # Application-centric view
│   ├── TimelineView.vue             # Visual timeline display
│   ├── EventCard.vue                # Individual event display
│   ├── EventDetailModal.vue         # Detailed event inspection
│   └── SessionSwimLane.vue          # Session-based visualization
├── composables/
│   ├── useFilterNotifications.ts    # Filter state management
│   ├── useWebSocket.ts              # WebSocket connection
│   ├── useThemes.ts                 # Theme management
│   └── useEventColors.ts            # Color assignment
└── types.ts                         # TypeScript definitions
```

### State Management
- **Reactive State**: Vue 3 reactivity system for efficient updates
- **Composables**: Reusable logic with TypeScript support
- **Type Safety**: Comprehensive TypeScript interfaces
- **Real-time Sync**: WebSocket-driven state updates

### Filter System Architecture
```typescript
interface FilterState {
  sourceApp: string;      // Application filter
  sessionId: string;      // Session filter
  eventType: string;      // Event type filter
  toolName: string;       // Tool name filter
  search?: string;        // Text search filter
}

interface FilterNotification {
  isVisible: boolean;
  totalEvents: number;
  filteredEvents: number;
  totalApplications: number;
  filteredApplications: number;
  totalSessions: number;
  filteredSessions: number;
  activeFilters: ActiveFilter[];
}
```

## 🎯 Usage Examples

### Applying Filters
```typescript
// Filter by application
filters.value.sourceApp = 'claude-code';

// Filter by tool
filters.value.toolName = 'Read';

// Search events
filters.value.search = 'error';

// Clear all filters
clearAllFilters();
```

### Custom Event Handling
```vue
<template>
  <EventCard
    :event="event"
    @open-modal="handleEventDetail"
    @copy="handleEventCopy"
  />
</template>

<script setup>
const handleEventDetail = (event) => {
  // Open detailed view
  showEventDetail.value = true;
  selectedEvent.value = event;
};
</script>
```

## 🧪 Testing

### Test Framework
- **Vitest** for unit testing
- **Vue Test Utils** for component testing
- **TypeScript** support in tests

### Running Tests
```bash
# Run unit tests
npm run test
# or
bun run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
```
tests/
├── components/          # Component tests
├── composables/         # Composable tests
└── utils/              # Utility function tests
```

## 🎨 Styling

### Theme System
- **CSS Custom Properties** for dynamic theming
- **Dark/Light Mode** support
- **Responsive Design** with Tailwind CSS
- **Animation System** with smooth transitions

### Color Coding
- **Session Colors**: Automatically assigned unique colors per session
- **Application Colors**: Consistent colors for each application
- **Event Type Colors**: Visual distinction for different event types
- **Filter Status Colors**: Blue theme for filter notifications

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px - Condensed layout, touch-optimized
- **Tablet**: 768px - 1024px - Adaptive layout
- **Desktop**: > 1024px - Full feature set

### Mobile Optimizations
- **Touch Targets**: Appropriately sized for finger interaction
- **Scrollable Content**: Horizontal scroll for filter chips
- **Condensed Information**: Essential data prioritized
- **Gesture Support**: Swipe actions where appropriate

## 🔧 Development

### Code Style
- **ESLint** configuration for code quality
- **Prettier** for consistent formatting
- **TypeScript strict mode** for type safety
- **Vue 3 Composition API** best practices

### Build Optimization
- **Vite** for fast HMR and optimized builds
- **Tree Shaking** for minimal bundle size
- **Code Splitting** for lazy loading
- **Asset Optimization** with automatic compression

### Performance
- **Virtual Scrolling** for large datasets
- **Computed Properties** for efficient reactivity
- **Canvas Rendering** for high-performance visualizations
- **WebSocket Management** with automatic reconnection

## 📚 Documentation

### Component Documentation
- [Filter Notification System](../../docs/FILTER_NOTIFICATION_SYSTEM.md) - Complete documentation
- [Filter Notification Quick Reference](./docs/FILTER_NOTIFICATION_QUICK_REFERENCE.md) - Developer quick start
- [Testing Framework Guide](./docs/TESTING_FRAMEWORK_GUIDE.md)
- [UI Enhancements Guide](../../docs/UI_ENHANCEMENTS_GUIDE.md)

### API References
- [WebSocket API](../server/README.md#websocket-api)
- [Event Types](../../README.md#event-types--visualization)
- [Filter Options](../../README.md#filtering)

---

*For more information, see the [main project documentation](../../README.md).*
