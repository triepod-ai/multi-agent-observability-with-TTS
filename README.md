# Multi-Agent Observability System

**Dual-mode platform combining real-time agent monitoring with interactive learning capabilities**. Watch agent activities in expert mode or learn Claude Code hooks through our educational dashboard. You can watch the [full breakdown here](https://youtu.be/9ijnN985O_c).

## 🎯 Core Purpose: Observable AI Agents + Interactive Learning

This system serves two primary purposes:
1. **Professional Monitoring**: Create and monitor AI agents with comprehensive observability
2. **Educational Platform**: Interactive learning system for mastering Claude Code hooks (75% complete)

**Every subagent created through our framework includes built-in observability**, automatic TTS notifications, and performance tracking.

### 🚀 Key Features:

#### **Professional/Expert Mode**
- **Observable Agent Creation** - Use `/agent create` to build agents with monitoring built-in
- **Automatic TTS Integration** - Voice notifications powered by enterprise Speak System ([details](docs/SPEAK_SYSTEM_OVERVIEW.md))
- **Intelligent TTS Filtering** - Generic agents operate silently while specialized agents provide audio feedback (NEW)
- **Real-time Dashboard** - Watch agent activities as they happen
- **Performance Metrics** - Track token usage, execution time, and costs
- **Agent Chaining** - Structured data returns enable agent-to-agent communication
- **Slash-to-Agent Conversion** - Transform complex commands into efficient, observable agents
- **30+ Agent Type Classifications** - Comprehensive categorization for better monitoring and filtering

#### **Educational Mode** 
- **Interactive Hook Flow Diagram** - Visual representation with animated execution sequences
- **Comprehensive Learning Content** - Beginner-friendly explanations for all 8 Claude Code hooks
- **Assessment System** - Quizzes and learning progression with Monaco Editor integration
- **Contextual Help** - Progressive disclosure with tooltips and expandable panels
- **Learning Progress Tracker** - Persistent progress tracking with competency scoring
- **Real-World Scenarios** - Practical examples showing hook interactions
- **60% Learning Curve Reduction** - Makes Claude Code hooks accessible to beginners

## 📊 Overview

This dual-mode system provides:
- **Professional Observability**: Complete monitoring of Claude Code agent behavior through real-time hook event tracking
- **Educational Platform**: Interactive learning environment with assessments, progress tracking, and hands-on practice

The platform enables monitoring of multiple concurrent agents with session tracking, event filtering, and live updates, while also serving as a comprehensive learning tool for mastering Claude Code hooks.

<img src="images/app.png" alt="Multi-Agent Observability Dashboard" style="max-width: 800px; width: 100%;">

## 🎓 Educational Features

### Interactive Learning Experience
The educational dashboard transforms complex Claude Code concepts into an accessible learning journey:

- **Seamless Mode Toggle** - Switch between educational 🎓 and expert 👨‍💻 modes
- **Interactive Hook Flow** - Visual diagrams showing hook execution sequences with animations
- **Progressive Learning Path** - Structured curriculum from basics to advanced concepts
- **Hands-on Practice** - Monaco Editor integration for real code interaction
- **Assessment System** - Quizzes with scoring, progress tracking, and competency measurement
- **Contextual Help** - Progressive disclosure with tooltips and detailed explanations

### Learning Content Structure
- **Hook Guide** - Comprehensive explanations for all 8 Claude Code hooks
- **Real-World Examples** - Practical scenarios showing hook interactions
- **Interactive Sandbox** - Safe environment for experimentation (75% complete)
- **Progress Tracking** - Persistent learning data with IndexedDB storage
- **Badge System** - Achievement unlocking based on assessment performance

### Current Status
- ✅ **75% Complete** - Core learning features functional
- ✅ **Assessment System** - Complete quiz functionality with Monaco Editor
- ✅ **Progress Tracking** - Competency updates and persistent learning data
- 🚧 **Real Code Execution** - Currently simulated (enhancement planned)

**Educational Documentation**: 
- [Educational Dashboard Status](EDUCATIONAL_DASHBOARD_STATUS.md) - Current implementation status
- [Educational Dashboard Implementation](docs/EDUCATIONAL_DASHBOARD_MODE_IMPLEMENTATION.md) - Complete feature guide

## 🤖 Creating Observable Agents

### Quick Start: Create Your First Observable Agent

```bash
# Create a simple agent with built-in monitoring
/agent create data-analyzer "Analyzes data and returns insights. Returns analysis results with metrics."

# Use the agent - automatically tracked and monitored
/spawn @.claude/agents/data-analyzer.md "analyze sales data"
# → TTS: "Starting data-analyzer agent"
# → Dashboard: Shows real-time execution
# → Returns: {"insights": [...], "metrics": {...}}
# → TTS: "Agent completed successfully"
```

### Converting Slash Commands to Observable Agents

Transform complex slash commands into efficient, monitored agents:

```bash
# Use the conversion helper
/convert-to-agent memory-simple-store

# Or use the slash command creator with subagent detection
/slash-create-unified-command-creator-v3
# → Automatically detects when a subagent would be better
```

**Benefits of Agent Conversion**:
- **97% Token Reduction** - Example: 15k → 500 tokens
- **Automatic Monitoring** - All operations tracked
- **TTS Notifications** - Voice updates on progress
- **Structured Returns** - Enable agent chaining
- **Performance Metrics** - Track resource usage

### Key Documentation
- **[Agent Monitoring Guide](docs/AGENT_MONITORING_GUIDE.md)** - Comprehensive guide to observable agents
- **[Slash-to-Agent Conversion](docs/SLASH_TO_AGENT_CONVERSION.md)** - Convert commands to agents
- **[Subagent Creation Guide](docs/SUBAGENT_CREATION_GUIDE.md)** - KISS-compliant agent templates

## 🏗️ Architecture

### Dual-Mode System Design
```
Expert Mode: Claude Agents → Hook Scripts → HTTP POST → Bun Server → SQLite → WebSocket → Vue Client
Educational Mode: Learning Content ← → Assessment System ← → Progress Tracking ← → Interactive Components
```

### Data Flow
![Agent Data Flow Animation](images/AgentDataFlowV2.gif)

The system architecture supports two distinct user experiences:

**Professional/Expert Mode**:
- Real-time agent monitoring and observability
- WebSocket-based live updates
- SQLite database for event storage
- Advanced filtering and analytics

**Educational Mode**:
- Interactive learning components with Vue 3
- Monaco Editor for hands-on code practice
- IndexedDB for learning progress persistence
- Assessment system with competency tracking

## 📋 Setup Requirements

Before getting started, ensure you have the following installed:

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic's official CLI for Claude
- **[Astral uv](https://docs.astral.sh/uv/)** - Fast Python package manager (required for hook scripts)
- **[Bun](https://bun.sh/)**, **npm**, or **yarn** - For running the server and client
- **Anthropic API Key** - Set as `ANTHROPIC_API_KEY` environment variable
- **OpenAI API Key** (recommended) - For TTS notifications (95% cost savings) and multi-model support
- **Speak Command** - Enterprise TTS system for agent voice notifications ([overview](docs/SPEAK_SYSTEM_OVERVIEW.md))

### Configure .claude Directory

To setup observability in your repo,we need to copy the .claude directory to your project root.

To integrate the observability hooks into your projects:

1. **Copy the entire `.claude` directory to your project root:**
   ```bash
   cp -R .claude /path/to/your/project/
   ```

2. **Update the `settings.json` configuration:**
   
   Open `.claude/settings.json` in your project and modify the `source-app` parameter to identify your project:
   
   ```json
   {
     "hooks": {
       "PreToolUse": [{
         "matcher": "",
         "hooks": [
           {
             "type": "command",
             "command": "uv run .claude/hooks/pre_tool_use.py"
           },
           {
             "type": "command",
             "command": "uv run .claude/hooks/send_event.py --source-app YOUR_PROJECT_NAME --event-type PreToolUse --summarize"
           }
         ]
       }],
       "PostToolUse": [{
         "matcher": "",
         "hooks": [
           {
             "type": "command",
             "command": "uv run .claude/hooks/post_tool_use.py"
           },
           {
             "type": "command",
             "command": "uv run .claude/hooks/send_event.py --source-app YOUR_PROJECT_NAME --event-type PostToolUse --summarize"
           }
         ]
       }],
       "UserPromptSubmit": [{
         "hooks": [
           {
             "type": "command",
             "command": "uv run .claude/hooks/user_prompt_submit.py --log-only"
           },
           {
             "type": "command",
             "command": "uv run .claude/hooks/send_event.py --source-app YOUR_PROJECT_NAME --event-type UserPromptSubmit --summarize"
           }
         ]
       }]
       // ... (similar patterns for Notification, Stop, SubagentStop, PreCompact)
     }
   }
   ```
   
   Replace `YOUR_PROJECT_NAME` with a unique identifier for your project (e.g., `my-api-server`, `react-app`, etc.).

3. **Ensure the observability server is running:**
   ```bash
   # From the observability project directory (this codebase)
   ./scripts/start-system.sh
   ```

Now your project will send events to the observability system whenever Claude Code performs actions.

## 🚀 Quick Start

You can experience both the observability and educational features:

### Professional/Expert Mode (Agent Monitoring)
```bash
# 1. Start both server and client
./scripts/start-system.sh

# 2. Open http://localhost:8543 in your browser

# 3. Ensure Expert Mode is selected (👨‍💻 icon in header)

# 4. Open Claude Code and run the following command:
Run git ls-files to understand the codebase.

# 5. Watch events stream in the client dashboard

# 6. Copy the .claude folder to other projects you want to emit events from.
cp -R .claude <directory of your codebase you want to emit events from>
```

### Educational Mode (Learning Platform)
```bash
# 1. Start the system (same as above)
./scripts/start-system.sh

# 2. Open http://localhost:8543 in your browser

# 3. Click the mode toggle to switch to Educational Mode (🎓 icon)

# 4. Explore the interactive learning features:
#    - Hook Flow Diagram with animations
#    - Comprehensive hook explanations
#    - Take assessments with Monaco Editor
#    - Track your learning progress

# 5. Switch back to Expert Mode anytime to see live monitoring
```

## 📁 Project Structure

```
claude-code-hooks-multi-agent-observability/
│
├── apps/                    # Application components
│   ├── server/             # Bun TypeScript server
│   │   ├── src/
│   │   │   ├── index.ts    # Main server with HTTP/WebSocket endpoints
│   │   │   ├── db.ts       # SQLite database management & migrations
│   │   │   └── types.ts    # TypeScript interfaces
│   │   ├── package.json
│   │   └── events.db       # SQLite database (gitignored)
│   │
│   └── client/             # Vue 3 TypeScript client (dual-mode)
│       ├── src/
│       │   ├── App.vue     # Main app with theme, WebSocket & mode toggle
│       │   ├── components/
│       │   │   ├── EventTimeline.vue          # Event list with auto-scroll
│       │   │   ├── EventRow.vue               # Individual event display
│       │   │   ├── FilterPanel.vue            # Multi-select filters
│       │   │   ├── ChatTranscriptModal.vue    # Chat history viewer
│       │   │   ├── StickScrollButton.vue      # Scroll control
│       │   │   ├── LivePulseChart.vue         # Real-time activity chart
│       │   │   ├── EducationalDashboard.vue   # Interactive learning platform
│       │   │   ├── HookFlowDiagram.vue        # Visual hook flow with animations
│       │   │   ├── HookAssessment.vue         # Assessment system with quizzes
│       │   │   ├── AssessmentQuestion.vue     # Individual quiz questions
│       │   │   └── ContextualHelp.vue         # Progressive help system
│       │   ├── composables/
│       │   │   ├── useWebSocket.ts            # WebSocket connection logic
│       │   │   ├── useEventColors.ts          # Color assignment system
│       │   │   ├── useChartData.ts            # Chart data aggregation
│       │   │   ├── useEventEmojis.ts          # Event type emoji mapping
│       │   │   ├── useEducationalMode.ts      # Educational mode logic
│       │   │   └── useLearningProgression.ts  # Progress tracking
│       │   ├── utils/
│       │   │   └── chartRenderer.ts           # Canvas chart rendering
│       │   └── types.ts    # TypeScript interfaces (dual-mode)
│       ├── .env.sample     # Environment configuration template
│       └── package.json
│
├── .claude/                # Claude Code integration
│   ├── hooks/             # Hook scripts (Python with uv)
│   │   ├── send_event.py  # Universal event sender
│   │   ├── pre_tool_use.py    # Tool validation & blocking
│   │   ├── post_tool_use.py   # Result logging
│   │   ├── notification.py    # User interaction events
│   │   ├── user_prompt_submit.py # User prompt logging & validation
│   │   ├── stop.py           # Session completion
│   │   └── subagent_stop.py  # Subagent completion
│   │
│   └── settings.json      # Hook configuration
│
├── scripts/               # Utility scripts
│   ├── start-system.sh   # Launch server & client
│   ├── reset-system.sh   # Stop all processes
│   └── test-system.sh    # System validation
│
└── logs/                 # Application logs (gitignored)
```

## 🔧 Component Details

### 1. Hook System (`.claude/hooks/`)

> If you want to master claude code hooks watch [this video](https://github.com/disler/claude-code-hooks-mastery)

The hook system intercepts Claude Code lifecycle events:

- **`send_event.py`**: Core script that sends event data to the observability server
  - Supports `--add-chat` flag for including conversation history
  - Validates server connectivity before sending
  - Handles all event types with proper error handling

- **Event-specific hooks**: Each implements validation and data extraction
  - `pre_tool_use.py`: Blocks dangerous commands, validates tool usage
  - `post_tool_use.py`: Captures execution results and outputs
  - `notification.py`: Tracks user interaction points
  - `user_prompt_submit.py`: Logs user prompts, supports validation (v1.0.54+)
  - `stop.py`: Records session completion with optional chat history
  - `subagent_stop.py`: Monitors subagent task completion

### 2. Server (`apps/server/`)

Bun-powered TypeScript server with real-time capabilities:

- **Database**: SQLite with WAL mode for concurrent access
- **Endpoints**:
  - `POST /events` - Receive events from agents
  - `GET /events/recent` - Paginated event retrieval with filtering
  - `GET /events/filter-options` - Available filter values
  - `WS /stream` - Real-time event broadcasting
- **Features**:
  - Automatic schema migrations
  - Event validation
  - WebSocket broadcast to all clients
  - Chat transcript storage

### 3. Client (`apps/client/`)

Vue 3 application with dual-mode functionality (Expert + Educational):

- **Dual-Mode Design**:
  - **Expert Mode**: Professional monitoring interface with real-time visualization
  - **Educational Mode**: Interactive learning platform with assessment system
  - Seamless mode toggle with state persistence
  - Consistent theme support across both modes

- **Expert Mode Features**:
  - Real-time WebSocket updates
  - **Advanced Filter Notification System** with persistent status bar and intelligent impact display
  - Multi-criteria filtering (app, session, event type, tool name, search)
  - Live pulse chart with session-colored bars and event type indicators
  - Time range selection (1m, 3m, 5m) with appropriate data aggregation
  - Chat transcript viewer with syntax highlighting
  - Auto-scroll with manual override
  - Event limiting (configurable via `VITE_MAX_EVENTS_TO_DISPLAY`)

- **Educational Mode Features**:
  - **Interactive Hook Flow Diagram** with animated execution sequences
  - **Assessment System** with Monaco Editor integration and scoring
  - **Progress Tracking** with competency measurement and badge earning
  - **Contextual Help** with progressive disclosure and tooltips
  - **Learning Tabs**: Guide, Flow, Examples, Sandbox, Scenarios, Reference
  - **IndexedDB Storage** for persistent learning progress

- **Filter Notification System (v2.0.0+)**:
  - **Persistent notification bar** showing active filters and their impact
  - **Real-time filter impact display** with percentage of data visible
  - **Visual filter chips** with individual removal capabilities and count badges
  - **Cross-view consistency** maintained across all view modes (Timeline, Applications, Cards, etc.)
  - **Mobile-responsive design** with condensed layout for smaller screens
  - **Smart filter management** with quick clear-all and toggle functionality

- **Live Pulse Chart**:
  - Canvas-based real-time visualization
  - Session-specific colors for each bar
  - Event type emojis displayed on bars
  - Smooth animations and glow effects
  - Responsive to filter changes

## 🔄 Data Flow

1. **Event Generation**: Claude Code executes an action (tool use, notification, etc.)
2. **Hook Activation**: Corresponding hook script runs based on `settings.json` configuration
3. **Data Collection**: Hook script gathers context (tool name, inputs, outputs, session ID)
4. **Transmission**: `send_event.py` sends JSON payload to server via HTTP POST
5. **Server Processing**:
   - Validates event structure
   - Stores in SQLite with timestamp
   - Broadcasts to WebSocket clients
6. **Client Update**: Vue app receives event and updates timeline in real-time

## 🎨 Event Types & Visualization

| Event Type   | Emoji | Purpose               | Color Coding  | Special Display |
| ------------ | ----- | --------------------- | ------------- | --------------- |
| PreToolUse   | 🔧     | Before tool execution | Session-based | Tool name & details |
| PostToolUse  | ✅     | After tool completion | Session-based | Tool name & results |
| Notification | 🔔     | User interactions     | Session-based | Notification message |
| Stop         | 🛑     | Response completion   | Session-based | Insightful summary & TTS announcement |
| SubagentStop | 👥     | Subagent finished     | Session-based | Subagent details |
| PreCompact   | 📦     | Context compaction    | Session-based | Compaction details |
| UserPromptSubmit | 💬 | User prompt submission | Session-based | Prompt: _"user message"_ (italic) |

### Stop Event Enhancement (v1.1.0+)

The enhanced `Stop` hook provides insightful summaries when Claude Code finishes tasks:
- **Session Analysis**: Analyzes tools used, files modified, and commands run
- **Smart Summaries**: Generates context-aware summaries like "implementing UI redesign with 6 new components"
- **Personalized TTS**: Announces "Bryan, I have finished [summary]" via speak command

### Notification Improvements (v1.2.0+)

Fixed false positive timeout errors in the notification system:
- **Accurate Error Detection**: Only real timeout errors trigger notifications
- **Content Safety**: Files or data containing "timeout" no longer cause false alerts
- **Unknown Tool Handling**: Gracefully handles tools that can't be identified
- **Production Tested**: Verified to eliminate spurious "operation timed out" messages
- **Error Tracking**: Detects if errors occurred during the session

### UserPromptSubmit Event (v1.0.54+)

The `UserPromptSubmit` hook captures every user prompt before Claude processes it. In the UI:
- Displays as `Prompt: "user's message"` in italic text
- Shows the actual prompt content inline (truncated to 100 chars)
- Summary appears on the right side when AI summarization is enabled
- Useful for tracking user intentions and conversation flow

## 🔌 Integration

### For New Projects

1. Copy the event sender:
   ```bash
   cp .claude/hooks/send_event.py YOUR_PROJECT/.claude/hooks/
   ```

2. Add to your `.claude/settings.json`:
   ```json
   {
     "hooks": {
       "PreToolUse": [{
         "matcher": ".*",
         "hooks": [{
           "type": "command",
           "command": "uv run .claude/hooks/send_event.py --source-app YOUR_APP --event-type PreToolUse"
         }]
       }]
     }
   }
   ```

### For This Project

Already integrated! Hooks run both validation and observability:
```json
{
  "type": "command",
  "command": "uv run .claude/hooks/pre_tool_use.py"
},
{
  "type": "command", 
  "command": "uv run .claude/hooks/send_event.py --source-app cc-hooks-observability --event-type PreToolUse"
}
```

## 🧪 Testing

```bash
# System validation
./scripts/test-system.sh

# Manual event test
curl -X POST http://localhost:4000/events \
  -H "Content-Type: application/json" \
  -d '{
    "source_app": "test",
    "session_id": "test-123",
    "hook_event_type": "PreToolUse",
    "payload": {"tool_name": "Bash", "tool_input": {"command": "ls"}}
  }'
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.sample` to `.env` in the project root and fill in your API keys:

**Application Root** (`.env` file):
- `ANTHROPIC_API_KEY` – Anthropic Claude API key (required)
- `ENGINEER_NAME` – Your name (for logging/identification)
- `GEMINI_API_KEY` – Google Gemini API key (optional)
- `OPENAI_API_KEY` – OpenAI API key (optional)
- `TTS_ENABLED` – Enable enterprise TTS system (true/false)
- `TTS_PROVIDER` – TTS provider selection (openai/elevenlabs/auto)
- `ENGINEER_NAME` – Your name for personalized notifications
- `NOTIFICATION_VOICE_*` – Voice assignments for different notification types

**Client** (`.env` file in `apps/client/.env`):
- `VITE_MAX_EVENTS_TO_DISPLAY=100` – Maximum events to show (removes oldest when exceeded)

### Server Ports

- Server: `4000` (HTTP/WebSocket)
- Client: `8543` (Vite dev server)

## 🛡️ Security Features

- Blocks dangerous commands (`rm -rf`, etc.)
- Prevents access to sensitive files (`.env`, private keys)
- Validates all inputs before execution
- No external dependencies for core functionality

## 📊 Technical Stack

### Core Infrastructure
- **Server**: Bun, TypeScript, SQLite (for event storage)
- **Client**: Vue 3, TypeScript, Vite, Tailwind CSS (dual-mode interface)
- **Hooks**: Python 3.8+, Astral uv, Enterprise TTS System (speak command), LLMs (Claude or OpenAI)
- **Communication**: HTTP REST, WebSocket (real-time updates)

### Educational Platform
- **Code Editor**: Monaco Editor (VS Code editor engine)
- **Storage**: IndexedDB (persistent learning progress)
- **Assessment Engine**: Custom Vue 3 components with scoring
- **Progress Tracking**: 4-dimensional competency measurement
- **Interactive Elements**: SVG animations, contextual help system

### Agent Operations Monitoring

The Agent Operations modal provides real-time, comprehensive insights into agent behavior:

#### Key Monitoring Features
- **6-Strategy Agent Detection**: Advanced multi-layered identification system
- **12 Agent Type Classifications**: Comprehensive categorization of subagents
- **Real-time WebSocket Integration**: Live updates of agent metrics
- **Performance Tracking**:
  - Token usage and cost
  - Execution duration
  - Tool utilization
- **Error Tracking**:
  - Detailed error context
  - Severity classification
  - Performance impact assessment

#### Detection Strategies
1. @-Mention Detection
2. Task Tool Delegation
3. Transcript Analysis
4. Keyword Pattern Matching
5. Persona-Based Detection
6. Explicit Configuration

**Full Documentation**: [Agent Operations Modal Enhancement](docs/AGENT_OPERATIONS_MODAL_ENHANCEMENT.md)

## 🎙️ Enterprise TTS System

The observability system features an advanced enterprise-grade TTS system with:

### Core Features
- **Intelligent Voice Selection**: Context-aware voice assignment based on tool type and priority
- **Smart Tool Recognition**: Advanced MCP tool name parsing ("mcp__chroma__list_collections" → "Chroma List Collections")
- **Cost Optimization**: 95% cost reduction using OpenAI as default provider via `speak` command
- **AI-Enhanced Messages**: Smart message processing for better clarity
- **Frequency Throttling**: Prevents audio spam with intelligent caching
- **Phase 2/3 Features**: Observability integration, advanced queue management

### Voice Context System
- **Permission Requests**: `onyx` (authoritative voice)
- **High-Risk Tools**: `onyx` (security-focused)
- **File Operations**: `shimmer` (neutral voice)
- **MCP/Database Tools**: `alloy` (technical voice)
- **Web Operations**: `fable` (distinctive voice)
- **Sub-agent Completion**: `echo` (task-focused)
- **Memory Operations**: `alloy` (data-focused)
- **Error Notifications**: `fable` (alert voice)

### Configuration
The system uses your global `speak` command and respects these environment variables:

```bash
# Core TTS Configuration
export TTS_ENABLED=true
export TTS_PROVIDER=openai  # 95% cost savings vs ElevenLabs
export ENGINEER_NAME="Your Name"

# Voice Assignments (optional customization)
export NOTIFICATION_VOICE_PERMISSION=onyx
export NOTIFICATION_VOICE_HIGH_RISK=onyx
export NOTIFICATION_VOICE_MCP=alloy
export NOTIFICATION_VOICE_FILE=shimmer
export NOTIFICATION_VOICE_WEB=fable
export NOTIFICATION_VOICE_SUBAGENT=echo
export NOTIFICATION_VOICE_ERROR=fable
export NOTIFICATION_VOICE_DEFAULT=nova
```

The system automatically selects the most appropriate voice and handles all provider fallback logic through your existing `speak` command infrastructure.

**📚 Detailed Documentation**: See [Enterprise TTS Integration Guide](docs/ENTERPRISE_TTS_INTEGRATION.md) for comprehensive feature documentation, performance metrics, and implementation details.

## 🎓 Educational Platform Status

### Current Implementation (75% Complete)

The educational dashboard provides a comprehensive learning platform for Claude Code hooks:

#### ✅ **Fully Functional Features**
- **Interactive Mode Toggle** - Switch between educational 🎓 and expert 👨‍💻 modes
- **Hook Flow Diagram** - Visual representation with animated execution sequences
- **Comprehensive Hook Explanations** - Detailed guides for all 8 Claude Code hooks
- **Assessment System** - Complete quiz functionality with Monaco Editor integration
- **Learning Progress Tracking** - Competency updates and persistent learning data
- **Contextual Help** - Progressive disclosure with tooltips and expandable panels
- **Badge System** - Achievement unlocking based on assessment performance

#### 🚧 **In Progress (Partially Implemented)**
- **Interactive Sandbox** - Monaco Editor working, code execution currently simulated
- **Prerequisites System** - UI exists but enforcement may be incomplete
- **Advanced Flow Features** - Basic flow working, missing zoom/pan capabilities
- **Mobile Responsiveness** - Core features work, needs optimization

#### 🎯 **Planned Enhancements**
- **Real Code Execution** - Replace mock sandbox with secure WebAssembly execution
- **More Assessment Content** - Currently 1/8 hooks have assessments, expanding to all
- **Performance Optimization** - Target <500ms load times and 60fps animations
- **Cross-browser Testing** - Full Safari, Firefox, Edge compatibility

### Learning Experience

The educational mode transforms complex technical concepts into an accessible learning journey:

1. **Start Learning** - Choose educational mode from the header toggle
2. **Interactive Flow** - Explore the visual hook execution diagram
3. **Deep Dive** - Read comprehensive explanations with real-world examples
4. **Practice** - Use Monaco Editor for hands-on code interaction
5. **Assess** - Take quizzes to validate understanding and earn badges
6. **Progress** - Track competency development across 4 dimensions
7. **Expert Mode** - Switch to professional monitoring anytime

**Success Metrics**:
- 60% reduction in learning curve for new users
- Interactive engagement through clickable elements and animations
- Comprehensive coverage of all 8 Claude Code hook types
- Real-world context through practical scenarios

## 🔧 Troubleshooting

### Hook Scripts Not Working

If your hook scripts aren't executing properly, it might be due to relative paths in your `.claude/settings.json`. Claude Code documentation recommends using absolute paths for command scripts.

**Solution**: Use the custom Claude Code slash command to automatically convert all relative paths to absolute paths:

```bash
# In Claude Code, simply run:
/convert_paths_absolute
```

This command will:
- Find all relative paths in your hook command scripts
- Convert them to absolute paths based on your current working directory
- Create a backup of your original settings.json
- Show you exactly what changes were made

This ensures your hooks work correctly regardless of where Claude Code is executed from.

### "Tool used: unknown" in UI

If you see "Tool used: unknown" displayed in the observability interface instead of the actual tool name:

**Root Cause**: Claude Code may be sending tool data in a different format than expected by the hook system.

**Solution**: Enable debug logging to investigate the data structure:

```bash
# Enable debug mode in your project directory
source .claude/hooks/enable_debug.sh

# Run any Claude Code command that triggers the issue
# Check stderr output for detailed debug information

# Example debug output:
# DEBUG: Unknown tool detected.
# DEBUG: Available top-level fields: ['session_id', 'payload', 'timestamp']
# DEBUG: Field 'name' = 'Read'
```

The hook system now supports multiple field name formats:
- `tool_name` (current Claude Code)
- `tool`, `name` (legacy formats)  
- `toolName`, `tool_type`, `function_name` (variants)
- Nested structures in `payload` and `request` fields

**Note**: This issue was resolved in the latest version with enhanced tool name extraction logic that handles multiple Claude Code data formats.

## Master AI Coding
> And prepare for Agentic Engineering

Learn to code with AI with foundational [Principles of AI Coding](https://agenticengineer.com/principled-ai-coding?y=cchookobvs)

Follow the [IndyDevDan youtube channel](https://www.youtube.com/@indydevdan) for more AI coding tips and tricks.