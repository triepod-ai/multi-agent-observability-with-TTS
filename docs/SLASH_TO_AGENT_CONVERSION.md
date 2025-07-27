# Slash Command to Subagent Conversion Guide

## Overview

This guide helps determine when to convert slash commands to subagents and provides a systematic approach for conversion.

## Decision Matrix: Slash Command vs Subagent

### Use Subagents When:
✅ **Structured Return Values Needed**
- Command needs to return IDs, status, or data
- Results need to be processed by other operations
- Example: `memory-simple-store` returning storage ID

✅ **Single, Focused Operation**
- Clear input → process → output flow
- No user interaction required during execution
- Example: `readme-update-intelligent`

✅ **Repetitive Pattern**
- Same operation used across multiple projects
- Would benefit from standardization
- Example: `get-up-to-speed`

✅ **High Token Usage**
- Current command uses >10k tokens
- Complex embedded logic that could be simplified
- Example: Complex analysis commands

### Keep as Slash Commands When:
❌ **Interactive Workflows**
- Requires user decisions during execution
- Multi-step with user confirmation
- Example: deployment commands

❌ **Project-Specific Logic**
- Highly customized to one project
- Contains unique business logic
- Example: custom workflow commands

❌ **Simple Bash Scripts**
- Direct system operations
- No complex logic needed
- Example: `dev-setup`

## Conversion Process

### Step 1: Analyze Existing Command
```bash
# Questions to answer:
1. What is the single core purpose?
2. What inputs does it need?
3. What should it return?
4. What tools does it use?
```

### Step 2: Extract Core Logic
From complex slash command → Simple agent purpose:
```
Before: 300 lines of behavioral guidance
After: "Updates README from project files. Returns changed sections."
```

### Step 3: Generate Agent Command
Use the formula:
```
/agent create <name> "<verb> <object> <condition>. <return-value>."
```

### Step 4: Simplify Implementation
- Remove Redis caching complexity
- Remove error handling boilerplate
- Focus on core operation
- Let agent handle implementation

## Conversion Patterns

### Pattern 1: Data Operations
**Slash Command Characteristics**:
- Stores/retrieves data
- Complex routing logic
- Verification steps
- Returns confirmation

**Agent Conversion**:
```bash
# Original: memory-simple-store (200+ lines)
/agent create memory-store "Stores data in appropriate memory system with validation. Returns storage ID and status."
```

**Simplified Agent Focus**:
- Input: data, optional collection
- Process: validate, route, store
- Output: {id, status, location}

### Pattern 2: File Updates
**Slash Command Characteristics**:
- Reads multiple files
- Transforms content
- Updates target file
- Complex formatting

**Agent Conversion**:
```bash
# Original: readme-update-intelligent (300+ lines)
/agent create readme-updater "Updates README from project status files professionally. Returns updated sections list."
```

**Simplified Agent Focus**:
- Input: project directory
- Process: read sources, generate content
- Output: {sections_updated, changes_made}

### Pattern 3: Analysis Tasks
**Slash Command Characteristics**:
- Gathers information
- Analyzes patterns
- Generates reports
- Multiple data sources

**Agent Conversion**:
```bash
# Original: analyze-project-technology-stack
/agent create tech-stack-analyzer "Analyzes project dependencies and technology stack. Returns structured tech inventory."
```

**Simplified Agent Focus**:
- Input: project path
- Process: scan files, extract tech
- Output: {languages, frameworks, tools}

### Pattern 4: Status/Health Checks
**Slash Command Characteristics**:
- Checks system status
- Validates connections
- Reports health
- Quick operations

**Agent Conversion**:
```bash
# Original: memory-health-check
/agent create memory-health-checker "Checks all memory systems availability. Returns health status for each system."
```

**Simplified Agent Focus**:
- Input: none
- Process: ping each system
- Output: {system: status} map

## Implementation Examples

### Example 1: Complete Conversion

**Original Slash Command**: `memory-simple-store.md`
- 200+ lines of code
- Complex routing logic
- Embedded JavaScript
- Token usage: ~15k

**Step 1: Identify Core Purpose**
"Store information in the right memory system"

**Step 2: Create Agent**
```bash
/agent create memory-store "Stores information in appropriate memory system based on content type. Returns storage confirmation with ID."
```

**Step 3: Agent Implementation** (generated):
```yaml
---
name: memory-store
description: Stores information in appropriate memory system based on content type. Returns storage confirmation with ID.
tools: mcp__chroma__chroma_add_documents, mcp__qdrant__qdrant_store, mcp__redis__store_memory
---

# Memory Store Agent

You store information in the most appropriate memory system and return confirmation.

## Task
Analyze the input and store it in the right system (Chroma for process/interaction, Qdrant for knowledge/career, Redis for temporary).

## Instructions
1. Analyze content type (code/process → Chroma, knowledge/docs → Qdrant, temporary → Redis)
2. Store in appropriate system with metadata
3. Verify storage succeeded
4. Return: {id: string, system: string, status: "success"|"failed"}

## Success
Return structured result with storage ID and system used.
```

### Example 2: Batch Conversion Script

For multiple similar commands:
```bash
# Convert all memory-related commands
for cmd in memory-*.md; do
    name=$(basename "$cmd" .md | sed 's/memory-//')
    echo "/agent create memory-$name \"Handles $name operation for memory systems. Returns operation result.\""
done
```

## Testing Converted Agents

### 1. Create Test File
```bash
# Test the agent
/spawn @.claude/agents/memory-store.md "Test data for storage"
```

### 2. Verify Returns
- Check agent returns structured data
- Validate operations completed
- Compare with original command

### 3. Integration Testing
- Use agent in workflows
- Chain with other operations
- Verify return values usable

## Migration Checklist

- [ ] Identify candidate commands (use decision matrix)
- [ ] Extract core purpose (one sentence)
- [ ] Create agent with `/agent create`
- [ ] Test agent functionality
- [ ] Update workflows to use agent
- [ ] Archive original slash command
- [ ] Document in CLAUDE.md

## Common Pitfalls to Avoid

1. **Over-converting**: Not everything needs to be an agent
2. **Complex Agents**: Keep them simple and focused
3. **Lost Context**: Preserve essential logic, not implementation
4. **Breaking Changes**: Test thoroughly before replacing

## ROI Metrics

Track conversion success:
- Token usage: before/after
- Execution time: before/after
- Reusability: how many projects use it
- Maintenance: updates needed over time

## Quick Reference

**Good Agent Candidates**:
- Data operations
- File updates  
- Analysis tasks
- Health checks
- Report generation

**Poor Agent Candidates**:
- Interactive workflows
- Project-specific logic
- Simple bash operations
- User-facing commands