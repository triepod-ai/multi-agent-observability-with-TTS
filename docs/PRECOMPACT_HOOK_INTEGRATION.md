# PreCompact Hook Integration

## Overview

The PreCompact Hook Integration provides intelligent conversation summarization when Claude Code compacts context. It automatically generates comprehensive technical and executive summaries using the Codex Summarize utility, while providing concise text-to-speech notifications.

## Features

### 1. Automatic Summarization
- **Technical Summary**: Detailed 9-section analysis for development handoffs
- **Executive Summary**: Brief 250-word overview for stakeholders
- **Zero Token Usage**: All processing runs locally via Codex CLI

### 2. Intelligent TTS Notifications
- **Concise Messages**: 25-30 words maximum for natural speech
- **Clean Output**: Removes timestamps, version numbers, and technical metadata
- **Natural Language**: Conversational tone with key objective/outcome focus

### 3. Organized File Storage
- **Location**: `~/.claude/summaries/`
- **Naming**: `[project]_[type]_[timestamp].md`
- **Types**: technical and executive summaries
- **Persistence**: Long-term session knowledge retention

## Implementation

### Hook Script: `pre_compact.py`

The hook performs the following operations:

1. **Conversation Export**: Captures current conversation data
2. **Summary Generation**: 
   - Uses `codex-summarize.sh` for technical analysis
   - Creates executive summary for quick overview
3. **TTS Notification**: Sends brief, cleaned summary via speak command
4. **Event Logging**: Records activity in observability system

### Configuration

Added to `.claude/settings.json`:

```json
"PreCompact": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": "uv run /home/bryan/multi-agent-observability-system/.claude/hooks/pre_compact.py"
      },
      {
        "type": "command",
        "command": "uv run /home/bryan/multi-agent-observability-system/.claude/hooks/send_event.py --source-app multi-agent-observability-system --event-type PreCompact"
      }
    ]
  }
]
```

## Summary Types

### Technical Summary
Comprehensive analysis including:
- Technical Achievements
- Code Changes
- Problem Solving
- Research & Learning
- Failed Approaches
- Current Blockers
- Next Steps
- Knowledge Gaps
- Handoff Context

### Executive Summary
Business-focused overview covering:
- Objective
- Outcome
- Key Decisions
- Resources
- Timeline
- Business Impact
- Risks

## TTS Output Format

The hook intelligently extracts and formats summaries for speech:

1. **Content Extraction**: Parses objective and outcome from executive summary
2. **Cleanup**: Removes technical jargon, numbers, and formatting
3. **Format**: "Bryan, compacting context. Goal was [objective]. Achieved [outcome]"
4. **Fallback**: "Bryan, compacting context. Summary saved." for complex content

## File Structure

```
~/.claude/
├── hooks/
│   └── pre_compact.py          # Main hook implementation
├── summaries/                  # Generated summaries directory
│   ├── project_technical_*.md  # Detailed technical summaries
│   └── project_executive_*.md  # Brief executive summaries
└── logs/
    └── pre_compact.log         # Hook execution logs
```

## Dependencies

- **Codex CLI**: Required for local summarization (`npm install -g @anthropic/codex`)
- **codex-summarize.sh**: Located at `/home/bryan/setup-mcp-server.sh.APP/tests/export-codex/`
- **speak command**: Global TTS utility for voice notifications
- **Python 3.8+**: With requests library for hook execution

## Usage

The hook runs automatically when Claude Code triggers context compaction. No manual intervention required.

### Manual Testing
```bash
echo "Test conversation content" | uv run /home/bryan/multi-agent-observability-system/.claude/hooks/pre_compact.py
```

## Benefits

1. **Knowledge Preservation**: Captures session insights before context loss
2. **Team Handoffs**: Technical summaries enable smooth transitions
3. **Stakeholder Updates**: Executive summaries provide quick status
4. **Audio Awareness**: Brief TTS keeps developers informed without interruption
5. **Zero Token Cost**: Local processing preserves API tokens

## Error Handling

- **Missing Codex**: Falls back to simple notification
- **Parse Failures**: Uses generic summary format
- **TTS Errors**: Logs failure but continues operation
- **Timeout Protection**: 60s limit for technical, 45s for executive summaries

## Future Enhancements

- Support for additional summary types (lessons learned, action items)
- Integration with project management tools
- Customizable TTS voice selection per summary type
- Summary aggregation across multiple sessions
- Search functionality for historical summaries

## Related Documentation

- [Codex Summarize Documentation](/home/bryan/setup-mcp-server.sh.APP/tests/export-codex/CODEX_SUMMARIZE_DOCUMENTATION.md)
- [Enterprise TTS Integration](./ENTERPRISE_TTS_INTEGRATION.md)
- [Hooks Documentation](./HOOKS_DOCUMENTATION.md)

---

*Created: 2025-07-24*  
*Component: Multi-Agent Observability System*  
*Type: Feature Documentation*