#!/usr/bin/env python3
"""
Simple test script for SessionStart hook without TTS dependencies
"""

import json
import subprocess
import sys
import os
from pathlib import Path

def test_session_start_hook_simple(source_type="startup"):
    """Test the SessionStart hook with TTS disabled."""
    # Disable TTS to avoid timeout issues
    env = os.environ.copy()
    env['TTS_ENABLED'] = 'false'
    
    # Prepare test input
    test_input = {
        "session_id": "test-session-123",
        "transcript_path": "~/.claude/projects/test/session.jsonl",
        "hook_event_name": "SessionStart",
        "source": source_type
    }
    
    # Convert to JSON
    input_json = json.dumps(test_input)
    
    # Run the hook
    hook_path = Path(__file__).parent / "session_start.py"
    
    try:
        result = subprocess.run(
            ["python3", str(hook_path)],
            input=input_json,
            text=True,
            capture_output=True,
            timeout=5,
            env=env
        )
        
        print(f"=== SessionStart Hook Test ({source_type}) ===")
        print(f"Exit code: {result.returncode}")
        if result.stdout:
            print(f"Context Output (first 300 chars):\n{result.stdout[:300]}...")
        if result.stderr:
            print(f"STDERR:\n{result.stderr}")
        print("=" * 50)
        
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print(f"SessionStart hook test timed out ({source_type})")
        return False
    except Exception as e:
        print(f"Error testing SessionStart hook ({source_type}): {e}")
        return False

def main():
    """Run simplified SessionStart hook tests."""
    print("Testing SessionStart Hook Implementation (TTS Disabled)")
    print("=" * 60)
    
    # Test all source types
    test_results = []
    for source in ["startup", "resume", "clear"]:
        result = test_session_start_hook_simple(source)
        test_results.append((source, result))
    
    # Summary
    print("\n=== Test Results ===")
    for source, passed in test_results:
        status = "PASS" if passed else "FAIL"
        print(f"{source}: {status}")
    
    all_passed = all(result for _, result in test_results)
    print(f"\nOverall: {'PASS' if all_passed else 'FAIL'}")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())