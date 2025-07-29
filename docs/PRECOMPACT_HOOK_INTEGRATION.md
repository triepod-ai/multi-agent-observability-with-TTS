# PreCompact Hook Integration with Direct Agent Execution

## Overview

The PreCompact Hook Integration provides intelligent conversation summarization when Claude Code compacts context. It uses **direct agent execution** via the codex-session-analyzer agent, eliminating Task tool dependencies while generating comprehensive, structured analysis and providing context-aware text-to-speech notifications.

## Features

### 1. Direct Agent Execution (KISS Architecture)
- **Primary Method**: Direct subprocess execution of codex-session-analyzer agent via Codex CLI
- **No Dependencies**: Eliminates Task tool dependency using simple subprocess calls
- **Structured Output**: JSON-formatted results with achievements, next_steps, blockers, insights
- **Smart Fallback**: Three-tier system (Direct Agent → Legacy → Minimal)
- **Zero Token Usage**: All processing runs locally via existing Codex CLI installation

### 2. Intelligent TTS Notifications
- **Concise Messages**: 25-30 words maximum for natural speech
- **Clean Output**: Removes timestamps, version numbers, and technical metadata
- **Natural Language**: Conversational tone with key objective/outcome focus

### 3. Comprehensive File Generation
- **Location**: `~/.claude/summaries/`
- **Naming**: `[project]_[type]_[timestamp].md`
- **Types**: analysis, executive, actions, insights summaries
- **Agent-Driven**: Content structured from agent JSON responses
- **Persistence**: Long-term session knowledge retention

## Implementation

### Hook Script: `pre_compact.py`

The hook performs the following operations:

1. **Conversation Export**: Captures current conversation data from stdin or environment
2. **Direct Agent Execution**: 
   - **Method**: Subprocess call to `claude_agent_runner.py codex-session-analyzer`
   - **Input Format**: JSON with session_summary, working_dir, git_context via stdin
   - **Agent Processing**: Runner script loads agent definition, builds Codex prompt, executes analysis
   - **Output Format**: Structured JSON with achievements, next_steps, blockers, insights via stdout
3. **Robust Fallback Chain**: 
   - **Primary**: Direct agent execution via claude_agent_runner.py
   - **Secondary**: Legacy codex-summarize.sh system
   - **Tertiary**: Minimal analysis with basic git context
4. **File Generation**: Creates analysis, executive, actions, and insights summaries from agent results
5. **Context-Aware TTS**: Sends intelligent summary based on analysis content (achievements, blockers, insights)
6. **Event Logging**: Records detailed activity with analysis metrics in observability system

### Agent Runner Architecture

#### `claude_agent_runner.py` - Direct Agent Execution Engine

**Location**: `.claude/hooks/utils/claude_agent_runner.py`

**Purpose**: KISS-compliant script for direct agent execution without Task tool dependencies

**Core Workflow**:
```
Input JSON → Agent Discovery → Prompt Building → Codex Execution → JSON Extraction → Output
```

**Key Features**:
- **Agent Discovery**: Automatically finds agent definitions in `.claude/agents/` directory
- **YAML Parsing**: Extracts frontmatter metadata (name, tools, description) from agent files
- **Prompt Construction**: Builds comprehensive Codex prompts with:
  - Agent instructions and context
  - User input JSON data
  - Expected JSON response structure
  - Task-specific guidance
- **Codex Integration**: Executes `codex exec --full-auto` for non-interactive analysis
- **Smart JSON Extraction**: Parses JSON from Codex markdown output including:
  - JSON code blocks (```json)
  - Embedded JSON patterns
  - Fallback extraction methods
- **Comprehensive Error Handling**: Structured error responses for all failure modes

**Interface Example**:
```bash
# Command line usage
echo '{"session_summary": "...", "working_dir": "...", "git_context": {...}}' | \
python3 claude_agent_runner.py codex-session-analyzer

# Returns structured JSON
{
  "achievements": ["Session analysis completed", "Git context loaded"],
  "next_steps": ["Review generated summaries", "Continue development"], 
  "blockers": [],
  "insights": ["Agent integration working correctly"],
  "session_metrics": {"complexity": "medium", "files_modified": 3}
}
```

### Configuration

Added to `.claude/settings.json`:

```json
"PreCompact": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": "uv run /home/bryan/multi-agent-observability-system/.claude/hooks/pre_compact.py"
      },
      {
        "type": "command",
        "command": "uv run /home/bryan/multi-agent-observability-system/.claude/hooks/send_event.py --source-app multi-agent-observability-system --event-type PreCompact"
      }
    ]
  }
]
```

## Analysis Output Types

### Agent-Generated Analysis (Primary)
Structured JSON output from codex-session-analyzer agent:
- **Achievements**: Concrete accomplishments and milestones
- **Next Steps**: Prioritized actionable tasks
- **Blockers**: Current obstacles preventing progress
- **Insights**: Key learnings and discoveries
- **Session Metrics**: Complexity, duration, files modified

### Generated Summary Files
1. **Analysis Report**: Complete agent results with session metrics
2. **Executive Summary**: Key accomplishments and immediate next steps
3. **Action Items**: Structured task list from next_steps with priorities
4. **Insights**: Lessons learned and key discoveries

### Legacy Fallback Analysis
When agent unavailable, uses codex-summarize.sh for:
- Technical Achievements
- Code Changes
- Problem Solving
- Research & Learning
- Failed Approaches
- Current Blockers
- Next Steps
- Knowledge Gaps
- Handoff Context

## TTS Output Format

The hook intelligently creates context-aware TTS messages:

### Agent-Based Messages (Primary)
1. **Priority Logic**: Blockers > Achievements + Next Steps > Achievements > Next Steps > Insights
2. **Smart Formatting**: 
   - Blockers: "Session complete: X achievements, but Y blockers need attention"
   - Standard: "Session complete: X achievements documented, Y next steps identified"
   - Insights: "Session complete: X achievements captured with insights documented"
3. **Context-Aware Tone**: Urgent for blockers, completion for achievements

### Legacy Fallback Messages
1. **Content Extraction**: Parses objective and outcome from executive summary
2. **Cleanup**: Removes technical jargon, numbers, and formatting
3. **Format**: "Bryan, compacting context. Goal was [objective]. Achieved [outcome]"
4. **Generic**: "Bryan, compacting context. Summary saved." for complex content

## File Structure

```
~/.claude/
├── hooks/
│   └── pre_compact.py              # Main hook implementation with agent integration
├── summaries/                      # Generated summaries directory
│   ├── project_analysis_*.md       # Comprehensive agent analysis reports
│   ├── project_executive_*.md      # Executive summaries from achievements
│   ├── project_actions_*.md        # Action items from next_steps
│   └── project_insights_*.md       # Insights and lessons learned
├── agents/
│   └── codex-session-analyzer.md   # Agent definition for session analysis
└── logs/
    └── pre_compact.log             # Hook execution logs
