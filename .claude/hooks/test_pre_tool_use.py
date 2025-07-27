#!/usr/bin/env python3
"""
Test script for enhanced pre_tool_use.py hook.
Tests various scenarios including complex operations, long-running tasks, and risky commands.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

# Test scenarios
test_scenarios = [
    {
        "name": "Task Tool - Code Review",
        "input": {
            "tool": "Task",
            "parameters": {
                "description": "Review code changes",
                "prompt": "Use the code review agent to check the recent changes"
            }
        },
        "expected": "Delegating to code reviewer agent"
    },
    {
        "name": "Task Tool - Debugging",
        "input": {
            "tool": "Task",
            "parameters": {
                "description": "Debug test failures",
                "prompt": "Debug the failing test cases and fix them"
            }
        },
        "expected": "Delegating to debugger agent"
    },
    {
        "name": "Risky Bash Command",
        "input": {
            "tool": "Bash",
            "parameters": {
                "command": "rm -rf /tmp/test_directory"
            }
        },
        "expected": "⚠️ CAUTION:"
    },
    {
        "name": "Long-running npm install",
        "input": {
            "tool": "Bash",
            "parameters": {
                "command": "npm install express"
            }
        },
        "expected": "Starting 30+ seconds operation:"
    },
    {
        "name": "Bulk MultiEdit",
        "input": {
            "tool": "MultiEdit",
            "parameters": {
                "file_path": "/tmp/test.js",
                "edits": [{"old_string": "a", "new_string": "b"} for _ in range(15)]
            }
        },
        "expected": "bulk changes"
    },
    {
        "name": "MCP Memory Operation",
        "input": {
            "tool": "mcp__qdrant__qdrant_store",
            "parameters": {
                "collection_name": "test",
                "information": "test data"
            }
        },
        "expected": "Starting 5-15 seconds operation:"
    },
    {
        "name": "WebFetch Operation",
        "input": {
            "tool": "WebFetch",
            "parameters": {
                "url": "https://example.com/api/data"
            }
        },
        "expected": "Starting 3-10 seconds operation:"
    },
    {
        "name": "TodoWrite with Tasks",
        "input": {
            "tool": "TodoWrite",
            "parameters": {
                "todos": [
                    {"status": "pending", "content": "Task 1"},
                    {"status": "pending", "content": "Task 2"},
                    {"status": "completed", "content": "Task 3"}
                ]
            }
        },
        "expected": "(2 pending tasks)"
    }
]

def test_hook(scenario):
    """Test a single scenario by invoking the hook."""
    print(f"\n{'='*60}")
    print(f"Testing: {scenario['name']}")
    print(f"{'='*60}")
    
    # Prepare the hook path
    hook_path = Path(__file__).parent / "pre_tool_use.py"
    
    # Run the hook with the test input
    process = subprocess.Popen(
        ["python3", str(hook_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Send the test input
    input_json = json.dumps(scenario["input"])
    stdout, stderr = process.communicate(input=input_json)
    
    # Check the result
    if process.returncode == 0:
        print(f"✅ Hook executed successfully")
        print(f"Expected in message: {scenario['expected']}")
        
        # Check if a TTS notification was likely triggered
        # (We can't easily capture the speak command output, but we can check logs)
        log_dir = Path(__file__).parent.parent.parent / "logs" / "hooks" / "pre_tool_use"
        if log_dir.exists():
            print(f"📁 Logs directory exists: {log_dir}")
    else:
        print(f"❌ Hook failed with code {process.returncode}")
        if stderr:
            print(f"Error: {stderr}")
    
    if stdout:
        print(f"Output: {stdout}")
    
    # Small delay between tests
    time.sleep(0.5)

def main():
    """Run all test scenarios."""
    print("🧪 Testing Enhanced PreToolUse Hook")
    print(f"Running {len(test_scenarios)} test scenarios...")
    
    for scenario in test_scenarios:
        test_hook(scenario)
    
    print("\n✅ All tests completed!")
    print("\nNote: Check your audio output to verify TTS notifications were triggered.")
    print("Also check the logs directory for detailed event logging.")

if __name__ == "__main__":
    main()