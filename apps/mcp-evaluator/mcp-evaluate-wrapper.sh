#!/bin/bash

# MCP Evaluate Wrapper Script
# Manages MCP Evaluator Dashboard and Inspector processes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Default ports
DASHBOARD_PORT=3457
INSPECTOR_UI_PORT=6274
INSPECTOR_PROXY_PORT=6277

# Activate virtual environment if it exists
if [ -d "$DIR/.venv" ]; then
    export PATH="$DIR/.venv/bin:$PATH"
    export PYTHON_EXECUTABLE="$DIR/.venv/bin/python3"
else
    export PYTHON_EXECUTABLE="python3"
fi

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to kill processes on specific ports
kill_port_process() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null || true
        return 0
    fi
    return 1
}

# Function to kill all related processes
kill_all() {
    print_info "Killing all MCP Evaluator related processes..."
    
    # Kill dashboard
    if kill_port_process $DASHBOARD_PORT; then
        print_status "Killed dashboard on port $DASHBOARD_PORT"
    else
        print_info "No dashboard process found on port $DASHBOARD_PORT"
    fi
    
    # Kill Inspector UI
    if kill_port_process $INSPECTOR_UI_PORT; then
        print_status "Killed Inspector UI on port $INSPECTOR_UI_PORT"
    else
        print_info "No Inspector UI process found on port $INSPECTOR_UI_PORT"
    fi
    
    # Kill Inspector Proxy
    if kill_port_process $INSPECTOR_PROXY_PORT; then
        print_status "Killed Inspector proxy on port $INSPECTOR_PROXY_PORT"
    else
        print_info "No Inspector proxy process found on port $INSPECTOR_PROXY_PORT"
    fi
    
    # Kill any remaining inspector processes by name
    pkill -f "@modelcontextprotocol/inspector" 2>/dev/null || true
    pkill -f "mcp-inspector" 2>/dev/null || true
    pkill -f "dashboard/server.js" 2>/dev/null || true
    
    # Give processes time to clean up
    sleep 1
    
    print_status "All processes killed and ports cleared"
}

# Function to check port availability
check_ports() {
    local all_clear=true
    
    if lsof -i:$DASHBOARD_PORT >/dev/null 2>&1; then
        print_warning "Port $DASHBOARD_PORT is in use (Dashboard)"
        all_clear=false
    fi
    
    if lsof -i:$INSPECTOR_UI_PORT >/dev/null 2>&1; then
        print_warning "Port $INSPECTOR_UI_PORT is in use (Inspector UI)"
        all_clear=false
    fi
    
    if lsof -i:$INSPECTOR_PROXY_PORT >/dev/null 2>&1; then
        print_warning "Port $INSPECTOR_PROXY_PORT is in use (Inspector Proxy)"
        all_clear=false
    fi
    
    if [ "$all_clear" = true ]; then
        print_status "All ports are available"
        return 0
    else
        return 1
    fi
}

# Function to start the dashboard
start_dashboard() {
    print_info "Starting MCP Evaluator Dashboard..."
    
    # Check if ports are clear
    if ! check_ports; then
        print_error "Ports are in use. Run '$0 kill' first to clear them."
        exit 1
    fi
    
    # Change to script directory
    cd "$DIR"
    
    # Start the dashboard
    npm run dashboard &
    local dashboard_pid=$!
    
    # Wait for dashboard to start
    sleep 2
    
    if kill -0 $dashboard_pid 2>/dev/null; then
        print_status "Dashboard started on http://localhost:$DASHBOARD_PORT"
        print_info "Dashboard PID: $dashboard_pid"
    else
        print_error "Failed to start dashboard"
        exit 1
    fi
}

