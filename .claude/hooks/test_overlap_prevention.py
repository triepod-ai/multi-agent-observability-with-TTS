#!/usr/bin/env python3
"""
Test script to verify TTS overlap prevention.
Simulates rapid hook calls that would normally cause audio overlap.
"""

import json
import subprocess
import threading
import time
from pathlib import Path

def trigger_hook(tool_name, description, delay=0):
    """Trigger a pre_tool_use hook after a delay."""
    time.sleep(delay)
    
    hook_path = Path(__file__).parent / "pre_tool_use.py"
    
    # Create test input
    test_input = {
        "tool": tool_name,
        "parameters": {
            "description": description,
            "prompt": f"Test {tool_name} operation",
            "command": "npm install" if tool_name == "Bash" else None
        }
    }
    
    # Run the hook
    process = subprocess.Popen(
        ["python3", str(hook_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    stdout, stderr = process.communicate(input=json.dumps(test_input))
    
    print(f"[{time.time():.2f}] Triggered {tool_name}: {description}")
    if process.returncode != 0:
        print(f"  ❌ Error: {stderr}")
    else:
        print(f"  ✅ Success")

def main():
    """Run overlap prevention test."""
    print("🧪 Testing TTS Overlap Prevention")
    print("This will trigger multiple hooks in rapid succession.")
    print("Listen for audio overlap - messages should play sequentially, not simultaneously.\n")
    
    # Create threads to simulate concurrent hook calls
    threads = []
    
    # Scenario 1: Multiple Task delegations
    print("Scenario 1: Multiple Task delegations (should hear sequentially)")
    for i in range(3):
        t = threading.Thread(
            target=trigger_hook,
            args=("Task", f"Task delegation {i+1}", i * 0.1)  # Very small delays
        )
        threads.append(t)
        t.start()
    
    # Wait for threads to complete
    for t in threads:
        t.join()
    
    time.sleep(3)  # Pause between scenarios
    
    # Scenario 2: Mixed operations triggered simultaneously
    print("\nScenario 2: Mixed operations (should hear sequentially)")
    threads = []
    
    operations = [
        ("Task", "Code review task"),
        ("Bash", "Long running build"),
        ("MultiEdit", "Bulk file changes"),
        ("mcp__qdrant__qdrant_store", "Memory storage")
    ]
    
    for op, desc in operations:
        t = threading.Thread(
            target=trigger_hook,
            args=(op, desc, 0)  # All at once!
        )
        threads.append(t)
        t.start()
    
    # Wait for all to complete
    for t in threads:
        t.join()
    
    print("\n✅ Test complete!")
    print("\nExpected behavior:")
    print("- All messages should play sequentially, not overlapping")
    print("- Each message should complete before the next starts")
    print("- No audio artifacts or cut-offs")
    
    print("\nIf you heard overlap, the coordination mechanism needs adjustment.")

if __name__ == "__main__":
    main()