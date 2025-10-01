#!/bin/bash

# Multi-Agent Observability Hooks Installer
# Enhanced installer with speak validation, environment setup, and conflict detection
# Usage: install-hooks [options] /path/to/target/project

set -euo pipefail

# Configuration
SOURCE_DIR="/home/bryan/multi-agent-observability-system"
SPEAK_COMMAND="/home/bryan/bin/speak-app/speak"
# Generate unique temp suffix to prevent race conditions
TEMP_SUFFIX="$(date +%s)_$$_$RANDOM"
LOG_FILE="/tmp/hook-installer-${TEMP_SUFFIX}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Enhanced error handling
handle_error() {
    local exit_code=$?
    local line_no=$1
    echo -e "${RED}❌ Error occurred on line $line_no (exit code: $exit_code)${NC}" >&2
    echo -e "${BLUE}💡 Check log file: $LOG_FILE${NC}" >&2
    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# Usage and help
show_help() {
    cat << EOF
Multi-Agent Observability Hooks Installer

USAGE:
    install-hooks [OPTIONS] <target-project-path>

OPTIONS:
    --help              Show this help message
    --force             Force installation, overwrite existing hooks
    --no-speak-check    Skip speak command validation
    --dry-run           Show what would be installed without making changes
    --verbose           Show detailed installation progress

EXAMPLES:
    install-hooks /path/to/my-project
    install-hooks --force --verbose /path/to/existing/project
    install-hooks --dry-run /path/to/test/project

FEATURES:
    ✅ Speak command validation and integration
    ✅ Environment configuration setup
    ✅ Conflict detection and resolution
    ✅ Automatic conversion to absolute paths (prevents cd issues)
    ✅ Backup of existing configurations
    ✅ Comprehensive error handling and logging

EOF
}

# Parse command line arguments
FORCE=false
NO_SPEAK_CHECK=false
DRY_RUN=false
VERBOSE=false
TARGET_PROJECT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --no-speak-check)
            NO_SPEAK_CHECK=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}" >&2
            echo "Use --help for usage information" >&2
            exit 1
            ;;
        *)
            if [ -z "$TARGET_PROJECT" ]; then
                TARGET_PROJECT="$1"
            else
                echo -e "${RED}Error: Multiple target projects specified${NC}" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$TARGET_PROJECT" ]; then
    echo -e "${RED}Error: Target project path required${NC}" >&2
    echo "Use --help for usage information" >&2
    exit 1
fi

PROJECT_NAME=$(basename "$TARGET_PROJECT")
log_message "Starting installation for project: $PROJECT_NAME"

# Validate target project exists
if [ ! -d "$TARGET_PROJECT" ]; then
    echo -e "${RED}Error: Target project directory does not exist: $TARGET_PROJECT${NC}" >&2
    exit 1
fi

# Create .claude directory if it doesn't exist
mkdir -p "$TARGET_PROJECT/.claude"

echo -e "${BLUE}🚀 Installing multi-agent observability hooks for project: ${GREEN}$PROJECT_NAME${NC}"
log_message "Target project: $TARGET_PROJECT"

# Enhanced installation steps with validation and conflict detection

# Step 1: Validate speak command integration
validate_speak_command() {
    echo -e "${BLUE}🔍 Step 1: Validating speak command integration...${NC}"
    log_message "Validating speak command"
    
    if [ "$NO_SPEAK_CHECK" = true ]; then
        echo -e "${YELLOW}⚠️  Skipping speak command validation (--no-speak-check)${NC}"
        return 0
    fi
    
    # Check if speak command exists and is accessible
    if [ ! -f "$SPEAK_COMMAND" ]; then
        echo -e "${YELLOW}⚠️  Speak command not found at expected location: $SPEAK_COMMAND${NC}"
        
        # Try to find speak in PATH
        if command -v speak >/dev/null 2>&1; then
            SPEAK_COMMAND=$(command -v speak)
            echo -e "${GREEN}✅ Found speak command in PATH: $SPEAK_COMMAND${NC}"
        else
            echo -e "${RED}❌ Speak command not available. TTS functionality will be disabled.${NC}"
            echo -e "${BLUE}💡 To enable TTS: Install speak command or use --no-speak-check${NC}"
            return 1
        fi
    fi
    
    # Test speak command functionality
    if timeout 5 "$SPEAK_COMMAND" --help >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Speak command is functional${NC}"
        log_message "Speak command validated successfully"
    else
        echo -e "${YELLOW}⚠️  Speak command found but may have issues${NC}"
        log_message "Speak command validation warning"
    fi
    
    # Check for TTS dependencies
    local tts_providers=0
    if command -v python3 >/dev/null 2>&1; then
        if python3 -c "import openai" 2>/dev/null; then
            echo -e "${GREEN}  ✅ OpenAI TTS available${NC}"
            ((tts_providers++))
        fi
        if python3 -c "import pyttsx3" 2>/dev/null; then
            echo -e "${GREEN}  ✅ pyttsx3 offline TTS available${NC}"
            ((tts_providers++))
        fi
    fi
    
    if [ $tts_providers -eq 0 ]; then
        echo -e "${YELLOW}  ⚠️  No TTS providers detected - basic functionality only${NC}"
    else
        echo -e "${GREEN}  ✅ $tts_providers TTS provider(s) available${NC}"
    fi
}

