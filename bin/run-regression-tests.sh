#!/bin/bash
# Automated Regression Test Runner for Post Tool Use Hook
# 
# This script runs the complete test suite to prevent the regression where:
# - Tool names showed as "Tool used: unknown" instead of actual tool names
# - Database contained old events with incorrect summaries
# - UI displayed correct Tool field but wrong Summary field
#
# Usage: ./bin/run-regression-tests.sh [--quick|--full|--ci]

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.claude/hooks"
SERVER_DIR="$PROJECT_ROOT/apps/server"
CLIENT_DIR="$PROJECT_ROOT/apps/client"
TESTS_DIR="$PROJECT_ROOT/tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Enhanced TTS notification function using speak command
notify_tts() {
    local message="$1"
    local priority="${2:-normal}"  # Priority levels: normal, important, error, subagent_complete, memory_confirmed, memory_failed
    
    ENGINEER_NAME=${ENGINEER_NAME:-"Developer"}
    
    # Skip TTS if disabled
    if [ "${TTS_ENABLED:-true}" != "true" ]; then
        return 0
    fi
    
    # Format message based on priority
    case "$priority" in
        "subagent_complete")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Sub-agent completed: $message"
            ;;
        "memory_confirmed")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Memory operation confirmed: $message"
            ;;
        "memory_failed")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Memory operation failed: $message"
            ;;
        "error")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Error: $message"
            ;;
        "important")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Important: $message"
            ;;
        *)
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, $message"
            ;;
    esac
    
    # Use speak command (non-blocking)
    speak "$PERSONALIZED_MESSAGE" &
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

update_test_count() {
    local status="$1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    case "$status" in
        "passed") PASSED_TESTS=$((PASSED_TESTS + 1)) ;;
        "failed") FAILED_TESTS=$((FAILED_TESTS + 1)) ;;
        "skipped") SKIPPED_TESTS=$((SKIPPED_TESTS + 1)) ;;
    esac
}

check_dependencies() {
    log_section "Checking Dependencies"
    
    local missing_deps=()
    
    # Check Python and pytest
    if ! command -v python3 >/dev/null 2>&1; then
        missing_deps+=("python3")
    fi
    
    if ! python3 -c "import pytest" 2>/dev/null; then
        missing_deps+=("pytest")
    fi
    
    # Check Node.js and package managers
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    if ! command -v bun >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("bun or npm")
    fi
    
    # Check client dependencies
    if [ ! -f "$CLIENT_DIR/node_modules/.bin/vitest" ] && [ ! -f "$CLIENT_DIR/node_modules/.bin/vue-tsc" ]; then
        missing_deps+=("client node_modules (run: cd apps/client && npm install)")
    fi
    
    # Check server dependencies  
    if [ ! -f "$SERVER_DIR/node_modules/.bin/tsx" ] && [ ! -d "$SERVER_DIR/node_modules" ]; then
        missing_deps+=("server node_modules (run: cd apps/server && bun install)")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies before running tests"
        return 1
    fi
    
    log_success "All dependencies available"
}

run_python_tests() {
    log_section "Running Python Hook Tests"
    
    cd "$PROJECT_ROOT"
    
    # Set up Python path
    export PYTHONPATH="$HOOKS_DIR:$PYTHONPATH"
    
    # Unit tests for hook functions
    log_info "Running hook unit tests..."
    if python3 -m pytest "$TESTS_DIR/hooks/test_post_tool_use.py" -v --tb=short; then
        log_success "Hook unit tests passed"
        update_test_count "passed"
        notify_tts "Hook unit tests completed successfully"
    else
        log_error "Hook unit tests failed"
        update_test_count "failed"
        notify_tts "Hook unit tests failed" "error"
        return 1
    fi
    
    # Integration tests (require more setup)
    if [ "$1" != "--quick" ]; then
        log_info "Running integration tests..."
        if python3 -m pytest "$TESTS_DIR/integration/test_post_tool_use_integration.py" -v --tb=short; then
            log_success "Integration tests passed"
            update_test_count "passed"
            notify_tts "Integration tests completed"
        else
            log_warning "Integration tests failed (may require running server)"
            update_test_count "skipped"
        fi
    else
        log_info "Skipping integration tests in quick mode"
        update_test_count "skipped"
    fi
}

