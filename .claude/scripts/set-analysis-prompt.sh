#!/bin/bash
# Set Analysis Prompt Script - Multi-Agent Observability System

ANALYSIS_PROMPT="Provide detailed technical analysis of this session:

## Session Context
$SESSION_SUMMARY

## Required Analysis Sections
1. **Technical Achievements**: Concrete accomplishments, milestones reached, features completed
2. **Code Changes**: File modifications, new implementations, architectural updates  
3. **Problem Solving**: Debugging insights, issues resolved, solutions implemented
4. **Research & Learning**: New knowledge gained, patterns discovered, approaches explored
5. **Failed Approaches**: What didn't work and why (critical for future reference)
6. **Current Blockers**: Active obstacles preventing progress
7. **Next Steps**: Immediate actionable tasks with priority and context
8. **Research Gaps**: Missing information needed for implementation
9. **Context for Handoff**: Key details for someone continuing this work

Format as structured sections with clear headers and bullet points."

export ANALYSIS_PROMPT