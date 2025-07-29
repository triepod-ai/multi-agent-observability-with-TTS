# Multi-Agent Observability System

This document provides references to key documentation and resources for the Multi-Agent Observability System project.

## Core Purpose: Agent Creation with Built-in Observability

This project is fundamentally about **creating and monitoring AI agents** with comprehensive observability. Every subagent created through our system includes:

- **Automatic TTS notifications** via our integrated hooks system
- **Real-time event tracking** through the observability dashboard
- **Performance monitoring** and token usage analysis
- **Structured data returns** for proper agent-to-agent communication

### Key Integration Points:
1. **Subagent Creation**: Use `/agent create` with our monitoring-aware templates
2. **Hook System**: Auto-installed via `bin/install-hooks.sh` for TTS and event tracking
3. **Observability Dashboard**: Real-time visualization of all agent activities
4. **Slash-to-Agent Conversion**: Transform complex commands into observable agents

## Documentation Guidelines
- When creating **documentation**, always create a reference to it in CLAUDE.MD so the AI can find the context of the changes if needed.
- **Agent Documentation**: All subagents must include monitoring hooks and return structured data

## Recent Documentation Updates

### Core Documentation
- [README.md](./README.md) - Main project overview and setup instructions (Added: 2025-07-24)
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current project status and progress tracking (Added: 2025-07-24)
- [AGENTS.md](./AGENTS.md) - Agent system documentation (Added: 2025-07-24)
- [GEMINI.md](./GEMINI.md) - Gemini integration documentation (Added: 2025-07-24)

### Application Documentation
- [apps/client/README.md](./apps/client/README.md) - Client application documentation (Added: 2025-07-24)
- [apps/server/README.md](./apps/server/README.md) - Server application documentation (Added: 2025-07-24)
- [apps/demo-cc-agent/README.md](./apps/demo-cc-agent/README.md) - Demo Claude Code agent documentation (Added: 2025-07-24)
- [apps/server/CLAUDE.md](./apps/server/CLAUDE.md) - Server-specific Claude instructions (Added: 2025-07-24)

### AI & Development Documentation
- [ai_docs/README.md](./ai_docs/README.md) - AI documentation overview (Added: 2025-07-24)
- [ai_docs/claude-code-hooks.md](./ai_docs/claude-code-hooks.md) - Claude Code hooks documentation (Added: 2025-07-24)

### Enterprise Features & TTS System
- **[docs/SPEAK_SYSTEM_OVERVIEW.md](./docs/SPEAK_SYSTEM_OVERVIEW.md)** - **Comprehensive overview of the enterprise TTS system powering agent voice notifications** ⭐⭐⭐ (Added: 2025-07-27)
- [docs/HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md) - Complete documentation for all Claude Code hooks with enhanced Stop hook (Added: 2025-01-24)
- [docs/TROUBLESHOOTING_TOOL_UNKNOWN.md](./docs/TROUBLESHOOTING_TOOL_UNKNOWN.md) - Troubleshooting guide for "Tool used: unknown" regression fix (Added: 2025-07-26)
- [docs/ENTERPRISE_TTS_INTEGRATION.md](./docs/ENTERPRISE_TTS_INTEGRATION.md) - Enterprise text-to-speech integration guide (Added: 2025-07-24)
- [docs/HOOK_MIGRATION_GUIDE.md](./docs/HOOK_MIGRATION_GUIDE.md) - Global to project-specific hook migration guide (Added: 2025-07-24)
- [docs/HOOK_MIGRATION_PHASES_DOCUMENTATION.md](./docs/HOOK_MIGRATION_PHASES_DOCUMENTATION.md) - Complete technical documentation of all 3 migration phases (Added: 2025-07-24)
- [docs/INSTALL_HOOKS_GUIDE.md](./docs/INSTALL_HOOKS_GUIDE.md) - Comprehensive install-hooks.sh documentation with path conversion and project-specific source-app naming (Updated: 2025-07-25)
- [docs/NOTIFICATION_IMPROVEMENTS.md](./docs/NOTIFICATION_IMPROVEMENTS.md) - Notification system improvements addressing false positive timeout errors and summary generation (Updated: 2025-01-25, Tested: 2025-01-25)
- **[docs/PRECOMPACT_HOOK_INTEGRATION.md](./docs/PRECOMPACT_HOOK_INTEGRATION.md)** - **PreCompact hook with direct agent execution and intelligent conversation summarization** ⭐ (Added: 2025-07-24, Updated: 2025-07-28)
- **[docs/PRECOMPACT_AGENT_INTEGRATION.md](./docs/PRECOMPACT_AGENT_INTEGRATION.md)** - **Complete technical documentation of codex-session-analyzer agent integration with PreCompact hook** ⭐ (Added: 2025-07-28)
- [docs/PRECOMPACT_AGENT_QUICK_REFERENCE.md](./docs/PRECOMPACT_AGENT_QUICK_REFERENCE.md) - Developer quick reference for agent integration architecture and behavior (Added: 2025-07-28)
- **[docs/PRECOMPACT_HOOK_ENHANCEMENTS.md](./docs/PRECOMPACT_HOOK_ENHANCEMENTS.md)** - **Enhanced PreCompact hook V2 with multiple summary types and context-aware TTS** ⭐ (Added: 2025-07-27)
- **[docs/DIRECT_AGENT_EXECUTION.md](./docs/DIRECT_AGENT_EXECUTION.md)** - **KISS-compliant direct agent execution system eliminating Task tool dependencies** ⭐⭐⭐ (Added: 2025-07-28)

