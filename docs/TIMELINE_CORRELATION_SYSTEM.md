# Timeline Correlation System - Complete Implementation Guide

**Comprehensive documentation for the Timeline View correlation system, event grouping strategy, and tool event pairing enhancements** ⭐⭐⭐ (Created: 2025-09-26)

## Overview

The Timeline Correlation System provides intelligent event grouping and visual pairing for the Multi-Agent Observability System's Timeline View. This system resolves critical issues with event correlation display and introduces sophisticated tool event pairing for improved workflow visualization.

### Key Features

- **Session-First Grouping**: Consistent event organization using session_id as primary grouping key
- **Tool Event Pairing**: Visual correlation of PreToolUse/PostToolUse events with matching correlation_ids
- **Modal Display Fix**: Eliminates confusion from mixed correlation_id/session_id grouping
- **Enhanced Timeline UI**: Connected tool execution flows with visual arrows and color coding

## Problem Statement

### Previous Issues

**1. Mixed ID Grouping Confusion**
```typescript
// PROBLEMATIC: Mixed grouping logic
const groupKey = event.correlation_id || event.session_id;
```
- Events with different ID types appeared in same modal
- Inconsistent grouping led to fragmented session views
- User confusion about which events belonged together

**2. Isolated Tool Events**
- PreToolUse and PostToolUse events displayed individually
- No visual indication of tool execution flow
- Difficult to understand complete tool operations

**3. Poor Correlation Visualization**
- correlation_id data was lost or misused for grouping
- No clear way to track related events across tool usage
- Timeline lacked workflow context

## Solution Architecture

### 1. Session-First Grouping Strategy

**Core Principle**: Use session_id as the primary grouping mechanism while preserving correlation_id as metadata for specialized operations.

#### Implementation
```typescript
// TimelineView.vue - Updated grouping logic
const groupedEvents = computed((): EventGroup[] => {
  const sessionGroups = new Map<string, HookEvent[]>();

  props.events.forEach(event => {
    // ALWAYS use session_id for grouping - correlation_id is just metadata
    const groupKey = event.session_id;
    if (!sessionGroups.has(groupKey)) {
      sessionGroups.set(groupKey, []);
    }
    sessionGroups.get(groupKey)!.push(event);
  });

  // Process groups for tool pairing and agent detection
  // ...
});
```

#### Benefits
- **Consistent Grouping**: All events in a session appear together
- **Clear Session Boundaries**: No mixing of different sessions in modals
- **Preserved Metadata**: correlation_id available for specialized pairing logic
- **Predictable Behavior**: Users always see complete session context

### 2. Tool Event Pairing System

**Core Concept**: Visually connect PreToolUse and PostToolUse events that share the same correlation_id to show complete tool execution flows.

#### Pairing Detection Algorithm
```typescript
function groupToolEventPairs(events: HookEvent[]): HookEvent[] {
  const result: HookEvent[] = [];
  const correlationMap = new Map<string, HookEvent[]>();

  // Group events by correlation_id
  events.forEach(event => {
    if (event.correlation_id &&
        (event.hook_event_type === 'PreToolUse' || event.hook_event_type === 'PostToolUse')) {
      if (!correlationMap.has(event.correlation_id)) {
        correlationMap.set(event.correlation_id, []);
      }
      correlationMap.get(event.correlation_id)!.push(event);
    } else {
      // Non-tool events go directly to result
      result.push(event);
    }
  });

  // Process correlated tool pairs
  correlationMap.forEach((correlatedEvents, correlationId) => {
    if (correlatedEvents.length === 2) {
      // Perfect pair - sort by timestamp and add together
      correlatedEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      result.push(...correlatedEvents);
    } else {
      // Unpaired events - add individually
      result.push(...correlatedEvents);
    }
  });

  return result.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}
```

#### Pair Group Creation
```typescript
// Process tool pairs for non-agent sessions
for (let i = 0; i < processedEvents.length; i++) {
  const event = processedEvents[i];
  const nextEvent = processedEvents[i + 1];

  // Check if this is a PreToolUse with matching PostToolUse
  if (event.hook_event_type === 'PreToolUse' &&
      nextEvent?.hook_event_type === 'PostToolUse' &&
      event.correlation_id === nextEvent.correlation_id) {
    // Create tool pair group
    groups.push({
      isAgent: false,
      sessionId: groupKey,
      events: [event, nextEvent],
      isToolPair: true,
      correlationId: event.correlation_id
    });
    i++; // Skip the next event since we processed it as part of the pair
  } else {
    // Individual event
    groups.push({
      isAgent: false,
      sessionId: groupKey,
      events: [event]
    });
  }
}
```

### 3. Enhanced Visual Implementation