# Step 2: Detect and handle conflicts
detect_conflicts() {
    echo -e "${BLUE}🔍 Step 2: Detecting conflicts...${NC}"
    log_message "Checking for existing hooks and conflicts"
    
    local conflicts_found=false
    local existing_hooks_dir="$TARGET_PROJECT/.claude/hooks"
    local existing_settings="$TARGET_PROJECT/.claude/settings.json"
    
    # Check for existing hooks
    if [ -d "$existing_hooks_dir" ]; then
        echo -e "${YELLOW}⚠️  Existing hooks directory found${NC}"
        
        # Check for conflicting hook files
        local conflicting_files=(
            "pre_tool_use.py"
            "post_tool_use.py"
            "notification.py"
            "send_event.py"
        )
        
        for file in "${conflicting_files[@]}"; do
            if [ -f "$existing_hooks_dir/$file" ]; then
                echo -e "${YELLOW}  ⚠️  Conflicting file: $file${NC}"
                conflicts_found=true
            fi
        done
    fi
    
    # Check for existing settings.json
    if [ -f "$existing_settings" ]; then
        echo -e "${YELLOW}⚠️  Existing settings.json found${NC}"
        
        # Check if it contains hook configurations
        if grep -q "hooks" "$existing_settings" 2>/dev/null; then
            echo -e "${YELLOW}  ⚠️  Existing hook configuration detected${NC}"
            conflicts_found=true
        fi
        
        # Check for other important configurations
        if command -v jq >/dev/null 2>&1; then
            # Check for permissions
            if jq -e '.permissions' "$existing_settings" >/dev/null 2>&1; then
                echo -e "${BLUE}  ℹ️  Existing permissions configuration will be preserved${NC}"
            fi
            
            # List all top-level keys
            local existing_keys=$(jq -r 'keys[]' "$existing_settings" 2>/dev/null | grep -v "hooks" | wc -l)
            if [ "$existing_keys" -gt 0 ]; then
                echo -e "${BLUE}  ℹ️  Found $existing_keys non-hook configuration sections that will be preserved${NC}"
            fi
        fi
    fi
    
    # Handle conflicts
    if [ "$conflicts_found" = true ]; then
        if [ "$FORCE" = true ]; then
            echo -e "${GREEN}✅ Force mode enabled - will overwrite existing configurations${NC}"
            create_backup
        else
            echo -e "${RED}❌ Conflicts detected and --force not specified${NC}"
            echo -e "${BLUE}💡 Use --force to overwrite existing configurations${NC}"
            echo -e "${BLUE}💡 Use --dry-run to see what would be changed${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ No conflicts detected${NC}"
    fi
}

# Step 3: Create backup of existing configurations
create_backup() {
    local backup_dir="$TARGET_PROJECT/.claude/backup-$(date +%Y%m%d_%H%M%S)"
    echo -e "${BLUE}🔄 Step 3: Creating backup...${NC}"
    log_message "Creating backup at: $backup_dir"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would create backup at: $backup_dir${NC}"
        return 0
    fi
    
    mkdir -p "$backup_dir"
    
    # Backup existing hooks
    if [ -d "$TARGET_PROJECT/.claude/hooks" ]; then
        cp -r "$TARGET_PROJECT/.claude/hooks" "$backup_dir/"
        echo -e "${GREEN}  ✅ Hooks directory backed up${NC}"
    fi
    
    # Backup existing settings.json
    if [ -f "$TARGET_PROJECT/.claude/settings.json" ]; then
        cp "$TARGET_PROJECT/.claude/settings.json" "$backup_dir/"
        echo -e "${GREEN}  ✅ settings.json backed up${NC}"
    fi
    
    echo -e "${GREEN}✅ Backup created: $backup_dir${NC}"
}

