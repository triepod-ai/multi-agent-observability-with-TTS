#!/usr/bin/env python3
"""
Regression tests for post_tool_use hook.

These tests prevent the regression where tool names were showing as "unknown"
and false timeout errors were being generated.

Bug Fixed: Tool name extraction was using wrong field names and timeout detection
was too broad, causing false positives.
"""

import json
import os
import sys
import pytest
from unittest.mock import patch, mock_open
from pathlib import Path

# Add the hooks directory to the path so we can import the hook module
HOOKS_DIR = Path(__file__).parent.parent.parent / ".claude" / "hooks"
sys.path.insert(0, str(HOOKS_DIR))

from post_tool_use import (
    extract_tool_info,
    detect_error,
    should_notify_error,
    generate_error_message,
    get_error_severity
)

class TestExtractToolInfo:
    """Test tool name and parameter extraction from hook input."""
    
    def test_extract_tool_info_with_claude_code_format(self):
        """Test extraction with correct Claude Code field names."""
        hook_input = json.dumps({
            "session_id": "test-session",
            "tool_name": "Write",
            "tool_input": {
                "file_path": "/test/file.txt",
                "content": "test content"
            },
            "tool_response": {
                "type": "text",
                "file": {
                    "filePath": "/test/file.txt",
                    "content": "test content"
                }
            }
        })
        
        tool, parameters, tool_response = extract_tool_info(hook_input)
        
        assert tool == "Write"
        assert parameters["file_path"] == "/test/file.txt"
        assert parameters["content"] == "test content"
        assert tool_response["type"] == "text"
    
    def test_extract_tool_info_with_legacy_format(self):
        """Test extraction with legacy field names for backward compatibility."""
        hook_input = json.dumps({
            "session_id": "test-session",
            "tool": "Edit",
            "parameters": {
                "file_path": "/test/file.txt",
                "old_string": "old",
                "new_string": "new"
            },
            "tool_response": {
                "success": True
            }
        })
        
        tool, parameters, tool_response = extract_tool_info(hook_input)
        
        assert tool == "Edit"
        assert parameters["file_path"] == "/test/file.txt"
        assert parameters["old_string"] == "old"
        assert tool_response["success"] is True
    
    def test_extract_tool_info_prioritizes_new_format(self):
        """Test that new field names take priority over legacy ones."""
        hook_input = json.dumps({
            "session_id": "test-session",
            "tool": "OldTool",
            "tool_name": "NewTool",
            "parameters": {"old": "param"},
            "tool_input": {"new": "param"},
            "tool_response": {"result": "success"}
        })
        
        tool, parameters, tool_response = extract_tool_info(hook_input)
        
        assert tool == "NewTool"  # Should use tool_name over tool
        assert parameters == {"new": "param"}  # Should use tool_input over parameters
    
    def test_extract_tool_info_handles_malformed_json(self):
        """Test graceful handling of malformed JSON input."""
        hook_input = "invalid json"
        
        tool, parameters, tool_response = extract_tool_info(hook_input)
        
        assert tool == "unknown"
        assert parameters == {}
        assert tool_response == {}
    
    def test_extract_tool_info_handles_missing_fields(self):
        """Test handling when required fields are missing."""
        hook_input = json.dumps({
            "session_id": "test-session"
            # Missing tool_name, tool_input, tool_response
        })
        
        tool, parameters, tool_response = extract_tool_info(hook_input)
        
        assert tool == "unknown"
        assert parameters == {}
        assert tool_response == {}

