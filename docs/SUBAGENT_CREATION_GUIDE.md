# Simple Subagent Creation Guide

## Quick Start Template

```yaml
---
name: your-agent-name
description: What it does and when to use it. Be specific for automatic delegation.
tools: Read, Write  # Only what's needed
---

# Agent Name

You are a [specific role]. Your responsibility is to [single clear purpose].

## Task
[Describe the specific task in 2-3 sentences]

## Instructions
1. [First step]
2. [Second step]
3. [Report results]

## Success Criteria
- [What constitutes success]
- [Expected output format]
```

## KISS Design Process

### 1. Define Single Purpose
Ask: "What ONE thing should this agent do?"
- ❌ "Manage all documentation" (too broad)
- ✅ "Add new doc references to CLAUDE.md" (focused)

### 2. Minimize Tool Access
Only grant tools absolutely necessary:
- Reading files? → Read
- Creating files? → Write
- Modifying files? → Edit
- That's it!

### 3. Write Clear Description
For automatic delegation to work:
- Be specific about the trigger conditions
- Include keywords that indicate when to use
- Keep it under 2 sentences

### 4. Simple Instructions
- Use numbered steps (3-7 max)
- Focus on WHAT, not HOW
- Let the agent figure out implementation

## Examples

### Good: Focused Documentation Updater
```yaml
---
name: claude-md-updater
description: Updates CLAUDE.md with new documentation file references. Use when new docs are created.
tools: Read, Edit, Glob
---

# CLAUDE.md Documentation Updater

You update CLAUDE.md to include references to new documentation files.

## Task
Find new .md files and add them to the documentation section in CLAUDE.md.

## Instructions
1. Find all .md files in the project (except CLAUDE.md itself)
2. Check which ones aren't already referenced in CLAUDE.md
3. Add new references under "### Recent Documentation Updates"
4. Use format: `- [filename](./path) - Brief description (Added: YYYY-MM-DD)`

## Success
Report how many new references were added.
```

### Bad: Overengineered Multi-Purpose Agent
```yaml
---
name: documentation-manager
description: Manages all documentation tasks including creation, updates, formatting, validation...
tools: Read, Write, Edit, MultiEdit, Glob, Bash, ...
---

[100+ lines of complex instructions covering every edge case]
```

## When NOT to Use Subagents

1. **Simple one-time tasks**
   - Just do it in the main conversation

2. **Tasks needing human interaction**
   - Subagents can't ask questions

3. **Exploratory or undefined tasks**
   - Need clear boundaries first

4. **Tasks you're doing once**
   - Overhead isn't worth it

## Creation Checklist

- [ ] Single, clear purpose defined
- [ ] Under 50 lines total
- [ ] Minimal tool access
- [ ] Clear trigger conditions in description
- [ ] Simple numbered instructions
- [ ] Defined success criteria
- [ ] Located in `.claude/agents/` directory
- [ ] Proper YAML header format

## Testing Your Subagent

1. Create in `.claude/agents/agent-name.md`
2. Test with: `/spawn @.claude/agents/agent-name.md`
3. Verify it completes the task without assistance
4. Refine if needed (usually means simplifying!)