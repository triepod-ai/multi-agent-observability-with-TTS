# Agent Creation Workflow Guide

Step-by-step guide for creating effective Claude Code subagents based on proven patterns.

## Quick Start

### 1. Planning Phase
Define your agent's purpose:
- **Domain**: What specific area will it handle?
- **Expertise**: What specialized knowledge does it need?
- **Tools**: Which Claude Code tools are required?
- **Triggers**: What phrases should activate it?
- **Workflow**: Step-by-step process it should follow

### 2. Creation Methods

#### Option A: Interactive Creation (Recommended)
```bash
/agents
# Select "Create New Agent"
# Choose project vs user scope
# Describe your needs - let Claude generate initial version
# Customize the generated prompt
# Set tool permissions
# Save and test
```

#### Option B: Manual Creation
```bash
# Project agent (team shared)
mkdir -p .claude/agents
nano .claude/agents/your-agent-name.md

# User agent (personal use)
mkdir -p ~/.claude/agents
nano ~/.claude/agents/your-agent-name.md
```

## File Templates

### Ultra-Minimal Template (Recommended - <400 chars)
```markdown
---
name: agent-name
description: Brief role. Triggers: "key", "words", "phrases"
tools: essential, tools, only
---

# Role

Action → result. Execute immediately.
```

### Optimization Examples (Proven Results)

#### Before: Verbose Agent (1350 bytes)
```markdown
---
name: screenshot-analyzer
description: Analyzes screenshots/images from links to extract structured data and convert visual content for WSL. Always convert link to WSL. Use for: extracting business info from screenshots, analyzing forms/UI, converting visual data to structured formats, processing image-based instructions. Triggers on: screenshot links, image analysis requests, visual data extraction needs, UI/form analysis tasks.
tools: Glob, Grep, LS, Read
color: blue
---

# Screenshot Analysis Agent - Direct Action Mode

You analyze screenshots by following this exact workflow:

## Workflow (ALWAYS in this order):
1. **Convert Path**: Immediately convert any provided path to WSL format
   - Windows path → WSL: `/mnt/c/...` format
   - URL → Download to `/tmp/` with wget/curl in WSL
   
2. **Read Screenshot**: Use appropriate tool to access the image
   - Verify file exists with `ls -la [path]`
   - Read image data

3. **Extract Data**: Based on user request, extract:
   - Text content (OCR)
   - UI elements and layout
   - Business information
   - Form fields and values
   - Any specific data mentioned

4. **Return Structured Output**: Format findings as JSON...
```

#### After: Optimized Agent (227 bytes, 83% reduction)
```markdown
---
name: screenshot-analyzer
description: Analyzes screenshots/images, converts paths to WSL. Triggers: "screenshot", "image analysis", "visual data"
tools: Glob, Grep, LS, Read
---

# Screenshot Analyzer

Convert path → read image → extract data → return JSON.

Execute immediately.
```

### Portfolio Optimization Results
- **12 agents optimized**: 80-90% token reduction achieved
- **Methodology**: Ultra-minimal prompts with workflow arrows (→)
- **Total savings**: ~30% reduction across entire agent portfolio
- **Functionality preserved**: All core capabilities maintained

Core function. Workflow: step → step → step.

Execute immediately.
```

### Standard Template (Use only if complexity requires it)
```markdown
---
name: agent-name
description: When this agent should be invoked. Include trigger keywords. (Max 400 chars)
tools: tool1, tool2, tool3  # Optional - omit to inherit all tools
---

# Agent Role

Brief expertise description.

Workflow:
1. [Step 1]
2. [Step 2] 
3. [Step 3]

Execute immediately.
```

## Configuration Fields

| Field | Required | Description | Limits |
|-------|----------|-------------|---------|
| `name` | Yes | Unique identifier (lowercase, hyphens) | - |
| `description` | Yes | When/how the agent should be used (affects auto-activation) | **400 chars max** |
| `tools` | No | Comma-separated tool list. Omit to inherit all tools | - |
| `color` | No | UI theming (blue, green, red, etc.) | - |

## Token Efficiency Guidelines

### Critical Limits
- **Description field**: 400 characters maximum
- **Total file**: Target <500 characters for efficiency
- **Token cost per use**: Aim for <100 tokens (vs 800+ for verbose agents)

### Efficiency Rules
1. **Ultra-minimal prompts**: Essential instructions only
2. **No examples**: User provides context
3. **Workflow arrows**: Use `→` instead of numbered lists
4. **Brief headers**: Single words when possible
5. **Essential tools only**: Remove unused tools

## Tool Selection Guidelines

### Available Tools
- **Core**: Read, Write, Edit, MultiEdit, Bash, Glob, Grep, LS
- **AI**: Task, TodoWrite, WebFetch, WebSearch
- **MCP**: All configured MCP server tools

### Tool Strategy
- **Omit `tools` field**: Inherits ALL tools (recommended for general agents)
- **Specify tools**: Granular control for security/performance
- **MCP tools**: Use full format like `mcp__qdrant__qdrant_store`

## Usage Patterns

### 1. @-Mention Invocation (Primary)
```bash
@agent-name perform specific task with context
```

### 2. Auto-Activation
Based on description keywords:
```bash
# These trigger agents automatically based on descriptions
"analyze this code quality"     # → code-reviewer
"debug this error"             # → debugger  
"extract data from screenshot" # → screenshot-analyzer
```

### 3. Explicit Invocation
```bash
Use the agent-name subagent to handle this task
```

## Best Practices

### Design Philosophy
1. **Single Responsibility**: One clear purpose per agent
2. **Token Efficiency**: <100 tokens per invocation
3. **Essential Only**: Minimal viable functionality
4. **Clear Triggers**: Specific keywords for auto-activation

### Ultra-Minimal Prompt Engineering
1. **Essential Instructions**: 2-3 sentences maximum
2. **Workflow Arrows**: Use `→` for compact step descriptions
3. **No Examples**: User provides context in invocation
4. **Brief Headers**: Single words when possible
5. **Core Tools Only**: Remove unused tools for faster loading

### Testing Your Agent
```bash
# Test recognition
/agents                    # Verify agent appears in list
@agent-name               # Test @-mention completion

