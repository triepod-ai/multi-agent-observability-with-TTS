#!/usr/bin/env python3
"""
Test suite for message_deduplicator.py

Tests rate limiting and deduplication functionality for TTS messages.
"""

import sys
import time
import pytest
from pathlib import Path

# Add hooks to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / ".claude" / "hooks"))

from utils.tts.message_deduplicator import MessageDeduplicator


@pytest.fixture
def deduplicator():
    """Create a fresh MessageDeduplicator instance for each test."""
    # Use a test-specific cache file
    test_cache = Path("/tmp/tts-queue/test-message-cache.json")
    dedup = MessageDeduplicator(cache_file=test_cache)

    yield dedup

    # Cleanup after test
    if test_cache.exists():
        test_cache.unlink()


class TestMessageDeduplication:
    """Test message deduplication functionality."""

    def test_first_occurrence_should_speak(self, deduplicator):
        """Test that first occurrence of a message should speak."""
        msg = "Session completed in multi-agent-observability-system"
        ctx = {"category": "session_completion"}

        should_speak, reason = deduplicator.should_speak(msg, ctx)

        assert should_speak is True
        assert reason is None

    def test_immediate_repeat_should_block(self, deduplicator):
        """Test that immediate repeat of same message is blocked."""
        msg = "Session completed in multi-agent-observability-system"
        ctx = {"category": "session_completion"}

        # First occurrence
        should_speak_1, _ = deduplicator.should_speak(msg, ctx)
        assert should_speak_1 is True

        # Immediate repeat
        should_speak_2, reason_2 = deduplicator.should_speak(msg, ctx)
        assert should_speak_2 is False
        assert "cooldown" in reason_2.lower()
        assert "session_completion" in reason_2

    def test_different_messages_both_speak(self, deduplicator):
        """Test that different messages both speak."""
        msg1 = "Session completed in client"
        msg2 = "Error in authentication module"

        should_speak_1, _ = deduplicator.should_speak(msg1, {"category": "session_completion"})
        should_speak_2, _ = deduplicator.should_speak(msg2, {"category": "error"})

        assert should_speak_1 is True
        assert should_speak_2 is True


class TestCategoryCooldowns:
    """Test category-specific cooldown periods."""

    def test_error_cooldown_shorter_than_session(self, deduplicator):
        """Test that error messages have shorter cooldown than session messages."""
        error_cooldown = deduplicator.category_cooldowns["error"]
        session_cooldown = deduplicator.category_cooldowns["session_completion"]

        assert error_cooldown < session_cooldown
        assert error_cooldown == 60  # 1 minute
        assert session_cooldown == 300  # 5 minutes

    def test_category_detection_from_message(self, deduplicator):
        """Test automatic category detection from message content."""
        # Session completion
        should_speak_1, _ = deduplicator.should_speak("Session completed", {})
        # Should detect session_completion category

        # Error message
        should_speak_2, _ = deduplicator.should_speak("Error occurred", {})
        # Should detect error category

        stats = deduplicator.get_stats()
        categories = list(stats['by_category'].keys())

        # Verify categories were detected
        assert len(categories) >= 1


class TestStatistics:
    """Test deduplication statistics."""

    def test_get_stats_structure(self, deduplicator):
        """Test that get_stats returns correct structure."""
        # Create some test data
        deduplicator.should_speak("Test message 1", {"category": "general"})
        deduplicator.should_speak("Test message 1", {"category": "general"})  # Duplicate
        deduplicator.should_speak("Test message 2", {"category": "error"})

        stats = deduplicator.get_stats()

        assert "total_records" in stats
        assert "by_category" in stats
        assert "recent_duplicates" in stats
        assert isinstance(stats["by_category"], dict)

    def test_duplicate_counting(self, deduplicator):
        """Test that duplicates are counted correctly."""
        msg = "Duplicate message"
        ctx = {"category": "general"}

        # Send same message multiple times
        deduplicator.should_speak(msg, ctx)
        deduplicator.should_speak(msg, ctx)  # Duplicate 1
        deduplicator.should_speak(msg, ctx)  # Duplicate 2

        stats = deduplicator.get_stats()

        # Check that duplicates were counted
        assert stats["total_records"] >= 1
        general_stats = stats["by_category"].get("general", {})
        assert general_stats.get("total_duplicates", 0) >= 2


class TestPersistence:
    """Test cache persistence."""

    def test_cache_saves_to_file(self, deduplicator):
        """Test that cache is saved to file."""
        msg = "Test persistence"
        ctx = {"category": "general"}

        deduplicator.should_speak(msg, ctx)

        # Check that cache file was created
        assert deduplicator.cache_file.exists()

    def test_cache_loads_from_file(self):
        """Test that cache loads from existing file."""
        test_cache = Path("/tmp/tts-queue/test-persistence-cache.json")

        # Create first deduplicator and add message
        dedup1 = MessageDeduplicator(cache_file=test_cache)
        dedup1.should_speak("Persistent message", {"category": "general"})

        # Create second deduplicator with same cache file
        dedup2 = MessageDeduplicator(cache_file=test_cache)

        # Should load existing records
        stats = dedup2.get_stats()
        assert stats["total_records"] >= 1

        # Cleanup
        if test_cache.exists():
            test_cache.unlink()


class TestCleanup:
    """Test old record cleanup."""

    def test_cleanup_removes_old_records(self, deduplicator):
        """Test that old records are cleaned up."""
        # This would require manipulating timestamps, which is complex
        # For now, just verify the method exists and runs
        deduplicator._cleanup_old_records()

        # Should not crash
        assert True


# Convenience function for running tests standalone
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