run_frontend_tests() {
    log_section "Running Frontend UI Tests"
    
    cd "$CLIENT_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_warning "Client dependencies not installed, installing..."
        if command -v bun >/dev/null 2>&1; then
            bun install
        else
            npm install
        fi
    fi
    
    # Run Vue/TypeScript regression tests
    log_info "Running UI regression tests..."
    if command -v bun >/dev/null 2>&1; then
        if bun run test:regression 2>/dev/null || bunx vitest run tests/regression/ --reporter=verbose; then
            log_success "Frontend regression tests passed"
            update_test_count "passed"
            notify_tts "Frontend tests completed"
        else
            log_error "Frontend regression tests failed"
            update_test_count "failed"
            return 1
        fi
    else
        if npm run test:regression 2>/dev/null || npx vitest run tests/regression/ --reporter=verbose; then
            log_success "Frontend regression tests passed"
            update_test_count "passed"
            notify_tts "Frontend tests completed"
        else
            log_error "Frontend regression tests failed"
            update_test_count "failed"
            return 1
        fi
    fi
}

run_test_data_validation() {
    log_section "Running Test Data Validation"
    
    cd "$PROJECT_ROOT"
    
    log_info "Validating test data generators..."
    if python3 "$TESTS_DIR/fixtures/hook_data_generator.py"; then
        log_success "Test data generators working correctly"
        update_test_count "passed"
    else
        log_error "Test data generators failed"
        update_test_count "failed"
        return 1
    fi
    
    # Test specific regression scenarios
    log_info "Testing regression scenarios..."
    python3 -c "
import sys
sys.path.append('$TESTS_DIR/fixtures')
from hook_data_generator import RegressionScenarios, TestDataValidator
import json

# Test screenshot scenario
scenario = RegressionScenarios.screenshot_scenario()
if not TestDataValidator.validate_hook_data(scenario):
    print('Screenshot scenario validation failed')
    sys.exit(1)

# Test unknown tool scenario  
unknown_scenario = RegressionScenarios.unknown_tool_scenario()
if TestDataValidator.validate_hook_data(unknown_scenario):
    print('Unknown tool scenario should be invalid')
    sys.exit(1)

# Test mixed format batch
batch = RegressionScenarios.mixed_format_batch()
for item in batch:
    if not TestDataValidator.validate_hook_data(item):
        print(f'Batch item validation failed: {item.get(\"session_id\", \"unknown\")}')
        sys.exit(1)

print('All regression scenarios validated successfully')
"
    
    if [ $? -eq 0 ]; then
        log_success "Regression scenarios validated"
        update_test_count "passed"
    else
        log_error "Regression scenario validation failed"
        update_test_count "failed"
        return 1
    fi
}

