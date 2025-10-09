# Two-Tier Hook System - Quick Reference

## Overview

The hook system now has **two tiers** with clear separation of concerns:

1. **Tier 1: Base Hooks** - Minimal Claude Code hooks (standalone, no external dependencies)
2. **Tier 2: Observability-Enhanced** - Full observability with TTS, events, Redis

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Hook System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────┐    ┌───────────────────────────────┐ │
│  │   Tier 1: Base        │    │   Tier 2: Observability       │ │
│  │   (Minimal)           │    │   (Enhanced)                  │ │
│  ├───────────────────────┤    ├───────────────────────────────┤ │
│  │ ✅ Local logging      │    │ ✅ Everything in Tier 1       │ │
│  │ ✅ Safety checks      │    │ ✅ Event streaming            │ │
│  │ ✅ Tool tracking      │    │ ✅ TTS notifications          │ │
│  │ ✅ No dependencies    │    │ ✅ Redis session handoffs     │ │
│  │                       │    │ ✅ Real-time dashboard        │ │
│  └───────────────────────┘    └───────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Installation Workflows

### Option 1: Minimal Installation (Default)

```bash
# Install base hooks only
install-hooks /path/to/project

# Result: Hooks work standalone, no server required
```

### Option 2: Full Installation (With Observability)

```bash
# Install with observability from the start
install-hooks --with-observability /path/to/project

# Result: Full observability features enabled
```

### Option 3: Upgrade Later

```bash
# Start minimal
install-hooks /path/to/project

# Enable observability later
enable-observability /path/to/project

# Result: Upgraded to full observability
```

### Option 4: Downgrade

```bash
# Disable observability features
disable-observability /path/to/project

# Result: Back to minimal base hooks
```

## Configuration Files

### settings.base.json (Tier 1)
```json
{
  "hooks": {
    "PreToolUse": [{"command": "uv run pre_tool_use.py"}],
    "PostToolUse": [{"command": "uv run post_tool_use.py"}],
    "Notification": [{"command": "uv run notification.py"}],
    "Stop": [{"command": "uv run stop.py --chat"}]
  }
}
```

**Features:**
- Local file logging only
- No external dependencies
- Works offline
- No event streaming

### settings.observability.json (Tier 2)
```json
{
  "hooks": {
    "PreToolUse": [{"command": "uv run pre_tool_use.py | uv run send_event_async.py"}],
    "SessionStart": [{"command": "uv run session_context_loader.py"}],
    ...
  }
}
```

**Features:**
- Event streaming to dashboard
- TTS notifications
- Redis session handoffs
- Session relationship tracking

## Hook Behavior by Tier

| Hook | Tier 1 (Base) | Tier 2 (Observability) |
|------|---------------|------------------------|
| **PreToolUse** | Local logs | Local logs + events + TTS |
| **PostToolUse** | Local logs | Local logs + events + TTS |
| **Notification** | Local logs | Local logs + events |
| **Stop** | Local logs | Local logs + events |
| **SessionStart** | ❌ Not included | Redis handoff + TTS + events |
| **SubagentStop** | ❌ Not included | Full tracking + events |

## Scripts Reference

### install-hooks.sh (Modified)
```bash
# Default: Minimal installation
install-hooks /path/to/project

# With observability
install-hooks --with-observability /path/to/project

# Options
--force                 # Overwrite existing
--with-observability    # Install Tier 2
--dry-run              # Preview changes
--verbose              # Detailed output
```

### enable-observability.sh (New)
```bash
# Enable observability on existing installation
enable-observability /path/to/project

# Options
--force     # Skip server availability check
--verbose   # Detailed output
```

**What it does:**
1. Checks observability server is running
2. Backs up current settings.json
3. Replaces with settings.observability.json
4. Updates project name and paths

### disable-observability.sh (New)
```bash
# Revert to minimal base hooks
disable-observability /path/to/project

# Options
--verbose   # Detailed output
```

