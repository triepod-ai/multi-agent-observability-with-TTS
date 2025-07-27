#!/usr/bin/env python3
"""
Test script for TTS queue coordination in hooks.
Tests that multiple simultaneous TTS calls are queued properly.
"""

import sys
import time
import threading
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Import the coordinated speak module
try:
    from utils.tts.coordinated_speak import notify_tts_coordinated, is_coordinator_available
    print("✓ Successfully imported coordinated_speak module")
except ImportError as e:
    print(f"✗ Failed to import coordinated_speak module: {e}")
    sys.exit(1)

def test_single_message():
    """Test a single coordinated TTS message."""
    print("\n--- Testing single message ---")
    
    if is_coordinator_available():
        print("✓ Queue coordinator is available")
    else:
        print("⚠ Queue coordinator not available - messages will use direct speak")
    
    success = notify_tts_coordinated(
        message="Testing queue coordination",
        priority="normal",
        hook_type="test"
    )
    
    if success:
        print("✓ Single message sent successfully")
    else:
        print("✗ Failed to send single message")
    
    return success

def send_concurrent_message(msg_id: int, delay: float = 0):
    """Send a message from a thread."""
    if delay > 0:
        time.sleep(delay)
    
    priority = ["normal", "important", "error"][msg_id % 3]
    
    success = notify_tts_coordinated(
        message=f"Concurrent message {msg_id}",
        priority=priority,
        hook_type="test",
        metadata={"thread_id": msg_id}
    )
    
    print(f"  Thread {msg_id} ({priority}): {'✓' if success else '✗'}")
    return success

def test_concurrent_messages():
    """Test multiple concurrent TTS messages."""
    print("\n--- Testing concurrent messages ---")
    
    threads = []
    for i in range(5):
        t = threading.Thread(
            target=send_concurrent_message,
            args=(i, i * 0.1)  # Stagger slightly
        )
        threads.append(t)
        t.start()
    
    # Wait for all threads
    for t in threads:
        t.join()
    
    print("✓ All concurrent messages sent")

def test_priority_ordering():
    """Test that priority messages are handled correctly."""
    print("\n--- Testing priority ordering ---")
    
    # Send messages with different priorities quickly
    messages = [
        ("Low priority message", "normal"),
        ("High priority message", "important"),
        ("Critical error message", "error"),
        ("Another normal message", "normal")
    ]
    
    for msg, priority in messages:
        success = notify_tts_coordinated(
            message=msg,
            priority=priority,
            hook_type="test"
        )
        print(f"  {priority}: {'✓' if success else '✗'}")
        time.sleep(0.05)  # Small delay between messages

def main():
    """Run all tests."""
    print("=== TTS Queue Coordination Test ===")
    
    # Check if coordinator is available
    if not is_coordinator_available():
        print("\n⚠️  Queue coordinator is not running!")
        print("   Start it with: speak-coordinator start")
        print("   Tests will use fallback to direct speak\n")
    
    # Run tests
    test_single_message()
    test_concurrent_messages()
    test_priority_ordering()
    
    print("\n=== Test completed ===")
    print("\nNote: If the coordinator is running, messages should play")
    print("sequentially without overlap. Higher priority messages")
    print("may preempt lower priority ones.")

if __name__ == "__main__":
    main()