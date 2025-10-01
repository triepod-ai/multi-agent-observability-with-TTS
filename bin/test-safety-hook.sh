#!/bin/bash

# Test Safety Hook - Validates dangerous command detection
# This script tests the pre_tool_use_safety.py hook with various dangerous commands

set -euo pipefail

SAFETY_HOOK="/home/bryan/multi-agent-observability-system/.claude/hooks/pre_tool_use_safety.py"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing Safety Hook${NC}"
echo -e "${BLUE}====================${NC}\n"

# Test counter
PASSED=0
FAILED=0

# Test function
test_command() {
    local command="$1"
    local should_block="$2"
    local description="$3"

    echo -e "${BLUE}Testing: $description${NC}"
    echo -e "  Command: $command"

    # Create test input
    local test_input=$(cat <<EOF
{
  "tool": "Bash",
  "parameters": {
    "command": "$command"
  }
}
EOF
)

    # Run the safety hook
    if echo "$test_input" | "$SAFETY_HOOK" 2>/dev/null; then
        local result="ALLOWED"
    else
        local result="BLOCKED"
    fi

    # Check if result matches expectation
    if [ "$should_block" = "true" ] && [ "$result" = "BLOCKED" ]; then
        echo -e "  ${GREEN}✅ PASS - Correctly blocked${NC}\n"
        ((PASSED++))
    elif [ "$should_block" = "false" ] && [ "$result" = "ALLOWED" ]; then
        echo -e "  ${GREEN}✅ PASS - Correctly allowed${NC}\n"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ FAIL - Expected: $([ "$should_block" = "true" ] && echo "BLOCKED" || echo "ALLOWED"), Got: $result${NC}\n"
        ((FAILED++))
    fi
}

# Test dangerous commands (should be blocked)
echo -e "${RED}=== Dangerous Commands (Should Block) ===${NC}\n"

test_command "rm -rf .*" "true" "Delete all hidden files"
test_command "rm -rf .bash*" "true" "Delete bash config files"
test_command "rm -rf ~/.*" "true" "Delete all hidden files in home"
test_command "rm -rf ." "true" "Delete current directory"
test_command "rm -rf .." "true" "Delete parent directory"
test_command "rm -rf /" "true" "Delete root directory"
test_command "rm -rf /etc" "true" "Delete system config"
test_command "rm -rf /usr" "true" "Delete system binaries"
test_command "rm -rf *" "true" "Delete all files with wildcard"
test_command "find . -name '*.txt' | xargs rm" "true" "Dangerous find + xargs + rm"
test_command "find . -name '*.txt' -exec rm {} \\;" "true" "Dangerous find -exec rm"
test_command "dd if=/dev/zero of=/dev/sda" "true" "Write to disk device"

# Test safe commands (should be allowed)
echo -e "${GREEN}=== Safe Commands (Should Allow) ===${NC}\n"

test_command "rm file.txt" "false" "Delete specific file"
test_command "rm -f /tmp/test.log" "false" "Delete temp file"
test_command "rm -rf node_modules" "false" "Delete node_modules"
test_command "rm -rf __pycache__" "false" "Delete Python cache"
test_command "rm -rf build/" "false" "Delete build directory"
test_command "rm *.pyc" "false" "Delete Python compiled files"
test_command "find /tmp -name '*.log' -delete" "false" "Delete logs in tmp"
test_command "ls -la" "false" "List files"
test_command "echo 'Hello World'" "false" "Echo command"
test_command "npm install" "false" "Package manager"

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed!${NC}"
    exit 1
fi
