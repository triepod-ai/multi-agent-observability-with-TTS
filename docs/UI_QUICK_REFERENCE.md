# Multi-Agent Observability UI - Quick Reference

## 🚀 Activity Dashboard (Top Panel)

### Live Event Stream (Left)
- Latest 5 events with emojis
- **Enhanced**: Now shows 4-5 events (256px height)
- Shows: Event type, Tool, Session, Time
- Click session to filter
- Gradient fade indicates more content

### Key Metrics (Center)
- **Events/min**: ✅ < 50, ⚠️ >= 50
- **Error Rate**: ✅ < 5%, 🚨 >= 5%  
- **Sessions**: Active count
- **Total**: 5-minute window

### Active Sessions (Right)
- Top 5 sessions by activity
- **Enhanced**: Now shows 4-5 sessions (256px height)
- 🟢 = Active (< 30s)
- Click to view session
- Activity sparkline (1 min)
- Gradient fade for overflow

## 📊 Sorting Controls

**Access**: Click filter icon (🔽) in header

### Sort By
- **Date** (default) - By timestamp
- **Application** - By source app
- **Event Type** - By hook type
- **Name** - App + event type

### Sort Order
- **↓ Latest First** (default)
- **↑ Oldest First**

## 👁️ View Modes

### ⏰ Timeline
- Visual timeline with central axis
- Zigzag event layout
- Time gap indicators
- Best for: Sequence analysis

### 📋 Cards  
- Detailed event cards
- Expandable for full payload
- Best for: Deep inspection

### 🏊 Swimlane
- Events grouped by session
- Horizontal lanes
- Best for: Session analysis

### 🔲 Grid
- Compact multi-column
- 1-4 columns responsive
- Best for: Scanning many events

### 📜 Classic
- Original list view
- Traditional layout
- Best for: Familiarity

## 🎯 Quick Actions

### Filter Events
1. Click filter icon
2. Check boxes for:
   - Applications
   - Event Types  
   - Sessions
3. Or use search bar

### View Event Details
- Click any event card
- Modal shows full details
- Navigate with prev/next

### Copy Event Data
- Click copy icon on card
- Copies full JSON payload

### Session Filtering
- Click session in dashboard
- Or use filter panel
- Filters all views

## ⌨️ Keyboard Shortcuts

- `Tab` - Navigate elements
- `Enter` - Select/expand
- `Esc` - Close modals
- `Space` - Toggle checkboxes

## 🎨 Visual Indicators

### Event Type Emojis
- 🔧 PreToolUse
- ✅ PostToolUse
- 🔔 Notification
- 🛑 Stop
- 👥 SubagentStop
- 📦 PreCompact
- 💬 UserPromptSubmit

### Session Colors
- Each session gets unique color
- Consistent across all views
- Based on session ID hash

### Status Indicators
- 🟢 Active/Online
- 🔴 Error/Critical
- 🟡 Warning
- ⚪ Inactive

## 💡 Pro Tips

1. **Monitor Health**: Keep dashboard visible, watch error rate
2. **Quick Filter**: Click sessions in dashboard for instant filtering
3. **Time Analysis**: Use Timeline view + sort by date
4. **Error Hunt**: Filter by Stop/SubagentStop events
5. **Session Deep Dive**: Swimlane view + specific session filter
6. **Pattern Recognition**: Grid view + event type filter
7. **Performance Check**: Watch events/min for load indication

## 🔧 Troubleshooting

### No Events Showing?
- Check WebSocket connection (header indicator)
- Verify filters aren't too restrictive
- Try clearing all filters

### Performance Issues?
- Switch from Timeline to Cards/Grid
- Reduce time range in filters
- Close unused browser tabs

### Can't See Details?
- Click event to open modal
- Use Cards view for inline details
- Check zoom level (Ctrl/Cmd + 0)