### SessionStart Hook Feature Updates
- **[docs/HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md)** - **Updated with new SessionStart hook feature from Claude Code** ⭐ (Updated: 2025-07-29)
  - Added comprehensive SessionStart hook documentation with matchers (startup, resume, clear)
  - Included input/output schemas and configuration examples
  - Added use cases for session initialization and context loading
- **[.claude/hooks/session_start.py](./.claude/hooks/session_start.py)** - **SessionStart hook implementation with intelligent context loading** ⭐ (Added: 2025-07-29)
  - Loads project status, recent git changes, and modified files at session start
  - Provides personalized TTS welcome messages based on session source type
  - Injects context into Claude sessions for improved awareness
  - Supports all matchers: startup, resume, clear
  - Integrated with observability system for session tracking

### Command Documentation
- [.claude/commands/convert_paths_absolute.md](./.claude/commands/convert_paths_absolute.md) - Path conversion utility documentation (Added: 2025-07-24)
- [.claude/commands/start.md](./.claude/commands/start.md) - Start command documentation (Added: 2025-07-24)
- [.claude/commands/prime.md](./.claude/commands/prime.md) - Prime command documentation (Added: 2025-07-24)
- [apps/demo-cc-agent/.claude/commands/convert_paths_absolute.md](./apps/demo-cc-agent/.claude/commands/convert_paths_absolute.md) - Demo agent path conversion utility documentation (Added: 2025-07-24)

### Utility Scripts
- [bin/install-hooks.sh](./bin/install-hooks.sh) - Automated hook installer with path conversion (Added: 2025-07-24)
- [bin/README.md](./bin/README.md) - Bin directory documentation (Added: 2025-07-24)

### TTS Implementation Documentation
- [.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_SUMMARY.md](./.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_SUMMARY.md) - TTS Phase 3.4.2 implementation summary (Added: 2025-07-24)
- [.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_COMPLETE.md](./.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_COMPLETE.md) - TTS Phase 3.4.2 completion documentation (Added: 2025-07-24)
- [.claude/hooks/utils/tts/PHASE_3_4_2_HEAP_OPTIMIZATION_DOCUMENTATION.md](./.claude/hooks/utils/tts/PHASE_3_4_2_HEAP_OPTIMIZATION_DOCUMENTATION.md) - TTS heap optimization documentation (Added: 2025-07-24)
- [.claude/hooks/utils/tts/PHASE_3_4_2_MESSAGE_PROCESSING_CACHE_COMPLETE.md](./.claude/hooks/utils/tts/PHASE_3_4_2_MESSAGE_PROCESSING_CACHE_COMPLETE.md) - TTS message processing cache completion (Added: 2025-07-24)
- **[.claude/hooks/utils/tts/coordinated_speak.py](./.claude/hooks/utils/tts/coordinated_speak.py)** - TTS Queue Coordination module preventing audio overlap (Added: 2025-01-25)

