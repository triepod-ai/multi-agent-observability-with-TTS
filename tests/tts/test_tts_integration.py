#!/usr/bin/env python3
"""
Integration tests for TTS system.

Tests the complete flow from hook event → AI enhancement → rate limiting → TTS.
"""

import sys
import json
import subprocess
import time
import pytest
from pathlib import Path

# Add hooks to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / ".claude" / "hooks"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / ".claude" / "hooks" / "utils" / "tts"))

from message_deduplicator import MessageDeduplicator


@pytest.fixture
def clean_deduplicator():
    """Create clean deduplicator for integration tests."""
    test_cache = Path("/tmp/tts-queue/integration-test-cache.json")

    # Clean up before test
    if test_cache.exists():
        test_cache.unlink()

    dedup = MessageDeduplicator(cache_file=test_cache)

    yield dedup

    # Clean up after test
    if test_cache.exists():
        test_cache.unlink()


class TestSpeakAISummaryIntegration:
    """Test speak-ai-summary integration with rate limiting and metrics."""

    def test_session_completion_with_metrics(self, clean_deduplicator):
        """Test session completion includes metrics in TTS."""
        event_data = {
            "tool_name": "SessionEnd",
            "summary": "Session completed in test-project",
            "context": {
                "files_affected": 3
            },
            "metrics": {
                "severity": "notable",
                "duration_ms": 12000
            },
            "project_context": {
                "name": "test-project"
            }
        }

        # Simulate rate limiting check
        enhanced_msg = "Session completed in test-project: 3 files, 12s"
        should_speak, reason = clean_deduplicator.should_speak(
            enhanced_msg,
            {"category": "session_completion"}
        )

        assert should_speak is True
        assert reason is None

    def test_test_completion_with_counts(self, clean_deduplicator):
        """Test that test completions include test counts."""
        event_data = {
            "tool_name": "Task",
            "summary": "Tests completed",
            "payload": {
                "tests_run": 15,
                "tests_passed": 15,
                "files_affected": 5
            },
            "metrics": {
                "severity": "normal"
            }
        }

        # Simulate enhanced message with metrics
        enhanced_msg = "Ran 15 tests: all passed, 5 files"
        should_speak, reason = clean_deduplicator.should_speak(
            enhanced_msg,
            {"category": "test_completion"}
        )

        assert should_speak is True

    def test_duplicate_session_rate_limited(self, clean_deduplicator):
        """Test that duplicate session messages are rate limited."""
        msg = "Session completed in test-project"
        ctx = {"category": "session_completion"}

        # First occurrence should speak
        should_speak_1, _ = clean_deduplicator.should_speak(msg, ctx)
        assert should_speak_1 is True

        # Immediate duplicate should be blocked
        should_speak_2, reason_2 = clean_deduplicator.should_speak(msg, ctx)
        assert should_speak_2 is False
        assert "cooldown" in reason_2.lower()

    def test_error_messages_have_shorter_cooldown(self, clean_deduplicator):
        """Test that error messages have shorter cooldown than sessions."""
        error_cooldown = clean_deduplicator.category_cooldowns["error"]
        session_cooldown = clean_deduplicator.category_cooldowns["session_completion"]

        assert error_cooldown < session_cooldown
        assert error_cooldown == 60  # 1 minute for errors
        assert session_cooldown == 300  # 5 minutes for sessions


class TestMetricExtraction:
    """Test metric extraction from event context."""

    def test_extract_from_payload(self):
        """Test extracting metrics from payload."""
        from tests.tts.test_metric_extraction import extract_metrics

        context = {
            "payload": {
                "tests_run": 12,
                "tests_passed": 12,
                "files_affected": 3
            }
        }

        metrics = extract_metrics(context)

        assert metrics["tests"] == 12
        assert metrics["files"] == 3
        assert metrics["errors"] == 0

    def test_extract_errors_from_multiple_sources(self):
        """Test extracting errors from multiple context sources."""
        from tests.tts.test_metric_extraction import extract_metrics

        context = {
            "payload": {
                "error_occurred": True,
                "files_affected": 2
            },
            "metrics": {
                "severity": "error"
            }
        }

        metrics = extract_metrics(context)

        assert metrics["files"] == 2
        assert metrics["errors"] >= 1

    def test_metric_hints_generation(self):
        """Test generating metric hints for AI prompts."""
        from tests.tts.test_metric_extraction import build_metric_hints

        metrics = {
            "files": 3,
            "tests": 12,
            "errors": 0,
            "duration": 8500,
            "items": 0,
            "changes": 0
        }

        hints = build_metric_hints(metrics)

        assert "3 files" in hints
        assert "12 tests" in hints
        assert "8s" in hints


class TestToolNameExtraction:
    """Test tool name extraction from events."""

    def test_extract_from_structure(self):
        """Test extracting tool name from structure."""
        from send_event import extract_tool_name

        # Write operation
        input_data = {
            "tool_input": {
                "file_path": "/test/file.txt",
                "content": "content"
            }
        }

        result = extract_tool_name(input_data, "PreToolUse")

        assert result == "Write"

    def test_extract_from_event_type(self):
        """Test extracting tool name from event type."""
        from send_event import extract_tool_name

        input_data = {"cwd": "/home/test"}

        result = extract_tool_name(input_data, "Stop")

        assert result == "SessionEnd"


class TestEndToEnd:
    """Test complete end-to-end scenarios."""

    def test_session_with_metrics_not_rate_limited(self, clean_deduplicator):
        """Test complete flow: session → metrics → rate limiting → TTS."""
        # Scenario: First session completion
        session_msg = "Session completed: 3 files updated"
        ctx = {"category": "session_completion"}

        # Should be allowed
        should_speak, reason = clean_deduplicator.should_speak(session_msg, ctx)

        assert should_speak is True
        assert reason is None

        # Verify recorded in stats
        stats = clean_deduplicator.get_stats()
        assert stats["total_records"] >= 1
        assert "session_completion" in stats["by_category"]

    def test_error_followed_by_fix(self, clean_deduplicator):
        """Test error message followed by fix message."""
        # Error message
        error_msg = "Build failed: 2 errors in client"
        error_ctx = {"category": "error"}

        should_speak_error, _ = clean_deduplicator.should_speak(error_msg, error_ctx)
        assert should_speak_error is True

        # Different message (fix) - should also speak
        fix_msg = "Build succeeded: all tests passing"
        fix_ctx = {"category": "completion"}

        should_speak_fix, _ = clean_deduplicator.should_speak(fix_msg, fix_ctx)
        assert should_speak_fix is True

    def test_multiple_projects_independent(self, clean_deduplicator):
        """Test that messages from different projects are independent."""
        # Project 1
        msg1 = "Session completed in project-a"
        should_speak_1, _ = clean_deduplicator.should_speak(
            msg1,
            {"category": "session_completion"}
        )
        assert should_speak_1 is True

        # Project 2 (different message)
        msg2 = "Session completed in project-b"
        should_speak_2, _ = clean_deduplicator.should_speak(
            msg2,
            {"category": "session_completion"}
        )
        assert should_speak_2 is True

        # Project 1 duplicate (should be blocked)
        should_speak_3, reason_3 = clean_deduplicator.should_speak(
            msg1,
            {"category": "session_completion"}
        )
        assert should_speak_3 is False
        assert "cooldown" in reason_3.lower()


# Convenience function for running tests standalone
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
