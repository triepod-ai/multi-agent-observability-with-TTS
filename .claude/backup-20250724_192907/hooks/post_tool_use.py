#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-dotenv",
# ]
# ///

"""
Enhanced Post tool use hook for Claude Code with error detection and TTS notifications.
Logs tool usage events, detects errors, and provides context-aware TTS error notifications.
Integrated with Multi-Agent Observability System.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from utils.constants import ensure_session_log_dir
from utils.http_client import send_tool_use_event

# Import observability system for event logging
try:
    from utils.tts.observability import should_speak_event_coordinated
    OBSERVABILITY_AVAILABLE = True
except ImportError:
    OBSERVABILITY_AVAILABLE = False

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

# Log directory for error events
PROJECT_ROOT = Path(__file__).parent.parent.parent
ERROR_LOG_DIR = PROJECT_ROOT / "logs" / "hooks" / "post_tool_use_errors"

def extract_tool_info(hook_input: str) -> Tuple[str, Dict[str, Any], Any]:
    """Extract tool name, parameters, and response from PostToolUse hook input."""
    try:
        data = json.loads(hook_input)
        tool = data.get('tool', 'unknown')
        parameters = data.get('parameters', {})
        tool_response = data.get('tool_response', {})
        return tool, parameters, tool_response
    except Exception:
        return 'unknown', {}, {}

def detect_error(tool: str, parameters: Dict[str, Any], tool_response: Any) -> Optional[Dict[str, Any]]:
    """Detect if tool execution resulted in an error that needs notification."""
    
    # Skip error detection for unknown tools unless there's an explicit error
    if tool == 'unknown' and isinstance(tool_response, dict):
        # Only flag as error if there's an explicit error field
        if not (tool_response.get('is_error') or tool_response.get('error')):
            return None
    
    # Handle different tool response formats
    error_info = None
    
    # Check for explicit error fields
    if isinstance(tool_response, dict):
        # Check for timeout indicators in error messages first
        error_msg = tool_response.get('error', '')
        if error_msg and ('timeout' in error_msg.lower() or 'timed out' in error_msg.lower()):
            error_info = {
                'type': 'timeout_error',
                'message': 'Operation timed out',
                'details': tool_response
            }
        # Direct error field
        elif tool_response.get('is_error') or tool_response.get('error'):
            error_info = {
                'type': 'explicit_error',
                'message': tool_response.get('error', 'Unknown error'),
                'details': tool_response
            }
        
        # Check stderr for command-like tools
        elif 'stderr' in tool_response and tool_response['stderr']:
            stderr = tool_response['stderr'].strip()
            if stderr and not is_ignorable_stderr(tool, stderr):
                error_info = {
                    'type': 'stderr_error', 
                    'message': stderr,
                    'details': tool_response
                }
        
        # Check return codes for Bash commands
        elif tool == 'Bash' and 'returncode' in tool_response:
            returncode = tool_response.get('returncode', 0)
            if returncode != 0:
                command = parameters.get('command', 'command')
                error_info = {
                    'type': 'exit_code_error',
                    'message': f"Command failed with exit code {returncode}: {command}",
                    'exit_code': returncode,
                    'command': command,
                    'details': tool_response
                }
    
    # Tool-specific error detection
    if not error_info:
        error_info = detect_tool_specific_error(tool, parameters, tool_response)
    
    return error_info

def detect_tool_specific_error(tool: str, parameters: Dict[str, Any], tool_response: Any) -> Optional[Dict[str, Any]]:
    """Detect tool-specific error patterns."""
    
    if tool in ['Edit', 'Write', 'MultiEdit']:
        return detect_file_operation_error(tool, parameters, tool_response)
    elif tool in ['WebFetch', 'WebSearch']:
        return detect_web_operation_error(tool, parameters, tool_response)
    elif tool.startswith('mcp__'):
        return detect_mcp_operation_error(tool, parameters, tool_response)
    elif tool == 'Read':
        return detect_read_operation_error(tool, parameters, tool_response)
    elif tool in ['Grep', 'Glob']:
        return detect_search_operation_error(tool, parameters, tool_response)
    
    return None

def detect_file_operation_error(tool: str, parameters: Dict[str, Any], tool_response: Any) -> Optional[Dict[str, Any]]:
    """Detect file operation errors."""
    
    # Common file operation error patterns
    if isinstance(tool_response, dict):
        error_msg = tool_response.get('error', '')
        if any(pattern in error_msg.lower() for pattern in [
            'permission denied', 'access denied', 'no such file', 
            'disk full', 'read-only', 'file exists'
        ]):
            file_path = parameters.get('file_path', 'file')
            filename = Path(file_path).name if file_path != 'file' else 'file'
            return {
                'type': 'file_error',
                'message': f"File operation failed on {filename}: {error_msg}",
                'file_path': file_path,
                'details': tool_response
            }
    
    return None

def detect_web_operation_error(tool: str, parameters: Dict[str, Any], tool_response: Any) -> Optional[Dict[str, Any]]:
    """Detect web operation errors."""
    
    if isinstance(tool_response, dict):
        error_msg = tool_response.get('error', '')
        if any(pattern in error_msg.lower() for pattern in [
            'connection failed', 'timeout', '404', '500', '503', 
            'network error', 'dns resolution', 'ssl error'
        ]):
            url = parameters.get('url', 'website')
            domain = url.split('/')[2] if url.startswith('http') and len(url.split('/')) > 2 else 'website'
            return {
                'type': 'web_error',
                'message': f"Web request failed for {domain}: {error_msg}",
                'url': url,
                'details': tool_response
            }
    
    return None

def detect_mcp_operation_error(tool: str, parameters: Dict[str, Any], tool_response: Any) -> Optional[Dict[str, Any]]:
    """Detect MCP operation errors."""
    
    if isinstance(tool_response, dict):
        error_msg = tool_response.get('error', '')
        if any(pattern in error_msg.lower() for pattern in [
            'connection error', 'authentication failed', 'server error',
            'timeout', 'api limit', 'invalid request', 'database error'
        ]):
            # Parse MCP tool name for friendly display
            parts = tool.split('__')
            server = parts[1].title() if len(parts) >= 2 else 'MCP'
            action = parts[2].replace('_', ' ').title() if len(parts) >= 3 else 'operation'
            
            return {
                'type': 'mcp_error',
                'message': f"{server} error during {action}: {error_msg}",
                'server': server,
                'action': action,
                'details': tool_response
            }
    
    return None

def detect_read_operation_error(tool: str, parameters: Dict[str, Any], tool_response: Any) -> Optional[Dict[str, Any]]:
    """Detect read operation errors."""
    
    if isinstance(tool_response, dict):
        error_msg = tool_response.get('error', '')
        if any(pattern in error_msg.lower() for pattern in [
            'no such file', 'permission denied', 'not found', 'access denied'
        ]):
            file_path = parameters.get('file_path', 'file')
            filename = Path(file_path).name if file_path != 'file' else 'file'
            return {
                'type': 'read_error',
                'message': f"Cannot read {filename}: {error_msg}",
                'file_path': file_path,
                'details': tool_response
            }
    
    return None

def detect_search_operation_error(tool: str, parameters: Dict[str, Any], tool_response: Any) -> Optional[Dict[str, Any]]:
    """Detect search operation errors (usually non-critical)."""
    
    # Most search "errors" are actually normal (no matches found)
    # Only report if there's a genuine system error
    if isinstance(tool_response, dict):
        error_msg = tool_response.get('error', '')
        if any(pattern in error_msg.lower() for pattern in [
            'permission denied', 'system error', 'invalid regex', 'malformed pattern'
        ]):
            pattern = parameters.get('pattern', 'pattern')
            return {
                'type': 'search_error',
                'message': f"Search failed for pattern '{pattern}': {error_msg}",
                'pattern': pattern,
                'details': tool_response
            }
    
    return None

def is_ignorable_stderr(tool: str, stderr: str) -> bool:
    """Check if stderr output should be ignored (not an error)."""
    
    # Common non-error stderr patterns
    ignorable_patterns = [
        # Progress indicators
        r'\d+%|\[.*\]|downloading|processing|building',
        # Warnings that aren't errors
        r'warning:', r'warn:', r'deprecated',
        # Debug/verbose output
        r'debug:', r'verbose:', r'info:',
        # Git status information
        r'your branch is|nothing to commit|up to date',
        # Package manager info
        r'already installed|up to date|found existing',
    ]
    
    stderr_lower = stderr.lower()
    for pattern in ignorable_patterns:
        if re.search(pattern, stderr_lower):
            return True
    
    return False

def should_notify_error(error_info: Dict[str, Any], tool: str) -> bool:
    """Determine if this error should trigger a TTS notification."""
    
    if not error_info:
        return False
    
    error_type = error_info.get('type', '')
    
    # Always notify for critical errors
    critical_errors = ['explicit_error', 'exit_code_error', 'timeout_error', 
                       'file_error', 'web_error', 'mcp_error']
    if error_type in critical_errors:
        return True
    
    # Conditionally notify for less critical errors
    if error_type in ['stderr_error', 'read_error']:
        # Check error severity
        message = error_info.get('message', '').lower()
        if any(critical in message for critical in [
            'permission denied', 'access denied', 'not found', 
            'connection failed', 'timeout', 'system error'
        ]):
            return True
    
    # Skip notifications for search operations with no matches (expected)
    if error_type == 'search_error' and tool in ['Grep', 'Glob']:
        return False
    
    return False

def get_error_severity(error_info: Dict[str, Any]) -> str:
    """Determine error severity for voice and priority selection."""
    
    error_type = error_info.get('type', '')
    message = error_info.get('message', '').lower()
    
    # Critical severity - immediate attention needed
    if error_type in ['explicit_error', 'timeout_error', 'mcp_error']:
        return 'error'
    
    if error_type == 'exit_code_error':
        exit_code = error_info.get('exit_code', 0)
        if exit_code in [1, 2, 126, 127, 130]:  # Common critical exit codes
            return 'error'
        return 'important'
    
    # High severity - important but not critical
    if error_type in ['file_error', 'web_error']:
        if any(critical in message for critical in [
            'permission denied', 'access denied', 'connection failed'
        ]):
            return 'important'
        return 'normal'  
    
    # Medium severity - should be aware but not urgent
    if error_type in ['stderr_error', 'read_error']:
        return 'normal'
    
    return 'normal'

def generate_error_message(error_info: Dict[str, Any], tool: str) -> str:
    """Generate human-friendly error message for TTS."""
    
    error_type = error_info.get('type', '')
    
    # Use specific error message if available
    if 'message' in error_info:
        base_message = error_info['message']
        
        # Make it more conversational for TTS
        if error_type == 'exit_code_error':
            command = error_info.get('command', '').split()[0] if error_info.get('command') else 'command'
            return f"{command} command failed with error code {error_info.get('exit_code', 'unknown')}"
        
        elif error_type == 'file_error':
            return f"File operation error: {base_message}"
        
        elif error_type == 'web_error':
            return f"Web request failed: {base_message}"
        
        elif error_type == 'mcp_error':
            return f"Database error: {base_message}"
        
        elif error_type == 'timeout_error':
            return "Operation timed out"
        
        else:
            return f"Tool error: {base_message}"
    
    # Fallback generic message
    return f"{tool} encountered an error"

def notify_tts(message: str, priority: str = "normal") -> bool:
    """
    Standardized TTS notification using speak command integration.
    Follows LLM Integration Guide patterns for consistent voice notifications.
    """
    try:
        # Skip TTS if disabled
        if os.getenv('TTS_ENABLED', 'true').lower() != 'true':
            return False
        
        # Get engineer name for personalization
        engineer_name = os.getenv('ENGINEER_NAME', 'Developer')
        
        # Format message based on priority (following speak command patterns)
        if priority == "error":
            personalized_message = f"{engineer_name}, Error: {message}"
        elif priority == "important":
            personalized_message = f"{engineer_name}, Important: {message}"
        else:
            personalized_message = f"{engineer_name}, {message}"
        
        # Use speak command (non-blocking) - let speak handle voice selection and coordination
        subprocess.Popen(
            ['speak', personalized_message],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        return True
        
    except Exception:
        # Silently fail - don't disrupt the hook
        return False

def log_error_event(tool: str, parameters: Dict[str, Any], error_info: Dict[str, Any], tts_sent: bool) -> None:
    """Log error event to observability system."""
    try:
        ERROR_LOG_DIR.mkdir(parents=True, exist_ok=True)
        
        # Create daily log file
        log_file = ERROR_LOG_DIR / f"post_tool_use_errors_{datetime.now().strftime('%Y%m%d')}.jsonl"
        
        log_entry = {
            "tool": tool,
            "parameters": parameters,
            "error_info": error_info,
            "tts_sent": tts_sent,
            "timestamp": datetime.now().isoformat(),
            "project": "multi-agent-observability-system",
            "user": os.getenv("USER", "unknown"),
        }
        
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception:
        # Silently fail logging
        pass

def log_tool_use(session_id: str, input_data: dict) -> bool:
    """
    Log tool use data to local session directory.
    
    Args:
        session_id: The Claude session ID
        input_data: The tool use data from stdin
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure session log directory exists
        log_dir = ensure_session_log_dir(session_id)
        log_file = log_dir / 'post_tool_use.json'
        
        # Read existing log data or initialize empty list
        if log_file.exists():
            with open(log_file, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []
        
        # Append the new tool use data
        log_data.append(input_data)
        
        # Write back to file with formatting
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        return True
        
    except Exception as e:
        print(f"Error logging tool use: {e}", file=sys.stderr)
        return False

def main():
    """Main hook execution."""
    try:
        # Read JSON input from stdin
        hook_input = sys.stdin.read()
        input_data = json.loads(hook_input)
        
        # Extract session_id (required for both logging and server)
        session_id = input_data.get('session_id', 'unknown')
        
        # Log to local file (existing functionality)
        local_logged = log_tool_use(session_id, input_data)
        
        # Send to observability server (existing functionality)
        server_sent = send_tool_use_event(session_id, input_data)
        
        # NEW: Extract tool information for error detection
        tool, parameters, tool_response = extract_tool_info(hook_input)
        
        # NEW: Detect errors and handle TTS notifications
        error_info = detect_error(tool, parameters, tool_response)
        tts_sent = False
        
        if error_info and should_notify_error(error_info, tool):
            severity = get_error_severity(error_info)
            message = generate_error_message(error_info, tool)
            
            # Use observability system if available for coordination
            if OBSERVABILITY_AVAILABLE:
                should_speak = should_speak_event_coordinated(
                    message=message,
                    priority=1 if severity == "error" else 2,  # CRITICAL or HIGH
                    category="error",
                    hook_type="post_tool_use",
                    tool_name=tool,
                    metadata={"error_info": error_info, "parameters": parameters}
                )
                
                if should_speak:
                    tts_sent = notify_tts(message, severity)
            else:
                # Fallback to direct TTS
                tts_sent = notify_tts(message, severity)
            
            # Log error event for observability
            log_error_event(tool, parameters, error_info, tts_sent)
        
        # Log success/failure for debugging
        if local_logged and server_sent:
            print(f"Tool use logged locally and sent to server for session {session_id}", file=sys.stderr)
        elif local_logged:
            print(f"Tool use logged locally (server unavailable) for session {session_id}", file=sys.stderr)
        elif server_sent:
            print(f"Tool use sent to server (local logging failed) for session {session_id}", file=sys.stderr)
        else:
            print(f"Both local logging and server communication failed for session {session_id}", file=sys.stderr)
        
        # Always exit successfully - hook should not block tool execution
        sys.exit(0)
        
    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        print("Invalid JSON input to post_tool_use hook", file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        # Handle any other errors gracefully
        print(f"Error in post_tool_use hook: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == '__main__':
    main()