# Step 4: Install hooks with environment setup
install_hooks() {
    echo -e "${BLUE}🔧 Step 4: Installing hooks...${NC}"
    log_message "Installing observability hooks"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would install:${NC}"
        echo "  - Copy hooks from: $SOURCE_DIR/.claude/hooks"
        echo "  - Update source-app references to: $PROJECT_NAME"
        echo "  - Configure settings.json for project"
        echo -e "${BLUE}💡 Use without --dry-run to perform actual installation${NC}"
        return 0
    fi
    
    # Copy hooks directory
    [ "$VERBOSE" = true ] && echo "  Copying hooks directory..."
    cp -r "$SOURCE_DIR/.claude/hooks" "$TARGET_PROJECT/.claude/"
    
    # Update source-app references in hook files
    [ "$VERBOSE" = true ] && echo "  Updating source-app references..."
    find "$TARGET_PROJECT/.claude/hooks" -name "*.py" -type f -exec \
        sed -i "s/--source-app multi-agent-observability-system/--source-app $PROJECT_NAME/g" {} \;
    
    # Update project references in observability.py
    if [ -f "$TARGET_PROJECT/.claude/hooks/utils/tts/observability.py" ]; then
        sed -i "s/\"project\": \"multi-agent-observability-system\"/\"project\": \"$PROJECT_NAME\"/g" \
            "$TARGET_PROJECT/.claude/hooks/utils/tts/observability.py"
    fi
    
    echo -e "${GREEN}  ✅ Hooks installed and configured${NC}"
}

# Step 5: Configure settings.json with intelligent merging
configure_settings() {
    echo -e "${BLUE}🔧 Step 5: Configuring settings.json...${NC}"
    log_message "Configuring project settings"
    
    local target_settings="$TARGET_PROJECT/.claude/settings.json"
    local source_settings="$SOURCE_DIR/.claude/settings.json"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would configure settings.json${NC}"
        return 0
    fi
    
    if [ -f "$target_settings" ]; then
        # Intelligent merging of existing settings
        [ "$VERBOSE" = true ] && echo "  Merging with existing settings.json..."
        
        # Use jq to merge settings intelligently
        if command -v jq >/dev/null 2>&1; then
            # Deep merge that preserves existing configuration while adding hooks
            # This merges the hooks section specifically, preserving other settings
            jq --slurpfile new "$source_settings" '
                . as $existing |
                $new[0] as $source |
                $existing |
                if .hooks then
                    .hooks = (.hooks + $source.hooks | 
                        to_entries | 
                        group_by(.key) | 
                        map({key: .[0].key, value: (map(.value) | add)}) | 
                        from_entries)
                else
                    .hooks = $source.hooks
                end
            ' "$target_settings" > "$target_settings.tmp.${TEMP_SUFFIX}"
            
            # Check if merge was successful
            if [ $? -eq 0 ] && jq empty "$target_settings.tmp.${TEMP_SUFFIX}" 2>/dev/null; then
                echo -e "${GREEN}  ✅ Merged hooks while preserving existing configuration${NC}"
                
                # Show what was preserved if verbose
                if [ "$VERBOSE" = true ]; then
                    echo -e "${BLUE}  📋 Preserved configuration sections:${NC}"
                    jq -r 'keys[] | select(. != "hooks")' "$target_settings" 2>/dev/null | while read key; do
                        echo -e "${GREEN}    ✅ $key${NC}"
                    done
                fi
            else
                echo -e "${YELLOW}⚠️  Complex merge failed - using fallback strategy${NC}"
                # Fallback: Preserve non-hook settings and add our hooks
                jq --slurpfile new "$source_settings" '. + {hooks: $new[0].hooks}' "$target_settings" > "$target_settings.tmp.${TEMP_SUFFIX}"
                
                # Validate fallback result
                if ! jq empty "$target_settings.tmp.${TEMP_SUFFIX}" 2>/dev/null; then
                    echo -e "${RED}  ❌ Error: Failed to merge settings files - invalid JSON generated${NC}"
                    rm -f "$target_settings.tmp.${TEMP_SUFFIX}"
                    return 1
                fi
            fi
        else
            echo -e "${YELLOW}⚠️  jq not available - will overwrite existing settings${NC}"
            echo -e "${RED}  ❌ WARNING: This will lose permissions and other custom settings!${NC}"
            echo -e "${BLUE}  💡 Install jq for intelligent merging: sudo apt-get install jq${NC}"
            
            # Ask for confirmation
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${RED}Installation aborted to preserve existing settings${NC}"
                exit 1
            fi
            cp "$source_settings" "$target_settings.tmp.${TEMP_SUFFIX}"
        fi
    else
        # Create new settings from template
        [ "$VERBOSE" = true ] && echo "  Creating new settings.json..."
        cp "$source_settings" "$target_settings.tmp.${TEMP_SUFFIX}"
    fi
    
    # Validate JSON format
    [ "$VERBOSE" = true ] && echo "  Validating JSON format..."
    if command -v jq >/dev/null 2>&1 && jq empty "$target_settings.tmp.${TEMP_SUFFIX}" 2>/dev/null; then
        mv "$target_settings.tmp.${TEMP_SUFFIX}" "$target_settings"
        echo -e "${GREEN}  ✅ Settings configured successfully${NC}"
        
        # Update source-app references in settings.json
        [ "$VERBOSE" = true ] && echo "  Updating source-app references in settings.json..."
        sed -i "s/--source-app multi-agent-observability-system/--source-app $PROJECT_NAME/g" "$target_settings"
        
        # Count how many references were updated
        local updated_count=$(grep -c -- "--source-app $PROJECT_NAME" "$target_settings" 2>/dev/null || echo "0")
        echo -e "${GREEN}  ✅ Updated $updated_count source-app references to '$PROJECT_NAME'${NC}"
    else
        rm -f "$target_settings.tmp.${TEMP_SUFFIX}"
        echo -e "${RED}  ❌ Error: Invalid JSON format generated${NC}"
        return 1
    fi
}