# Function to start the inspector
start_inspector() {
    print_info "Starting MCP Inspector v0.16.6..."
    
    # Check if Inspector ports are available
    if lsof -i:$INSPECTOR_UI_PORT >/dev/null 2>&1 || lsof -i:$INSPECTOR_PROXY_PORT >/dev/null 2>&1; then
        print_warning "Inspector already running or ports in use"
        return 1
    fi
    
    # Change to script directory
    cd "$DIR"
    
    # Start Inspector in background
    npx @modelcontextprotocol/inspector &
    local inspector_pid=$!
    
    sleep 3
    
    if kill -0 $inspector_pid 2>/dev/null; then
        print_status "Inspector started:"
        print_info "  UI: http://localhost:$INSPECTOR_UI_PORT"
        print_info "  Proxy: localhost:$INSPECTOR_PROXY_PORT"
        print_info "  PID: $inspector_pid"
    else
        print_error "Failed to start Inspector"
        return 1
    fi
}

# Function to show status
show_status() {
    print_info "MCP Evaluator Status:"
    echo ""
    
    # Check Dashboard
    if lsof -i:$DASHBOARD_PORT >/dev/null 2>&1; then
        local pid=$(lsof -ti:$DASHBOARD_PORT)
        print_status "Dashboard: Running (PID: $pid) on port $DASHBOARD_PORT"
    else
        print_error "Dashboard: Not running"
    fi
    
    # Check Inspector UI
    if lsof -i:$INSPECTOR_UI_PORT >/dev/null 2>&1; then
        local pid=$(lsof -ti:$INSPECTOR_UI_PORT)
        print_status "Inspector UI: Running (PID: $pid) on port $INSPECTOR_UI_PORT"
    else
        print_error "Inspector UI: Not running"
    fi
    
    # Check Inspector Proxy
    if lsof -i:$INSPECTOR_PROXY_PORT >/dev/null 2>&1; then
        local pid=$(lsof -ti:$INSPECTOR_PROXY_PORT)
        print_status "Inspector Proxy: Running (PID: $pid) on port $INSPECTOR_PROXY_PORT"
    else
        print_error "Inspector Proxy: Not running"
    fi
    
    echo ""
    print_info "URLs:"
    echo "  Dashboard: http://localhost:$DASHBOARD_PORT"
    echo "  Inspector: http://localhost:$INSPECTOR_UI_PORT"
}

# Function to restart everything
restart() {
    print_info "Restarting MCP Evaluator..."
    kill_all
    sleep 2
    start_dashboard
    print_status "MCP Evaluator restarted successfully"
    echo ""
    print_info "Note: Inspector will auto-launch when you start an evaluation"
}

# Function to run original evaluate command
run_evaluate() {
    cd "$DIR"
    exec node "$DIR/bin/mcp-evaluate" "$@"
}

# Main command handling
case "${1:-}" in
    start)
        start_dashboard
        ;;
    
    inspector)
        start_inspector
        ;;
    
    kill|stop)
        kill_all
        ;;
    
    restart)
        restart
        ;;
    
    status)
        show_status
        ;;
    
    ports)
        check_ports
        ;;
    
    evaluate)
        shift
        run_evaluate "$@"
        ;;
    
    *)
        if [ $# -gt 0 ]; then
            # If arguments provided, assume it's an evaluate command
            run_evaluate "$@"
        else
            echo "MCP Evaluator Wrapper Script"
            echo ""
            echo "Usage: $0 {start|stop|kill|restart|status|inspector|ports|evaluate}"
            echo ""
            echo "Commands:"
            echo "  start         - Start the dashboard (Inspector auto-launches on evaluation)"
            echo "  stop/kill     - Kill all processes and clear ports"
            echo "  restart       - Kill all processes and restart dashboard"
            echo "  status        - Show current status of all components"
            echo "  inspector     - Manually start the Inspector"
            echo "  ports         - Check if required ports are available"
            echo "  evaluate      - Run original CLI evaluation command"
            echo ""
            echo "Original CLI usage:"
            echo "  $0 evaluate /path/to/mcp-server"
            echo "  $0 /path/to/mcp-server  (shorthand)"
            echo ""
            echo "Ports used:"
            echo "  Dashboard:       $DASHBOARD_PORT"
            echo "  Inspector UI:    $INSPECTOR_UI_PORT"
            echo "  Inspector Proxy: $INSPECTOR_PROXY_PORT"
            exit 1
        fi
        ;;
esac