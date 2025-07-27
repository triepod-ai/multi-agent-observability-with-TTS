#!/usr/bin/env python3
"""
Integration tests for post_tool_use hook with database and server components.

These tests verify that the complete event flow works correctly:
1. Hook processes input correctly
2. Events are stored in database with correct summaries
3. Server API returns correct data
4. No "Tool used: unknown" events are created

Prevents regression where database contained incorrect event summaries.
"""

import json
import os
import sys
import pytest
import tempfile
import subprocess
import time
import requests
from pathlib import Path
from unittest.mock import patch

# Add project paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
HOOKS_DIR = PROJECT_ROOT / ".claude" / "hooks"
SERVER_DIR = PROJECT_ROOT / "apps" / "server"
sys.path.insert(0, str(HOOKS_DIR))

from post_tool_use import main as post_tool_use_main

class TestDatabaseIntegration:
    """Test integration between hook and database storage."""
    
    @pytest.fixture
    def temp_db_file(self):
        """Create a temporary database file for testing."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            db_path = f.name
        yield db_path
        # Cleanup
        if os.path.exists(db_path):
            os.unlink(db_path)
    
    @pytest.fixture
    def test_server(self, temp_db_file):
        """Start a test server instance with temporary database."""
        # Change to server directory and start server with test database
        original_cwd = os.getcwd()
        os.chdir(SERVER_DIR)
        
        # Set environment to use test database
        env = os.environ.copy()
        env['DATABASE_PATH'] = temp_db_file
        env['PORT'] = '4001'  # Use different port for testing
        
        # Start server process
        server_process = subprocess.Popen(
            ['bun', 'run', 'start'],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to start
        time.sleep(3)
        
        yield 'http://localhost:4001'
        
        # Cleanup
        server_process.terminate()
        server_process.wait()
        os.chdir(original_cwd)
    
    def test_write_tool_creates_correct_database_entry(self, temp_db_file):
        """Test that Write tool operations create correct database entries."""
        # Simulate hook input for Write operation
        hook_input = {
            "session_id": "test-session-123",
            "tool_name": "Write",
            "tool_input": {
                "file_path": "/test/regression_test.txt",
                "content": "Testing hook regression fix"
            },
            "tool_response": {
                "type": "text",
                "file": {
                    "filePath": "/test/regression_test.txt",
                    "content": "Testing hook regression fix"
                }
            }
        }
        
        # Mock environment variables for testing
        with patch.dict(os.environ, {
            'OBSERVABILITY_SERVER_URL': 'http://localhost:4001',
            'TTS_ENABLED': 'false'
        }):
            with patch('sys.stdin', new_callable=lambda: tempfile.StringIO(json.dumps(hook_input))):
                with patch('sys.exit'):  # Prevent actual exit
                    post_tool_use_main()
        
        # Verify database entry was created correctly
        import sqlite3
        conn = sqlite3.connect(temp_db_file)
        cursor = conn.cursor()
        
        cursor.execute("SELECT summary, hook_event_type, payload FROM events ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        
        assert row is not None
        summary, hook_event_type, payload_json = row
        payload = json.loads(payload_json)
        
        # Critical regression checks
        assert "Tool used: Write" in summary or "Write:" in summary
        assert "Tool used: unknown" not in summary
        assert payload.get("tool_name") == "Write"
        
        conn.close()
    
    def test_read_tool_with_timeout_content_no_false_error(self, temp_db_file):
        """Test that reading files with timeout content doesn't create error events."""
        hook_input = {
            "session_id": "test-session-456",
            "tool_name": "Read",
            "tool_input": {
                "file_path": "/test/timeout_config.py"
            },
            "tool_response": {
                "type": "text",
                "file": {
                    "filePath": "/test/timeout_config.py",
                    "content": "TIMEOUT = 30\nCONNECTION_TIMEOUT = 5.0\ndef handle_timeout():\n    pass"
                }
            }
        }
        
        with patch.dict(os.environ, {
            'OBSERVABILITY_SERVER_URL': 'http://localhost:4001',
            'TTS_ENABLED': 'false'
        }):
            with patch('sys.stdin', new_callable=lambda: tempfile.StringIO(json.dumps(hook_input))):
                with patch('sys.exit'):
                    post_tool_use_main()
        
        # Verify no error events were created
        import sqlite3
        conn = sqlite3.connect(temp_db_file)
        cursor = conn.cursor()
        
        # Check that no error logs were created
        error_log_dir = PROJECT_ROOT / "logs" / "hooks" / "post_tool_use_errors"
        if error_log_dir.exists():
            for log_file in error_log_dir.glob("*.jsonl"):
                with open(log_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            error_event = json.loads(line)
                            # Ensure this test didn't create any error events
                            assert error_event.get('tool') != 'Read' or 'timeout_config.py' not in str(error_event)
        
        conn.close()
    
    def test_multiple_tool_types_all_extracted_correctly(self, temp_db_file):
        """Test that various tool types are all extracted and stored correctly."""
        test_tools = [
            {
                "tool_name": "Edit",
                "tool_input": {"file_path": "/test/file.py", "old_string": "old", "new_string": "new"},
                "tool_response": {"type": "update", "numChanges": 1}
            },
            {
                "tool_name": "Bash",
                "tool_input": {"command": "ls -la", "description": "List files"},
                "tool_response": {"stdout": "file1.txt\nfile2.txt", "stderr": "", "returncode": 0}
            },
            {
                "tool_name": "Grep",
                "tool_input": {"pattern": "test", "path": "/test/"},
                "tool_response": {"matches": ["test1", "test2"]}
            }
        ]
        
        session_base = "test-multi-session"
        
        for i, tool_data in enumerate(test_tools):
            hook_input = {
                "session_id": f"{session_base}-{i}",
                **tool_data
            }
            
            with patch.dict(os.environ, {
                'OBSERVABILITY_SERVER_URL': 'http://localhost:4001',
                'TTS_ENABLED': 'false'
            }):
                with patch('sys.stdin', new_callable=lambda: tempfile.StringIO(json.dumps(hook_input))):
                    with patch('sys.exit'):
                        post_tool_use_main()
        
        # Verify all tools were stored correctly
        import sqlite3
        conn = sqlite3.connect(temp_db_file)
        cursor = conn.cursor()
        
        cursor.execute("SELECT payload FROM events WHERE session_id LIKE ? ORDER BY id", (f"{session_base}%",))
        rows = cursor.fetchall()
        
        assert len(rows) == len(test_tools)
        
        for i, (payload_json,) in enumerate(rows):
            payload = json.loads(payload_json)
            expected_tool = test_tools[i]["tool_name"]
            
            assert payload.get("tool_name") == expected_tool
            # Ensure no tool was marked as unknown
            assert payload.get("tool_name") != "unknown"
        
        conn.close()

class TestServerAPIIntegration:
    """Test integration with the observability server API."""
    
    @pytest.fixture
    def test_server_url(self):
        """Use the main test server if running, otherwise skip."""
        url = "http://localhost:4000"
        try:
            response = requests.get(url, timeout=1)
            if response.status_code == 200:
                return url
            else:
                pytest.skip("Test server not running")
        except requests.exceptions.RequestException:
            pytest.skip("Test server not available")
    
    def test_api_receives_correct_tool_events(self, test_server_url):
        """Test that the API receives events with correct tool names."""
        test_event = {
            "source_app": "test-suite",
            "session_id": "api-test-session",
            "hook_event_type": "PostToolUse",
            "payload": {
                "tool_name": "Write",
                "tool_input": {
                    "file_path": "/test/api_test.txt",
                    "content": "API integration test"
                }
            },
            "summary": "Tool used: Write",
            "timestamp": int(time.time() * 1000)
        }
        
        # Send event to server
        response = requests.post(
            f"{test_server_url}/events",
            json=test_event,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        assert response.status_code == 200
        
        # Retrieve recent events and verify
        response = requests.get(f"{test_server_url}/events/recent?limit=1", timeout=5)
        assert response.status_code == 200
        
        events = response.json()
        assert len(events) > 0
        
        latest_event = events[-1]
        assert latest_event["payload"]["tool_name"] == "Write"
        assert "Tool used: Write" in latest_event["summary"]
        assert "Tool used: unknown" not in latest_event["summary"]
    
    def test_api_returns_correct_filter_options(self, test_server_url):
        """Test that filter options include tool names correctly."""
        response = requests.get(f"{test_server_url}/events/filter-options", timeout=5)
        assert response.status_code == 200
        
        filter_options = response.json()
        
        # Verify structure
        assert "source_apps" in filter_options
        assert "session_ids" in filter_options
        assert "hook_event_types" in filter_options
        
        # Verify no unknown tool entries (would indicate regression)
        assert "unknown" not in str(filter_options).lower()

class TestEndToEndRegression:
    """End-to-end tests that simulate the exact regression scenario."""
    
    def test_write_operation_full_pipeline(self, temp_db_file):
        """Test complete pipeline: hook -> database -> API -> UI data."""
        # Step 1: Simulate hook processing a Write operation
        hook_input = {
            "session_id": "e2e-test-session",
            "tool_name": "Write", 
            "tool_input": {
                "file_path": "/test/e2e_regression_test.txt",
                "content": "End-to-end regression test content"
            },
            "tool_response": {
                "type": "text",
                "file": {
                    "filePath": "/test/e2e_regression_test.txt",
                    "content": "End-to-end regression test content"
                }
            }
        }
        
        # Step 2: Process through hook
        with patch.dict(os.environ, {
            'OBSERVABILITY_SERVER_URL': 'http://localhost:4001',
            'TTS_ENABLED': 'false'
        }):
            with patch('sys.stdin', new_callable=lambda: tempfile.StringIO(json.dumps(hook_input))):
                with patch('sys.exit'):
                    post_tool_use_main()
        
        # Step 3: Verify database contains correct data
        import sqlite3
        conn = sqlite3.connect(temp_db_file)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT summary, payload, hook_event_type 
            FROM events 
            WHERE session_id = ? 
            ORDER BY id DESC LIMIT 1
        """, ("e2e-test-session",))
        
        row = cursor.fetchone()
        assert row is not None
        
        summary, payload_json, hook_event_type = row
        payload = json.loads(payload_json)
        
        # Critical regression checks - these exact issues were in the screenshots
        assert payload.get("tool_name") == "Write"  # Not "unknown"
        assert summary and "Write" in summary  # Not "Tool used: unknown"
        assert "unknown" not in summary.lower()
        
        # Step 4: Verify no error events were created
        error_count = cursor.execute("""
            SELECT COUNT(*) FROM events 
            WHERE session_id = ? AND (
                summary LIKE '%error%' OR 
                summary LIKE '%timeout%' OR
                summary LIKE '%unknown%'
            )
        """, ("e2e-test-session",)).fetchone()[0]
        
        assert error_count == 0
        
        conn.close()
    
    def test_no_tool_used_unknown_in_any_events(self, temp_db_file):
        """Test that no events contain 'Tool used: unknown' after processing."""
        # Process several different tool operations
        test_operations = [
            {
                "session_id": "regression-write",
                "tool_name": "Write",
                "tool_input": {"file_path": "/test/write.txt", "content": "test"},
                "tool_response": {"type": "text", "file": {"filePath": "/test/write.txt"}}
            },
            {
                "session_id": "regression-read", 
                "tool_name": "Read",
                "tool_input": {"file_path": "/test/read.txt"},
                "tool_response": {"type": "text", "file": {"content": "test content"}}
            },
            {
                "session_id": "regression-edit",
                "tool_name": "Edit", 
                "tool_input": {"file_path": "/test/edit.txt", "old_string": "old", "new_string": "new"},
                "tool_response": {"type": "update", "numChanges": 1}
            }
        ]
        
        # Process all operations
        for operation in test_operations:
            with patch.dict(os.environ, {
                'OBSERVABILITY_SERVER_URL': 'http://localhost:4001',
                'TTS_ENABLED': 'false'
            }):
                with patch('sys.stdin', new_callable=lambda: tempfile.StringIO(json.dumps(operation))):
                    with patch('sys.exit'):
                        post_tool_use_main()
        
        # Verify no "Tool used: unknown" events exist
        import sqlite3
        conn = sqlite3.connect(temp_db_file)
        cursor = conn.cursor()
        
        unknown_count = cursor.execute("""
            SELECT COUNT(*) FROM events 
            WHERE summary LIKE '%Tool used: unknown%'
        """).fetchone()[0]
        
        assert unknown_count == 0, "Found events with 'Tool used: unknown' - regression detected!"
        
        # Verify all tools were identified correctly
        cursor.execute("""
            SELECT session_id, payload FROM events 
            WHERE session_id LIKE 'regression-%'
        """)
        
        for session_id, payload_json in cursor.fetchall():
            payload = json.loads(payload_json)
            tool_name = payload.get("tool_name")
            
            assert tool_name != "unknown", f"Tool name is unknown in session {session_id}"
            assert tool_name in ["Write", "Read", "Edit"], f"Unexpected tool name: {tool_name}"
        
        conn.close()

if __name__ == "__main__":
    # Run integration tests
    pytest.main([__file__, "-v", "--tb=short"])