# Step 5.4: Update hook paths from source to target directory
update_hook_paths() {
    echo -e "${BLUE}🔧 Step 5.4: Updating hook paths to target directory...${NC}"
    log_message "Updating hook paths from source to target directory"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would update hook paths from source to target${NC}"
        return 0
    fi
    
    local target_settings="$TARGET_PROJECT/.claude/settings.json"
    
    # Update all hook paths to point to the target project directory instead of source
    [ "$VERBOSE" = true ] && echo "  Updating hook paths in settings.json..."
    
    # Count paths before update
    local paths_before=$(grep -c "$SOURCE_DIR/.claude/hooks" "$target_settings" 2>/dev/null || echo "0")
    
    # Replace source directory paths with target project paths
    sed -i "s|$SOURCE_DIR/.claude/hooks|$TARGET_PROJECT/.claude/hooks|g" "$target_settings"
    
    # Count paths after update
    local paths_after=$(grep -c "$TARGET_PROJECT/.claude/hooks" "$target_settings" 2>/dev/null || echo "0")
    local paths_updated=$((paths_after - (paths_before - paths_after)))
    
    if [ "$paths_updated" -gt 0 ]; then
        echo -e "${GREEN}  ✅ Updated $paths_updated hook paths from source to target directory${NC}"
        log_message "Successfully updated $paths_updated hook paths"
    else
        echo -e "${YELLOW}  ⚠️  No hook paths needed updating (may already be correct)${NC}"
    fi
    
    # Verify no source paths remain
    local remaining_source_paths=$(grep -c "$SOURCE_DIR/.claude/hooks" "$target_settings" 2>/dev/null || echo "0")
    if [ "$remaining_source_paths" -gt 0 ]; then
        echo -e "${RED}  ❌ Warning: $remaining_source_paths source paths still remain in settings.json${NC}"
        log_message "Warning: $remaining_source_paths source paths still remain"
    fi
}

