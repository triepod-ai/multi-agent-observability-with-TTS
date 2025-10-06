# Multi-Agent Observability System - Quick Reference

## Core Purpose
Creating and monitoring AI agents with comprehensive observability. Every subagent includes:
- Automatic TTS notifications
- Real-time event tracking
- Session correlation and performance monitoring
- Structured data returns for agent-to-agent communication

## Key Integration Points
1. **Subagent Creation**: `/agent create` with monitoring templates
2. **Hook System**: `bin/install-hooks.sh` for TTS and event tracking
3. **Observability Dashboard**: Real-time visualization at `http://localhost:3002`
4. **Session Context**: Automatic Redis handoff loading

## Documentation Guidelines
- Reference all new docs in CLAUDE.md
- Agent docs must include monitoring hooks and structured returns
- **Timeline/historical updates belong in PROJECT_STATUS.md**

## Essential Documentation

### Quick Start
- [README.md](./README.md) - Main project overview and setup
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Timeline and progress tracking
- [bin/install-hooks.sh](./bin/install-hooks.sh) - Hook installer script
- [docs/INSTALL_HOOKS_GUIDE.md](./docs/INSTALL_HOOKS_GUIDE.md) - Installation guide

### Core Systems
- **Hooks**: [HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md)
- **TTS**: [SPEAK_SYSTEM_OVERVIEW.md](./docs/SPEAK_SYSTEM_OVERVIEW.md)
- **Agents**: [AGENT_CREATION_WORKFLOW.md](./docs/AGENT_CREATION_WORKFLOW.md)
- **Session System**: [SESSION_ID_PERSISTENCE_SYSTEM.md](./docs/SESSION_ID_PERSISTENCE_SYSTEM.md)
- **Safety**: [SAFETY_HOOK_GUIDE.md](./docs/SAFETY_HOOK_GUIDE.md)

### UI & Dashboard
- **UI Enhancements**: [UI_ENHANCEMENTS_GUIDE.md](./docs/UI_ENHANCEMENTS_GUIDE.md)
- **Timeline Correlation**: [TIMELINE_CORRELATION_SYSTEM.md](./docs/TIMELINE_CORRELATION_SYSTEM.md)
- **Educational Mode**: [EDUCATIONAL_DASHBOARD_MODE_IMPLEMENTATION.md](./docs/EDUCATIONAL_DASHBOARD_MODE_IMPLEMENTATION.md)
- **Testing**: [apps/client/docs/TESTING_FRAMEWORK_GUIDE.md](./apps/client/docs/TESTING_FRAMEWORK_GUIDE.md)

### Advanced Features
- **Session Relationships**: [SESSION_RELATIONSHIP_IMPLEMENTATION.md](./docs/SESSION_RELATIONSHIP_IMPLEMENTATION.md)
- **Agent Naming**: [AGENT_NAMING_SYSTEM.md](./docs/AGENT_NAMING_SYSTEM.md)
- **MCP Evaluation**: [MCP_EVALUATOR_APPLICATION.md](./docs/MCP_EVALUATOR_APPLICATION.md)
- **WebAssembly Security**: [WEBASSEMBLY_SECURITY_ARCHITECTURE.md](./docs/WEBASSEMBLY_SECURITY_ARCHITECTURE.md)

### Troubleshooting
- **General**: [TROUBLESHOOTING_GUIDE.md](./docs/TROUBLESHOOTING_GUIDE.md)
- **API Endpoints**: [API_HOOK_ENDPOINTS.md](./docs/API_HOOK_ENDPOINTS.md)
- **Hook Coverage Fix**: [HOOK_COVERAGE_MODAL_FIX.md](./docs/HOOK_COVERAGE_MODAL_FIX.md)

## KISS Hook Architecture (Session Management)
The session hooks follow single responsibility principle:

1. **session_context_loader.py** - Load project context and Redis handoffs
2. **session_startup_notifier.py** - TTS for new sessions (rate-limited)
3. **session_resume_detector.py** - TTS for meaningful resumes only
4. **session_event_tracker.py** - Send observability events

**Shared**: session_helpers.py - Common utilities and rate limiting

## Key Commands

### Installation
```bash
# Install hooks in any project
install-hooks /path/to/project

# Install with options
install-hooks --force --verbose /path/to/project
```

### Agent Creation
```bash
# Create new agent
/agent create

# Convert slash command to agent
/convert-to-agent
```

### System Management
```bash
# Start observability system
./scripts/start-system.sh

# Reset system
./scripts/reset-system.sh

# Test hooks
./bin/test-install-fix.sh
```

## Quick Navigation
- **Session ID Persistence**: File-based correlation in /tmp for all tool hooks
- **Session Handoff**: Redis-based context loading between sessions
- **Agent Monitoring**: TTS + event tracking + structured returns
- **TTS Testing**: test-tts-priorities.sh for validation

## Important Reminders
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files unless requested
- Timeline/historical information goes in PROJECT_STATUS.md
