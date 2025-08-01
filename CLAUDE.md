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
5. **Session Context Integration**: Enhanced session-start-hook automatically loads previous session handoff context from Redis for seamless continuity

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
- **[docs/SPEAK_SYSTEM_OVERVIEW.md](./docs/SPEAK_SYSTEM_OVERVIEW.md)** - **Comprehensive overview of the enterprise TTS system powering agent voice notifications** ⭐⭐⭐ (Added: 2025-07-27, Updated: 2025-07-29)
- **[docs/HOOK_TTS_INTEGRATION_REFERENCE.md](./docs/HOOK_TTS_INTEGRATION_REFERENCE.md)** - **Complete technical reference for Claude Code hook integration with enterprise TTS system** ⭐⭐⭐ (Added: 2025-07-29)
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

### Session Continuity System (NEW INTEGRATION)
- **[docs/PRECOMPACT_SESSION_CONTINUITY.md](./docs/PRECOMPACT_SESSION_CONTINUITY.md)** - **PreCompact to SessionStart integration for continuous learning** ⭐⭐⭐ (Added: 2025-01-31)
  - **Automatic Summary Loading**: SessionStart now loads previous session summaries from PreCompact
  - **Continuous Learning**: Each session builds on insights from previous sessions
  - **Smart Filtering**: Loads last 3 sessions with intelligent deduplication
  - **Structured Injection**: Blockers → Actions → Achievements → Insights hierarchy
  - **Zero Configuration**: Works automatically with existing hooks
  - **Benefits**: No more "write-only" summaries - full session continuity achieved

### SessionStart Hook KISS Refactoring (ARCHITECTURE IMPROVEMENT)
- **[docs/HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md)** - **Updated with KISS-compliant SessionStart hook architecture** ⭐⭐⭐ (Updated: 2025-07-30)
  - **KISS Architecture**: Refactored monolithic hook into 4 focused scripts following single responsibility principle
  - **Individual Hook Scripts**: session_context_loader.py, session_startup_notifier.py, session_resume_detector.py, session_event_tracker.py
  - **Rate Limiting**: 30-second cooldown system prevents TTS notification spam
  - **Smart Logic**: Resume detector only notifies for meaningful work (modified files, commits, project status)
  - **Execution Flow**: Different script combinations for startup/resume/clear sessions
  - **Benefits**: Easy debugging, selective disabling, independent failure handling, clear purpose per script