# Step 5.5: Convert relative paths to absolute paths
convert_paths_to_absolute() {
    echo -e "${BLUE}🔧 Step 5.5: Converting paths to absolute...${NC}"
    log_message "Converting relative paths to absolute paths"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would convert relative paths to absolute paths${NC}"
        return 0
    fi
    
    local target_settings="$TARGET_PROJECT/.claude/settings.json"
    
    # Create Python script to convert paths
    cat > "$TARGET_PROJECT/.claude/convert_paths_temp_${TEMP_SUFFIX}.py" << 'EOF'
#!/usr/bin/env python3
import json
import os
import re
import sys

# Get the project directory from command line argument
project_dir = sys.argv[1]

# Read the settings.json file
settings_path = os.path.join(project_dir, '.claude', 'settings.json')
with open(settings_path, 'r') as f:
    settings = json.load(f)

# Track changes
changes = []

def convert_path_in_command(command):
    """Convert relative paths in a command to absolute paths."""
    original = command
    
    # Pattern to match common command patterns with relative paths
    patterns = [
        # uv run .claude/hooks/script.py
        (r'(uv run )(\./|(?![/~])\.claude/)([\w\-./]+)', r'\1' + project_dir + r'/\2\3'),
        # python .claude/hooks/script.py
        (r'(python[3]? )(\./|(?![/~])\.claude/)([\w\-./]+)', r'\1' + project_dir + r'/\2\3'),
        # Direct script execution ./script.py or .claude/script.py
        (r'^(\./|(?![/~])\.claude/)([\w\-./]+\.py)', project_dir + r'/\1\2'),
    ]
    
    for pattern, replacement in patterns:
        command = re.sub(pattern, replacement, command)
    
    if command != original:
        changes.append((original, command))
    
    return command

# Process all hooks
if 'hooks' in settings:
    for hook_type, hook_configs in settings['hooks'].items():
        for config in hook_configs:
            if 'hooks' in config:
                for hook in config['hooks']:
                    if 'command' in hook:
                        hook['command'] = convert_path_in_command(hook['command'])

# Write the updated settings
with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

# Report changes
print(f"Converted {len(changes)} relative paths to absolute paths")
for old, new in changes:
    print(f"  OLD: {old}")
    print(f"  NEW: {new}")
EOF
    
    # Run the conversion script
    [ "$VERBOSE" = true ] && echo "  Converting relative paths to absolute..."
    if python3 "$TARGET_PROJECT/.claude/convert_paths_temp_${TEMP_SUFFIX}.py" "$TARGET_PROJECT"; then
        echo -e "${GREEN}  ✅ Paths converted to absolute${NC}"
        log_message "Successfully converted paths to absolute"
    else
        echo -e "${YELLOW}  ⚠️  Path conversion may have had issues${NC}"
        log_message "Warning: Path conversion may have had issues"
    fi
    
    # Clean up temporary script
    rm -f "$TARGET_PROJECT/.claude/convert_paths_temp_${TEMP_SUFFIX}.py"
}

