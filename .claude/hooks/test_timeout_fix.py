#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Test script to verify timeout error detection fixes.
"""

import json
import sys
from pathlib import Path

# Add parent directory to path to import post_tool_use hook
sys.path.insert(0, str(Path(__file__).parent))
from post_tool_use import detect_error

def test_timeout_detection():
    """Test various scenarios for timeout detection."""
    
    test_cases = [
        {
            "name": "Real timeout error",
            "tool": "WebFetch",
            "parameters": {"url": "https://example.com"},
            "response": {
                "error": "Connection timeout after 5 seconds"
            },
            "should_detect_error": True,
            "expected_error_type": "timeout_error"
        },
        {
            "name": "File content with timeout word",
            "tool": "unknown",
            "parameters": {},
            "response": {
                "type": "text",
                "file": {
                    "content": "#!/usr/bin/env python\n# This script has a timeout of 30 seconds\nimport time\nDEFAULT_TIMEOUT = 5.0",
                    "filePath": "/some/file.py"
                }
            },
            "should_detect_error": False,
            "expected_error_type": None
        },
        {
            "name": "TodoWrite with timeout in description",
            "tool": "unknown", 
            "parameters": {},
            "response": {
                "oldTodos": [{"content": "Fix timeout errors", "status": "pending"}],
                "newTodos": [{"content": "Fix timeout errors", "status": "completed"}]
            },
            "should_detect_error": False,
            "expected_error_type": None
        },
        {
            "name": "Unknown tool with actual error",
            "tool": "unknown",
            "parameters": {},
            "response": {
                "error": "Failed to process request",
                "is_error": True
            },
            "should_detect_error": True,
            "expected_error_type": "explicit_error"
        },
        {
            "name": "Bash command timeout",
            "tool": "Bash",
            "parameters": {"command": "sleep 10"},
            "response": {
                "error": "Command timed out after 5 seconds",
                "returncode": -1
            },
            "should_detect_error": True,
            "expected_error_type": "timeout_error"
        },
        {
            "name": "MCP operation timeout",
            "tool": "mcp__chroma__list_collections",
            "parameters": {},
            "response": {
                "error": "Request timeout: Unable to connect to Chroma server"
            },
            "should_detect_error": True,
            "expected_error_type": "timeout_error"
        },
        {
            "name": "Regular successful operation",
            "tool": "Read",
            "parameters": {"file_path": "/some/file.txt"},
            "response": {
                "content": "File contents here",
                "lines": 10
            },
            "should_detect_error": False,
            "expected_error_type": None
        }
    ]
    
    print("Testing Timeout Detection Fix\n" + "="*40)
    
    all_passed = True
    for test in test_cases:
        error_info = detect_error(test["tool"], test["parameters"], test["response"])
        
        if test["should_detect_error"]:
            detected = error_info is not None
            correct_type = error_info and error_info.get("type") == test["expected_error_type"]
            passed = detected and correct_type
        else:
            detected = error_info is None
            passed = detected
        
        status = "✅ PASS" if passed else "❌ FAIL"
        
        print(f"\nTest: {test['name']}")
        print(f"Tool: {test['tool']}")
        print(f"Should detect error: {test['should_detect_error']}")
        print(f"Error detected: {error_info is not None}")
        if error_info:
            print(f"Error type: {error_info.get('type')}")
            print(f"Error message: {error_info.get('message')}")
        print(f"Status: {status}")
        
        if not passed:
            all_passed = False
            print(f"FAILED: Expected error detection: {test['should_detect_error']}, got: {error_info is not None}")
            if test["should_detect_error"] and error_info:
                print(f"Expected error type: {test['expected_error_type']}, got: {error_info.get('type')}")
    
    print("\n" + "="*40)
    print(f"Overall: {'✅ All tests passed!' if all_passed else '❌ Some tests failed'}")
    
    return all_passed

if __name__ == '__main__':
    success = test_timeout_detection()
    sys.exit(0 if success else 1)