#### Tool Pair Container
```vue
<!-- Tool Pair Container -->
<div v-if="group.isToolPair" class="relative mb-8 p-4 bg-gray-800/30 rounded-lg border border-blue-500/30">
  <div class="text-xs text-blue-400 mb-2 font-semibold">
    🔗 Tool Execution Pair ({{ group.correlationId?.substring(0, 8) }})
  </div>

  <div class="flex items-center gap-4">
    <!-- PreToolUse Event -->
    <div class="flex-1">
      <div class="text-xs text-green-400 mb-1">📤 Pre-execution</div>
      <event-card
        :event="group.events[0]"
        :is-timeline-view="true"
        class="border-green-500/30"
      />
    </div>

    <!-- Connection Arrow -->
    <div class="px-4">
      <div class="flex items-center">
        <div class="w-8 h-0.5 bg-blue-500/50"></div>
        <div class="text-blue-400 mx-2">▶</div>
        <div class="w-8 h-0.5 bg-blue-500/50"></div>
      </div>
    </div>

    <!-- PostToolUse Event -->
    <div class="flex-1">
      <div class="text-xs text-red-400 mb-1">📥 Post-execution</div>
      <event-card
        :event="group.events[1]"
        :is-timeline-view="true"
        class="border-red-500/30"
      />
    </div>
  </div>
</div>
```

#### Visual Design Elements

**Color Coding System**:
- **Container**: Blue border (`border-blue-500/30`) with gray background
- **Pre-execution**: Green accent (`text-green-400`, `border-green-500/30`)
- **Post-execution**: Red accent (`text-red-400`, `border-red-500/30`)
- **Connection**: Blue arrow and lines (`text-blue-400`, `bg-blue-500/50`)

**Layout Structure**:
- **Side-by-side**: Equal width flex containers for pre/post events
- **Central Arrow**: Visual flow indicator between events
- **Correlation ID**: Truncated display (first 8 characters) for identification
- **Event Cards**: Reused EventCard component with timeline-specific styling

## Interface Definitions

### EventGroup Interface
```typescript
interface EventGroup {
  isAgent: boolean;
  sessionId: string;        // Always session_id for consistent grouping
  agentName?: string;
  agentType?: string;
  duration?: number;
  events: HookEvent[];
  isToolPair?: boolean;     // NEW: Indicates tool event pairing
  correlationId?: string;   // NEW: Preserved for pairing logic
}
```

### Tool Pairing Logic Flow
```typescript
// 1. Group all events by session_id
Map<sessionId, HookEvent[]>

// 2. For each session group:
//    - Detect agent sessions vs regular sessions
//    - Apply tool event pairing logic
//    - Create appropriate EventGroup objects

// 3. Tool pairing within session:
//    - Extract PreToolUse/PostToolUse events
//    - Group by correlation_id
//    - Create pairs when correlation_id matches
//    - Handle unpaired events individually

// 4. Render with appropriate visual treatment:
//    - Tool pairs: Special container with arrow
//    - Individual events: Standard timeline cards
//    - Agent groups: Collapsed/expandable containers
```

## Component Integration

### TimelineView.vue Changes

**Key Updates**:
1. **Consistent Grouping**: `const groupKey = event.session_id;`
2. **Tool Pair Detection**: `groupToolEventPairs()` function
3. **Enhanced Interface**: Added `isToolPair` and `correlationId` to EventGroup
4. **Visual Rendering**: Conditional rendering for tool pairs vs individual events

**Import Requirements**:
```typescript
import EventCard from './EventCard.vue'; // Added for tool pair rendering
```

### EventCard.vue Integration

**Timeline-Specific Props**:
```typescript
// EventCard accepts timeline-specific styling
<event-card
  :event="event"
  :is-timeline-view="true"
  class="border-green-500/30"  // Custom border for tool pairing
/>
```

## Data Flow Architecture

### 1. Event Ingestion
```
WebSocket Events → TimelineView.vue → groupedEvents computed property
```

### 2. Grouping Pipeline
```
Raw Events → Session Grouping → Tool Pair Detection → Agent Classification → Visual Rendering
```

### 3. Rendering Decision Tree
```
For each EventGroup:
├── isAgent === true
│   └── Render as collapsible agent container
├── isToolPair === true
│   └── Render as connected tool pair with arrow
└── Default
    └── Render as individual timeline events
```

## Performance Considerations

### 1. Grouping Efficiency
- **O(n)** session grouping using Map operations
- **O(n)** tool pairing with single pass correlation mapping
- **O(n log n)** final sorting by timestamp

### 2. Memory Usage
- Minimal overhead from additional EventGroup properties
- Efficient correlation mapping with cleanup after processing
- No duplication of event data

### 3. Rendering Performance
- Conditional rendering reduces DOM complexity
- EventCard reuse maintains component efficiency
- CSS-only visual effects (no JavaScript animations)

## Error Handling & Edge Cases

### 1. Missing correlation_id
```typescript
// Graceful handling of events without correlation_id
if (event.correlation_id &&
    (event.hook_event_type === 'PreToolUse' || event.hook_event_type === 'PostToolUse')) {
  // Process for pairing
} else {
  // Add to result as individual event
  result.push(event);
}
```

