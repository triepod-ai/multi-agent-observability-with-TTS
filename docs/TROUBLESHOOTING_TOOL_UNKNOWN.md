# Troubleshooting "Tool used: unknown" Issue

## Problem Description

When using the Multi-Agent Observability System, you may see "Tool used: unknown" displayed in the UI instead of the actual tool name (like "Read", "Write", "Bash", etc.).

## Root Cause

This issue occurs when Claude Code sends tool data in a format that the hook system doesn't recognize. Different versions of Claude Code may use different field names or data structures for tool information.

## Solution (Fixed in Latest Version)

The issue has been resolved with enhanced tool name extraction logic. The system now supports multiple data formats:

### Supported Field Names

- **Primary**: `tool_name` (current Claude Code field)
- **Legacy**: `tool`, `name` (older versions)
- **Variants**: `toolName`, `tool_type`, `function_name`
- **Nested**: Checks within `payload` and `request` structures

### Debug Mode for Investigation

If you still encounter this issue, enable debug logging:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Enable debug mode
source .claude/hooks/enable_debug.sh

# Run any Claude Code command that triggers the issue
# For example:
# In Claude Code, run any command like reading a file

# Check stderr output for debug information
```

### Example Debug Output

When debug mode is enabled, you'll see output like:

```
DEBUG: Unknown tool detected.
DEBUG: Available top-level fields: ['session_id', 'payload', 'timestamp']
DEBUG: Full data structure (first 500 chars): {'session_id': 'abc123', 'payload': {'name': 'Read', 'file_path': '/some/file.txt'}, 'timestamp': 1234567890}
DEBUG: Field 'session_id' = 'abc123'
```

This information helps identify exactly how Claude Code is sending the tool data.

## Implementation Details

### Enhanced Extraction Logic

The `extract_tool_info()` function in `post_tool_use.py` now:

1. **Checks Multiple Field Names**: Iterates through all possible field names
2. **Searches Nested Structures**: Looks in `payload` and `request` objects
3. **Provides Debug Information**: Logs data structure when tool is unknown
4. **Maintains Backward Compatibility**: Works with older Claude Code versions

### Consistent Processing

The `http_client.py` file uses the same extraction logic to ensure consistency between:
- Local hook processing
- Server event summaries
- Client display

## Files Modified

- `.claude/hooks/post_tool_use.py` - Enhanced tool name extraction
- `.claude/hooks/utils/http_client.py` - Consistent summary generation
- `.claude/hooks/enable_debug.sh` - Debug mode helper script

## Testing

The fix has been tested with various data structure formats:

- ✅ Standard `tool_name` field
- ✅ Legacy `tool` field
- ✅ Alternative `name` field
- ✅ CamelCase `toolName`
- ✅ Nested in `payload`
- ✅ Nested in `request`
- ✅ Function-based tools
- ✅ Missing tool name (fallback to "unknown")

## Prevention

To prevent future occurrences:

1. **Keep Hooks Updated**: Ensure you're using the latest version of the hook scripts
2. **Monitor Claude Code Updates**: Check if new Claude Code versions change data formats
3. **Use Debug Mode**: Enable debug logging temporarily when testing new Claude Code features

## Support

If you continue to see "Tool used: unknown" after applying this fix:

1. Enable debug mode and capture the output
2. Check the debug logs for the actual data structure
3. File an issue with the debug output for further investigation

The enhanced extraction logic should handle most current and future Claude Code data formats automatically.

## Related Issues and Fixes

### Redis Handoff Retrieval

If you're experiencing issues with hook path configurations or Redis dependency retrieval, refer to our comprehensive [Redis Handoff Retrieval Fix guide](/docs/REDIS_HANDOFF_RETRIEVAL_FIX.md).

**Key Problems Addressed**:
- Hook path misconfigurations
- Dependency resolution failures
- Session context loading issues

The guide provides in-depth troubleshooting steps, prevention strategies, and testing procedures to resolve hook installation and dependency management complexities.