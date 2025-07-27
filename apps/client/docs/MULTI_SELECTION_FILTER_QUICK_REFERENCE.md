# Multi-Selection Filter Quick Reference

## Overview
The Multi-Agent Observability System now supports selecting multiple items within each filter category, allowing you to view events from multiple sources simultaneously.

## How to Use

### Selecting Multiple Items
1. Click the filter button (🔔) in the header to open the filter panel
2. Check multiple boxes in any category:
   - **Applications**: Select multiple apps to see events from all of them
   - **Event Types**: Select multiple event types to filter by type
   - **Sessions**: Select multiple sessions to compare their activity

### Filter Logic
- **Within Categories**: OR logic - events matching ANY selected item are shown
- **Across Categories**: AND logic - events must match selections in ALL categories

### Examples

#### View Events from Multiple Apps
✅ Select: `claude-code` AND `mcp-server`  
📊 Result: Shows events from EITHER application

#### Monitor Tool Usage
✅ Select: `PreToolUse` AND `PostToolUse`  
📊 Result: Shows all tool-related events

#### Compare Sessions
✅ Select: Multiple session IDs  
📊 Result: Shows events from all selected sessions

### Visual Indicators

#### Filter Chips
- **Single Selection**: Shows the item name (e.g., "claude-code")
- **Multiple Selection**: Shows count (e.g., "3 applications")
- **Icons**: Category-specific when multiple items selected

#### Active Filters Bar
- Shows all active filters as removable chips
- Displays filter impact percentage
- Quick "Clear all" option

## Keyboard Shortcuts
- `Escape`: Close filter panel
- `Tab`: Navigate between filter categories
- `Space`: Toggle checkbox selection

## Technical Details

### Data Structure
```typescript
interface FilterState {
  sourceApps: string[];    // Multiple app selections
  sessionIds: string[];    // Multiple session selections
  eventTypes: string[];    // Multiple event type selections
  toolNames: string[];     // Multiple tool selections (UI coming soon)
  search?: string;         // Text search (single value)
}
```

### Performance
- Efficient array-based filtering with `includes()` checks
- No performance impact with reasonable selections (<100 items)
- Real-time filter application without page reload

## Tips & Tricks

1. **Quick Filter Clear**: Click the X on any filter chip to remove just that filter
2. **Combine with Search**: Use multi-selection with text search for precise filtering
3. **Save Filter Sets**: Use the "Save current" button to save frequently used filter combinations
4. **View Impact**: Check the percentage indicator to see how much data is filtered

## Common Use Cases

### Development Monitoring
- Select your app + dependencies to see full interaction flow
- Filter by error event types to focus on issues
- Combine with time-based sorting for chronological analysis

### Performance Analysis
- Select performance-related event types
- Filter by specific sessions experiencing issues
- Use with the Timeline view for visual analysis

### Multi-Agent Coordination
- Select all agent applications
- Filter by coordination event types
- Monitor inter-agent communication patterns

## Troubleshooting

### No Events Showing?
- Check if filters are too restrictive
- Try clearing filters one category at a time
- Ensure events exist matching your criteria

### Performance Issues?
- Limit selections to <50 items per category
- Use text search to narrow results
- Consider filtering by time range (coming soon)

## Future Enhancements
- Tool name filter UI in SmartFilterBar
- Time range filtering
- Saved filter presets with names
- Export filtered results