class TestErrorDetection:
    """Test error detection logic to prevent false positives."""
    
    def test_no_error_for_successful_write_operation(self):
        """Test that successful Write operations don't trigger errors."""
        tool_response = {
            "type": "text",
            "file": {
                "filePath": "/test/file.txt",
                "content": "some content with timeout word"
            }
        }
        
        error_info = detect_error("Write", {"file_path": "/test/file.txt"}, tool_response)
        
        assert error_info is None
    
    def test_no_error_for_successful_read_operation(self):
        """Test that successful Read operations don't trigger errors."""
        tool_response = {
            "type": "text", 
            "file": {
                "filePath": "/test/timeout_config.py",
                "content": "TIMEOUT = 30\nCONNECTION_TIMEOUT = 5.0"
            }
        }
        
        error_info = detect_error("Read", {"file_path": "/test/timeout_config.py"}, tool_response)
        
        assert error_info is None
    
    def test_no_error_for_successful_edit_operation(self):
        """Test that successful Edit operations don't trigger errors."""
        tool_response = {
            "type": "update",
            "numChanges": 1
        }
        
        error_info = detect_error("Edit", {"file_path": "/test/file.py"}, tool_response)
        
        assert error_info is None
    
    def test_detects_explicit_error_field(self):
        """Test detection of explicit error fields."""
        tool_response = {
            "error": "File not found",
            "is_error": True
        }
        
        error_info = detect_error("Read", {"file_path": "/missing/file.txt"}, tool_response)
        
        assert error_info is not None
        assert error_info["type"] == "explicit_error"
        assert "File not found" in error_info["message"]
    
    def test_detects_timeout_error_in_error_field(self):
        """Test detection of timeout in explicit error messages."""
        tool_response = {
            "error": "Operation timed out after 30 seconds",
            "is_error": True
        }
        
        error_info = detect_error("WebFetch", {"url": "http://example.com"}, tool_response)
        
        assert error_info is not None
        assert error_info["type"] == "timeout_error"
        assert error_info["message"] == "Operation timed out"
    
    def test_detects_bash_exit_code_error(self):
        """Test detection of Bash command failures."""
        tool_response = {
            "returncode": 1,
            "stderr": "command not found",
            "stdout": ""
        }
        
        error_info = detect_error("Bash", {"command": "nonexistent-command"}, tool_response)
        
        assert error_info is not None
        assert error_info["type"] == "exit_code_error"
        assert error_info["exit_code"] == 1
        assert "nonexistent-command" in error_info["message"]
    
    def test_no_error_for_unknown_tool_without_explicit_error(self):
        """Test that unknown tools don't trigger errors unless explicitly marked."""
        tool_response = {
            "type": "text",
            "content": "some result with timeout in content"
        }
        
        error_info = detect_error("unknown", {}, tool_response)
        
        assert error_info is None

class TestErrorNotification:
    """Test error notification logic."""
    
    def test_should_notify_for_critical_errors(self):
        """Test that critical errors trigger notifications."""
        error_info = {
            "type": "explicit_error",
            "message": "Critical system failure"
        }
        
        should_notify = should_notify_error(error_info, "Write")
        
        assert should_notify is True
    
    def test_should_notify_for_timeout_errors(self):
        """Test that timeout errors trigger notifications."""
        error_info = {
            "type": "timeout_error",
            "message": "Operation timed out"
        }
        
        should_notify = should_notify_error(error_info, "WebFetch")
        
        assert should_notify is True
    
    def test_should_not_notify_for_search_with_no_results(self):
        """Test that search operations with no matches don't trigger notifications."""
        error_info = {
            "type": "search_error",
            "message": "No matches found"
        }
        
        should_notify = should_notify_error(error_info, "Grep")
        
        assert should_notify is False

class TestErrorSeverity:
    """Test error severity classification."""
    
    def test_critical_severity_for_explicit_errors(self):
        """Test that explicit errors are marked as critical."""
        error_info = {
            "type": "explicit_error",
            "message": "System failure"
        }
        
        severity = get_error_severity(error_info)
        
        assert severity == "error"
    
    def test_critical_severity_for_timeout_errors(self):
        """Test that timeout errors are marked as critical."""
        error_info = {
            "type": "timeout_error",
            "message": "Operation timed out"
        }
        
        severity = get_error_severity(error_info)
        
        assert severity == "error"
    
    def test_important_severity_for_critical_exit_codes(self):
        """Test that critical exit codes are marked appropriately."""
        error_info = {
            "type": "exit_code_error",
            "message": "Command failed",
            "exit_code": 127  # Command not found
        }
        
        severity = get_error_severity(error_info)
        
        assert severity == "error"

