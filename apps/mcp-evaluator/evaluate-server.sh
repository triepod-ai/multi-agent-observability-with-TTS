#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./evaluate-server.sh <server-path>"
    echo "Example: ./evaluate-server.sh test-servers/echo-server.js"
    exit 1
fi

echo "Evaluating MCP Server: $1"
npm run start -- evaluate "$1"
