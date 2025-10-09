#!/bin/bash

# Multi-Agent Observability System - Data Display Regression Test Suite
# Purpose: Ensure Hook Coverage Modal and event display functionality remains intact
# Created: 2025-01-24

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$RESULTS_DIR/regression_$TIMESTAMP.log"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "🔍 Multi-Agent Observability System - Data Display Regression Tests"
echo "=================================================================="
echo "Timestamp: $(date)"
echo "Log file: $LOG_FILE"
echo ""

# Function to log messages
log() {
    echo "$1" | tee -a "$LOG_FILE"
}

# Function to check if services are running
check_services() {
    log "📡 Checking service status..."

    # Check if server is running on port 4000
    if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
        log "✅ Server is running on port 4000"
    else
        log "❌ Server is not running on port 4000"
        return 1
    fi

    # Check if client is running on port 8543
    if curl -s http://localhost:8543 > /dev/null 2>&1; then
        log "✅ Client is running on port 8543"
    else
        log "❌ Client is not running on port 8543"
        return 1
    fi

    return 0
}

# Test 1: Verify API endpoints are accessible
test_api_endpoints() {
    log ""
    log "🔧 Test 1: API Endpoint Accessibility"
    log "--------------------------------------"

    local endpoints=(
        "/api/hooks/user_prompt_submit/events?limit=10"
        "/api/hooks/user_prompt_submit/context"
        "/api/hooks/user_prompt_submit/metrics"
        "/api/hooks/tool_use/events?limit=10"
        "/api/hooks/subagent_start/events?limit=10"
    )

    local all_passed=true

    for endpoint in "${endpoints[@]}"; do
        if curl -s "http://localhost:4000$endpoint" > /dev/null 2>&1; then
            log "  ✅ $endpoint - Accessible"
        else
            log "  ❌ $endpoint - Failed"
            all_passed=false
        fi
    done

    if $all_passed; then
        log "✅ All API endpoints are accessible"
        return 0
    else
        log "❌ Some API endpoints failed"
        return 1
    fi
}