### 2. Unpaired Tool Events
```typescript
// Handle orphaned PreToolUse or PostToolUse events
correlationMap.forEach((correlatedEvents, correlationId) => {
  if (correlatedEvents.length === 2) {
    // Perfect pair
    result.push(...correlatedEvents);
  } else {
    // Unpaired events - add individually
    result.push(...correlatedEvents);
  }
});
```

### 3. Session Boundary Violations
- Tool pairs are only created within the same session
- Cross-session correlation_ids are ignored for pairing
- Maintains session integrity while preserving correlation metadata

## Usage Examples

### 1. Basic Tool Execution Flow
```
Session: claude-code_session_123
├── Event 1: PreToolUse (correlation_id: abc-123)
├── Event 2: PostToolUse (correlation_id: abc-123)
└── Rendered as: Tool Execution Pair with visual arrow
```

### 2. Mixed Event Session
```
Session: claude-code_session_456
├── Event 1: UserPromptSubmit
├── Event 2: PreToolUse (correlation_id: def-456)
├── Event 3: PostToolUse (correlation_id: def-456)
├── Event 4: SubagentStart
└── Rendered as:
    ├── Individual: UserPromptSubmit
    ├── Tool Pair: PreToolUse ▶ PostToolUse
    └── Individual: SubagentStart
```

### 3. Agent Session with Tools
```
Session: claude-code_session_789 (Agent Session)
├── All events grouped under agent container
├── Tool pairs preserved within agent context
└── Rendered as: Collapsible agent group with internal tool pairs
```

## Troubleshooting Guide

### Issue: Tool Pairs Not Forming
**Symptoms**: PreToolUse and PostToolUse events appear individually
**Diagnosis**:
1. Check if both events have matching `correlation_id`
2. Verify events are in same session (`session_id`)
3. Confirm events are consecutive in processed array

**Resolution**:
```typescript
console.log('Event correlation_ids:', {
  pre: preEvent.correlation_id,
  post: postEvent.correlation_id,
  match: preEvent.correlation_id === postEvent.correlation_id
});
```

### Issue: Session Grouping Problems
**Symptoms**: Events from different sessions appearing together
**Diagnosis**: Check grouping key logic
**Resolution**: Ensure `const groupKey = event.session_id;` is used consistently

### Issue: Visual Styling Problems
**Symptoms**: Tool pairs missing arrow or color coding
**Diagnosis**: Check CSS class application and EventCard integration
**Resolution**: Verify `isToolPair` flag and conditional rendering logic

## Migration Guide

### From Previous Implementation
1. **Remove Mixed Grouping**: Replace `event.correlation_id || event.session_id` with `event.session_id`
2. **Add Tool Pairing**: Integrate `groupToolEventPairs()` function
3. **Update Interface**: Add `isToolPair` and `correlationId` to EventGroup
4. **Enhance Template**: Add tool pair rendering logic
5. **Import EventCard**: Add import for EventCard component

### Testing Checklist
- [ ] Events group consistently by session_id
- [ ] Tool pairs form when correlation_ids match
- [ ] Visual arrows appear between paired events
- [ ] Individual events render normally
- [ ] Agent sessions still function correctly
- [ ] Modal displays show correct session information

## Future Enhancements

### 1. Advanced Correlation Patterns
- **Multi-tool Workflows**: Chain multiple correlation_ids
- **Branching Correlations**: Handle tool calls that spawn multiple tools
- **Cross-session Correlation**: Track correlation_ids across session boundaries

### 2. Enhanced Visualizations
- **Timing Diagrams**: Show execution duration between paired events
- **Performance Overlays**: Display token usage and execution time
- **Interactive Exploration**: Click to expand tool pair details

### 3. Analytical Features
- **Correlation Analytics**: Track most common tool pairing patterns
- **Performance Correlation**: Analyze tool pair execution times
- **Error Correlation**: Identify failed tool pair patterns

## Summary

The Timeline Correlation System provides a robust foundation for visualizing complex event relationships in the Multi-Agent Observability System. The session-first grouping strategy ensures consistent data organization while the tool event pairing system offers intuitive workflow visualization.

**Key Achievements**:
- ✅ Consistent session-based event grouping
- ✅ Visual tool execution flow with paired events
- ✅ Preserved correlation metadata for specialized operations
- ✅ Enhanced timeline UI with clear workflow indicators
- ✅ Robust error handling for edge cases
- ✅ Performance-optimized implementation

**System Benefits**:
- **Improved UX**: Clear visual representation of tool execution flows
- **Better Debugging**: Easy identification of tool operation pairs
- **Consistent Behavior**: Predictable grouping and display logic
- **Enhanced Monitoring**: Complete workflow visibility in timeline view
- **Developer Experience**: Clear correlation system architecture and APIs

The implementation successfully resolves critical correlation display issues while introducing sophisticated visualization features that significantly improve the observability system's utility for monitoring complex multi-agent workflows.