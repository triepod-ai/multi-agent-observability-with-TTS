#!/bin/bash
# Test Events Script - Multi-Agent Observability System
# Send multiple events with different types and sessions

# Send test event 1 - UI redesign request
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "multi-agent-observability-system",
  "session_id": "obs-session-1_22222_1732482700",
  "hook_event_type": "UserPromptSubmit",
  "payload": {
    "prompt": "Help me design a better UI for the observability system with improved visual hierarchy and intuitive navigation"
  },
  "summary": "User requested UI redesign"
}'

sleep 0.5

# Send test event 2 - Read operation
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "claude-code",
  "session_id": "test-session-1_12345_1732482600",
  "hook_event_type": "PostToolUse",
  "payload": {
    "tool_name": "Read",
    "tool_output": "Successfully read 150 lines from README.md"
  },
  "summary": "Read operation completed"
}'

sleep 0.5

# Send test event 3 - Creating component
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "multi-agent-observability-system",
  "session_id": "obs-session-1_22222_1732482700",
  "hook_event_type": "PreToolUse",
  "payload": {
    "tool_name": "Write",
    "tool_input": {
      "file_path": "/home/bryan/multi-agent-observability-system/apps/client/src/components/EventCard.vue",
      "content": "Creating new EventCard component..."
    }
  },
  "summary": "Creating EventCard component"
}'

sleep 0.5

# Send test event 4 - Agent initialization
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "demo-cc-agent",
  "session_id": "demo-session-1_33333_1732482800",
  "hook_event_type": "Notification",
  "payload": {
    "message": "Agent started processing task",
    "level": "info"
  },
  "summary": "Agent initialization"
}'

sleep 0.5

# Send test event 5 - Starting development server
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "claude-code",
  "session_id": "test-session-1_12345_1732482600",
  "hook_event_type": "PreToolUse",
  "payload": {
    "tool_name": "Bash",
    "tool_input": {
      "command": "npm run dev"
    }
  },
  "summary": "Starting development server"
}'

sleep 0.5

# Send test event 6 - Component created successfully
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "multi-agent-observability-system",
  "session_id": "obs-session-1_22222_1732482700",
  "hook_event_type": "PostToolUse",
  "payload": {
    "tool_name": "Write",
    "tool_output": "Successfully created EventCard.vue"
  },
  "summary": "Component created successfully"
}'

sleep 0.5

# Send test event 7 - Subagent completion
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "demo-cc-agent",
  "session_id": "demo-session-1_33333_1732482800",
  "hook_event_type": "SubagentStop",
  "payload": {
    "subagent_id": "analyzer-1",
    "duration": 1234,
    "result": "Analysis complete"
  },
  "summary": "Subagent completed analysis"
}'

sleep 0.5

# Send test event 8 - Session completion
curl -X POST http://localhost:4000/events -H "Content-Type: application/json" -d '{
  "source_app": "claude-code",
  "session_id": "test-session-1_12345_1732482600",
  "hook_event_type": "Stop",
  "payload": {
    "duration": 45678,
    "tokens_used": 1234
  },
  "summary": "Session completed successfully",
  "chat": [
    {"role": "user", "content": "Please help me build a UI component"},
    {"role": "assistant", "content": "I'll help you create a modern UI component. Let me start by..."}
  ]
}'

echo -e "\n\nSent 8 test events across 3 different sessions!"