# Hooks Documentation

Complete documentation for all Claude Code hooks in the Multi-Agent Observability System.

## Overview

The Multi-Agent Observability System provides enhanced hooks that capture Claude Code events, provide intelligent notifications, and track agent behavior. All hooks integrate with the enterprise TTS system for voice announcements.

## Hook Types

### 1. PreToolUse Hook (`pre_tool_use.py`)

**Purpose**: Captures tool usage before execution, provides context-aware notifications

**Features**:
- Comprehensive tool tracking with MCP parsing
- Smart TTS notifications for important operations
- Context-aware filtering to prevent audio spam
- Special handling for security-critical tools (Bash, Write, Edit)

**Example Notifications**:
- "Bryan, Claude is running a bash command"
- "Bryan, Claude is editing configuration files"
- "Bryan, Claude is searching the web"

### 2. PostToolUse Hook (`post_tool_use.py`)

**Purpose**: Captures tool results, detects errors, and provides completion notifications

**Features**:
- **Enhanced Tool Name Extraction**: Robust extraction from multiple field formats (`tool_name`, `tool`, `name`, `toolName`, etc.)
- **Nested Structure Support**: Checks tool names in nested `payload` and `request` fields
- Error detection with severity analysis
- Tool-specific error patterns
- TTS notifications for errors and important completions
- Performance timing information
- **Debug Logging**: Comprehensive debugging when `HOOK_DEBUG=true` is set

**Tool Name Resolution**:
The hook now supports multiple data formats from different Claude Code versions:
- Primary: `tool_name` (current Claude Code field)
- Legacy: `tool`, `name` (older versions)
- Variants: `toolName`, `tool_type`, `function_name`
- Nested: Checks within `payload` and `request` structures

**Example Notifications**:
- "Bryan, Error: Command failed with exit code 1"
- "Bryan, Tests completed successfully"
- "Bryan, Build failed with compilation errors"

**Troubleshooting "Tool used: unknown"**:
If you see "Tool used: unknown" in the UI:
1. Enable debug mode: `source .claude/hooks/enable_debug.sh`
2. Run the problematic command
3. Check stderr for debug output showing the hook input structure

### 3. UserPromptSubmit Hook (`user_prompt_submit.py`)

**Purpose**: Logs user prompts before Claude processes them

**Features**:
- Captures every user interaction
- Optional prompt validation
- Session-based logging
- Observability server integration

**Display**: Shows as `Prompt: "user's message"` in italic text in the UI

### 4. Notification Hook (`notification.py`)

**Purpose**: Handles permission requests and user interaction notifications

**Features**:
- Permission request detection and TTS
- Idle timeout notifications
- High-risk tool warnings
- Intelligent filtering to prevent spam
- Smart TTS message generation with AI enhancement

**Example Notifications**:
- "Bryan, Claude needs permission to use Bash command"
- "Bryan, Claude has been idle for over a minute"
- "Bryan, your agent needs your input"

### 5. Stop Hook (`stop.py`) - **Enhanced in v1.1.0**

**Purpose**: Provides insightful summaries when Claude Code finishes tasks

**Features**:
- **Session Activity Analysis**: Analyzes recent tool usage, files modified, and commands run
- **Smart Summary Generation**: Creates context-aware summaries based on work performed
- **Personalized TTS**: Announces completion with meaningful context
- **Error Detection**: Tracks if errors were encountered during the session

**Summary Examples**:
- "Bryan, I have finished implementing UI redesign with 6 new components"
- "Bryan, I have finished updating the documentation"
- "Bryan, I have finished running tests and validating the implementation"
- "Bryan, I have finished enhancing the hook system"
- "Bryan, I have finished analyzing the codebase"

**Summary Logic**:
- **UI Work**: Detects Magic tool usage and .vue/.tsx/.jsx files
- **Documentation**: Identifies .md file modifications
- **Testing**: Recognizes test commands (npm test, pytest, etc.)
- **Configuration**: Detects .json/.yml/.yaml/.env changes
- **Analysis**: Identifies Read/Grep usage without file modifications
- **Fallback**: Uses last user prompt to determine context

