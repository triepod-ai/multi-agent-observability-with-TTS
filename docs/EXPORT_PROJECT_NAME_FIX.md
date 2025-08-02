# Export Project Name Detection Fix

**Issue Date**: 2025-08-02  
**Status**: ✅ RESOLVED  
**Priority**: High

## Problem Summary

The `get-up-to-speed-export` command was creating Redis keys with inconsistent project names when executed from child directories, causing the SessionStart hook to fail to retrieve handoff context.

### Root Cause
- **Export Command**: Used `PROJECT_NAME=$(basename "$PWD")` - returns current directory name
- **SessionStart Hook**: Used git root detection - returns project root directory name
- **Result**: Key mismatch when export runs from subdirectories

### Example Failure Case
```bash
# Export from apps/client/
cd /project/apps/client
/get-up-to-speed-export "session completed"
# Creates key: handoff:project:client:20250802_123456

# SessionStart hook from any location
# Searches for: handoff:project:project-name:*
# Result: Key not found, handoff context lost
```

## Solution Implemented

### 1. Updated SessionStart Hook (`session_helpers.py`)
```python
def get_project_name() -> str:
    """Get project name from git root directory, regardless of current working directory."""
    import os
    current_dir = os.getcwd()
    
    # Walk up the directory tree to find git root
    while current_dir != "/":
        if os.path.exists(os.path.join(current_dir, ".git")):
            # Found git root, return its basename
            return os.path.basename(current_dir)
        current_dir = os.path.dirname(current_dir)
    
    # Fallback: if no git root found, use current directory
    return Path.cwd().name
```

### 2. Updated Export Command (`get-up-to-speed-export.md`)
```bash
# Get context - use git root for consistent project naming
get_git_root_project_name() {
    local current_dir="$PWD"
    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/.git/config" ]] || [[ -d "$current_dir/.git" ]]; then
            basename "$current_dir"
            return 0
        fi
        current_dir=$(dirname "$current_dir")
    done
    basename "$PWD"  # fallback
}

PROJECT_NAME=$(get_git_root_project_name)
```

## Testing Results

### Test Scenarios Verified
1. ✅ Export from project root → Consistent project name
2. ✅ Export from `src/` subfolder → Consistent project name  
3. ✅ Export from `apps/client/` → Consistent project name
4. ✅ Export from `docs/` → Consistent project name
5. ✅ SessionStart hook retrieval from all locations → Success
6. ✅ End-to-end export/retrieval cycle → Working correctly

### Before Fix
```
From project root: export=project-name, hook=project-name ✅
From src/: export=src, hook=project-name ❌
From apps/client/: export=client, hook=project-name ❌
```

### After Fix
```
From project root: export=project-name, hook=project-name ✅
From src/: export=project-name, hook=project-name ✅  
From apps/client/: export=project-name, hook=project-name ✅
```

## Key Benefits

1. **Consistent Handoff Context**: Export and retrieval now use identical project naming
2. **Location Independence**: Works regardless of execution directory
3. **Backward Compatibility**: Maintains existing Redis key format
4. **Fallback Support**: Graceful handling of non-git directories
5. **Zero Configuration**: No changes needed to existing workflows

## Files Modified

### Primary Changes
- **`.claude/hooks/utils/session_helpers.py`**: Updated `get_project_name()` to use git root detection
- **`.claude/commands/get-up-to-speed-export.md`**: Added `get_git_root_project_name()` function

### Verification
- All existing handoff keys remain accessible
- New exports create properly named keys
- SessionStart hook finds both old and new format keys
- Cross-directory compatibility confirmed

## Impact Assessment

### Pre-Fix Issues
- ❌ Handoff context lost when export runs from subdirectories
- ❌ Session continuity broken in multi-directory workflows
- ❌ Inconsistent project naming across tools

### Post-Fix Benefits  
- ✅ Reliable handoff context retrieval from any directory
- ✅ Seamless session continuity across all workflows
- ✅ Consistent project naming throughout the system
- ✅ Enhanced developer experience with reliable context loading

## Validation Commands

```bash
# Test export from different locations
cd /project && /get-up-to-speed-export "test"
cd /project/src && /get-up-to-speed-export "test"  
cd /project/apps/client && /get-up-to-speed-export "test"

# Verify all create same project name pattern
redis-cli KEYS "handoff:project:project-name:*"

# Test SessionStart hook retrieval
cd /project/any/subdirectory
python3 .claude/hooks/session_context_loader.py
```

## Related Documentation

- **[HOOKS_DOCUMENTATION.md](./HOOKS_DOCUMENTATION.md)**: Complete hook system documentation
- **[PRECOMPACT_SESSION_CONTINUITY.md](./PRECOMPACT_SESSION_CONTINUITY.md)**: Session continuity integration
- **[DIRECT_AGENT_EXECUTION.md](./DIRECT_AGENT_EXECUTION.md)**: Agent execution system
- **[HOOK_TTS_INTEGRATION_REFERENCE.md](./HOOK_TTS_INTEGRATION_REFERENCE.md)**: TTS integration reference

---

**Resolution Summary**: Fixed inconsistent project naming between export command and SessionStart hook by implementing unified git root detection logic. All handoff context now transfers reliably regardless of execution directory.