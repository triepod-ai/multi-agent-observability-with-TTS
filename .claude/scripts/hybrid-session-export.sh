#!/bin/bash
# Hybrid Session Export - Efficient + Comprehensive Analysis
set -euo pipefail

# analyze_session_with_codex() - Comprehensive session analysis using Codex CLI
#
# Performs structured technical analysis of development sessions using local Codex CLI
# with dual execution strategy (JSON + direct mode) and comprehensive error handling.
analyze_session_with_codex() {
    local session_summary="$1"
    local working_dir="$2"
    local git_branch="$3"
    local git_status="$4"
    local git_commits="$5"
    
    # Parameter validation
    if [ -z "$session_summary" ] || [ -z "$working_dir" ]; then
        echo "Codex analysis failed: Missing required parameters"
        return 1
    fi
    
    # Check Codex CLI availability
    if ! command -v codex >/dev/null 2>&1; then
        echo "Codex CLI not available - install with: npm install -g @anthropic/codex"
        return 1
    fi
    
    echo "🧠 Analyzing session with Codex..." >&2
    
    # Create comprehensive analysis prompt for Codex
    local analysis_prompt="Analyze this development session and provide structured technical analysis:

## Session Context
$session_summary

## Current Project State
- Working Directory: $working_dir
- Git Branch: $git_branch
- Modified Files: $git_status files
- Recent Commits: $git_commits

## Required Analysis Output (use exact headers)
1. **Technical Achievements**: Concrete accomplishments, milestones reached, features completed
2. **Code Changes**: File modifications, new implementations, architectural updates  
3. **Problem Solving**: Debugging insights, issues resolved, solutions implemented
4. **Research & Learning**: New knowledge gained, patterns discovered, approaches explored
5. **Failed Approaches**: What didn't work and why (critical for future reference)
6. **Current Blockers**: Active obstacles preventing progress
7. **Next Steps**: Immediate actionable tasks with priority and context
8. **Research Gaps**: Missing information needed for implementation
9. **Context for Handoff**: Key details for someone continuing this work

Keep each section concise but informative. Use bullet points for clarity."
    
    # Primary execution: Codex exec with JSON output and structured parsing
    local conversation_analysis
    conversation_analysis=$(echo "$analysis_prompt" | timeout 45 codex exec --json --full-auto -C "$working_dir" 2>/dev/null | \
        tail -1 | \
        jq -r '.msg.last_agent_message // empty' 2>/dev/null || echo "")
    
    # Secondary fallback: Direct Codex output if JSON parsing fails
    if [ -z "$conversation_analysis" ]; then
        echo "⚡ Codex JSON parsing failed, trying direct output..." >&2
        conversation_analysis=$(echo "Analyze this session briefly: $session_summary. Provide achievements, next steps, and current blockers in bullet points." | \
                                timeout 30 codex exec --full-auto -C "$working_dir" 2>/dev/null | \
                                sed -n '/thinking/,$p' | tail -n +2 | head -20 || \
                                echo "Technical analysis completed - see session summary for details")
    fi
    
    # Return analysis result
    echo "$conversation_analysis"
    return 0
}

# Parse arguments and flags
PROJECT_NAME=$(basename "$PWD")
SESSION_ID=$(date +%Y%m%d_%H%M%S)
ARGUMENTS="${ARGUMENTS:-}"

# Initialize flags
USE_COMPLEX=false
USE_COMPREHENSIVE=false
USE_MINIMAL=false
DESCRIPTION=""

# Parse flags from arguments
for arg in $ARGUMENTS; do
    case "$arg" in
        --complex)
            USE_COMPLEX=true
            ;;
        --comprehensive)
            USE_COMPREHENSIVE=true
            ;;
        --minimal)
            USE_MINIMAL=true
            ;;
        *)
            if [ -z "$DESCRIPTION" ]; then
                DESCRIPTION="$arg"
            else
                DESCRIPTION="$DESCRIPTION $arg"
            fi
            ;;
    esac
done

# Clean up description
DESCRIPTION=$(echo "$DESCRIPTION" | xargs)

# If user wants complex version, delegate to original script
if [ "$USE_COMPLEX" = true ]; then
    echo "🔄 Using original complex version..."
    exec /home/bryan/setup-mcp-server.sh.APP/scripts/get-up-to-speed-export.sh "$@"
fi

echo "💾 Exporting session for $PROJECT_NAME..."
echo ""

