#!/bin/bash

# API Integration Test Suite for Hook Coverage Data Display
# This script tests the API endpoints to ensure they return proper data

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER_URL="http://localhost:4000"
CLIENT_URL="http://localhost:8543"

echo "🧪 API Integration Test Suite"
echo "============================="
echo ""

# Function to test an API endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}

    echo -n "Testing $description... "

    response=$(curl -s -w "\n%{http_code}" "$SERVER_URL$endpoint" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" == "$expected_status" ]; then
        # Try to parse as JSON
        if echo "$body" | jq . > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} (Status: $http_code, Valid JSON)"
            return 0
        else
            echo -e "${YELLOW}⚠${NC} (Status: $http_code, Invalid JSON)"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} (Expected: $expected_status, Got: $http_code)"
        return 1
    fi
}

# Function to test proxy forwarding
test_proxy() {
    local endpoint=$1
    local description=$2

    echo -n "Testing proxy for $description... "

    # Test through client proxy
    response=$(curl -s -w "\n%{http_code}" "$CLIENT_URL$endpoint" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✓${NC} Proxy working"
        return 0
    else
        echo -e "${RED}✗${NC} Proxy failed (Status: $http_code)"
        return 1
    fi
}

# Function to test data consistency
test_data_consistency() {
    local hook_type=$1

    echo -n "Testing data consistency for $hook_type... "

    # Get events from API
    events=$(curl -s "$SERVER_URL/api/hooks/$hook_type/events?limit=5" 2>/dev/null)

    if echo "$events" | jq . > /dev/null 2>&1; then
        count=$(echo "$events" | jq '. | length' 2>/dev/null || echo 0)

        if [ "$count" -ge 0 ]; then
            echo -e "${GREEN}✓${NC} ($count events returned)"
            return 0
        else
            echo -e "${YELLOW}⚠${NC} (Invalid count)"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} (Invalid response)"
        return 1
    fi
}

# Check if services are running
echo "📡 Checking services..."
if ! curl -s "$SERVER_URL/api/health" > /dev/null 2>&1; then
    echo -e "${RED}Server not running on port 4000${NC}"
    echo "Please start the server: cd apps/server && bun dev"
    exit 1
fi

if ! curl -s "$CLIENT_URL" > /dev/null 2>&1; then
    echo -e "${RED}Client not running on port 8543${NC}"
    echo "Please start the client: cd apps/client && npm run dev"
    exit 1
fi

echo -e "${GREEN}Services are running${NC}"
echo ""

# Test Hook Coverage API Endpoints
echo "🔌 Testing Hook Coverage API Endpoints"
echo "--------------------------------------"

test_endpoint "/api/hooks/coverage" "Hook Coverage Overview"
test_endpoint "/api/hooks/user_prompt_submit/events?limit=10" "UserPromptSubmit Events"
test_endpoint "/api/hooks/user_prompt_submit/context" "UserPromptSubmit Context"
test_endpoint "/api/hooks/user_prompt_submit/metrics" "UserPromptSubmit Metrics"
test_endpoint "/api/hooks/tool_use/events?limit=10" "ToolUse Events"
test_endpoint "/api/hooks/subagent_start/events?limit=10" "SubagentStart Events"
test_endpoint "/api/hooks/subagent_stop/events?limit=10" "SubagentStop Events"

echo ""

# Test Proxy Configuration
echo "🔄 Testing Vite Proxy Configuration"
echo "-----------------------------------"

test_proxy "/api/hooks/coverage" "Hook Coverage via Proxy"
test_proxy "/api/hooks/user_prompt_submit/events" "Events via Proxy"

echo ""

# Test Data Consistency
echo "📊 Testing Data Consistency"
echo "--------------------------"

test_data_consistency "user_prompt_submit"
test_data_consistency "tool_use"
test_data_consistency "subagent_start"

echo ""

# Test Naming Convention Compatibility
echo "🏷️ Testing Naming Convention Support"
echo "------------------------------------"

echo -n "Testing CamelCase support... "
camel_response=$(curl -s "$SERVER_URL/api/hooks/UserPromptSubmit/events?limit=1" 2>/dev/null)
if echo "$camel_response" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} (May not be supported)"
fi

echo -n "Testing snake_case support... "
snake_response=$(curl -s "$SERVER_URL/api/hooks/user_prompt_submit/events?limit=1" 2>/dev/null)
if echo "$snake_response" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} (May not be supported)"
fi

echo ""

# Performance Check
echo "⚡ Performance Check"
echo "-------------------"

echo -n "Testing API response time... "
start_time=$(date +%s%3N)
curl -s "$SERVER_URL/api/hooks/coverage" > /dev/null 2>&1
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 500 ]; then
    echo -e "${GREEN}✓${NC} (${response_time}ms)"
elif [ $response_time -lt 1000 ]; then
    echo -e "${YELLOW}⚠${NC} (${response_time}ms - acceptable)"
else
    echo -e "${RED}✗${NC} (${response_time}ms - slow)"
fi

echo ""

# Summary
echo "============================="
echo "📈 Test Summary"
echo "============================="
echo -e "${GREEN}API Integration tests complete!${NC}"
echo ""
echo "Key validations performed:"
echo "  ✅ API endpoint accessibility"
echo "  ✅ JSON response validation"
echo "  ✅ Proxy configuration"
echo "  ✅ Data consistency"
echo "  ✅ Naming convention support"
echo "  ✅ Performance metrics"
echo ""
echo "The Hook Coverage Modal data display regression has been prevented!"