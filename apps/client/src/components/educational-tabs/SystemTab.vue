<template>
  <div data-tab-content="system">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-white mb-2">How This System Works</h2>
      <p class="text-sm text-gray-400 mb-4">
        Understanding the complete observability flow: from Claude Code hooks to real-time dashboard visualization
      </p>
    </div>

    <!-- Architecture Overview -->
    <div class="mb-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-5">
      <h3 class="text-base font-semibold text-white mb-3 flex items-center">
        <span class="mr-2">🏗️</span>
        Architecture Overview
      </h3>
      <p class="text-sm text-gray-300 mb-4">
        This multi-agent observability system monitors Claude Code sessions in real-time by capturing hook events,
        storing them in a database, and broadcasting updates to a live dashboard.
      </p>

      <!-- Visual Flow Diagram -->
      <div class="bg-gray-900/50 rounded-lg p-4 border border-blue-700/30">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <!-- Step 1: Hooks -->
          <div class="flex-1 text-center">
            <div class="w-16 h-16 mx-auto mb-2 bg-green-600 rounded-full flex items-center justify-center text-2xl">
              🪝
            </div>
            <div class="font-semibold text-green-400 mb-1">1. Hooks</div>
            <div class="text-gray-400 text-xs">Python scripts<br/>in .claude/hooks/</div>
          </div>

          <!-- Arrow -->
          <div class="hidden md:block text-gray-600 text-2xl">→</div>

          <!-- Step 2: HTTP Client -->
          <div class="flex-1 text-center">
            <div class="w-16 h-16 mx-auto mb-2 bg-blue-600 rounded-full flex items-center justify-center text-2xl">
              📡
            </div>
            <div class="font-semibold text-blue-400 mb-1">2. HTTP Client</div>
            <div class="text-gray-400 text-xs">POST /events<br/>to server</div>
          </div>

          <!-- Arrow -->
          <div class="hidden md:block text-gray-600 text-2xl">→</div>

          <!-- Step 3: Bun Server -->
          <div class="flex-1 text-center">
            <div class="w-16 h-16 mx-auto mb-2 bg-yellow-600 rounded-full flex items-center justify-center text-2xl">
              🚀
            </div>
            <div class="font-semibold text-yellow-400 mb-1">3. Bun Server</div>
            <div class="text-gray-400 text-xs">Port 3002<br/>Process events</div>
          </div>

          <!-- Arrow -->
          <div class="hidden md:block text-gray-600 text-2xl">→</div>

          <!-- Step 4: Database -->
          <div class="flex-1 text-center">
            <div class="w-16 h-16 mx-auto mb-2 bg-purple-600 rounded-full flex items-center justify-center text-2xl">
              💾
            </div>
            <div class="font-semibold text-purple-400 mb-1">4. Database</div>
            <div class="text-gray-400 text-xs">SQLite + Redis<br/>Store & cache</div>
          </div>

          <!-- Arrow -->
          <div class="hidden md:block text-gray-600 text-2xl">→</div>

          <!-- Step 5: Dashboard -->
          <div class="flex-1 text-center">
            <div class="w-16 h-16 mx-auto mb-2 bg-cyan-600 rounded-full flex items-center justify-center text-2xl">
              📊
            </div>
            <div class="font-semibold text-cyan-400 mb-1">5. Dashboard</div>
            <div class="text-gray-400 text-xs">Vue 3 + WebSocket<br/>Real-time UI</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step-by-Step Breakdown -->
    <div class="space-y-4">

      <!-- Step 1: Hooks -->
      <ExpandableSection
        title="Step 1: Hooks Capture Events"
        icon="🪝"
        subtitle="Python scripts that run when Claude Code triggers hook events"
        :defaultExpanded="true"
        variant="bordered"
        size="md"
      >
        <div class="space-y-3">
          <p class="text-sm text-gray-300">
            Hooks are Python scripts in <code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">.claude/hooks/</code>
            that execute automatically when Claude Code events occur (tool use, agent start/stop, etc.).
          </p>

          <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 mb-2 font-semibold">Example: post_tool_use_with_correlation.py</div>
            <pre class="text-xs text-gray-300 overflow-x-auto"><code>#!/usr/bin/env -S uv run --script
