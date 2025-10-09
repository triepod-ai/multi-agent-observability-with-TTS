#!/usr/bin/env python3
"""
Test suite for metric extraction from rich context.

Tests the extract_metrics logic used in speak-ai-summary for extracting
actionable metrics (files, tests, errors, duration) from hook event context.
"""

import pytest
from typing import Dict, Any


def extract_metrics(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract actionable metrics from context for inclusion in TTS.

    This is the same logic used in speak-ai-summary (/home/bryan/bin/speak-ai-summary).

    Args:
        context: Rich context data from hooks

    Returns:
        Dict with extracted metrics: files, tests, errors, duration, items, changes
    """
    metrics = {
        "files": 0,
        "tests": 0,
        "errors": 0,
        "duration": None,
        "items": 0,
        "changes": 0
    }

    # Extract from context field
    ctx = context.get("context", {})
    if isinstance(ctx, dict):
        metrics["files"] = ctx.get("files_affected", 0)
        metrics["errors"] = ctx.get("error_count", 0)

    # Extract from metrics field
    metric_data = context.get("metrics", {})
    if isinstance(metric_data, dict):
        metrics["duration"] = metric_data.get("duration_ms")
        if "error" in metric_data.get("severity", "").lower():
            metrics["errors"] = max(metrics["errors"], 1)

    # Extract from payload (for hook events)
    payload = context.get("payload", {})
    if isinstance(payload, dict):
        # Test results
        if "tests_run" in payload:
            metrics["tests"] = payload.get("tests_run", 0)
        if "tests_passed" in payload:
            metrics["tests"] = payload.get("tests_passed", 0)

        # File operations
        if "files_affected" in payload:
            metrics["files"] = payload.get("files_affected", 0)
        if "files_modified" in payload:
            metrics["files"] = max(metrics["files"], payload.get("files_modified", 0))

        # Error tracking
        if "error_occurred" in payload and payload["error_occurred"]:
            metrics["errors"] += 1

        # Duration
        if "duration_ms" in payload:
            metrics["duration"] = payload.get("duration_ms")

    # Extract from error_info
    error_info = context.get("error_info", {})
    if isinstance(error_info, dict) and error_info.get("has_error"):
        metrics["errors"] = max(metrics["errors"], 1)

    return metrics


def build_metric_hints(metrics: Dict[str, Any]) -> str:
    """
    Build metric context string for AI prompt.

    Args:
        metrics: Extracted metrics dict

    Returns:
        Comma-separated string of metrics (e.g., "3 files, 12 tests")
    """
    metric_hints = []

    if metrics["files"] > 0:
        metric_hints.append(f"{metrics['files']} file{'s' if metrics['files'] > 1 else ''}")
    if metrics["tests"] > 0:
        metric_hints.append(f"{metrics['tests']} test{'s' if metrics['tests'] > 1 else ''}")
    if metrics["errors"] > 0:
        metric_hints.append(f"{metrics['errors']} error{'s' if metrics['errors'] > 1 else ''}")
    if metrics["duration"] and metrics["duration"] > 5000:  # Over 5 seconds
        duration_sec = int(metrics["duration"] / 1000)
        metric_hints.append(f"{duration_sec}s")

    return ", ".join(metric_hints) if metric_hints else ""


class TestMetricExtraction:
    """Test metric extraction from various context structures."""

    def test_test_completion_with_file_count(self):
        """Test extraction from test completion with file count."""
        context = {
            "summary": "Tests passed",
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

    def test_code_review_with_files(self):
        """Test extraction from code review with files and duration."""
        context = {
            "summary": "Code review completed",
            "context": {
                "files_affected": 5
            },
            "metrics": {
                "duration_ms": 8500
            }
        }

        metrics = extract_metrics(context)

        assert metrics["files"] == 5
        assert metrics["duration"] == 8500
        assert metrics["errors"] == 0

    def test_build_with_errors(self):
        """Test extraction from build failure with errors."""
        context = {
            "summary": "Build failed",
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
        # Error from payload (1) + error from severity (1) = 2
        assert metrics["errors"] >= 1

    def test_session_completion_with_duration(self):
        """Test extraction from session completion with duration."""
        context = {
            "summary": "Session completed",
            "metrics": {
                "duration_ms": 45000
            }
        }

        metrics = extract_metrics(context)

        assert metrics["duration"] == 45000
        assert metrics["errors"] == 0

    def test_empty_context(self):
        """Test extraction from empty context."""
        context = {}

        metrics = extract_metrics(context)

        # Should return zeros/None for empty context
        assert metrics["files"] == 0
        assert metrics["tests"] == 0
        assert metrics["errors"] == 0
        assert metrics["duration"] is None

    def test_files_modified_takes_max(self):
        """Test that files_modified uses max() correctly."""
        context = {
            "context": {
                "files_affected": 3
            },
            "payload": {
                "files_modified": 5
            }
        }

        metrics = extract_metrics(context)

        # Should take the max of the two values
        assert metrics["files"] == 5

    def test_error_from_error_info(self):
        """Test error extraction from error_info field."""
        context = {
            "error_info": {
                "has_error": True,
                "error_message": "Something went wrong"
            }
        }

        metrics = extract_metrics(context)

        assert metrics["errors"] >= 1


class TestMetricHints:
    """Test metric hint string generation."""

    def test_build_metric_hints_with_files_and_tests(self):
        """Test building metric hints with files and tests."""
        metrics = {
            "files": 3,
            "tests": 12,
            "errors": 0,
            "duration": None,
            "items": 0,
            "changes": 0
        }

        hints = build_metric_hints(metrics)

        assert "3 files" in hints
        assert "12 tests" in hints

    def test_build_metric_hints_with_errors(self):
        """Test building metric hints with errors."""
        metrics = {
            "files": 2,
            "tests": 0,
            "errors": 1,
            "duration": None,
            "items": 0,
            "changes": 0
        }

        hints = build_metric_hints(metrics)

        assert "2 files" in hints
        assert "1 error" in hints

    def test_build_metric_hints_with_duration(self):
        """Test building metric hints with significant duration."""
        metrics = {
            "files": 5,
            "tests": 0,
            "errors": 0,
            "duration": 8500,  # 8.5 seconds
            "items": 0,
            "changes": 0
        }

        hints = build_metric_hints(metrics)

        assert "5 files" in hints
        assert "8s" in hints

    def test_build_metric_hints_ignores_short_duration(self):
        """Test that short durations (<5s) are ignored."""
        metrics = {
            "files": 0,
            "tests": 0,
            "errors": 0,
            "duration": 3000,  # 3 seconds (too short)
            "items": 0,
            "changes": 0
        }

        hints = build_metric_hints(metrics)

        assert hints == ""  # No hints for short duration

    def test_build_metric_hints_empty(self):
        """Test building metric hints with no metrics."""
        metrics = {
            "files": 0,
            "tests": 0,
            "errors": 0,
            "duration": None,
            "items": 0,
            "changes": 0
        }

        hints = build_metric_hints(metrics)

        assert hints == ""

    def test_singular_vs_plural(self):
        """Test singular vs plural forms in hints."""
        # Singular
        metrics_singular = {
            "files": 1,
            "tests": 1,
            "errors": 1,
            "duration": None,
            "items": 0,
            "changes": 0
        }

        hints_singular = build_metric_hints(metrics_singular)

        assert "1 file" in hints_singular
        assert "1 test" in hints_singular
        assert "1 error" in hints_singular
        assert "files" not in hints_singular  # Should not have plural

        # Plural
        metrics_plural = {
            "files": 2,
            "tests": 2,
            "errors": 2,
            "duration": None,
            "items": 0,
            "changes": 0
        }

        hints_plural = build_metric_hints(metrics_plural)

        assert "2 files" in hints_plural
        assert "2 tests" in hints_plural
        assert "2 errors" in hints_plural


class TestRealWorldScenarios:
    """Test real-world scenarios from actual hooks."""

    def test_test_run_complete_scenario(self):
        """Test scenario: Test run completes with all passing."""
        context = {
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

        metrics = extract_metrics(context)
        hints = build_metric_hints(metrics)

        assert metrics["tests"] == 15
        assert metrics["files"] == 5
        assert "15 tests" in hints
        assert "5 files" in hints

    def test_build_failure_scenario(self):
        """Test scenario: Build fails with errors."""
        context = {
            "tool_name": "Bash",
            "summary": "Build failed",
            "payload": {
                "error_occurred": True,
                "files_affected": 2
            },
            "metrics": {
                "severity": "urgent"
            }
        }

        metrics = extract_metrics(context)
        hints = build_metric_hints(metrics)

        assert metrics["files"] == 2
        assert metrics["errors"] >= 1
        assert "error" in hints.lower()


# Convenience function for running tests standalone
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
