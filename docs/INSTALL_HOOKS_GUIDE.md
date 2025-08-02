# Install Hooks Script Documentation

## Overview

The `install-hooks.sh` script is an enterprise-grade installer for the Multi-Agent Observability System hooks. It provides automated installation, configuration, and path conversion to ensure hooks work correctly regardless of directory changes.

## Features

- ✅ **Automatic Path Conversion** - Converts relative paths to absolute paths, preventing "No such file or directory" errors
- ✅ **Project-Specific Source App Names** - Automatically updates `--source-app` to match project name for proper event grouping
- ✅ **Intelligent Configuration Merging** - Preserves existing permissions, custom settings, and hooks
- ✅ **Speak Command Integration** - Validates and integrates text-to-speech functionality
- ✅ **Conflict Detection** - Detects existing installations and requires explicit confirmation
- ✅ **Automatic Backup System** - Creates timestamped backups before any modifications
- ✅ **Environment Setup** - Generates `.env` templates with recommended settings
- ✅ **Comprehensive Validation** - Validates installation integrity and source-app references
- ✅ **Detailed Logging** - Creates detailed logs for troubleshooting

## Usage

```bash
install-hooks [OPTIONS] <target-project-path>
```

### Basic Installation

```bash
# Install hooks in a new project
install-hooks /path/to/my-project

# Install from any directory
/path/to/multi-agent-observability-system/bin/install-hooks.sh /path/to/my-project
```

### Options

| Option | Description |
|--------|-------------|
| `--help` | Show help message and usage information |
| `--force` | Force installation, overwrite existing hooks |
| `--no-speak-check` | Skip speak command validation |
| `--dry-run` | Preview changes without making modifications |
| `--verbose` | Show detailed installation progress |

### Examples

```bash
# Preview installation without making changes
install-hooks --dry-run /path/to/project

# Force reinstallation with verbose output
install-hooks --force --verbose /path/to/existing-project

# Install without speak command validation
install-hooks --no-speak-check /path/to/project

# Combine options
install-hooks --force --verbose --no-speak-check /path/to/project
```

## Installation Process

### Step 1: Speak Command Validation
- Checks if `speak` command is available
- Tests TTS provider availability (OpenAI, ElevenLabs, pyttsx3)
- Can be skipped with `--no-speak-check`

### Step 2: Conflict Detection
- Scans for existing `.claude` directory
- Checks for existing hook files
- Detects existing `settings.json` configurations
- **Identifies and reports preserved configurations**:
  - Permissions settings (Bash, Write, Read, etc.)
  - Custom settings sections
  - Existing hooks
- Shows info messages about what will be preserved
- Requires `--force` flag to proceed with conflicts

### Step 3: Backup Creation
- Creates timestamped backup directory (`.claude/backup-YYYYMMDD_HHMMSS/`)
- **Backs up before any modifications**:
  - Complete `settings.json` with all configurations
  - Existing hooks directory (if present)
  - Preserves exact state including permissions
- Only runs when conflicts exist and `--force` is used
- Skipped in `--dry-run` mode
- Backup location shown in output

### Step 4: Hook Installation
- Copies hook files from source
- Updates `source-app` references in Python files to match project name
- Configures project-specific settings

### Step 5: Settings Configuration
- Creates or updates `settings.json`
- **Intelligently merges with existing settings** (requires `jq`)
  - Preserves existing permissions configuration
  - Maintains custom settings (theme, autoSave, etc.)
  - Keeps any existing custom hooks
  - Only adds/updates observability hooks
- **Updates all `--source-app` references to match project name**
  - Changes `--source-app multi-agent-observability-system` to `--source-app <project-name>`
  - Reports number of references updated
- Validates JSON format
- Falls back to simple copy if `jq` not available (with warning)

### Step 5.5: Path Conversion (Key Feature)
- **Automatically converts all relative paths to absolute paths**
- Prevents hooks from breaking when Claude Code changes directories
- Converts paths like:
  - `uv run .claude/hooks/script.py` → `uv run /absolute/path/to/project/.claude/hooks/script.py`
- Reports all conversions made