class TestErrorMessageGeneration:
    """Test error message generation for TTS."""
    
    def test_generates_friendly_message_for_exit_code_error(self):
        """Test that exit code errors generate user-friendly messages."""
        error_info = {
            "type": "exit_code_error",
            "message": "Command failed with exit code 1: ls /nonexistent",
            "exit_code": 1,
            "command": "ls /nonexistent"
        }
        
        message = generate_error_message(error_info, "Bash")
        
        assert "ls command failed" in message
        assert "error code 1" in message
    
    def test_generates_friendly_message_for_file_error(self):
        """Test that file errors generate user-friendly messages."""
        error_info = {
            "type": "file_error",
            "message": "Permission denied: /root/secret.txt"
        }
        
        message = generate_error_message(error_info, "Read")
        
        assert "File operation error" in message
        assert "Permission denied" in message
    
    def test_generates_friendly_message_for_timeout_error(self):
        """Test that timeout errors generate user-friendly messages."""
        error_info = {
            "type": "timeout_error",
            "message": "Operation timed out"
        }
        
        message = generate_error_message(error_info, "WebFetch")
        
        assert message == "Operation timed out"

class TestRegressionPrevention:
    """Specific tests to prevent the exact regression that occurred."""
    
    def test_write_tool_with_timeout_content_no_false_positive(self):
        """REGRESSION TEST: Write operation with timeout in content should not trigger error."""
        hook_input = json.dumps({
            "session_id": "test-session",
            "tool_name": "Write",
            "tool_input": {
                "file_path": "/test/timeout_config.py",
                "content": "TIMEOUT = 30\nCONNECTION_TIMEOUT = 5.0\n# timeout handling code"
            },
            "tool_response": {
                "type": "text",
                "file": {
                    "filePath": "/test/timeout_config.py",
                    "content": "TIMEOUT = 30\nCONNECTION_TIMEOUT = 5.0\n# timeout handling code"
                }
            }
        })
        
        tool, parameters, tool_response = extract_tool_info(hook_input)
        error_info = detect_error(tool, parameters, tool_response)
        
        # These assertions prevent the exact regression
        assert tool == "Write"  # Should not be "unknown"
        assert error_info is None  # Should not detect false timeout error
    
    def test_read_tool_with_timeout_in_file_content_no_error(self):
        """REGRESSION TEST: Reading files with timeout content should not trigger error."""
        hook_input = json.dumps({
            "session_id": "test-session", 
            "tool_name": "Read",
            "tool_input": {
                "file_path": "/test/post_tool_use.py"
            },
            "tool_response": {
                "type": "text",
                "file": {
                    "filePath": "/test/post_tool_use.py",
                    "content": "def handle_timeout():\n    # timeout handling\n    pass"
                }
            }
        })
        
        tool, parameters, tool_response = extract_tool_info(hook_input)
        error_info = detect_error(tool, parameters, tool_response)
        
        assert tool == "Read"
        assert error_info is None
    
    def test_all_common_tools_extracted_correctly(self):
        """REGRESSION TEST: All common tool types should be extracted correctly."""
        common_tools = [
            "Write", "Read", "Edit", "MultiEdit", "Bash", "Grep", "Glob",
            "WebFetch", "WebSearch", "TodoWrite", "Task"
        ]
        
        for tool_name in common_tools:
            hook_input = json.dumps({
                "session_id": "test-session",
                "tool_name": tool_name,
                "tool_input": {"test": "param"},
                "tool_response": {"type": "success"}
            })
            
            extracted_tool, _, _ = extract_tool_info(hook_input)
            assert extracted_tool == tool_name, f"Tool {tool_name} not extracted correctly"

if __name__ == "__main__":
    # Run tests if executed directly
    pytest.main([__file__, "-v"])