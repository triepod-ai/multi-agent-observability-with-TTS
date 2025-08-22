#!/bin/bash
# Simple Export - Fast Redis Save
set -euo pipefail

PROJECT_NAME=$(basename "$PWD")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SESSION_ID=$(date +%Y%m%d_%H%M%S)

# Get session summary from arguments
SESSION_SUMMARY="Implemented SessionStart hook optimization: Added 'continue' matcher for claude -c that skips context loading while preserving observability. Updated session_context_loader.py and documentation. All tests passing."

echo "🚀 Simple Export for $PROJECT_NAME"
echo "📅 $TIMESTAMP"
echo ""

# Simple TTS notification
if [ "${TTS_ENABLED:-true}" = "true" ]; then
    speak "Starting simple export for $PROJECT_NAME" &
fi

# Collect basic context
WORKING_DIR=$(pwd)
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo 'unknown')
GIT_STATUS=$(git status --porcelain 2>/dev/null | wc -l)

# Create simple handoff document
HANDOFF_CONTENT="EXPORT: $PROJECT_NAME - $TIMESTAMP

## Session Summary
$SESSION_SUMMARY

## Context
- Project: $PROJECT_NAME
- Timestamp: $TIMESTAMP
- Working Directory: $WORKING_DIR  
- Git Branch: $GIT_BRANCH
- Modified Files: $GIT_STATUS

## Quick Status
$(git status --porcelain 2>/dev/null | head -10 || echo "No git changes")

---
Created by: simple export system
Retention: 30 days"

# Store to Redis
REDIS_KEY="handoff:project:$PROJECT_NAME:$SESSION_ID"
echo "💾 Saving to Redis: $REDIS_KEY"

# Try direct Redis CLI first (for compatibility with loader)
if command -v redis-cli >/dev/null 2>&1; then
    echo "💾 Storing directly in Redis..."
    
    # Use SETEX for direct storage with TTL (30 days = 2592000 seconds)
    if redis-cli SETEX "$REDIS_KEY" 2592000 "$HANDOFF_CONTENT" >/dev/null 2>&1; then
        DATA_SIZE=$(echo -n "$HANDOFF_CONTENT" | wc -c)
        echo "✅ Successfully stored in Redis"
        echo ""
        echo "📊 Export Summary:"
        echo "- Redis Key: $REDIS_KEY"
        echo "- Data Size: ${DATA_SIZE} bytes"
        echo "- TTL: 30 days"
        echo "- Type: Simple handoff"
        echo "- Status: ✅ Successfully stored"
        
        if [ "${TTS_ENABLED:-true}" = "true" ]; then
            speak "Export complete for $PROJECT_NAME - stored in Redis" &
        fi
        exit 0
    else
        echo "❌ Direct Redis storage failed"
        # Continue to file fallback below
    fi
else
    echo "⚠️ Redis CLI not available"
fi

# File fallback 
echo "💾 Saving to file: handoff_${SESSION_ID}.md"
echo "$HANDOFF_CONTENT" > "handoff_${SESSION_ID}.md"

if [ "${TTS_ENABLED:-true}" = "true" ]; then
    speak "Redis unavailable - saved to file for $PROJECT_NAME" &
fi

echo ""
echo "✅ Simple export complete!"
echo "📂 Working directory: $(pwd)"

if [ "${TTS_ENABLED:-true}" = "true" ]; then
    speak "Simple export completed for $PROJECT_NAME" &
fi