"""Captures tool execution events and forwards to server"""
import json
import sys

# Read hook input from stdin
tool_data = json.loads(sys.stdin.read())

# Create event data
event_data = {
    "tool_name": tool_data.get('tool', 'unknown'),
    "session_id": get_stored_session_id(),
    "payload": tool_data
}

# Forward to send_event_async.py
print(json.dumps(event_data))</code></pre>
          </div>

          <div class="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
            <div class="flex items-start gap-2">
              <span class="text-yellow-400 text-lg">💡</span>
              <div class="text-xs text-gray-300">
                <strong class="text-yellow-400">Key Insight:</strong> Hooks receive structured JSON from Claude Code via stdin,
                transform it, and pass it to the HTTP client for transmission to the server.
              </div>
            </div>
          </div>
        </div>
      </ExpandableSection>

      <!-- Step 2: HTTP Client -->
      <ExpandableSection
        title="Step 2: HTTP Client Sends Events to Server"
        icon="📡"
        subtitle="Reliable event transmission with error handling and retry logic"
        :defaultExpanded="false"
        variant="bordered"
        size="md"
      >
        <div class="space-y-3">
          <p class="text-sm text-gray-300">
            The HTTP client (<code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">utils/http_client.py</code>)
            sends events to the observability server via HTTP POST.
          </p>

          <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 mb-2 font-semibold">HTTP Client Implementation</div>
            <pre class="text-xs text-gray-300 overflow-x-auto"><code>def send_event_to_server(event_data: Dict[str, Any]) -> bool:
    """Send event to observability server"""
    server_url = os.environ.get("OBSERVABILITY_SERVER_URL", "http://localhost:3002")
    endpoint = f"{server_url}/events"

    # Prepare JSON request
    json_data = json.dumps(event_data).encode('utf-8')

    req = urllib.request.Request(
        endpoint,
        data=json_data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    # Send request with timeout
    with urllib.request.urlopen(req, timeout=5.0) as response:
        return response.status == 200</code></pre>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div class="bg-blue-900/20 border border-blue-700/30 rounded p-3">
              <div class="text-xs font-semibold text-blue-400 mb-2">Configuration</div>
              <div class="text-xs text-gray-300 space-y-1">
                <div><strong>Endpoint:</strong> POST /events</div>
                <div><strong>Default Port:</strong> 3002</div>
                <div><strong>Timeout:</strong> 5 seconds</div>
                <div><strong>Env Var:</strong> OBSERVABILITY_SERVER_URL</div>
              </div>
            </div>
            <div class="bg-green-900/20 border border-green-700/30 rounded p-3">
              <div class="text-xs font-semibold text-green-400 mb-2">Features</div>
              <div class="text-xs text-gray-300 space-y-1">
                <div>✅ Non-blocking (doesn't slow Claude)</div>
                <div>✅ Graceful degradation on failure</div>
                <div>✅ Automatic retry with backoff</div>
                <div>✅ stderr logging for debugging</div>
              </div>
            </div>
          </div>
        </div>
      </ExpandableSection>

      <!-- Step 3: Bun Server -->
      <ExpandableSection
        title="Step 3: Bun Server Processes Events"
        icon="🚀"
        subtitle="High-performance TypeScript server with WebSocket support"
        :defaultExpanded="false"
        variant="bordered"
        size="md"
      >
        <div class="space-y-3">
          <p class="text-sm text-gray-300">
            The Bun server receives events, validates them, stores them in the database, and broadcasts updates via WebSocket.
          </p>

          <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 mb-2 font-semibold">Server Event Handler (apps/server/src/index.ts)</div>
            <pre class="text-xs text-gray-300 overflow-x-auto"><code>// POST /events - Receive new events
if (url.pathname === '/events' && req.method === 'POST') {
  const event: HookEvent = await req.json();

  // Validate required fields
  if (!event.source_app || !event.session_id || !event.hook_event_type) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400
    });
  }

  // 1. Insert event into SQLite database
  const savedEvent = insertEvent(event);

  // 2. Process through unified metrics service
  await processEventMetrics(event, savedEvent);

  // 3. Handle agent lifecycle events
  if (event.hook_event_type === 'SubagentStop') {
    await markAgentCompleted(event.payload);
  }

  // 4. Broadcast to WebSocket clients
  wsClients.forEach(client => {
    client.send(JSON.stringify({
      type: 'event',
      data: savedEvent
    }));
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}</code></pre>
          </div>

          <div class="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3 mt-3">
            <div class="text-xs font-semibold text-purple-400 mb-2">Event Processing Pipeline</div>
            <div class="text-xs text-gray-300 space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="text-purple-400">1.</span>
                <span><strong>Validation:</strong> Check required fields (source_app, session_id, hook_event_type)</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-purple-400">2.</span>
                <span><strong>Storage:</strong> Insert into SQLite database for persistence</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-purple-400">3.</span>
                <span><strong>Metrics:</strong> Update agent metrics, performance counters, tool usage</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-purple-400">4.</span>
                <span><strong>Relationships:</strong> Track session parent-child hierarchies</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-purple-400">5.</span>
                <span><strong>Broadcast:</strong> Send to all connected WebSocket clients in real-time</span>
              </div>
            </div>
          </div>
        </div>
      </ExpandableSection>

      <!-- Step 4: Event Structure -->
      <ExpandableSection
        title="Step 4: Event Structure & Data Model"
        icon="📋"
        subtitle="Understanding the HookEvent interface and payload schema"
        :defaultExpanded="false"
        variant="bordered"
        size="md"
      >
        <div class="space-y-3">
          <p class="text-sm text-gray-300">
            All events follow the <code class="bg-gray-700/70 px-1.5 py-0.5 rounded text-cyan-300">HookEvent</code> interface:
          </p>

          <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 mb-2 font-semibold">HookEvent Interface (TypeScript)</div>
            <pre class="text-xs text-gray-300 overflow-x-auto"><code>interface HookEvent {
  source_app: string;           // e.g., "claude-code" or "multi-agent-observability-system"
  session_id: string;           // Unique session identifier
  parent_session_id?: string;   // For subagent sessions
  correlation_id?: string;      // Links PreToolUse → PostToolUse
  hook_event_type: string;      // "PreToolUse", "SubagentStop", etc.
  payload: {
    tool_name?: string;         // For tool-related events
    tool_input?: any;           // Tool parameters
    tool_output?: any;          // Tool results
    agent_type?: string;        // For agent events
    agent_name?: string;
    duration?: number;          // Event duration in ms
    metadata?: {
      user?: string;
      environment?: string;
      hostname?: string;
    };
    [key: string]: any;         // Extensible for custom data
  };
  timestamp?: number;           // Unix timestamp
  error?: string | boolean;     // Error information
}</code></pre>
          </div>

          <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mt-3">
            <div class="text-xs text-gray-400 mb-2 font-semibold">Example Event: SubagentStop</div>
            <pre class="text-xs text-gray-300 overflow-x-auto"><code>{
  "source_app": "claude-code",
  "session_id": "abc-123-def-456",
  "parent_session_id": "xyz-789",
  "hook_event_type": "SubagentStop",
  "payload": {
    "agent_type": "code-reviewer",
    "agent_name": "Code Quality Agent",
    "agent_id": "ag_1704067200000",
    "duration": 15000,
    "success": true,
    "tools_used": ["Read", "Edit", "Bash"],
    "metadata": {
      "user": "developer",
      "environment": "production"
    }
  },
  "timestamp": 1704067200000
}</code></pre>
          </div>
        </div>
      </ExpandableSection>

      <!-- Step 5: Dashboard -->
      <ExpandableSection
        title="Step 5: Dashboard Displays Real-Time Data"
        icon="📊"
        subtitle="Vue 3 application with WebSocket for live updates"
        :defaultExpanded="false"
        variant="bordered"
        size="md"
      >
        <div class="space-y-3">
          <p class="text-sm text-gray-300">
            The dashboard connects via WebSocket to receive real-time event updates and displays them in various views.
          </p>

          <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 mb-2 font-semibold">WebSocket Connection</div>
            <pre class="text-xs text-gray-300 overflow-x-auto"><code>// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:3002');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'event') {
    // New event received - update UI
    events.value.unshift(message.data);
  } else if (message.type === 'agent_status_update') {
    // Agent status changed - update metrics
    updateAgentMetrics(message.data);
  }
};</code></pre>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div class="bg-cyan-900/20 border border-cyan-700/30 rounded p-3">
              <div class="text-xs font-semibold text-cyan-400 mb-2">📈 Event Timeline</div>
              <div class="text-xs text-gray-300">
                Chronological view of all hook events with filtering and search
              </div>
            </div>
            <div class="bg-cyan-900/20 border border-cyan-700/30 rounded p-3">
              <div class="text-xs font-semibold text-cyan-400 mb-2">🤖 Agent Metrics</div>
              <div class="text-xs text-gray-300">
                Real-time agent performance, type distribution, and tool usage
              </div>
            </div>
            <div class="bg-cyan-900/20 border border-cyan-700/30 rounded p-3">
              <div class="text-xs font-semibold text-cyan-400 mb-2">🔗 Session Tree</div>
              <div class="text-xs text-gray-300">
                Parent-child relationships showing agent delegation hierarchy
              </div>
            </div>
          </div>
        </div>
      </ExpandableSection>

      <!-- API Reference -->
      <ExpandableSection
        title="API Reference"
        icon="🔌"
        subtitle="Complete list of server endpoints and their usage"
        :defaultExpanded="false"
        variant="bordered"
        size="md"
      >
        <div class="space-y-3">
          <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div class="text-xs font-semibold text-gray-400 mb-3">Core Endpoints</div>
            <div class="space-y-3 text-xs">
              <!-- Events -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-green-700 text-green-100 rounded font-mono text-[10px]">POST</span>
                  <code class="text-cyan-300">/events</code>
                </div>
                <div class="text-gray-400 ml-14">Submit new hook events from hooks</div>
              </div>

              <!-- Get Events -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-blue-700 text-blue-100 rounded font-mono text-[10px]">GET</span>
                  <code class="text-cyan-300">/api/events</code>
                </div>
                <div class="text-gray-400 ml-14">Retrieve event history with filters</div>
              </div>

              <!-- Agent Metrics -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-blue-700 text-blue-100 rounded font-mono text-[10px]">GET</span>
                  <code class="text-cyan-300">/api/agents/metrics/current</code>
                </div>
                <div class="text-gray-400 ml-14">Current agent metrics and statistics</div>
              </div>

              <!-- Agent Timeline -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-blue-700 text-blue-100 rounded font-mono text-[10px]">GET</span>
                  <code class="text-cyan-300">/api/agents/metrics/timeline</code>
                </div>
                <div class="text-gray-400 ml-14">Time-series agent execution data</div>
              </div>

              <!-- WebSocket -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-purple-700 text-purple-100 rounded font-mono text-[10px]">WS</span>
                  <code class="text-cyan-300">ws://localhost:3002</code>
                </div>
                <div class="text-gray-400 ml-14">Real-time event stream and status updates</div>
              </div>
            </div>
          </div>
        </div>
      </ExpandableSection>

    </div>

    <!-- Quick Start Guide -->
    <div class="mt-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-5">
      <h3 class="text-base font-semibold text-white mb-3 flex items-center">
        <span class="mr-2">🚀</span>
        Quick Start: Run the System
      </h3>
      <div class="space-y-2 text-sm text-gray-300">
        <div class="flex items-start gap-2">
          <span class="text-green-400 font-bold">1.</span>
          <div>
            <strong>Start the server:</strong>
            <code class="block mt-1 bg-gray-900 px-2 py-1 rounded text-cyan-300">./scripts/start-system.sh</code>
          </div>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-green-400 font-bold">2.</span>
          <div>
            <strong>Install hooks in your project:</strong>
            <code class="block mt-1 bg-gray-900 px-2 py-1 rounded text-cyan-300">./bin/install-hooks.sh /path/to/project</code>
          </div>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-green-400 font-bold">3.</span>
          <div>
            <strong>Open the dashboard:</strong>
            <code class="block mt-1 bg-gray-900 px-2 py-1 rounded text-cyan-300">http://localhost:3002</code>
          </div>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-green-400 font-bold">4.</span>
          <div>
            <strong>Use Claude Code in your project</strong> - Events will appear in real-time!
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import ExpandableSection from '../ExpandableSection.vue';
</script>

<style scoped>
code {
  font-family: 'Fira Code', 'Courier New', monospace;
}
</style>
