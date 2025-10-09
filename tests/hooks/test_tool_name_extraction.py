#!/usr/bin/env python3
"""
Test suite for tool name extraction from hook event data.

Tests the extract_tool_name logic in send_event.py that infers tool names
from event structure when not explicitly provided.
"""

import sys
import pytest
from pathlib import Path

# Add hooks to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / ".claude" / "hooks"))

from send_event import extract_tool_name


class TestDirectToolName:
    """Test direct tool_name field extraction."""

    def test_direct_tool_name_field(self):
        """Test extraction when tool_name is directly provided."""
        input_data = {"tool_name": "Read", "cwd": "/home/test"}
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Read"

    def test_tool_field_fallback(self):
        """Test extraction from 'tool' field."""
        input_data = {"tool": "Write", "cwd": "/home/test"}
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Write"


class TestToolInputInference:
    """Test tool name inference from tool_input structure."""

    def test_infer_write_from_structure(self):
        """Test inferring Write from file_path + content."""
        input_data = {
            "tool_name": "Unknown",
            "tool_input": {
                "file_path": "/test/file.txt",
                "content": "test content"
            },
            "cwd": "/home/test"
        }
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Write"

    def test_infer_read_from_structure(self):
        """Test inferring Read from file_path + offset."""
        input_data = {
            "tool_input": {
                "file_path": "/test/file.txt",
                "offset": 0,
                "limit": 100
            }
        }
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Read"

    def test_infer_edit_from_structure(self):
        """Test inferring Edit from old_string + new_string."""
        input_data = {
            "tool_input": {
                "file_path": "/test/file.txt",
                "old_string": "old text",
                "new_string": "new text"
            }
        }
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Edit"

    def test_infer_bash_from_command(self):
        """Test inferring Bash from command field."""
        input_data = {
            "tool_input": {
                "command": "ls -la",
                "description": "List files"
            },
            "cwd": "/home/test"
        }
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Bash"


class TestEventTypeMapping:
    """Test tool name inference from event_type."""

    def test_session_end_from_stop_event(self):
        """Test inferring SessionEnd from Stop event."""
        input_data = {"cwd": "/home/test"}
        event_type = "Stop"

        result = extract_tool_name(input_data, event_type)

        assert result == "SessionEnd"

    def test_subagent_complete_from_subagent_stop(self):
        """Test inferring SubagentComplete from SubagentStop event."""
        input_data = {}
        event_type = "SubagentStop"

        result = extract_tool_name(input_data, event_type)

        assert result == "SubagentComplete"


class TestFieldBasedInference:
    """Test tool name inference from specific fields."""

    def test_infer_user_prompt_from_prompt_field(self):
        """Test inferring UserPrompt from prompt field."""
        input_data = {
            "prompt": "Test user prompt",
            "session_id": "test-session"
        }
        event_type = "custom_event"

        result = extract_tool_name(input_data, event_type)

        assert result == "UserPrompt"


class TestUnknownCases:
    """Test cases where tool name cannot be determined."""

    def test_truly_unknown_returns_lowercase(self):
        """Test that truly unknown cases return lowercase 'unknown'."""
        input_data = {"random_field": "value"}
        event_type = "custom_event"

        result = extract_tool_name(input_data, event_type)

        assert result == "unknown"
        # Verify it's lowercase (signals truly unknown vs capitalized Unknown)
        assert result.islower()

    def test_empty_input_returns_unknown(self):
        """Test that empty input returns unknown."""
        input_data = {}
        event_type = "UnknownEvent"

        result = extract_tool_name(input_data, event_type)

        assert result == "unknown"


class TestRealWorldScenarios:
    """Test real-world scenarios from actual hook usage."""

    def test_write_operation_scenario(self):
        """Test scenario: Writing a file with Write tool."""
        input_data = {
            "tool_input": {
                "file_path": "/home/bryan/project/src/component.tsx",
                "content": "export const Component = () => { ... }"
            },
            "cwd": "/home/bryan/project"
        }
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Write"

    def test_bash_command_scenario(self):
        """Test scenario: Running bash command."""
        input_data = {
            "tool_input": {
                "command": "npm run build",
                "description": "Build project"
            },
            "cwd": "/home/bryan/project"
        }
        event_type = "PreToolUse"

        result = extract_tool_name(input_data, event_type)

        assert result == "Bash"

    def test_session_completion_scenario(self):
        """Test scenario: Session ending."""
        input_data = {
            "session_id": "20251009_123456",
            "cwd": "/home/bryan/project"
        }
        event_type = "Stop"

        result = extract_tool_name(input_data, event_type)

        assert result == "SessionEnd"


# Convenience function for running tests standalone
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
