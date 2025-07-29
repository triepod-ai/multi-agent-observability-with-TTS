# Efficient Agent Template (Token-Optimized)

## Problem
Verbose agent prompts cost 600-1000+ tokens per invocation. For simple tasks, this is wasteful.

## Solution: Minimal Effective Prompts

### Template (50-150 words max)
```markdown
---
name: agent-name
description: Brief trigger description with key words
tools: specific, tools, only  # Only what's needed
---

# Agent Role

Key expertise: [1-2 sentences]

Workflow:
1. Action
2. Action  
3. Output

Execute immediately.
```

### Examples

#### Before (443 words)
```markdown
# Qdrant Manager - Intelligent Semantic Storage

You are a specialized agent for efficient Qdrant storage operations with intelligent method selection.

## Core Principles
1. **Efficiency First**: Use fastest available method (MCP → CLI fallback)
...
[40+ more lines of detailed instructions]
```

#### After (47 words)
```markdown
---
name: qdrant-manager
description: Store content in Qdrant collections. Triggers: "save to qdrant", "store", "index"
tools: mcp__qdrant__qdrant_store, mcp__qdrant__qdrant_bulk_store
---

# Qdrant Storage Specialist

Store content semantically. Use MCP tools, fallback to CLI if needed.

Workflow: Analyze input → Select collection → Store → Confirm

Execute immediately.
```

## Token Savings

| Agent Type | Before | After | Savings |
|------------|--------|-------|---------|
| Verbose | 800 tokens | 75 tokens | 90% |
| Medium | 400 tokens | 100 tokens | 75% |
| Efficient | 200 tokens | 50 tokens | 75% |

## Guidelines

### Character Limits
- **Description field**: 400 characters maximum
- **Total file**: Target <500 characters for efficiency
- **System prompt**: Ultra-minimal, essential only

### Keep
- Essential role definition
- Key workflow steps (3-4 max)
- Critical constraints only

### Remove
- Detailed explanations
- Multiple examples
- Extensive formatting
- Redundant principles
- Verbose headers

### Ultra-Minimal Template
```markdown
---
name: agent-name
description: Brief role. Triggers: "key", "words"
tools: essential, tools, only
---

# Role

Core function. Workflow: step → step → step.

Execute immediately.
```

## Refactoring Existing Agents

1. **Identify Core Function**: What's the minimal viable role?
2. **Strip Examples**: Remove usage examples (user provides context)
3. **Condense Workflow**: 3-5 steps maximum
4. **Essential Tools Only**: Remove unused tools
5. **Test**: Verify functionality with minimal prompt

## When to Use Verbose vs Minimal

### Use Minimal (50-150 words) For:
- Simple, repetitive tasks
- Well-defined domains
- Frequent invocations
- Token-sensitive operations

### Use Verbose (200+ words) For:
- Complex decision-making
- Multi-step analysis
- Critical quality requirements
- Infrequent but important tasks

## Cost-Benefit Analysis

**Minimal Agent Cost per Use**: ~75 tokens
**Verbose Agent Cost per Use**: ~800 tokens

**Break-even**: If agent used >10x per session, minimal saves significant tokens
**Recommendation**: Start minimal, expand only if quality suffers