# Test functionality
@agent-name test with simple task first
# Then gradually test more complex scenarios
```

## Example: Storage Manager Agent

### Initial Planning
- **Domain**: Semantic storage operations
- **Expertise**: Qdrant database management, embedding optimization
- **Tools**: Qdrant MCP tools, Read, Bash
- **Triggers**: "save to qdrant", "store in qdrant", "index content"
- **Workflow**: Analyze input → Select method → Store → Verify

### Final Implementation (Token-Optimized)
```markdown
---
name: qdrant-manager
description: Store content in Qdrant. Triggers: "save to qdrant", "store", "index"
tools: mcp__qdrant__qdrant_store, mcp__qdrant__qdrant_bulk_store
---

# Qdrant Storage

Store content semantically. Analyze input → select collection → store → confirm.

Execute immediately.
```

**Efficiency Achieved**:
- **Before**: 443 words (800+ tokens per use)
- **After**: 65 words (50 tokens per use)
- **Savings**: 85% token reduction

## Common Agent Types

### Analysis Specialists
- **code-reviewer**: Quality and security analysis
- **debugger**: Root cause investigation
- **performance-analyzer**: Bottleneck identification

### Content Processors
- **screenshot-analyzer**: Visual data extraction
- **lesson-generator**: Educational content creation
- **document-processor**: Text analysis and formatting

### System Managers
- **qdrant-manager**: Semantic storage operations
- **redis-manager**: Cache and session management
- **deployment-manager**: CI/CD coordination

### Development Assistants
- **test-generator**: Automated test creation
- **refactor-assistant**: Code improvement
- **api-designer**: Interface specification

## Troubleshooting

### Agent Not Recognized
- Check file location (`.claude/agents/` or `~/.claude/agents/`)
- Verify YAML frontmatter syntax
- Ensure `name` field matches filename
- Use `/agents` to verify registration

### Auto-Activation Issues
- Make `description` field more specific
- Add "use proactively" to description
- Include relevant trigger keywords
- Test with @-mention first

### Tool Permission Errors
- Omit `tools` field to inherit all tools
- Explicitly list needed tools
- Use full MCP tool format
- Test with minimal tool set first

## Version Control

### Project Agents (Team Shared)
```bash
git add .claude/agents/
git commit -m "Add team productivity agents"
```

### User Agents (Personal)
```bash
# Keep personal agents out of version control
echo "~/.claude/agents/" >> ~/.gitignore
```

## Advanced Patterns

### Agent Chaining
```bash
# Sequential processing
@analyzer → findings → @code-reviewer → improvements

# Parallel coordination with Task tool
Task tool coordinates @screenshot-analyzer + @document-processor
```

### Dynamic Creation
```bash
# Create temporary specialist agents
generate_agent_for_current_project() {
    cat > .claude/agents/temp-specialist.md << 'EOF'
---
name: temp-specialist
description: Temporary specialist for current project phase
---
[Generated system prompt based on project needs]
EOF
}
```

### Performance Optimization
- **Focused Purpose**: Single-purpose agents perform better
- **Minimal Tools**: Grant only necessary tools
- **Clear Triggers**: Specific descriptions improve accuracy
- **Context Efficiency**: Preserve main context for longer sessions

## Related Documentation

- **SUBAGENTS.md**: Complete subagent system reference
- **ORCHESTRATOR.md**: Integration with Task tool and wave system
- **PERSONAS.md**: How subagents complement personas
- **MCP.md**: MCP server integration patterns
- **FLAGS.md**: Flag system integration

## Success Metrics

Track your agent effectiveness:
- **Recognition Rate**: How often it auto-activates correctly
- **Task Completion**: Success rate for assigned tasks
- **User Satisfaction**: Feedback on agent usefulness
- **Performance**: Speed and resource efficiency
- **Integration**: How well it works with other systems

Start simple, test thoroughly, and iterate based on real usage patterns.