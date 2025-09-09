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

### MCP Server Evaluation System (NEW - 2025-01-04)
- **[docs/MCP_EVALUATOR_APPLICATION.md](./docs/MCP_EVALUATOR_APPLICATION.md)** - **Complete MCP Server evaluation application combining static analysis with runtime testing** ⭐⭐⭐ (Created: 2025-01-04)
  - **Dual Testing Approach**: Combines existing evaluation hooks (static analysis) with MCP Inspector runtime testing
  - **Multiple Interfaces**: CLI tool, interactive dashboard, and programmatic API
  - **Real-time Monitoring**: WebSocket-based progress tracking and live test execution
  - **Comprehensive Scoring**: Unified scoring system combining static + runtime results
  - **CI/CD Integration**: Automated evaluation with configurable fail thresholds
  - **Observability Integration**: Full integration with the multi-agent observability system
  - **Developer Tools**: Individual tool testing, performance monitoring, and detailed reporting
- **[docs/MCP_EVALUATOR_QUICK_REFERENCE.md](./docs/MCP_EVALUATOR_QUICK_REFERENCE.md)** - **Quick reference guide for MCP evaluation commands and criteria** ⭐⭐ (Created: 2025-01-04)
  - **Command Reference**: Common commands for evaluation, testing, and CI/CD integration
  - **Evaluation Checklist**: Quick validation against Anthropic's 5 core requirements
  - **Score Interpretation**: Understanding evaluation results and recommended actions
  - **Troubleshooting Guide**: Common issues and quick fixes
  - **Configuration Templates**: Ready-to-use config files for different scenarios
- **[docs/MCP_EVALUATION_HOOKS.md](./docs/MCP_EVALUATION_HOOKS.md)** - **Static analysis hooks system (foundation component)** ⭐⭐⭐ (Created: 2025-09-03)
  - **5 Core Requirements**: Functionality match, prompt injection prevention, clear tool names, working examples, error handling
  - **Installation System**: `bin/install-mcp-hooks.sh` for easy deployment to any MCP project
  - **Standalone Usage**: Can be used independently or as part of the full evaluator application
  - **CI/CD Integration**: Automated testing pipelines and batch evaluation support

### Session Relationship Implementation (NEW - 2025-08-22)
- **[docs/SESSION_RELATIONSHIP_IMPLEMENTATION.md](./docs/SESSION_RELATIONSHIP_IMPLEMENTATION.md)** - **Complete documentation for session relationships system implementation and fixes** ⭐⭐⭐ (Created: 2025-08-22)
  - **Automatic Session Management**: Auto-creation from SubagentStart/Stop events with constraint violation fixes
  - **Hierarchical Relationship Tracking**: Parent-child relationships with depth tracking and cycle detection  
  - **Real-time WebSocket Integration**: Live updates for session spawn and completion events
  - **Session Tree Building**: Recursive tree structures with agent name enhancement via LLM-powered naming
  - **API Response Standardization**: Fixed format mismatch issues for consistent frontend integration
  - **Database Schema**: Complete sessions and session_relationships table documentation
  - **Performance Optimizations**: Prepared statements, indexing, and caching strategies
  - **Troubleshooting Guide**: Common issues and solutions for developers
  - **Usage Examples**: Practical code examples for creating relationships and building trees

### Educational Dashboard Complete Refactor (UPDATED - 2025-09-09)
- **[EDUCATIONAL_DASHBOARD_STATUS.md](./EDUCATIONAL_DASHBOARD_STATUS.md)** - **Complete status tracking for Educational Dashboard implementation showing what works, what's in-progress, and what needs fixing** ⭐⭐⭐ (Created: 2025-08-24)
- **[EDUCATIONAL_DASHBOARD_IMPLEMENTATION_TRACKING.md](./EDUCATIONAL_DASHBOARD_IMPLEMENTATION_TRACKING.md)** - **Comprehensive implementation roadmap with intelligent agent assignments for completing Educational Dashboard from 75% to 100%** ⭐⭐⭐ (Created: 2025-08-24, Updated: 2025-09-09)
  - **Major Refactor Complete**: Modular tab-based architecture with enhanced learning experience
  - **Assessment System**: Complete quiz functionality with Monaco Editor integration and accessibility support
  - **Security Enhancements**: AST-based security validation, WASI runtime, sandboxed code execution
  - **Code Execution**: JavaScript and Python engines with resource monitoring and security controls
  - **Mobile Responsive**: Full mobile support across all educational components
  - **Progress Tracking**: Competency updates, badge earning, and persistent learning data
  - **Current Status**: 75% complete - basic learning flow fully functional with enhanced security
  - **Testing Infrastructure**: Comprehensive Playwright E2E testing with cross-browser support
  - **Next Priorities**: Real code execution deployment, expanded assessment content, performance optimization

