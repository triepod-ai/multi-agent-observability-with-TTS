#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
PreToolUse notification hook with speak command integration.
Provides context-aware TTS notifications before tool execution.
Integrated with Multi-Agent Observability System.
"""

import json
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

# Import observability system for event logging
try:
    from utils.tts.observability import should_speak_event_coordinated, EventCategory, EventPriority
    OBSERVABILITY_AVAILABLE = True
except ImportError:
    OBSERVABILITY_AVAILABLE = False

# Log directory for events
PROJECT_ROOT = Path(__file__).parent.parent.parent
LOG_DIR = PROJECT_ROOT / "logs" / "hooks" / "pre_tool_use"

def extract_tool_info(hook_input: str) -> tuple[str, Dict[str, Any]]:
    """Extract tool and parameter information from hook input."""
    try:
        data = json.loads(hook_input)
        tool = data.get('tool', 'unknown')
        parameters = data.get('parameters', {})
        return tool, parameters
    except Exception:
        return 'unknown', {}

def parse_mcp_tool_name(raw_tool_name: str) -> str:
    """Parse MCP tool names into friendly format."""
    if not raw_tool_name or raw_tool_name.strip() == "":
        return "a tool"
    
    # Handle MCP tool names like mcp__chroma__chroma_list_collections
    if raw_tool_name.startswith("mcp__"):
        parts = raw_tool_name.split("__")
        if len(parts) >= 3:
            server = parts[1]  # e.g., "chroma"
            action = parts[2]  # e.g., "chroma_list_collections"
            
            # Convert snake_case to readable format
            action_words = action.replace("_", " ").title()
            server_name = server.title()
            
            # Remove redundant server name from action if present
            if action_words.lower().startswith(server.lower()):
                action_words = action_words[len(server):].strip()
            
            return f"{server_name} {action_words}".strip()
        elif len(parts) == 2:
            # Simple MCP tool like mcp__chroma
            return parts[1].title()
    
    # Handle standard tools
    tool_mapping = {
        "Bash": "command execution",
        "Read": "file reading",
        "Write": "file writing", 
        "Edit": "file editing",
        "MultiEdit": "multiple file editing",
        "Grep": "text search",
        "Glob": "file pattern matching",
        "Task": "sub-agent task",
        "TodoWrite": "todo management",
        "WebFetch": "web content fetching",
        "WebSearch": "web search",
    }
    
    return tool_mapping.get(raw_tool_name, raw_tool_name.lower())

def generate_notification_message(tool: str, parameters: Dict[str, Any]) -> str:
    """Generate context-aware notification message based on tool and parameters."""
    
    if tool == 'Read':
        file_path = parameters.get('file_path', 'a file')
        filename = Path(file_path).name if file_path != 'a file' else 'a file'
        return f"Claude is about to read {filename}"
    
    elif tool == 'Edit':
        file_path = parameters.get('file_path', 'a file')
        filename = Path(file_path).name if file_path != 'a file' else 'a file'
        return f"Claude is about to edit {filename}"
    
    elif tool == 'Write':
        file_path = parameters.get('file_path', 'a new file')
        filename = Path(file_path).name if file_path != 'a new file' else 'a new file'
        return f"Claude is creating {filename}"
    
    elif tool == 'MultiEdit':
        file_path = parameters.get('file_path', 'a file')
        filename = Path(file_path).name if file_path != 'a file' else 'a file'
        edits_count = len(parameters.get('edits', []))
        return f"Claude is making {edits_count} changes to {filename}"
    
    elif tool == 'Bash':
        command = parameters.get('command', 'a command')
        # Extract just the main command for brevity
        main_command = command.split()[0] if command.split() else 'command'
        
        # Context-aware messages for common commands
        if main_command in ['ls', 'dir']:
            return "Claude is listing directory contents"
        elif main_command in ['cd']:
            return "Claude is changing directories"
        elif main_command in ['chmod', 'chown']:
            return "Claude is modifying file permissions"
        elif main_command in ['python3', 'python']:
            return "Claude is running a Python script"
        elif main_command in ['npm', 'yarn']:
            return "Claude is running package manager commands"
        elif main_command in ['git']:
            return "Claude is using Git"
        elif main_command in ['grep', 'find']:
            return "Claude is searching for files or patterns"
        elif main_command in ['make', 'build']:
            return "Claude is building the project"
        elif main_command in ['test', 'pytest']:
            return "Claude is running tests"
        else:
            return f"Claude is about to run {main_command}"
    
    elif tool == 'Grep':
        pattern = parameters.get('pattern', 'a pattern')
        return f"Claude is searching for {pattern}"
    
    elif tool == 'LS':
        path = parameters.get('path', 'directory')
        dirname = Path(path).name if path != 'directory' else 'directory'
        return f"Claude is listing contents of {dirname}"
    
    elif tool == 'Glob':
        pattern = parameters.get('pattern', 'files')
        return f"Claude is finding files matching {pattern}"
    
    elif tool == 'TodoWrite':
        return "Claude is updating the task list"
    
    elif tool == 'WebFetch':
        url = parameters.get('url', 'a website')
        domain = url.split('/')[2] if url.startswith('http') and len(url.split('/')) > 2 else 'a website'
        return f"Claude is fetching content from {domain}"
    
    elif tool == 'WebSearch':
        query = parameters.get('query', 'information')
        return f"Claude is searching the web for {query}"
    
    elif tool.startswith('mcp__'):
        # MCP tools
        friendly_name = parse_mcp_tool_name(tool)
        return f"Claude is using {friendly_name}"
    
    else:
        friendly_name = parse_mcp_tool_name(tool)
        return f"Claude is about to use {friendly_name}"

def should_notify(tool: str, parameters: Dict[str, Any]) -> bool:
    """Determine if this tool use should trigger a notification."""
    
    # Always notify for potentially dangerous operations
    high_risk_tools = ['Bash', 'Edit', 'Write', 'MultiEdit', 'WebFetch']
    if tool in high_risk_tools:
        return True
    
    # Notify for file operations
    file_tools = ['Read']
    if tool in file_tools:
        file_path = parameters.get('file_path', '')
        # Skip notifications for very common system files
        skip_files = ['/tmp/', '/var/tmp/', '.cache/', '__pycache__']
        if any(skip in file_path for skip in skip_files):
            return False
        return True
    
    # Notify for search operations only if they seem significant
    search_tools = ['Grep', 'Glob']
    if tool in search_tools:
        # Only notify for specific patterns or important searches
        pattern = parameters.get('pattern', '')
        if len(pattern) > 3:  # Skip very short patterns
            return True
        return False
    
    # Skip routine directory listings
    if tool == 'LS':
        return False
    
    # Always notify for MCP operations
    if tool.startswith('mcp__'):
        return True
    
    # Notify for web operations
    web_tools = ['WebFetch', 'WebSearch']
    if tool in web_tools:
        return True
    
    # Notify for task management
    if tool == 'TodoWrite':
        return True
    
    # Default: don't notify for unknown tools
    return False

def determine_priority(tool: str, parameters: Dict[str, Any]) -> str:
    """Determine the priority level for TTS notification."""
    
    # High priority for potentially dangerous operations
    if tool in ['Bash', 'Write', 'MultiEdit']:
        command = parameters.get('command', '')
        if tool == 'Bash' and any(dangerous in command.lower() for dangerous in ['rm', 'del', 'format', 'shutdown']):
            return "important"
        return "important"
    
    # Normal priority for most operations
    return "normal"

def determine_category(tool: str) -> str:
    """Determine the event category for observability."""
    
    if tool in ['Bash']:
        return "command_execution"
    elif tool in ['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep']:
        return "file_operation"
    elif tool in ['WebFetch', 'WebSearch']:
        return "performance"  # Web operations might be slow
    elif tool.startswith('mcp__'):
        return "performance"  # MCP operations might be slow
    else:
        return "general"

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
        if priority == "important":
            personalized_message = f"{engineer_name}, Important: {message}"
        elif priority == "error":
            personalized_message = f"{engineer_name}, Error: {message}"
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

def log_tool_event(tool: str, parameters: Dict[str, Any], should_notify_result: bool) -> None:
    """Log tool event to observability system."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        
        # Create daily log file
        log_file = LOG_DIR / f"pre_tool_use_{datetime.now().strftime('%Y%m%d')}.jsonl"
        
        log_entry = {
            "tool": tool,
            "parameters": parameters,
            "should_notify": should_notify_result,
            "timestamp": datetime.now().isoformat(),
            "project": "multi-agent-observability-system",
            "user": os.getenv("USER", "unknown"),
        }
        
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception:
        # Silently fail logging
        pass

def main():
    """Main hook execution."""
    
    # Read hook input from stdin
    try:
        hook_input = sys.stdin.read().strip()
        if not hook_input:
            sys.exit(0)
    except Exception:
        sys.exit(0)
    
    # Extract tool information
    tool, parameters = extract_tool_info(hook_input)
    
    # Determine if we should notify
    should_notify_result = should_notify(tool, parameters)
    
    # Log the event for observability
    log_tool_event(tool, parameters, should_notify_result)
    
    # Generate and send notification if needed
    if should_notify_result:
        message = generate_notification_message(tool, parameters)
        priority = determine_priority(tool, parameters)
        category = determine_category(tool)
        
        # Use observability system if available for coordination
        if OBSERVABILITY_AVAILABLE:
            should_speak = should_speak_event_coordinated(
                message=message,
                priority=2 if priority == "important" else 3,  # HIGH or MEDIUM
                category=category,
                hook_type="pre_tool_use",
                tool_name=tool,
                metadata={"parameters": parameters}
            )
            
            if should_speak:
                notify_tts(message, priority)
        else:
            # Fallback to direct TTS
            notify_tts(message, priority)
    
    # Always exit successfully (don't block tool execution)
    sys.exit(0)

if __name__ == '__main__':
    main()