**What it does:**
1. Backs up current settings.json
2. Replaces with settings.base.json
3. Updates project name and paths
4. Keeps hooks working standalone

## Use Cases

### Use Case 1: Quick Project Setup
```bash
# New project, just want hooks working
install-hooks ~/my-new-project

# Result: Hooks active, no dependencies needed
```

### Use Case 2: Full Development Environment
```bash
# Production development with observability
install-hooks --with-observability ~/my-project

# Start observability server
cd ~/multi-agent-observability-system
./scripts/start-system.sh

# Result: Full observability dashboard available
```

### Use Case 3: Demo Mode
```bash
# Install minimal for demo
install-hooks ~/demo-project

# During demo, enable observability
enable-observability ~/demo-project

# After demo, disable to save resources
disable-observability ~/demo-project
```

### Use Case 4: Multiple Projects
```bash
# Install base on all projects
for project in ~/projects/*; do
    install-hooks "$project"
done

# Enable observability only on active projects
enable-observability ~/projects/current-work
```

## Benefits

### ✅ Separation of Concerns
- Generic hooks separate from observability implementation
- Clear upgrade/downgrade path
- No tight coupling

### ✅ Resource Efficiency
- Base mode uses minimal resources
- Enable observability only when needed
- Easy to disable when not needed

### ✅ Flexibility
- Choose the right tier for each project
- Upgrade/downgrade anytime
- No reinstallation required

### ✅ Developer Experience
- Hooks work immediately after install
- Optional enhancements when ready
- Clear documentation and workflow

## Migration Guide

### From Old System (Single Tier)
```bash
# Old way (everything coupled)
install-hooks /path/to/project  # Installed everything

# New way (choose your tier)
install-hooks /path/to/project  # Minimal by default
# OR
install-hooks --with-observability /path/to/project  # Enhanced
```

### Existing Installations
Existing installations are **not affected**. They continue to use `settings.json`.

To migrate:
```bash
# Option 1: Stay as-is (no changes needed)
# Your existing settings.json continues to work

# Option 2: Migrate to base
disable-observability /path/to/project

# Option 3: Ensure observability settings
enable-observability /path/to/project
```

## Troubleshooting

### Hooks not working after installation?
```bash
# Verify hooks exist
ls ~/.claude/hooks/

# Check settings.json format
cat ~/.claude/settings.json

# Test with verbose
install-hooks --verbose /path/to/project
```

### Observability features not working?
```bash
# Check server is running
curl http://localhost:3002/health

# Re-enable observability
enable-observability --force /path/to/project

# Check hook output
# Hooks log to ~/.claude/logs/
```

### Want to switch between tiers?
```bash
# Go to base (minimal)
disable-observability /path/to/project

# Go to enhanced (observability)
enable-observability /path/to/project

# Both commands backup your current settings
```

## Implementation Details

### Files Created
- `.claude/settings.base.json` - Tier 1 template
- `.claude/settings.observability.json` - Tier 2 template
- `scripts/enable-observability.sh` - Upgrade script (symlinked to ~/bin/enable-observability)
- `scripts/disable-observability.sh` - Downgrade script (symlinked to ~/bin/disable-observability)

### Files Modified
- `bin/install-hooks.sh` - Added --with-observability flag

### Files Unchanged
- All hook .py files (already have graceful degradation)
- Existing settings.json (preserved)

## Future Enhancements

Potential future improvements:
- [ ] Auto-detect if observability server is running
- [ ] Hybrid mode (some features enabled, others disabled)
- [ ] Per-hook enable/disable controls
- [ ] Configuration profiles (dev, prod, demo)
- [ ] Integration with CI/CD pipelines

## Summary

The two-tier system provides:

✅ **Minimal by default** - Works immediately, no setup
✅ **Enhanced when needed** - Full observability optional
✅ **Easy switching** - Upgrade/downgrade anytime
✅ **No breaking changes** - Existing installations continue working
✅ **Clear separation** - Generic hooks vs. observability enhancements

**Bottom Line:** Hooks now work without observability, but are enhanced when you enable it.
