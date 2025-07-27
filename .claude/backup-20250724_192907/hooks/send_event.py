#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "python-dotenv",
# ]
# ///

"""
Generic event sender hook for Claude Code.
Sends custom events to the observability server.
"""

import argparse
import json
import sys
from pathlib import Path
from utils.constants import ensure_session_log_dir
from utils.http_client import send_event_to_server, create_hook_event

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional


def log_event(session_id: str, input_data: dict) -> bool:
    """
    Log event data to local session directory.
    
    Args:
        session_id: The Claude session ID
        input_data: The event data from stdin
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure session log directory exists
        log_dir = ensure_session_log_dir(session_id)
        log_file = log_dir / 'send_event.json'
        
        # Read existing log data or initialize empty list
        if log_file.exists():
            with open(log_file, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []
        
        # Append the new event data
        log_data.append(input_data)
        
        # Write back to file with formatting
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        return True
        
    except Exception as e:
        print(f"Error logging event: {e}", file=sys.stderr)
        return False


def main():
    """Main hook execution."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Send events to observability server')
    parser.add_argument('--source-app', default='claude-code', help='Source application name')
    parser.add_argument('--event-type', default='custom_event', help='Event type')
    parser.add_argument('--summarize', action='store_true', help='Generate summary from payload')
    parser.add_argument('--add-chat', action='store_true', help='Include chat data')
    args = parser.parse_args()
    
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Extract required fields
        session_id = input_data.get('session_id', 'unknown')
        # Use command-line event type if provided, otherwise check stdin data
        event_type = args.event_type if args.event_type != 'custom_event' else input_data.get('event_type', 'custom_event')
        
        # Extract hook event name from input data for more specific typing
        hook_event_name = input_data.get('hook_event_name', event_type)
        if hook_event_name and hook_event_name != event_type:
            event_type = hook_event_name
        
        payload = input_data.get('payload', input_data)
        
        # Extract optional fields
        summary = input_data.get('summary')
        chat = input_data.get('chat') if args.add_chat else None
        
        # Generate summary if requested
        if args.summarize and not summary:
            if 'tool_name' in input_data:
                tool_name = input_data.get('tool_name', 'Unknown')
                tool_input = input_data.get('tool_input', {})
                if isinstance(tool_input, dict):
                    if 'command' in tool_input:
                        summary = f"{tool_name}: {tool_input['command'][:50]}..."
                    elif 'file_path' in tool_input:
                        summary = f"{tool_name}: {tool_input['file_path']}"
                    elif 'pattern' in tool_input:
                        summary = f"{tool_name}: {tool_input['pattern']}"
                    else:
                        summary = f"{tool_name} executed"
                else:
                    summary = f"{tool_name} executed"
            elif 'prompt' in input_data:
                summary = f"User prompt: {input_data['prompt'][:50]}..."
            elif 'message' in input_data:
                summary = f"Notification: {input_data['message'][:50]}..."
        
        # Log to local file (for debugging/backup)
        local_logged = log_event(session_id, input_data)
        
        # Create properly formatted event for server
        event = create_hook_event(
            source_app=args.source_app,
            session_id=session_id,
            hook_event_type=event_type,
            payload=payload,
            chat=chat,
            summary=summary
        )
        
        # Send to observability server
        server_sent = send_event_to_server(event)
        
        # Log success/failure for debugging
        if local_logged and server_sent:
            print(f"Event '{event_type}' logged locally and sent to server for session {session_id}", file=sys.stderr)
        elif local_logged:
            print(f"Event '{event_type}' logged locally (server unavailable) for session {session_id}", file=sys.stderr)
        elif server_sent:
            print(f"Event '{event_type}' sent to server (local logging failed) for session {session_id}", file=sys.stderr)
        else:
            print(f"Both local logging and server communication failed for event '{event_type}' in session {session_id}", file=sys.stderr)
        
        # Always exit successfully - hook should not block execution
        sys.exit(0)
        
    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        print("Invalid JSON input to send_event hook", file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        # Handle any other errors gracefully
        print(f"Error in send_event hook: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == '__main__':
    main()