### 6. SubagentStop Hook (`subagent_stop.py`)

**Purpose**: Tracks when sub-agents complete their tasks

**Features**:
- Sub-agent completion tracking
- Task result summarization
- Parent-child session relationship tracking

### 7. PreCompact Hook (`pre_compact.py`)

**Purpose**: Monitors context compaction events

**Features**:
- Context size tracking
- Compaction trigger monitoring
- Performance impact analysis

### 8. SessionStart Hook (`session_start.py`) - **New Feature**

**Purpose**: Runs when Claude Code starts a new session or resumes an existing session

**Features**:
- **Session Initialization**: Automatically triggered on startup, resume, or clear
- **Context Loading**: Can inject project-specific context at session start
- **Development Context**: Load existing issues, recent changes, or project status
- **Multiple Triggers**: Handles different session start scenarios

**Hook Matchers**:
- `startup` - Invoked from startup
- `resume` - Invoked from `--resume`, `--continue`, or `/resume`
- `clear` - Invoked from `/clear`

**Input Schema**:
```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../session.jsonl",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
```

**Output Control**:
- **Exit code 0**: Success. `stdout` is added to the context (special behavior for SessionStart)
- **Exit code 2**: N/A, shows stderr to user only
- **Other exit codes**: Non-blocking error, stderr shown to user

**Advanced JSON Output**:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Current project status and recent changes..."
  }
}
```

**Configuration Example**:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session_start.py"
          }
        ]
      }
    ]
  }
}
```

**Use Cases**:
- Loading development context at session start
- Initializing project-specific settings
- Adding current project status to context
- Loading recent changes or issues
- Setting up environment variables or configurations

**Example Notifications**:
- "Bryan, Session started - loading project context"
- "Bryan, Resuming previous session with latest changes"
- "Bryan, New session initialized with current project status"

### 9. Send Event Hook (`send_event.py`)

**Purpose**: Generic event sender for custom events

**Features**:
- Flexible event creation
- Automatic summarization
- Chat data inclusion option
- Custom event type support

## TTS Integration

All hooks integrate with the enterprise TTS system through a coordinated queue system to prevent audio overlap:

### Queue Coordination System

Hooks now use the `notify_tts_coordinated()` function from `utils.tts.coordinated_speak`:

```python
from utils.tts.coordinated_speak import notify_tts_coordinated

# Send coordinated TTS notification
notify_tts_coordinated(
    message="Operation complete",
    priority="normal",
    hook_type="pre_tool_use",
    tool_name="Bash"
)
```

**Key Features**:
- **Queue Coordinator Service**: Centralized daemon prevents audio overlap
- **Priority-Based Playback**: Messages queued and played by priority
- **Unix Socket IPC**: Low-latency communication between hooks and coordinator
- **Automatic Fallback**: Falls back to direct speak if coordinator unavailable

### Starting the Queue Coordinator

```bash
# Start the coordinator service
speak-coordinator start

# Check status
speak-coordinator status

# Stop the service
speak-coordinator stop
```

### Legacy Direct TTS Function

For backward compatibility, hooks retain the direct `notify_tts()` function as a fallback:

```python
def notify_tts(message: str, priority: str = "normal") -> bool:
    """Send TTS notification using speak command."""
    engineer_name = os.getenv('ENGINEER_NAME', 'Developer')
    
    # Format message based on priority
    if priority == "error":
        personalized_message = f"{engineer_name}, Error: {message}"
    elif priority == "important":
        personalized_message = f"{engineer_name}, Important: {message}"
    else:
        personalized_message = f"{engineer_name}, {message}"
    
    # Use speak command (non-blocking)
    subprocess.Popen(['speak', personalized_message])
```

**Priority Levels**:
- `normal`: Regular notifications
- `important`: Permission requests, high-risk operations
- `error`: Error notifications
- `subagent_complete`: Sub-agent completion
- `memory_confirmed`: Memory operation success
- `memory_failed`: Memory operation failure

## Installation

### Quick Install

Use the automated installer for new projects:

