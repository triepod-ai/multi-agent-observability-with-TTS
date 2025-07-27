#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-dotenv",
# ]
# ///

import argparse
import json
import os
import sys
import subprocess
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from utils.constants import ensure_session_log_dir

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

# Import coordinated TTS for queue-based notifications
try:
    from utils.tts.coordinated_speak import notify_tts_coordinated
    COORDINATED_TTS_AVAILABLE = True
except ImportError:
    COORDINATED_TTS_AVAILABLE = False

# Import observability system for event logging
try:
    from utils.tts.observability import should_speak_event_coordinated
    OBSERVABILITY_AVAILABLE = True
except ImportError:
    OBSERVABILITY_AVAILABLE = False


def extract_subagent_info(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract meaningful information about the subagent execution."""
    info = {
        "agent_name": "unknown agent",
        "task_description": "",
        "duration": None,
        "result_summary": "",
        "error_occurred": False,
        "files_affected": 0,
        "tests_run": 0,
        "code_reviewed": False
    }
    
    # Try to get agent name from various fields
    agent_fields = ['agent_name', 'subagent_name', 'agent', 'name', 'type']
    for field in agent_fields:
        if field in input_data and input_data[field]:
            info['agent_name'] = input_data[field]
            break
    
    # Get task description
    desc_fields = ['task_description', 'description', 'task', 'prompt']
    for field in desc_fields:
        if field in input_data and input_data[field]:
            info['task_description'] = str(input_data[field])[:100]  # Limit length
            break
    
    # Get duration if available
    if 'duration' in input_data:
        info['duration'] = input_data['duration']
    elif 'start_time' in input_data and 'end_time' in input_data:
        try:
            start = datetime.fromisoformat(input_data['start_time'])
            end = datetime.fromisoformat(input_data['end_time'])
            info['duration'] = (end - start).total_seconds()
        except:
            pass
    
    # Analyze result/output for summary information
    result_fields = ['result', 'output', 'response', 'stdout']
    for field in result_fields:
        if field in input_data and input_data[field]:
            result = str(input_data[field]).lower()
            
            # Check for errors
            if any(error in result for error in ['error', 'failed', 'exception', 'traceback']):
                info['error_occurred'] = True
            
            # Extract test information
            test_match = re.search(r'(\d+)\s*test[s]?\s*(pass|ran|executed)', result)
            if test_match:
                info['tests_run'] = int(test_match.group(1))
            
            # Check for file operations
            file_match = re.search(r'(\d+)\s*file[s]?\s*(modified|changed|updated|created)', result)
            if file_match:
                info['files_affected'] = int(file_match.group(1))
            
            # Check for code review
            if 'review' in result and ('complete' in result or 'finished' in result):
                info['code_reviewed'] = True
            
            # Get a brief summary
            if len(result) > 50:
                # Try to find a summary line
                summary_patterns = [
                    r'summary:\s*(.{1,100})',
                    r'result:\s*(.{1,100})',
                    r'completed:\s*(.{1,100})',
                    r'finished:\s*(.{1,100})'
                ]
                for pattern in summary_patterns:
                    match = re.search(pattern, result, re.IGNORECASE)
                    if match:
                        info['result_summary'] = match.group(1).strip()
                        break
    
    return info

def generate_context_rich_message(info: Dict[str, Any]) -> str:
    """Generate a context-rich announcement based on subagent information."""
    
    # Determine agent type for specific messaging
    agent_name = info['agent_name'].lower()
    
    # Base message
    if 'code review' in agent_name or 'reviewer' in agent_name:
        if info['error_occurred']:
            message = "Code review found issues that need attention"
        elif info['files_affected'] > 0:
            message = f"Code review completed for {info['files_affected']} files"
        else:
            message = "Code review completed successfully"
    
    elif 'test' in agent_name or 'qa' in agent_name:
        if info['tests_run'] > 0:
            if info['error_occurred']:
                message = f"Test run completed with failures: {info['tests_run']} tests"
            else:
                message = f"All {info['tests_run']} tests passed"
        else:
            message = "Test agent completed"
    
    elif 'debug' in agent_name:
        if info['error_occurred']:
            message = "Debugger found and fixed issues"
        else:
            message = "Debugging completed, no issues found"
    
    elif 'data' in agent_name or 'analyst' in agent_name:
        message = "Data analysis completed"
        if info['result_summary']:
            message += f": {info['result_summary'][:50]}"
    
    else:
        # Generic completion message
        if info['task_description']:
            task = info['task_description'][:50]
            message = f"Agent completed: {task}"
        else:
            message = f"{info['agent_name'].title()} completed successfully"
    
    # Add duration if available
    if info['duration']:
        if info['duration'] < 60:
            duration_str = f"{int(info['duration'])} seconds"
        else:
            duration_str = f"{info['duration']/60:.1f} minutes"
        message += f" in {duration_str}"
    
    return message

def notify_tts(message: str, priority: str = "normal") -> bool:
    """Send TTS notification using coordinated system or fallback."""
    
    # Use coordinated TTS if available
    if COORDINATED_TTS_AVAILABLE:
        return notify_tts_coordinated(
            message=message,
            priority=priority,
            hook_type="subagent_stop",
            tool_name="subagent"
        )
    
    # Fallback to direct speak command
    try:
        # Skip TTS if disabled
        if os.getenv('TTS_ENABLED', 'true').lower() != 'true':
            return False
        
        # Get engineer name for personalization
        engineer_name = os.getenv('ENGINEER_NAME', 'Developer')
        personalized_message = f"{engineer_name}, {message}"
        
        # Use speak command (non-blocking)
        subprocess.Popen(
            ['speak', personalized_message],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        return True
        
    except Exception:
        # Silently fail - don't disrupt the hook
        return False

def announce_subagent_completion(input_data: Dict[str, Any]):
    """Announce subagent completion with context-rich information."""
    try:
        # Extract subagent information
        info = extract_subagent_info(input_data)
        
        # Generate context-rich message
        message = generate_context_rich_message(info)
        
        # Determine priority based on content
        if info['error_occurred']:
            priority = "important"
        else:
            priority = "normal"
        
        # Use observability system if available
        if OBSERVABILITY_AVAILABLE:
            should_speak = should_speak_event_coordinated(
                message=message,
                priority=2 if priority == "important" else 3,  # HIGH or MEDIUM
                category="completion",
                hook_type="subagent_stop",
                tool_name="subagent",
                metadata={"subagent_info": info}
            )
            
            if should_speak:
                notify_tts(message, priority)
        else:
            # Direct TTS notification
            notify_tts(message, priority)
        
    except Exception:
        # Fall back to simple notification on any error
        notify_tts("Subagent completed", "normal")


def main():
    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser()
        parser.add_argument('--chat', action='store_true', help='Copy transcript to chat.json')
        args = parser.parse_args()
        
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Extract required fields
        session_id = input_data.get("session_id", "")
        stop_hook_active = input_data.get("stop_hook_active", False)

        # Ensure session log directory exists
        log_dir = ensure_session_log_dir(session_id)
        log_path = log_dir / "subagent_stop.json"

        # Read existing log data or initialize empty list
        if log_path.exists():
            with open(log_path, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []
        
        # Append new data
        log_data.append(input_data)
        
        # Write back to file with formatting
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        # Handle --chat switch (same as stop.py)
        if args.chat and 'transcript_path' in input_data:
            transcript_path = input_data['transcript_path']
            if os.path.exists(transcript_path):
                # Read .jsonl file and convert to JSON array
                chat_data = []
                try:
                    with open(transcript_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line:
                                try:
                                    chat_data.append(json.loads(line))
                                except json.JSONDecodeError:
                                    pass  # Skip invalid lines
                    
                    # Write to logs/chat.json
                    chat_file = os.path.join(log_dir, 'chat.json')
                    with open(chat_file, 'w') as f:
                        json.dump(chat_data, f, indent=2)
                except Exception:
                    pass  # Fail silently

        # Announce subagent completion via TTS with context
        announce_subagent_completion(input_data)

        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)


if __name__ == "__main__":
    main()