### UI Documentation
- **[docs/UI_ENHANCEMENTS_GUIDE.md](./docs/UI_ENHANCEMENTS_GUIDE.md)** - **Comprehensive guide to UI enhancements including Activity Dashboard, Timeline View, EventCard Details, Sorting, Applications Overview flexbox layout fixes, and Multi-Selection Filtering** ⭐ (Updated: 2025-07-26)
- **[docs/FILTER_NOTIFICATION_SYSTEM.md](./docs/FILTER_NOTIFICATION_SYSTEM.md)** - **Complete filter notification system documentation with multi-selection support** ⭐ (Updated: 2025-07-26)
- [apps/client/docs/FILTER_NOTIFICATION_QUICK_REFERENCE.md](./apps/client/docs/FILTER_NOTIFICATION_QUICK_REFERENCE.md) - Filter notification system developer quick reference (Added: 2025-07-26)
- [apps/client/docs/MULTI_SELECTION_FILTER_QUICK_REFERENCE.md](./apps/client/docs/MULTI_SELECTION_FILTER_QUICK_REFERENCE.md) - Multi-selection filter feature quick reference and usage guide (Added: 2025-07-26)

### Testing Framework Documentation
- **[apps/client/docs/TESTING_FRAMEWORK_GUIDE.md](./apps/client/docs/TESTING_FRAMEWORK_GUIDE.md)** - **Comprehensive testing framework documentation** ⭐ (Added: 2025-07-25)
- [apps/client/docs/TESTING_QUICK_REFERENCE.md](./apps/client/docs/TESTING_QUICK_REFERENCE.md) - Developer testing quick reference and commands (Added: 2025-07-25)

### Agent Creation & Monitoring Documentation (CORE FUNCTIONALITY)
- **[docs/AGENT_MONITORING_GUIDE.md](./docs/AGENT_MONITORING_GUIDE.md)** - **Comprehensive guide to agent creation with built-in observability** ⭐⭐⭐ (Added: 2025-07-27)
- **[docs/AGENT_TTS_HOOK_INTEGRATION.md](./docs/AGENT_TTS_HOOK_INTEGRATION.md)** - **How agents, TTS, and hooks work together for full observability** ⭐⭐ (Added: 2025-07-27)
- **[docs/SUBAGENT_CREATION_GUIDE.md](./docs/SUBAGENT_CREATION_GUIDE.md)** - **Simple KISS-compliant guide for creating focused subagents** ⭐ (Added: 2025-07-27)
- [docs/SUBAGENT_WORKFLOW_EXAMPLE.md](./docs/SUBAGENT_WORKFLOW_EXAMPLE.md) - Step-by-step examples using the /agent command (Added: 2025-07-27)
- **[docs/SLASH_TO_AGENT_CONVERSION.md](./docs/SLASH_TO_AGENT_CONVERSION.md)** - **Comprehensive guide for converting slash commands to subagents** ⭐ (Added: 2025-07-27)
- [docs/MEMORY_STORE_CONVERSION_EXAMPLE.md](./docs/MEMORY_STORE_CONVERSION_EXAMPLE.md) - Detailed example of converting memory-simple-store (Added: 2025-07-27)
- [.claude/commands/create-agent.md](./.claude/commands/create-agent.md) - Quick reference formula for agent creation (Added: 2025-07-27)
- [.claude/commands/convert-to-agent.md](./.claude/commands/convert-to-agent.md) - Helper command for analyzing and converting slash commands (Added: 2025-07-27)
