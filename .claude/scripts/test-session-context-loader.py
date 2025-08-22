#!/usr/bin/env python3
"""
Test Session Context Loader - Multi-Agent Observability System
Tests session_context_loader.py with realistic data
"""

import json
import subprocess
import os

# Set environment
os.environ['CLAUDE_PARENT_SESSION_ID'] = 'parent-789'

# Test data
test_data = {
    'session_id': 'child-session-999',
    'source': 'startup'
}

# Run session_context_loader
process = subprocess.Popen(
    ['python3', '.claude/hooks/session_context_loader.py'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = process.communicate(json.dumps(test_data))
print('Context Output:')
print(stdout)
print()
print('STDERR:', stderr)
print('Return Code:', process.returncode)