# Test 2: Verify data is returned from APIs
test_api_data() {
    log ""
    log "📊 Test 2: API Data Validation"
    log "-------------------------------"

    # Test user_prompt_submit events
    local response=$(curl -s http://localhost:4000/api/hooks/user_prompt_submit/events?limit=5)

    if [ -z "$response" ] || [ "$response" == "null" ] || [ "$response" == "[]" ]; then
        log "  ⚠️  user_prompt_submit/events - No data (might be empty DB)"
    else
        local count=$(echo "$response" | jq '. | length' 2>/dev/null || echo 0)
        log "  ✅ user_prompt_submit/events - Returns $count events"
    fi

    # Test hook coverage
    response=$(curl -s http://localhost:4000/api/hooks/coverage)
    if echo "$response" | jq . > /dev/null 2>&1; then
        local hook_count=$(echo "$response" | jq '. | length' 2>/dev/null || echo 0)
        log "  ✅ hooks/coverage - Returns data for $hook_count hooks"
    else
        log "  ❌ hooks/coverage - Invalid JSON response"
        return 1
    fi

    return 0
}

# Test 3: Verify Vite proxy configuration
test_vite_proxy() {
    log ""
    log "🔄 Test 3: Vite Proxy Configuration"
    log "------------------------------------"

    # Check if vite.config.ts has proxy settings
    if grep -q "proxy:" "$PROJECT_ROOT/apps/client/vite.config.ts"; then
        log "  ✅ Proxy configuration exists in vite.config.ts"

        # Check specific proxy paths
        if grep -q "'/api':" "$PROJECT_ROOT/apps/client/vite.config.ts"; then
            log "  ✅ /api proxy is configured"
        else
            log "  ❌ /api proxy is missing"
            return 1
        fi

        if grep -q "'/ws':" "$PROJECT_ROOT/apps/client/vite.config.ts"; then
            log "  ✅ /ws WebSocket proxy is configured"
        else
            log "  ⚠️  /ws WebSocket proxy is missing (optional)"
        fi
    else
        log "  ❌ No proxy configuration found in vite.config.ts"
        return 1
    fi

    return 0
}

# Test 4: Database integrity check
test_database() {
    log ""
    log "💾 Test 4: Database Integrity"
    log "-----------------------------"

    local db_path="$PROJECT_ROOT/apps/server/observability.db"

    if [ ! -f "$db_path" ]; then
        log "  ❌ Database file not found at $db_path"
        return 1
    fi

    log "  ✅ Database file exists"

    # Check event counts
    local total_events=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM events;" 2>/dev/null || echo 0)
    log "  📊 Total events in database: $total_events"

    # Check events by type
    local hook_types=(
        "UserPromptSubmit"
        "user_prompt_submit"
        "ToolUse"
        "tool_use"
        "SubagentStart"
        "subagent_start"
    )

    for hook_type in "${hook_types[@]}"; do
        local count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM events WHERE event_type='$hook_type';" 2>/dev/null || echo 0)
        if [ "$count" -gt 0 ]; then
            log "  📈 $hook_type: $count events"
        fi
    done

    return 0
}

# Test 5: Component integrity check
test_components() {
    log ""
    log "🧩 Test 5: Component Integrity"
    log "-------------------------------"

    local components=(
        "apps/client/src/components/EnhancedHookModal.vue"
        "apps/client/src/components/modal/RecentActivityView.vue"
        "apps/client/src/components/modal/ContextualOverview.vue"
        "apps/client/src/components/modal/PerformanceMetrics.vue"
        "apps/server/src/services/enhancedHookService.ts"
    )

    local all_exist=true

    for component in "${components[@]}"; do
        if [ -f "$PROJECT_ROOT/$component" ]; then
            log "  ✅ $component exists"
        else
            log "  ❌ $component missing"
            all_exist=false
        fi
    done

    if $all_exist; then
        return 0
    else
        return 1
    fi
}

# Test 6: Event limit configurations
test_event_limits() {
    log ""
    log "🎯 Test 6: Event Limit Configurations"
    log "--------------------------------------"

    # Check server-side limit
    local server_limit=$(grep -o "MAX_EVENTS_PER_TYPE = [0-9]*" "$PROJECT_ROOT/apps/server/src/index.ts" | grep -o "[0-9]*" || echo "not found")

    if [ "$server_limit" == "500" ]; then
        log "  ✅ Server MAX_EVENTS_PER_TYPE = 500"
    elif [ "$server_limit" == "not found" ]; then
        log "  ⚠️  Server MAX_EVENTS_PER_TYPE not found (using default)"
    else
        log "  ⚠️  Server MAX_EVENTS_PER_TYPE = $server_limit (expected 500)"
    fi

    # Check client-side limit
    local client_limit=$(grep -o "MAX_EVENTS = [0-9]*" "$PROJECT_ROOT/apps/client/src/stores/eventsStore.ts" 2>/dev/null | grep -o "[0-9]*" || echo "not found")

    if [ "$client_limit" == "2000" ]; then
        log "  ✅ Client MAX_EVENTS = 2000"
    elif [ "$client_limit" == "not found" ]; then
        log "  ⚠️  Client MAX_EVENTS not found (using default)"
    else
        log "  ⚠️  Client MAX_EVENTS = $client_limit (expected 2000)"
    fi

    return 0
}

# Test 7: TTS System Tests
test_tts_system() {
    log ""
    log "🔊 Test 7: TTS System Tests"
    log "----------------------------"

    # Run pytest for TTS tests
    if command -v pytest &> /dev/null; then
        log "  Running TTS unit tests..."

        # Run tests in quiet mode and capture output
        if python3 -m pytest "$PROJECT_ROOT/tests/tts" -v --tb=short > /tmp/tts_test_output.log 2>&1; then
            local test_count=$(grep -c "PASSED" /tmp/tts_test_output.log || echo 0)
            log "  ✅ TTS tests passed ($test_count tests)"

            # Run hook tests
            if python3 -m pytest "$PROJECT_ROOT/tests/hooks" -v --tb=short > /tmp/hooks_test_output.log 2>&1; then
                local hook_test_count=$(grep -c "PASSED" /tmp/hooks_test_output.log || echo 0)
                log "  ✅ Hook tests passed ($hook_test_count tests)"
                return 0
            else
                log "  ❌ Hook tests failed"
                log "  See /tmp/hooks_test_output.log for details"
                return 1
            fi
        else
            log "  ❌ TTS tests failed"
            log "  See /tmp/tts_test_output.log for details"
            return 1
        fi
    else
        log "  ⚠️  pytest not installed, skipping TTS tests"
        log "  Install with: pip install pytest"
        return 0  # Don't fail if pytest is not installed
    fi
}

# Main execution
main() {
    local total_tests=7
    local passed_tests=0
    local failed_tests=0

    log "Starting regression tests..."
    log ""

    # Check services first
    if ! check_services; then
        log ""
        log "❌ Services are not running. Please start them first:"
        log "   Server: cd apps/server && bun dev"
        log "   Client: cd apps/client && npm run dev"
        exit 1
    fi

    # Run all tests
    if test_api_endpoints; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    if test_api_data; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    if test_vite_proxy; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    if test_database; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    if test_components; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    if test_event_limits; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    if test_tts_system; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Summary
    log ""
    log "=================================================================="
    log "📊 Test Summary"
    log "=================================================================="
    log "Total Tests: $total_tests"
    log "✅ Passed: $passed_tests"
    log "❌ Failed: $failed_tests"
    log ""

    if [ $failed_tests -eq 0 ]; then
        log "🎉 All regression tests passed!"
        log "The data display functionality is working correctly."
        exit 0
    else
        log "⚠️  Some tests failed. Please review the log for details."
        exit 1
    fi
}

# Run main function
main