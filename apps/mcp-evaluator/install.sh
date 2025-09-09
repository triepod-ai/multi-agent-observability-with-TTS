#!/bin/bash

# MCP Evaluator Installation Script
# Sets up the complete evaluation environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVALUATOR_DIR="$SCRIPT_DIR"

echo "======================================"
echo "MCP Evaluator Installation"
echo "======================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js v18 or higher from https://nodejs.org"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Install Node dependencies
echo ""
echo "Installing Node.js dependencies..."
cd "$EVALUATOR_DIR"
npm install

# Make CLI executable
chmod +x "$EVALUATOR_DIR/bin/mcp-evaluate"

# Install Python dependencies for hooks
echo ""
echo "Installing Python dependencies for hooks..."
pip3 install -q requests pyyaml tabulate 2>/dev/null || {
    echo "⚠️ Could not install Python dependencies globally."
    echo "You may need to run: pip3 install requests pyyaml tabulate"
}

# Create symlink for global access (optional)
echo ""
read -p "Would you like to install mcp-evaluate globally? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    INSTALL_DIR="/usr/local/bin"
    SYMLINK_PATH="$INSTALL_DIR/mcp-evaluate"
    
    if [ -w "$INSTALL_DIR" ]; then
        ln -sf "$EVALUATOR_DIR/bin/mcp-evaluate" "$SYMLINK_PATH"
        echo "✓ Created symlink at $SYMLINK_PATH"
    else
        echo "Creating global symlink (requires sudo)..."
        sudo ln -sf "$EVALUATOR_DIR/bin/mcp-evaluate" "$SYMLINK_PATH"
        echo "✓ Created symlink at $SYMLINK_PATH"
    fi
    
    echo "✓ mcp-evaluate is now available globally"
fi

# Copy hooks to user's Claude directory
echo ""
read -p "Would you like to install evaluation hooks to ~/.claude/mcp-hooks? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    HOOKS_DEST="$HOME/.claude/mcp-hooks"
    mkdir -p "$HOOKS_DEST"
    
    # Copy existing hooks if available
    if [ -d "$SCRIPT_DIR/../../.claude/mcp-hooks" ]; then
        cp -r "$SCRIPT_DIR/../../.claude/mcp-hooks"/* "$HOOKS_DEST/" 2>/dev/null || true
        echo "✓ Copied evaluation hooks to $HOOKS_DEST"
    else
        echo "⚠️ MCP hooks not found in repository. You may need to install them separately."
    fi
fi

# Setup completion message
echo ""
echo "======================================"
echo "✅ Installation Complete!"
echo "======================================"
echo ""
echo "Usage:"
echo "  mcp-evaluate [server-path]         - Evaluate an MCP server"
echo "  mcp-evaluate interactive           - Start dashboard mode"
echo "  mcp-evaluate requirements          - Show MCP requirements"
echo "  mcp-evaluate test-tool <path> <tool> - Test specific tool"
echo ""
echo "Quick Start:"
echo "  1. cd /path/to/mcp-server"
echo "  2. mcp-evaluate"
echo ""
echo "Dashboard:"
echo "  mcp-evaluate interactive"
echo "  Open http://localhost:3457 in your browser"
echo ""
echo "For more information:"
echo "  mcp-evaluate --help"
echo ""