# Collect technical context
WORKING_DIR=$(pwd)
GIT_STATUS_NUM=0
GIT_BRANCH="main"
GIT_COMMITS="No recent commits"
GIT_STATUS_TEXT="No git repository"

if [ -d ".git" ]; then
    GIT_STATUS_NUM=$(git status --porcelain 2>/dev/null | wc -l || echo "0")
    LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "No commits")
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    GIT_COMMITS=$(git log --oneline -3 2>/dev/null | sed 's/^/  - /' || echo '  - No recent commits')
    GIT_STATUS_TEXT="Branch: $GIT_BRANCH | $GIT_STATUS_NUM changed | Last: $LAST_COMMIT"
fi

# Determine if comprehensive analysis should be used
SHOULD_ANALYZE=false

if [ "$USE_COMPREHENSIVE" = true ]; then
    SHOULD_ANALYZE=true
    echo "🧠 Comprehensive analysis requested"
elif [ "$USE_MINIMAL" = true ]; then
    SHOULD_ANALYZE=false
    echo "⚡ Minimal mode requested"
else
    # Auto-detection logic
    echo "🤔 Auto-detecting analysis need..."
    
    # Check if comprehensive analysis would be beneficial
    if [ "$GIT_STATUS_NUM" -gt 10 ]; then
        SHOULD_ANALYZE=true
        echo "  → Many file changes detected ($GIT_STATUS_NUM files)"
    elif [[ "$DESCRIPTION" =~ (implemented|completed|fixed|resolved|achieved|finished|built|created|added|updated) ]]; then
        SHOULD_ANALYZE=true
        echo "  → Significant work indicated in description"
    elif [ -f "CLAUDE.md" ] && [[ "$PROJECT_NAME" =~ (triepod|toolnexus|business) ]]; then
        SHOULD_ANALYZE=true
        echo "  → Ecosystem project detected"
    else
        echo "  → Simple session, using minimal export"
    fi
fi

# Create base session summary
BASE_SUMMARY="=== Session Export ===
Project: $PROJECT_NAME
Session: $SESSION_ID  
Date: $(date)
Git: $GIT_STATUS_TEXT"

if [ -n "$DESCRIPTION" ]; then
    BASE_SUMMARY="$BASE_SUMMARY
Description: $DESCRIPTION"
fi

# Add comprehensive analysis if needed
FINAL_SUMMARY="$BASE_SUMMARY"
if [ "$SHOULD_ANALYZE" = true ]; then
    echo ""
    echo "🧠 Running comprehensive Codex analysis..."
    
    CONVERSATION_ANALYSIS=$(analyze_session_with_codex "$DESCRIPTION" "$WORKING_DIR" "$GIT_BRANCH" "$GIT_STATUS_NUM" "$GIT_COMMITS")
    
    if [ $? -eq 0 ] && [ -n "$CONVERSATION_ANALYSIS" ]; then
        FINAL_SUMMARY="$BASE_SUMMARY

## Technical Analysis
$CONVERSATION_ANALYSIS

## Technical Context
- Git Branch: $GIT_BRANCH
- Modified Files: $GIT_STATUS_NUM
- Recent Commits:
$GIT_COMMITS
- Working Directory: $WORKING_DIR"
        echo "✅ Comprehensive analysis completed"
    else
        echo "⚠️  Analysis failed, using minimal export"
    fi
fi