```

## Dependencies

### Primary (Agent-Based)
- **Claude Code Framework**: Task tool for agent invocation
- **codex-session-analyzer agent**: Located at `/home/bryan/.claude/agents/codex-session-analyzer.md`
- **Codex CLI**: Required for agent analysis (`npm install -g @anthropic/codex`)

### Fallback Systems
- **codex-summarize.sh**: Located at `/home/bryan/setup-mcp-server.sh.APP/tests/export-codex/`
- **Git**: For context gathering and minimal analysis

### Infrastructure
- **speak command**: Global TTS utility for voice notifications
- **Python 3.8+**: With requests library for hook execution

## Usage

The hook runs automatically when Claude Code triggers context compaction. No manual intervention required.

### Manual Testing
```bash
echo "Test conversation content" | uv run /home/bryan/multi-agent-observability-system/.claude/hooks/pre_compact.py
```

## Benefits

1. **Knowledge Preservation**: Captures session insights before context loss
2. **Team Handoffs**: Technical summaries enable smooth transitions
3. **Stakeholder Updates**: Executive summaries provide quick status
4. **Audio Awareness**: Brief TTS keeps developers informed without interruption
5. **Zero Token Cost**: Local processing preserves API tokens

## Error Handling

### Three-Tier Fallback System
1. **Primary**: codex-session-analyzer agent via Task tool
   - **Agent Import Failure**: Multiple import strategies (direct, module, global scope)
   - **Agent Execution Failure**: JSON parsing with validation
   - **Response Validation**: Checks for expected keys (achievements, next_steps, etc.)

2. **Secondary**: Legacy codex-summarize.sh system
   - **Missing Script**: Searches multiple known locations
   - **Execution Failure**: Captures stderr and timeouts
   - **Format Conversion**: Adapts legacy output to agent format

3. **Tertiary**: Minimal analysis system
   - **Git Context**: Basic git status, commits, and changes
   - **Emergency Mode**: Ensures hook always completes successfully

### Additional Error Handling
- **TTS Errors**: Logs failure but continues operation
- **File I/O Errors**: Graceful handling with detailed logging
- **Timeout Protection**: 45s limit for agent analysis
- **JSON Parsing**: Robust handling of malformed responses

## Recent Enhancements (2025-07-28)

### ✅ **Completed**
- **Agent Integration**: Full codex-session-analyzer agent integration with Task tool
- **Structured Output**: JSON-based analysis with achievements, next_steps, blockers, insights
- **Enhanced File Types**: Analysis, executive, actions, and insights summaries
- **Smart TTS**: Context-aware voice notifications based on analysis content
- **Robust Fallback**: Three-tier error handling system

### 🚀 **Future Enhancements**
- Integration with project management tools
- Customizable TTS voice selection per summary type
- Summary aggregation across multiple sessions
- Search functionality for historical summaries
- Agent performance metrics and optimization

## Related Documentation

- [Codex Summarize Documentation](/home/bryan/setup-mcp-server.sh.APP/tests/export-codex/CODEX_SUMMARIZE_DOCUMENTATION.md)
- [Enterprise TTS Integration](./ENTERPRISE_TTS_INTEGRATION.md)
- [Hooks Documentation](./HOOKS_DOCUMENTATION.md)

---

*Created: 2025-07-24*  
*Updated: 2025-07-28 - Agent Integration Complete*  
*Component: Multi-Agent Observability System*  
*Type: Feature Documentation*