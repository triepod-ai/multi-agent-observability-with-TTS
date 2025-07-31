# PreCompact to SessionStart Integration - Session Continuity System

## Overview

The PreCompact hook generates session summaries that are now automatically loaded by the SessionStart hook, creating a **continuous learning system** where each session builds on insights from previous sessions. This eliminates the "write-only" knowledge base problem where valuable summaries were generated but never utilized.

## Architecture

### Data Flow
```
Session 1: Work → PreCompact generates summaries → ~/.claude/summaries/
Session 2: SessionStart loads summaries → Context injection → Claude awareness
Session 3: Builds on Session 2's loaded context, continues the chain...
```

### Integration Points

1. **PreCompact Hook** (`pre_compact.py`)
   - Generates 4 types of summaries: analysis, executive, actions, insights
   - Saves to `~/.claude/summaries/{project}__{type}__{timestamp}.md`
   - Uses codex-session-analyzer agent or fallback systems

2. **Session Context Loader** (`session_context_loader.py`)
   - NEW: `get_recent_summaries()` function loads last 3 sessions
   - Extracts blockers, actions, insights, achievements
   - Intelligently filters and deduplicates content

3. **Context Injection**
   - Adds "Previous Session Insights" section after handoff
   - Prioritizes: Blockers > Actions > Achievements > Insights
   - Limited to preserve context space (3-5 items per category)

## Implementation Details

### Summary Loading Function
```python
def get_recent_summaries(project_name: str, max_sessions: int = 3) -> dict:
    """Load recent session summaries from ~/.claude/summaries/ for this project."""
    # Finds all summary files for the project
    # Parses timestamps from filenames
    # Groups by session (same timestamp)
    # Loads content from most recent sessions
    # Returns structured data: blockers, actions, insights, achievements
```

### Context Injection Format
```markdown
## Previous Session Insights
### ⚠️ Active Blockers
- [Blockers from recent sessions]

### 📋 Pending Actions (from recent sessions)
1. [Action items with context]

### ✅ Recent Achievements
- [What was accomplished]

### 💡 Key Insights
- [Lessons learned]
```

## File Naming Convention

PreCompact generates files with pattern:
```
{project-name}_{type}_{YYYYMMDD}_{HHMMSS}.md
```

Where type is one of:
- `analysis` - Complete session report
- `executive` - High-level summary
- `actions` - Task list with priorities
- `insights` - Lessons learned

## Content Extraction

The loader parses markdown structure to extract:
- **Actions**: Lines starting with `**Task N**:`
- **Blockers**: Lines starting with `**Blocker N**:`
- **Insights**: Bullet points under `## Key Insights`
- **Achievements**: Bullet points under `## Achievements`

## Benefits

1. **Session Continuity**: No loss of context between sessions
2. **Action Tracking**: Pending tasks automatically surface
3. **Blocker Awareness**: Critical issues remain visible
4. **Learning Accumulation**: Insights build over time
5. **Zero Manual Effort**: Fully automated pipeline

## Testing

To test the integration:
```bash
# View current summaries
ls -la ~/.claude/summaries/multi-agent-observability-system_*.md

# Test context loader
echo '{"source": "startup"}' | python3 .claude/hooks/session_context_loader.py

# Look for "Previous Session Insights" section in output
```

## Configuration

No configuration needed - the integration works automatically when:
1. PreCompact hook is enabled (generates summaries)
2. SessionStart hook uses `session_context_loader.py`
3. Summary files exist in `~/.claude/summaries/`

## Future Enhancements

- [ ] Configurable session count (currently hardcoded to 3)
- [ ] Summary archival after N days
- [ ] Cross-project insight sharing
- [ ] Priority-based action sorting
- [ ] Duplicate detection across sessions

## Related Documentation

- [PreCompact Hook Integration](./PRECOMPACT_HOOK_INTEGRATION.md)
- [Session Context Loader](../.claude/hooks/session_context_loader.py)
- [KISS Hook Architecture](./HOOKS_DOCUMENTATION.md)