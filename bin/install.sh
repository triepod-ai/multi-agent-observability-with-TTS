#!/bin/bash

# Multi-Agent Observability System CLI Installer
# Installs and configures the obs CLI tool

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CLI_NAME="obs"
INSTALL_DIR="/usr/local/bin"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_MIN_VERSION="16"

# Functions
print_header() {
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}    Multi-Agent Observability System CLI Installer${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_requirements() {
    print_info "Checking system requirements..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js version $NODE_MIN_VERSION or higher from https://nodejs.org/"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
        print_error "Node.js version $NODE_MIN_VERSION or higher is required (found v$NODE_VERSION)"
        exit 1
    fi
    
    print_success "Node.js v$(node --version) found"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        echo "Please install npm along with Node.js"
        exit 1
    fi
    
    print_success "npm v$(npm --version) found"
    
    # Check write permissions for install directory
    if [ ! -w "$INSTALL_DIR" ] && [ "$EUID" -ne 0 ]; then
        print_warning "No write permissions for $INSTALL_DIR"
        print_info "Will attempt to install with sudo"
    fi
}

install_dependencies() {
    print_info "Installing dependencies..."
    
    cd "$SOURCE_DIR"
    
    if [ -f "package.json" ]; then
        npm install --production
        print_success "Dependencies installed"
    else
        print_error "package.json not found in $SOURCE_DIR"
        exit 1
    fi
}

install_cli() {
    print_info "Installing CLI tool..."
    
    # Create symlink or copy to install directory
    if [ "$EUID" -eq 0 ] || [ -w "$INSTALL_DIR" ]; then
        ln -sf "$SOURCE_DIR/obs" "$INSTALL_DIR/$CLI_NAME"
        print_success "CLI installed to $INSTALL_DIR/$CLI_NAME"
    else
        print_info "Attempting installation with sudo..."
        sudo ln -sf "$SOURCE_DIR/obs" "$INSTALL_DIR/$CLI_NAME"
        print_success "CLI installed to $INSTALL_DIR/$CLI_NAME (with sudo)"
    fi
    
    # Make sure it's executable
    chmod +x "$SOURCE_DIR/obs"
    
    # Verify installation
    if command -v "$CLI_NAME" &> /dev/null; then
        print_success "CLI tool '$CLI_NAME' is now available in PATH"
    else
        print_error "Installation failed - CLI not found in PATH"
        print_info "You may need to restart your terminal or add $INSTALL_DIR to your PATH"
    fi
}

setup_environment() {
    print_info "Setting up environment..."
    
    # Create CLI configuration directory if it doesn't exist
    CLI_CONFIG_DIR="$HOME/.config/obs"
    if [ ! -d "$CLI_CONFIG_DIR" ]; then
        mkdir -p "$CLI_CONFIG_DIR"
        print_success "Created configuration directory: $CLI_CONFIG_DIR"
    fi
    
    # Create default configuration file
    CONFIG_FILE="$CLI_CONFIG_DIR/config.json"
    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << EOF
{
  "serverUrl": "http://localhost:4000",
  "verbose": false,
  "useColor": true,
  "jsonOutput": false
}
EOF
        print_success "Created default configuration: $CONFIG_FILE"
    fi
}

test_installation() {
    print_info "Testing installation..."
    
    # Test basic command
    if "$CLI_NAME" --version &> /dev/null; then
        print_success "CLI responds to --version command"
    else
        print_warning "CLI --version test failed"
    fi
    
    # Test help command
    if "$CLI_NAME" --help &> /dev/null; then
        print_success "CLI responds to --help command"
    else
        print_warning "CLI --help test failed"
    fi
    
    print_info "Testing server connectivity..."
    if "$CLI_NAME" config --test &> /dev/null; then
        print_success "Server connectivity test passed"
    else
        print_warning "Server connectivity test failed (this is normal if server is not running)"
        print_info "Start the server with: cd apps/server && npm run dev"
    fi
}

show_usage() {
    echo ""
    echo -e "${GREEN}Installation completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Quick Start:${NC}"
    echo "  $CLI_NAME --help                 # Show all available commands"
    echo "  $CLI_NAME status                 # Check system status"
    echo "  $CLI_NAME monitor                # Start live monitoring dashboard"
    echo "  $CLI_NAME help-interactive       # Interactive help system"
    echo ""
    echo -e "${YELLOW}Configuration:${NC}"
    echo "  $CLI_NAME config --show          # Show current configuration"
    echo "  $CLI_NAME config --test          # Test server connectivity"
    echo ""
    echo -e "${YELLOW}Common Commands:${NC}"
    echo "  $CLI_NAME agents                 # Manage agents"
    echo "  $CLI_NAME sessions               # View session relationships"
    echo "  $CLI_NAME events --watch         # Watch events in real-time"
    echo "  $CLI_NAME export --type agents   # Export data"
    echo ""
    echo -e "${BLUE}Server Setup:${NC}"
    echo "  Make sure the observability server is running:"
    echo "  cd apps/server && npm run dev"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "  Configuration file: ~/.config/obs/config.json"
    echo "  CLI source: $SOURCE_DIR"
    echo ""
}

cleanup() {
    print_info "Cleaning up temporary files..."
    # Add any cleanup logic here if needed
}

# Main installation process
main() {
    print_header
    
    # Handle command line arguments
    case "${1:-}" in
        "--uninstall")
            print_info "Uninstalling CLI..."
            if [ -f "$INSTALL_DIR/$CLI_NAME" ]; then
                if [ "$EUID" -eq 0 ] || [ -w "$INSTALL_DIR" ]; then
                    rm -f "$INSTALL_DIR/$CLI_NAME"
                else
                    sudo rm -f "$INSTALL_DIR/$CLI_NAME"
                fi
                print_success "CLI uninstalled"
            else
                print_info "CLI not found, nothing to uninstall"
            fi
            exit 0
            ;;
        "--help")
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --uninstall    Remove the CLI tool"
            echo "  --help         Show this help message"
            echo ""
            exit 0
            ;;
    esac
    
    # Trap to cleanup on exit
    trap cleanup EXIT
    
    # Run installation steps
    check_requirements
    install_dependencies
    install_cli
    setup_environment
    test_installation
    show_usage
    
    print_success "Installation completed!"
}

# Run main function
main "$@"