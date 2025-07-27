#!/usr/bin/env python3
"""
Test data generators and fixtures for post_tool_use hook regression tests.

Provides realistic test data that covers the exact scenarios that caused
the original regression, plus edge cases for preventing future regressions.
"""

import json
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import uuid

class HookDataGenerator:
    """Generates realistic hook input data for testing."""
    
    @staticmethod
    def create_base_hook_input(
        tool_name: str,
        session_id: Optional[str] = None,
        use_legacy_format: bool = False
    ) -> Dict[str, Any]:
        """Create base hook input structure."""
        session_id = session_id or f"test-session-{uuid.uuid4().hex[:8]}"
        
        if use_legacy_format:
            return {
                "session_id": session_id,
                "tool": tool_name,
                "parameters": {},
                "tool_response": {}
            }
        else:
            return {
                "session_id": session_id,
                "transcript_path": f"/test/.claude/projects/test/{session_id}.jsonl",
                "cwd": "/test/project",
                "hook_event_name": "PostToolUse",
                "tool_name": tool_name,
                "tool_input": {},
                "tool_response": {}
            }
    
    @staticmethod
    def write_operation(
        file_path: str = "/test/example.txt",
        content: str = "Test content",
        session_id: Optional[str] = None,
        include_timeout_content: bool = False
    ) -> Dict[str, Any]:
        """Generate Write operation hook data."""
        if include_timeout_content:
            content = """
# Timeout configuration
TIMEOUT = 30
CONNECTION_TIMEOUT = 5.0
REQUEST_TIMEOUT = 10.0

def handle_timeout():
    # Handle timeout scenarios
    pass
"""
        
        hook_data = HookDataGenerator.create_base_hook_input("Write", session_id)
        hook_data["tool_input"] = {
            "file_path": file_path,
            "content": content
        }
        hook_data["tool_response"] = {
            "type": "text",
            "file": {
                "filePath": file_path,
                "content": content,
                "numLines": len(content.split('\n')),
                "startLine": 1,
                "totalLines": len(content.split('\n'))
            }
        }
        return hook_data
    
    @staticmethod
    def read_operation(
        file_path: str = "/test/example.txt",
        content: str = "File content",
        session_id: Optional[str] = None,
        include_timeout_in_content: bool = False
    ) -> Dict[str, Any]:
        """Generate Read operation hook data."""
        if include_timeout_in_content:
            content = """
#!/usr/bin/env python3
# Configuration file with timeout settings

DEFAULT_TIMEOUT = 30  # seconds
CONNECTION_TIMEOUT = 5.0
REQUEST_TIMEOUT = 10.0

class TimeoutHandler:
    def __init__(self, timeout=DEFAULT_TIMEOUT):
        self.timeout = timeout
    
    def handle_timeout(self):
        print("Timeout occurred")
"""
        
        hook_data = HookDataGenerator.create_base_hook_input("Read", session_id)
        hook_data["tool_input"] = {
            "file_path": file_path
        }
        hook_data["tool_response"] = {
            "type": "text",
            "file": {
                "filePath": file_path,
                "content": content,
                "numLines": len(content.split('\n')),
                "startLine": 1,
                "totalLines": len(content.split('\n'))
            }
        }
        return hook_data
    
    @staticmethod
    def edit_operation(
        file_path: str = "/test/example.py",
        old_string: str = "old_code",
        new_string: str = "new_code",
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate Edit operation hook data."""
        hook_data = HookDataGenerator.create_base_hook_input("Edit", session_id)
        hook_data["tool_input"] = {
            "file_path": file_path,
            "old_string": old_string,
            "new_string": new_string
        }
        hook_data["tool_response"] = {
            "type": "update",
            "numChanges": 1,
            "file": {
                "filePath": file_path,
                "modified": True
            }
        }
        return hook_data
    
    @staticmethod
    def bash_operation(
        command: str = "ls -la",
        stdout: str = "file1.txt\nfile2.txt",
        stderr: str = "",
        returncode: int = 0,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate Bash operation hook data."""
        hook_data = HookDataGenerator.create_base_hook_input("Bash", session_id)
        hook_data["tool_input"] = {
            "command": command,
            "description": f"Execute: {command}"
        }
        hook_data["tool_response"] = {
            "stdout": stdout,
            "stderr": stderr,
            "returncode": returncode,
            "interrupted": False,
            "isImage": False
        }
        return hook_data
    
    @staticmethod
    def grep_operation(
        pattern: str = "test",
        path: str = "/test/",
        matches: Optional[List[str]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate Grep operation hook data."""
        matches = matches or ["test_file.py:10:test function", "test_data.txt:5:test data"]
        
        hook_data = HookDataGenerator.create_base_hook_input("Grep", session_id)
        hook_data["tool_input"] = {
            "pattern": pattern,
            "path": path,
            "output_mode": "content"
        }
        hook_data["tool_response"] = {
            "matches": matches,
            "total_matches": len(matches)
        }
        return hook_data
    
    @staticmethod
    def error_operation(
        tool_name: str = "Read",
        error_message: str = "File not found",
        is_timeout: bool = False,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate hook data with error conditions."""
        if is_timeout:
            error_message = "Operation timed out after 30 seconds"
        
        hook_data = HookDataGenerator.create_base_hook_input(tool_name, session_id)
        hook_data["tool_input"] = {
            "file_path": "/nonexistent/file.txt" if tool_name == "Read" else "test"
        }
        hook_data["tool_response"] = {
            "error": error_message,
            "is_error": True
        }
        return hook_data
    
    @staticmethod
    def legacy_format_operation(
        tool_name: str = "Write",
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate hook data in the old format that caused the regression."""
        hook_data = HookDataGenerator.create_base_hook_input(tool_name, session_id, use_legacy_format=True)
        hook_data["parameters"] = {
            "file_path": "/test/legacy_format.txt",
            "content": "Legacy format test"
        }
        hook_data["tool_response"] = {
            "success": True,
            "result": "File written successfully"
        }
        return hook_data

class RegressionScenarios:
    """Specific scenarios that reproduce the original regression."""
    
    @staticmethod
    def screenshot_scenario() -> Dict[str, Any]:
        """Recreate the exact scenario from the bug report screenshots."""
        return HookDataGenerator.write_operation(
            file_path="/home/bryan/multi-agent-observability-system/apps/client/docs/TESTING_QUICK_REFERENCE.md",
            content="# Testing Quick Reference\n\nThis guide provides quick commands for testing...",
            session_id="2250e000-7df8-4747-8662-85a871686956_9150_1737545923"
        )
    
    @staticmethod
    def timeout_false_positive() -> Dict[str, Any]:
        """Scenario that previously triggered false timeout errors."""
        return HookDataGenerator.read_operation(
            file_path="/test/post_tool_use.py",
            include_timeout_in_content=True,
            session_id="timeout-false-positive-test"
        )
    
    @staticmethod
    def unknown_tool_scenario() -> Dict[str, Any]:
        """Scenario that would result in 'Tool used: unknown' before fix."""
        # This simulates the old format that caused tool name to be "unknown"
        return {
            "session_id": "unknown-tool-test",
            "transcript_path": "/test/.claude/projects/test/unknown-tool-test.jsonl",
            "cwd": "/test/project",
            "hook_event_name": "PostToolUse",
            # Missing tool_name field - would default to "unknown"
            "tool_input": {
                "file_path": "/test/missing_tool_name.txt",
                "content": "This would show as unknown tool"
            },
            "tool_response": {
                "type": "text",
                "file": {
                    "filePath": "/test/missing_tool_name.txt",
                    "content": "This would show as unknown tool"
                }
            }
        }
    
    @staticmethod
    def mixed_format_batch() -> List[Dict[str, Any]]:
        """Generate a batch of events with mixed formats to test compatibility."""
        return [
            HookDataGenerator.write_operation(session_id="batch-test-1"),
            HookDataGenerator.legacy_format_operation(session_id="batch-test-2"),
            HookDataGenerator.read_operation(include_timeout_in_content=True, session_id="batch-test-3"),
            HookDataGenerator.bash_operation(command="echo 'timeout test'", session_id="batch-test-4"),
            RegressionScenarios.unknown_tool_scenario()
        ]

class DatabaseFixtures:
    """Fixtures for database testing."""
    
    @staticmethod
    def create_event_with_summary(
        tool_name: str,
        summary: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a complete database event entry."""
        session_id = session_id or f"db-test-{uuid.uuid4().hex[:8]}"
        timestamp = int(time.time() * 1000)
        
        return {
            "source_app": "claude-code",
            "session_id": session_id,
            "hook_event_type": "PostToolUse",
            "payload": {
                "tool_name": tool_name,
                "tool_input": {"test": "data"},
                "metadata": {
                    "hostname": "test-host",
                    "user": "test-user",
                    "process_id": 12345
                }
            },
            "summary": summary,
            "timestamp": timestamp
        }
    
    @staticmethod
    def problematic_events_before_fix() -> List[Dict[str, Any]]:
        """Events that would have been problematic before the fix."""
        return [
            DatabaseFixtures.create_event_with_summary("unknown", "Tool used: unknown"),
            DatabaseFixtures.create_event_with_summary("unknown", "Tool used: unknown"),
            DatabaseFixtures.create_event_with_summary("Write", "Tool used: unknown"),  # Mismatch scenario
        ]
    
    @staticmethod
    def correct_events_after_fix() -> List[Dict[str, Any]]:
        """Events as they should appear after the fix."""
        return [
            DatabaseFixtures.create_event_with_summary("Write", "Write: /test/file1.txt"),
            DatabaseFixtures.create_event_with_summary("Read", "Read: /test/file2.txt"),
            DatabaseFixtures.create_event_with_summary("Edit", "Edit: /test/file3.py"),
            DatabaseFixtures.create_event_with_summary("Bash", "Bash: ls -la"),
        ]

class TestDataValidator:
    """Validates test data meets regression prevention requirements."""
    
    @staticmethod
    def validate_hook_data(hook_data: Dict[str, Any]) -> bool:
        """Validate that hook data structure is correct."""
        required_fields = ["session_id", "tool_name", "tool_input", "tool_response"]
        
        # Check for new format fields
        has_new_format = all(field in hook_data for field in required_fields)
        
        # Check for legacy format fields
        legacy_fields = ["session_id", "tool", "parameters", "tool_response"]
        has_legacy_format = all(field in hook_data for field in legacy_fields)
        
        return has_new_format or has_legacy_format
    
    @staticmethod
    def validate_no_unknown_tools(events: List[Dict[str, Any]]) -> bool:
        """Validate that no events contain unknown tool names."""
        for event in events:
            payload = event.get("payload", {})
            tool_name = payload.get("tool_name")
            
            if tool_name == "unknown":
                return False
            
            summary = event.get("summary", "")
            if "Tool used: unknown" in summary:
                return False
        
        return True
    
    @staticmethod
    def validate_timeout_handling(hook_data: Dict[str, Any]) -> bool:
        """Validate that content with 'timeout' doesn't trigger false errors."""
        tool_response = hook_data.get("tool_response", {})
        
        # Should not have error field unless it's a real error
        if "error" in tool_response:
            # If there's an error field, it should be a real error, not content-based
            error_msg = tool_response["error"]
            if "timeout" in error_msg.lower():
                # This should only be true for actual timeout errors
                return "timed out" in error_msg.lower() or "timeout after" in error_msg.lower()
        
        return True

# Convenience functions for test files
def get_write_test_data(include_timeout_content: bool = False) -> str:
    """Get JSON string of Write operation test data."""
    data = HookDataGenerator.write_operation(include_timeout_content=include_timeout_content)
    return json.dumps(data)

def get_regression_scenario() -> str:
    """Get JSON string of the main regression scenario."""
    data = RegressionScenarios.screenshot_scenario()
    return json.dumps(data)

def get_mixed_format_batch() -> List[str]:
    """Get list of JSON strings for mixed format testing."""
    batch = RegressionScenarios.mixed_format_batch()
    return [json.dumps(data) for data in batch]

if __name__ == "__main__":
    # Demo usage
    print("=== Write Operation Test Data ===")
    print(get_write_test_data())
    
    print("\n=== Regression Scenario ===")
    print(get_regression_scenario())
    
    print("\n=== Validation Tests ===")
    test_data = HookDataGenerator.write_operation()
    print(f"Valid hook data: {TestDataValidator.validate_hook_data(test_data)}")
    
    correct_events = DatabaseFixtures.correct_events_after_fix()
    print(f"No unknown tools: {TestDataValidator.validate_no_unknown_tools(correct_events)}")