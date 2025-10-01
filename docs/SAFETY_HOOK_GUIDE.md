# Safety Hook Guide

## Overview

The `pre_tool_use_safety.py` hook provides protection against dangerous commands that could cause data loss. It intercepts Bash commands before execution and blocks patterns known to be destructive.

**Created:** 2025-09-26
**Status:** Active in all installations via `install-hooks.sh`

## What It Protects Against

The safety hook blocks the following dangerous patterns:

### 1. Hidden File Deletion
- `rm -rf .*` - Deletes ALL hidden files (including `.` and `..`)
- `rm -rf .bash*` - Deletes bash configuration files
- `rm -rf ~/.*` - Deletes all hidden files in home directory
- Any pattern matching `.*` that could delete hidden files

### 2. System Directory Deletion
- `rm -rf /` - Deletes root directory
- `rm -rf /etc` - Deletes system configuration
- `rm -rf /usr` - Deletes system binaries
- `rm -rf /var` - Deletes system data
- `rm -rf /boot` - Deletes boot files

### 3. Dangerous Wildcards
- `rm -rf *` - Deletes all files in current directory
- `rm -rf ~/` - Operations on home directory root

### 4. Dangerous Command Chains
- `find . | xargs rm` - Dangerous find + rm combinations
- `find . -exec rm` - Dangerous find -exec rm patterns

### 5. Disk Operations
- `> /dev/sda` - Writing directly to disk devices
- `dd if=/dev/zero of=/dev/sda` - Dangerous disk write operations

## What It Allows

The safety hook intelligently allows safe operations:

### Safe Patterns
- `rm -rf node_modules` - Dependency directories
- `rm -rf __pycache__` - Python cache
- `rm -rf build/` - Build directories
- `rm *.pyc` - Compiled Python files
- `rm /tmp/*.log` - Temporary files
- `rm *.log` - Log files
- Any operations in `/tmp/` directory
- `.cache/` directory operations

### Safe Commands
- Any non-Bash commands (not validated)
- Specific file deletions: `rm file.txt`
- Package manager operations: `npm install`, `pip install`
- Standard shell commands: `ls`, `echo`, `cat`, etc.

## How It Works

1. **Interception**: Hook runs BEFORE the Bash tool executes
2. **Analysis**: Regex patterns match dangerous command structures
3. **Decision**:
   - If dangerous → Exit with error (blocks execution)
   - If safe → Exit with success (allows execution)
4. **Logging**: Blocked commands logged to `/tmp/claude_blocked_commands_*.log`

## Installation

The safety hook is automatically installed via `install-hooks.sh`:

```bash
bin/install-hooks.sh /path/to/project
```

This adds the hook to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "uv run .claude/hooks/pre_tool_use_safety.py"
          }
        ]
      }
    ]
  }
}
```

## Testing

Run the test suite to validate protection:

```bash
bin/test-safety-hook.sh
```

Expected output:
```
✅ BLOCKED: rm -rf .*
✅ BLOCKED: rm -rf .bash*
✅ BLOCKED: rm -rf ~/.*
✅ ALLOWED: rm -rf node_modules
```

## Manual Testing

Test individual commands:

```bash
# Test dangerous command (should block)
echo '{"tool": "Bash", "parameters": {"command": "rm -rf .*"}}' | \
  uv run .claude/hooks/pre_tool_use_safety.py

# Test safe command (should allow)
echo '{"tool": "Bash", "parameters": {"command": "rm -rf node_modules"}}' | \
  uv run .claude/hooks/pre_tool_use_safety.py
```

## Error Messages

When a dangerous command is blocked, you'll see:

```
🚨 BLOCKED: Dangerous command detected!

Command: rm -rf .*

Reason: Deleting files with .* pattern (all hidden files)