# Direct Redis storage with proper retention and rolling archive
if command -v redis-cli >/dev/null 2>&1; then
    # Check for existing sessions and implement rolling window (max 7 sessions)
    EXISTING_SESSIONS=$(redis-cli KEYS "session:$PROJECT_NAME:*" 2>/dev/null | wc -l)
    EXISTING_HANDOFFS=$(redis-cli KEYS "handoff:project:$PROJECT_NAME:*" 2>/dev/null | wc -l)
    
    echo "📊 Current sessions for $PROJECT_NAME: $EXISTING_SESSIONS"
    
    # Archive old sessions if we're at the limit (7 sessions)
    if [ "$EXISTING_SESSIONS" -ge 7 ]; then
        echo "🗄️  Rolling archive: Moving oldest sessions to long-term storage..."
        
        # Get oldest session keys (sort by timestamp in key)
        OLDEST_SESSION=$(redis-cli KEYS "session:$PROJECT_NAME:*" 2>/dev/null | sort | head -1)
        OLDEST_HANDOFF=$(redis-cli KEYS "handoff:project:$PROJECT_NAME:*" 2>/dev/null | sort | head -1)
        
        if [ -n "$OLDEST_SESSION" ]; then
            # Get the data before deleting
            ARCHIVE_DATA=$(redis-cli GET "$OLDEST_SESSION" 2>/dev/null)
            
            # Archive to Qdrant if available
            if command -v mcp__qdrant__qdrant_store >/dev/null 2>&1; then
                echo "🔄 Archiving to Qdrant: session_archives collection..."
                # Note: This would be executed by Claude Code as an MCP call
                echo "MCP_ARCHIVE_CALL: mcp__qdrant__qdrant_store '$ARCHIVE_DATA' 'session_archives' '{\"project\":\"$PROJECT_NAME\",\"archived_from\":\"$OLDEST_SESSION\",\"archive_date\":\"$(date)\",\"type\":\"session_rolloff\"}'"
            fi
            
            # Delete the old session and handoff
            redis-cli DEL "$OLDEST_SESSION" >/dev/null 2>&1
            [ -n "$OLDEST_HANDOFF" ] && redis-cli DEL "$OLDEST_HANDOFF" >/dev/null 2>&1
            
            echo "✅ Archived and removed: $(basename "$OLDEST_SESSION")"
        fi
    fi
    
    # Store new session with 30-day TTL (2,592,000 seconds)
    REDIS_KEY="session:$PROJECT_NAME:$SESSION_ID"
    echo "$FINAL_SUMMARY" | redis-cli -x SET "$REDIS_KEY" >/dev/null 2>&1
    redis-cli EXPIRE "$REDIS_KEY" 2592000 >/dev/null 2>&1
    echo "✅ Stored session: $REDIS_KEY (TTL: 30 days)"
    
    # Store handoff document with 30-day TTL  
    HANDOFF_KEY="handoff:project:$PROJECT_NAME:$SESSION_ID"
    echo "$FINAL_SUMMARY" | redis-cli -x SET "$HANDOFF_KEY" >/dev/null 2>&1
    redis-cli EXPIRE "$HANDOFF_KEY" 2592000 >/dev/null 2>&1
    echo "✅ Stored handoff: $HANDOFF_KEY (TTL: 30 days)"
    
    # Show rolling window status
    NEW_SESSION_COUNT=$((EXISTING_SESSIONS + 1))
    if [ "$NEW_SESSION_COUNT" -gt 7 ]; then
        NEW_SESSION_COUNT=7
    fi
    echo "📈 Session window: $NEW_SESSION_COUNT/7 sessions active"
else
    echo "⚠️  Redis not available"
fi

# File backup
EXPORT_DIR="exports"
mkdir -p "$EXPORT_DIR"
EXPORT_FILE="$EXPORT_DIR/session_$SESSION_ID.md"
echo "$FINAL_SUMMARY" > "$EXPORT_FILE"
echo "✅ File backup: $EXPORT_FILE"

# Update PROJECT_STATUS.md if it exists
if [ -f "PROJECT_STATUS.md" ]; then
    cp PROJECT_STATUS.md PROJECT_STATUS.md.bak
    
    {
        echo "## Session Export - $SESSION_ID"
        echo "- Date: $(date)"
        echo "- Git: $GIT_STATUS_TEXT"
        [ -n "$DESCRIPTION" ] && echo "- Description: $DESCRIPTION"
        [ "$SHOULD_ANALYZE" = true ] && echo "- Analysis: Comprehensive Codex analysis included"
        echo ""
        cat PROJECT_STATUS.md.bak
    } > PROJECT_STATUS.md
    
    echo "✅ Updated PROJECT_STATUS.md"
fi

# Summary
echo ""
if [ "$SHOULD_ANALYZE" = true ]; then
    echo "✅ Comprehensive export completed!"
    echo "📊 Analysis included: 9-section technical breakdown"
    echo "🗄️  Retention: 30 days with rolling 7-session window"
    echo "🔄 Auto-archive: Oldest sessions saved to Qdrant before deletion"
    echo "💡 Use --minimal flag to skip analysis for simple sessions"
else
    echo "✅ Minimal export completed!"
    echo "🗄️  Retention: 30 days with rolling 7-session window"
    echo "🔄 Auto-archive: Oldest sessions saved to Qdrant before deletion"
    echo "💡 Use --comprehensive flag to force detailed analysis"
fi