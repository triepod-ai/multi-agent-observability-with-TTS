#!/bin/bash

# Enable Observability Enhancements for Claude Code Hooks
# Upgrades existing hook installation to use observability features
# Usage: enable-observability [options] /path/to/target/project

set -euo pipefail

# Configuration
SOURCE_DIR="/home/bryan/multi-agent-observability-system"
OBSERVABILITY_URL="${OBSERVABILITY_URL:-http://localhost:4056}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Usage and help
show_help() {
    cat << EOF
Enable Observability Enhancements for Claude Code Hooks

USAGE:
    enable-observability [OPTIONS] <target-project-path>

OPTIONS:
    --help              Show this help message
    --force             Force upgrade even if observability server is not running
    --verbose           Show detailed upgrade progress

DESCRIPTION:
    Upgrades existing Claude Code hook installation to include:
    - Real-time event streaming to observability dashboard
    - TTS notifications for hook events
    - Redis session context loading
    - Session relationship tracking

REQUIREMENTS:
    - Claude Code hooks must already be installed (run install-hooks first)
    - Observability server running at $OBSERVABILITY_URL (optional with --force)
    - Redis server (optional, will use fallback if unavailable)

EXAMPLES:
    enable-observability /path/to/my-project
    enable-observability --force /path/to/my-project

EOF
}

# Parse command line arguments
FORCE=false
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

# Validate hooks are already installed
if [ ! -d "$TARGET_PROJECT/.claude/hooks" ]; then
    echo -e "${RED}Error: Claude Code hooks not found in $TARGET_PROJECT${NC}" >&2
    echo -e "${BLUE}💡 Run install-hooks first: install-hooks $TARGET_PROJECT${NC}" >&2
    exit 1
fi

echo -e "${BLUE}🚀 Enabling observability enhancements for: ${GREEN}$PROJECT_NAME${NC}"

# Step 1: Check observability server availability
echo -e "${BLUE}🔍 Step 1: Checking observability server...${NC}"
if timeout 3 curl -s "$OBSERVABILITY_URL/health" >/dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Observability server is running at $OBSERVABILITY_URL${NC}"
else
    if [ "$FORCE" = true ]; then
        echo -e "${YELLOW}  ⚠️  Observability server not responding (continuing with --force)${NC}"
    else
        echo -e "${RED}  ❌ Observability server not responding at $OBSERVABILITY_URL${NC}"
        echo -e "${BLUE}  💡 Start the server: $SOURCE_DIR/scripts/start-system.sh${NC}"
        echo -e "${BLUE}  💡 Or use --force to continue anyway${NC}"
        exit 1
    fi
fi

# Step 2: Backup current settings.json
echo -e "${BLUE}🔄 Step 2: Creating backup...${NC}"
backup_dir="$TARGET_PROJECT/.claude/backup-$(date +%Y%m%d_%H%M%S)-enable-observability"
mkdir -p "$backup_dir"
if [ -f "$TARGET_PROJECT/.claude/settings.json" ]; then
    cp "$TARGET_PROJECT/.claude/settings.json" "$backup_dir/"
    echo -e "${GREEN}  ✅ Backed up settings.json to $(basename "$backup_dir")${NC}"
fi

# Step 3: Install observability settings
echo -e "${BLUE}🔧 Step 3: Installing observability-enhanced settings...${NC}"

# Copy observability settings template
cp "$SOURCE_DIR/.claude/settings.observability.json" "$TARGET_PROJECT/.claude/settings.json"

# Update source-app references to project name
[ "$VERBOSE" = true ] && echo "  Updating source-app references to $PROJECT_NAME..."
sed -i "s/--source-app multi-agent-observability-system/--source-app $PROJECT_NAME/g" \
    "$TARGET_PROJECT/.claude/settings.json"

# Update hook paths to absolute paths
[ "$VERBOSE" = true ] && echo "  Converting hook paths to absolute..."
sed -i "s|/home/bryan/multi-agent-observability-system/.claude/hooks|$TARGET_PROJECT/.claude/hooks|g" \
    "$TARGET_PROJECT/.claude/settings.json"

echo -e "${GREEN}  ✅ Observability settings installed${NC}"

# Step 4: Verify installation
echo -e "${BLUE}🧪 Step 4: Verifying installation...${NC}"
required_hooks=(
    "send_event_async.py"
    "session_context_loader.py"
    "session_event_tracker.py"
)

all_present=true
for hook in "${required_hooks[@]}"; do
    if [ -f "$TARGET_PROJECT/.claude/hooks/$hook" ]; then
        [ "$VERBOSE" = true ] && echo -e "${GREEN}    ✅ $hook${NC}"
    else
        echo -e "${RED}    ❌ Missing: $hook${NC}"
        all_present=false
    fi
done

if [ "$all_present" = true ]; then
    echo -e "${GREEN}  ✅ All observability hooks present${NC}"
else
    echo -e "${RED}  ❌ Some hooks are missing - run install-hooks --with-observability${NC}"
    exit 1
fi

# Success summary
echo ""
echo -e "${GREEN}🎉 Observability enhancements enabled successfully!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "${GREEN}   ✅ Project: $PROJECT_NAME${NC}"
echo -e "${GREEN}   ✅ Mode: Observability-enhanced${NC}"
echo -e "${GREEN}   ✅ Dashboard: $OBSERVABILITY_URL${NC}"
echo -e "${GREEN}   ✅ Backup: $(basename "$backup_dir")${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo -e "${BLUE}   1. Test hooks: Run Claude Code in $PROJECT_NAME${NC}"
echo -e "${BLUE}   2. View dashboard: Open $OBSERVABILITY_URL in browser${NC}"
echo -e "${BLUE}   3. To disable: Run disable-observability $TARGET_PROJECT${NC}"
echo ""
echo -e "${BLUE}📚 Features enabled:${NC}"
echo -e "${GREEN}   ✅ Real-time event streaming${NC}"
echo -e "${GREEN}   ✅ TTS notifications${NC}"
echo -e "${GREEN}   ✅ Redis session handoffs${NC}"
echo -e "${GREEN}   ✅ Session relationship tracking${NC}"