### Step 6: Environment Setup
- Creates `.env.example` with recommended settings
- Creates `.env` if it doesn't exist
- Preserves existing `.env` files

### Step 7: Installation Validation
- Verifies all required files are present
- Validates JSON format
- **Checks source-app references**
  - Detects any remaining incorrect references (`multi-agent-observability-system`)
  - Confirms correct references using project name
  - Reports validation errors if incorrect references found
- Tests speak integration (if enabled)

## Project-Specific Source App Names

The installer automatically configures each project with its own unique `--source-app` identifier:

### Why This Matters
- **Multi-Project Monitoring** - Monitor multiple projects simultaneously in the observability dashboard
- **Visual Distinction** - Each project gets a unique color-coded badge in the UI
- **Event Filtering** - Filter and analyze events by project
- **Metrics Separation** - Track metrics per project (errors, performance, etc.)

### How It Works
1. Extracts project name from the installation path (e.g., `/home/user/brainpods` → `brainpods`)
2. Updates all `--source-app` parameters in settings.json
3. Each event is tagged with the project-specific identifier
4. UI displays project-specific badges and colors

### Example
```json
// Before (all projects use the same source-app)
"command": "uv run .claude/hooks/send_event.py --source-app multi-agent-observability-system --event-type PreToolUse"

// After (each project has unique source-app)
"command": "uv run /home/user/brainpods/.claude/hooks/send_event.py --source-app brainpods --event-type PreToolUse"
```

### UI Benefits
- **brainpods** → Shows "B" badge with unique color
- **my-web-app** → Shows "M" badge with different color
- **api-service** → Shows "A" badge with another color

## Path Conversion Details

The script includes intelligent path conversion that prevents the common issue of hooks failing when Claude Code changes directories:

### Why Path Conversion is Needed
- Scripts like `start-system.sh` use `cd` commands
- Relative paths in hooks break when the working directory changes
- Results in "No such file or directory" errors

### How It Works
1. Detects relative paths in hook commands
2. Converts them to absolute paths based on the project directory
3. Handles various command patterns:
   - `uv run .claude/hooks/script.py`
   - `python .claude/hooks/script.py`
   - Direct script execution: `./script.py`

### Example Conversion
```json
// Before
"command": "uv run .claude/hooks/pre_tool_use.py"

// After
"command": "uv run /home/user/my-project/.claude/hooks/pre_tool_use.py"
```

## Configuration Preservation

The installer intelligently handles existing configurations to preserve your settings:

### Preserved Configuration Types

1. **Permissions** - Tool access controls
   ```json
   "permissions": {
     "Bash": {
       "enabledCommands": ["pwd", "ls", "echo"],
       "disabledPrefixes": ["/etc", "/var"]
     },
     "Write": {
       "allowedDirectories": ["/tmp", "/home/user/project"]
     }
   }
   ```

2. **Custom Settings** - User preferences
   ```json
   "customSettings": {
     "theme": "dark",
     "autoSave": true,
     "language": "en"
   }
   ```

3. **Existing Hooks** - Custom hook configurations
   ```json
   "hooks": {
     "CustomHook": [{
       "matcher": "",
       "hooks": [{"type": "command", "command": "echo 'Custom'"}]
     }]
   }
   ```

### How Merging Works

- **With `jq` installed** (recommended):
  - Deep merges hook configurations
  - Preserves all non-hook settings intact
  - Adds observability hooks without removing existing ones
  - Shows what sections were preserved

- **Without `jq`**:
  - Warns about potential data loss
  - Requires explicit confirmation
  - Suggests installing `jq`: `sudo apt-get install jq`
  - Will overwrite settings if confirmed

### Example Merge Result

```json
{
  "permissions": { ... },        // ✅ Preserved
  "customSettings": { ... },     // ✅ Preserved
  "hooks": {
    "CustomHook": [ ... ],       // ✅ Preserved
    "PreToolUse": [ ... ],       // ✅ Added
    "PostToolUse": [ ... ],      // ✅ Added
    // ... other observability hooks
  }
}
```

## Conflict Resolution

### Without --force
```
❌ Conflicts detected and --force not specified
💡 Use --force to overwrite existing configurations
💡 Use --dry-run to see what would be changed
```

