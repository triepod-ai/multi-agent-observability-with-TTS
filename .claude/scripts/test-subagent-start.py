#!/usr/bin/env python3
"""
Test SubagentStart Hook - Multi-Agent Observability System
Tests subagent_start.py with realistic data
"""

import json
import subprocess
import os

# Set environment
os.environ['CLAUDE_PARENT_SESSION_ID'] = 'parent-123'

# Test data
test_data = {
    'session_id': 'child-session-456',
    'agent_name': 'test-child-agent', 
    'task_description': 'child task'
}

# Run subagent_start
process = subprocess.Popen(
    ['python3', '.claude/hooks/subagent_start.py', '--no-redis', '--no-server'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = process.communicate(json.dumps(test_data))
print('STDOUT:', stdout)
print('STDERR:', stderr)
print('Return Code:', process.returncode)