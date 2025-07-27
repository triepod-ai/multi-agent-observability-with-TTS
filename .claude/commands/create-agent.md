# Create Agent Command

A KISS-compliant agent generator that helps create focused subagents.

## Usage
```
/create-agent <agent-name> <single-purpose>
```

## Process

1. **Gather Requirements**
   Ask yourself:
   - What ONE thing should this agent do?
   - What tools does it absolutely need?
   - When should it be used automatically?

2. **Generate with Claude**
   Use the `/agent` command:
   ```
   /agent create <name> "<focused-description>"
   ```

3. **Example Templates**

   ### For Task Automation
   ```
   /agent create doc-updater "Updates CLAUDE.md when new documentation files are created. Finds new .md files and adds references."
   ```

   ### For Data Processing
   ```
   /agent create data-validator "Validates business data format and required fields. Checks name, address, city, phone."
   ```

   ### For File Operations
   ```
   /agent create file-organizer "Organizes test files into proper directories. Moves .test.ts files to tests/ folder."
   ```

## KISS Agent Formula

```
/agent create <name> "<verb> <object> when <trigger>. <specific-action>."
```

- **verb**: Updates, Validates, Organizes, Checks, Formats
- **object**: CLAUDE.md, business data, test files, configuration
- **trigger**: new files created, data imported, tests added
- **specific-action**: One sentence about what it does

## Quick Examples

```bash
# Documentation agent
/agent create doc-ref-updater "Updates CLAUDE.md when docs are added. Adds markdown file references with dates."

# Timeline agent  
/agent create timeline-logger "Logs session summaries to PROJECT_STATUS.md. Appends timestamped entries."

# Test runner
/agent create test-runner "Runs tests when code changes. Executes npm test and reports results."

# Format checker
/agent create format-checker "Checks code formatting on file save. Runs prettier and reports issues."
```

## After Creation

1. Check the generated file in `.claude/agents/`
2. Simplify if needed (usually it's over-engineered)
3. Test with `/spawn @.claude/agents/agent-name.md`
4. Refine until it does ONE thing well

## Remember: KISS

- One agent = One job
- 3-7 instruction steps max
- Minimal tools (usually 2-3)
- Clear trigger conditions
- Under 50 lines total