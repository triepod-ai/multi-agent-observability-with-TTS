#!/usr/bin/env python3
"""
Test script for enhanced post_tool_use.py hook.
Tests success milestone detection, error pattern detection, and bulk operation summarization.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

# Test scenarios for success milestones
success_scenarios = [
    {
        "name": "Build Success",
        "input": {
            "tool": "Bash",
            "parameters": {"command": "npm build"},
            "tool_response": {
                "returncode": 0,
                "stdout": "Build successful! Finished in 12.5 seconds",
                "stderr": ""
            }
        },
        "expected": "Build completed successfully"
    },
    {
        "name": "Test Success",
        "input": {
            "tool": "Bash",
            "parameters": {"command": "npm test"},
            "tool_response": {
                "returncode": 0,
                "stdout": "Test Suites: 5 passed, 5 total\nTests: 42 passed, 42 total\nSnapshots: 0 total\nTime: 8.234s",
                "stderr": ""
            }
        },
        "expected": "All 42 tests passed"
    },
    {
        "name": "Git Push Success",
        "input": {
            "tool": "Bash",
            "parameters": {"command": "git push origin main"},
            "tool_response": {
                "returncode": 0,
                "stdout": "To github.com:user/repo.git\n   abc123..def456  main -> main\nEverything up-to-date",
                "stderr": ""
            }
        },
        "expected": "Code pushed to remote repository"
    },
    {
        "name": "Bulk Edit Success",
        "input": {
            "tool": "MultiEdit",
            "parameters": {
                "file_path": "/tmp/large_file.js",
                "edits": [{"old_string": f"old{i}", "new_string": f"new{i}"} for i in range(15)]
            },
            "tool_response": {
                "type": "update",
                "message": "Successfully updated file"
            }
        },
        "expected": "Successfully applied 15 changes"
    },
    {
        "name": "Subagent Task Success",
        "input": {
            "tool": "Task",
            "parameters": {
                "description": "Review code for security vulnerabilities",
                "prompt": "Check all files for security issues"
            },
            "tool_response": {
                "success": True,
                "result": "No vulnerabilities found"
            }
        },
        "expected": "Subagent completed"
    }
]

# Test scenarios for error patterns
error_scenarios = [
    {
        "name": "Permission Error",
        "input": {
            "tool": "Write",
            "parameters": {"file_path": "/root/protected.txt"},
            "tool_response": {
                "error": "Permission denied: Cannot write to /root/protected.txt"
            }
        },
        "expected": "File operation error"
    },
    {
        "name": "Timeout Error",
        "input": {
            "tool": "WebFetch",
            "parameters": {"url": "https://slow-server.com/api"},
            "tool_response": {
                "error": "Request timeout after 30 seconds"
            }
        },
        "expected": "Operation timed out"
    },
    {
        "name": "Command Failed",
        "input": {
            "tool": "Bash",
            "parameters": {"command": "npm install nonexistent-package"},
            "tool_response": {
                "returncode": 1,
                "stdout": "",
                "stderr": "npm ERR! 404 Not Found: nonexistent-package"
            }
        },
        "expected": "npm command failed"
    }
]

def test_hook(scenario, scenario_type="success"):
    """Test a single scenario by invoking the hook."""
    print(f"\n{'='*60}")
    print(f"Testing: {scenario['name']} ({scenario_type})")
    print(f"{'='*60}")
    
    # Prepare the hook path
    hook_path = Path(__file__).parent / "post_tool_use.py"
    
    # Add session_id to the input
    scenario["input"]["session_id"] = "test-session-123"
    
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
    else:
        print(f"❌ Hook failed with code {process.returncode}")
        if stderr:
            print(f"Error: {stderr}")
    
    if stdout:
        print(f"Output: {stdout}")
    
    # Small delay between tests
    time.sleep(0.5)

def test_error_patterns():
    """Test error pattern detection by triggering the same error multiple times."""
    print("\n" + "="*60)
    print("Testing Error Pattern Detection")
    print("="*60)
    print("Triggering the same error 3 times to detect pattern...")
    
    error_scenario = {
        "name": "Repeated Permission Error",
        "input": {
            "tool": "Write",
            "parameters": {"file_path": "/root/protected.txt"},
            "tool_response": {
                "error": "Permission denied: Cannot write to /root/protected.txt"
            },
            "session_id": "test-session-123"
        },
        "expected": "Repeated 3 times"
    }
    
    hook_path = Path(__file__).parent / "post_tool_use.py"
    
    # Trigger the same error 3 times
    for i in range(3):
        print(f"\nTrigger {i+1}:")
        process = subprocess.Popen(
            ["python3", str(hook_path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=json.dumps(error_scenario["input"]))
        print(f"  Result: {'Success' if process.returncode == 0 else 'Failed'}")
        
        time.sleep(0.5)  # Small delay between errors
    
    print("\nThe third occurrence should trigger pattern detection with suggestions!")

def main():
    """Run all test scenarios."""
    print("🧪 Testing Enhanced PostToolUse Hook")
    
    # Test success milestones
    print("\n📊 Testing Success Milestone Detection")
    for scenario in success_scenarios:
        test_hook(scenario, "success")
    
    # Test error detection
    print("\n❌ Testing Error Detection")
    for scenario in error_scenarios:
        test_hook(scenario, "error")
    
    # Test error pattern detection
    test_error_patterns()
    
    print("\n✅ All tests completed!")
    print("\nNote: Check your audio output to verify TTS notifications.")
    print("Also check the logs directories:")
    print("- Error logs: logs/hooks/post_tool_use_errors/")
    print("- Success logs: logs/hooks/post_tool_use_success/")
    print("- Error patterns: logs/hooks/error_patterns.json")

if __name__ == "__main__":
    main()