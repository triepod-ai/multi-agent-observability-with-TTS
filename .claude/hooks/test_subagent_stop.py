#!/usr/bin/env python3
"""
Test script for enhanced subagent_stop.py hook.
Tests context-rich announcements for various subagent types.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

# Test scenarios for different subagent types
test_scenarios = [
    {
        "name": "Code Review Agent Success",
        "input": {
            "session_id": "test-session-123",
            "agent_name": "code-reviewer",
            "task_description": "Review recent changes for code quality",
            "duration": 45.2,
            "result": "Code review completed. Reviewed 5 files. Found 2 minor issues with variable naming. Overall code quality is good.",
            "files_affected": 5
        },
        "expected": "Code review completed for 5 files"
    },
    {
        "name": "Test Runner Agent All Pass",
        "input": {
            "session_id": "test-session-123",
            "agent_name": "test-runner",
            "task_description": "Run all unit tests",
            "start_time": "2025-07-26T16:00:00",
            "end_time": "2025-07-26T16:00:23",
            "output": "Test Suites: 8 passed, 8 total\nTests: 156 tests passed, 156 total\nTime: 23s"
        },
        "expected": "All 156 tests passed"
    },
    {
        "name": "Test Runner Agent With Failures",
        "input": {
            "session_id": "test-session-123",
            "agent_name": "qa-agent",
            "task_description": "Run integration tests",
            "duration": 67,
            "result": "Tests completed. 45 tests ran. 3 tests failed due to API timeout."
        },
        "expected": "Test run completed with failures"
    },
    {
        "name": "Debugger Agent Fixed Issues",
        "input": {
            "session_id": "test-session-123",
            "subagent_name": "debugger",
            "task": "Debug TypeError in user dashboard",
            "duration": 120,
            "response": "Found and fixed the TypeError. The issue was caused by undefined props. Added proper null checks and error boundaries."
        },
        "expected": "Debugger found and fixed issues"
    },
    {
        "name": "Data Analyst Agent",
        "input": {
            "session_id": "test-session-123",
            "type": "data-scientist",
            "description": "Analyze user engagement metrics",
            "duration": 89.5,
            "result": "Analysis completed. Summary: User engagement up 23% this month"
        },
        "expected": "Data analysis completed"
    },
    {
        "name": "Generic Agent with Task",
        "input": {
            "session_id": "test-session-123",
            "name": "optimizer",
            "prompt": "Optimize database queries for better performance",
            "duration": 156.7,
            "output": "Optimization complete. Improved query performance by 40%."
        },
        "expected": "Agent completed: Optimize database queries"
    },
    {
        "name": "Unknown Agent Type",
        "input": {
            "session_id": "test-session-123"
        },
        "expected": "Unknown Agent completed successfully"
    }
]

def test_hook(scenario):
    """Test a single scenario by invoking the hook."""
    print(f"\n{'='*60}")
    print(f"Testing: {scenario['name']}")
    print(f"{'='*60}")
    
    # Prepare the hook path
    hook_path = Path(__file__).parent / "subagent_stop.py"
    
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
    
    # Extract duration info if available
    if 'duration' in scenario['input']:
        duration = scenario['input']['duration']
        if duration < 60:
            print(f"Duration info: {int(duration)} seconds")
        else:
            print(f"Duration info: {duration/60:.1f} minutes")
    
    # Small delay between tests
    time.sleep(0.5)

def main():
    """Run all test scenarios."""
    print("🧪 Testing Enhanced SubagentStop Hook")
    print(f"Running {len(test_scenarios)} test scenarios...")
    
    for scenario in test_scenarios:
        test_hook(scenario)
    
    print("\n✅ All tests completed!")
    print("\nNote: Check your audio output to verify context-rich TTS notifications.")
    print("Messages should include:")
    print("- Agent type context (code review, testing, debugging, etc.)")
    print("- Quantitative results (files reviewed, tests passed)")
    print("- Duration information when available")
    print("- Error/success status")

if __name__ == "__main__":
    main()