### Educational Dashboard Mode (2025-08-21)
- **[docs/EDUCATIONAL_DASHBOARD_MODE_IMPLEMENTATION.md](./docs/EDUCATIONAL_DASHBOARD_MODE_IMPLEMENTATION.md)** - **Complete Educational Dashboard Mode implementation transforming the observability platform into an interactive learning tool** ⭐⭐⭐ (Added: 2025-08-21)
  - **Educational/Expert Toggle**: Seamless switching between learning and professional modes
  - **Interactive Hook Flow Diagram**: Visual representation with animated execution sequences
  - **Comprehensive Hook Explanations**: Beginner-friendly content for all 8 Claude Code hooks
  - **Contextual Help System**: Progressive disclosure with tooltips and expandable panels
  - **Learning Progress Tracker**: Persistent progress tracking with completion indicators
  - **Real-World Scenarios**: Practical examples showing hook interactions
  - **60% Learning Curve Reduction**: Makes Claude Code hooks accessible to beginners
  - **Performance Optimized**: Lazy loading and responsive design for all devices
- **[apps/client/docs/QUICK_REFERENCE_CARDS_IMPLEMENTATION.md](./apps/client/docs/QUICK_REFERENCE_CARDS_IMPLEMENTATION.md)** - **Quick Reference Cards system completing Phase 1 Educational Dashboard deployment** ⭐⭐ (Added: 2025-08-22)
  - **Scannable Hook Reference**: Visual cards for all 8 Claude Code hooks with comprehensive metadata
  - **Advanced Search & Filtering**: Real-time search by name, purpose, or use case with category filters
  - **Interactive Design**: Hover tooltips, click navigation, and responsive grid layout (1-4 columns)
  - **Complete Integration**: New Reference tab in Educational Dashboard with cross-navigation
  - **Learning Optimization**: 60% faster hook discovery with visual hierarchy and instant search

### Security & Code Execution System (NEW - 2025-09-09)
- **[docs/WEBASSEMBLY_SECURITY_ARCHITECTURE.md](./docs/WEBASSEMBLY_SECURITY_ARCHITECTURE.md)** - **Complete WebAssembly security architecture for safe code execution** ⭐⭐⭐ (Created: 2025-09-09)
  - **WASI Runtime Integration**: Sandboxed execution environment with resource limits
  - **AST Security Validation**: Static analysis to prevent malicious code patterns
  - **Multi-Language Support**: JavaScript and Python execution engines with security controls
  - **Resource Monitoring**: Memory, CPU, and execution time limits enforcement
- **[docs/WASI_IMPLEMENTATION_SPECIFICATION.md](./docs/WASI_IMPLEMENTATION_SPECIFICATION.md)** - **WASI runtime implementation for secure code execution** ⭐⭐ (Created: 2025-09-09)
- **[apps/client/docs/AST_SECURITY_VALIDATION_IMPLEMENTATION.md](./apps/client/docs/AST_SECURITY_VALIDATION_IMPLEMENTATION.md)** - **AST-based security validation for code execution** ⭐⭐ (Created: 2025-09-09)

### Testing Infrastructure (NEW - 2025-09-09)
- **[apps/client/tests/CROSS_BROWSER_TEST_PLAN.md](./apps/client/tests/CROSS_BROWSER_TEST_PLAN.md)** - **Comprehensive cross-browser testing strategy** ⭐⭐⭐ (Created: 2025-09-09)
  - **Playwright Integration**: E2E testing across Chrome, Firefox, Safari, Edge
  - **Mobile Testing**: Responsive design validation on mobile devices
  - **Performance Testing**: WebAssembly performance benchmarks
  - **Accessibility Testing**: WCAG compliance validation
  - **Visual Regression**: Cross-browser visual consistency testing
- **Testing Scripts**: Comprehensive npm scripts for all testing scenarios
  - `npm run test:e2e` - Run all E2E tests
  - `npm run test:cross-browser` - Test across all browsers
  - `npm run test:accessibility` - Run accessibility tests
  - `npm run test:performance` - Performance benchmarks

