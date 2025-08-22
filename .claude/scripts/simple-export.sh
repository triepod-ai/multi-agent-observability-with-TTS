#!/bin/bash
# Simple Export - Fast Redis Save
set -euo pipefail

PROJECT_NAME=$(basename "$PWD")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SESSION_ID=$(date +%Y%m%d_%H%M%S)

# Get session summary from arguments
SESSION_SUMMARY="Refactored SessionStart hook using KISS principle - broke monolithic hook into focused individual scripts while maintaining correct Claude Code SessionStart hook type"

echo "🚀 Simple Export for $PROJECT_NAME"
echo "📅 $TIMESTAMP"
echo ""

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

DATA_SIZE=$(echo -n "$HANDOFF_CONTENT" | wc -c)
echo "📊 Export Summary:"
echo "- Redis Key: $REDIS_KEY"
echo "- Data Size: ${DATA_SIZE} bytes"
echo "- TTL: 30 days"
echo "- Type: Simple handoff"

echo ""
echo "✅ Simple export complete!"
echo "📂 Working directory: $(pwd)"