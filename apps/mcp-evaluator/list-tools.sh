#!/bin/bash

# MCP Tool Discovery Script
# Usage: ./list-tools.sh /path/to/mcp-server

if [ -z "$1" ]; then
    echo "Usage: ./list-tools.sh <server-path>"
    echo "Example: ./list-tools.sh /home/bryan/run-qdrant-docker-mcp.sh"
    exit 1
fi

SERVER_PATH="$1"

echo "🔍 Discovering tools for MCP server: $SERVER_PATH"
echo "═══════════════════════════════════════════════"

# Create temporary files for communication
INIT_REQUEST=$(mktemp)
TOOLS_REQUEST=$(mktemp)
OUTPUT=$(mktemp)

# Cleanup function
cleanup() {
    rm -f "$INIT_REQUEST" "$TOOLS_REQUEST" "$OUTPUT"
}
trap cleanup EXIT

# Create MCP protocol requests
cat > "$INIT_REQUEST" << 'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"clientInfo":{"name":"tool-discovery","version":"1.0.0"}}}
EOF

cat > "$TOOLS_REQUEST" << 'EOF'
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
EOF

echo "📡 Starting MCP server..."

# Determine how to run the server
if [[ "$SERVER_PATH" == *.sh ]]; then
    CMD="bash $SERVER_PATH"
elif [[ "$SERVER_PATH" == *.py ]]; then
    CMD="python3 $SERVER_PATH"
else
    CMD="$SERVER_PATH"
fi

# Start server and communicate
(
    echo "📤 Sending initialize request..."
    cat "$INIT_REQUEST"
    sleep 1
    echo "📤 Sending tools/list request..."
    cat "$TOOLS_REQUEST"
    sleep 2
) | timeout 10 $CMD > "$OUTPUT" 2>&1

echo "📥 Processing response..."

# Parse and format output
if [ -s "$OUTPUT" ]; then
    echo "✅ Raw server output:"
    echo "────────────────────────────"
    cat "$OUTPUT"
    echo ""
    echo "────────────────────────────"
    
    # Try to extract tools list
    echo ""
    echo "🔧 Extracting tools..."
    
    # Look for JSON responses containing tools
    grep -o '{"jsonrpc.*}' "$OUTPUT" | while read -r line; do
        echo "$line" | jq -r '
        if .result.tools then
            "Found " + (.result.tools | length | tostring) + " tools:",
            "",
            (.result.tools[] | 
                "🔧 " + .name,
                "   Description: " + (.description // "No description"),
                (if .inputSchema.properties then
                    "   Parameters:",
                    (.inputSchema.properties | to_entries[] |
                        "     - " + .key + ": " + (.value.type // "unknown") +
                        (if (.value.description // "") != "" then " - " + .value.description else "" end)
                    )
                else empty end),
                ""
            )
        else
            empty
        end' 2>/dev/null
    done
    
else
    echo "❌ No output received from MCP server"
    echo "   Check that the server path is correct and the server is working"
fi

echo "🏁 Discovery complete"