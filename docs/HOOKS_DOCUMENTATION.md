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

**Purpose**: Comprehensive tracking and summarization of sub-agent task completion

**Enhanced Features**:
- **Advanced Agent Detection**:
  - Multi-strategy agent name extraction
  - Robust tool usage tracking
  - Comprehensive metadata capture
  - **Intelligent TTS Filtering for Generic Agents** (NEW)

- **Agent Name Extraction**:
  ```python
  def extract_agent_name_from_transcript(transcript):
      """
      Extract agent name using multiple detection strategies
      """
      # Strategy 1: @-mention detection
      mention_match = re.search(r'@(\w+(?:-\w+)*)', transcript)
      if mention_match:
          return mention_match.group(1)
      
      # Strategy 2: Task tool delegation
      task_match = re.search(r'delegate to (\w+(?:-\w+)*)', transcript)
      if task_match:
          return task_match.group(1)
      
      # Strategy 3: Keyword pattern matching
      keyword_patterns = {
          'debugger': ['debug', 'fix', 'troubleshoot'],
          'analyzer': ['analyze', 'investigate'],
          'reviewer': ['review', 'check', 'validate']
      }
      
      for agent_type, patterns in keyword_patterns.items():
          if any(pattern in transcript.lower() for pattern in patterns):
              return f"{agent_type}-agent"
      
      return 'unknown-agent'
  ```

- **Tool Extraction**:
  ```python
  def extract_tools_from_transcript(transcript):
      """
      Extract tools used by analyzing the transcript
      """
      tool_patterns = {
          'Read': ['read file', 'read', 'cat', 'grep'],
          'Write': ['write file', 'create', 'generate'],
          'Edit': ['edit', 'modify', 'update', 'change'],
          'Bash': ['run command', 'bash', 'shell'],
          'Grep': ['search', 'find in files'],
          'MultiEdit': ['multi-edit', 'bulk edit']
      }
      
      used_tools = []
      for tool, patterns in tool_patterns.items():
          if any(pattern in transcript.lower() for pattern in patterns):
              used_tools.append(tool)
      
      return used_tools
  ```

- **Sub-agent Completion Tracking**
  - Capture task start and end times
  - Calculate precise duration
  - Track resource utilization
  - Detect success/failure status

- **Metadata Enrichment**
  - Automatically classify agent types
  - Capture performance metrics
  - Track token usage and cost

- **Error Detection**
  - Sophisticated error pattern recognition
  - Categorize error severity
  - Extract meaningful error context

- **Observability Integration**
  - Push metrics to Redis
  - Send events to observability server
  - Support real-time monitoring

#### Generic Agent TTS Filtering (NEW)

**Purpose**: Reduce audio notification spam by filtering out generic/utility agents from TTS announcements while maintaining full observability.

**Implementation**:
- Generic agents (type="generic") are automatically filtered from TTS notifications
- A debug message is logged to stderr: "Skipping TTS for generic agent: {agent_name}"
- All other observability features (metrics, events) remain active for generic agents

**Enhanced Agent Type Classification**:
The system now classifies agents into 30+ specific types to minimize "generic" classifications:
- **Data Processing**: data-processor, statistics, metrics
- **Development**: builder, deployer, linter  
- **Content**: translator, writer, generator
- **Infrastructure**: monitor, configurator, storage
- **API/Integration**: api-handler, integrator, searcher
- **UI/Frontend**: ui-developer, designer
- **ML/AI**: ml-engineer, predictor
- **Database**: database-admin, data-manager
- **And many more...**

**Benefits**:
- Reduced audio spam from utility/helper agents
- Important agents (code-reviewer, debugger, etc.) still trigger notifications
- Better user experience with fewer interruptions
- Full observability maintained for all agents regardless of TTS status

**Example Enhanced Metadata**:
```python
agent_metadata = {
    "agent_name": extract_agent_name_from_transcript(transcript),
    "agent_type": classify_agent_type(agent_name),
    "tools_used": extract_tools_from_transcript(transcript),
    "execution_details": {
        "start_time": start_timestamp,
        "end_time": end_timestamp,
        "duration_ms": duration,
        "status": "success" | "partial" | "failure"
    },
    "performance_metrics": {
        "token_usage": total_tokens,
        "estimated_cost": calculate_cost(total_tokens),
        "tools_used_count": len(tools_used)
    }
}
```

### 7. PreCompact Hook (`pre_compact.py`)

**Purpose**: Monitors context compaction events

**Features**:
- Context size tracking
- Compaction trigger monitoring
- Performance impact analysis

### 8. SessionStart Hook (KISS Architecture) - **Refactored for Single Responsibility**

**Purpose**: Runs when Claude Code starts a new session or resumes an existing session

