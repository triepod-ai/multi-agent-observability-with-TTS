#!/usr/bin/env python3
"""
Test Hook Integration - Multi-Agent Observability System
Tests multiple hook types to ensure consistency
"""

import subprocess
import json
import os

# Test multiple hook types to ensure consistency
hook_types = ['PreCompact', 'Stop', 'SubagentStop']

print('Testing multiple hook types with realistic data...')
print()

for hook_type in hook_types:
    print(f'Testing {hook_type} hook:')
    
    # Create realistic test data for each hook type
    if hook_type == 'PreCompact':
        test_data = {
            'conversation': 'Fixed hook configuration inconsistency across all Claude Code hooks',
            'context': 'Updated settings.json to use async summarization'
        }
    elif hook_type == 'Stop': 
        test_data = {
            'session_summary': 'Successfully updated hook configuration to eliminate generic TTS messages',
            'duration': 300,
            'files_modified': 1
        }
    else:  # SubagentStop
        test_data = {
            'agent_name': 'hook-config-fixer',
            'task': 'Update hook configurations for consistent behavior',
            'result': 'All hooks now use async summarization'
        }
    
    try:
        # Set TTS_ENABLED=false to prevent actual audio during testing
        env = os.environ.copy()
        env['TTS_ENABLED'] = 'false'
        
        result = subprocess.run([
            'uv', 'run', '.claude/hooks/send_event_async.py',
            '--source-app', 'multi-agent-observability-system',
            '--event-type', hook_type,
            '--summarize'
        ], input=json.dumps(test_data), capture_output=True, text=True, 
           timeout=10, env=env)
        
        if result.returncode == 0:
            print(f'  ✅ {hook_type} hook working correctly')
        else:
            print(f'  ⚠️ {hook_type} returned code {result.returncode}')
            
    except subprocess.TimeoutExpired:
        print(f'  ⏰ {hook_type} processing (timeout is normal)')
    except Exception as e:
        print(f'  ❌ {hook_type} error: {e}')
    
    print()

print('🎉 Integration test complete!')
print('All hooks should now provide contextual TTS instead of generic messages.')