# Subagent Creation Workflow Example

## The Recommended Way: Using `/agent` Command

### Step 1: Define Your Need
"I need to update CLAUDE.md whenever new documentation is created"

### Step 2: Create the Agent
```
/agent create doc-updater "Updates CLAUDE.md with new documentation references when .md files are created. Finds new docs and adds them to Recent Documentation Updates section."
```

### Step 3: What Claude Creates
Claude will generate something like:
```yaml
---
name: doc-updater  
description: Updates CLAUDE.md with new documentation references when .md files are created. Finds new docs and adds them to Recent Documentation Updates section.
tools: Read, Edit, Glob
---

# Documentation Updater

You are a documentation reference specialist. Your responsibility is to keep CLAUDE.md updated with new documentation.

## Instructions
[Claude generates appropriate instructions]
```

### Step 4: Review and Simplify
- Check `.claude/agents/doc-updater.md`
- Remove any over-engineering
- Ensure single focus

### Step 5: Test
```
/spawn @.claude/agents/doc-updater.md
```

## Common Patterns

### Pattern 1: File Updater
```
/agent create [name]-updater "Updates [file] when [event]. [Action]."
```

### Pattern 2: Data Validator  
```
/agent create [name]-validator "Validates [data] format and fields. Checks [requirements]."
```

### Pattern 3: Task Automator
```
/agent create [name]-runner "Runs [task] when [trigger]. Executes [command]."
```

## Why This Works Better

1. **Claude Knows the Format**: Generates proper YAML header
2. **Focused by Design**: The description forces single purpose
3. **Tools Auto-Selected**: Claude picks appropriate minimal tools
4. **Tested Patterns**: Claude uses proven agent patterns

## Converting Your Existing "Agents"

Your current files in `~/.claude/commands/` can be converted:

### Before (Overengineered)
`subagent-docs-reference-manager.md` - 116 lines

### After (KISS)
```
/agent create doc-ref-manager "Updates CLAUDE.md when new docs are added. Finds .md files and adds references with dates."
```

### Before (Wrong Location)
`~/.claude/commands/subagent-timeline-updater.md`

### After (Proper)
```
/agent create timeline-updater "Adds session summaries to PROJECT_STATUS.md. Appends timestamped entries."
```

## Key Takeaway

Let Claude handle the boilerplate. You just provide:
- Clear name
- Single purpose  
- Trigger condition
- Specific action

The `/agent create` command does the rest!