### With --force
1. Detects all conflicts
2. Creates timestamped backup
3. Intelligently merges configurations
4. Preserves permissions and custom settings
5. Preserves `.env` file

## Environment Configuration

The script creates an `.env.example` with:

```env
# Multi-Agent Observability System Configuration
# Copy to .env and customize for your project

# TTS Configuration
TTS_ENABLED=true
ENGINEER_NAME=Developer

# TTS Provider (openai recommended for cost optimization)
TTS_PROVIDER=openai

# OpenAI Configuration (if using OpenAI TTS)
# OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs Configuration (if using ElevenLabs TTS)
# ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Debug and Logging
TTS_DEBUG=false
SMART_TTS_ENABLED=true

# Project-specific settings
PROJECT_NAME=your-project-name
```

## Troubleshooting

### Common Issues

1. **"No such file or directory" errors**
   - Cause: Relative paths in hooks when directory changes
   - Solution: Automatically fixed by path conversion

2. **Conflicts detected**
   - Cause: Existing installation found
   - Solution: Use `--force` to overwrite or backup manually

3. **Speak command not found**
   - Cause: TTS system not installed
   - Solution: Install speak-app or use `--no-speak-check`

4. **Permission denied**
   - Cause: Insufficient permissions
   - Solution: Check file permissions or run with appropriate user

5. **Lost permissions or custom settings**
   - Cause: Installation without `jq` installed
   - Solution: Install `jq` first, or restore from backup
   - Prevention: Always use `--dry-run` first

6. **All events show as same project**
   - Cause: Source-app not updated to match project name
   - Solution: Re-run installer with latest version
   - Verification: Check `grep -- "--source-app" .claude/settings.json`

7. **Backup recovery needed**
   - Location: `.claude/backup-YYYYMMDD_HHMMSS/`
   - Contains: Original settings.json and hooks
   - Restore: `cp .claude/backup-*/settings.json .claude/settings.json`

### Log Files

Installation logs are created at:
```
/tmp/hook-installer-YYYYMMDD_HHMMSS.log
```

## Best Practices

1. **Always backup before force installing**
   - The script creates automatic backups with `--force`
   - Find backups in `.claude/backup-YYYYMMDD_HHMMSS/`

2. **Use --dry-run first**
   - Preview changes before installation
   - Especially important for existing projects

3. **Customize .env after installation**
   - Set your `ENGINEER_NAME`
   - Configure API keys if using TTS
   - Adjust project-specific settings

4. **Verify installation**
   - Check that hooks work: `echo "test" | Read test.txt`
   - Monitor the observability dashboard
   - Verify correct source-app: `grep -- "--source-app" .claude/settings.json`
   - Review installation log if issues occur

5. **Multi-Project Setup**
   - Install hooks in each project separately
   - Each project gets unique source-app identifier
   - Monitor all projects from single dashboard
   - Use filters to focus on specific projects

## Integration with CI/CD

```bash
# CI/CD installation example
install-hooks --no-speak-check --force "$CI_PROJECT_DIR"

# Docker installation
RUN /opt/observability/bin/install-hooks.sh --no-speak-check /app
```

## Security Considerations

- Hooks execute with the same permissions as Claude Code
- API keys in `.env` are not committed to version control
- Backup directories preserve permissions
- No sensitive data is logged

## Related Documentation

- [Hook Migration Guide](./HOOK_MIGRATION_GUIDE.md) - Migrating from global to project hooks
- [Enterprise TTS Integration](./ENTERPRISE_TTS_INTEGRATION.md) - Advanced TTS features
- [Multi-Agent Observability README](../README.md) - System overview
- [Redis Handoff Retrieval Fix](./REDIS_HANDOFF_RETRIEVAL_FIX.md) - Resolving hook path and dependency issues

### Dependency and Path Retrieval

If you're experiencing complex issues with hook path configurations, dependency resolution, or Redis context loading, refer to our [Redis Handoff Retrieval Fix guide](./REDIS_HANDOFF_RETRIEVAL_FIX.md). This comprehensive document provides in-depth troubleshooting steps, prevention strategies, and technical insights into resolving hook installation and dependency management complexities.