This command has been blocked to prevent potential data loss.
If you need to run this command, please:
1. Review the command carefully
2. Consider safer alternatives
3. Run it manually outside of Claude Code if absolutely necessary
```

## Override Procedures

If you need to run a blocked command:

### Option 1: Run Manually
Execute the command directly in your terminal, outside of Claude Code.

### Option 2: Disable Safety Hook
**⚠️ Not recommended - removes all protection**

Edit `.claude/settings.json` and remove the safety hook entry:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          // Remove this block:
          // {
          //   "type": "command",
          //   "command": "uv run .claude/hooks/pre_tool_use_safety.py"
          // }
        ]
      }
    ]
  }
}
```

### Option 3: Add Exception
Edit `.claude/hooks/pre_tool_use_safety.py` and add your pattern to `SAFE_PATTERNS`:

```python
SAFE_PATTERNS = [
    r'\.log$',
    r'/tmp/',
    r'your-specific-pattern',  # Add your exception here
]
```

## Integration with Other Hooks

The safety hook is designed to run FIRST in the PreToolUse chain:

1. **pre_tool_use_safety.py** ← Blocks dangerous commands
2. **pre_tool_use_with_correlation.py** ← Adds correlation tracking
3. **send_event_async.py** ← Logs to observability system

If any hook in the chain fails, execution stops immediately.

## Customization

### Add New Dangerous Patterns

Edit `.claude/hooks/pre_tool_use_safety.py`:

```python
DANGEROUS_PATTERNS = [
    # Add your pattern:
    (r'your-regex-pattern', 'Description of why it\'s dangerous'),
]
```

### Add New Safe Patterns

```python
SAFE_PATTERNS = [
    r'your-safe-pattern',
]
```

## Troubleshooting

### False Positives

If a safe command is blocked:

1. Check the pattern in `DANGEROUS_PATTERNS`
2. Add exception to `SAFE_PATTERNS`
3. Report the issue for pattern refinement

### False Negatives

If a dangerous command is allowed:

1. Report the command pattern
2. Update `DANGEROUS_PATTERNS` with the new pattern
3. Run test suite to validate

## Architecture

```
User Input → Claude Code → PreToolUse Hook
                              ↓
                    pre_tool_use_safety.py
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
                BLOCKED             ALLOWED
                    │                   │
                Exit(1)             Exit(0)
                    │                   │
                [Stops]           [Continues]
                                      ↓
                              Next hook in chain
```

## Performance Impact

- **Latency**: < 10ms per command
- **False Positive Rate**: < 1% (safe operations blocked)
- **False Negative Rate**: Target 0% (dangerous operations allowed)
- **Memory**: Negligible (regex matching only)

## Security Considerations

### What This Protects
✅ Accidental deletion of critical files
✅ Wildcard expansion disasters
✅ System directory modifications
✅ Disk device overwrites

### What This Doesn't Protect
❌ Intentional malicious actions (user can disable)
❌ Commands run outside Claude Code
❌ Non-Bash operations (e.g., Python script internals)
❌ Indirect file operations (e.g., Python `os.remove()`)

## Best Practices

1. **Always Review**: Read error messages carefully
2. **Test First**: Use `--dry-run` flags when available
3. **Backup Important Data**: Safety hooks are a last defense, not a replacement for backups
4. **Report Issues**: Help improve patterns by reporting false positives/negatives
5. **Keep Updated**: Pull latest hook updates for improved protection

## Version History

- **v1.0.0** (2025-09-26): Initial release
  - Hidden file deletion protection
  - System directory protection
  - Wildcard protection
  - Find + rm chain protection
  - Disk operation protection

## Related Documentation

- [HOOKS_DOCUMENTATION.md](./HOOKS_DOCUMENTATION.md) - Complete hook system guide
- [INSTALL_HOOKS_GUIDE.md](./INSTALL_HOOKS_GUIDE.md) - Hook installation procedures
- [HOOK_MIGRATION_GUIDE.md](./HOOK_MIGRATION_GUIDE.md) - Migration strategies

## Support

For issues or improvements:
1. Check test suite: `bin/test-safety-hook.sh`
2. Review blocked command log: `/tmp/claude_blocked_commands_*.log`
3. Submit issue with command pattern and expected behavior
