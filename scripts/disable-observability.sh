#!/bin/bash

# Disable Observability Enhancements for Claude Code Hooks
# Reverts to minimal base hooks without observability dependencies
# Usage: disable-observability [options] /path/to/target/project

set -euo pipefail

# Configuration
SOURCE_DIR="/home/bryan/multi-agent-observability-system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Usage and help
show_help() {
    cat << EOF
Disable Observability Enhancements for Claude Code Hooks

USAGE:
    disable-observability [OPTIONS] <target-project-path>

OPTIONS:
    --help              Show this help message
    --verbose           Show detailed downgrade progress

DESCRIPTION:
    Reverts Claude Code hook installation to minimal base configuration:
    - Removes event streaming to observability dashboard
    - Disables TTS notifications
    - Disables Redis session context loading
    - Keeps core hook functionality (local logging only)

EXAMPLES:
    disable-observability /path/to/my-project
    disable-observability --verbose /path/to/my-project

EOF
}

# Parse command line arguments
VERBOSE=false
TARGET_PROJECT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
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

# Validate target project exists
if [ ! -d "$TARGET_PROJECT" ]; then
    echo -e "${RED}Error: Target project directory does not exist: $TARGET_PROJECT${NC}" >&2
    exit 1
fi

# Validate hooks are installed
if [ ! -d "$TARGET_PROJECT/.claude/hooks" ]; then
    echo -e "${RED}Error: Claude Code hooks not found in $TARGET_PROJECT${NC}" >&2
    echo -e "${BLUE}💡 Run install-hooks first: install-hooks $TARGET_PROJECT${NC}" >&2
    exit 1
fi

echo -e "${BLUE}🔄 Disabling observability enhancements for: ${GREEN}$PROJECT_NAME${NC}"

# Step 1: Backup current settings.json
echo -e "${BLUE}🔄 Step 1: Creating backup...${NC}"
backup_dir="$TARGET_PROJECT/.claude/backup-$(date +%Y%m%d_%H%M%S)-disable-observability"
mkdir -p "$backup_dir"
if [ -f "$TARGET_PROJECT/.claude/settings.json" ]; then
    cp "$TARGET_PROJECT/.claude/settings.json" "$backup_dir/"
    echo -e "${GREEN}  ✅ Backed up settings.json to $(basename "$backup_dir")${NC}"
fi

# Step 2: Install base settings
echo -e "${BLUE}🔧 Step 2: Installing minimal base settings...${NC}"

# Copy base settings template
cp "$SOURCE_DIR/.claude/settings.base.json" "$TARGET_PROJECT/.claude/settings.json"

# Update source-app references to project name (base template uses multi-agent-observability-system)
[ "$VERBOSE" = true ] && echo "  Updating source-app references to $PROJECT_NAME..."
sed -i "s/--source-app multi-agent-observability-system/--source-app $PROJECT_NAME/g" \
    "$TARGET_PROJECT/.claude/settings.json"

# Update hook paths to absolute paths
[ "$VERBOSE" = true ] && echo "  Converting hook paths to absolute..."
sed -i "s|/home/bryan/multi-agent-observability-system/.claude/hooks|$TARGET_PROJECT/.claude/hooks|g" \
    "$TARGET_PROJECT/.claude/settings.json"

echo -e "${GREEN}  ✅ Base settings installed${NC}"

# Step 3: Verify installation
echo -e "${BLUE}🧪 Step 3: Verifying installation...${NC}"
if command -v jq >/dev/null 2>&1; then
    if jq empty "$TARGET_PROJECT/.claude/settings.json" 2>/dev/null; then
        echo -e "${GREEN}  ✅ Settings.json is valid${NC}"

        # Check that observability-specific hooks are removed
        if ! grep -q "send_event_async.py" "$TARGET_PROJECT/.claude/settings.json"; then
            echo -e "${GREEN}  ✅ Observability event streaming disabled${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Warning: Event streaming still present in settings${NC}"
        fi

        if ! grep -q "session_context_loader.py" "$TARGET_PROJECT/.claude/settings.json"; then
            echo -e "${GREEN}  ✅ Redis context loading disabled${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Warning: Context loader still present in settings${NC}"
        fi
    else
        echo -e "${RED}  ❌ Invalid settings.json format${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}  ⚠️  jq not available - skipping validation${NC}"
fi

# Success summary
echo ""
echo -e "${GREEN}🎉 Observability enhancements disabled successfully!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "${GREEN}   ✅ Project: $PROJECT_NAME${NC}"
echo -e "${GREEN}   ✅ Mode: Minimal (standalone)${NC}"
echo -e "${GREEN}   ✅ Backup: $(basename "$backup_dir")${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo -e "${BLUE}   1. Test hooks: Run Claude Code in $PROJECT_NAME${NC}"
echo -e "${BLUE}   2. Hooks work standalone (no server required)${NC}"
echo -e "${BLUE}   3. To re-enable: Run enable-observability $TARGET_PROJECT${NC}"
echo ""
echo -e "${BLUE}📚 Features now disabled:${NC}"
echo -e "${YELLOW}   ❌ Real-time event streaming${NC}"
echo -e "${YELLOW}   ❌ TTS notifications${NC}"
echo -e "${YELLOW}   ❌ Redis session handoffs${NC}"
echo -e "${YELLOW}   ❌ Session relationship tracking${NC}"
echo ""
echo -e "${GREEN}📚 Features still active:${NC}"
echo -e "${GREEN}   ✅ Basic hook logging${NC}"
echo -e "${GREEN}   ✅ Safety checks${NC}"
echo -e "${GREEN}   ✅ Tool tracking${NC}"
