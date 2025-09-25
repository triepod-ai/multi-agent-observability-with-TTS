#!/bin/bash
# Quick Diagnostic Script for Multi-Agent Observability System
# Usage: ./bin/quick-diagnostic.sh

set -e

echo "🔍 Multi-Agent Observability System - Quick Diagnostic"
echo "=================================================="
echo "Timestamp: $(date)"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check command existence
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✅${NC} $1 available"
        return 0
    else
        echo -e "${RED}❌${NC} $1 not found"
        return 1
    fi
}

# Function to check file existence
check_file() {
    if [[ -f "$1" ]]; then
        echo -e "${GREEN}✅${NC} $1 exists"
        return 0
    else
        echo -e "${RED}❌${NC} $1 missing"
        return 1
    fi
}

# Function to check directory existence
check_dir() {
    if [[ -d "$1" ]]; then
        echo -e "${GREEN}✅${NC} $1/ exists"
        return 0
    else
        echo -e "${RED}❌${NC} $1/ missing"
        return 1
    fi
}

echo -e "${BLUE}1. SYSTEM REQUIREMENTS CHECK${NC}"
echo "----------------------------"
check_command "node"
check_command "npm"
check_command "sqlite3"
check_command "redis-cli"
check_command "curl"
check_command "jq" || echo -e "${YELLOW}⚠️${NC} jq recommended for JSON parsing"
echo ""

echo -e "${BLUE}2. PROJECT STRUCTURE CHECK${NC}"
echo "--------------------------"
check_dir "apps/server"
check_dir "apps/client"
check_dir ".claude/hooks"
check_file ".claude/settings.local.json"
check_file "package.json"
echo ""

echo -e "${BLUE}3. SERVICE STATUS CHECK${NC}"
echo "-----------------------"

# Check if server is running
if pgrep -f "apps/server" > /dev/null; then
    echo -e "${GREEN}✅${NC} Server process running"
    server_running=true
else
    echo -e "${RED}❌${NC} Server process not running"
    server_running=false
fi

# Check if client is running
if pgrep -f "apps/client" > /dev/null; then
    echo -e "${GREEN}✅${NC} Client process running"
    client_running=true
else
    echo -e "${RED}❌${NC} Client process not running"
    client_running=false
fi

# Check ports
if netstat -tulpn 2>/dev/null | grep -q ":3456 "; then
    echo -e "${GREEN}✅${NC} Port 3456 (server) is listening"
else
    echo -e "${RED}❌${NC} Port 3456 (server) not listening"
fi

if netstat -tulpn 2>/dev/null | grep -q ":3001 "; then
    echo -e "${GREEN}✅${NC} Port 3001 (client) is listening"
else
    echo -e "${YELLOW}⚠️${NC} Port 3001 (client) not listening (may be normal if not running dev server)"
fi
echo ""

echo -e "${BLUE}4. DATABASE CHECK${NC}"
echo "-----------------"