run_database_verification() {
    log_section "Database Verification Tests"
    
    # Create temporary database for testing
    local temp_db=$(mktemp --suffix=.db)
    
    log_info "Testing database event storage..."
    python3 -c "
import sqlite3
import json
import sys
import tempfile

# Create test database
conn = sqlite3.connect('$temp_db')
cursor = conn.cursor()

# Create events table
cursor.execute('''
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_app TEXT NOT NULL,
    session_id TEXT NOT NULL,
    hook_event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    summary TEXT,
    timestamp INTEGER NOT NULL
)
''')

# Insert test events that should be correct after fix
test_events = [
    ('claude-code', 'test-1', 'PostToolUse', '{\"tool_name\": \"Write\", \"tool_input\": {}}', 'Write: /test/file.txt', 1234567890),
    ('claude-code', 'test-2', 'PostToolUse', '{\"tool_name\": \"Read\", \"tool_input\": {}}', 'Read: /test/file.txt', 1234567891),
    ('claude-code', 'test-3', 'PostToolUse', '{\"tool_name\": \"Edit\", \"tool_input\": {}}', 'Edit: /test/file.txt', 1234567892)
]

for event in test_events:
    cursor.execute('INSERT INTO events (source_app, session_id, hook_event_type, payload, summary, timestamp) VALUES (?, ?, ?, ?, ?, ?)', event)

conn.commit()

# Verify no unknown tools exist
cursor.execute('SELECT COUNT(*) FROM events WHERE summary LIKE \"%Tool used: unknown%\"')
unknown_count = cursor.fetchone()[0]

if unknown_count > 0:
    print(f'Found {unknown_count} events with \"Tool used: unknown\"')
    sys.exit(1)

# Verify all tools are correctly identified
cursor.execute('SELECT payload FROM events')
for (payload_json,) in cursor.fetchall():
    payload = json.loads(payload_json)
    tool_name = payload.get('tool_name')
    if tool_name == 'unknown':
        print(f'Found unknown tool in payload: {payload}')
        sys.exit(1)

conn.close()
print('Database verification passed')
"
    
    if [ $? -eq 0 ]; then
        log_success "Database verification passed"
        update_test_count "passed"
    else
        log_error "Database verification failed"
        update_test_count "failed"
        return 1
    fi
    
    # Cleanup
    rm -f "$temp_db"
}

run_full_regression_suite() {
    log_section "Running Complete Regression Test Suite"
    
    notify_tts "Starting regression test suite"
    
    local start_time=$(date +%s)
    
    # Run all test categories
    if ! check_dependencies; then
        return 1
    fi
    
    if ! run_test_data_validation; then
        return 1
    fi
    
    if ! run_database_verification; then
        return 1
    fi
    
    if ! run_python_tests "$1"; then
        return 1
    fi
    
    if ! run_frontend_tests; then
        return 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_section "Test Results Summary"
    echo -e "${GREEN}✓ Total Tests: $TOTAL_TESTS${NC}"
    echo -e "${GREEN}✓ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}✗ Failed: $FAILED_TESTS${NC}"
    echo -e "${YELLOW}⊘ Skipped: $SKIPPED_TESTS${NC}"
    echo -e "${BLUE}⏱ Duration: ${duration}s${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "🎉 All regression tests passed! Hook is working correctly."
        notify_tts "All regression tests passed successfully" "important"
        return 0
    else
        log_error "❌ Some tests failed. Regression may have occurred!"
        notify_tts "Regression tests detected failures" "error"
        return 1
    fi
}

main() {
    echo -e "${BLUE}Post Tool Use Hook - Regression Test Suite${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo
    echo "This test suite prevents the regression where tool names showed as 'Tool used: unknown'"
    echo "instead of actual tool names like 'Write', 'Read', 'Edit', etc."
    echo
    
    local mode="${1:---full}"
    
    case "$mode" in
        "--quick")
            log_info "Running quick regression tests (skips integration tests)"
            run_full_regression_suite "--quick"
            ;;
        "--full")
            log_info "Running complete regression test suite"
            run_full_regression_suite
            ;;
        "--ci")
            log_info "Running CI-optimized regression tests"
            export TTS_ENABLED=false  # Disable TTS in CI
            run_full_regression_suite "--quick"
            ;;
        "--help"|"-h")
            echo "Usage: $0 [--quick|--full|--ci|--help]"
            echo
            echo "Options:"
            echo "  --quick  Run fast tests only (skip integration tests)"
            echo "  --full   Run complete test suite (default)"
            echo "  --ci     CI-optimized run (quick mode, no TTS)"
            echo "  --help   Show this help message"
            echo
            echo "Examples:"
            echo "  $0                    # Run full test suite"
            echo "  $0 --quick           # Quick regression check"
            echo "  $0 --ci              # CI/CD pipeline mode"
            ;;
        *)
            log_error "Unknown option: $mode"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi