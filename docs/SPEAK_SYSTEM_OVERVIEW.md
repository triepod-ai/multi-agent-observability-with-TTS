# Speak System - High-Level Overview for Dependent Applications

## 🎯 Executive Summary

The **Speak System** is a production-ready, cost-optimized text-to-speech (TTS) ecosystem designed for enterprise applications and developer workflows. It provides intelligent voice synthesis with 95% cost reduction compared to premium providers, automatic fallback chains, and sophisticated integration capabilities for dependent applications like the Multi-Agent Observability System.

### Key Value Propositions

- **💰 Cost Optimization**: 95% cost reduction with OpenAI as primary provider
- **🔄 Reliability**: Automatic fallback chain (OpenAI → ElevenLabs → pyttsx3)
- **🎙️ Intelligence**: Context-aware voice selection and AI-powered summarization
- **⚡ Performance**: Non-blocking execution, enterprise queue coordination
- **🔧 Integration**: Native Claude Code hooks and dependent application support

### System Architecture

```
Dependent Application → Speak Command → Provider Selection → Voice Output
                    ↓
                Hook Integration → Voice Differentiation → Anti-Spam Control
                    ↓
                Queue Coordination → Performance Monitoring → Cost Tracking
```

---

## 🏗️ Core Capabilities

### 1. Multi-Provider TTS Engine

**Provider Chain** (automatic fallback):
- **OpenAI** (primary): $0.015/1K chars, ~300ms latency, ⭐⭐⭐⭐ quality
- **ElevenLabs** (premium): $0.330/1K chars, ~500ms latency, ⭐⭐⭐⭐⭐ quality  
- **pyttsx3** (offline): Free, instant, ⭐⭐⭐ quality

**Smart Provider Selection**:
- Automatic cost optimization (OpenAI default saves 95%)
- Health monitoring with circuit breaker patterns
- Environment-aware selection (development mode forces offline)
- API key availability detection

### 2. Intelligent Voice Differentiation

**Context-Aware Voice Assignment**:
```yaml
MCP Operations: alloy (technical, neutral)
File Operations: shimmer (fast, efficient)  
Security/Critical: onyx (authoritative, slower)
Web Operations: fable (distinctive, British accent)
Sub-agent Complete: echo (coordination clarity)
General Operations: nova (friendly default)
```

**Speed Differentiation**:
- Variable speech rates (0.8x - 1.3x) based on context
- Priority-based speed adjustment
- Tool-specific optimization

### 3. Enterprise Queue Coordination

**Anti-Overlap System**:
- Unix domain socket IPC for low-latency coordination
- Priority-based message queuing (interrupt → background)
- Cross-hook coordination prevents audio flooding
- Automatic fallback to direct execution

**Performance Metrics**:
- Heap-based priority queue: O(log n) operations
- 2.3M+ operations/second throughput
- Thread-safe design supporting 16+ concurrent threads
- Zero memory leaks in stress testing

### 4. Cost Management & Optimization

**Intelligent Caching**:
- LFU (Least Frequently Used) cache for 5000+ entries
- Pattern-based deduplication
- Automatic cache optimization and invalidation
- 100% cache hit rate achieved in testing

**Batch Processing**:
- `speak-batch` command for bulk operations
- Cost-optimized provider selection
- Automatic caching integration
- Usage tracking and reporting

---

## 🔌 Integration Patterns for Dependent Applications

### 1. Standard notify_tts() Function

**Recommended Integration Pattern**:
```bash
# Enhanced TTS notification function using speak command
notify_tts() {
    local message="$1"
    local priority="${2:-normal}"  # normal, important, error, subagent_complete, memory_confirmed, memory_failed
    
    ENGINEER_NAME=${ENGINEER_NAME:-"Developer"}
    
    # Skip TTS if disabled
    if [ "${TTS_ENABLED:-true}" != "true" ]; then
        return 0
    fi
    
    # Format message based on priority
    case "$priority" in
        "subagent_complete")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Sub-agent completed: $message"
            ;;
        "memory_confirmed")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Memory operation confirmed: $message"
            ;;
        "memory_failed")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Memory operation failed: $message"
            ;;
        "error")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Error: $message"
            ;;
        "important")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Important: $message"
            ;;
        *)
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, $message"
            ;;
    esac
    
    # Use speak command (non-blocking)
    speak "$PERSONALIZED_MESSAGE" &
}
```

### 2. Claude Code Hook Integration

**Comprehensive Hook System Integration**:

Our Multi-Agent Observability System provides **7 specialized hooks** with sophisticated TTS integration:

#### **Hook-by-Hook TTS Integration Inventory**

**1. SessionStart Hook** (`session_start.py`):
- **Purpose**: Welcome messages and project context loading
- **TTS Integration**: `notify_tts_coordinated()` from coordinated speak system
- **Message Examples**:
  - "Welcome back to [project], Bryan! Found [N] recent changes"
  - "Session resumed with [context] available"
- **Features**: Personalized greetings, git status integration, project awareness

**2. PreToolUse Hook** (`pre_tool_use.py`):
- **Purpose**: Context-aware notifications before tool execution
- **TTS Integration**: Full coordinated system with observability filtering
- **Intelligence**: `should_speak_event_coordinated()` prevents spam
- **Message Examples**: "Running analysis..." or "Starting build..."
- **Features**: Tool-specific notifications, MCP tool parsing, smart filtering

**3. PostToolUse Hook** (`post_tool_use.py`):
- **Purpose**: Error detection and success notifications after tool execution
- **TTS Integration**: Coordinated system with error-specific priorities
- **Message Examples**: "Build completed successfully" or "Error detected in analysis"
- **Features**: Error pattern detection, success confirmations, context-aware filtering

**4. PreCompact Hook** (`pre_compact.py`):
- **Purpose**: Intelligent conversation summarization before context compaction
- **TTS Integration**: Agent-based analysis with structured TTS notifications
- **Agent Integration**: Uses codex-session-analyzer for structured analysis
- **Message Examples**: "Context analysis complete - [key findings]"
- **Features**: Zero-token local processing, three-tier fallback system

**5. SubagentStop Hook** (`subagent_stop.py`):
- **Purpose**: Announces subagent completion with detailed task summaries
- **TTS Integration**: Full coordinated system with task analysis
- **Message Examples**: "Code review agent completed - found 3 issues in 45 seconds"
- **Features**: Duration tracking, result summarization, performance metrics

**6. Stop Hook** (`stop.py`):
- **Purpose**: End-of-session announcements with comprehensive activity analysis
- **TTS Integration**: Session analysis with intelligent summarization
- **Message Examples**: "Session complete - 5 files modified, 3 tests run"
- **Features**: Activity analysis, session insights, performance tracking

**7. Notification Hook** (`notification.py`):
- **Purpose**: User interaction tracking with optional audio feedback
- **TTS Integration**: Permission and interaction notifications
- **Features**: Random positive affirmations, permission confirmations, observability

#### **Core TTS Architecture**

**Coordinated Speaking System** (`coordinated_speak.py`):
- **Queue Management**: Unix socket coordination prevents audio overlap
- **Priority Levels**: low, medium, high, critical, interrupt
- **Message Types**: info, warning, error, success, interrupt
- **Fallback Strategy**: Direct `speak` command when coordinator unavailable

**Observability Integration** (`observability.py`):
- **Smart Filtering**: `should_speak_event_coordinated()` prevents audio spam
- **Event Categories**: Analyzes different event types for appropriate TTS
- **Context Awareness**: Considers hook type, tool, and message content
- **Anti-Spam Controls**: Intelligent filtering to avoid overwhelming users

#### **Message Flow Architecture**

```
Hook Event → should_speak_event_coordinated() → notify_tts_coordinated() → Queue Coordinator → speak command
                    ↓                                        ↓                         ↓
            Observability Check              Priority/Type Assignment      Audio Overlap Prevention
```

**Hook Configuration** (`.claude/settings.json`):
```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup|resume|clear",
      "hooks": [{
        "type": "command",
        "command": "uv run /absolute/path/.claude/hooks/session_start.py"
      }]
    }],
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command", 
        "command": "uv run /absolute/path/.claude/hooks/pre_tool_use.py"
      }]
    }],
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "uv run /absolute/path/.claude/hooks/post_tool_use.py"
      }]
    }],
    "PreCompact": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "uv run /absolute/path/.claude/hooks/pre_compact.py"
      }]
    }],
    "SubagentStop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "uv run /absolute/path/.claude/hooks/subagent_stop.py"
      }]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "uv run /absolute/path/.claude/hooks/stop.py"
      }]
    }],
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "uv run /absolute/path/.claude/hooks/notification.py"
      }]
    }]
  }
}
```

**AI-Powered Voice Selection**:
- Automatic tool name parsing (`mcp__chroma__list_collections` → "Chroma List Collections")
- Context-aware voice assignment based on tool type and severity
- Rate limiting with category-based anti-spam (0-15 second intervals)
- Priority-based message formatting and delivery
- Cross-hook coordination for seamless audio experience

### 3. Anti-Spam & Rate Limiting

**Category-Based Rate Limiting**:
```yaml
ERROR/SECURITY: 0 seconds (immediate)
PERMISSION: 2 seconds between messages
FILE_OPERATION: 3 seconds between messages  
COMMAND_EXECUTION: 2 seconds between messages
COMPLETION: 10 seconds between messages
GENERAL: 15 seconds between messages
```

**Cross-Hook Coordination**:
- Session context maintains state across multiple hook events
- Pattern recognition prevents duplicate message spam
- Priority queue ensures critical messages are never blocked
- Intelligent event coordination during rapid operations

---

## ⚙️ Essential Configuration

### Environment Variables

**Core TTS Configuration**:
```bash
# Enable/disable TTS globally
export TTS_ENABLED=true

# Provider selection (auto recommended for cost optimization)
export TTS_PROVIDER=auto  # auto, openai, elevenlabs, pyttsx3

# Personalization
export ENGINEER_NAME="Your Name"

# Debug and development
export TTS_DEBUG=false
```

**Provider API Keys**:
```bash
# OpenAI (recommended primary)
export OPENAI_API_KEY="your-openai-key"
export OPENAI_TTS_VOICE=nova  # alloy, echo, fable, onyx, nova, shimmer
export OPENAI_TTS_MODEL=tts-1  # tts-1, tts-1-hd

# ElevenLabs (premium option)
export ELEVENLABS_API_KEY="your-elevenlabs-key"
export ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel (default)
```

**Voice Differentiation** (9 context-specific voices):
```bash
export NOTIFICATION_VOICE_PERMISSION=onyx
export NOTIFICATION_VOICE_HIGH_RISK=onyx
export NOTIFICATION_VOICE_MCP=alloy
export NOTIFICATION_VOICE_FILE=shimmer
export NOTIFICATION_VOICE_WEB=fable
export NOTIFICATION_VOICE_SUBAGENT=echo
export NOTIFICATION_VOICE_ERROR=fable
export NOTIFICATION_VOICE_MEMORY=alloy
export NOTIFICATION_VOICE_DEFAULT=nova
```

### Quick Setup for Cost Optimization

**95% Cost Reduction Setup**:
```bash
# Automated setup (recommended)
cd /home/bryan/bin/speak-app
./set_openai_default.py

# Manual setup in ~/.bash_aliases
export TTS_PROVIDER=openai
export OPENAI_API_KEY="your-openai-key"
export OPENAI_TTS_VOICE=onyx
```

### Development vs Production Settings

**Development Mode** (cost-free testing):
```bash
export TTS_PROVIDER=pyttsx3  # Forces offline provider
# or
speak-dev "Test message"     # Development command variant
```

**Production Mode** (optimal cost/quality):
```bash
export TTS_PROVIDER=auto     # OpenAI → ElevenLabs → pyttsx3 fallback
export TTS_ENABLED=true      # Enable globally
```

---

## 💡 Usage Examples

### 1. Basic TTS Notifications

```bash
# Simple notification
speak "Analysis complete"

# Non-blocking (recommended for scripts)
speak "Processing data" &

# Silent mode (for loops to prevent spam)
speak --off "Debug message"

# Provider-specific
speak --provider openai "OpenAI voice test"
speak --provider elevenlabs "Premium voice test"
speak --provider pyttsx3 "Offline voice test"
```

### 2. AI-Powered Smart Processing

```bash
# Smart processing with Codex CLI integration
speak --smart "Complex technical output here..."

# Context-aware smart processing
speak --smart --smart-context error "Exception occurred during deployment"

# Pipe integration with smart processing
echo "verbose log output..." | speak --smart --off
```

### 3. Batch Processing Workflows

```bash
# Generate common developer notifications
speak-batch --common

# Process custom file with specific voice
speak-batch messages.txt --voice onyx

# Cost analysis and recommendations
speak-costs

# Usage tracking and reporting
python3 /home/bryan/bin/speak-app/tts/usage_tracker.py --report
```

### 4. Hook System Integration

```bash
# Standard hook usage with priority
notify_tts "Operation complete" "normal"
notify_tts "Critical error detected" "error"
notify_tts "Sub-agent analysis finished" "subagent_complete"

# Memory operation notifications
notify_tts "2048 bytes saved to Redis" "memory_confirmed"
notify_tts "Failed to save to Qdrant" "memory_failed"

# Important system notifications
notify_tts "Manual intervention required" "important"
```

### 5. Testing and Validation

```bash
# Test TTS system
speak --test

# Test specific voices
speak --list-voices
speak --test-voice Rachel
speak --voice 21m00Tcm4TlvDq8ikWAM "Custom voice test"

# Check system status
speak --status
speak --list

# Smart processing status
speak --smart-status
```

---

## 📊 Performance & Cost Optimization

### Cost Comparison Matrix

| Provider | Cost per 1K chars | Monthly (300K chars) | Quality | Latency | Use Case |
|----------|-------------------|---------------------|---------|---------|----------|
| **OpenAI** | $0.015 | $4.50 | ⭐⭐⭐⭐ | ~300ms | **Primary (recommended)** |
| **ElevenLabs** | $0.330 | $99.00 | ⭐⭐⭐⭐⭐ | ~500ms | Premium only |
| **pyttsx3** | $0.000 | $0.00 | ⭐⭐⭐ | Instant | Development/offline |

**Cost Savings Example**:
- **Before**: ElevenLabs only → $99/month
- **After**: OpenAI primary → $4.50/month (95% reduction)

### Performance Metrics

**Queue Coordination System**:
- **Operations**: O(log n) heap-based priority queue
- **Throughput**: 2.3M+ operations/second
- **Concurrency**: 16+ threads validated
- **Memory**: Zero leaks in stress testing
- **Latency**: <1ms queue operations

**Caching System**:
- **Strategy**: LFU (Least Frequently Used)
- **Capacity**: 5000+ entries
- **Hit Rate**: 100% achieved in testing
- **Optimization**: Automatic invalidation and pattern matching

**Anti-Spam Performance**:
- **Rate Limiting**: Category-based (0-15 second intervals)
- **Coordination**: Cross-hook event coordination
- **Pattern Recognition**: Duplicate message prevention
- **Priority Queue**: Critical messages never blocked

### Best Practices for Dependent Applications

**Cost Optimization**:
1. Use OpenAI as primary provider (95% cost reduction)
2. Implement intelligent caching for repeated messages
3. Use batch processing for bulk operations
4. Enable development mode for testing to avoid API costs

**Performance Optimization**:
1. Use non-blocking execution (`&`) in scripts
2. Implement rate limiting to prevent audio spam
3. Use priority-based message queuing
4. Leverage the queue coordination system for overlapping operations

**Integration Patterns**:
1. Always use the standard `notify_tts()` function
2. Implement proper error handling with fallbacks
3. Use context-aware voice selection
4. Follow the priority-based message formatting

---

## 📚 Reference Documentation

### Comprehensive Integration Guides

