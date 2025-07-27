# Hook Migration Guide - Global to Project-Specific

This document outlines the migration from global Claude Code hooks to project-specific implementations, completed on $(date +%Y-%m-%d).

## Migration Summary

The multi-agent-observability-system is now the **source of truth** for spoken hooks and observability, with all functionality moved from global hooks to project-specific implementations that leverage the sophisticated speak command.

## What Was Changed

### Phase 1: Project Enhancement (Completed)
- **observability.py**: Stripped redundant TTS coordination (674→236 lines), delegated to speak command
- **notification.py**: Replaced complex voice selection with standardized `notify_tts()` 
- **pre_tool_use.py**: Enhanced from 4-line placeholder to full 347-line implementation
- **post_tool_use.py**: Added comprehensive error detection with TTS notifications

### Phase 2: Global Hook Cleanup (Completed)
- **Removed redundant global hooks**:
  - `~/.claude/hooks/pretool-notification.py` → moved to backup
  - `~/.claude/hooks/posttool-error-notification.py` → moved to backup
- **Updated global settings** to use speak command directly for notifications
- **Preserved useful utilities**:
  - `before-compact-export.sh` - project-agnostic conversation export
  - Documentation files for reference

## Integration Architecture

### Project-Specific Hook System
```
multi-agent-observability-system/
├── .claude/hooks/
│   ├── pre_tool_use.py      # Context-aware pre-tool notifications
│   ├── post_tool_use.py     # Error detection with TTS
│   ├── notification.py      # Permission/interaction notifications
│   └── utils/tts/
│       └── observability.py # Coordinated TTS system
└── bin/install-hooks.sh     # Project hook installer
```

### Speak Command Integration
All hooks now use the standardized `notify_tts()` function:

```python
def notify_tts(message: str, priority: str = "normal") -> bool:
    # Get engineer name for personalization
    engineer_name = os.getenv('ENGINEER_NAME', 'Developer')
    
    # Format message based on priority
    if priority == "error":
        personalized_message = f"{engineer_name}, Error: {message}"
    elif priority == "important":
        personalized_message = f"{engineer_name}, Important: {message}"
    else:
        personalized_message = f"{engineer_name}, {message}"
    
    # Use speak command (non-blocking) - let speak handle coordination
    subprocess.Popen(['speak', personalized_message], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True
```

## Benefits Achieved

1. **Single Source of Truth**: Multi-agent-observability-system contains all enhanced TTS/observability functionality
2. **Speak Command Integration**: Leverages sophisticated TTS coordination instead of duplicating functionality
3. **Cost Optimization**: 95% cost reduction through speak command's OpenAI integration
4. **Enhanced Error Detection**: Comprehensive tool-specific error patterns
5. **Project Isolation**: Each project can customize hooks without global conflicts

## Migration Impact by Project

### ✅ Multi-Agent-Observability-System
- **Status**: Complete - now the source of truth
- **Changes**: Enhanced hooks with speak integration
- **Benefits**: Full observability with coordinated TTS

### ✅ Brainpods Project  
- **Status**: Updated to use speak command directly
- **Changes**: Simplified notification system, removed redundant voice selection
- **Benefits**: Cleaner integration, leverages speak command sophistication

### ✅ Demo-CC-Agent
- **Status**: Already project-specific - no changes needed
- **Benefits**: Continues using project-specific hooks

### ✅ Other Projects
- **Status**: No hook dependencies - no changes needed
- **Benefits**: Clean separation, no global conflicts

## Installation for New Projects

To install observability hooks in a new project:

```bash
cd /path/to/new/project
/home/bryan/multi-agent-observability-system/bin/install-hooks.sh
```

The installer will:
1. Copy enhanced hooks to `.claude/hooks/`
2. Validate speak command availability  
3. Set up environment configuration
4. Detect and resolve conflicts

## Environment Configuration

Required environment variables:
```bash
export TTS_ENABLED=true
export ENGINEER_NAME="Your Name"
```

Optional optimization:
```bash
export TTS_PROVIDER=openai  # Use cost-optimized OpenAI by default
```

## Rollback Instructions

If issues occur, global settings backup is available:
```bash
cp ~/.claude/settings.json.backup-* ~/.claude/settings.json
```

Redundant hooks are backed up in:
```
~/.claude/hooks/backup-$(date +%Y%m%d)/
├── pretool-notification.py
└── posttool-error-notification.py
```

## Technical Details

### Hook Coordination
- **Pre-tool**: Context-aware notifications with MCP parsing
- **Post-tool**: Error detection with severity-based TTS
- **Notification**: Permission requests with intelligent filtering
- **Observability**: Rate limiting and coordination across hooks

### Speak Command Features Used
- **Automatic Provider Selection**: OpenAI → ElevenLabs → pyttsx3 fallback
- **Cost Optimization**: 95% savings with OpenAI integration
- **Smart Processing**: Context-aware voice selection
- **Non-blocking Execution**: Background TTS without delays

## Future Development

New projects should:
1. Use this project as the template for hook implementation
2. Install hooks via `bin/install-hooks.sh`
3. Customize `.claude/settings.json` for project-specific needs
4. Leverage speak command integration patterns

---

*Migration completed: $(date +%Y-%m-%d)*  
*Documentation: multi-agent-observability-system/docs/HOOK_MIGRATION_GUIDE.md*