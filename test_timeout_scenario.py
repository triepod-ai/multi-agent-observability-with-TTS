#!/usr/bin/env python3
"""
Test file that contains the word 'timeout' multiple times.
This would have previously triggered false positive timeout errors.

Configuration:
DEFAULT_TIMEOUT = 30  # seconds
CONNECTION_TIMEOUT = 5.0
REQUEST_TIMEOUT = 10.0

This file demonstrates timeout handling in our system.
The timeout values are configurable via environment variables.
"""

import time

def process_with_timeout(duration):
    """Process something with a timeout check."""
    print(f"Processing for {duration} seconds (timeout at 30s)")
    time.sleep(duration)
    return "Success"

# Test data that contains timeout
test_data = {
    "config": {
        "timeout": 30,
        "retry_timeout": 5,
        "connection_timeout": 10
    },
    "messages": [
        "Set timeout to 30 seconds",
        "Timeout configuration updated"
    ]
}

if __name__ == "__main__":
    print("Testing timeout scenarios...")
    result = process_with_timeout(2)
    print(f"Result: {result}")