#### KISS Hook Implementation Files
- **[.claude/hooks/session_context_loader.py](./.claude/hooks/session_context_loader.py)** - **Project context injection with Redis handoff integration and UV dependency management** ⭐⭐ (Created: 2025-07-30, Enhanced: 2025-08-01)
  - Single purpose: Load PROJECT_STATUS.md, git status, recent commits, and previous session handoff context from Redis
  - **Enhanced Features**: 
    - **Redis Handoff Integration**: Automatically retrieves latest handoff context from Redis exports created by `/get-up-to-speed-export`
    - **MCP Redis Compatibility**: Fixed operation namespace (`"cache"`) for proper Redis retrieval
    - **Session Continuity**: Previous session context loads first for maximum relevance in new sessions
    - **UV Dependency Management**: Uses `--with redis` for automatic dependency handling
    - **Multi-source Context**: Combines Redis handoffs, session summaries, and project status
  - **Fallback Chain**: Redis → file-based handoffs → project context only
  - Used for: startup, resume (not clear - fresh sessions don't need old context)
  - No TTS, no events, no complex decisions (~350 lines with Redis integration)

- **[.claude/hooks/session_startup_notifier.py](./.claude/hooks/session_startup_notifier.py)** - **New session TTS with rate limiting and UV dependency management** (Created: 2025-07-30, Enhanced: 2025-08-01)  
  - Single purpose: Send TTS notification for genuine new sessions only
  - Features: 30-second rate limiting prevents spam, UV `--with openai,pyttsx3` dependency management
  - Used for: startup only (50 lines)

- **[.claude/hooks/session_resume_detector.py](./.claude/hooks/session_resume_detector.py)** - **Smart resume notifications with UV dependency management** (Created: 2025-07-30, Enhanced: 2025-08-01)
  - Single purpose: Send TTS for meaningful resume sessions only
  - Logic: Only notifies if significant work context exists, UV `--with openai,pyttsx3` dependency management
  - Used for: resume only (75 lines)

- **[.claude/hooks/session_event_tracker.py](./.claude/hooks/session_event_tracker.py)** - **Observability events only** (Created: 2025-07-30)
  - Single purpose: Send session tracking events to observability server
  - Logic: Always sends event (observability needs all data)
  - Used for: All session types (45 lines)

- **[.claude/hooks/utils/session_helpers.py](./.claude/hooks/utils/session_helpers.py)** - **Shared utilities** (Created: 2025-07-30)
  - Common functionality: get_project_name(), get_git_status(), rate limiting system
  - 30-second cooldown system with timestamp files
  - Consistent git status formatting (95 lines)

#### Legacy & Migration
- **[.claude/hooks/session_start.py.backup](./.claude/hooks/session_start.py.backup)** - Original monolithic implementation (260+ lines, archived)
- **Migration**: Updated .claude/settings.json to use 4 focused hooks instead of single SessionStart hook
- **Testing**: All individual hooks tested independently and validated for focused functionality

### Command Documentation
- [.claude/commands/convert_paths_absolute.md](./.claude/commands/convert_paths_absolute.md) - Path conversion utility documentation (Added: 2025-07-24)
- [.claude/commands/start.md](./.claude/commands/start.md) - Start command documentation (Added: 2025-07-24)
- [.claude/commands/prime.md](./.claude/commands/prime.md) - Prime command documentation (Added: 2025-07-24)
- [apps/demo-cc-agent/.claude/commands/convert_paths_absolute.md](./apps/demo-cc-agent/.claude/commands/convert_paths_absolute.md) - Demo agent path conversion utility documentation (Added: 2025-07-24)

### Utility Scripts
- **[bin/install-hooks.sh](./bin/install-hooks.sh)** - **Enhanced automated hook installer with UV dependency management** ⭐ (Added: 2025-07-24, Enhanced: 2025-08-01)
  - **New Step 5.6**: UV dependency management configuration
  - **Automatic Dependencies**: Adds `--with redis`, `--with openai,pyttsx3`, `--with requests` flags to appropriate hooks
  - **Smart Mapping**: Maps 16 different hook scripts to their required dependencies
  - **Argument Handling**: Handles scripts with arguments (e.g., `stop.py --chat`)
  - **Zero Manual Setup**: Target projects get full functionality without manual dependency installation
  - **Cross-Platform**: Works on any system with UV installed
- [bin/README.md](./bin/README.md) - Bin directory documentation (Added: 2025-07-24)

### TTS Implementation Documentation
- [.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_SUMMARY.md](./.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_SUMMARY.md) - TTS Phase 3.4.2 implementation summary (Added: 2025-07-24)
- [.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_COMPLETE.md](./.claude/hooks/utils/tts/PHASE_3_4_2_IMPLEMENTATION_COMPLETE.md) - TTS Phase 3.4.2 completion documentation (Added: 2025-07-24)
- [.claude/hooks/utils/tts/PHASE_3_4_2_HEAP_OPTIMIZATION_DOCUMENTATION.md](./.claude/hooks/utils/tts/PHASE_3_4_2_HEAP_OPTIMIZATION_DOCUMENTATION.md) - TTS heap optimization documentation (Added: 2025-07-24)
- [.claude/hooks/utils/tts/PHASE_3_4_2_MESSAGE_PROCESSING_CACHE_COMPLETE.md](./.claude/hooks/utils/tts/PHASE_3_4_2_MESSAGE_PROCESSING_CACHE_COMPLETE.md) - TTS message processing cache completion (Added: 2025-07-24)
- **[.claude/hooks/utils/tts/coordinated_speak.py](./.claude/hooks/utils/tts/coordinated_speak.py)** - TTS Queue Coordination module preventing audio overlap (Added: 2025-01-25)
- **[.claude/hooks/pyproject.toml](./.claude/hooks/pyproject.toml)** - **UV dependency specification for hooks** ⭐ (Added: 2025-08-01)
  - **Dependencies**: redis>=4.0.0, requests>=2.28.0, openai>=1.0.0, pyttsx3>=2.90
  - **UV Integration**: Enables automatic dependency management for all hook scripts
  - **Zero Configuration**: Works automatically with UV `--with` flags

### UI Documentation
- **[docs/UI_ENHANCEMENTS_GUIDE.md](./docs/UI_ENHANCEMENTS_GUIDE.md)** - **Comprehensive guide to UI enhancements including Activity Dashboard, Timeline View, EventCard Details, Sorting, Applications Overview flexbox layout fixes, and Multi-Selection Filtering** ⭐ (Updated: 2025-07-26)
- **[docs/FILTER_NOTIFICATION_SYSTEM.md](./docs/FILTER_NOTIFICATION_SYSTEM.md)** - **Complete filter notification system documentation with multi-selection support** ⭐ (Updated: 2025-07-26)
- [apps/client/docs/FILTER_NOTIFICATION_QUICK_REFERENCE.md](./apps/client/docs/FILTER_NOTIFICATION_QUICK_REFERENCE.md) - Filter notification system developer quick reference (Added: 2025-07-26)
- [apps/client/docs/MULTI_SELECTION_FILTER_QUICK_REFERENCE.md](./apps/client/docs/MULTI_SELECTION_FILTER_QUICK_REFERENCE.md) - Multi-selection filter feature quick reference and usage guide (Added: 2025-07-26)

### Testing Framework Documentation
- **[apps/client/docs/TESTING_FRAMEWORK_GUIDE.md](./apps/client/docs/TESTING_FRAMEWORK_GUIDE.md)** - **Comprehensive testing framework documentation** ⭐ (Added: 2025-07-25)
- [apps/client/docs/TESTING_QUICK_REFERENCE.md](./apps/client/docs/TESTING_QUICK_REFERENCE.md) - Developer testing quick reference and commands (Added: 2025-07-25)

### Agent Creation & Monitoring Documentation (CORE FUNCTIONALITY)
- **[docs/AGENT_CREATION_WORKFLOW.md](./docs/AGENT_CREATION_WORKFLOW.md)** - **Step-by-step workflow guide for creating effective Claude Code subagents with token optimization patterns** ⭐⭐⭐ (Added: 2025-07-29)
- **[docs/AGENT_MONITORING_GUIDE.md](./docs/AGENT_MONITORING_GUIDE.md)** - **Comprehensive guide to agent creation with built-in observability** ⭐⭐⭐ (Added: 2025-07-27)
- **[docs/AGENT_TTS_HOOK_INTEGRATION.md](./docs/AGENT_TTS_HOOK_INTEGRATION.md)** - **How agents, TTS, and hooks work together for full observability** ⭐⭐ (Added: 2025-07-27)
- **[docs/SUBAGENT_CREATION_GUIDE.md](./docs/SUBAGENT_CREATION_GUIDE.md)** - **Simple KISS-compliant guide for creating focused subagents** ⭐ (Added: 2025-07-27)
- [docs/SUBAGENT_WORKFLOW_EXAMPLE.md](./docs/SUBAGENT_WORKFLOW_EXAMPLE.md) - Step-by-step examples using the /agent command (Added: 2025-07-27)
- **[docs/SLASH_TO_AGENT_CONVERSION.md](./docs/SLASH_TO_AGENT_CONVERSION.md)** - **Comprehensive guide for converting slash commands to subagents** ⭐ (Added: 2025-07-27)
- [docs/MEMORY_STORE_CONVERSION_EXAMPLE.md](./docs/MEMORY_STORE_CONVERSION_EXAMPLE.md) - Detailed example of converting memory-simple-store (Added: 2025-07-27)
- [.claude/commands/create-agent.md](./.claude/commands/create-agent.md) - Quick reference formula for agent creation (Added: 2025-07-27)
- [.claude/commands/convert-to-agent.md](./.claude/commands/convert-to-agent.md) - Helper command for analyzing and converting slash commands (Added: 2025-07-27)

### Agent Optimization Results (PERFORMANCE METRICS)
- **Agent Portfolio Optimization**: Comprehensive optimization of 12 Claude Code subagents achieving 80-90% token reduction
  - **Project Agent Optimization** (2025-07-29): status-updater.md optimized from 384 words to 25 words (96% reduction)
  - **User Agent Optimization Phase 1** (2025-07-29): 7 major agents optimized with 73-85% token reduction
    - mcp-parallel-store.md: 2005→355 bytes (82%), file-size-optimizer.md: 1912→295 bytes (85%)
    - lesson-generator.md: 1766→307 bytes (83%), redis-cache-manager.md: 1797→340 bytes (81%)
    - lesson-complexity-analyzer.md: 1543→342 bytes (78%), session-archive-manager.md: 1446→394 bytes (73%)
    - codex-session-analyzer.md: 1348→317 bytes (76%)
  - **User Agent Optimization Phase 2** (2025-07-29): 5 additional agents optimized with 83-84% reduction
    - screenshot-analyzer.md: 1350→227 bytes (83%), redis-session-store.md: 1269→209 bytes (84%)
    - redis-conversation-store.md: 1224→206 bytes (83%), export-file-writer.md: 1194→201 bytes (83%)
    - git-context-collector.md: 1182→199 bytes (83%)
  - **Total Portfolio Impact**: ~/.claude/agents reduced to 28,610 bytes (~30% overall reduction from 40K+ baseline)
  - **Methodology**: Applied ultra-minimal prompt engineering with workflow arrow notation (→) while preserving full functionality

### Session Handoff Integration System (SEAMLESS CONTINUITY)
- **[Enhanced Session Context Integration](# "Session handoff integration system")** - **Complete Redis-based session continuity system** ⭐⭐⭐ (Implemented: 2025-01-30)
  - **Fast Export**: `/get-up-to-speed-export` creates Redis handoffs with session context in <0.2 seconds
  - **Automatic Loading**: Enhanced `session_context_loader.py` retrieves latest handoff context on session start
  - **Magic Context Pipeline**: Export → Redis Storage → Session Start Hook → Claude Context injection
  - **Key Benefits**: Previous session context loads first, seamless project continuity, eliminates context loss between sessions
  - **Storage Format**: `handoff:project:{project-name}:{YYYYMMDD_HHMMSS}` keys with 30-day TTL
  - **Smart Retrieval**: Timestamp-based latest handoff detection with fallback to file-based exports
  - **Performance**: Direct Redis access bypasses MCP complexity for fast context loading
  - **Integration**: Works with all existing KISS hook architecture without modification

## Quick Navigation
- **Session Handoff System**: Enhanced session-start-hook with Redis handoff integration for seamless project continuity
- **Agent Creation & Monitoring**: Core functionality for creating observable AI agents with TTS and event tracking
- **KISS Hook Architecture**: 4 focused scripts (context loader, startup notifier, resume detector, event tracker)
- **TTS Integration**: Enterprise text-to-speech system with intelligent voice selection and cost optimization
