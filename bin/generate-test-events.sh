#!/bin/bash
# Generate Test Events for Multi-Agent Observability System
# Usage: ./bin/generate-test-events.sh [count]

set -e

# Default number of test events
COUNT=${1:-10}
PROJECT_NAME="multi-agent-observability-system"
SESSION_ID="test_$(date +%s)"

echo "🧪 Generating $COUNT test events for Multi-Agent Observability System"
echo "======================================================================"
echo "Session ID: $SESSION_ID"
echo "Timestamp: $(date)"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check dependencies
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ sqlite3 not found. Please install sqlite3."
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl."
    exit 1
fi

# Find database file
DB_FILE=""
for file in database.db *.db apps/server/*.db; do
    if [[ -f "$file" ]]; then
        DB_FILE="$file"
        break
    fi
done

if [[ -z "$DB_FILE" ]]; then
    echo "❌ Database file not found. Creating database.db..."
    DB_FILE="database.db"

    # Create basic events table if it doesn't exist
    sqlite3 "$DB_FILE" "
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        parent_session_id TEXT,
        session_depth INTEGER DEFAULT 1,
        hook_event_type TEXT NOT NULL,
        source_app TEXT DEFAULT 'multi-agent-observability-system',
        timestamp INTEGER NOT NULL,
        duration INTEGER,
        error TEXT,
        payload TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    "
    echo "✅ Created database with events table"
fi

echo -e "${BLUE}Database:${NC} $DB_FILE"
echo ""

# Create session file for tool hooks
SESSION_FILE="/tmp/claude_session_${PROJECT_NAME}"
echo -e "${SESSION_ID}\n$(date -Iseconds)" > "$SESSION_FILE"
chmod 600 "$SESSION_FILE"
echo -e "${GREEN}✅${NC} Created session file: $SESSION_FILE"

# Generate realistic test events
echo -e "${BLUE}Generating test events...${NC}"

# Event templates
EVENTS=(
    # Session events
    "SessionStart:{\"user\":\"test_user\",\"project\":\"$PROJECT_NAME\",\"mode\":\"development\"}"
    "UserPromptSubmit:{\"prompt\":\"Analyze the codebase structure\",\"tokens\":25}"

    # Tool usage events
    "PreToolUse:{\"tool\":\"Read\",\"tool_input\":{\"file_path\":\"README.md\",\"limit\":100}}"
    "PostToolUse:{\"tool\":\"Read\",\"tool_result\":\"File content loaded successfully\",\"duration\":145,\"tokens\":89}"
    "PreToolUse:{\"tool\":\"Grep\",\"tool_input\":{\"pattern\":\"TODO\",\"file_pattern\":\"*.py\"}}"
    "PostToolUse:{\"tool\":\"Grep\",\"tool_result\":\"Found 12 matches\",\"duration\":234,\"tokens\":156}"

    # Agent events
    "SubagentStart:{\"agent_name\":\"TestAnalyzer\",\"agent_type\":\"analyzer\",\"description\":\"Test code analysis\"}"
    "SubagentStop:{\"agent_name\":\"TestAnalyzer\",\"result\":\"Analysis complete\",\"duration\":2340,\"tokens\":445}"
    "SubagentStart:{\"agent_name\":\"QualityReviewer\",\"agent_type\":\"reviewer\",\"description\":\"Code quality assessment\"}"
    "SubagentStop:{\"agent_name\":\"QualityReviewer\",\"result\":\"Quality review finished\",\"duration\":1890,\"tokens\":312}"

    # System events
    "Notification:{\"type\":\"info\",\"message\":\"System health check completed\"}"
    "PreCompact:{\"analysis_type\":\"session_summary\",\"context_size\":\"2.3KB\"}"
    "Stop:{\"reason\":\"user_requested\",\"session_duration\":34567}"
)

# Generate events
for ((i=1; i<=COUNT; i++)); do
    # Select random event template
    EVENT_INDEX=$((RANDOM % ${#EVENTS[@]}))
    EVENT_TEMPLATE="${EVENTS[$EVENT_INDEX]}"

    # Parse event type and payload
    EVENT_TYPE="${EVENT_TEMPLATE%%:*}"
    EVENT_PAYLOAD="${EVENT_TEMPLATE#*:}"

    # Generate timestamp (spread over last hour)
    RANDOM_OFFSET=$((RANDOM % 3600))
    TIMESTAMP=$(($(date +%s) * 1000 - RANDOM_OFFSET * 1000))

    # Generate duration for completed events
    DURATION="NULL"
    if [[ "$EVENT_TYPE" =~ (PostToolUse|SubagentStop|Stop) ]]; then
        DURATION=$((100 + RANDOM % 2000))
    fi

    # Insert into database
    sqlite3 "$DB_FILE" "
    INSERT INTO events (
        session_id,
        hook_event_type,
        source_app,
        timestamp,
        duration,
        payload
    ) VALUES (
        '$SESSION_ID',
        '$EVENT_TYPE',
        '$PROJECT_NAME',
        $TIMESTAMP,
        $DURATION,
        '$EVENT_PAYLOAD'
    );
    "

    echo -e "  ${GREEN}✅${NC} Event $i: $EVENT_TYPE"

    # Small delay to make timestamps more realistic
    sleep 0.1
done

echo ""
echo -e "${BLUE}Verifying generated events...${NC}"

# Count events by type
echo "Event distribution:"
sqlite3 "$DB_FILE" "
SELECT
    hook_event_type,
    COUNT(*) as count
FROM events
WHERE session_id = '$SESSION_ID'
GROUP BY hook_event_type
ORDER BY count DESC;
" | while IFS='|' read -r type count; do
    echo "  - $type: $count events"
done

# Total event count
TOTAL_EVENTS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM events WHERE session_id = '$SESSION_ID';")
echo ""
echo -e "${GREEN}✅ Generated $TOTAL_EVENTS events successfully${NC}"

# Test API if server is running
echo ""
echo -e "${BLUE}Testing API response...${NC}"
if curl -s --connect-timeout 5 "http://localhost:3456/api/hook-coverage" >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} API server responding"

    # Try to trigger a refresh
    if command -v jq &> /dev/null; then
        HOOK_COUNT=$(curl -s "http://localhost:3456/api/hook-coverage" | jq '.hooks | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✅${NC} API reports $HOOK_COUNT hook types"
    fi
else
    echo -e "${YELLOW}⚠️${NC} API server not responding (may need to restart)"
    echo "   Start server with: cd apps/server && npm run dev"
fi

# Generate WebSocket event if possible
echo ""
echo -e "${BLUE}Sending WebSocket notification...${NC}"
if pgrep -f "apps/server" > /dev/null; then
    # Try to send a WebSocket event (this would need server support)
    curl -s -X POST "http://localhost:3456/api/websocket/notify" \
         -H "Content-Type: application/json" \
         -d '{"type":"events_updated","data":{"session_id":"'$SESSION_ID'","count":'$TOTAL_EVENTS'}}' \
         2>/dev/null && echo -e "${GREEN}✅${NC} WebSocket notification sent" || echo -e "${YELLOW}⚠️${NC} WebSocket notification failed (may be normal)"
else
    echo -e "${YELLOW}⚠️${NC} Server not running - skipping WebSocket test"
fi

echo ""
echo -e "${BLUE}Summary:${NC}"
echo "--------"
echo "✅ Session ID: $SESSION_ID"
echo "✅ Events generated: $TOTAL_EVENTS"
echo "✅ Database updated: $DB_FILE"
echo "✅ Session file created: $SESSION_FILE"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Refresh the observability dashboard in your browser"
echo "2. Check the Timeline tab - should show new events"
echo "3. Check Applications tab - should show '$PROJECT_NAME'"
echo "4. Check Agents tab - should show agent activity"
echo ""
echo "If tabs still appear empty:"
echo "- Run: ./bin/quick-diagnostic.sh"
echo "- Check browser console for JavaScript errors"
echo "- Verify WebSocket connection in browser dev tools"
echo "- Restart the server: cd apps/server && npm run dev"

echo ""
echo "🧪 Test event generation completed at $(date)"