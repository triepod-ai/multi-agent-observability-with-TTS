#!/usr/bin/env python3
"""
Test script for relationship tracking system
"""

import json
import subprocess
import os
import sys
from pathlib import Path

def run_hook_test(hook_name, test_data, env_vars=None):
    """Run a hook test with given data and environment variables"""
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)
    
    hook_path = f".claude/hooks/{hook_name}"
    process = subprocess.Popen(
        ['python3', hook_path, '--no-redis', '--no-server'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    stdout, stderr = process.communicate(json.dumps(test_data))
    return {
        'stdout': stdout,
        'stderr': stderr,
        'returncode': process.returncode
    }

def test_relationship_tracking():
    """Test the complete relationship tracking workflow"""
    print("🧪 Testing Relationship Tracking System")
    print("=" * 50)
    
    # Test 1: Root session (no parent)
    print("\n📋 Test 1: Root Session")
    root_data = {
        'session_id': 'root-session-001',
        'agent_name': 'root-agent',
        'task_description': 'Root level task'
    }
    
    result = run_hook_test('subagent_start.py', root_data)
    print(f"Return Code: {result['returncode']}")
    
    if result['stdout']:
        response = json.loads(result['stdout'])
        print(f"Agent ID: {response['agent_id']}")
        print(f"Parent Session: {response['parent_session_id']}")
        print(f"Relationship Tracked: {response['relationship_tracked']}")
    
    if result['stderr']:
        print(f"Messages: {result['stderr'].strip()}")
    
    # Test 2: Child session with parent
    print("\n📋 Test 2: Child Session with Parent")
    child_data = {
        'session_id': 'child-session-001',
        'agent_name': 'child-agent',
        'task_description': 'Child task spawned from parent',
        'spawn_method': 'task_tool',
        'tools': ['Read', 'Edit', 'Bash']
    }
    
    env_vars = {
        'CLAUDE_PARENT_SESSION_ID': 'root-session-001',
        'CLAUDE_WAVE_ID': 'wave-123',
        'CLAUDE_WAVE_NUMBER': '2'
    }
    
    result = run_hook_test('subagent_start.py', child_data, env_vars)
    print(f"Return Code: {result['returncode']}")
    
    if result['stdout']:
        response = json.loads(result['stdout'])
        print(f"Agent ID: {response['agent_id']}")
        print(f"Parent Session: {response['parent_session_id']}")
        print(f"Relationship Tracked: {response['relationship_tracked']}")
    
    if result['stderr']:
        print(f"Messages: {result['stderr'].strip()}")
    
    # Test 3: Grandchild session (depth 2)
    print("\n📋 Test 3: Grandchild Session (Depth 2)")
    grandchild_data = {
        'session_id': 'grandchild-session-001',
        'agent_name': 'grandchild-agent',
        'task_description': 'Nested task at depth 2',
        'auto_activated': True
    }
    
    env_vars = {
        'CLAUDE_PARENT_SESSION_ID': 'child-session-001'
    }
    
    result = run_hook_test('subagent_start.py', grandchild_data, env_vars)
    print(f"Return Code: {result['returncode']}")
    
    if result['stdout']:
        response = json.loads(result['stdout'])
        print(f"Agent ID: {response['agent_id']}")
        print(f"Parent Session: {response['parent_session_id']}")
        print(f"Relationship Tracked: {response['relationship_tracked']}")
    
    if result['stderr']:
        print(f"Messages: {result['stderr'].strip()}")
    
    # Test 4: Session completion
    print("\n📋 Test 4: Session Completion")
    completion_data = {
        'session_id': 'child-session-001',
        'parent_session_id': 'root-session-001',
        'agent_name': 'child-agent',
        'status': 'completed',
        'duration': 45.2,
        'result': 'Task completed successfully',
        'tools_used': ['Read', 'Edit', 'Bash'],
        'files_affected': 3
    }
    
    result = run_hook_test('subagent_stop.py', completion_data)
    print(f"Return Code: {result['returncode']}")
    print(f"Messages: {result['stderr'].strip()}")
    
    # Test 5: Context loader with relationship
    print("\n📋 Test 5: Context Loader with Relationship")
    context_data = {
        'session_id': 'child-session-002',
        'source': 'startup'
    }
    
    env_vars = {
        'CLAUDE_PARENT_SESSION_ID': 'root-session-001'
    }
    
    # Remove the continue session detection for this test
    env_vars['CLAUDE_SKIP_CONTEXT'] = 'false'
    
    context_process = subprocess.Popen(
        ['python3', '.claude/hooks/session_context_loader.py'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env_vars
    )
    
    stdout, stderr = context_process.communicate(json.dumps(context_data))
    print(f"Return Code: {context_process.returncode}")
    if stdout:
        lines = stdout.split('\n')
        print("Context Preview:")
        for line in lines[:10]:  # Show first 10 lines
            print(f"  {line}")
        if len(lines) > 10:
            print(f"  ... ({len(lines) - 10} more lines)")
    
    if stderr:
        print(f"Messages: {stderr.strip()}")

def test_utility_functions():
    """Test utility functions directly"""
    print("\n🔧 Testing Utility Functions")
    print("=" * 30)
    
    # Import and test relationship tracker functions
    sys.path.append('.claude/hooks/utils')
    import relationship_tracker
    
    # Test spawn method detection
    print("\n📋 Spawn Method Detection:")
    test_cases = [
        {'tools': ['Task'], 'description': 'Use task tool'},
        {'task_description': '@code-reviewer analyze this'},
        {'wave_number': 3, 'wave_id': 'wave-456'},
        {'auto_activated': True},
        {'continuation_session': True},
        {}  # Manual default
    ]
    
    for i, case in enumerate(test_cases, 1):
        method = relationship_tracker.detect_spawn_method(case)
        print(f"  Case {i}: {method}")
    
    # Test session path building
    print("\n📋 Session Path Building:")
    paths = [
        (None, 'root-123'),
        ('root-123', 'child-456'),
        ('root-123.child-456', 'grandchild-789')
    ]
    
    for parent, current in paths:
        path = relationship_tracker.build_session_path(parent, current)
        print(f"  {parent or 'None'} + {current} = {path}")
    
    # Test depth calculation
    print("\n📋 Depth Calculation:")
    depths = [
        None,  # Root
        'root-session',  # Depth 1
    ]
    
    for parent in depths:
        depth = relationship_tracker.calculate_session_depth(parent)
        print(f"  Parent: {parent or 'None'} -> Depth: {depth}")
    
    print("\n✅ Utility function tests completed")

def main():
    """Main test runner"""
    print("🚀 Multi-Agent Observability System")
    print("Relationship Tracking Test Suite")
    print("=" * 60)
    
    # Change to the project directory
    os.chdir(Path(__file__).parent)
    
    # Check if hooks exist
    hooks_dir = Path('.claude/hooks')
    if not hooks_dir.exists():
        print("❌ Hooks directory not found. Please run install-hooks.sh first.")
        return 1
    
    required_files = [
        '.claude/hooks/subagent_start.py',
        '.claude/hooks/subagent_stop.py',
        '.claude/hooks/session_context_loader.py',
        '.claude/hooks/utils/relationship_tracker.py'
    ]
    
    for file_path in required_files:
        if not Path(file_path).exists():
            print(f"❌ Required file missing: {file_path}")
            return 1
    
    print("✅ All required files found")
    
    # Run tests
    try:
        test_relationship_tracking()
        test_utility_functions()
        
        print("\n🎉 All tests completed successfully!")
        print("\n💡 Next steps:")
        print("1. Test with actual Claude sessions")
        print("2. Monitor observability dashboard for relationship data")
        print("3. Verify parent/child notifications work correctly")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())