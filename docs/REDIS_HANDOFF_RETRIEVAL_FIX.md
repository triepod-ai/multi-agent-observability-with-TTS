# Redis Handoff Retrieval Fix: Resolving Hook Installation Path Issues

## Overview

### Problem Statement
During the installation of Multi-Agent Observability hooks, the `session_context_loader.py` hook was unable to retrieve Redis handoff content in target projects due to misconfigured hook paths in `settings.json`.

### Impact
- Redis handoff context retrieval failed
- Session continuity was broken
- Hooks could not load previous session context

## Root Cause Analysis

### Underlying Issues
1. **Path Mismatch**: Hook installation script copied hooks locally but left `settings.json` referencing the source directory
2. **Dependency Mapping**: UV (Universal Virtual) environments were not correctly configured for the target project
3. **Static Path References**: Hard-coded paths prevented dynamic project integration

### Diagnostic Symptoms
- Hooks pointing to `/home/bryan/multi-agent-observability-system/.claude/hooks/`
- Failed UV dependency resolution
- Inability to locate Redis connection configurations

## Technical Solution

### Key Modifications in `install-hooks.sh`

#### 1. Path Update Function: `update_hook_paths()`
```bash
update_hook_paths() {
    local target_settings="$TARGET_PROJECT/.claude/settings.json"
    
    # Replace source directory paths with target project paths
    sed -i "s|$SOURCE_DIR/.claude/hooks|$TARGET_PROJECT/.claude/hooks|g" "$target_settings"
    
    # Verify no source paths remain
    local remaining_source_paths=$(grep -c "$SOURCE_DIR/.claude/hooks" "$target_settings" 2>/dev/null || echo "0")
    if [ "$remaining_source_paths" -gt 0 ]; then
        echo -e "${RED}  ❌ Warning: $remaining_source_paths source paths still remain in settings.json${NC}"
    fi
}
```

**Key Features**:
- Dynamically replaces source directory paths
- Provides warning if any source paths remain
- Ensures hooks point to the correct project directory

#### 2. Dependency Validation: `validate_dependencies()`
```bash
validate_dependencies() {
    # Test critical dependencies with UV
    if timeout 10 uv run --with redis python3 -c "import redis; print('Redis module available')" 2>/dev/null; then
        echo -e "${GREEN}  ✅ Redis dependency validated${NC}"
    else
        echo -e "${RED}  ❌ Redis dependency failed${NC}"
        return 1
    fi
}
```

**Key Features**:
- Verifies Redis module availability
- Uses UV's `--with` flag for dependency management
- Provides clear error messaging

#### 3. Absolute Path Conversion
```bash
convert_paths_to_absolute() {
    # Python script to convert relative paths in UV commands
    # Handles different path formats and ensures absolute paths
    python3 "$TARGET_PROJECT/.claude/convert_paths_temp_script.py" "$TARGET_PROJECT"
}
```

**Key Features**:
- Converts relative paths to absolute paths
- Supports multiple path formats
- Prevents path-related execution errors

## Prevention Strategies

### 1. Dynamic Path Resolution
- Always use relative or project-root-relative paths
- Implement path resolution functions in hooks
- Use environment variables for base paths

### 2. Dependency Management
- Use UV's `--with` flag for explicit dependency management
- Validate dependencies during installation
- Provide clear error messages for missing dependencies

### 3. Configuration Validation
- Implement JSON schema validation for `settings.json`
- Add pre-execution path and dependency checks
- Use environment-specific configuration templates

## Testing Procedures

### Verification Checklist
- [ ] Hooks install successfully
- [ ] Redis handoff context loads
- [ ] Paths are converted to absolute
- [ ] Dependencies validate correctly
- [ ] No source directory references remain

### Test Script
```bash
#!/bin/bash
# Redis Handoff Retrieval Test

# Install hooks
./install-hooks.sh /path/to/test/project

# Verify hook paths
grep -q "$PROJECT_PATH/.claude/hooks" /path/to/test/project/.claude/settings.json

# Test Redis context loading
uv run --with redis python3 .claude/hooks/session_context_loader.py
```

## Troubleshooting Guide

### Common Issues
1. **Dependency Resolution Failure**
   - Ensure UV is installed: `pip install uv`
   - Check Python module availability
   - Verify `--with` flag usage

2. **Path Configuration Problems**
   - Review `settings.json`
   - Confirm absolute paths are used
   - Check file permissions

3. **Redis Connection Issues**
   - Validate Redis server configuration
   - Check network connectivity
   - Verify Redis module installation

## Observability and Logging

### Log Locations
- Installation Log: `/tmp/hook-installer-{timestamp}.log`
- Hook Execution Logs: Project-specific `.claude/logs/`

### Debugging Flags
- Use `--verbose` for detailed output
- Use `--dry-run` to preview changes
- Use `--force` to override existing configurations

## Conclusion

This fix ensures robust, flexible, and project-independent hook installation with comprehensive path and dependency management. By implementing dynamic path resolution and rigorous validation, we've significantly improved the reliability of our Multi-Agent Observability System's hook installation process.