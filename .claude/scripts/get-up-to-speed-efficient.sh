#!/bin/bash
# Efficient Get Up To Speed - Direct Operations Only
set -euo pipefail

PROJECT_NAME=$(basename "$PWD")
ALL_PROJECTS=false
USE_COMPLEX=false

# Check flags
if [[ "${ARGUMENTS:-}" == *"--all-projects"* ]] || [[ "${ARGUMENTS:-}" == *"--all"* ]]; then
    ALL_PROJECTS=true
fi
if [[ "${ARGUMENTS:-}" == *"--complex"* ]]; then
    USE_COMPLEX=true
fi

# If user wants complex version, delegate to original script
if [ "$USE_COMPLEX" = true ]; then
    echo "🔄 Using original complex version..."
    exec /home/bryan/setup-mcp-server.sh.APP/scripts/get-up-to-speed.sh "$@"
fi

echo "⚡ Loading context for $PROJECT_NAME (efficient mode)..."
echo ""

# Check for Redis availability
if ! command -v redis-cli >/dev/null 2>&1; then
    echo "❌ Redis not available. Reading from local files..."
    if [ -f "PROJECT_STATUS.md" ]; then
        echo "=== PROJECT_STATUS.md (First 100 lines) ==="
        head -100 PROJECT_STATUS.md
    elif [ -f "CLAUDE.md" ]; then
        echo "=== CLAUDE.md (First 100 lines) ==="
        head -100 CLAUDE.md
    else
        echo "No project files found."
    fi
    exit 0
fi

# Get recent Redis keys efficiently
if [ "$ALL_PROJECTS" = true ]; then
    echo "=== Loading ALL Projects Context ==="
    KEYS=$(redis-cli KEYS "*:*:*:*" 2>/dev/null | head -20)
else
    echo "=== Loading $PROJECT_NAME Context ==="
    # Search with fuzzy matching for project variations
    KEYS=$(redis-cli --scan --pattern "*:*:*$PROJECT_NAME*:*" 2>/dev/null | head -10)
    
    # Also check for handoff documents
    HANDOFF_KEYS=$(redis-cli --scan --pattern "handoff:project:*$PROJECT_NAME*:*" 2>/dev/null | head -5)
    if [ -n "$HANDOFF_KEYS" ]; then
        KEYS="$KEYS
$HANDOFF_KEYS"
    fi
fi

# Display Redis data if found
if [ -n "$KEYS" ]; then
    echo "$KEYS" | while read -r key; do
        [ -z "$key" ] && continue
        echo ""
        echo "📦 Key: $key"
        VALUE=$(redis-cli GET "$key" 2>/dev/null || echo "")
        if [ -n "$VALUE" ]; then
            # Handle base64 encoded data
            if [[ "$VALUE" == base64:* ]]; then
                DECODED=$(echo "${VALUE#base64:}" | base64 -d 2>/dev/null || echo "$VALUE")
                echo "$DECODED" | head -20
            else
                echo "$VALUE" | head -20
            fi
            
            # Show truncation notice if needed
            LINE_COUNT=$(echo "$VALUE" | wc -l)
            [ "$LINE_COUNT" -gt 20 ] && echo "... (showing 20 of $LINE_COUNT lines)"
        fi
    done
else
    echo "No Redis data found for $PROJECT_NAME"
fi

# Quick file check as fallback
if [ -z "$KEYS" ] && [ -f "PROJECT_STATUS.md" ]; then
    echo ""
    echo "=== PROJECT_STATUS.md (Recent Entries) ==="
    grep -A2 "## Session Export" PROJECT_STATUS.md 2>/dev/null | head -20 || head -20 PROJECT_STATUS.md
fi

echo ""
echo "✅ Context loaded successfully!"
echo "💡 Use --complex flag for AI-powered analysis if needed"