**Architecture**: **KISS-compliant focused hooks** - replaced monolithic `session_start.py` with 4 specialized scripts, each with single responsibility

#### Individual Hook Scripts

**`session_context_loader.py`** - Project Context Injection with Redis Handoff Integration
- **Single Purpose**: Load PROJECT_STATUS.md, git status, recent commits, and **previous session handoff context from Redis** → inject context into Claude session
- **When Used**: startup, resume (not clear - fresh sessions don't need old context)
- **Enhanced Features**:
  - **Redis Handoff Retrieval**: Automatically loads latest handoff context from `/get-up-to-speed-export` Redis storage
  - **MCP Redis Integration**: Uses correct `operation: "cache"` parameter for Redis namespace compatibility
  - **Session Continuity**: Previous session context loads first for maximum relevance
  - **Multi-source Context**: Combines Redis handoffs, file-based handoffs, session summaries, and project status
  - **Graceful Fallbacks**: Redis → file-based handoffs → project context only
  - **Smart Context Management**: Loads last 3 session summaries with intelligent deduplication
- **Dependencies**: Redis (managed automatically via UV `--with redis`)
- **Output**: Context injection text for Claude with seamless session continuity
- **No TTS, no events, no complex decisions**

**`session_startup_notifier.py`** - New Session TTS with Rate Limiting  
- **Single Purpose**: Send TTS notification for genuine new sessions
- **When Used**: startup only
- **Features**: 30-second rate limiting prevents spam
- **Dependencies**: OpenAI, pyttsx3 (managed automatically via UV `--with openai,pyttsx3`)
- **Output**: TTS notification only
- **No context loading, no events**

**`session_resume_detector.py`** - Smart Resume Notifications
- **Single Purpose**: Send TTS for meaningful resume sessions only
- **When Used**: resume only  
- **Logic**: Only notifies if significant work context exists (modified files, commits, project status)
- **Dependencies**: OpenAI, pyttsx3 (managed automatically via UV `--with openai,pyttsx3`)
- **Output**: Conditional TTS notification
- **No context loading, no events**

**`session_event_tracker.py`** - Observability Events
- **Single Purpose**: Send session tracking events to observability server
- **When Used**: All session types (startup, resume, clear)
- **Logic**: Always sends event (observability needs all data)
- **Output**: HTTP event to server only
- **No TTS, no context loading**

#### Hook Execution Flow

**Hook Matchers**:
- `startup` - Invoked from startup (new session)
- `resume` - Invoked from `--resume [sessionId]`, `--continue`, `-c`, or `/resume`
- `clear` - Invoked from `/clear` (fresh session without context)

**Environment Variable Control**:
- `CLAUDE_SKIP_CONTEXT=true` - Skip context loading for fast startup
- `CLAUDE_CONTINUE_SESSION=true` - Alternative skip context flag

**Execution Per Session Type**:

**Startup Session**:
1. `session_context_loader.py` → loads context, outputs context injection
2. `session_startup_notifier.py` → sends TTS (with 30s rate limiting)
3. `session_event_tracker.py` → sends observability event

**Resume Session** (`--resume [sessionId]`, `--continue`, `-c`, or `/resume`):
1. `session_context_loader.py` → loads context (unless `CLAUDE_SKIP_CONTEXT=true`), outputs context injection
2. `session_resume_detector.py` → smart TTS (only if meaningful work exists)
3. `session_event_tracker.py` → sends observability event

**Clear Session** (`/clear`):
1. `session_event_tracker.py` → sends observability event only

**Quick Continue Usage**:
```bash
# Method 1: Use the cld alias (recommended)
cld

# Method 2: Set environment variable manually
CLAUDE_SKIP_CONTEXT=true claude -c

# Method 3: Add custom alias to your shell profile
alias claude-fast="CLAUDE_SKIP_CONTEXT=true claude -c"
```

**Alias Definition** (already added to ~/.bash_aliases):
```bash
alias cld="CLAUDE_SKIP_CONTEXT=true claude -c"
```

#### Configuration

**Current Configuration** (KISS Architecture with UV Dependency Management):
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {"type": "command", "command": "uv run --with redis /path/to/.claude/hooks/session_context_loader.py"},
          {"type": "command", "command": "uv run --with openai,pyttsx3 /path/to/.claude/hooks/session_startup_notifier.py"},
          {"type": "command", "command": "uv run /path/to/.claude/hooks/session_event_tracker.py"}
        ]
      },
      {
        "matcher": "resume",
        "hooks": [
          {"type": "command", "command": "uv run --with redis /path/to/.claude/hooks/session_context_loader.py"},
          {"type": "command", "command": "uv run --with openai,pyttsx3 /path/to/.claude/hooks/session_resume_detector.py"},
          {"type": "command", "command": "uv run /path/to/.claude/hooks/session_event_tracker.py"}
        ]
      },
      {
        "matcher": "continue",
        "hooks": [
          {"type": "command", "command": "uv run /path/to/.claude/hooks/session_event_tracker.py"}
        ]
      },
      {
        "matcher": "clear",
        "hooks": [
          {"type": "command", "command": "uv run /path/to/.claude/hooks/session_event_tracker.py"}
        ]
      }
    ]
  }
}
```

**UV Dependency Management**:
- **Automatic Setup**: The `install-hooks.sh` script automatically adds `--with` flags for required dependencies
- **Isolated Environments**: Each project gets its own UV-managed virtual environment
- **Zero Manual Setup**: No need to manually install Redis, OpenAI, or pyttsx3 packages
- **Cross-Platform**: Works consistently across different systems without system pollution

#### Session Continuity System (Redis Handoff Integration)

**Enhanced Session Context Loading** - Seamless continuity between Claude Code sessions

**Magic Pipeline**:
1. **Export**: `/get-up-to-speed-export` creates Redis handoffs in <0.2 seconds
2. **Storage**: Redis keys with format: `handoff:project:{project-name}:{YYYYMMDD_HHMMSS}`
3. **Retrieval**: `session_context_loader.py` automatically loads latest handoff on session start
4. **Injection**: Previous session context loads first for maximum relevance

**Key Benefits**:
- **Seamless Project Continuity**: No context loss between sessions
- **Intelligent Context Loading**: Previous session insights load first, then current project status
- **Multi-source Integration**: Combines Redis handoffs, session summaries, and project status
- **Zero Configuration**: Works automatically with existing KISS hook architecture
- **Fast Performance**: Direct Redis access bypasses MCP complexity

**MCP Redis Compatibility Fix**:
- **Root Cause Resolved**: Fixed operation namespace mismatch (`"handoff"` vs `"cache"`)
- **Correct Parameter**: Uses `operation: "cache"` to match `/get-up-to-speed-export` storage
- **Fallback Chain**: Redis → file-based handoffs → project context only

#### Benefits of KISS Architecture

1. **Single Responsibility**: Each script does one thing well (50-100 lines each)
2. **Easy Debugging**: Know exactly which script failed if there's an issue
3. **Selective Disabling**: Can disable TTS without breaking context loading
4. **No Repetition**: Rate limiting prevents spam, smart logic prevents unnecessary notifications
5. **Independent Failure**: If one script fails, others continue working
6. **Clear Purpose**: Each script's function is immediately obvious from its name
7. **Session Continuity**: Redis handoff integration provides seamless context across sessions
8. **Dependency Management**: UV handles all dependencies automatically via `--with` flags

#### Shared Utilities

**`utils/session_helpers.py`** - Common functionality:
- `get_project_name()`, `get_project_status()`, `get_git_status()`
- `is_rate_limited()`, `update_rate_limit()` - 30-second cooldown system
- `format_git_summary()` - Consistent git status formatting

#### Installation and UV Integration

**Automatic Installation**: The `install-hooks.sh` script handles all SessionStart hook setup:

1. **Copies all 4 focused scripts** to target project
2. **Configures UV dependencies automatically**:
   - `session_context_loader.py` → `--with redis`
   - `session_startup_notifier.py` → `--with openai,pyttsx3`
   - `session_resume_detector.py` → `--with openai,pyttsx3`
   - `session_event_tracker.py` → no dependencies
3. **Updates absolute paths** for directory-independent execution
4. **Creates .env configuration** with TTS and project settings

**UV Dependency Benefits**:
- **Zero Manual Setup**: Dependencies installed automatically on first use
- **Isolated Environments**: No system Python pollution
- **Version Management**: Consistent dependency versions across installations
- **Fast Execution**: UV's performance benefits for dependency resolution

**Testing Installation**:
```bash
# Install hooks with UV dependency management
./bin/install-hooks.sh /path/to/target/project

# Test session context loader specifically
echo '{"session_id": "test", "source": "startup"}' | \
  uv run --with redis /path/to/target/project/.claude/hooks/session_context_loader.py
```

#### Legacy

- **Original**: `session_start.py.backup` (260+ lines, monolithic)
- **Refactored**: 4 focused scripts + shared utilities (following KISS principle)

**Use Cases**:
- Loading development context at session start with Redis handoff continuity
- Initializing project-specific settings and previous session insights
- Adding current project status and recent changes to context
- Loading session summaries and action items from previous sessions
- Setting up environment variables or configurations

**Example Notifications**:
- "Bryan, AI agent ready for multi-agent-observability-system"
- "Bryan, Continuing work on project - 3 modified files, 2 recent commits"
- "Bryan, Session context loaded with handoff (2,847 chars) + 4 insights"

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