# Step 5.6: Validate UV single-file architecture
validate_uv_architecture() {
    echo -e "${BLUE}🧪 Step 5.6: Validating UV single-file architecture...${NC}"
    log_message "Validating UV single-file architecture"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would validate UV single-file architecture${NC}"
        return 0
    fi
    
    local hooks_dir="$TARGET_PROJECT/.claude/hooks"
    local valid_hooks=0
    local total_hooks=0
    
    # Check that hooks have UV single-file headers
    [ "$VERBOSE" = true ] && echo "  Checking UV single-file headers..."
    
    for hook_file in "$hooks_dir"/*.py; do
        if [ -f "$hook_file" ]; then
            total_hooks=$((total_hooks + 1))
            # Check if file has UV script header
            if head -n 5 "$hook_file" | grep -q "uv run --script"; then
                valid_hooks=$((valid_hooks + 1))
                [ "$VERBOSE" = true ] && echo -e "${GREEN}    ✅ $(basename "$hook_file")${NC}"
            else
                echo -e "${YELLOW}    ⚠️  $(basename "$hook_file") missing UV header${NC}"
            fi
        fi
    done
    
    echo -e "${GREEN}  ✅ $valid_hooks/$total_hooks hooks have UV single-file architecture${NC}"
    log_message "UV validation: $valid_hooks/$total_hooks hooks valid"
    
    if [ "$valid_hooks" -eq "$total_hooks" ]; then
        echo -e "${GREEN}  ✅ All hooks are UV single-file compatible${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Some hooks may need manual conversion${NC}"
    fi
}

# Step 5.7: Validate UV dependencies work correctly
validate_dependencies() {
    echo -e "${BLUE}🧪 Step 5.7: Validating UV dependencies...${NC}"
    log_message "Validating UV dependencies work correctly"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would validate UV dependencies${NC}"
        return 0
    fi
    
    local validation_failed=false
    
    # Change to target project directory for UV to work correctly
    pushd "$TARGET_PROJECT" > /dev/null
    
    # Test critical dependencies
    echo "  Testing critical dependencies..."
    
    # Test redis (critical for session context)
    if timeout 10 uv run --with redis python3 -c "import redis; print('  ✅ Redis module available')" 2>/dev/null; then
        echo -e "${GREEN}  ✅ Redis dependency validated${NC}"
    else
        echo -e "${RED}  ❌ Redis dependency failed - session context loading will not work${NC}"
        validation_failed=true
    fi
    
    # Test requests (critical for event tracking)
    if timeout 10 uv run --with requests python3 -c "import requests; print('  ✅ Requests module available')" 2>/dev/null; then
        echo -e "${GREEN}  ✅ Requests dependency validated${NC}"
    else
        echo -e "${RED}  ❌ Requests dependency failed - event tracking will not work${NC}"
        validation_failed=true
    fi
    
    # Test openai (optional - for TTS)
    if timeout 10 uv run --with openai python3 -c "import openai; print('  ✅ OpenAI module available')" 2>/dev/null; then
        echo -e "${GREEN}  ✅ OpenAI dependency validated (TTS will work)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  OpenAI dependency not available - TTS will use fallback providers${NC}"
    fi
    
    # Test pyttsx3 (optional - for offline TTS)
    if timeout 10 uv run --with pyttsx3 python3 -c "import pyttsx3; print('  ✅ pyttsx3 module available')" 2>/dev/null; then
        echo -e "${GREEN}  ✅ pyttsx3 dependency validated (offline TTS available)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  pyttsx3 dependency not available - offline TTS not available${NC}"
    fi
    
    # Return to original directory
    popd > /dev/null
    
    if [ "$validation_failed" = true ]; then
        echo -e "${RED}❌ Critical dependency validation failed${NC}"
        echo -e "${BLUE}💡 Ensure UV is installed and configured correctly${NC}"
        echo -e "${BLUE}💡 Try running: pip install uv${NC}"
        return 1
    else
        echo -e "${GREEN}✅ All critical dependencies validated${NC}"
    fi
}

# Step 6: Set up environment configuration
setup_environment() {
    echo -e "${BLUE}🔧 Step 6: Setting up environment...${NC}"
    log_message "Setting up environment configuration"
    
    local env_file="$TARGET_PROJECT/.env"
    local env_example="$TARGET_PROJECT/.env.example"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would create environment configuration${NC}"
        return 0
    fi
    
    # Create .env.example with recommended settings
    cat > "$env_example" << EOF
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
PROJECT_NAME=$PROJECT_NAME
EOF
    
    echo -e "${GREEN}  ✅ .env.example created${NC}"
    
    # Create .env if it doesn't exist
    if [ ! -f "$env_file" ]; then
        cp "$env_example" "$env_file"
        echo -e "${GREEN}  ✅ .env created (customize as needed)${NC}"
        echo -e "${BLUE}  💡 Edit $env_file to customize your configuration${NC}"
    else
        echo -e "${YELLOW}  ⚠️  .env already exists - not overwriting${NC}"
    fi
}

# Step 7: Validation and testing
validate_installation() {
    echo -e "${BLUE}🧪 Step 7: Validating installation...${NC}"
    log_message "Validating installation"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}📋 DRY RUN - Would validate installation${NC}"
        return 0
    fi
    
    local validation_passed=true
    
    # Check required files
    local required_files=(
        ".claude/hooks/pre_tool_use.py"
        ".claude/hooks/pre_tool_use_safety.py"
        ".claude/hooks/post_tool_use.py"
        ".claude/hooks/notification.py"
        ".claude/hooks/utils/tts/observability.py"
        ".claude/settings.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$TARGET_PROJECT/$file" ]; then
            [ "$VERBOSE" = true ] && echo -e "${GREEN}  ✅ $file${NC}"
        else
            echo -e "${RED}  ❌ Missing: $file${NC}"
            validation_passed=false
        fi
    done
    
    # Validate settings.json format
    if command -v jq >/dev/null 2>&1; then
        if jq empty "$TARGET_PROJECT/.claude/settings.json" 2>/dev/null; then
            [ "$VERBOSE" = true ] && echo -e "${GREEN}  ✅ settings.json format valid${NC}"
        else
            echo -e "${RED}  ❌ settings.json format invalid${NC}"
            validation_passed=false
        fi
        
        # Check source-app references match project name
        local wrong_refs
        wrong_refs=$(grep -c -- "--source-app multi-agent-observability-system" "$TARGET_PROJECT/.claude/settings.json" 2>/dev/null) || wrong_refs="0"
        wrong_refs=$(echo "$wrong_refs" | tr -d '\n' | sed 's/[^0-9]//g')
        [ -z "$wrong_refs" ] && wrong_refs="0"
        
        local correct_refs
        correct_refs=$(grep -c -- "--source-app $PROJECT_NAME" "$TARGET_PROJECT/.claude/settings.json" 2>/dev/null) || correct_refs="0"
        correct_refs=$(echo "$correct_refs" | tr -d '\n' | sed 's/[^0-9]//g')
        [ -z "$correct_refs" ] && correct_refs="0"
        
        if [ "$wrong_refs" -gt 0 ]; then
            echo -e "${RED}  ❌ Found $wrong_refs incorrect source-app references (still using 'multi-agent-observability-system')${NC}"
            validation_passed=false
        fi
        
        if [ "$correct_refs" -gt 0 ]; then
            [ "$VERBOSE" = true ] && echo -e "${GREEN}  ✅ Found $correct_refs correct source-app references using '$PROJECT_NAME'${NC}"
        else
            echo -e "${YELLOW}  ⚠️  No source-app references found for '$PROJECT_NAME'${NC}"
        fi
    fi
    
    # Test speak integration (if available)
    if [ "$NO_SPEAK_CHECK" = false ] && command -v "$SPEAK_COMMAND" >/dev/null 2>&1; then
        if timeout 3 "$SPEAK_COMMAND" --help >/dev/null 2>&1; then
            [ "$VERBOSE" = true ] && echo -e "${GREEN}  ✅ Speak integration functional${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Speak integration may have issues${NC}"
        fi
    fi
    
    if [ "$validation_passed" = true ]; then
        echo -e "${GREEN}✅ Installation validation passed${NC}"
    else
        echo -e "${RED}❌ Installation validation failed${NC}"
        return 1
    fi
}

# Execute installation steps
main() {
    echo -e "${BLUE}📦 Multi-Agent Observability Hooks Installation${NC}"
    echo -e "${BLUE}================================================${NC}"
    
    validate_speak_command || true  # Continue even if speak validation fails
    detect_conflicts
    install_hooks
    configure_settings
    update_hook_paths  # New: Update paths from source to target
    convert_paths_to_absolute
    validate_uv_architecture  # New: Validate UV single-file architecture
    validate_dependencies || true  # New: Validate but continue if fails
    setup_environment
    validate_installation
    
    # Success summary
    echo ""
    echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
    echo -e "${BLUE}📋 Summary:${NC}"
    echo -e "${GREEN}   ✅ Project: $PROJECT_NAME${NC}"
    echo -e "${GREEN}   ✅ Location: $TARGET_PROJECT/.claude/${NC}"
    echo -e "${GREEN}   ✅ Architecture: UV single-file (self-contained dependencies)${NC}"
    echo -e "${GREEN}   ✅ Paths: converted to absolute (directory-independent)${NC}"
    echo -e "${GREEN}   ✅ Speak integration: $([ "$NO_SPEAK_CHECK" = false ] && echo "validated" || echo "skipped")${NC}"
    echo -e "${GREEN}   ✅ Environment: configured${NC}"
    echo ""
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo -e "${BLUE}   1. Customize $TARGET_PROJECT/.env as needed${NC}"
    echo -e "${BLUE}   2. Test hooks: Run Claude Code in the project directory${NC}"
    echo -e "${BLUE}   3. Check log file: $LOG_FILE${NC}"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo -e "${BLUE}   Hook Migration Guide: $SOURCE_DIR/docs/HOOK_MIGRATION_GUIDE.md${NC}"
    echo -e "${BLUE}   Enterprise TTS Guide: $SOURCE_DIR/docs/ENTERPRISE_TTS_INTEGRATION.md${NC}"
    
    log_message "Installation completed successfully for project: $PROJECT_NAME"
}

# Run main installation
main