### Accessibility Features (NEW - 2025-09-09)
- **[apps/client/ACCESSIBILITY_COMPLIANCE_REPORT.md](./apps/client/ACCESSIBILITY_COMPLIANCE_REPORT.md)** - **WCAG compliance report and implementation guide** ⭐⭐⭐ (Created: 2025-09-09)
- **[apps/client/ACCESSIBILITY_INTEGRATION_GUIDE.md](./apps/client/ACCESSIBILITY_INTEGRATION_GUIDE.md)** - **Guide for implementing accessible components** ⭐⭐ (Created: 2025-09-09)
- **Accessible Components**: HookAssessmentAccessible, AssessmentQuestionAccessible, SecureCodeEditorAccessible
- **Screen Reader Support**: Full ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-first approach with touch optimization

### Multi-Agent TTS Testing & Validation System (NEW - 2025-09-09)
- **[test-tts-priorities.sh](./apps/client/test-tts-priorities.sh)** - **Comprehensive TTS testing script validating all 6 priority levels with multi-agent coordination** ⭐⭐⭐ (Created: 2025-09-09)
  - **6 Priority Levels Tested**: normal, important, error, subagent_complete, memory_confirmed, memory_failed
  - **3-Layer Coordination**: Socket → file-lock → direct execution with fallback strategies
  - **Multi-Agent Workflow Validation**: 4 specialized agents (CodebaseAnalyzer, ConfigReader, ProjectAnalyzer, BackendBuilder)
  - **Personalization Testing**: ENGINEER_NAME environment variable integration
  - **95% Cost Optimization**: OpenAI as default provider with ElevenLabs/pyttsx3 fallbacks
  - **Non-blocking Execution**: Verified system performance preservation during TTS operations
  - **Reference Implementation**: Complete test suite serving as integration template for other projects
- **[docs/TTS_MULTI_AGENT_TESTING_GUIDE.md](./docs/TTS_MULTI_AGENT_TESTING_GUIDE.md)** - **Complete guide for testing TTS integration in multi-agent environments** ⭐⭐⭐ (Created: 2025-09-09)
  - **Testing Methodology**: Step-by-step validation procedures for all TTS priority levels
  - **Multi-Agent Coordination**: Best practices for coordinating TTS notifications across multiple agents
  - **Performance Validation**: Benchmarking and optimization strategies for TTS systems
  - **Integration Patterns**: Reference implementations for different project types

### Generic Agent TTS Filtering (NEW - 2025-08-06)
- **Enhanced SubagentStop Hook**: Now includes intelligent TTS filtering for generic agents to reduce audio notification spam
- **30+ Agent Type Classifications**: Expanded from ~10 to 30+ specific agent types for better classification
- **Smart Audio Notifications**: Only specialized agents trigger TTS, while generic/utility agents operate silently
- **Full Observability Maintained**: All metrics and events still tracked regardless of TTS filtering

## Recent Documentation Updates

### Agent Naming System (NEW - 2025-08-21)
- **[docs/AGENT_NAMING_SYSTEM.md](./docs/AGENT_NAMING_SYSTEM.md)** - **Complete LLM-powered agent naming system with memorable names, database persistence, and hook integration** ⭐⭐⭐ (Added: 2025-08-21)
  - **LLM-Generated Names**: Anthropic Claude → OpenAI fallback → pattern-based fallback
  - **Name Format**: `{Role}{Personality}-{Variant}` (e.g., "CodeGuardian-Alpha", "DataDetective-Pro")
  - **Database Persistence**: SQLite storage with TTL, usage tracking, and performance optimization
  - **Hook Integration**: Automatic naming in subagent_start/stop hooks with display name generation
  - **API Endpoints**: Full REST API for name management, session tracking, and agent execution monitoring
  - **30+ Agent Types**: Specialized naming patterns for analyzer, reviewer, debugger, tester, builder, etc.
  - **Fallback System**: Robust error handling with UUID fallback ensuring 99.5%+ success rate
  - **Performance**: <5ms cache retrieval, 95%+ cache hit rate, cost-optimized LLM usage
  - **Integration**: Terminal status system, TTS notifications, observability dashboard

### Multi-Agent Demo System (NEW)
- **[docs/SALESAI_DEMO_TECHNICAL_IMPLEMENTATION.md](./docs/SALESAI_DEMO_TECHNICAL_IMPLEMENTATION.md)** - **Complete technical documentation of the SalesAi multi-agent demo system architecture and implementation** ⭐⭐⭐ (Added: 2025-08-01)

