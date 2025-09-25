#!/bin/bash

# Quick Regression Test Setup Validation
# This script validates that all regression test components are properly installed

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd 2>/dev/null || pwd)"
echo "🔍 Testing Regression Test Setup"
echo "================================="
echo "Project root: $PROJECT_ROOT"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

success_count=0
total_tests=8

test_result() {
    local test_name="$1"
    local result="$2"

    if [ "$result" = "0" ]; then
        echo -e "✅ ${test_name}"
        ((success_count++))
    else
        echo -e "❌ ${test_name}"
    fi
}

echo "📋 Component Verification"
echo "--------------------------"

# Test 1: Shell regression test exists
if [ -f "bin/run-regression-tests.sh" ] && [ -x "bin/run-regression-tests.sh" ]; then
    test_result "Shell regression test script exists and is executable" 0
else
    test_result "Shell regression test script missing or not executable" 1
fi

# Test 2: API integration test exists
if [ -f "bin/test-install-fix.sh" ] && [ -x "bin/test-install-fix.sh" ]; then
    test_result "API integration test script exists and is executable" 0
else
    test_result "API integration test script missing or not executable" 1
fi

# Test 3: Playwright test exists
if [ -f "apps/client/tests/e2e/hook-coverage-modal.spec.ts" ]; then
    test_result "Playwright E2E test file exists" 0
else
    test_result "Playwright E2E test file missing" 1
fi

# Test 4: Documentation exists
if [ -f "docs/REGRESSION_TEST_DOCUMENTATION.md" ]; then
    test_result "Regression test documentation exists" 0
else
    test_result "Regression test documentation missing" 1
fi

# Test 5: Vite proxy configuration
if grep -q "proxy:" "apps/client/vite.config.ts" 2>/dev/null; then
    test_result "Vite proxy configuration present" 0
else
    test_result "Vite proxy configuration missing" 1
fi

# Test 6: Services running
if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    test_result "Server is running on port 4000" 0
else
    test_result "Server not running on port 4000" 1
fi

if curl -s http://localhost:8543 > /dev/null 2>&1; then
    test_result "Client is running on port 8543" 0
else
    test_result "Client not running on port 8543" 1
fi

# Test 7: Playwright configuration
if [ -f "apps/client/playwright.config.ts" ]; then
    if grep -q "testDir: './tests/e2e'" "apps/client/playwright.config.ts" 2>/dev/null; then
        test_result "Playwright configuration is correct" 0
    else
        test_result "Playwright configuration needs adjustment" 1
    fi
else
    test_result "Playwright configuration missing" 1
fi

echo ""
echo "🧪 Quick Functional Tests"
echo "--------------------------"

# Test the key functionality that was fixed
echo -n "Testing API endpoint accessibility... "
if curl -s "http://localhost:4000/api/hooks/user_prompt_submit/events?limit=1" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((success_count++))
else
    echo -e "${RED}✗${NC}"
fi
total_tests=$((total_tests + 1))

echo -n "Testing proxy forwarding... "
if curl -s "http://localhost:8543/api/hooks/coverage" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((success_count++))
else
    echo -e "${RED}✗${NC}"
fi
total_tests=$((total_tests + 1))

echo ""
echo "📊 Summary"
echo "----------"
echo "Tests passed: $success_count/$total_tests"

if [ $success_count -eq $total_tests ]; then
    echo -e "${GREEN}🎉 All regression test components are properly configured!${NC}"
    echo ""
    echo "Available test commands:"
    echo "  ./bin/run-regression-tests.sh          # Full regression suite"
    echo "  ./bin/test-install-fix.sh              # API integration tests"
    echo "  cd apps/client && npx playwright test  # E2E tests (all browsers)"
    echo "  cd apps/client && npx playwright test --project=chromium  # Chrome only"
    echo ""
    echo "The Hook Coverage Modal regression is now protected! 🛡️"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some components need attention (see above)${NC}"
    echo ""
    echo "Please ensure both services are running:"
    echo "  Terminal 1: cd apps/server && bun dev"
    echo "  Terminal 2: cd apps/client && npm run dev"
    echo ""
    exit 1
fi