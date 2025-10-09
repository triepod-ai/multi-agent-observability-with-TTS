# Global Commands Reference

## Overview

Three globally accessible commands for managing Claude Code hooks across all projects:

```bash
install-hooks [options] <project-path>
enable-observability <project-path>
disable-observability <project-path>
```

## Setup

### Symlink Locations
```bash
~/bin/install-hooks -> /home/bryan/multi-agent-observability-system/bin/install-hooks.sh
~/bin/enable-observability -> /home/bryan/multi-agent-observability-system/scripts/enable-observability.sh
~/bin/disable-observability -> /home/bryan/multi-agent-observability-system/scripts/disable-observability.sh
```

### PATH Configuration
Add to `~/.bashrc` (already configured):
```bash
export PATH="$HOME/bin:$PATH"
```

After adding, reload:
```bash
source ~/.bashrc
```

## Commands

### 1. install-hooks

Install Claude Code hooks in any project. Supports both base (minimal) and observability (enhanced) tiers.

#### Usage
```bash
# Basic installation (minimal tier - local logs only)
install-hooks /path/to/project

# With observability (enhanced tier - events, TTS, Redis)
install-hooks --with-observability /path/to/project

# Force reinstallation
install-hooks --force /path/to/project

# Verbose output
install-hooks --verbose /path/to/project
```

#### What It Does
- Installs Claude Code hooks (PreToolUse, PostToolUse, Stop, etc.)
- Configures `.claude/settings.json`
- Sets up project-specific paths
- Manages UV dependencies automatically
- Creates backup of existing settings

#### Options
- `--with-observability` - Install with full observability features
- `--force` - Overwrite existing installation
- `--verbose` - Show detailed output
- `--help` - Display help message

#### Examples
```bash
# Install minimal hooks in current project
cd ~/my-project
install-hooks .

# Install full observability in another project
install-hooks --with-observability ~/other-project

# Reinstall hooks (force)
install-hooks --force ~/my-project
```

### 2. enable-observability

Upgrade an existing minimal installation to full observability tier.

#### Usage
```bash
enable-observability /path/to/project
```

#### What It Does
- Validates observability server is running
- Creates backup of current settings
- Switches from base to observability template
- Adds event streaming, TTS, Redis features
- Preserves existing project-specific configuration

#### Server Validation
Checks that observability server is accessible at:
- Default: `http://localhost:4056`
- Custom: Set `OBSERVABILITY_SERVER_URL` environment variable

#### Safety Features
- Automatic backup: `.claude/settings.json.backup.TIMESTAMP`
- Rollback support if upgrade fails
- Non-destructive (base hooks still work)

#### Examples
```bash
# Upgrade current project
cd ~/my-project
enable-observability .

# Upgrade another project
enable-observability ~/other-project

# With custom server URL
OBSERVABILITY_SERVER_URL=http://localhost:3000 enable-observability ~/my-project
```

### 3. disable-observability

Downgrade from observability tier to minimal base tier.

#### Usage
```bash
disable-observability /path/to/project
```

#### What It Does
- Creates backup of observability settings
- Switches from observability to base template
- Removes event streaming, TTS, Redis features
- Keeps core hooks (local logging only)
- Preserves project-specific paths

#### When To Use
- Observability server unavailable
- Want lightweight local-only hooks
- Debugging hook issues
- Temporarily disable features

#### Safety Features
- Automatic backup: `.claude/settings.json.backup.TIMESTAMP`
- Easy re-enable with `enable-observability`
- No data loss (backups preserved)

#### Examples
```bash
# Downgrade current project
cd ~/my-project
disable-observability .

# Downgrade another project
disable-observability ~/other-project
```

## Two-Tier Architecture

### Tier 1: Base (Minimal)
```bash
install-hooks /path/to/project
# OR
disable-observability /path/to/project
```

**Features**:
- Local logging only
- No external dependencies
- Standalone operation
- Basic hooks: PreToolUse, PostToolUse, Stop, UserPromptSubmit, SessionEnd

**Use Cases**:
- Lightweight projects
- No observability server
- Development testing
- Minimal overhead

### Tier 2: Observability (Enhanced)
```bash
install-hooks --with-observability /path/to/project
# OR
enable-observability /path/to/project
```

**Features**:
- Full event streaming
- TTS notifications
- Redis session handoffs
- Dashboard integration
- Enhanced hooks: All base + SessionStart, SubagentStop, PreCompact

**Use Cases**:
- Production projects
- Multi-agent systems
- Team collaboration
- Performance monitoring

## Quick Workflows

### New Project Setup (Minimal)
```bash
cd ~/new-project
install-hooks .
```

### New Project Setup (Full Observability)
```bash
cd ~/new-project
install-hooks --with-observability .
```

### Upgrade Existing Project
```bash
cd ~/existing-project
enable-observability .
```

### Temporary Disable Observability
```bash
cd ~/my-project
disable-observability .
# ... work without observability ...
enable-observability .
```

### Reinstall Hooks (Clean Install)
```bash
cd ~/my-project
install-hooks --force .
```

## Verification

### Check Installation
```bash
cd /path/to/project
cat .claude/settings.json | jq '.hooks | keys'
```

### Check Active Tier
```bash
cd /path/to/project
# Base tier: No send_event_async.py pipes
# Observability tier: Has send_event_async.py pipes
grep "send_event_async" .claude/settings.json
```

### Test Hooks
```bash
cd /path/to/project
# Check if hooks are executable
ls -la .claude/hooks/*.py

# Test a hook manually
echo '{}' | uv run .claude/hooks/pre_tool_use.py
```

## Troubleshooting

### Command Not Found
```bash
# Check PATH
echo $PATH | grep "$HOME/bin"

# If not in PATH, reload bashrc
source ~/.bashrc

# Verify symlinks
ls -la ~/bin/ | grep -E "(install-hooks|observability)"
```

### Server Connection Failed (enable-observability)
```bash
# Check server is running
curl http://localhost:4056/health

# Start observability server
cd ~/multi-agent-observability-system
./scripts/start-system.sh

# Use custom server URL
OBSERVABILITY_SERVER_URL=http://localhost:3000 enable-observability .
```

### Backup Restoration
```bash
cd /path/to/project

# List backups
ls -la .claude/settings.json.backup.*

# Restore latest backup
cp .claude/settings.json.backup.TIMESTAMP .claude/settings.json
```

### Hook Execution Errors
```bash
# Check UV is installed
uv --version

# Test hook manually with verbose output
echo '{}' | uv run .claude/hooks/pre_tool_use.py 2>&1

# Check dependencies
cat .claude/hooks/pyproject.toml
```

## Related Documentation

- [TWO_TIER_HOOK_SYSTEM.md](./TWO_TIER_HOOK_SYSTEM.md) - Architecture details
- [INSTALL_HOOKS_GUIDE.md](./INSTALL_HOOKS_GUIDE.md) - Installation guide
- [HOOKS_DOCUMENTATION.md](./HOOKS_DOCUMENTATION.md) - Hook reference
- [SESSIONEND_HOOK_RESTORATION.md](./SESSIONEND_HOOK_RESTORATION.md) - SessionEnd implementation

## Summary

Three simple commands manage your entire hook ecosystem:

1. **install-hooks** - Initial setup (minimal or full)
2. **enable-observability** - Upgrade to observability
3. **disable-observability** - Downgrade to minimal

All commands:
- ✅ Work from any directory
- ✅ Support any project path
- ✅ Automatic backups
- ✅ Safe and reversible
- ✅ Zero configuration needed

**Status**: Production Ready
**Date**: 2025-10-09
**Location**: `~/bin/`