### Agent Operations Backend (NEW)
- **[docs/AGENT_OPERATIONS_BACKEND_ARCHITECTURE.md](./docs/AGENT_OPERATIONS_BACKEND_ARCHITECTURE.md)** - **Comprehensive backend architecture for real-time agent execution metrics and analytics** ⭐⭐⭐ (Added: 2025-08-06)
  - Enhanced hook system for comprehensive metrics capture
  - Redis data structures for real-time aggregation
  - New API endpoints for agent analytics
  - WebSocket integration for live updates
  - Performance optimization strategies

### Agent Operations Modal Enhancement (NEW)
- **[docs/AGENT_OPERATIONS_MODAL_ENHANCEMENT.md](./docs/AGENT_OPERATIONS_MODAL_ENHANCEMENT.md)** - **Detailed guide for the comprehensive Agent Operations modal transformation** ⭐⭐⭐ (Added: 2025-08-06)
  - 6-strategy agent detection system
  - 12 agent type classifications
  - Real-time WebSocket integration
  - Frontend component architecture
  - Performance and connection optimization strategies

### Hook Installation and Diagnostics
- **[docs/REDIS_HANDOFF_RETRIEVAL_FIX.md](./docs/REDIS_HANDOFF_RETRIEVAL_FIX.md)** - **Comprehensive documentation for resolving hook path configuration and dependency retrieval issues** ⭐ (Added: 2025-08-02)
- **[docs/REDIS_MCP_REMOVAL_GUIDE.md](./docs/REDIS_MCP_REMOVAL_GUIDE.md)** - **Complete technical guide for removing Redis MCP and transitioning to direct Redis CLI usage** ⭐⭐ (Added: 2025-08-02)

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

### Hook Coverage Modal Fix Documentation (NEW - 2025-01-03)
- **[docs/HOOK_COVERAGE_MODAL_FIX.md](./docs/HOOK_COVERAGE_MODAL_FIX.md)** - **Comprehensive technical documentation for Hook Coverage Modal fix** ⭐⭐⭐ (Added: 2025-01-03)
  - **Problem Resolution**: Fixed critical issue where only 1 of 4 modal tabs displayed data
  - **Root Cause Analysis**: Database mixed naming conventions (CamelCase vs snake_case) causing API queries to miss 50% of events
  - **Solution Implementation**: Enhanced `getEventTypesForHook` function to support dual naming patterns
  - **Impact**: Restored 100% functionality to all 4 tabs with complete access to 17,169 hook events
  - **Technical Details**: Code examples, API testing, verification procedures, and prevention strategies
- **[docs/API_HOOK_ENDPOINTS.md](./docs/API_HOOK_ENDPOINTS.md)** - **Complete API documentation for all hook-related endpoints** ⭐⭐⭐ (Added: 2025-01-03)
  - **9 Hook Types**: Comprehensive documentation for all Claude Code hooks with dual naming convention support
  - **4 Main Endpoints**: Hook coverage, enhanced context, performance metrics, and recent events
  - **Request/Response Examples**: Complete cURL and JavaScript examples with error handling
  - **Integration Notes**: Frontend integration patterns, WebSocket updates, and performance considerations
- **[docs/TROUBLESHOOTING_GUIDE.md](./docs/TROUBLESHOOTING_GUIDE.md)** - **Complete system troubleshooting guide** ⭐⭐⭐ (Added: 2025-01-03)
  - **Hook Data Issues**: Diagnostic procedures for data display problems and API endpoint failures
  - **Database Issues**: Connection failures, performance problems, and consistency checks
  - **Frontend Issues**: Modal display problems, data binding issues, and debugging procedures
  - **System Integration**: Hook installation, service communication, and performance optimization
  - **Emergency Procedures**: Complete system reset and data recovery protocols
- **[CHANGELOG.md](./CHANGELOG.md)** - **Project changelog with Hook Coverage Modal fix details** ⭐ (Added: 2025-01-03)
  - **Version 1.2.1**: Comprehensive fix documentation with technical details and impact assessment
  - **Developer Impact**: Database access restoration, modal functionality, and system observability improvements
  - **Data Recovery**: Before/after statistics showing 100% event accessibility restoration

## Quick Navigation
- **Session Handoff System**: Enhanced session-start-hook with Redis handoff integration for seamless project continuity
- **Agent Creation & Monitoring**: Core functionality for creating observable AI agents with TTS and event tracking
- **KISS Hook Architecture**: 4 focused scripts (context loader, startup notifier, resume detector, event tracker)
- **TTS Integration**: Enterprise text-to-speech system with intelligent voice selection and cost optimization