# Find database file
db_file=""
for file in database.db *.db apps/server/*.db; do
    if [[ -f "$file" ]]; then
        db_file="$file"
        break
    fi
done

if [[ -n "$db_file" ]]; then
    echo -e "${GREEN}✅${NC} Database found: $db_file"

    # Check database contents
    if sqlite3 "$db_file" ".tables" 2>/dev/null | grep -q "events"; then
        echo -e "${GREEN}✅${NC} Events table exists"

        # Count events
        event_count=$(sqlite3 "$db_file" "SELECT COUNT(*) FROM events;" 2>/dev/null || echo "0")
        if [[ "$event_count" -gt 0 ]]; then
            echo -e "${GREEN}✅${NC} Database has $event_count events"

            # Show recent event types
            echo -e "${BLUE}   Recent event types:${NC}"
            sqlite3 "$db_file" "SELECT hook_event_type, COUNT(*) as count FROM events GROUP BY hook_event_type ORDER BY count DESC LIMIT 5;" 2>/dev/null | while IFS='|' read -r type count; do
                echo "     - $type: $count events"
            done
        else
            echo -e "${RED}❌${NC} Database has no events"
        fi
    else
        echo -e "${RED}❌${NC} Events table missing"
    fi
else
    echo -e "${RED}❌${NC} No database file found"
fi
echo ""

echo -e "${BLUE}5. REDIS CHECK${NC}"
echo "--------------"
if redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Redis connection successful"

    # Check Redis keys
    key_count=$(redis-cli keys '*' 2>/dev/null | wc -l)
    echo -e "${GREEN}✅${NC} Redis has $key_count keys"

    # Show some sample keys
    if [[ "$key_count" -gt 0 ]]; then
        echo -e "${BLUE}   Sample keys:${NC}"
        redis-cli keys '*' 2>/dev/null | head -5 | while read -r key; do
            echo "     - $key"
        done
    fi
else
    echo -e "${RED}❌${NC} Redis not accessible"
fi
echo ""

echo -e "${BLUE}6. API ENDPOINT CHECK${NC}"
echo "--------------------"
if [[ "$server_running" == true ]]; then
    # Test main API endpoint
    if curl -s --connect-timeout 5 "http://localhost:3456/api/hook-coverage" >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} API server responding"

        # Get hook coverage data
        if command -v jq &> /dev/null; then
            echo -e "${BLUE}   Hook status:${NC}"
            curl -s "http://localhost:3456/api/hook-coverage" | jq -r '.hooks[]? | "     - \(.type): \(.executionCount) executions (\(.status))"' 2>/dev/null || echo "     Unable to parse hook data"
        else
            echo -e "${YELLOW}   Install jq to see detailed hook status${NC}"
        fi
    else
        echo -e "${RED}❌${NC} API server not responding"
    fi
else
    echo -e "${YELLOW}⚠️${NC} Server not running - skipping API test"
fi
echo ""

echo -e "${BLUE}7. HOOKS CONFIGURATION CHECK${NC}"
echo "----------------------------"
if [[ -f ".claude/settings.local.json" ]]; then
    echo -e "${GREEN}✅${NC} Claude settings file exists"

    if command -v jq &> /dev/null; then
        hook_config=$(cat .claude/settings.local.json | jq '.hooks' 2>/dev/null)
        if [[ "$hook_config" != "null" ]]; then
            echo -e "${GREEN}✅${NC} Hooks configuration found"

            # Count configured hooks
            hook_count=$(cat .claude/settings.local.json | jq '.hooks | length' 2>/dev/null || echo "0")
            echo -e "${GREEN}✅${NC} $hook_count hooks configured"
        else
            echo -e "${RED}❌${NC} No hooks configuration found in settings"
        fi
    else
        echo -e "${YELLOW}⚠️${NC} Install jq to parse hook configuration"
    fi
else
    echo -e "${RED}❌${NC} Claude settings file missing"
fi

# Check hook files
hook_files=(
    ".claude/hooks/session_start.py"
    ".claude/hooks/pre_tool_use.py"
    ".claude/hooks/post_tool_use.py"
    ".claude/hooks/subagent_start.py"
    ".claude/hooks/subagent_stop.py"
)

echo -e "${BLUE}   Critical hook files:${NC}"
for hook in "${hook_files[@]}"; do
    if [[ -f "$hook" ]]; then
        echo -e "     ${GREEN}✅${NC} $hook"
    else
        echo -e "     ${RED}❌${NC} $hook"
    fi
done
echo ""

echo -e "${BLUE}8. SESSION FILES CHECK${NC}"
echo "----------------------"
session_files=$(ls /tmp/claude_session_* 2>/dev/null | wc -l)
if [[ "$session_files" -gt 0 ]]; then
    echo -e "${GREEN}✅${NC} Found $session_files session file(s)"
    echo -e "${BLUE}   Recent session files:${NC}"
    ls -la /tmp/claude_session_* 2>/dev/null | tail -3 | while read -r line; do
        echo "     $line"
    done
else
    echo -e "${YELLOW}⚠️${NC} No active session files found"
fi
echo ""

echo -e "${BLUE}9. DIAGNOSTIC SUMMARY${NC}"
echo "======================"

# Determine overall system status
issues_found=false

if [[ "$server_running" == false ]]; then
    echo -e "${RED}❌ CRITICAL:${NC} Server not running"
    echo "   Fix: cd apps/server && npm run dev"
    issues_found=true
fi

if [[ -z "$db_file" ]]; then
    echo -e "${RED}❌ CRITICAL:${NC} Database file not found"
    echo "   Fix: Check database initialization"
    issues_found=true
elif [[ "$event_count" == "0" ]]; then
    echo -e "${YELLOW}⚠️ WARNING:${NC} Database has no events"
    echo "   Fix: Run hook scripts or use Claude Code to generate events"
    issues_found=true
fi

if ! redis-cli ping >/dev/null 2>&1; then
    echo -e "${RED}❌ CRITICAL:${NC} Redis not accessible"
    echo "   Fix: Start Redis server with 'redis-server'"
    issues_found=true
fi

if ! curl -s --connect-timeout 5 "http://localhost:3456/api/hook-coverage" >/dev/null 2>&1 && [[ "$server_running" == true ]]; then
    echo -e "${RED}❌ CRITICAL:${NC} API not responding"
    echo "   Fix: Check server logs and restart if needed"
    issues_found=true
fi

if [[ ! -f ".claude/settings.local.json" ]]; then
    echo -e "${RED}❌ CRITICAL:${NC} Hooks not configured"
    echo "   Fix: Run ./bin/install-hooks.sh"
    issues_found=true
fi

if [[ "$issues_found" == false ]]; then
    echo -e "${GREEN}🎉 SYSTEM STATUS: HEALTHY${NC}"
    echo "All critical components are working correctly."
    echo ""
    echo -e "${BLUE}If dashboard tabs still appear empty:${NC}"
    echo "1. Check browser console for JavaScript errors"
    echo "2. Verify WebSocket connection in browser dev tools"
    echo "3. Try generating test events with: ./bin/generate-test-events.sh"
else
    echo -e "${RED}🔧 SYSTEM STATUS: ISSUES DETECTED${NC}"
    echo "Fix the issues above and re-run this diagnostic."
fi
echo ""

echo -e "${BLUE}NEXT STEPS:${NC}"
echo "-----------"
echo "1. For detailed troubleshooting: docs/COMPREHENSIVE_DIAGNOSTIC_GUIDE.md"
echo "2. To generate test events: ./bin/generate-test-events.sh (if available)"
echo "3. To install hooks: ./bin/install-hooks.sh"
echo "4. To start services:"
echo "   - Server: cd apps/server && npm run dev"
echo "   - Client: cd apps/client && npm run dev"
echo "5. To check logs: tail -f apps/server/logs/* (if log directory exists)"

echo ""
echo "🔍 Diagnostic completed at $(date)"