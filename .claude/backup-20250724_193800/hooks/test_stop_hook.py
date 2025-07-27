#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Test script for enhanced stop hook summary generation.
"""

import json
import sys
import os
from pathlib import Path

# Add parent directory to path to import stop hook
sys.path.insert(0, str(Path(__file__).parent))
from stop import analyze_session_activity, generate_summary

def test_summaries():
    """Test various scenarios for summary generation."""
    
    test_cases = [
        {
            "name": "UI Component Work",
            "analysis": {
                "tools_used": {"Magic", "Write", "Edit"},
                "files_modified": {"EventCard.vue", "SessionSwimLane.vue", "SmartFilterBar.vue"},
                "commands_run": [],
                "last_prompt": "design a more intuitive UI",
                "key_actions": [],
                "test_results": None,
                "errors_encountered": False
            },
            "expected": "building 3 UI components"
        },
        {
            "name": "Documentation Update",
            "analysis": {
                "tools_used": {"Read", "Edit"},
                "files_modified": {"README.md", "HOOKS_DOCUMENTATION.md"},
                "commands_run": [],
                "last_prompt": "update the hook documentation",
                "key_actions": [],
                "test_results": None,
                "errors_encountered": False
            },
            "expected": "updating 2 docs"
        },
        {
            "name": "Hook Enhancement",
            "analysis": {
                "tools_used": {"Read", "Edit", "Write"},
                "files_modified": {"hooks/stop.py", "hooks/notification.py"},
                "commands_run": [],
                "last_prompt": "enhance the stop event",
                "key_actions": [],
                "test_results": None,
                "errors_encountered": False
            },
            "expected": "updating 2 hooks"
        },
        {
            "name": "Running Tests",
            "analysis": {
                "tools_used": {"Bash"},
                "files_modified": set(),
                "commands_run": ["npm test"],
                "last_prompt": "run the tests",
                "key_actions": [],
                "test_results": "tests run",
                "errors_encountered": False
            },
            "expected": "running tests"
        },
        {
            "name": "Fixing Issues",
            "analysis": {
                "tools_used": {"Read", "Edit"},
                "files_modified": {"http_client.py"},
                "commands_run": [],
                "last_prompt": "fix the timeout error",
                "key_actions": [],
                "test_results": None,
                "errors_encountered": False
            },
            "expected": "fixing issues"
        },
        {
            "name": "Generic Request",
            "analysis": {
                "tools_used": {"Read"},
                "files_modified": set(),
                "commands_run": [],
                "last_prompt": None,
                "key_actions": [],
                "test_results": None,
                "errors_encountered": False
            },
            "expected": "completing your request"
        }
    ]
    
    print("Testing Stop Hook Summary Generation\n" + "="*40)
    
    all_passed = True
    for test in test_cases:
        # Debug hook detection for failing test
        if test["name"] == "Hook Enhancement":
            print(f"\nDEBUG - Files: {test['analysis']['files_modified']}")
            files = test['analysis']['files_modified']
            for f in files:
                print(f"  - {f}: has .py={'.py' in str(f)}, has hook={('hook' in str(f).lower())}")
        
        summary = generate_summary(test["analysis"])
        passed = summary == test["expected"]
        status = "✅ PASS" if passed else "❌ FAIL"
        
        print(f"\nTest: {test['name']}")
        print(f"Expected: '{test['expected']}'")
        print(f"Got:      '{summary}'")
        print(f"Status:   {status}")
        
        if not passed:
            all_passed = False
    
    print("\n" + "="*40)
    print(f"Overall: {'✅ All tests passed!' if all_passed else '❌ Some tests failed'}")
    
    # Test the full message format
    print("\n\nExample TTS Messages:")
    print("-"*40)
    engineer_name = os.getenv('ENGINEER_NAME', 'Bryan')
    for test in test_cases[:3]:
        summary = generate_summary(test["analysis"])
        print(f"{engineer_name}, I have finished {summary}")

if __name__ == '__main__':
    test_summaries()