```bash
cd /path/to/your/project
/home/bryan/multi-agent-observability-system/bin/install-hooks.sh
```

The installer will:
1. Copy hooks to `.claude/hooks/`
2. Validate speak command availability
3. Convert paths to absolute (prevents cd issues)
4. Set up environment configuration
5. Detect and resolve conflicts

### Manual Installation

1. Copy the `.claude` directory to your project root:
   ```bash
   cp -R /home/bryan/multi-agent-observability-system/.claude /path/to/your/project/
   ```

2. Update `.claude/settings.json` with your project name:
   ```json
   "command": "uv run .claude/hooks/send_event.py --source-app YOUR_PROJECT_NAME --event-type PreToolUse"
   ```

3. Set environment variables:
   ```bash
   export TTS_ENABLED=true
   export ENGINEER_NAME="Your Name"
   export TTS_PROVIDER=openai  # Cost-optimized
   ```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TTS_ENABLED` | `true` | Enable/disable TTS notifications |
| `ENGINEER_NAME` | `Developer` | Your name for personalized messages |
| `TTS_PROVIDER` | `openai` | TTS provider (openai/elevenlabs/pyttsx3) |
| `SMART_TTS_ENABLED` | `true` | Enable AI-enhanced TTS messages |
| `TTS_DEBUG` | `false` | Enable debug logging |

### Hook Configuration

Each hook can be configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "uv run /absolute/path/to/.claude/hooks/stop.py"
      }]
    }]
  }
}
```

## Observability Features

### Rate Limiting
- Prevents audio spam through intelligent filtering
- Frequency-based throttling for repetitive events
- Context-aware decisions for notification importance

### Event Coordination
- Multiple hooks can fire for single actions
- Coordinated TTS prevents overlapping audio
- Priority-based queue management

### Session Tracking
- All events linked to Claude session IDs
- Cross-session analysis capabilities
- Parent-child relationship tracking for sub-agents

## Troubleshooting

### Hooks Not Executing
- Ensure absolute paths in settings.json (use `/convert_paths_absolute` command)
- Check uv is installed: `pip install uv`
- Verify Python 3.11+ is available

### TTS Not Working
- Check speak command: `which speak`
- Verify TTS_ENABLED: `echo $TTS_ENABLED`
- Test directly: `speak "Test message"`

### Missing Summaries
- Ensure session logs exist in `~/.claude/sessions/`
- Check file permissions on log directories
- Verify hooks have read access to session data

## Advanced Features

### Custom Hook Development

To create custom hooks:

1. Create Python script in `.claude/hooks/`
2. Import utilities:
   ```python
   from utils.constants import ensure_session_log_dir
   from utils.http_client import send_event_to_server
   ```

3. Read stdin for event data:
   ```python
   input_data = json.loads(sys.stdin.read())
   session_id = input_data.get('session_id')
   ```

4. Process and send events:
   ```python
   event = create_hook_event(
       source_app="your-app",
       session_id=session_id,
       hook_event_type="CustomEvent",
       payload=data
   )
   send_event_to_server(event)
   ```

### Hook Chaining

Hooks can trigger other hooks:
```json
{
  "hooks": [{
    "type": "command",
    "command": "uv run hook1.py && uv run hook2.py"
  }]
}
```

### Conditional Execution

Use matchers for conditional hook execution:
```json
{
  "matcher": ".*\\.py$",
  "hooks": [{
    "type": "command",
    "command": "uv run python_specific_hook.py"
  }]
}
```

## Version History

### v1.1.0 (2025-01-24)
- Enhanced Stop hook with insightful summaries
- Improved session analysis capabilities
- Smart summary generation based on work performed

### v1.0.0 (2025-01-23)
- Initial release with full hook system
- Enterprise TTS integration
- Observability server support

---

For more information, see:
- [Enterprise TTS Integration Guide](./ENTERPRISE_TTS_INTEGRATION.md)
- [Hook Migration Guide](./HOOK_MIGRATION_GUIDE.md)
- [Installation Guide](./INSTALL_HOOKS_GUIDE.md)
