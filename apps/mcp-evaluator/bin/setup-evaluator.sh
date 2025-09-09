#!/bin/bash

# MCP Evaluator Setup Script
# Sets up the MCP Evaluator environment and dependencies

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    error "Please run this script from the mcp-evaluator directory"
fi

info "Setting up MCP Evaluator..."

# Step 1: Check Node.js installation
info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js v18 or higher."
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js version must be 18 or higher. Current version: $(node -v)"
fi
info "Node.js version: $(node -v)"

# Step 2: Check Python installation
info "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    error "Python is not installed. Please install Python 3.8 or higher."
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
info "Python version: $PYTHON_VERSION"

# Step 3: Install Node dependencies
info "Installing Node.js dependencies..."
npm install

# Step 4: Check if MCP Inspector is installed
info "Checking MCP Inspector..."
if ! npm list @modelcontextprotocol/inspector &> /dev/null; then
    warn "MCP Inspector not found in local dependencies"
    info "Installing MCP Inspector..."
    npm install @modelcontextprotocol/inspector
fi

# Step 5: Create necessary directories
info "Creating necessary directories..."
mkdir -p .claude/hooks
mkdir -p logs
mkdir -p reports
mkdir -p temp

# Step 6: Copy evaluation hooks if they don't exist
if [ ! -f ".claude/hooks/functionality_match.py" ]; then
    info "Setting up evaluation hooks..."
    
    # Create a basic functionality_match hook
    cat > .claude/hooks/functionality_match.py << 'EOF'
#!/usr/bin/env python3
"""
Functionality Match Hook
Evaluates if the MCP server implements the advertised functionality
"""
import json
import sys

def evaluate():
    # Basic evaluation logic
    result = {
        "score": "partial",
        "evidence": ["Hook system operational"],
        "issues": ["Complete evaluation logic needs implementation"]
    }
    return result

if __name__ == "__main__":
    try:
        result = evaluate()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "score": "fail",
            "error": str(e)
        }))
        sys.exit(1)
EOF
    chmod +x .claude/hooks/functionality_match.py
fi

# Step 7: Check for MCP server examples
info "Checking for test servers..."
if [ ! -d "test-servers" ]; then
    warn "No test servers directory found"
    info "Creating test servers directory..."
    mkdir -p test-servers
    
    # Create a simple test server
    cat > test-servers/echo-server.js << 'EOF'
#!/usr/bin/env node
// Simple echo MCP server for testing

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'echo-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add echo tool
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back the input',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        }
      }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'echo') {
    return {
      content: [
        {
          type: 'text',
          text: `Echo: ${args.message}`
        }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
EOF
    info "Created sample echo-server.js for testing"
fi

# Step 8: Set up configuration file
if [ ! -f "mcp-evaluator.config.json" ]; then
    info "Creating default configuration..."
    cat > mcp-evaluator.config.json << 'EOF'
{
  "evaluator": {
    "runStatic": true,
    "runRuntime": true,
    "weights": {
      "static": 0.4,
      "runtime": 0.6
    },
    "passThreshold": 70,
    "failThreshold": 40,
    "timeout": 30000
  },
  "inspector": {
    "serverPort": 3000,
    "clientPort": 5173,
    "startupDelay": 3000
  },
  "hooks": {
    "path": ".claude/hooks",
    "python": "python3"
  },
  "output": {
    "format": "json",
    "reportsDir": "./reports"
  }
}
EOF
    info "Created mcp-evaluator.config.json"
fi

# Step 9: Test Inspector availability
info "Testing MCP Inspector..."
if npx @modelcontextprotocol/inspector --help &> /dev/null; then
    info "MCP Inspector is available and working"
else
    warn "MCP Inspector may have issues. You might need to install it globally:"
    warn "  npm install -g @modelcontextprotocol/inspector"
fi

# Step 10: Create convenience scripts
info "Creating convenience scripts..."

# Create start script
cat > start-evaluator.sh << 'EOF'
#!/bin/bash
echo "Starting MCP Evaluator Dashboard..."
npm run dashboard
EOF
chmod +x start-evaluator.sh

# Create evaluate script
cat > evaluate-server.sh << 'EOF'
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./evaluate-server.sh <server-path>"
    echo "Example: ./evaluate-server.sh test-servers/echo-server.js"
    exit 1
fi

echo "Evaluating MCP Server: $1"
npm run start -- evaluate "$1"
EOF
chmod +x evaluate-server.sh

# Step 11: Install additional Python dependencies if needed
info "Checking Python dependencies..."
if [ -f "requirements.txt" ]; then
    info "Installing Python requirements..."
    $PYTHON_CMD -m pip install -r requirements.txt --user
fi

# Step 12: Final checks
info "Running final checks..."

# Check if everything is properly installed
SETUP_COMPLETE=true

if [ ! -d "node_modules" ]; then
    warn "Node modules not properly installed"
    SETUP_COMPLETE=false
fi

if [ ! -d ".claude/hooks" ]; then
    warn "Hooks directory not created"
    SETUP_COMPLETE=false
fi

# Summary
echo ""
echo "=================================="
if [ "$SETUP_COMPLETE" = true ]; then
    info "Setup completed successfully!"
    echo ""
    info "Next steps:"
    echo "  1. Start the dashboard: ./start-evaluator.sh"
    echo "  2. Or run CLI evaluation: ./evaluate-server.sh <server-path>"
    echo "  3. Access dashboard at: http://localhost:3457"
    echo ""
    info "Example test:"
    echo "  ./evaluate-server.sh test-servers/echo-server.js"
else
    warn "Setup completed with warnings. Please review the messages above."
fi
echo "=================================="