**Primary Integration Resources**:
- **[LLM Integration Guide](https://github.com/triepod-ai/speak-app/blob/main/docs/LLM_INTEGRATION_GUIDE.md)** - Complete guide for AI assistant integration with Codex CLI ⭐
- **[Claude Code Integration Guide](https://github.com/triepod-ai/speak-app/blob/main/docs/CLAUDE_CODE_INTEGRATION.md)** - Hook system and voice notifications
- **[notify_tts() Function Guide](https://github.com/triepod-ai/speak-app/blob/main/docs/NOTIFY_TTS_INTEGRATION.md)** - Standard TTS function for dependent applications

### Core System Documentation

**Architecture & Features**:
- **[Main README](https://github.com/triepod-ai/speak-app/blob/main/README.md)** - Overview, installation, and quick start
- **[Features Overview](https://github.com/triepod-ai/speak-app/blob/main/FEATURES_OVERVIEW.md)** - Comprehensive feature analysis
- **[Command Reference](https://github.com/triepod-ai/speak-app/blob/main/COMMAND_REFERENCE.md)** - Complete CLI reference

### Provider & Configuration

**Setup & Optimization**:
- **[Configuration Guide](https://github.com/triepod-ai/speak-app/blob/main/docs/CONFIGURATION.md)** - Complete configuration options and environment variables
- **[Provider Configuration](https://github.com/triepod-ai/speak-app/blob/main/docs/PROVIDERS.md)** - Setting up TTS providers
- **[Cost Optimization Guide](https://github.com/triepod-ai/speak-app/blob/main/TTS_COST_OPTIMIZATION.md)** - Strategies and analysis
- **[OpenAI Setup Guide](https://github.com/triepod-ai/speak-app/blob/main/SETUP_OPENAI.md)** - Quick OpenAI setup for cost optimization

### Advanced Features

**Enterprise & Technical**:
- **[TTS Coordination System](https://github.com/triepod-ai/speak-app/blob/main/docs/advanced/TTS_COORDINATION_SYSTEM_TECHNICAL_REFERENCE.md)** - Multi-phase coordination system ⭐
- **[Queue System Documentation](https://github.com/triepod-ai/speak-app/blob/main/docs/TTS_QUEUE_COORDINATION.md)** - Queue coordination preventing audio overlap
- **[Phase 3.4.2 Performance Optimization](https://github.com/triepod-ai/speak-app/blob/main/docs/phases/PHASE_3_4_2_HEAP_OPTIMIZATION_DOCUMENTATION.md)** - Heap optimization achieving 2.3M+ ops/sec
- **[Anti-Spam Functionality](https://github.com/triepod-ai/speak-app/blob/main/docs/ANTI_SPAM_FUNCTIONALITY.md)** - Time-based duplicate prevention system

### Testing & Validation

**Quality Assurance**:
- **[Voice Testing Guide](https://github.com/triepod-ai/speak-app/blob/main/docs/VOICE_TESTING_GUIDE.md)** - Voice quality testing procedures
- **[Audio Test Guide](https://github.com/triepod-ai/speak-app/blob/main/AUDIO_TEST_GUIDE.md)** - Manual audio testing and validation
- **[Testing Framework](https://github.com/triepod-ai/speak-app/blob/main/TESTING.md)** - Comprehensive testing structure

### Summary & AI Integration

**AI-Powered Features**:
- **[Summary System Overview](https://github.com/triepod-ai/speak-app/blob/main/docs/SUMMARY_SYSTEM_OVERVIEW.md)** - AI-powered summary system ⭐
- **[AI Summary Processing](https://github.com/triepod-ai/speak-app/blob/main/docs/AI_SUMMARY_PROCESSING.md)** - Technical deep dive into AI processing
- **[Hook Summary Integration](https://github.com/triepod-ai/speak-app/blob/main/docs/HOOK_SUMMARY_INTEGRATION.md)** - Claude Code hooks with AI summary system
- **[Voice Selection System](https://github.com/triepod-ai/speak-app/blob/main/docs/VOICE_SELECTION_SYSTEM_REFERENCE.md)** - Complete voice selection documentation

---

## 🚀 Getting Started Checklist

### For Dependent Application Developers

**1. Environment Setup**:
- [ ] Verify speak command availability: `which speak`
- [ ] Check system status: `speak --status`
- [ ] Configure environment variables in `~/.bash_aliases`
- [ ] Set up cost-optimized provider (OpenAI recommended)

**2. Integration Implementation**:
- [ ] Implement standard `notify_tts()` function
- [ ] Configure Claude Code hooks (if applicable)
- [ ] Set up voice differentiation for your application context
- [ ] Implement rate limiting and anti-spam measures

**3. Testing & Validation**:
- [ ] Test basic TTS functionality: `speak --test`
- [ ] Validate provider fallback chain
- [ ] Test voice differentiation with different contexts
- [ ] Verify cost optimization settings

**4. Production Deployment**:
- [ ] Configure production environment variables
- [ ] Enable queue coordination system
- [ ] Set up monitoring and usage tracking
- [ ] Implement error handling and fallback patterns

### Quick Start Commands

```bash
# 1. Verify installation
speak --status

# 2. Test basic functionality
speak "Hello from the speak system"

# 3. Configure for cost optimization
export TTS_PROVIDER=openai
export OPENAI_API_KEY="your-key"

# 4. Test AI-powered features
speak --smart "Technical output to summarize"

# 5. Implement in your application
notify_tts "Your application is ready" "important"
```

---

*This overview provides the foundational understanding needed to integrate with the Speak System. For detailed implementation guidance, refer to the comprehensive documentation links provided above.*